import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface DBTeam {
  id: number;
  name: string;
  avatar_url?: string;
  rating?: number;
}

export interface DBTournament {
  id: number;
  name: string;
  tournament_avatar?: string;
}

export interface DBMatch {
  id: number;
  tournament_id: number;
  home_team?: DBTeam;
  away_team?: DBTeam;
  home_goals: number;
  away_goals: number;
  played: boolean;
  stage: string;
  round?: number;
  predictions_count?: number;
  created_at?: string;
  tournament?: DBTournament;
  odds?: {
    home: number;
    draw: number;
    away: number;
  };
}

interface MatchCardProps {
  match: DBMatch;
  defaultExpanded?: boolean;
}

export function MatchCard({ match, defaultExpanded = false }: MatchCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isNavigating = useRef(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  };

  const handleOpenStats = () => {
    if (isNavigating.current) return;
    isNavigating.current = true;

    router.push({
      pathname: '/matchstats',
      params: { id: match.id },
    } as any);

    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  };

  const homeName = match.home_team?.name ?? 'Home Team';
  const awayName = match.away_team?.name ?? 'Away Team';
  const homeAvatar =
    match.home_team?.avatar_url || 'https://via.placeholder.com/150';
  const awayAvatar =
    match.away_team?.avatar_url || 'https://via.placeholder.com/150';
  const predictionCount = match.predictions_count ?? 0;

  return (
    <View style={styles.matchCard}>
      {/* Top Bar: Tournament + Prediction Count Badge + Accordion Chevron */}
      <Pressable style={styles.cardHeader} onPress={toggleExpand}>
        <View style={styles.leagueInfo}>
          <View style={styles.leagueDot} />
          <ThemedText style={styles.leagueName} numberOfLines={1}>
            {match.tournament?.name ?? 'Tournament'}
          </ThemedText>
        </View>

        <View style={styles.headerRight}>
          {/* Display Prediction Count where match status used to be */}
          <View style={styles.predictionBadge}>
            <Ionicons name="people" size={12} color="#2563EB" />
            <ThemedText style={styles.predictionText}>
              {predictionCount} {predictionCount === 1 ? 'prediction' : 'predictions'}
            </ThemedText>
          </View>

          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#6B7280"
          />
        </View>
      </Pressable>

      {/* Main Teams & Score Section */}
      <Pressable style={styles.teamsRow} onPress={toggleExpand}>
        {/* Home Team */}
        <View style={styles.teamContainer}>
          <Image source={{ uri: homeAvatar }} style={styles.teamBadge} />
          <ThemedText style={styles.teamName} numberOfLines={1}>
            {homeName}
          </ThemedText>
        </View>

        {/* Center Score or VS */}
        <View style={styles.scoreContainer}>
          {match.played ? (
            <ThemedText style={styles.scoreText}>
              {match.home_goals} - {match.away_goals}
            </ThemedText>
          ) : (
            <View style={styles.vsBadge}>
              <ThemedText style={styles.vsText}>VS</ThemedText>
            </View>
          )}
        </View>

        {/* Away Team */}
        <View style={[styles.teamContainer, styles.teamContainerRight]}>
          <ThemedText style={styles.teamName} numberOfLines={1}>
            {awayName}
          </ThemedText>
          <Image source={{ uri: awayAvatar }} style={styles.teamBadge} />
        </View>
      </Pressable>

      {/* Accordion Expandable Section */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />

          {/* Stage & Meta Info */}
          <View style={styles.metaRow}>
            <ThemedText style={styles.metaText}>
              Stage: <ThemedText style={styles.metaVal}>{match.stage}</ThemedText>
              {match.round ? ` (Round ${match.round})` : ''}
            </ThemedText>
            {(match.home_team?.rating || match.away_team?.rating) && (
              <ThemedText style={styles.metaText}>
                Ratings: {match.home_team?.rating ?? '-'} vs{' '}
                {match.away_team?.rating ?? '-'}
              </ThemedText>
            )}
          </View>

          {/* Odds Display */}
          {match.odds && (
            <View style={styles.oddsContainer}>
              <ThemedText style={styles.oddsTitle}>Match Odds</ThemedText>
              <View style={styles.oddsRow}>
                <Pressable style={styles.oddButton}>
                  <ThemedText style={styles.oddLabel}>1</ThemedText>
                  <ThemedText style={styles.oddValue}>
                    {match.odds.home.toFixed(2)}
                  </ThemedText>
                </Pressable>
                <Pressable style={styles.oddButton}>
                  <ThemedText style={styles.oddLabel}>X</ThemedText>
                  <ThemedText style={styles.oddValue}>
                    {match.odds.draw.toFixed(2)}
                  </ThemedText>
                </Pressable>
                <Pressable style={styles.oddButton}>
                  <ThemedText style={styles.oddLabel}>2</ThemedText>
                  <ThemedText style={styles.oddValue}>
                    {match.odds.away.toFixed(2)}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          )}

          {/* View Stats Button */}
          <Pressable style={styles.statsButton} onPress={handleOpenStats}>
            <Ionicons name="stats-chart" size={14} color="#3B82F6" />
            <ThemedText style={styles.statsButtonText}>
              View Detailed Match Stats
            </ThemedText>
            <Ionicons name="chevron-forward" size={14} color="#3B82F6" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  leagueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  leagueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  leagueName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  predictionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  predictionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  teamContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  teamContainerRight: {
    justifyContent: 'flex-end',
  },
  teamBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  teamName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
  },
  scoreContainer: {
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E40AF',
  },
  vsBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  expandedContent: {
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metaText: {
    fontSize: 11,
    color: '#6B7280',
  },
  metaVal: {
    fontWeight: '600',
    color: '#374151',
  },
  oddsContainer: {
    marginBottom: 10,
  },
  oddsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 6,
  },
  oddsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  oddButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  oddLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  oddValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  statsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  statsButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
  },
});