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
interface JackpotGameSelection {
  id: string;
  game_id: string;
  game_number: number;
  home_team: string;
  away_team: string;
  selection: 'HOME' | 'DRAW' | 'AWAY';
  is_correct: boolean | null;
  outcome?: 'HOME' | 'DRAW' | 'AWAY' | null;
  home_score?: number | null;
  away_score?: number | null;
  game_status?: 'pending' | 'finished' | 'cancelled' | null;
}

interface UserJackpotEntry {
  entry_id: string;
  entry_number: number;
  entry_fee: string;
  correct_predictions: number;
  entry_status: 'submitted' | 'winner' | 'loser' | 'void';
  submitted_at: string;
  jackpot_name: string;
  game_count: number;
  selections: JackpotGameSelection[];
}

interface JackpotEntriesProps {
  entries: UserJackpotEntry[];
  loading: boolean;
}

export function JackpotEntries({ entries, loading }: JackpotEntriesProps) {
  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color="#8B5CF6" />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>No jackpot entries placed yet.</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {entries.map((entry) => (
        <JackpotCard key={entry.entry_id} entry={entry} />
      ))}
    </View>
  );
}

// Sub-Component: Jackpot Entry Card
function JackpotCard({ entry }: { entry: UserJackpotEntry }) {
  const [expanded, setExpanded] = useState<boolean>(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  const statusConfig = {
    winner: { badgeText: 'WINNER', color: '#16A34A', bgColor: 'rgba(22, 163, 74, 0.12)' },
    loser: { badgeText: 'LOST', color: '#DC2626', bgColor: 'rgba(220, 38, 38, 0.12)' },
    void: { badgeText: 'VOID', color: '#64748B', bgColor: '#F1F5F9' },
    submitted: { badgeText: 'IN PLAY', color: '#D97706', bgColor: 'rgba(217, 119, 6, 0.12)' },
  }[entry.entry_status] || {
    badgeText: 'SUBMITTED',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.12)',
  };

  const formattedDate = new Date(entry.submitted_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  // Helper function to get W/D/L status for a game
  const getGameStatus = (game: JackpotGameSelection): { 
    status: 'W' | 'D' | 'L' | 'PENDING'; 
    color: string;
    bgColor: string;
  } => {
    // If the game hasn't been played yet (no outcome)
    if (!game.outcome) {
      return {
        status: 'PENDING',
        color: '#D97706',
        bgColor: 'rgba(217, 119, 6, 0.12)',
      };
    }

    // Use the is_correct field from the database
    if (game.is_correct === true) {
      return {
        status: 'W',
        color: '#16A34A',
        bgColor: 'rgba(22, 163, 74, 0.12)',
      };
    } else if (game.is_correct === false) {
      return {
        status: 'L',
        color: '#DC2626',
        bgColor: 'rgba(220, 38, 38, 0.12)',
      };
    }

    // Fallback for unknown state
    return {
      status: 'PENDING',
      color: '#64748B',
      bgColor: '#F1F5F9',
    };
  };

  return (
    <Pressable style={styles.card} onPress={toggleExpand}>
      <View style={styles.mainRow}>
        <View style={styles.leftInfo}>
          <View style={styles.titleRow}>
            <ThemedText style={styles.jackpotTitle}>{entry.jackpot_name}</ThemedText>
            <ThemedText style={styles.entryTag}>#{entry.entry_number}</ThemedText>
          </View>
          <ThemedText style={styles.subText}>
            Fee: KSh {entry.entry_fee} • {formattedDate}
          </ThemedText>
        </View>

        <View style={styles.rightInfo}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <ThemedText style={[styles.statusBadgeText, { color: statusConfig.color }]}>
              {statusConfig.badgeText}
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

      <View style={styles.scoreSummaryRow}>
        <ThemedText style={styles.scoreLabel}>Score:</ThemedText>
        <ThemedText style={styles.scoreValue}>
          {entry.correct_predictions} / {entry.game_count || entry.selections.length}
        </ThemedText>
      </View>

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />
          {entry.selections.map((item) => {
            const gameStatus = getGameStatus(item);
            const scoreDisplay = item.home_score !== null && item.home_score !== undefined && 
                               item.away_score !== null && item.away_score !== undefined
              ? `${item.home_score} - ${item.away_score}`
              : '—';
            
            const outcomeDisplay = item.outcome 
              ? item.outcome === 'HOME' ? 'H' : item.outcome === 'AWAY' ? 'A' : 'D'
              : '';

            return (
              <View key={item.id} style={styles.jackpotPickItem}>
                <ThemedText style={styles.gameNum}>G{item.game_number}</ThemedText>
                <ThemedText style={styles.jackpotTeams} numberOfLines={1}>
                  {item.home_team} vs {item.away_team}
                </ThemedText>
                
                {/* Show Score */}
                <ThemedText style={styles.scoreText}>
                  {scoreDisplay}
                </ThemedText>
                
                {/* Show Outcome (H/D/A) */}
                {outcomeDisplay && (
                  <ThemedText style={styles.outcomeText}>
                    {outcomeDisplay}
                  </ThemedText>
                )}
                
                <View style={[styles.jackpotPickBadge, { backgroundColor: '#0F172A' }]}>
                  <ThemedText style={styles.jackpotPickText}>
                    {item.selection}
                  </ThemedText>
                </View>
                
                {/* W/D/L Status Badge */}
                <View style={[
                  styles.statusBadgeSmall, 
                  { backgroundColor: gameStatus.bgColor }
                ]}>
                  <ThemedText style={[
                    styles.statusBadgeSmallText, 
                    { color: gameStatus.color }
                  ]}>
                    {gameStatus.status}
                  </ThemedText>
                </View>
              </View>
            );
          })}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jackpotTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  entryTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  subText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  rightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  scoreSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  scoreValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  expandedContent: {
    paddingTop: 2,
  },
  jackpotPickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 6,
    flexWrap: 'wrap',
  },
  gameNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    width: 22,
  },
  jackpotTeams: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
    minWidth: 80,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
    paddingHorizontal: 4,
    minWidth: 40,
    textAlign: 'center',
  },
  outcomeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    paddingHorizontal: 4,
    minWidth: 20,
    textAlign: 'center',
  },
  jackpotPickBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  jackpotPickText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  statusBadgeSmallText: {
    fontSize: 10,
    fontWeight: '800',
  },
});