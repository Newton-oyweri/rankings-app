import { SymbolView } from 'expo-symbols';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

interface Team {
  name: string;
}

interface MatchData {
  id: number;
  home_goals: number;
  away_goals: number;
  played: boolean | null;
  stage: string;
  created_at: string | null;
  home_team?: Team | null;
  away_team?: Team | null;
}

interface MatchVoteRecord {
  id: number;
  match_id: number;
  predicted_winner: string;
  outcome: 'pending' | 'correct' | 'incorrect';
  created_at: string | null;
  matches: MatchData;
}

interface ActivityItemProps {
  userId?: string;
}

export function ActivityItem({ userId }: ActivityItemProps) {
  const [votes, setVotes] = useState<MatchVoteRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPredictedMatches = useCallback(async (uid: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('match_votes')
        .select(`
          id,
          match_id,
          predicted_winner,
          outcome,
          created_at,
          matches (
            id,
            home_goals,
            away_goals,
            played,
            stage,
            created_at,
            home_team:teams!matches_home_team_id_fkey(name),
            away_team:teams!matches_away_team_id_fkey(name)
          )
        `)
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching predicted matches:', error.message);
        return;
      }

      if (data) {
        setVotes(data as unknown as MatchVoteRecord[]);
      }
    } catch (err) {
      console.error('Error in fetchPredictedMatches:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchPredictedMatches(userId);
    } else {
      setLoading(false);
    }
  }, [userId, fetchPredictedMatches]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color="#1E40AF" />
      </View>
    );
  }

  if (votes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>No predictions placed yet.</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {votes.map((item) => (
        <MatchVoteCard key={item.id} vote={item} />
      ))}
    </View>
  );
}

function MatchVoteCard({ vote }: { vote: MatchVoteRecord }) {
  const match = vote.matches;
  const homeTeam = match?.home_team;
  const awayTeam = match?.away_team;

  const outcomeConfig = {
    correct: {
      label: '✓ Correct',
      color: '#16A34A',
      bgColor: 'rgba(22, 163, 74, 0.1)',
      points: '+20 PTS',
    },
    incorrect: {
      label: '✗ Incorrect',
      color: '#DC2626',
      bgColor: 'rgba(220, 38, 38, 0.1)',
      points: '0 PTS',
    },
    pending: {
      label: '⏳ Pending',
      color: '#D97706',
      bgColor: 'rgba(217, 119, 6, 0.1)',
      points: 'PENDING',
    },
  }[vote.outcome] || {
    label: 'Pending',
    color: '#64748B',
    bgColor: '#F1F5F9',
    points: '0 PTS',
  };

  const formattedDate = match?.created_at
    ? new Date(match.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : '';

  const scoreDisplay = match?.played
    ? `${match.home_goals} - ${match.away_goals}`
    : 'VS';

  return (
    <View style={styles.activityItem}>
      {/* Left Column: Points Badge */}
      <View style={styles.activityLeft}>
        <View style={[styles.badgeContainer, { backgroundColor: outcomeConfig.bgColor }]}>
          <ThemedText style={[styles.badgeText, { color: outcomeConfig.color }]}>
            {outcomeConfig.points}
          </ThemedText>
        </View>
      </View>

      {/* Middle Column: Match Details & Teams */}
      <View style={styles.activityCenter}>
        <View style={styles.activityMeta}>
          <ThemedText style={styles.stageText}>{match?.stage || 'MATCH'}</ThemedText>
          <ThemedText style={styles.dot}>•</ThemedText>
          <ThemedText style={styles.predictionText}>
            Pick: <ThemedText style={styles.predictionPick}>{vote.predicted_winner}</ThemedText>
          </ThemedText>
          {formattedDate ? (
            <>
              <ThemedText style={styles.dot}>•</ThemedText>
              <ThemedText style={styles.time}>{formattedDate}</ThemedText>
            </>
          ) : null}
        </View>

        <View style={styles.matchRow}>
          {/* Home Team */}
          <View style={styles.teamContainer}>
            <ThemedText style={styles.teamName} numberOfLines={1}>
              {homeTeam?.name || 'Home Team'}
            </ThemedText>
          </View>

          {/* Score & Outcome Status */}
          <View style={styles.scoreBox}>
            <ThemedText style={styles.score}>{scoreDisplay}</ThemedText>
            <ThemedText style={[styles.statusBadge, { color: outcomeConfig.color }]}>
              {outcomeConfig.label}
            </ThemedText>
          </View>

          {/* Away Team */}
          <View style={styles.teamContainer}>
            <ThemedText style={styles.teamName} numberOfLines={1}>
              {awayTeam?.name || 'Away Team'}
            </ThemedText>
          </View>
        </View>
      </View>

      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={16}
        tintColor="#94A3B8"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  loaderContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
  activityItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  activityLeft: {
    minWidth: 65,
    alignItems: 'flex-start',
  },
  badgeContainer: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  activityCenter: {
    flex: 1,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  stageText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  predictionText: {
    fontSize: 11,
    color: '#64748B',
  },
  predictionPick: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  dot: {
    color: '#94A3B8',
    fontSize: 10,
  },
  time: {
    fontSize: 11,
    color: '#94A3B8',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 75,
  },
  teamName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  scoreBox: {
    alignItems: 'center',
  },
  score: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default ActivityItem;