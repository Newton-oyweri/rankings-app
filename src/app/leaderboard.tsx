import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

export interface LeaderboardUser {
  id: string;
  rank: number;
  username: string;
  display_name: string;
  tournaments_played: number;
  mp: number;
  w: number;
  d: number;
  l: number;
  gd: number;
  points: number;
  isCurrentUser?: boolean;
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
  username: string | null;
  display_name: string | null;
  teams?: SupabaseTeamRecord[];
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const listRef = useRef<any>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase.from('profiles').select(`
          id,
          username,
          display_name,
          teams ( w, d, l, gf, ga )
        `);

      if (error) {
        console.error('Error fetching leaderboard profiles:', error.message);
        return;
      }

      if (data) {
        const aggregated: LeaderboardUser[] = (data as SupabaseProfileRecord[]).map((p) => {
          const stats = (p.teams || []).reduce(
            (acc, team) => {
              const w = team.w ?? 0;
              const d = team.d ?? 0;
              const l = team.l ?? 0;
              const gf = team.gf ?? 0;
              const ga = team.ga ?? 0;

              return {
                mp: acc.mp + (w + d + l),
                w: acc.w + w,
                d: acc.d + d,
                l: acc.l + l,
                gf: acc.gf + gf,
                ga: acc.ga + ga,
                points: acc.points + (w * 3 + d * 1),
              };
            },
            { mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, points: 0 }
          );

          return {
            id: p.id,
            rank: 0,
            username: p.username || 'unknown',
            display_name: p.display_name || p.username || 'Player',
            tournaments_played: p.teams?.length || 0,
            mp: stats.mp,
            w: stats.w,
            d: stats.d,
            l: stats.l,
            gd: stats.gf - stats.ga,
            points: stats.points,
            isCurrentUser: user?.id === p.id,
          };
        });

        const sorted = aggregated.sort((a, b) => b.points - a.points || b.gd - a.gd);
        const rankedRows = sorted.map((row, idx) => ({ ...row, rank: idx + 1 }));

        setLeaderboard(rankedRows);
      }
    } catch (err) {
      console.error('Leaderboard exception:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Search Filter
  const filteredLeaderboard = useMemo(() => {
    if (!searchQuery.trim()) return leaderboard;
    const query = searchQuery.toLowerCase().trim();
    return leaderboard.filter(
      (user) =>
        user.display_name.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query)
    );
  }, [leaderboard, searchQuery]);

  const { top1, top2, top3, restOfUsers } = useMemo(() => {
    return {
      top1: filteredLeaderboard.find((u) => u.rank === 1),
      top2: filteredLeaderboard.find((u) => u.rank === 2),
      top3: filteredLeaderboard.find((u) => u.rank === 3),
      restOfUsers: filteredLeaderboard.filter((u) => u.rank > 3),
    };
  }, [filteredLeaderboard]);

  const handleUserPress = useCallback(
    (username: string) => {
      router.push({
        pathname: '/team/[username]/matches',
        params: { username },
      } as any);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: LeaderboardUser; index: number }) => (
      <Animated.View entering={FadeInDown.delay(Math.min(index * 20, 200)).duration(200)}>
        <Pressable
          style={({ pressed }) => [
            styles.userCard,
            item.isCurrentUser && styles.currentUserCard,
            pressed && styles.pressedState,
          ]}
          onPress={() => handleUserPress(item.username)}
        >
          <View style={styles.rankBadgeContainer}>
            <Text style={styles.rankNumber}>{item.rank}</Text>
          </View>

          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text numberOfLines={1} style={styles.userName}>
                {item.display_name}
              </Text>
              {item.isCurrentUser && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>YOU</Text>
                </View>
              )}
            </View>
            <Text style={styles.statText}>
              Teams: {item.tournaments_played} · MP: {item.mp} · W: {item.w} · L: {item.l} · GD:{' '}
              {item.gd > 0 ? `+${item.gd}` : item.gd}
            </Text>
          </View>

          <View style={styles.ptsContainer}>
            <Text style={styles.ptsText}>{item.points.toLocaleString()}</Text>
            <Text style={styles.ptsLabel}>PTS</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" style={{ marginLeft: 4 }} />
        </Pressable>
      </Animated.View>
    ),
    [handleUserPress]
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header Bar */}
      <LinearGradient
        colors={['#1E3A8A', '#2563EB', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <Pressable
              style={({ pressed }) => [styles.backButton, pressed && styles.pressedState]}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.headerTitle}>Kenya eFootball</Text>
              <Text style={styles.headerSubtitle}>Leaderboard Rankings</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.refreshBtn, pressed && styles.pressedState]}
              onPress={fetchLeaderboard}
              disabled={loading}
            >
              <Ionicons name="reload" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Players Search Bar */}
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search players by username..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : filteredLeaderboard.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No players match your search.' : 'No rankings data available.'}
          </Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {/* Podium Hero Section */}
          {!searchQuery && (
            <View style={styles.podiumWrapper}>
              <LinearGradient
                colors={['#EFF6FF', '#F3E8FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bannerCard}
              >
                <Text style={styles.podiumSectionTitle}>Top Players</Text>
                <View style={styles.podiumRow}>
                  {/* Rank 2 */}
                  {top2 ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.podiumItem,
                        top2.isCurrentUser && styles.currentUserPodium,
                        pressed && styles.pressedState,
                      ]}
                      onPress={() => handleUserPress(top2.username)}
                    >
                      <View style={[styles.rankBadge, styles.rank2Badge]}>
                        <Text style={styles.rankBadgeText}>2</Text>
                      </View>
                      <Text numberOfLines={1} style={styles.podiumName}>
                        {top2.display_name}
                      </Text>
                      <Text style={styles.podiumPts}>{top2.points.toLocaleString()} pts</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.podiumItem} />
                  )}

                  {/* Rank 1 */}
                  {top1 ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.podiumItem,
                        styles.podiumItemCenter,
                        top1.isCurrentUser && styles.currentUserPodium,
                        pressed && styles.pressedState,
                      ]}
                      onPress={() => handleUserPress(top1.username)}
                    >
                      <Ionicons name="trophy" size={22} color="#D97706" style={styles.crownIcon} />
                      <View style={[styles.rankBadge, styles.rank1Badge]}>
                        <Text style={styles.rankBadgeText}>1</Text>
                      </View>
                      <Text numberOfLines={1} style={[styles.podiumName, styles.podiumNameCenter]}>
                        {top1.display_name}
                      </Text>
                      <Text style={styles.podiumPtsCenter}>{top1.points.toLocaleString()} pts</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.podiumItem} />
                  )}

                  {/* Rank 3 */}
                  {top3 ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.podiumItem,
                        top3.isCurrentUser && styles.currentUserPodium,
                        pressed && styles.pressedState,
                      ]}
                      onPress={() => handleUserPress(top3.username)}
                    >
                      <View style={[styles.rankBadge, styles.rank3Badge]}>
                        <Text style={styles.rankBadgeText}>3</Text>
                      </View>
                      <Text numberOfLines={1} style={styles.podiumName}>
                        {top3.display_name}
                      </Text>
                      <Text style={styles.podiumPts}>{top3.points.toLocaleString()} pts</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.podiumItem} />
                  )}
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Ranks List */}
          <FlashList
            ref={listRef}
            data={searchQuery ? filteredLeaderboard : restOfUsers}
            estimatedItemSize={68}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listPadding}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  backButton: {
    padding: 4,
    width: 36,
    alignItems: 'flex-start',
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#E0E7FF',
    fontWeight: '500',
    marginTop: 1,
  },
  refreshBtn: {
    padding: 6,
    width: 36,
    alignItems: 'flex-end',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    marginTop: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  listPadding: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  /* Podium */
  podiumWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  bannerCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    alignItems: 'center',
  },
  podiumSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
  },
  podiumItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  podiumItemCenter: {
    marginTop: -8,
  },
  currentUserPodium: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  crownIcon: {
    marginBottom: 2,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  rank1Badge: {
    backgroundColor: '#FEF08A',
    borderWidth: 1,
    borderColor: '#CA8A04',
  },
  rank2Badge: {
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#94A3B8',
  },
  rank3Badge: {
    backgroundColor: '#FFEDD5',
    borderWidth: 1,
    borderColor: '#EA580C',
  },
  rankBadgeText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  podiumNameCenter: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  podiumPts: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  podiumPtsCenter: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 2,
  },

  /* List Items */
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  currentUserCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
    borderWidth: 1.5,
  },
  rankBadgeContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rankNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    textAlign: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  youBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  youBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  statText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  ptsContainer: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  ptsText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  ptsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
  },
  pressedState: {
    opacity: 0.7,
  },
});