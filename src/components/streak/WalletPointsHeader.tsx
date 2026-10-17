import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

// Base API URL (ngrok tunnel, no trailing slash)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

const MIN_WITHDRAWAL = 500;

// Paystack success / close redirect markers
const SUCCESS_URL_MARKERS = ['payment-success', 'paystack.co/close', 'callback'];

interface PointsSummary {
  total: number;
  predictionPoints: number;
  checkInPoints: number;
}

interface WalletPointsHeaderProps {
  userId: string;
  refreshTrigger?: number;
}

// Normalize Kenyan phone numbers to 2547XXXXXXXX / 2541XXXXXXXX
const formatKenyanPhone = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.slice(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned;
  }
  return cleaned;
};

const WITHDRAW_ERRORS: Record<string, string> = {
  minimum_withdrawal_is_500: `Minimum withdrawal is KES ${MIN_WITHDRAWAL}.`,
  insufficient_balance: 'You do not have enough balance for that amount.',
  invalid_phone: 'Enter a valid Kenyan phone number.',
  invalid_amount: 'Enter a valid amount.',
  wallet_not_found: 'Wallet not found.',
  not_authenticated: 'Please sign in again.',
};

export function WalletPointsHeader({ userId, refreshTrigger }: WalletPointsHeaderProps) {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('KES');
  const [savedPhone, setSavedPhone] = useState<string>('');
  const [points, setPoints] = useState<PointsSummary>({
    total: 0,
    predictionPoints: 0,
    checkInPoints: 0,
  });

  // Deposit modal state
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  // In-app Paystack WebView state
  const [depositWebViewVisible, setDepositWebViewVisible] = useState(false);
  const [depositWebViewUrl, setDepositWebViewUrl] = useState<string | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  // Guards against firing the close logic more than once (nav + manual close)
  const webViewClosedRef = useRef(false);

  // Withdraw modal state
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmountInput, setWithdrawAmountInput] = useState('');
  const [withdrawPhoneInput, setWithdrawPhoneInput] = useState('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  // Fetch wallet data
  const fetchWalletData = useCallback(async () => {
    const { data } = await supabase
      .from('wallets')
      .select('balance, currency')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setBalance(Number(data.balance) || 0);
      setCurrency(data.currency || 'KES');
    }
  }, [userId]);

  // Prefill payout phone from profile (optional, ignore failures)
  const fetchSavedPhone = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', userId)
      .maybeSingle();

    if (data?.phone) setSavedPhone(String(data.phone));
  }, [userId]);

  // Fetch points data
  const fetchPointsData = useCallback(async () => {
    const { data: viewData } = await supabase
      .from('user_total_points')
      .select('prediction_points, checkin_points, total_points')
      .eq('user_id', userId)
      .maybeSingle();

    if (viewData) {
      setPoints({
        total: Number(viewData.total_points) || 0,
        predictionPoints: Number(viewData.prediction_points) || 0,
        checkInPoints: Number(viewData.checkin_points) || 0,
      });
      return;
    }

    const [predRes, checkInRes] = await Promise.all([
      supabase.from('prediction_points').select('points').eq('user_id', userId),
      supabase.from('check_ins').select('points').eq('user_id', userId),
    ]);

    const totalPred = predRes.data?.reduce((acc, curr) => acc + (curr.points || 0), 0) || 0;
    const totalCheckIn = checkInRes.data?.reduce((acc, curr) => acc + (curr.points || 0), 0) || 0;

    setPoints({
      total: totalPred + totalCheckIn,
      predictionPoints: totalPred,
      checkInPoints: totalCheckIn,
    });
  }, [userId]);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      await Promise.all([fetchWalletData(), fetchPointsData(), fetchSavedPhone()]);
    } catch (err) {
      console.error('Error fetching wallet/points data:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, fetchWalletData, fetchPointsData, fetchSavedPhone]);

  // Initial Fetch & Realtime Subscription
  useEffect(() => {
    if (!userId) return;

    fetchData();

    const channel = supabase
      .channel(`wallet_changes_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new.balance === 'number') {
            setBalance(payload.new.balance);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchData, refreshTrigger]);

  // ---------- Deposit ----------
  const openDepositModal = () => {
    setAmountInput('');
    setDepositModalVisible(true);
  };

  // Shared close handler — used by header X, Android back, and success detection
  const closeDepositWebView = useCallback(() => {
    if (webViewClosedRef.current) return;
    webViewClosedRef.current = true;

    setDepositWebViewVisible(false);
    setDepositWebViewUrl(null);

    // The webhook is the source of truth — we just refetch as a fallback.
    // Paystack's redirect fires before the webhook lands, so retry a few times.
    fetchWalletData();
    setTimeout(fetchWalletData, 3000);
    setTimeout(fetchWalletData, 8000);

    // Give the verifying state a moment, then clear it
    setTimeout(() => setVerifyingPayment(false), 1500);
  }, [fetchWalletData]);

  const handleDepositSubmit = async () => {
    const numAmount = parseFloat(amountInput);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid deposit amount greater than 0.');
      return;
    }

    try {
      setSubmittingDeposit(true);

      // Paystack requires a customer email
      const { data: authData } = await supabase.auth.getUser();
      const email = authData?.user?.email;
      if (!email) {
        Alert.alert('Email Required', 'Your account needs an email address to make a deposit.');
        return;
      }

      // Ask backend to initialize the Paystack transaction
      const response = await fetch(`${API_BASE_URL}/api/paystack/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          amount: numAmount, // KES, backend converts to subunits (x100)
          userId,
        }),
      });

      const data = await response.json();
      const authorizationUrl = data?.authorization_url || data?.data?.authorization_url;

      if (!response.ok || !authorizationUrl) {
        Alert.alert('Deposit Failed', data?.message || data?.error || 'Could not start payment.');
        return;
      }

      setDepositModalVisible(false);

      // Open Paystack inside the app
      webViewClosedRef.current = false;
      setVerifyingPayment(false);
      setDepositWebViewUrl(authorizationUrl);
      setDepositWebViewVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error occurred while processing request.');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  // Detect Paystack's success/close redirect inside the WebView
  const handleWebViewNavChange = (navState: { url: string }) => {
    const { url } = navState;
    if (!url) return;

    const isDone = SUCCESS_URL_MARKERS.some((marker) => url.includes(marker));
    if (isDone && !webViewClosedRef.current) {
      // IMPORTANT: this only triggers a refetch. The webhook still credits the wallet.
      // Never treat a URL as proof of payment.
      setVerifyingPayment(true);
      closeDepositWebView();
    }
  };

  // ---------- Withdraw ----------
  const openWithdrawModal = () => {
    setWithdrawAmountInput('');
    setWithdrawPhoneInput(savedPhone);
    setWithdrawModalVisible(true);
  };

  const handleWithdrawSubmit = async () => {
    const numAmount = parseFloat(withdrawAmountInput);

    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }
    if (numAmount < MIN_WITHDRAWAL) {
      Alert.alert('Below Minimum', `Minimum withdrawal is ${currency} ${MIN_WITHDRAWAL}.`);
      return;
    }
    if (numAmount > balance) {
      Alert.alert(
        'Insufficient Balance',
        `You can withdraw up to ${currency} ${balance.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}.`
      );
      return;
    }

    const formattedPhone = formatKenyanPhone(withdrawPhoneInput.trim());
    if (!/^254[17][0-9]{8}$/.test(formattedPhone)) {
      Alert.alert('Invalid Phone', 'Enter a valid Kenyan phone number (e.g., 0712345678).');
      return;
    }

    try {
      setSubmittingWithdraw(true);

      const { error } = await supabase.rpc('request_withdrawal', {
        p_amount: numAmount,
        p_payout_phone: formattedPhone,
      });

      if (error) {
        Alert.alert('Withdrawal Failed', WITHDRAW_ERRORS[error.message] ?? error.message);
        fetchWalletData();
        return;
      }

      setWithdrawModalVisible(false);
      fetchWalletData();
      Alert.alert(
        'Withdrawal Requested',
        `Your request for ${currency} ${numAmount.toFixed(2)} was received. It will be paid out to ${formattedPhone} shortly.`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error occurred while processing request.');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.card, styles.centerCard]}>
        <ActivityIndicator size="small" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Wallet Section */}
      <View style={styles.walletBlock}>
        <View style={styles.headerLabelRow}>
          <ThemedText style={styles.sectionLabel}>WALLET BALANCE</ThemedText>
          <View style={styles.walletHeaderRight}>
            <View style={styles.actionsColumn}>
              <TouchableOpacity style={styles.depositBtn} onPress={openDepositModal}>
                <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                <Text style={styles.depositBtnText}>Deposit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.withdrawBtn} onPress={openWithdrawModal}>
                <Ionicons name="arrow-up-circle" size={16} color="#2563EB" />
                <Text style={styles.withdrawBtnText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.amountRow}>
          <ThemedText style={styles.currencyText}>{currency}</ThemedText>
          <ThemedText style={styles.balanceText}>
            {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </ThemedText>
          {verifyingPayment && (
            <ActivityIndicator size="small" color="#2563EB" style={{ marginLeft: 8 }} />
          )}
        </View>
      </View>

      <View style={styles.divider} />

      {/* Points Section */}
      <View style={styles.pointsBlock}>
        <View style={styles.pointsHeaderRow}>
          <View>
            <ThemedText style={styles.sectionLabel}>REWARD POINTS</ThemedText>
            <View style={styles.totalRow}>
              <ThemedText style={styles.totalPointsText}>{points.total.toLocaleString()}</ThemedText>
              <ThemedText style={styles.ptsUnit}>pts</ThemedText>
            </View>
          </View>
          <View style={styles.trophyIconContainer}>
            <Ionicons name="trophy" size={22} color="#EAB308" />
          </View>
        </View>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownBadge}>
            <View style={[styles.breakdownIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="stats-chart" size={14} color="#2563EB" />
            </View>
            <View>
              <ThemedText style={styles.breakdownCaption}>Predictions</ThemedText>
              <ThemedText style={styles.breakdownVal}>{points.predictionPoints.toLocaleString()}</ThemedText>
            </View>
          </View>

          <View style={styles.breakdownBadge}>
            <View style={[styles.breakdownIconWrap, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="calendar" size={14} color="#22C55E" />
            </View>
            <View>
              <ThemedText style={styles.breakdownCaption}>Check-ins</ThemedText>
              <ThemedText style={styles.breakdownVal}>{points.checkInPoints.toLocaleString()}</ThemedText>
            </View>
          </View>
        </View>
      </View>

      {/* Deposit Modal */}
      <Modal visible={depositModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Deposit Funds</Text>
              <TouchableOpacity onPress={() => setDepositModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Sponsored by Wonderbakes */}
            <Text style={styles.sponsoredText}>Sponsored by Wonderbakes</Text>

            <Text style={styles.inputLabel}>Amount (KES)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 100"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={amountInput}
              onChangeText={setAmountInput}
            />

            <TouchableOpacity
              style={[styles.submitBtn, submittingDeposit && styles.btnDisabled]}
              onPress={handleDepositSubmit}
              disabled={submittingDeposit}
            >
              {submittingDeposit ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {amountInput && !isNaN(parseFloat(amountInput)) && parseFloat(amountInput) > 0
                    ? `Deposit ${parseFloat(amountInput).toLocaleString()}`
                    : 'Deposit'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* In-app Deposit WebView */}
<Modal
  visible={depositWebViewVisible}
  animationType="slide"
  presentationStyle="fullScreen"
  onRequestClose={closeDepositWebView}
>
  
  <View style={styles.webViewContainer}>
    {/* Header with close button */}
    <View style={styles.webViewHeader}>
      <View style={styles.webViewTitleGroup}>
        <Text style={styles.webViewTitle}>Complete Deposit</Text>
        <Text style={styles.webViewSubtitle}>Sponsored by Wonderbakes</Text>
      </View>

      <TouchableOpacity onPress={closeDepositWebView} style={styles.webViewCloseBtn}>
        <Ionicons name="close" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>

    {depositWebViewUrl && (
      <WebView
        source={{ uri: depositWebViewUrl }}
        style={{ flex: 1 }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.webViewLoading}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        )}
        onNavigationStateChange={handleWebViewNavChange}
      />
    )}
  </View>
</Modal>

      {/* Withdraw Modal */}
      <Modal visible={withdrawModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdraw Funds</Text>
              <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.helperText}>
              Available: {currency}{' '}
              {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {'  •  '}Minimum: {currency} {MIN_WITHDRAWAL}
            </Text>

            <Text style={styles.inputLabel}>Amount (KES)</Text>
            <TextInput
              style={styles.textInput}
              placeholder={`Min ${MIN_WITHDRAWAL}`}
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={withdrawAmountInput}
              onChangeText={setWithdrawAmountInput}
            />

            <Text style={styles.inputLabel}>Payout Phone Number</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 0712345678"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={withdrawPhoneInput}
              onChangeText={setWithdrawPhoneInput}
            />

            <TouchableOpacity
              style={[styles.submitBtn, submittingWithdraw && styles.btnDisabled]}
              onPress={handleWithdrawSubmit}
              disabled={submittingWithdraw}
            >
              {submittingWithdraw ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Request Withdrawal</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sponsoredText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    marginBottom: 16,
    marginTop: -8,
    letterSpacing: 0.3,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  centerCard: {
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletBlock: {
    marginBottom: 16,
  },
  headerLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  walletHeaderRight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  actionsColumn: {
    alignItems: 'stretch',
    gap: 6,
  },
  depositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  depositBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  withdrawBtnText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  walletIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    gap: 6,
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  balanceText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  pointsBlock: {},
  pointsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    gap: 6,
  },
  totalPointsText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  ptsUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  trophyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF9C3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  breakdownBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  breakdownIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownCaption: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 1,
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

// --- In-app Paystack WebView ---
webViewContainer: {
  flex: 1,
  backgroundColor: '#FFFFFF',
},
webViewHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 16,
  paddingVertical: 14,
  backgroundColor: '#2563EB',
  borderBottomWidth: 3,
  borderBottomColor: '#1E3A8A',
  paddingTop: 50,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 4,
  elevation: 4,
},
webViewTitleGroup: {
  flex: 1,
  justifyContent: 'center',
},
webViewTitle: {
  fontSize: 17,
  fontWeight: '700',
  color: '#FFFFFF',
  letterSpacing: 0.2,
},
webViewSubtitle: {
  fontSize: 11,
  fontWeight: '500',
  color: 'rgba(255,255,255,0.75)',   // softly muted white, reads well on blue
  marginTop: 2,
  letterSpacing: 0.3,
},
webViewCloseBtn: {
  padding: 4,
  borderRadius: 8,
  backgroundColor: 'rgba(255,255,255,0.15)',
  marginLeft: 8,                     // small gap so subtitle doesn't crowd it
},
webViewLoading: {
  ...StyleSheet.absoluteFill,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#FFFFFF',
},
});