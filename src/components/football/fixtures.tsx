import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type PredictionChoice = '1' | 'X' | '2';

export interface JackpotGame {
  id: string;
  game_number: number;
  home_team: string;
  away_team: string;
  match_time?: string | null;
  status: string;
}

export interface TierConfig {
  key: 5 | 6 | 7;
  title: string;
  entryFee: number;
  prize: number;
  color: string;
  badgeBg: string;
}

interface FixturesProps {
  currentMatches: JackpotGame[];
  activeConfig: TierConfig;
  predictions: Record<string, PredictionChoice>;
  submitting?: boolean;
  onPick: (gameId: string, choice: PredictionChoice) => void;
  onSubmit: () => void;
}

export default function Fixtures({
  currentMatches,
  activeConfig,
  predictions,
  submitting = false,
  onPick,
  onSubmit,
}: FixturesProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const selectedCount = currentMatches.filter((m) => predictions[m.id]).length;
  const isComplete = currentMatches.length > 0 && selectedCount === activeConfig.key;

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formattedMatchTime = (matchTime?: string | null) => {
    if (!matchTime) return 'TBD';
    return new Date(matchTime).toLocaleDateString(undefined, {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (currentMatches.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <ThemedText style={styles.emptyTitle}>No matches updated yet</ThemedText>
        <ThemedText style={styles.emptySubtext}>
          There are currently no scheduled fixtures for {activeConfig.title}. Pull down to refresh or check back later.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Compact summary bar – great for screenshots */}
      <View style={[styles.summaryBar, { borderColor: activeConfig.color }]}>
        <ThemedText style={styles.summaryText}>
          {selectedCount}/{activeConfig.key} picked
        </ThemedText>
        <ThemedText style={[styles.summaryStatus, { color: activeConfig.color }]}>
          {isComplete ? 'Ready' : `${activeConfig.key - selectedCount} left`}
        </ThemedText>
      </View>

      {currentMatches.map((match) => {
        const currentPick = predictions[match.id];
        const isOpen = expanded[match.id] ?? false; // collapsed by default

        return (
          <View key={match.id} style={styles.matchCard}>
            {/* Always-visible compact row */}
            <Pressable style={styles.compactRow} onPress={() => toggleExpand(match.id)}>
              <View style={styles.leftSide}>
                <ThemedText style={styles.gameNum}>#{match.game_number}</ThemedText>
                <View style={styles.teamsCompact}>
                  <ThemedText style={styles.teamName} numberOfLines={1}>
                    {match.home_team}
                  </ThemedText>
                  <ThemedText style={styles.vs}>vs</ThemedText>
                  <ThemedText style={styles.teamName} numberOfLines={1}>
                    {match.away_team}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.rightSide}>
                {currentPick ? (
                  <View style={[styles.pickedBadge, { backgroundColor: activeConfig.color }]}>
                    <ThemedText style={styles.pickedText}>
                      {currentPick === '1' ? '1' : currentPick === 'X' ? 'X' : '2'}
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText style={styles.timeText}>{formattedMatchTime(match.match_time)}</ThemedText>
                )}
                <ThemedText style={styles.chevron}>{isOpen ? '▲' : '▼'}</ThemedText>
              </View>
            </Pressable>

            {/* Expandable pick area */}
            {isOpen && (
              <View style={styles.expandedArea}>
                <View style={styles.picksRow}>
                  {(['1', 'X', '2'] as PredictionChoice[]).map((choice) => {
                    const isSelected = currentPick === choice;
                    return (
                      <Pressable
                        key={choice}
                        style={[
                          styles.pickButton,
                          isSelected && {
                            backgroundColor: activeConfig.color,
                            borderColor: activeConfig.color,
                          },
                        ]}
                        onPress={() => onPick(match.id, choice)}
                      >
                        <ThemedText
                          style={[styles.pickText, isSelected && styles.pickTextActive]}
                        >
                          {choice === '1' ? 'Home' : choice === 'X' ? 'Draw' : 'Away'}
                        </ThemedText>
                        <ThemedText
                          style={[styles.pickCode, isSelected && styles.pickTextActive]}
                        >
                          {choice}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        );
      })}

      {/* Sticky-style submit */}
      <Pressable
        disabled={!isComplete || submitting}
        style={[
          styles.submitButton,
          isComplete && !submitting
            ? { backgroundColor: activeConfig.color }
            : styles.submitDisabled,
        ]}
        onPress={onSubmit}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <ThemedText style={styles.submitText}>
            {isComplete
              ? `Submit ${activeConfig.title} • KSh ${activeConfig.entryFee}`
              : `Pick ${activeConfig.key - selectedCount} more`}
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 12,
  },

  // Summary bar (screenshot-friendly)
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  summaryStatus: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Match card – very compact
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  leftSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gameNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B7280',
    width: 28,
  },
  teamsCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  vs: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  pickedBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  chevron: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  // Expanded picks
  expandedArea: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  picksRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  pickButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  pickText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  pickCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  pickTextActive: {
    color: '#FFFFFF',
  },

  // Empty state
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Submit
  submitButton: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  submitDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});