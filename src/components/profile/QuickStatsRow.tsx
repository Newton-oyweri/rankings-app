import { SymbolView } from 'expo-symbols';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

export interface QuickStat {
  id: string;
  label: string;
  value: string | number;
  icon: 'target' | 'percent' | 'flame' | 'chart';
}

interface QuickStatsRowProps {
  userId?: string;
}

const iconMap: Record<QuickStat['icon'], any> = {
  chart: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
  target: { ios: 'target', android: 'gps_fixed', web: 'gps_fixed' },
  percent: { ios: 'percent', android: 'percent', web: 'percent' },
  flame: { ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' },
};

export function QuickStatsRow({ userId }: QuickStatsRowProps) {
  const [stats, setStats] = useState<QuickStat[]>([
    { id: 'predictions', label: 'Predictions', value: 0, icon: 'chart' },
    { id: 'correct', label: 'Correct', value: 0, icon: 'target' },
    { id: 'win_rate', label: 'Win Rate', value: '0%', icon: 'percent' },
    { id: 'checkins', label: 'Check-ins', value: 0, icon: 'flame' },
  ]);
  const [loading, setLoading] = useState<boolean>(!!userId);

  const fetchQuickStats = useCallback(async (uid: string) => {
    try {
      setLoading(true);

      // Fetch total predictions count and correct predictions count in parallel
      const [allVotesRes, correctVotesRes, checkInsRes] = await Promise.all([
        supabase
          .from('match_votes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', uid),

        supabase
          .from('match_votes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', uid)
          .eq('outcome', 'correct'),

        supabase
          .from('check_ins')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', uid),
      ]);

      const totalPredictions = allVotesRes.count || 0;
      const correctPredictions = correctVotesRes.count || 0;
      const checkInsCount = checkInsRes.count || 0;

      // Win Rate calculation
      const winRatePercent =
        totalPredictions > 0
          ? Math.round((correctPredictions / totalPredictions) * 100)
          : 0;

      setStats([
        { id: 'predictions', label: 'Predictions', value: totalPredictions, icon: 'chart' },
        { id: 'correct', label: 'Correct', value: correctPredictions, icon: 'target' },
        { id: 'win_rate', label: 'Win Rate', value: `${winRatePercent}%`, icon: 'percent' },
        { id: 'checkins', label: 'Check-ins', value: checkInsCount, icon: 'flame' },
      ]);
    } catch (error) {
      console.error('Error fetching quick stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchQuickStats(userId);
    }
  }, [userId, fetchQuickStats]);

  if (loading) {
    return (
      <View style={[styles.statsRow, styles.loaderContainer]}>
        <ActivityIndicator size="small" color="#1E293B" />
      </View>
    );
  }

  return (
    <View style={styles.statsRow}>
      {stats.map((stat) => (
        <View key={stat.id} style={styles.statItem}>
          <SymbolView name={iconMap[stat.icon]} size={20} tintColor="#64748B" />
          <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
          <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 70,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
});