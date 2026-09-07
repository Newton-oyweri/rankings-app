import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DailyCheckIn } from '@/components/streak/CheckIn';
import { TransactionHistory } from '@/components/streak/TransactionHistory';
import { WalletPointsHeader } from '@/components/streak/WalletPointsHeader';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function CheckInScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadUser = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) throw new Error('User not authenticated');
      setUserId(user.id);
    } catch (err: any) {
      console.error('Error fetching user:', err.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUser();
    // Refresh all components
    setRefreshTrigger((prev) => prev + 1);
  }, [loadUser]);

  const handleCheckInSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <ActivityIndicator size="small" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#2563EB"
            colors={['#2563EB']}
          />
        }
      >
        {/* Wallet Balance + Points Header */}
        {userId && (
          <WalletPointsHeader userId={userId} refreshTrigger={refreshTrigger} />
        )}

        {/* Daily Check-In Component */}
        {userId && (
          <DailyCheckIn
            userId={userId}
            onCheckInSuccess={handleCheckInSuccess}
          />
        )}

        {/* Transaction History Section */}
        {userId && (
          <TransactionHistory 
            userId={userId} 
            refreshTrigger={refreshTrigger} 
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    paddingHorizontal: Spacing.four,
    paddingTop: 12,
    alignItems: 'center',
    flexGrow: 1,
    gap: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
});