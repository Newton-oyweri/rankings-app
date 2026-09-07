import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/rankings/Header';
import { MatchCard } from '@/components/rankings/MatchCard';
import { MatchFilters } from '@/components/rankings/MatchFilters';
import { PromoBanner } from '@/components/rankings/PromoBanner';
import { TopPredictors } from '@/components/rankings/TopPredictors';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { HorizontalPackageList } from '@/components/profile/WeeklyProgressCard';
import { AvailableFriendliesList } from '@/components/profile/Friendlies';
import FootballTab from '@/components/football/FootballTab';

type MatchStatusFilter = 'all' | 'upcoming' | 'finished';
type MainTab = 'football' | 'efootball';

const getTeamAvatar = (team: { name?: string; avatar_url?: string | null } | null) => {
  if (!team) return null;
  if (team.avatar_url && team.avatar_url.trim() !== '') {
    return team.avatar_url;
  }
  const seedName = team.name ? encodeURIComponent(team.name.trim()) : 'Team';
  return `https://api.dicebear.com/9.x/initials/png?seed=${seedName}&backgroundType=gradientLinear`;
};

export default function HomeScreen() {
  const [mainTab, setMainTab] = useState<MainTab>('efootball');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ── eFootball state ──────────────────────────────────────────────────────
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>('all');
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatchesForTournament = useCallback(
    async (tournamentId: number) => {
      try {
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
    },
    [statusFilter]
  );

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

  // ─── eFootball Corner Content ────────────────────────────────────────────
  const renderEfootballTab = () => (
    <>
      <PromoBanner />
   {/*  
tepoorarily removed for version one
    <AvailableFriendliesList />
      <HorizontalPackageList onSelectPackage={(item) => console.log('Selected package:', item)} />
*/}
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
      <TopPredictors />
    </>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header />

        {/* ── Compact Dropdown Switcher Bar ── */}
        <View style={styles.dropdownBarContainer}>
          <Pressable
            style={styles.dropdownTrigger}
            onPress={() => setDropdownOpen((prev) => !prev)}
          >
            <View style={styles.triggerLeftContent}>
              <Ionicons
                name={mainTab === 'efootball' ? 'game-controller-outline' : 'football-outline'}
                size={20}
                color="#1E40AF"
              />
              <View style={styles.triggerTextWrapper}>
                <ThemedText style={styles.dropdownTriggerTitle}>
                  {mainTab === 'efootball' ? 'eFootball Corner' : 'Football Rankings'}
                </ThemedText>
                <ThemedText style={styles.dropdownHintText}>
                  {mainTab === 'efootball'
                    ? 'Switch to Football Rankings prediction games'
                    : 'Rankings 5, 6 & 7 prediction challenges'}
                </ThemedText>
              </View>
            </View>

            <Ionicons
              name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={22}
              color="#1E40AF"
              style={styles.chevronIcon}
            />
          </Pressable>
        </View>

        {/* ── Dropdown Modal Menu ── */}
        <Modal
          visible={dropdownOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDropdownOpen(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setDropdownOpen(false)}>
            <View style={styles.dropdownMenu}>
              <Pressable
                style={[
                  styles.dropdownOption,
                  mainTab === 'efootball' && styles.dropdownOptionActive,
                ]}
                onPress={() => {
                  setMainTab('efootball');
                  setDropdownOpen(false);
                }}
              >
                <Ionicons
                  name="game-controller-outline"
                  size={20}
                  color={mainTab === 'efootball' ? '#1E40AF' : '#4B5563'}
                />
                <View style={styles.optionTextContainer}>
                  <ThemedText
                    style={[
                      styles.dropdownOptionText,
                      mainTab === 'efootball' && styles.dropdownOptionTextActive,
                    ]}
                  >
                    eFootball Corner
                  </ThemedText>
                  <ThemedText style={styles.optionHintText}>
                    Community tournaments and match predictor
                  </ThemedText>
                </View>
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                style={[
                  styles.dropdownOption,
                  mainTab === 'football' && styles.dropdownOptionActive,
                ]}
                onPress={() => {
                  setMainTab('football');
                  setDropdownOpen(false);
                }}
              >
                <Ionicons
                  name="trophy-outline"
                  size={20}
                  color={mainTab === 'football' ? '#1E40AF' : '#4B5563'}
                />
                <View style={styles.optionTextContainer}>
                  <ThemedText
                    style={[
                      styles.dropdownOptionText,
                      mainTab === 'football' && styles.dropdownOptionTextActive,
                    ]}
                  >
                    Football Rankings
                  </ThemedText>
                  <ThemedText style={styles.optionHintText}>
                    Predict 5, 6 or 7 matches to win cash prizes
                  </ThemedText>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            mainTab === 'efootball' ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#1E40AF"
                colors={['#1E40AF']}
              />
            ) : undefined
          }
        >
          {mainTab === 'football' ? <FootballTab /> : renderEfootballTab()}
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
  /* ── Dropdown Switcher Styles ── */
  dropdownBarContainer: {
    marginHorizontal: Spacing.one,
    marginBottom: 10,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  triggerLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  triggerTextWrapper: {
    flex: 1,
  },
  dropdownTriggerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
  },
  dropdownHintText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  chevronIcon: {
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
    paddingTop: 125,
    paddingHorizontal: Spacing.one,
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  dropdownOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  optionTextContainer: {
    flex: 1,
  },
  dropdownOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  dropdownOptionTextActive: {
    color: '#1E40AF',
    fontWeight: '700',
  },
  optionHintText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 12,
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