import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';

interface LeaderboardUser {
  userId: string;
  rank: number;
  name: string;
  points: number;
  avatar: string;
  isCurrentUser: boolean;
}

/**
 * Generates a deterministic initials avatar fallback using DiceBear.
 */
const getAvatarUrl = (name?: string, avatarUrl?: string) => {
  if (avatarUrl && avatarUrl.trim() !== '') {
    return avatarUrl;
  }
  const seedName = name ? encodeURIComponent(name) : 'User';
  return `https://api.dicebear.com/9.x/initials/png?seed=${seedName}&backgroundType=gradientLinear`;
};

export default function LeaderboardScreen() {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);

      // 1. Get current authenticated user ID
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id ?? null;

      // 2. Fetch total points grouped by user joined with user profiles
      const { data, error } = await supabase
        .from('prediction_points')
        .select(`
          user_id,
          points,
          profiles:user_id (
            id,
            username,
            display_name,
            profile_pic
          )
        `);

      if (error) throw error;

      // 3. Aggregate points manually per user
      const pointsMap: Record<
        string,
        { name: string; avatar: string; points: number }
      > = {};

      data.forEach((item: any) => {
        const uid = item.user_id;
        const profile = item.profiles;
        const displayName =
          profile?.display_name || profile?.username || 'Player';
        const avatar = getAvatarUrl(displayName, profile?.profile_pic);

        if (!pointsMap[uid]) {
          pointsMap[uid] = {
            name: displayName,
            avatar,
            points: 0,
          };
        }
        pointsMap[uid].points += item.points || 0;
      });

      // 4. Convert aggregated object to sorted array and assign ranks
      const sortedList: LeaderboardUser[] = Object.entries(pointsMap)
        .map(([uid, userDetails]) => ({
          userId: uid,
          rank: 0,
          name:
            uid === currentUserId
              ? `${userDetails.name} (You)`
              : userDetails.name,
          points: userDetails.points,
          avatar: userDetails.avatar,
          isCurrentUser: uid === currentUserId,
        }))
        .sort((a, b) => b.points - a.points)
        .map((user, index) => ({
          ...user,
          rank: index + 1,
        }));

      setLeaderboard(sortedList);
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  const top3 = leaderboard.slice(0, 3);
  const remainingPredictors = leaderboard.slice(3);

  const PodiumView = () => {
    const first = top3[0];
    const second = top3[1];
    const third = top3[2];

    if (leaderboard.length === 0) return null;

    return (
      <View style={styles.podiumContainer}>
        {/* 2nd Place */}
        {second && (
          <View style={[styles.podiumCard, styles.podiumSecond]}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: second.avatar }} style={styles.podiumAvatar} />
              <View style={[styles.podiumBadge, styles.badgeSilver]}>
                <ThemedText style={styles.podiumBadgeText}>2</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.podiumName} numberOfLines={1}>
              {second.name}
            </ThemedText>
            <ThemedText style={styles.podiumPoints}>
              {second.points.toLocaleString()} pts
            </ThemedText>
          </View>
        )}

        {/* 1st Place */}
        {first && (
          <View style={[styles.podiumCard, styles.podiumFirst]}>
            <Ionicons name="trophy" size={20} color="#EAB308" style={styles.crownIcon} />
            <View style={styles.avatarWrapper}>
              <Image
                source={{ uri: first.avatar }}
                style={[styles.podiumAvatar, styles.avatarFirst]}
              />
              <View style={[styles.podiumBadge, styles.badgeGold]}>
                <ThemedText style={styles.podiumBadgeText}>1</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.podiumName} numberOfLines={1}>
              {first.name}
            </ThemedText>
            <ThemedText style={styles.podiumPointsFirst}>
              {first.points.toLocaleString()} pts
            </ThemedText>
          </View>
        )}

        {/* 3rd Place */}
        {third && (
          <View style={[styles.podiumCard, styles.podiumThird]}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: third.avatar }} style={styles.podiumAvatar} />
              <View style={[styles.podiumBadge, styles.badgeBronze]}>
                <ThemedText style={styles.podiumBadgeText}>3</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.podiumName} numberOfLines={1}>
              {third.name}
            </ThemedText>
            <ThemedText style={styles.podiumPoints}>
              {third.points.toLocaleString()} pts
            </ThemedText>
          </View>
        )}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Leaderboard</ThemedText>
          <View style={{ width: 32 }} />
        </View>

        {/* Ranking List & Loading States */}
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#1E40AF" />
          </View>
        ) : (
          <FlashList
            data={remainingPredictors}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={PodiumView}
            contentContainerStyle={styles.listPadding}
            keyExtractor={(item) => item.userId}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={
              leaderboard.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <ThemedText style={styles.emptyText}>
                    No leaderboard data available yet.
                  </ThemedText>
                </View>
              ) : null
            }
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(index * 30).duration(200)}>
                <View style={[styles.rankCard, item.isCurrentUser && styles.currentUserCard]}>
                  <ThemedText style={styles.rankIndex}>{item.rank}</ThemedText>

                  <View style={styles.userRow}>
                    <Image source={{ uri: item.avatar }} style={styles.listAvatar} />
                    <ThemedText style={styles.userName} numberOfLines={1}>
                      {item.name}
                    </ThemedText>
                  </View>

                  <ThemedText style={styles.pointsText}>
                    {item.points.toLocaleString()} pts
                  </ThemedText>
                </View>
              </Animated.View>
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  safeArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  listPadding: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },

  /* Podium */
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 20,
    marginTop: 8,
    gap: 8,
  },
  podiumCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  podiumFirst: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE047',
    paddingTop: 16,
  },
  podiumSecond: {
    marginBottom: -4,
  },
  podiumThird: {
    marginBottom: -8,
  },
  crownIcon: {
    marginBottom: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  podiumAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFirst: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#EAB308',
  },
  podiumBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeGold: { backgroundColor: '#EAB308' },
  badgeSilver: { backgroundColor: '#94A3B8' },
  badgeBronze: { backgroundColor: '#D97706' },
  podiumBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  podiumPoints: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  podiumPointsFirst: {
    fontSize: 12,
    fontWeight: '800',
    color: '#854D0E',
    marginTop: 2,
  },

  /* Rank List */
  rankCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currentUserCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1.5,
  },
  rankIndex: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    width: 24,
    textAlign: 'center',
  },
  userRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  listAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E40AF',
  },
});