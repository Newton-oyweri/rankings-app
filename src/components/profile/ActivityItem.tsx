import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

// Enable LayoutAnimation for Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
        <BetslipCard key={item.id} vote={item} />
      ))}
    </View>
  );
}

function BetslipCard({ vote }: { vote: MatchVoteRecord }) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const match = vote.matches;
  const homeTeam = match?.home_team?.name || 'Home';
  const awayTeam = match?.away_team?.name || 'Away';

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  const outcomeConfig = {
    correct: {
      badgeText: 'W',
      color: '#16A34A',
      bgColor: 'rgba(22, 163, 74, 0.12)',
      points: '+10 PTS',
      label: 'WON',
    },
    incorrect: {
      badgeText: 'L',
      color: '#DC2626',
      bgColor: 'rgba(220, 38, 38, 0.12)',
      points: '0 PTS',
      label: 'LOST',
    },
    pending: {
      badgeText: 'PENDING',
      color: '#D97706',
      bgColor: 'rgba(217, 119, 6, 0.12)',
      points: 'PENDING',
      label: 'PENDING',
    },
  }[vote.outcome] || {
    badgeText: 'PENDING',
    color: '#64748B',
    bgColor: '#F1F5F9',
    points: '0 PTS',
    label: 'PENDING',
  };

  const formattedDate = match?.created_at
    ? new Date(match.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : '';

  const scoreDisplay = match?.played
    ? `${match.home_goals} - ${match.away_goals}`
    : 'Not Played';

  return (
    <Pressable style={styles.betslipCard} onPress={toggleExpand}>
      {/* Top Main Row */}
      <View style={styles.mainRow}>
        {/* Match & Selection Details */}
        <View style={styles.leftInfo}>
          <ThemedText style={styles.teamsHeader} numberOfLines={1}>
            {homeTeam} <ThemedText style={styles.vsText}>vs</ThemedText> {awayTeam}
          </ThemedText>

          <View style={styles.pickRow}>
            <ThemedText style={styles.pickLabel}>Pick: </ThemedText>
            <ThemedText style={styles.pickValue} numberOfLines={1}>
              {vote.predicted_winner}
            </ThemedText>
          </View>
        </View>

        {/* Far Right Outcome Badge */}
        <View style={styles.rightInfo}>
          <View style={[styles.outcomeBadge, { backgroundColor: outcomeConfig.bgColor }]}>
            <ThemedText style={[styles.outcomeBadgeText, { color: outcomeConfig.color }]}>
              {outcomeConfig.badgeText}
            </ThemedText>
          </View>
          <SymbolView
            name={{
              ios: expanded ? 'chevron.up' : 'chevron.down',
              android: expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down',
              web: expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down',
            }}
            size={14}
            tintColor="#94A3B8"
          />
        </View>
      </View>

      {/* Expanded Content View */}
      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />
          
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Stage</ThemedText>
            <ThemedText style={styles.detailValue}>{match?.stage || 'MATCH'}</ThemedText>
          </View>

          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Result Score</ThemedText>
            <ThemedText style={styles.detailValue}>{scoreDisplay}</ThemedText>
          </View>

          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Points Awarded</ThemedText>
            <ThemedText style={[styles.detailValue, { color: outcomeConfig.color }]}>
              {outcomeConfig.points}
            </ThemedText>
          </View>

          {formattedDate ? (
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Date</ThemedText>
              <ThemedText style={styles.detailValue}>{formattedDate}</ThemedText>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
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
  betslipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftInfo: {
    flex: 1,
    marginRight: 10,
  },
  teamsHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  vsText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  pickValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  rightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  outcomeBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  expandedContent: {
    paddingTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
});

export default ActivityItem;