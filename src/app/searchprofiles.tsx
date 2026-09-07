import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ProfileCard, ProfileItem } from '@/components/ProfileCard';
import { SearchHeader } from '@/components/SearchHeader';
import { supabase } from '@/lib/supabase';

interface SupabaseTeamRecord {
  w: number | null;
  d: number | null;
  l: number | null;
  gf: number | null;
  ga: number | null;
}

interface SupabaseProfileRecord {
  id: string;
  teams?: SupabaseTeamRecord[];
}

export default function SearchProfilesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Toast State
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    checkCurrentUser();
    fetchProfiles('');
  }, []);

  const checkCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2500);
  };

  // Debounced search logic
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProfiles(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchProfiles = async (queryText: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, username, display_name, profile_pic, county, role')
        .order('display_name', { ascending: true })
        .limit(30);

      const trimmed = queryText.trim();
      if (trimmed) {
        query = query.or(
          `username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%,county.ilike.%${trimmed}%`
        );
      }

      const { data: rawProfiles, error } = await query;

      if (error) throw error;

      if (!rawProfiles || rawProfiles.length === 0) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      const formatted: ProfileItem[] = rawProfiles.map((p) => ({
        ...p,
        follower_count: 0,
        is_following: false,
        rank: null,
        loadingRank: true,
      }));

      setProfiles(formatted);
      setLoading(false);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const profileIds = formatted.map((p) => p.id);
      const statsPromises = formatted.map(async (p) => {
        const { count } = await supabase
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', p.id);

        let isFollowing = false;
        if (user) {
          const { data: followData } = await supabase
            .from('followers')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', p.id)
            .maybeSingle();

          if (followData) isFollowing = true;
        }

        return {
          id: p.id,
          follower_count: count || 0,
          is_following: isFollowing,
        };
      });

      const statsResults = await Promise.all(statsPromises);

      setProfiles((prev) =>
        prev.map((item) => {
          const stat = statsResults.find((s) => s.id === item.id);
          return stat
            ? { ...item, follower_count: stat.follower_count, is_following: stat.is_following }
            : item;
        })
      );

      calculateRanksInBackground(profileIds);
    } catch (err) {
      console.error('Error searching profiles:', err);
      setLoading(false);
    }
  };

  const calculateRanksInBackground = async (targetIds: string[]) => {
    try {
      const { data: allProfilesWithTeams } = await supabase
        .from('profiles')
        .select(`
          id,
          teams ( w, d, l, gf, ga )
        `);

      if (!allProfilesWithTeams) return;

      const aggregated = (allProfilesWithTeams as SupabaseProfileRecord[]).map((p) => {
        const stats = (p.teams || []).reduce(
          (acc, team) => {
            const w = team.w ?? 0;
            const d = team.d ?? 0;
            const gf = team.gf ?? 0;
            const ga = team.ga ?? 0;

            return {
              points: acc.points + (w * 3 + d * 1),
              gd: acc.gd + (gf - ga),
            };
          },
          { points: 0, gd: 0 }
        );

        return {
          id: p.id,
          points: stats.points,
          gd: stats.gd,
        };
      });

      const sorted = aggregated.sort((a, b) => b.points - a.points || b.gd - a.gd);
      const rankMap = new Map<string, number>();
      sorted.forEach((item, index) => {
        rankMap.set(item.id, index + 1);
      });

      setProfiles((prev) =>
        prev.map((item) => ({
          ...item,
          rank: rankMap.get(item.id) || null,
          loadingRank: false,
        }))
      );
    } catch (err) {
      console.error('Error computing ranks:', err);
      setProfiles((prev) => prev.map((item) => ({ ...item, loadingRank: false })));
    }
  };

  const handleFollowToggle = async (profile: ProfileItem) => {
    if (!currentUser) {
      triggerToast('Sign in to follow players!');
      return;
    }

    if (currentUser.id === profile.id) {
      triggerToast("You can't follow yourself!");
      return;
    }

    const previousState = profile.is_following;
    const newFollowingState = !previousState;

    setProfiles((prev) =>
      prev.map((p) =>
        p.id === profile.id
          ? {
              ...p,
              is_following: newFollowingState,
              follower_count: newFollowingState
                ? (p.follower_count || 0) + 1
                : Math.max(0, (p.follower_count || 1) - 1),
            }
          : p
      )
    );

    try {
      if (previousState) {
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id);

        if (error) throw error;
        triggerToast(`Unfollowed @${profile.username}`);
      } else {
        const { error } = await supabase.from('followers').insert({
          follower_id: currentUser.id,
          following_id: profile.id,
        });

        if (error) throw error;
        triggerToast(`Following @${profile.username}`);
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
      triggerToast('Action failed. Reverting...');
      setProfiles((prev) =>
        prev.map((p) => (p.id === profile.id ? { ...p, is_following: previousState } : p))
      );
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfiles(searchQuery);
    setRefreshing(false);
  }, [searchQuery]);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* Toast Notification */}
      {showToast && (
        <View style={styles.toastWrapper}>
          <View style={styles.toastCard}>
            <Ionicons name="information-circle" size={16} color="#2563EB" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}

      {/* Modular Header Component */}
      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Profiles List */}
      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProfileCard item={item} onFollowToggle={handleFollowToggle} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
        }
        ListHeaderComponent={
          loading ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="small" color="#2563EB" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="people-outline" size={36} color="#2563EB" />
              </View>
              <Text style={styles.emptyTitle}>No profiles found</Text>
              <Text style={styles.emptySubtitle}>
                Try searching with another username, display name, or county.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  loadingWrapper: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  toastWrapper: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 999,
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A8A',
  },
});