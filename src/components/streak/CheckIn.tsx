import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface DailyCheckInProps {
  userId: string;
  onCheckInSuccess?: () => void;
}

export function DailyCheckIn({ userId, onCheckInSuccess }: DailyCheckInProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);

  const checkTodayStatus = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', userId)
        .eq('check_in_date', today)
        .maybeSingle();

      if (error) throw error;
      setHasCheckedIn(!!data);
    } catch (err: any) {
      console.error('Error fetching check-in status:', err.message || err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    checkTodayStatus();
  }, [checkTodayStatus]);

  const handleCheckIn = async () => {
    if (hasCheckedIn || submitting || !userId) return;

    try {
      setSubmitting(true);
      const { data, error } = await supabase.rpc('perform_daily_check_in', {
        p_user_id: userId,
      });

      if (error) throw error;

      if (data.success) {
        setHasCheckedIn(true);
        onCheckInSuccess?.();
        Alert.alert('Success', 'You earned +10 points for checking in today!');
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
      <View style={styles.card}>
        <ActivityIndicator size="small" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: hasCheckedIn ? '#F0FDF4' : '#EFF6FF' },
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
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
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
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
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
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  rewardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#854D0E',
  },
  button: {
    width: '100%',
    minHeight: 48,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
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
    textAlign: 'center',
  },
  buttonTextDisabled: {
    color: '#64748B',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  statusText: {
    fontSize: 13,
    color: '#22C55E',
    fontWeight: '600',
  },
});