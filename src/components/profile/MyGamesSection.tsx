import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

interface Match {
  id: string;
  created_at: string;
  played: boolean;
  home_team_id: string;
  away_team_id: string;
  home_goals: number | null;
  away_goals: number | null;
  home?: { name: string } | { name: string }[] | null;
  away?: { name: string } | { name: string }[] | null;
}

interface MyMatchesSectionProps {
  onViewAll?: () => void;
}

export function MyGamesSection({ onViewAll }: MyMatchesSectionProps) {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [userTeamIds, setUserTeamIds] = useState<string[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserMatches();
  }, []);

  const fetchUserMatches = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch username and associated teams
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, teams(id)')
        .eq('id', user.id)
        .single();

      if (profileData) {
        if (profileData.username) {
          setUsername(profileData.username);
        }

        if (profileData.teams && profileData.teams.length > 0) {
          const teamIds = profileData.teams.map((t: { id: string }) => t.id);
          setUserTeamIds(teamIds);

          const { data, error } = await supabase
            .from('matches')
            .select(`
              id,
              created_at,
              played,
              home_team_id,
              away_team_id,
              home_goals,
              away_goals,
              home:home_team_id(name),
              away:away_team_id(name)
            `)
            .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
            .order('created_at', { ascending: false })
            .limit(10);

          if (error) throw error;
          setMatches((data as Match[]) || []);
        }
      }
    } catch (err: any) {
      console.error('Error fetching user matches:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTeamName = (teamProp: Match['home']) => {
    if (!teamProp) return null;
    if (Array.isArray(teamProp)) {
      return teamProp[0]?.name ?? null;
    }
    return teamProp.name ?? null;
  };

  const getMatchResult = (match: Match) => {
    if (!match.played) return { text: 'VS', color: '#64748B', bg: '#F1F5F9' };

    const isHome = userTeamIds.includes(match.home_team_id);
    const userG = (isHome ? match.home_goals : match.away_goals) ?? 0;
    const oppG = (isHome ? match.away_goals : match.home_goals) ?? 0;

    if (userG > oppG) return { text: 'W', color: '#FFFFFF', bg: '#16A34A' };
    if (userG < oppG) return { text: 'L', color: '#FFFFFF', bg: '#DC2626' };
    return { text: 'D', color: '#FFFFFF', bg: '#64748B' };
  };

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>My Matches</ThemedText>
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#2563EB" />
        </View>
      </View>
    );
  }

  if (matches.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>My Matches</ThemedText>
        {onViewAll && (
          <Pressable onPress={onViewAll} hitSlop={8}>
            <ThemedText style={styles.viewAll}>View All</ThemedText>
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.gamesScroll}
        contentContainerStyle={styles.gamesContent}
      >
        {matches.map((match) => {
          const result = getMatchResult(match);
          const homeName = getTeamName(match.home) ?? 'Home';
          const awayName = getTeamName(match.away) ?? 'Away';

          return (
            <Pressable
              key={match.id}
              style={({ pressed }) => [
                styles.matchCard,
                pressed && styles.cardPressed,
              ]}
              onPress={() => {
                if (!username) return;
                router.push({
                  pathname: '/team/[username]/matches',
                  params: { username },
                } as any);
              }}
            >
              <View style={[styles.resultBadge, { backgroundColor: result.bg }]}>
                <ThemedText style={[styles.resultText, { color: result.color }]}>
                  {result.text}
                </ThemedText>
              </View>

              <View style={styles.teamsContainer}>
                <ThemedText style={styles.teamText} numberOfLines={1}>
                  {homeName}
                </ThemedText>

                <ThemedText style={styles.scoreText}>
                  {match.played
                    ? `${match.home_goals ?? 0} - ${match.away_goals ?? 0}`
                    : 'vs'}
                </ThemedText>

                <ThemedText style={styles.teamText} numberOfLines={1}>
                  {awayName}
                </ThemedText>
              </View>

              <View style={styles.cardFooter}>
                <ThemedText style={styles.statusText}>
                  {match.played ? 'Finished' : 'Upcoming'}
                </ThemedText>
                <Ionicons name="chevron-forward" size={12} color="#94A3B8" />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  viewAll: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  loaderContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  gamesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  gamesContent: {
    gap: 12,
    paddingRight: 16,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    width: 140,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardPressed: {
    opacity: 0.8,
  },
  resultBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  resultText: {
    fontWeight: '800',
    fontSize: 12,
  },
  teamsContainer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  teamText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statusText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
});