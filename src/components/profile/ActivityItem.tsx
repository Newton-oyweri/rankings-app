import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import { MatchPredictions } from './match-predictions';
import { JackpotEntries } from './jackpot-entries';

// Enable LayoutAnimation for Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Types for Matches Tab
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

// Types for Jackpot Tab
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

interface ActivityItemProps {
  userId?: string;
}

export function ActivityItem({ userId }: ActivityItemProps) {
  const [activeTab, setActiveTab] = useState<'matches' | 'jackpots'>('matches');

  // Match Votes State
  const [votes, setVotes] = useState<MatchVoteRecord[]>([]);
  const [loadingVotes, setLoadingVotes] = useState<boolean>(true);

  // Jackpot Entries State
  const [jackpotEntries, setJackpotEntries] = useState<UserJackpotEntry[]>([]);
  const [loadingJackpots, setLoadingJackpots] = useState<boolean>(true);

  // Fetch Match Votes
  const fetchPredictedMatches = useCallback(async (uid: string) => {
    try {
      setLoadingVotes(true);
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
      setLoadingVotes(false);
    }
  }, []);

  // Fetch Jackpot Entries
  const fetchUserJackpotEntries = useCallback(async (uid: string) => {
    try {
      setLoadingJackpots(true);
      const { data: entriesData, error: entriesError } = await supabase
        .from('jackpot_entries')
        .select(`
          id,
          entry_number,
          entry_fee,
          correct_predictions,
          status,
          submitted_at,
          jackpots (
            name,
            game_count
          )
        `)
        .eq('user_id', uid)
        .order('submitted_at', { ascending: false });

      if (entriesError) {
        console.error('Error fetching jackpot entries:', entriesError.message);
        return;
      }

      if (!entriesData || entriesData.length === 0) {
        setJackpotEntries([]);
        return;
      }

      const entryIds = entriesData.map((e) => e.id);

      const { data: selectionsData, error: selectionsError } = await supabase
        .from('jackpot_selections')
        .select(`
          id,
          entry_id,
          game_id,
          selection,
          is_correct,
          jackpot_games (
            game_number,
            home_team,
            away_team,
            outcome,
            home_score,
            away_score,
            status
          )
        `)
        .in('entry_id', entryIds);

      if (selectionsError) {
        console.error('Error fetching jackpot selections:', selectionsError.message);
      }

      const selectionsByEntry: Record<string, JackpotGameSelection[]> = {};
      (selectionsData || []).forEach((item: any) => {
        const game = item.jackpot_games || {};
        if (!selectionsByEntry[item.entry_id]) {
          selectionsByEntry[item.entry_id] = [];
        }

        selectionsByEntry[item.entry_id].push({
          id: item.id,
          game_id: item.game_id,
          game_number: game.game_number || 0,
          home_team: game.home_team || 'Home',
          away_team: game.away_team || 'Away',
          selection: item.selection,
          is_correct: item.is_correct,
          outcome: game.outcome,
          home_score: game.home_score,
          away_score: game.away_score,
          game_status: game.status,
        });
      });

      const formattedEntries: UserJackpotEntry[] = entriesData.map((item: any) => {
        const jackpot = item.jackpots || {};
        const sortedPicks = (selectionsByEntry[item.id] || []).sort(
          (a, b) => a.game_number - b.game_number
        );

        return {
          entry_id: item.id,
          entry_number: item.entry_number,
          entry_fee: Number(item.entry_fee).toFixed(2),
          correct_predictions: item.correct_predictions,
          entry_status: item.status,
          submitted_at: item.submitted_at,
          jackpot_name: jackpot.name || 'Jackpot',
          game_count: jackpot.game_count || 0,
          selections: sortedPicks,
        };
      });

      setJackpotEntries(formattedEntries);
    } catch (err) {
      console.error('Error in fetchUserJackpotEntries:', err);
    } finally {
      setLoadingJackpots(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchPredictedMatches(userId);
      fetchUserJackpotEntries(userId);
    } else {
      setLoadingVotes(false);
      setLoadingJackpots(false);
    }
  }, [userId, fetchPredictedMatches, fetchUserJackpotEntries]);

  const handleTabChange = (tab: 'matches' | 'jackpots') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
  };

  return (
    <View style={styles.container}>
      {/* Tab Switcher Header */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabButton, activeTab === 'matches' && styles.activeTabButton]}
          onPress={() => handleTabChange('matches')}
        >
          <ThemedText
            style={[styles.tabText, activeTab === 'matches' && styles.activeTabText]}
          >
            Match Predictions
          </ThemedText>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'jackpots' && styles.activeTabButton]}
          onPress={() => handleTabChange('jackpots')}
        >
          <ThemedText
            style={[styles.tabText, activeTab === 'jackpots' && styles.activeTabText]}
          >
            Contest
          </ThemedText>
        </Pressable>
      </View>

      {/* Tab Content */}
      {activeTab === 'matches' ? (
        <MatchPredictions votes={votes} loading={loadingVotes} />
      ) : (
        <JackpotEntries entries={jackpotEntries} loading={loadingJackpots} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#0F172A',
    fontWeight: '700',
  },
});

export default ActivityItem;