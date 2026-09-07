import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

interface Transaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | string;
  reference: string | null;
  description: string | null;
  created_at: string;
}

interface TransactionHistoryProps {
  userId: string;
  refreshTrigger?: number; // Add this prop
}

export function TransactionHistory({ userId, refreshTrigger }: TransactionHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const fetchTransactions = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);

      // Query wallet_transactions joined on user's wallet
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select(`
          id,
          wallet_id,
          amount,
          type,
          status,
          reference,
          description,
          created_at,
          wallets!inner(user_id)
        `)
        .eq('wallets.user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, refreshTrigger]); // Add refreshTrigger to dependencies

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS':
      case 'COMPLETED':
        return '#22C55E';
      case 'PENDING':
        return '#EAB308';
      case 'FAILED':
        return '#EF4444';
      default:
        return '#64748B';
    }
  };

  const isDeposit = (type: string) => type.toUpperCase() === 'DEPOSIT';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Recent Transactions</ThemedText>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color="#2563EB" style={styles.loader} />
      ) : transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={32} color="#94A3B8" />
          <ThemedText style={styles.emptyText}>No transactions found</ThemedText>
        </View>
      ) : (
        <View style={styles.list}>
          {transactions.map((tx) => {
            const deposit = isDeposit(tx.type);
            const statusColor = getStatusColor(tx.status);

            return (
              <View key={tx.id} style={styles.txItem}>
                <View style={[styles.iconWrap, { backgroundColor: deposit ? '#F0FDF4' : '#FEF2F2' }]}>
                  <Ionicons
                    name={deposit ? 'arrow-down' : 'arrow-up'}
                    size={18}
                    color={deposit ? '#22C55E' : '#EF4444'}
                  />
                </View>

                <View style={styles.txInfo}>
                  <ThemedText style={styles.txType}>
                    {tx.description || (deposit ? 'Deposit' : 'Withdrawal')}
                  </ThemedText>
                  <ThemedText style={styles.txDate}>
                    {new Date(tx.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </ThemedText>
                </View>

                <View style={styles.txAmountWrap}>
                  <ThemedText style={[styles.txAmount, { color: deposit ? '#16A34A' : '#0F172A' }]}>
                    {deposit ? '+' : '-'} KES {Number(tx.amount).toFixed(2)}
                  </ThemedText>
                  <View style={styles.statusBadge}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <ThemedText style={[styles.statusText, { color: statusColor }]}>
                      {tx.status}
                    </ThemedText>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
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
    marginTop: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  loader: {
    marginVertical: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  list: {
    gap: 14,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  txDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  txAmountWrap: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});