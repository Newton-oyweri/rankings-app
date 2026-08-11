import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ProfileHeader } from '@/components/ProfileHeader';
import { UserPostsList, UserPost } from '@/components/UserPostsList';
import { supabase } from '@/lib/supabase';

interface ProfileData {
  id: string;
  username: string;
  display_name: string;
  profile_pic: string | null;
  gender: string | null;
  county: string | null;
  role: string;
  created_at?: string;
}

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [updatingFollow, setUpdatingFollow] = useState(false);

  const fetchProfileData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user || null;
      setCurrentUser(user);

      // 1. Fetch Profile Details matching your database schema
      const { data: prof, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, profile_pic, gender, county, role, created_at')
        .eq('id', id)
        .single();

      if (error || !prof) {
        console.error('Error fetching profile:', error);
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(prof);

      // 2. Fetch Followers, Following & User Posts concurrently
      const [fwer, fwing, check, postsRes] = await Promise.all([
        supabase
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', prof.id),
        supabase
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', prof.id),
        user
          ? supabase
              .from('followers')
              .select('id')
              .eq('follower_id', user.id)
              .eq('following_id', prof.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from('posts')
          .select('id, title, summary, image_url, likes, created_at')
          .eq('user_id', prof.id)
          .order('id', { ascending: false }),
      ]);

      setCounts({
        followers: fwer.count || 0,
        following: fwing.count || 0,
      });
      setIsFollowing(!!check.data);

      if (postsRes.data) {
        setUserPosts(postsRes.data);
      }
    } catch (err) {
      console.error('Unexpected error fetching profile or posts:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      router.push('/(auth)/sign-in');
      return;
    }
    if (!profile || currentUser.id === profile.id) return;

    setUpdatingFollow(true);

    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setCounts((prev) => ({
      ...prev,
      followers: nextState ? prev.followers + 1 : Math.max(0, prev.followers - 1),
    }));

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('followers')
          .insert({ follower_id: currentUser.id, following_id: profile.id });

        if (error) throw error;
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      fetchProfileData();
    } finally {
      setUpdatingFollow(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    setUserPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
    );

    try {
      await supabase.rpc('increment_post_likes', { post_id: Number(postId) });
    } catch (err) {
      console.error('Error updating likes:', err);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Navigation Header */}
      <ProfileHeader
        username={profile?.username}
        loading={loading}
        onBack={() => router.back()}
        onRefresh={fetchProfileData}
      />

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : profile ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Profile Card */}
          <View style={styles.topProfileCard}>
            <View style={styles.profileRow}>
              {/* Avatar */}
              <View style={styles.avatarWrapper}>
                {profile.profile_pic ? (
                  <Image
                    source={{ uri: profile.profile_pic }}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>
                      {(profile.display_name || profile.username || 'P')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              {/* User Details */}
              <View style={styles.profileDetails}>
                <Text style={styles.displayName} numberOfLines={1}>
                  {profile.display_name}
                </Text>
                <Text style={styles.username}>@{profile.username}</Text>

                {/* Followers & Following Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statGroup}>
                    <Text style={styles.statNumber}>
                      {counts.followers.toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel}>Followers</Text>
                  </View>
                  <View style={styles.statDot} />
                  <View style={styles.statGroup}>
                    <Text style={styles.statNumber}>
                      {counts.following.toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel}>Following</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Profile Info Bar: County, Gender & Role Badges */}
            <View style={styles.infoBar}>
              {profile.county && (
                <View style={styles.badgeItem}>
                  <Ionicons name="location" size={15} color="#2563EB" />
                  <Text style={styles.badgeValue}>{profile.county}</Text>
                </View>
              )}

              {profile.county && profile.gender && <View style={styles.badgeDivider} />}

              {profile.gender && (
                <View style={styles.badgeItem}>
                  <Ionicons
                    name={profile.gender.toLowerCase() === 'female' ? 'female' : 'male'}
                    size={15}
                    color="#0EA5E9"
                  />
                  <Text style={styles.badgeValue}>{profile.gender}</Text>
                </View>
              )}

              {profile.role && (
                <>
                  <View style={styles.badgeDivider} />
                  <View style={styles.badgeItem}>
                    <Ionicons name="shield-checkmark" size={15} color="#059669" />
                    <Text style={[styles.badgeValue, styles.roleText]}>
                      {profile.role}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Follow Action Button */}
            {currentUser?.id !== profile.id && (
              <Pressable
                disabled={updatingFollow}
                style={({ pressed }) => [
                  styles.followButton,
                  isFollowing && styles.followingButton,
                  pressed && styles.pressedState,
                ]}
                onPress={handleFollowToggle}
              >
                {updatingFollow ? (
                  <ActivityIndicator size="small" color={isFollowing ? '#475569' : '#FFFFFF'} />
                ) : (
                  <>
                    <Ionicons
                      name={isFollowing ? 'checkmark' : 'add'}
                      size={16}
                      color={isFollowing ? '#475569' : '#FFFFFF'}
                    />
                    <Text
                      style={[
                        styles.followButtonText,
                        isFollowing && styles.followingButtonText,
                      ]}
                    >
                      {isFollowing ? 'Following' : 'Follow Player'}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>

          {/* User Posts List Component */}
          <UserPostsList posts={userPosts} onLikePost={handleLikePost} />
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="person-circle-outline" size={56} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Player Not Found</Text>
          <Text style={styles.emptySubtitle}>This user profile doesn't exist or was removed.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  topProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    marginRight: 14,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  avatarFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  username: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  statDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  roleText: {
    textTransform: 'capitalize',
  },
  badgeDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 14,
    gap: 6,
  },
  followingButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  followButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  followingButtonText: {
    color: '#475569',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  pressedState: {
    opacity: 0.8,
  },
});