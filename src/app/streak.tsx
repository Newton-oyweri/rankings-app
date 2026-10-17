import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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
    setRefreshTrigger((prev) => prev + 1);
  }, [loadUser]);

  const handleCheckInSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="small" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={['#1E3A8A', '#2563EB', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 14 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="trophy" size={20} color="#FEF08A" />
          </View>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>Rankings eFootball</Text>
            <Text style={styles.headerSubtitle}>Rewards & Wallet</Text>
          </View>
        </View>
      </LinearGradient>

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
        {userId && (
          <WalletPointsHeader userId={userId} refreshTrigger={refreshTrigger} />
        )}

        {userId && (
          <DailyCheckIn
            userId={userId}
            onCheckInSuccess={handleCheckInSuccess}
          />
        )}

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
    backgroundColor: '#F9FAFB',       // matches Leaderboard's screen bg
  },
  headerGradient: {
    paddingBottom: 14,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#E0E7FF',
    marginTop: 1,
  },
  container: {
    paddingHorizontal: Spacing.four,
    paddingTop: 16,
    alignItems: 'center',
    flexGrow: 1,
    gap: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});