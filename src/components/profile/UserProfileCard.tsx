import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

export interface UserProfileData {
  id: string;
  username?: string;
  display_name?: string;
  profile_pic?: string | null;
  county?: string | null;
  gender?: string | null;
  role?: string;
  total_points?: number;
}

interface UserProfileCardProps {
  userId?: string;
  profile?: UserProfileData;
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

export function UserProfileCard({ userId, profile: initialProfile }: UserProfileCardProps) {
  const targetUserId = userId || initialProfile?.id;

  const [profile, setProfile] = useState<UserProfileData | null>(initialProfile || null);
  const [totalPoints, setTotalPoints] = useState<number>(initialProfile?.total_points ?? 0);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(!initialProfile && !!targetUserId);

  const fetchUserPoints = useCallback(async (id: string) => {
    try {
      const { data: viewData, error: viewError } = await supabase
        .from('user_total_points')
        .select('prediction_points, checkin_points, total_points')
        .eq('user_id', id)
        .maybeSingle();

      if (!viewError && viewData) {
        setTotalPoints(Number(viewData.total_points) || 0);
        return;
      }

      const [predResult, checkInResult] = await Promise.all([
        supabase.from('prediction_points').select('points').eq('user_id', id),
        supabase.from('check_ins').select('points').eq('user_id', id),
      ]);

      const totalPred = predResult.data?.reduce((acc, curr) => acc + (curr.points || 0), 0) || 0;
      const totalCheckIn = checkInResult.data?.reduce((acc, curr) => acc + (curr.points || 0), 0) || 0;

      setTotalPoints(totalPred + totalCheckIn);
    } catch (err) {
      console.error('UserProfileCard: Error fetching user points:', err);
    }
  }, []);

  const fetchUserRank = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select(`
          id,
          teams ( w, d, l, gf, ga )
        `);

      if (error || !data) return;

      const aggregated = (data as SupabaseProfileRecord[]).map((p) => {
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
      const userIndex = sorted.findIndex((u) => u.id === id);

      if (userIndex !== -1) {
        setRank(userIndex + 1);
      }
    } catch (err) {
      console.error('UserProfileCard: Error calculating rank:', err);
    }
  }, []);

  const fetchUserProfile = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, profile_pic, county, gender, role')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching UserProfileCard data:', error.message || error);
        return;
      }

      if (data) {
        setProfile(data);
      }
    } catch (err: any) {
      console.error('Error fetching UserProfileCard data:', err.message || err);
    }
  }, []);

  useEffect(() => {
    if (!targetUserId) return;

    let isMounted = true;
    if (!initialProfile) setLoading(true);

    Promise.all([
      fetchUserProfile(targetUserId),
      fetchUserPoints(targetUserId),
      fetchUserRank(targetUserId),
    ]).finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [targetUserId, fetchUserProfile, fetchUserPoints, fetchUserRank]);

  if (loading) {
    return (
      <View style={[styles.profileCard, styles.loaderContainer]}>
        <ActivityIndicator size="small" color="#FFFFFF" />
      </View>
    );
  }

  const activeProfile = profile || initialProfile;
  if (!activeProfile) return null;

  const displayName = activeProfile.display_name || 'User';
  const handle = activeProfile.username ? `@${activeProfile.username}` : '@user';
  const avatarUrl = activeProfile.profile_pic || 'https://via.placeholder.com/150';
  const county = activeProfile.county || 'Kenya';

  return (
    <View style={styles.profileCard}>
      {/* Top Row: Avatar, User Info, and Top-Right Rank Badge */}
      <View style={styles.profileTop}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <View style={styles.onlineDot} />
        </View>

        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <ThemedText style={styles.name}>{displayName}</ThemedText>
          </View>
          <ThemedText style={styles.handle}>{handle}</ThemedText>
          <View style={styles.locationRow}>
            <ThemedText style={styles.flag}>🇰🇪</ThemedText>
            <ThemedText style={styles.location}>{county}</ThemedText>
          </View>
        </View>

        {/* Top-Right Rank Badge */}
        <View style={styles.rankBadge}>
          <ThemedText style={styles.rankLabel}>RANK</ThemedText>
          <ThemedText style={styles.rankValue}>
            {rank ? `#${rank}` : '-'}
          </ThemedText>
        </View>
      </View>

      {/* Bottom Box: Takes full width for Total Points */}
      <View style={styles.pointsBox}>
        <ThemedText style={styles.pointsLabel}>TOTAL POINTS</ThemedText>
        <ThemedText style={styles.pointsValue}>
          {totalPoints.toLocaleString()} pts
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: '#1E40AF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  loaderContainer: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#1E40AF',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  handle: {
    fontSize: 13,
    color: '#BFDBFE',
    marginTop: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  flag: {
    fontSize: 14,
  },
  location: {
    fontSize: 13,
    color: '#E0E7FF',
  },
  rankBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  rankLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#BFDBFE',
    letterSpacing: 0.5,
  },
  rankValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },
  pointsBox: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 14,
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: 11,
    color: '#BFDBFE',
    fontWeight: '600',
  },
  pointsValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});