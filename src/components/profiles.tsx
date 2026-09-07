import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';

interface DisplayProfile {
  id: string;
  username: string;
  display_name: string;
  profile_pic: string | null;
  follower_count?: number;
  is_following?: boolean;
  rank?: number | null;
  loadingRank?: boolean;
}

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

interface ProfilesProps {
  matchId?: number;
}

export default function Profiles({ matchId }: ProfilesProps) {
  const [randomProfiles, setRandomProfiles] = useState<DisplayProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    checkUser();
    loadProgressively();
  }, [matchId]);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const triggerToast = (msg: string, duration = 2500) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, duration);
  };

  // Progressive Loader Engine
  const loadProgressively = async () => {
    setLoadingInitial(true);

    try {
      // STEP 1: Quick-fetch basic profile data only (Fast & Light)
      const { data: rawProfiles, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, profile_pic')
        .limit(20);

      if (error || !rawProfiles || rawProfiles.length === 0) {
        setLoadingInitial(false);
        return;
      }

      // Pick 3-5 random profiles immediately
      const shuffled = [...rawProfiles].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, Math.floor(Math.random() * 3) + 3).map((p) => ({
        ...p,
        follower_count: 0,
        is_following: false,
        rank: null,
        loadingRank: true, // Rank will calculate in background
      }));

      // Render cards immediately with initial profile info!
      setRandomProfiles(selected);
      setLoadingInitial(false);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // STEP 2: Fetch Follower Counts and Follow Status for selected profiles
      const profileIds = selected.map((p) => p.id);

      const statsPromises = selected.map(async (p) => {
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

      // Update UI with follower counts & follow state
      setRandomProfiles((prev) =>
        prev.map((item) => {
          const stat = statsResults.find((s) => s.id === item.id);
          return stat
            ? { ...item, follower_count: stat.follower_count, is_following: stat.is_following }
            : item;
        })
      );

      // STEP 3: Heavy Rank calculation running quietly in background
      calculateRanksInBackground(profileIds);
    } catch (err) {
      console.error('Error progressive loading:', err);
      setLoadingInitial(false);
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

      // Sort profiles to derive global ranks
      const sorted = aggregated.sort((a, b) => b.points - a.points || b.gd - a.gd);
      const rankMap = new Map<string, number>();
      sorted.forEach((item, index) => {
        rankMap.set(item.id, index + 1);
      });

      // Update state with ranks once calculated
      setRandomProfiles((prev) =>
        prev.map((item) => ({
          ...item,
          rank: rankMap.get(item.id) || null,
          loadingRank: false,
        }))
      );
    } catch (err) {
      console.error('Error calculating rank in background:', err);
      setRandomProfiles((prev) => prev.map((item) => ({ ...item, loadingRank: false })));
    }
  };

  const handleFollow = async (profile: DisplayProfile) => {
    if (!currentUser) {
      triggerToast('Sign in to follow players!');
      return;
    }

    if (currentUser.id === profile.id) {
      triggerToast("You can't follow yourself!");
      return;
    }

    try {
      if (profile.is_following) {
        // Optimistic UI Update
        setRandomProfiles((prev) =>
          prev.map((p) =>
            p.id === profile.id
              ? {
                  ...p,
                  is_following: false,
                  follower_count: Math.max(0, (p.follower_count || 1) - 1),
                }
              : p
          )
        );

        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id);

        if (error) throw error;
        triggerToast(`Unfollowed @${profile.username}`);
      } else {
        // Optimistic UI Update
        setRandomProfiles((prev) =>
          prev.map((p) =>
            p.id === profile.id
              ? {
                  ...p,
                  is_following: true,
                  follower_count: (p.follower_count || 0) + 1,
                }
              : p
          )
        );

        const { error } = await supabase.from('followers').insert({
          follower_id: currentUser.id,
          following_id: profile.id,
        });

        if (error) throw error;
        triggerToast(`Following @${profile.username}`);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      triggerToast('Something went wrong. Please try again.');
      loadProgressively(); // Revert on failure
    }
  };

  const handleNavigateToProfile = (profileId: string) => {
    router.push(`/profile/${profileId}` as any);
  };

  if (loadingInitial) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2563EB" />
      </View>
    );
  }

  if (randomProfiles.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Toast Notification */}
      {showToast && (
        <View style={styles.toastContainer}>
          <View style={styles.toastCard}>
            <Ionicons name="information-circle" size={18} color="#2563EB" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle}>Featured Players</Text>
          <Ionicons name="sparkles" size={16} color="#2563EB" />
        </View>
        <Text style={styles.subTitle}>Suggested players to connect with</Text>
      </View>

      {/* Horizontal Scroll List */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        decelerationRate="fast"
        snapToInterval={256}
      >
        {randomProfiles.map((profile) => {
          return (
            <Pressable
              key={profile.id}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() => handleNavigateToProfile(profile.id)}
            >
              {/* Clean Profile Image */}
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: profile.profile_pic || undefined }}
                  style={styles.avatar}
                />
              </View>

              {/* Profile Details */}
              <View style={styles.infoWrapper}>
                <Text style={styles.displayName} numberOfLines={1}>
                  {profile.display_name || profile.username || 'User'}
                </Text>
                <Text style={styles.username} numberOfLines={1}>
                  @{profile.username || 'user'}
                </Text>
              </View>

              {/* Light Blue Stat Box */}
              <View style={styles.statBox}>
                <View style={styles.statCol}>
                  <Text style={styles.statValue}>
                    {profile.follower_count || 0}
                  </Text>
                  <View style={styles.statLabelRow}>
                    <Ionicons name="people-outline" size={12} color="#2563EB" />
                    <Text style={styles.statLabel}>Followers</Text>
                  </View>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statCol}>
                  {profile.loadingRank ? (
                    <ActivityIndicator size="small" color="#2563EB" style={{ height: 20 }} />
                  ) : (
                    <Text style={styles.statValue}>
                      {profile.rank ? `#${profile.rank}` : '-'}
                    </Text>
                  )}
                  <View style={styles.statLabelRow}>
                    <Ionicons name="trophy-outline" size={12} color="#2563EB" />
                    <Text style={styles.statLabel}>Rank</Text>
                  </View>
                </View>
              </View>

              {/* Action Button */}
              {profile.is_following ? (
                <Pressable
                  style={[styles.button, styles.buttonFollowing]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleFollow(profile);
                  }}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#2563EB" />
                  <Text style={styles.buttonTextFollowing}>Following</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.button}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleFollow(profile);
                  }}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#1D4ED8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.buttonGradient}
                  >
                    <Ionicons name="person-add" size={14} color="#FFFFFF" />
                    <Text style={styles.buttonTextFollow}>Follow</Text>
                  </LinearGradient>
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    position: 'relative',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: 0.3,
  },
  subTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  toastContainer: {
    position: 'absolute',
    top: -50,
    left: 16,
    right: 16,
    zIndex: 999,
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    color: '#1E3A8A',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    gap: 16,
    paddingBottom: 8,
  },
  card: {
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  avatarContainer: {
    marginBottom: 14,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
  },
  infoWrapper: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  displayName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  username: {
    fontSize: 13,
    color: '#3B82F6',
    textAlign: 'center',
    marginTop: 2,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#F0F6FF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 18,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E3A8A',
    height: 20,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#BFDBFE',
  },
  button: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  buttonFollowing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  buttonTextFollow: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  buttonTextFollowing: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },
});