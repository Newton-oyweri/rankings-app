import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface CheckInRecord {
  id: number;
  points: number;
  check_in_date: string;
}

interface PointsSummary {
  total: number;
  predictionPoints: number;
  checkInPoints: number;
}

export default function CheckInScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [, setTodayRecord] = useState<CheckInRecord | null>(null);

  const [points, setPoints] = useState<PointsSummary>({
    total: 0,
    predictionPoints: 0,
    checkInPoints: 0,
  });

  const fetchUserPoints = useCallback(async (userId: string) => {
    try {
      // 1. Fetch from SQL view if available
      const { data: viewData, error: viewError } = await supabase
        .from('user_total_points')
        .select('prediction_points, checkin_points, total_points')
        .eq('user_id', userId)
        .maybeSingle();

      if (!viewError && viewData) {
        setPoints({
          total: Number(viewData.total_points) || 0,
          predictionPoints: Number(viewData.prediction_points) || 0,
          checkInPoints: Number(viewData.checkin_points) || 0,
        });
        return;
      }

      // 2. Fallback query
      const [predResult, checkInResult] = await Promise.all([
        supabase
          .from('prediction_points')
          .select('points')
          .eq('user_id', userId),
        supabase
          .from('check_ins')
          .select('points')
          .eq('user_id', userId),
      ]);

      const totalPred =
        predResult.data?.reduce((acc, curr) => acc + (curr.points || 0), 0) || 0;
      const totalCheckIn =
        checkInResult.data?.reduce((acc, curr) => acc + (curr.points || 0), 0) || 0;

      setPoints({
        total: totalPred + totalCheckIn,
        predictionPoints: totalPred,
        checkInPoints: totalCheckIn,
      });
    } catch (err) {
      console.error('Error fetching user points:', err);
    }
  }, []);

  const checkTodayStatus = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) throw new Error('User not authenticated');

      const today = new Date().toISOString().split('T')[0];

      const [, checkInResponse] = await Promise.all([
        fetchUserPoints(user.id),
        supabase
          .from('check_ins')
          .select('*')
          .eq('user_id', user.id)
          .eq('check_in_date', today)
          .maybeSingle(),
      ]);

      if (checkInResponse.error) throw checkInResponse.error;

      if (checkInResponse.data) {
        setHasCheckedIn(true);
        setTodayRecord(checkInResponse.data);
      } else {
        setHasCheckedIn(false);
      }
    } catch (err: any) {
      console.error('Error fetching check-in status:', err.message || err);
    } finally {
      setLoading(false);
    }
  }, [fetchUserPoints]);

  useEffect(() => {
    checkTodayStatus();
  }, [checkTodayStatus]);

  const handleCheckIn = async () => {
    if (hasCheckedIn || submitting) return;

    try {
      setSubmitting(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'Please sign in to check in.');
        return;
      }

      const { data, error } = await supabase.rpc('perform_daily_check_in', {
        p_user_id: user.id,
      });

      if (error) throw error;

      if (data.success) {
        setHasCheckedIn(true);
        setTodayRecord(data.check_in);
        await fetchUserPoints(user.id);
        Alert.alert('🎉 Success!', 'You earned +10 points for checking in today!');
      } else {
        Alert.alert('Notice', data.message);
        if (data.message.includes('Already')) {
          setHasCheckedIn(true);
        }
      }
    } catch (err: any) {
      console.error('Check-in error:', err);
      Alert.alert('Error', err.message || 'Failed to complete check-in.');
    } finally {
      setSubmitting(false);
    }
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
      >
        {/* Points Summary Header */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsHeaderRow}>
            <View style={styles.pointsTextBlock}>
              <ThemedText style={styles.pointsLabel}>TOTAL BALANCE</ThemedText>
              <View style={styles.totalRow}>
                <ThemedText style={styles.totalPointsText}>
                  {points.total.toLocaleString()}
                </ThemedText>
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
                <ThemedText style={styles.breakdownVal}>
                  {points.predictionPoints.toLocaleString()}
                </ThemedText>
              </View>
            </View>

            <View style={styles.breakdownBadge}>
              <View style={[styles.breakdownIconWrap, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="calendar" size={14} color="#22C55E" />
              </View>
              <View>
                <ThemedText style={styles.breakdownCaption}>Check-ins</ThemedText>
                <ThemedText style={styles.breakdownVal}>
                  {points.checkInPoints.toLocaleString()}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Check-In Action Card */}
        <View style={styles.card}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: hasCheckedIn ? '#F0FDF4' : '#EFF6FF',
              },
            ]}
          >
            <Ionicons
              name={hasCheckedIn ? 'checkmark-circle' : 'calendar'}
              size={48}
              color={hasCheckedIn ? '#22C55E' : '#2563EB'}
            />
          </View>

          <ThemedText style={styles.title}>Daily Check-In</ThemedText>
          <ThemedText style={styles.subtitle}>
            Check in every day to claim your daily reward!
          </ThemedText>

          <View style={styles.rewardBadge}>
            <Ionicons name="sparkles" size={15} color="#CA8A04" />
            <ThemedText style={styles.rewardText}>+10 Points</ThemedText>
          </View>

          <Pressable
            onPress={handleCheckIn}
            disabled={hasCheckedIn || submitting}
            style={({ pressed }) => [
              styles.button,
              hasCheckedIn && styles.buttonDisabled,
              pressed && !hasCheckedIn && !submitting && styles.buttonPressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <ThemedText
                style={[
                  styles.buttonText,
                  hasCheckedIn && styles.buttonTextDisabled,
                ]}
              >
                {hasCheckedIn ? 'Checked In Today' : 'Claim Daily +10 Pts'}
              </ThemedText>
            )}
          </Pressable>

          {hasCheckedIn && (
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
              <ThemedText style={styles.statusText}>
                Come back tomorrow for your next check-in!
              </ThemedText>
            </View>
          )}
        </View>
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
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },

  /* Points Header Card */
  pointsCard: {
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
  pointsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsTextBlock: {
    flex: 1,
  },
  pointsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    gap: 6,
  },
  totalPointsText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  ptsUnit: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94A3B8',
  },
  trophyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FEF9C3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
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
    width: 32,
    height: 32,
    borderRadius: 10,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* Check-In Card */
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#854D0E',
  },
  button: {
    width: '100%',
    height: 52,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  buttonTextDisabled: {
    color: '#64748B',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  statusText: {
    fontSize: 13,
    color: '#22C55E',
    fontWeight: '600',
  },
});