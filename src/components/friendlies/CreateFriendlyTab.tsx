import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';

interface MyChallenge {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface CreateFriendlyTabProps {
  currentUserId: string | null;
  onSuccess: () => void;
}

export default function CreateFriendlyTab({
  currentUserId,
  onSuccess,
}: CreateFriendlyTabProps) {
  const [amountInput, setAmountInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myChallenges, setMyChallenges] = useState<MyChallenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Fetch pending challenges created by the user
  const fetchMyChallenges = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setLoadingChallenges(true);
      const { data, error } = await supabase
        .from('friendly_match_requests')
        .select('id, amount, status, created_at')
        .eq('requester_id', currentUserId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyChallenges(data || []);
    } catch (err: any) {
      console.error('Error fetching my challenges:', err);
    } finally {
      setLoadingChallenges(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchMyChallenges();
  }, [fetchMyChallenges]);

  const handleCreateRequest = async () => {
    if (!currentUserId) {
      Alert.alert('Error', 'You must be logged in.');
      return;
    }

    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('friendly_match_requests')
        .insert({
          requester_id: currentUserId,
          amount: amount,
          status: 'pending',
        });

      if (error) throw error;

      Alert.alert('Success', 'Friendly match created!');
      setAmountInput('');
      fetchMyChallenges();
      onSuccess();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create friendly match.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelChallenge = (challengeId: string) => {
    Alert.alert(
      'Cancel Challenge',
      'Are you sure you want to cancel this challenge?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancellingId(challengeId);
              const { error } = await supabase
                .from('friendly_match_requests')
                .update({ status: 'cancelled' })
                .eq('id', challengeId);

              if (error) throw error;

              Alert.alert('Cancelled', 'Challenge cancelled successfully.');
              fetchMyChallenges();
              onSuccess();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to cancel challenge.');
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Create Form */}
      <View style={styles.formContainer}>
        <Text style={styles.label}>Match Amount (KES)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter amount (e.g. 100)"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          value={amountInput}
          onChangeText={setAmountInput}
        />

        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleCreateRequest}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Create Friendly Match</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Created Challenges Section */}
      <View style={styles.myChallengesSection}>
        <Text style={styles.sectionHeader}>Your Created Challenges</Text>

        {loadingChallenges ? (
          <ActivityIndicator size="small" color="#2563EB" style={{ marginTop: 12 }} />
        ) : myChallenges.length === 0 ? (
          <Text style={styles.emptyText}>You have no active created challenges.</Text>
        ) : (
          <FlatList
            data={myChallenges}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isCancelling = cancellingId === item.id;
              const prizePool = item.amount * 2;

              return (
                <View style={styles.card}>
                  <View style={styles.cardDetails}>
                    <Text style={styles.amountText}>Amount: KES {item.amount}</Text>
                    <Text style={styles.winningsText}>Winner gets: KES {prizePool}</Text>
                    <Text style={styles.dateText}>
                      Created: {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.cancelBtn, isCancelling && { opacity: 0.6 }]}
                    onPress={() => handleCancelChallenge(item.id)}
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  myChallengesSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  listContent: {
    gap: 10,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDetails: {
    flex: 1,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16A34A',
    marginBottom: 2,
  },
  winningsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#E11D48',
    fontSize: 12,
    fontWeight: '700',
  },
});