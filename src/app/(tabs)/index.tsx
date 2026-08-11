import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '@/components/rankings/Header';
import { MatchCard } from '@/components/rankings/MatchCard';
import { MatchFilters } from '@/components/rankings/MatchFilters';
import { PromoBanner } from '@/components/rankings/PromoBanner';
import { TopPredictors } from '@/components/rankings/TopPredictors';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type MatchStatusFilter = 'all' | 'upcoming' | 'finished';

const getTeamAvatar = (team: { name?: string; avatar_url?: string | null } | null) => {
  if (!team) return null;
  if (team.avatar_url && team.avatar_url.trim() !== '') {
    return team.avatar_url;
  }
  const seedName = team.name ? encodeURIComponent(team.name.trim()) : 'Team';
  return `https://api.dicebear.com/9.x/initials/png?seed=${seedName}&backgroundType=gradientLinear`;
};

export default function HomeScreen() {
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>('all');
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatchesForTournament = useCallback(async (tournamentId: number) => {
    try {
      // Exact schema foreign key joins:
      // constraint matches_home_team_id_fkey foreign KEY (home_team_id) references teams (id)
      // constraint matches_away_team_id_fkey foreign KEY (away_team_id) references teams (id)
      // constraint fk_matches_tournament foreign KEY (tournament_id) references tournaments (id)
      let query = supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name, team_code, avatar_url),
          away_team:teams!matches_away_team_id_fkey(id, name, team_code, avatar_url),
          tournament:tournaments!fk_matches_tournament(id, name),
          match_votes(id)
        `)
        .eq('tournament_id', tournamentId);

      if (statusFilter === 'upcoming') {
        query = query.eq('played', false);
      } else if (statusFilter === 'finished') {
        query = query.eq('played', true);
      }

      const { data, error } = await query.order('id', { ascending: true });

      if (error) {
        console.error('Error fetching matches:', error);
        return;
      }

      const formattedMatches = (data || []).map((match) => ({
        ...match,
        predictions_count: Array.isArray(match.match_votes) ? match.match_votes.length : 0,
        home_team: match.home_team
          ? {
              ...match.home_team,
              avatar_url: getTeamAvatar(match.home_team),
            }
          : null,
        away_team: match.away_team
          ? {
              ...match.away_team,
              avatar_url: getTeamAvatar(match.away_team),
            }
          : null,
      }));

      setMatches(formattedMatches);
    } catch (err) {
      console.error('Unexpected fetch error:', err);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!selectedTournamentId) return;

    setLoadingMatches(true);
    fetchMatchesForTournament(selectedTournamentId).finally(() => {
      setLoadingMatches(false);
    });
  }, [selectedTournamentId, statusFilter, fetchMatchesForTournament]);

  const onRefresh = useCallback(async () => {
    if (!selectedTournamentId) return;
    setRefreshing(true);
    await fetchMatchesForTournament(selectedTournamentId);
    setRefreshing(false);
  }, [selectedTournamentId, fetchMatchesForTournament]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header notificationCount={3} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1E40AF"
              colors={['#1E40AF']}
            />
          }
        >
          <PromoBanner />

          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Followed Tournaments
            </ThemedText>
          </View>

          <MatchFilters onSelectTournament={setSelectedTournamentId} />

          <View style={styles.statusTabsContainer}>
            {(['all', 'upcoming', 'finished'] as MatchStatusFilter[]).map((filter) => {
              const isActive = statusFilter === filter;
              return (
                <Pressable
                  key={filter}
                  style={[styles.statusTab, isActive && styles.statusTabActive]}
                  onPress={() => setStatusFilter(filter)}
                >
                  <ThemedText style={[styles.statusTabText, isActive && styles.statusTabTextActive]}>
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {loadingMatches ? (
            <ActivityIndicator size="small" color="#1E40AF" style={styles.loader} />
          ) : matches.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>
                No {statusFilter !== 'all' ? statusFilter : ''} matches found for this tournament.
              </ThemedText>
            </View>
          ) : (
            matches.map((match) => <MatchCard key={match.id} match={match} />)
          )}

          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Top Predictors
            </ThemedText>
          </View>

          <TopPredictors/>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: Spacing.one,
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
    color: '#1a1a2e',
  },
  viewAll: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  statusTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  statusTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  statusTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  statusTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusTabTextActive: {
    color: '#1E40AF',
    fontWeight: '700',
  },
  loader: {
    marginVertical: 24,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
  },
  bottomSpacer: {
    height: 24,
  },
});