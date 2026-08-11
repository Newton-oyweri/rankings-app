import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

interface VotingStats {
  homeVotes: number;
  drawVotes: number;
  awayVotes: number;
  totalVotes: number;
  userVote: 'home' | 'draw' | 'away' | null;
}

/**
 * Generates a deterministic, colorful initials avatar fallback using DiceBear.
 */
const getTeamAvatar = (name?: string, avatarUrl?: string) => {
  if (avatarUrl && avatarUrl.trim() !== '') {
    return avatarUrl;
  }
  const seedName = name ? encodeURIComponent(name) : 'Team';
  return `https://api.dicebear.com/9.x/initials/png?seed=${seedName}&backgroundType=gradientLinear`;
};

export default function MatchStatsScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = Number(id);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [matchData, setMatchData] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [stats, setStats] = useState<VotingStats>({
    homeVotes: 0,
    drawVotes: 0,
    awayVotes: 0,
    totalVotes: 0,
    userVote: null,
  });

  useEffect(() => {
    if (!matchId) return;
    loadMatchAndVotes();
  }, [matchId]);

  const loadMatchAndVotes = async () => {
    try {
      setLoading(true);

      // 1. Get Current Auth User
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id ?? null;
      setUserId(currentUserId);

      // 2. Fetch Match Details
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:home_team_id(*),
          away_team:away_team_id(*),
          tournament:tournament_id(*)
        `)
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;
      setMatchData(match);

      // 3. Fetch Vote Tallies
      const { data: votes, error: votesError } = await supabase
        .from('match_votes')
        .select('predicted_winner, user_id')
        .eq('match_id', matchId);

      if (votesError) throw votesError;

      let home = 0;
      let draw = 0;
      let away = 0;
      let userChoice: 'home' | 'draw' | 'away' | null = null;

      votes.forEach((v) => {
        if (v.predicted_winner === 'home') home++;
        else if (v.predicted_winner === 'draw') draw++;
        else if (v.predicted_winner === 'away') away++;

        if (currentUserId && v.user_id === currentUserId) {
          userChoice = v.predicted_winner as 'home' | 'draw' | 'away';
        }
      });

      setStats({
        homeVotes: home,
        drawVotes: draw,
        awayVotes: away,
        totalVotes: votes.length,
        userVote: userChoice,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load match details.');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (prediction: 'home' | 'draw' | 'away') => {
    // Redirect unauthenticated user to sign-in page directly
    if (!userId) {
      router.push('/sign-in');
      return;
    }

    try {
      setSubmitting(true);

      // Upsert prediction into match_votes
      const { error } = await supabase.from('match_votes').upsert(
        {
          match_id: matchId,
          user_id: userId,
          predicted_winner: prediction,
        },
        { onConflict: 'match_id,user_id' }
      );

      if (error) throw error;

      // Refresh local state tallies
      await loadMatchAndVotes();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to register vote.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const homeName = matchData?.home_team?.name ?? 'Home';
  const awayName = matchData?.away_team?.name ?? 'Away';
  const homeAvatar = getTeamAvatar(homeName, matchData?.home_team?.avatar_url);
  const awayAvatar = getTeamAvatar(awayName, matchData?.away_team?.avatar_url);

  const homePercent =
    stats.totalVotes > 0 ? Math.round((stats.homeVotes / stats.totalVotes) * 100) : 0;
  const drawPercent =
    stats.totalVotes > 0 ? Math.round((stats.drawVotes / stats.totalVotes) * 100) : 0;
  const awayPercent =
    stats.totalVotes > 0 ? Math.round((stats.awayVotes / stats.totalVotes) * 100) : 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Colorful Linear Gradient Header */}
      <LinearGradient
        colors={['#1E3A8A', '#2563EB', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 12) }]}
      >
        <View style={styles.headerRow}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Match Prediction</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Teams Banner */}
        <LinearGradient
          colors={['#EFF6FF', '#F3E8FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bannerCard}
        >
          <ThemedText style={styles.tournamentName}>
            {matchData?.tournament?.name ?? 'Match Center'}
          </ThemedText>

          <View style={styles.teamsRow}>
            {/* Home Team */}
            <View style={styles.teamCol}>
              <Image source={{ uri: homeAvatar }} style={styles.teamBadge} />
              <ThemedText style={styles.teamName} numberOfLines={2}>
                {homeName}
              </ThemedText>
            </View>

            <View style={styles.vsContainer}>
              <ThemedText style={styles.vsText}>VS</ThemedText>
            </View>

            {/* Away Team */}
            <View style={styles.teamCol}>
              <Image source={{ uri: awayAvatar }} style={styles.teamBadge} />
              <ThemedText style={styles.teamName} numberOfLines={2}>
                {awayName}
              </ThemedText>
            </View>
          </View>
        </LinearGradient>

        {/* Prediction Stats Box */}
        <View style={styles.predictionBox}>
          <View style={styles.predictionBoxHeader}>
            <Ionicons name="stats-chart" size={18} color="#2563EB" />
            <ThemedText style={styles.predictionBoxTitle}>
              Community Predictions
            </ThemedText>
          </View>
          <ThemedText style={styles.totalVotersText}>
            {stats.totalVotes} {stats.totalVotes === 1 ? 'person has' : 'people have'} predicted
          </ThemedText>

          {/* Combined Visual Bar */}
          <View style={styles.voteBar}>
            <View
              style={[
                styles.voteSegment,
                { flex: homePercent || 1, backgroundColor: '#2563EB' },
              ]}
            />
            <View
              style={[
                styles.voteSegment,
                { flex: drawPercent || 1, backgroundColor: '#9CA3AF' },
              ]}
            />
            <View
              style={[
                styles.voteSegment,
                { flex: awayPercent || 1, backgroundColor: '#DC2626' },
              ]}
            />
          </View>

          {/* Voting Options Buttons */}
          <View style={styles.optionsContainer}>
            {/* Home Win */}
            <Pressable
              disabled={submitting}
              style={[
                styles.optionBtn,
                stats.userVote === 'home' && styles.optionBtnSelected,
              ]}
              onPress={() => handleVote('home')}
            >
              <ThemedText style={styles.optionLabel} numberOfLines={1}>
                {homeName}
              </ThemedText>
              <ThemedText style={styles.optionPercent}>{homePercent}%</ThemedText>
              <ThemedText style={styles.optionCount}>({stats.homeVotes})</ThemedText>
            </Pressable>

            {/* Draw */}
            <Pressable
              disabled={submitting}
              style={[
                styles.optionBtn,
                stats.userVote === 'draw' && styles.optionBtnSelected,
              ]}
              onPress={() => handleVote('draw')}
            >
              <ThemedText style={styles.optionLabel}>Draw</ThemedText>
              <ThemedText style={styles.optionPercent}>{drawPercent}%</ThemedText>
              <ThemedText style={styles.optionCount}>({stats.drawVotes})</ThemedText>
            </Pressable>

            {/* Away Win */}
            <Pressable
              disabled={submitting}
              style={[
                styles.optionBtn,
                stats.userVote === 'away' && styles.optionBtnSelected,
              ]}
              onPress={() => handleVote('away')}
            >
              <ThemedText style={styles.optionLabel} numberOfLines={1}>
                {awayName}
              </ThemedText>
              <ThemedText style={styles.optionPercent}>{awayPercent}%</ThemedText>
              <ThemedText style={styles.optionCount}>({stats.awayVotes})</ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
    width: 32,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  scrollContent: {
    padding: 16,
  },
  bannerCard: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    alignItems: 'center',
  },
  tournamentName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  teamCol: {
    alignItems: 'center',
    flex: 1,
  },
  teamBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  teamName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  vsContainer: {
    paddingHorizontal: 8,
  },
  vsText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#94A3B8',
  },
  predictionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  predictionBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  predictionBoxTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  totalVotersText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 16,
  },
  voteBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#E5E7EB',
  },
  voteSegment: {
    height: '100%',
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  optionBtnSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    textAlign: 'center',
  },
  optionPercent: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  optionCount: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
});