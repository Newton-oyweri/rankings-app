import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';

// Types
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

interface MatchPredictionsProps {
  votes: MatchVoteRecord[];
  loading: boolean;
}

export function MatchPredictions({ votes, loading }: MatchPredictionsProps) {
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
        <ThemedText style={styles.emptyText}>No match predictions placed yet.</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {votes.map((item) => (
        <BetslipCard key={item.id} vote={item} />
      ))}
    </View>
  );
}

// Sub-Component: Match Betslip Card
function BetslipCard({ vote }: { vote: MatchVoteRecord }) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const match = vote.matches;
  const homeTeam = match?.home_team?.name || 'Home';
  const awayTeam = match?.away_team?.name || 'Away';

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  // Use the outcome from the database (pending, correct, incorrect)
  const getOutcomeConfig = () => {
    // If the match is not played yet, show pending
    if (!match?.played) {
      return {
        badgeText: 'PENDING',
        color: '#D97706',
        bgColor: 'rgba(217, 119, 6, 0.12)',
        points: 'PENDING',
      };
    }

    // Use the database outcome field
    switch (vote.outcome) {
      case 'correct':
        return {
          badgeText: 'W',
          color: '#16A34A',
          bgColor: 'rgba(22, 163, 74, 0.12)',
          points: '+10 PTS',
        };
      case 'incorrect':
        return {
          badgeText: 'L',
          color: '#DC2626',
          bgColor: 'rgba(220, 38, 38, 0.12)',
          points: '0 PTS',
        };
      default:
        return {
          badgeText: 'PENDING',
          color: '#D97706',
          bgColor: 'rgba(217, 119, 6, 0.12)',
          points: 'PENDING',
        };
    }
  };

  const outcomeConfig = getOutcomeConfig();

  const formattedDate = match?.created_at
    ? new Date(match.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : '';

  // Format the score display
  const getScoreDisplay = () => {
    if (!match?.played || match.home_goals === null || match.away_goals === null) {
      return 'Not Played';
    }
    
    const homeGoals = match.home_goals;
    const awayGoals = match.away_goals;
    let resultIndicator = '';
    
    if (homeGoals > awayGoals) {
      resultIndicator = 'H';
    } else if (homeGoals < awayGoals) {
      resultIndicator = 'A';
    } else {
      resultIndicator = 'D';
    }
    
    return `${homeGoals} - ${awayGoals} (${resultIndicator})`;
  };

  // Determine if pick was correct for color coding
  const isPickCorrect = vote.outcome === 'correct';

  return (
    <Pressable style={styles.card} onPress={toggleExpand}>
      <View style={styles.mainRow}>
        <View style={styles.leftInfo}>
          <ThemedText style={styles.teamsHeader} numberOfLines={1}>
            {homeTeam} <ThemedText style={styles.vsText}>vs</ThemedText> {awayTeam}
          </ThemedText>
          <View style={styles.pickRow}>
            <ThemedText style={styles.pickLabel}>Pick: </ThemedText>
            <ThemedText 
              style={[
                styles.pickValue, 
                match?.played && {
                  color: isPickCorrect ? '#16A34A' : '#DC2626'
                }
              ]} 
              numberOfLines={1}
            >
              {vote.predicted_winner}
              {match?.played && (isPickCorrect ? ' ✓' : ' ✗')}
            </ThemedText>
          </View>
        </View>

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

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Stage</ThemedText>
            <ThemedText style={styles.detailValue}>{match?.stage || 'MATCH'}</ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Match Score</ThemedText>
            <ThemedText style={styles.detailValue}>
              {getScoreDisplay()}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Your Pick</ThemedText>
            <ThemedText style={[
              styles.detailValue,
              match?.played && {
                color: isPickCorrect ? '#16A34A' : '#DC2626'
              }
            ]}>
              {vote.predicted_winner}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Status</ThemedText>
            <ThemedText style={[styles.detailValue, { color: outcomeConfig.color }]}>
              {vote.outcome.toUpperCase()}
            </ThemedText>
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
  listContainer: {
    gap: 8,
  },
  loaderContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftInfo: {
    flex: 1,
    marginRight: 8,
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
    height: 26,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  expandedContent: {
    paddingTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
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