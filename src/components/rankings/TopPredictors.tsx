import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

interface Predictor {
  userId: string;
  rank: number;
  name: string;
  points: number;
  avatar: string;
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

export function TopPredictors() {
  const isNavigating = useRef(false);
  const [loading, setLoading] = useState(true);
  const [predictors, setPredictors] = useState<Predictor[]>([]);

  useEffect(() => {
    fetchTopPredictors();
  }, []);

  const fetchTopPredictors = async () => {
    try {
      setLoading(true);

      // 1. Fetch points joined with profiles table
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

      // 2. Aggregate points per user
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

      // 3. Sort descending by points, take top 10, and assign ranks
      const topList: Predictor[] = Object.entries(pointsMap)
        .map(([uid, details]) => ({
          userId: uid,
          rank: 0,
          name: details.name,
          points: details.points,
          avatar: details.avatar,
        }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 10)
        .map((user, index) => ({
          ...user,
          rank: index + 1,
        }));

      setPredictors(topList);
    } catch (err: any) {
      console.error('Error fetching top predictors:', err.message || err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLeaderboard = () => {
    if (isNavigating.current) return;
    isNavigating.current = true;

    router.push('/predictorsleaderboard');

    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color="#2563EB" />
      </View>
    );
  }

  if (predictors.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.predictorsContainer}
    >
      {predictors.map((user) => (
        <Pressable
          key={user.userId}
          onPress={handleOpenLeaderboard}
          style={[
            styles.predictorCard,
            user.rank === 1 && styles.predictorCardFirst,
          ]}
        >
          {user.rank <= 3 ? (
            <View
              style={[
                styles.rankBadge,
                user.rank === 1 && styles.rankBadgeGold,
                user.rank === 2 && styles.rankBadgeSilver,
                user.rank === 3 && styles.rankBadgeBronze,
              ]}
            >
              <ThemedText style={styles.rankText}>{user.rank}</ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.rankNumber}>{user.rank}</ThemedText>
          )}

          <Image source={{ uri: user.avatar }} style={styles.predictorAvatar} />
          <View style={styles.onlineDotSmall} />
          <ThemedText style={styles.predictorName} numberOfLines={1}>
            {user.name}
          </ThemedText>
          <ThemedText style={styles.predictorPoints}>
            {user.points.toLocaleString()} pts
          </ThemedText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  predictorsContainer: {
    gap: 12,
    marginBottom: 24,
    paddingRight: 8,
  },
  predictorCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    width: 100,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    position: 'relative',
  },
  predictorCardFirst: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE047',
  },
  rankBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#94A3B8',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeGold: {
    backgroundColor: '#EAB308',
  },
  rankBadgeSilver: {
    backgroundColor: '#94A3B8',
  },
  rankBadgeBronze: {
    backgroundColor: '#D97706',
  },
  rankText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  rankNumber: {
    position: 'absolute',
    top: 8,
    left: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  predictorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 6,
    marginTop: 4,
  },
  onlineDotSmall: {
    position: 'absolute',
    top: 44,
    right: 28,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  predictorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  predictorPoints: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});