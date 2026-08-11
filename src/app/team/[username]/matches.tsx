import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

interface Match {
  id: string;
  created_at: string;
  played: boolean;
  home_team_id: string;
  away_team_id: string;
  home_goals: number | null;
  away_goals: number | null;
  home_ht_goals: number | null;
  away_ht_goals: number | null;
  home_possession: number | null;
  away_possession: number | null;
  home_shots: number | null;
  away_shots: number | null;
  home_shots_on_target: number | null;
  away_shots_on_target: number | null;
  home_successful_passes: number | null;
  away_successful_passes: number | null;
  home_passes: number | null;
  away_passes: number | null;
  home_tackles: number | null;
  away_tackles: number | null;
  home_interceptions: number | null;
  away_interceptions: number | null;
  home_saves: number | null;
  away_saves: number | null;
  home_corner_kicks: number | null;
  away_corner_kicks: number | null;
  home_crosses: number | null;
  away_crosses: number | null;
  home_fouls: number | null;
  away_fouls: number | null;
  home_offsides: number | null;
  away_offsides: number | null;
  home_free_kicks: number | null;
  away_free_kicks: number | null;
  home?: { name: string };
  away?: { name: string };
}

interface MatchResult {
  text: string;
  bgColor: string;
  textColor: string;
}

export default function TeamMatchesScreen() {
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ w: 0, d: 0, l: 0, gf: 0, ga: 0 });
  const [userTeamIds, setUserTeamIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeamDataAndMatches = async () => {
      if (!username) return;
      setLoading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);

        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, teams(id)')
          .eq('username', username)
          .single();

        if (profileData) {
          setProfileUserId(profileData.id);
        }

        if (profileData && profileData.teams && profileData.teams.length > 0) {
          const teamIds = profileData.teams.map((t: { id: string }) => t.id);
          setUserTeamIds(teamIds);

          const { data, error } = await supabase
            .from('matches')
            .select(
              `
              *,
              home:home_team_id(name),
              away:away_team_id(name)
            `
            )
            .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching matches:', error.message);
          }

          const results: Match[] = data || [];
          setMatches(results);

          let w = 0,
            d = 0,
            l = 0,
            gf = 0,
            ga = 0;

          results
            .filter((m) => m.played)
            .forEach((m) => {
              const isHome = teamIds.includes(m.home_team_id);
              const userGoals = (isHome ? m.home_goals : m.away_goals) ?? 0;
              const opponentGoals = (isHome ? m.away_goals : m.home_goals) ?? 0;

              gf += userGoals;
              ga += opponentGoals;

              if (userGoals > opponentGoals) w++;
              else if (userGoals < opponentGoals) l++;
              else d++;
            });

          setStats({ w, d, l, gf, ga });
        }
      } catch (err) {
        console.error('Error in TeamMatchesScreen:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamDataAndMatches();
  }, [username]);

  const getResult = useCallback(
    (match: Match): MatchResult => {
      if (!match.played) {
        return { text: '-', bgColor: '#F1F5F9', textColor: '#64748B' };
      }

      const isHome = userTeamIds.includes(match.home_team_id);
      const userG = (isHome ? match.home_goals : match.away_goals) ?? 0;
      const oppG = (isHome ? match.away_goals : match.home_goals) ?? 0;

      if (userG > oppG) {
        return { text: 'W', bgColor: '#16A34A', textColor: '#FFFFFF' };
      }
      if (userG < oppG) {
        return { text: 'L', bgColor: '#DC2626', textColor: '#FFFFFF' };
      }
      return { text: 'D', bgColor: '#64748B', textColor: '#FFFFFF' };
    },
    [userTeamIds]
  );

  const toggleExpandMatch = (matchId: string) => {
    setExpandedMatchId((prev) => (prev === matchId ? null : matchId));
  };

  const renderStatBar = (
    label: string,
    homeVal: number | null,
    awayVal: number | null,
    suffix = ''
  ) => {
    const h = homeVal !== null ? parseFloat(homeVal.toString()) : 0;
    const a = awayVal !== null ? parseFloat(awayVal.toString()) : 0;
    const total = h + a;

    const homePercent = total > 0 ? (h / total) * 100 : 50;
    const awayPercent = total > 0 ? (a / total) * 100 : 50;

    return (
      <View style={styles.statBarContainer}>
        <View style={styles.statBarLabels}>
          <Text style={styles.statValText}>{homeVal !== null ? `${homeVal}${suffix}` : '-'}</Text>
          <Text style={styles.statBarTitle}>{label.toUpperCase()}</Text>
          <Text style={styles.statValText}>{awayVal !== null ? `${awayVal}${suffix}` : '-'}</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarHome, { width: `${homePercent}%` }]} />
          <View style={[styles.progressBarAway, { width: `${awayPercent}%` }]} />
        </View>
      </View>
    );
  };

  const renderMatchCard = ({ item: match }: { item: Match }) => {
    const isHome = userTeamIds.includes(match.home_team_id);
    const result = getResult(match);
    const isExpanded = expandedMatchId === match.id;

    return (
      <Animated.View
        layout={LinearTransition}
        style={[styles.matchCard, isExpanded && styles.matchCardExpanded]}
      >
        <Pressable
          style={({ pressed }) => [styles.matchRowHeader, pressed && styles.pressedState]}
          onPress={() => toggleExpandMatch(match.id)}
        >
          {/* Left Result Indicator Badge */}
          <View style={[styles.resultBadge, { backgroundColor: result.bgColor }]}>
            <Text style={[styles.resultBadgeText, { color: result.textColor }]}>
              {result.text}
            </Text>
          </View>

          {/* Teams and Score Core Block */}
          <View style={styles.teamsRowContainer}>
            <Text
              numberOfLines={1}
              style={[styles.teamName, styles.teamHome, isHome ? styles.teamBold : styles.teamMuted]}
            >
              {match.home?.name || 'TBD'}
            </Text>

            <View style={styles.scoreContainer}>
              <View style={[styles.scoreBadge, match.played ? styles.scorePlayed : styles.scoreUnplayed]}>
                <Text style={[styles.scoreText, match.played ? styles.scorePlayedText : styles.scoreUnplayedText]}>
                  {match.played ? `${match.home_goals}-${match.away_goals}` : 'VS'}
                </Text>
              </View>
              <Text style={styles.htScoreText}>
                {match.home_ht_goals ?? 0} - {match.away_ht_goals ?? 0}
              </Text>
            </View>

            <Text
              numberOfLines={1}
              style={[styles.teamName, styles.teamAway, !isHome ? styles.teamBold : styles.teamMuted]}
            >
              {match.away?.name || 'TBD'}
            </Text>
          </View>

          {/* Chevron Indicator */}
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#94A3B8"
            style={{ marginLeft: 4 }}
          />
        </Pressable>

        {/* Expanded Drawer */}
        {isExpanded && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={styles.drawerContainer}
          >
            {match.played ? (
              <View style={styles.statsList}>
                {renderStatBar('Possession', match.home_possession, match.away_possession, '%')}
                {renderStatBar('Shots', match.home_shots, match.away_shots)}
                {renderStatBar('Shots on Target', match.home_shots_on_target, match.away_shots_on_target)}
                {renderStatBar('Passes Completed', match.home_successful_passes, match.away_successful_passes)}
                {renderStatBar('Total Passes Attempted', match.home_passes, match.away_passes)}
                {renderStatBar('Tackles Made', match.home_tackles, match.away_tackles)}
                {renderStatBar('Interceptions', match.home_interceptions, match.away_interceptions)}
                {renderStatBar('Saves', match.home_saves, match.away_saves)}
                {renderStatBar('Corner Kicks', match.home_corner_kicks, match.away_corner_kicks)}
                {renderStatBar('Crosses', match.home_crosses, match.away_crosses)}
                {renderStatBar('Fouls', match.home_fouls, match.away_fouls)}
                {renderStatBar('Offsides', match.home_offsides, match.away_offsides)}
                {renderStatBar('Free Kicks', match.home_free_kicks, match.away_free_kicks)}
              </View>
            ) : (
              <View style={styles.unplayedDrawerContainer}>
                <Ionicons name="calendar-outline" size={20} color="#94A3B8" />
                <Text style={styles.unplayedDrawerText}>
                  This match has not been played yet. Detailed analytics will configure once stats are submitted.
                </Text>
              </View>
            )}

            <View style={styles.timestampFooter}>
              <Text style={styles.timestampText}>
                {new Date(match.created_at).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </Text>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    );
  };

  const isCurrentUser = currentUserId && profileUserId && currentUserId === profileUserId;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header Bar */}
      <LinearGradient
        colors={['#1E3A8A', '#2563EB', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <Pressable
              style={({ pressed }) => [styles.backButton, pressed && styles.pressedState]}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>

            <View style={styles.headerTitleGroup}>
              <View style={styles.titleWithBadge}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {username}
                </Text>
                {isCurrentUser && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>YOU</Text>
                  </View>
                )}
              </View>
              <Text style={styles.headerSubtitle}>Match History & Analytics</Text>
            </View>

            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Summary Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statCardLabel}>WINS</Text>
              <Text style={[styles.statCardVal, { color: '#16A34A' }]}>{stats.w}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statCardLabel}>LOSSES</Text>
              <Text style={[styles.statCardVal, { color: '#DC2626' }]}>{stats.l}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statCardLabel}>DRAWS</Text>
              <Text style={[styles.statCardVal, { color: '#64748B' }]}>{stats.d}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statCardLabel}>GD</Text>
              <Text style={[styles.statCardVal, { color: '#2563EB' }]}>
                {stats.gf - stats.ga > 0 ? `+${stats.gf - stats.ga}` : stats.gf - stats.ga}
              </Text>
            </View>
          </View>

          {/* Section Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Ranking Matches</Text>
            <Text style={styles.sectionCount}>{matches.length}</Text>
          </View>

          {/* Matches List */}
          {matches.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="football-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyText}>No match records found.</Text>
            </View>
          ) : (
            <FlatList
              data={matches}
              keyExtractor={(item) => item.id}
              renderItem={renderMatchCard}
              scrollEnabled={false}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingTop: 8,
  },
  backButton: {
    padding: 4,
    width: 36,
    alignItems: 'flex-start',
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#E0E7FF',
    fontWeight: '500',
    marginTop: 1,
  },
  youBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  youBadgeText: {
    color: '#2563EB',
    fontSize: 9,
    fontWeight: '800',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },

  /* Stats Grid */
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  statCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statCardVal: {
    fontSize: 16,
    fontWeight: '800',
  },

  /* Matches Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  /* Empty State */
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  /* Match Card */
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    overflow: 'hidden',
  },
  matchCardExpanded: {
    borderColor: '#2563EB',
  },
  matchRowHeader: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressedState: {
    opacity: 0.7,
  },
  resultBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },

  /* Match Teams & Score */
  teamsRowContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamName: {
    flex: 1,
    fontSize: 13,
  },
  teamHome: {
    textAlign: 'right',
    paddingRight: 8,
  },
  teamAway: {
    textAlign: 'left',
    paddingLeft: 8,
  },
  teamBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  teamMuted: {
    fontWeight: '500',
    color: '#64748B',
  },
  scoreContainer: {
    width: 70,
    alignItems: 'center',
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scorePlayed: {
    backgroundColor: '#0F172A',
  },
  scoreUnplayed: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scorePlayedText: {
    color: '#FFFFFF',
  },
  scoreUnplayedText: {
    color: '#64748B',
  },
  htScoreText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 2,
  },

  /* Drawer / Analytics */
  drawerContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  statsList: {
    gap: 10,
  },
  statBarContainer: {
    marginBottom: 4,
  },
  statBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statBarTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  statValText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  progressBarHome: {
    height: '100%',
    backgroundColor: '#1E3A8A',
  },
  progressBarAway: {
    height: '100%',
    backgroundColor: '#D97706',
  },
  unplayedDrawerContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  unplayedDrawerText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  timestampFooter: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  timestampText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
});