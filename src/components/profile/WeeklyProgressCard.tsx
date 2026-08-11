import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

interface WeeklyProgressCardProps {
  currentPoints: number;
  targetPoints: number;
  daysLeft: number;
  onPressLeaderboard?: () => void;
}

export function WeeklyProgressCard({
  currentPoints,
  targetPoints,
  daysLeft,
  onPressLeaderboard,
}: WeeklyProgressCardProps) {
  const percentage = Math.min(100, Math.round((currentPoints / targetPoints) * 100));

  return (
    <View style={styles.weeklyCard}>
      <View style={styles.weeklyHeader}>
        <ThemedText style={styles.weeklyTitle}>Weekly Progress</ThemedText>
        <ThemedText style={styles.daysLeft}>{daysLeft} days left</ThemedText>
      </View>

      <View style={styles.weeklyStats}>
        <View>
          <ThemedText style={styles.weeklyLabel}>You</ThemedText>
          <ThemedText style={styles.weeklyValue}>
            {currentPoints.toLocaleString()} pts
          </ThemedText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <ThemedText style={styles.weeklyLabel}>Goal</ThemedText>
          <ThemedText style={styles.weeklyValue}>
            {targetPoints.toLocaleString()} pts
          </ThemedText>
        </View>
      </View>

      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
      </View>

      <ThemedText style={styles.progressPercent}>{percentage}%</ThemedText>
      <ThemedText style={styles.progressHint}>
        Keep going! You’re close to your weekly goal.
      </ThemedText>

      <Pressable style={styles.leaderboardBtn} onPress={onPressLeaderboard}>
        <SymbolView
          name={{ ios: 'trophy', android: 'emoji_events', web: 'emoji_events' }}
          size={16}
          tintColor="#2563EB"
        />
        <ThemedText style={styles.leaderboardText}>View Leaderboard</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  weeklyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  weeklyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weeklyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  daysLeft: {
    fontSize: 12,
    color: '#64748B',
  },
  weeklyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weeklyLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  weeklyValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'right',
  },
  progressHint: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
  leaderboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },
  leaderboardText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
});