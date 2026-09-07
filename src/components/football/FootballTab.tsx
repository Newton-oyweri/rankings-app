import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import Fixtures, { JackpotGame, PredictionChoice, TierConfig } from './fixtures';

type TierKey = 5 | 6 | 7;

interface Jackpot {
  id: string;
  name: string;
  game_count: number;
  entry_fee: number;
  prize_amount: number | null;
  status: string;
  jackpot_games: JackpotGame[];
}

const TIER_CONFIGS: TierConfig[] = [
  { 
    key: 5, 
    title: 'Rankings 5', 
    entryFee: 25, 
    prize: 2500, 
    color: '#0EA5E9',
    badgeBg: 'rgba(14, 165, 233, 0.15)' 
  },
  { 
    key: 6, 
    title: 'Rankings 6', 
    entryFee: 30, 
    prize: 5000, 
    color: '#10B981',
    badgeBg: 'rgba(16, 185, 129, 0.15)' 
  },
  { 
    key: 7, 
    title: 'Rankings 7', 
    entryFee: 50, 
    prize: 10000, 
    color: '#EC4899',
    badgeBg: 'rgba(236, 72, 153, 0.15)' 
  },
];

const SELECTION_MAP: Record<PredictionChoice, 'HOME' | 'DRAW' | 'AWAY'> = {
  '1': 'HOME',
  '-': 'DRAW',
  '2': 'AWAY',
};

export default function FootballTab() {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<TierKey>(7);
  const [jackpotsMap, setJackpotsMap] = useState<Record<number, Jackpot>>({});
  const [predictions, setPredictions] = useState<Record<string, PredictionChoice>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchJackpots = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('jackpots')
        .select(`
          id,
          name,
          game_count,
          entry_fee,
          prize_amount,
          status,
          jackpot_games (
            id,
            game_number,
            home_team,
            away_team,
            match_time,
            status
          )
        `)
        .eq('status', 'open');

      if (error) {
        console.error('Error fetching jackpots:', error.message);
        return;
      }

      if (data) {
        const mapped: Record<number, Jackpot> = {};
        data.forEach((j) => {
          const sortedGames = (j.jackpot_games || []).sort(
            (a, b) => a.game_number - b.game_number
          );
          mapped[j.game_count] = {
            ...j,
            jackpot_games: sortedGames,
          } as Jackpot;
        });
        setJackpotsMap(mapped);
      }
    } catch (err) {
      console.error('Error in fetchJackpots:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchJackpots();
  }, [fetchJackpots]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJackpots();
  }, [fetchJackpots]);

  const activeConfig = TIER_CONFIGS.find((t) => t.key === selectedTier)!;
  const activeJackpot = jackpotsMap[selectedTier];
  const currentMatches = activeJackpot?.jackpot_games || [];

  const handlePick = (gameId: string, choice: PredictionChoice) => {
    setPredictions((prev) => ({
      ...prev,
      [gameId]: prev[gameId] === choice ? (undefined as unknown as PredictionChoice) : choice,
    }));
  };

  const handleSubmit = async () => {
    // 1. Check Authentication Status
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/(auth)/sign-in');
      return;
    }

    if (!activeJackpot) {
      Alert.alert('Error', 'Jackpot tournament unavailable.');
      return;
    }

    setSubmitting(true);

    try {
      // 2. Fetch user's prior entries to increment `entry_number`
      const { count, error: countError } = await supabase
        .from('jackpot_entries')
        .select('*', { count: 'exact', head: true })
        .eq('jackpot_id', activeJackpot.id)
        .eq('user_id', user.id);

      if (countError) throw countError;

      const nextEntryNumber = (count || 0) + 1;

      // 3. Create jackpot_entries record
      const { data: entryData, error: entryError } = await supabase
        .from('jackpot_entries')
        .insert({
          jackpot_id: activeJackpot.id,
          user_id: user.id,
          entry_number: nextEntryNumber,
          entry_fee: activeConfig.entryFee,
          status: 'submitted',
        })
        .select('id')
        .single();

      if (entryError) throw entryError;

      // 4. Map and insert selection rows
      const selectionsPayload = currentMatches.map((match) => ({
        entry_id: entryData.id,
        game_id: match.id,
        selection: SELECTION_MAP[predictions[match.id]],
      }));

      const { error: selectionsError } = await supabase
        .from('jackpot_selections')
        .insert(selectionsPayload);

      if (selectionsError) throw selectionsError;

      Alert.alert(
        'Success!',
        `Your ${activeConfig.title} predictions have been placed (Entry #${nextEntryNumber}).`
      );

      // Reset local predictions state on success
      setPredictions({});
    } catch (error: any) {
      console.error('Submission failed:', error);
      Alert.alert('Submission Error', error.message || 'Unable to place your jackpot entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCount = currentMatches.filter((m) => predictions[m.id]).length;
  const isComplete = currentMatches.length > 0 && selectedCount === activeConfig.key;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={activeConfig.color} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 2 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* ── Tier Selection Chips ── */}
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Select Game Mode
        </ThemedText>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tierRow}>
        {TIER_CONFIGS.map((tier) => {
          const isActive = selectedTier === tier.key;
          return (
            <Pressable
              key={tier.key}
              style={[
                styles.tierChip,
                isActive && { backgroundColor: tier.color, borderColor: tier.color },
              ]}
              onPress={() => setSelectedTier(tier.key)}
            >
              <ThemedText style={[styles.tierTitle, isActive && styles.tierTextActive]}>
                {tier.title}
              </ThemedText>
              <ThemedText style={[styles.tierFee, isActive && styles.tierSubtextActive]}>
                KSh {tier.entryFee} → Win KSh {tier.prize.toLocaleString()}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Active Banner Header ── */}
      <View style={[styles.bannerCard, { borderColor: activeConfig.color }]}>
        <View style={styles.bannerHeader}>
          <View>
            <View style={[styles.badgeContainer, { backgroundColor: activeConfig.badgeBg }]}>
              <ThemedText style={[styles.bannerBadge, { color: activeConfig.color }]}>
                {activeConfig.title}
              </ThemedText>
            </View>
            <ThemedText style={styles.bannerTarget}>
              Top Prize: KSh {activeConfig.prize.toLocaleString()}
            </ThemedText>
          </View>
          <View style={styles.entryBox}>
            <ThemedText style={styles.entryLabel}>Entry</ThemedText>
            <ThemedText style={[styles.entryPrice, { color: activeConfig.color }]}>
              KSh {activeConfig.entryFee}
            </ThemedText>
          </View>
        </View>

        <View style={styles.progressRow}>
          <ThemedText style={styles.progressText}>
            Predictions: {selectedCount} / {activeConfig.key}
          </ThemedText>
          <ThemedText style={[styles.progressStatus, { color: activeConfig.color }]}>
            {currentMatches.length === 0
              ? 'No Fixtures Available'
              : isComplete
              ? 'Ready to play!'
              : `Pick ${activeConfig.key - selectedCount} more`}
          </ThemedText>
        </View>
      </View>

      {/* ── Match Fixtures Section Header ── */}
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Predict All {activeConfig.key} Fixtures
        </ThemedText>
      </View>

      {/* ── Delegated Fixtures & Submit View ── */}
      <Fixtures
        currentMatches={currentMatches}
        activeConfig={activeConfig}
        predictions={predictions}
        submitting={submitting}
        onPick={handlePick}
        onSubmit={handleSubmit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 250,
  },
  sectionHeader: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  tierRow: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    gap: 10,
  },
  tierChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 125,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tierTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  tierFee: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  tierTextActive: {
    color: '#FFFFFF',
  },
  tierSubtextActive: {
    color: '#F9FAFB',
  },
  bannerCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  bannerBadge: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  bannerTarget: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  entryBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  entryLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  entryPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressText: {
    fontSize: 12,
    color: '#E0E7FF',
    fontWeight: '600',
  },
  progressStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
});