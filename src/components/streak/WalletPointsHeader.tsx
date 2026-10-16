import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
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

import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import { PAYSTACK_CONFIG } from '@/lib/paystack';



// Base API URL
const API_BASE_URL = 'https://neville-interconfessional-enedina.ngrok-free.dev';

interface PointsSummary {
  total: number;
  predictionPoints: number;
  checkInPoints: number;
}

interface WalletPointsHeaderProps {
  userId: string;
  refreshTrigger?: number;
}

// Helper: Format Kenyan Phone Numbers to 2547XXXXXXXX
const formatKenyanPhone = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.slice(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned;
  }
  return cleaned;
};

export function WalletPointsHeader({ userId, refreshTrigger }: WalletPointsHeaderProps) {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('KES');
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [points, setPoints] = useState<PointsSummary>({
    total: 0,
    predictionPoints: 0,
    checkInPoints: 0,
  });

  // Modal State
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  // Fetch wallet data
  const fetchWalletData = useCallback(async () => {
    const { data, error } = await supabase
      .from('wallets')
      .select('balance, currency')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setBalance(Number(data.balance) || 0);
      setCurrency(data.currency || 'KES');
    }
  }, [userId]);

  // Fetch profile data
  const fetchProfileData = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', userId)
      .maybeSingle();

    if (data?.phone) {
      setUserPhone(data.phone);
      setPhoneInput(data.phone);
    }
  }, [userId]);

  // Fetch points data
  const fetchPointsData = useCallback(async () => {
    // Try to get from view first
    const { data: viewData, error: viewError } = await supabase
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

    // Fallback: calculate from individual tables
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
      await Promise.all([fetchWalletData(), fetchProfileData(), fetchPointsData()]);
    } catch (err) {
      console.error('Error fetching wallet/points data:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, fetchWalletData, fetchProfileData, fetchPointsData]);

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

  // Modal handlers
  const openDepositModal = () => {
    setAmountInput('');
    setPhoneInput(userPhone || '');
    setDepositModalVisible(true);
  };

  const handleDepositSubmit = async () => {
    const numAmount = parseFloat(amountInput);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid deposit amount greater than 0.');
      return;
    }

    const rawPhone = phoneInput.trim();
    if (!rawPhone) {
      Alert.alert('Phone Required', 'Please enter your M-Pesa phone number to proceed.');
      return;
    }

    const formattedPhone = formatKenyanPhone(rawPhone);
    if (formattedPhone.length !== 12 || !formattedPhone.startsWith('254')) {
      Alert.alert('Invalid Phone', 'Please enter a valid Kenyan phone number (e.g., 0712345678).');
      return;
    }

    try {
      setSubmittingDeposit(true);

      // Update phone if changed
      if (formattedPhone !== userPhone) {
        const { error } = await supabase
          .from('profiles')
          .update({ phone: formattedPhone })
          .eq('id', userId);

        if (!error) {
          setUserPhone(formattedPhone);
        }
      }

      // Initiate STK Push
      const response = await fetch(`${API_BASE_URL}/api/mpesa/stkpush`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formattedPhone,
          amount: numAmount,
          userId: userId,
        }),
      });

      const data = await response.json();
      const isSuccess = response.ok && (data.success || data.ResponseCode === '0');

      if (isSuccess) {
        Alert.alert(
          'STK Push Sent',
          'Please enter your M-Pesa PIN on your phone to complete the transaction.'
        );
        setDepositModalVisible(false);
      } else {
        Alert.alert(
          'Deposit Failed',
          data.CustomerMessage || data.message || data.error || 'Failed to initiate STK push.'
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error occurred while processing request.');
    } finally {
      setSubmittingDeposit(false);
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
            <TouchableOpacity style={styles.depositBtn} onPress={openDepositModal}>
              <Ionicons name="add-circle" size={16} color="#FFFFFF" />
              <Text style={styles.depositBtnText}>Deposit</Text>
            </TouchableOpacity>
            <View style={styles.walletIconWrap}>
              <Ionicons name="wallet-outline" size={18} color="#2563EB" />
            </View>
          </View>
        </View>

        <View style={styles.amountRow}>
          <ThemedText style={styles.currencyText}>{currency}</ThemedText>
          <ThemedText style={styles.balanceText}>
            {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </ThemedText>
        </View>

        {userPhone && (
          <ThemedText style={styles.phoneSubtext}>Linked M-Pesa: {userPhone}</ThemedText>
        )}
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

            <Text style={styles.inputLabel}>M-Pesa Phone Number</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 0712345678"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={phoneInput}
              onChangeText={setPhoneInput}
            />

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
                <Text style={styles.submitBtnText}>Request STK Push</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  walletHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  depositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
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
  phoneSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
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
});