import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

export interface Tournament {
  id: number;
  name: string;
  is_active: boolean | null;
  status: string | null;
  is_verified: boolean;
  tournament_avatar: string | null;
}

interface MatchFiltersProps {
  onSelectTournament: (tournamentId: number | null) => void;
  defaultSelectedId?: number;
}

export function MatchFilters({ onSelectTournament, defaultSelectedId }: MatchFiltersProps) {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(defaultSelectedId ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFollowedTournaments();
  }, []);

  const getFallbackAvatar = (name: string) => {
    const encodedName = encodeURIComponent(name.trim());
    return `https://api.dicebear.com/9.x/initials/png?seed=${encodedName}&backgroundType=gradientLinear`;
  };

  const fetchFollowedTournaments = async () => {
    try {
      setLoading(true);

      // 1. Get logged in user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setTournaments([]);
        setLoading(false);
        return;
      }

      // 2. Fetch tournament IDs followed by this user
      const { data: followsData, error: followsError } = await supabase
        .from('tournament_followers')
        .select('tournament_id')
        .eq('user_id', user.id);

      if (followsError || !followsData || followsData.length === 0) {
        setTournaments([]);
        setLoading(false);
        return;
      }

      const followedIds = followsData.map((f) => f.tournament_id);

      // 3. Query ONLY followed tournaments
      const { data: tournamentData, error: tourneyError } = await supabase
        .from('tournaments')
        .select('id, name, is_active, status, is_verified, tournament_avatar')
        .in('id', followedIds)
        .order('created_at', { ascending: false });

      if (tourneyError) {
        console.error('Error fetching tournaments:', tourneyError.message);
        return;
      }

      if (tournamentData && tournamentData.length > 0) {
        setTournaments(tournamentData);
        const initialId = defaultSelectedId ?? tournamentData[0].id;
        setSelectedId(initialId);
        onSelectTournament(initialId);
      } else {
        setTournaments([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id: number) => {
    setSelectedId(id);
    onSelectTournament(id);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#1E40AF" />
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filtersContainer}
    >
      {/* Button routing to all tournaments  if tournaments length is 1 plus */}

      {
        tournaments.length > 1 && (
          <Pressable
            onPress={() => router.push('/tournaments')}
            style={styles.allTournamentsBtn}
          >
            <Ionicons name="grid-outline" size={14} color="#FFFFFF" />
            <ThemedText style={styles.allTournamentsText}>View All</ThemedText>
          </Pressable>
        )
      }

      {tournaments.length === 0 ? (
        <Pressable
          onPress={() => router.push('/tournaments')}
          style={styles.emptyFollowChip}
        >
          <ThemedText style={styles.emptyFollowText}>
            + Follow Tournaments
          </ThemedText>
        </Pressable>
      ) : (
        tournaments.map((tournament) => {
          const isActive = selectedId === tournament.id;
          const avatarUri =
            tournament.tournament_avatar && tournament.tournament_avatar.trim() !== ''
              ? tournament.tournament_avatar
              : getFallbackAvatar(tournament.name);

          return (
            <Pressable
              key={tournament.id}
              onPress={() => handleSelect(tournament.id)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
            >
              <Image source={{ uri: avatarUri }} style={styles.avatar} />

              <ThemedText style={[styles.filterText, isActive && styles.filterTextActive]}>
                {tournament.name}
              </ThemedText>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    height: 40,
    justifyContent: 'center',
    paddingLeft: 16,
    marginBottom: 16,
  },
  filtersContainer: {
    gap: 8,
    marginBottom: 16,
    paddingRight: 8,
    alignItems: 'center',
  },
  allTournamentsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E40AF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
  },
  allTournamentsText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 8,
    paddingRight: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D1D5DB',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterTextActive: {
    color: '#fff',
  },
  emptyFollowChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  emptyFollowText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
  },
});