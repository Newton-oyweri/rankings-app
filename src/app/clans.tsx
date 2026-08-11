import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

const REGISTER_URL = 'https://efootballkenyaleague.website/register';

export interface Clan {
  id: string;
  clan_name: string;
  clan_avatar: string;
  created_by: string;
  created_at: string;
  is_verified: boolean;
}

export interface ClanPlayer {
  id: string;
  name: string;
  player_avatar: string;
  age: number;
  place: string;
  clan_id: string;
}

export default function ClansScreen() {
  const router = useRouter();

  const [clans, setClans] = useState<Clan[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<string, ClanPlayer[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchClansData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch clans
      const { data: clansData, error: clansError } = await supabase
        .from('clans')
        .select('*')
        .order('created_at', { ascending: false });

      if (clansError) throw clansError;

      // 2. Fetch clan players
      const { data: playersData, error: playersError } = await supabase
        .from('clan_players')
        .select('*')
        .order('created_at', { ascending: false });

      if (playersError) throw playersError;

      // 3. Group players by clan ID
      const groupedPlayers: Record<string, ClanPlayer[]> = {};
      playersData?.forEach((player) => {
        if (!groupedPlayers[player.clan_id]) {
          groupedPlayers[player.clan_id] = [];
        }
        groupedPlayers[player.clan_id].push(player);
      });

      if (clansData) setClans(clansData);
      setPlayersMap(groupedPlayers);
    } catch (err) {
      console.error('Error fetching clans:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClansData();
  }, [fetchClansData]);

  // Search filter
  const filteredClans = useMemo(() => {
    if (!searchQuery.trim()) return clans;
    const query = searchQuery.toLowerCase().trim();
    return clans.filter((clan) => clan.clan_name?.toLowerCase().includes(query));
  }, [clans, searchQuery]);

  // Handler for External Web Linking
  const handleOpenRegisterPage = useCallback(() => {
    Linking.openURL(REGISTER_URL).catch((err) =>
      console.error('Failed to open URL:', err)
    );
  }, []);

  const renderItem = useCallback(
    ({ item: clan, index }: { item: Clan; index: number }) => {
      const clanPlayers = playersMap[clan.id] || [];
      const formattedDate = clan.created_at
        ? new Date(clan.created_at).toLocaleDateString()
        : 'Unknown';

      return (
        <Animated.View entering={FadeInDown.delay(Math.min(index * 20, 200)).duration(200)}>
          <View style={styles.card}>
            {/* Card Header & Avatar */}
            <View style={styles.cardHeader}>
              <View style={styles.avatarContainer}>
                {clan.clan_avatar ? (
                  <Image source={{ uri: clan.clan_avatar }} style={styles.clanAvatar} />
                ) : (
                  <View style={[styles.clanAvatar, styles.avatarPlaceholder]}>
                    <Ionicons name="shield-outline" size={24} color="#64748B" />
                  </View>
                )}
                <View
                  style={[
                    styles.badge,
                    clan.is_verified ? styles.verifiedBadge : styles.unverifiedBadge,
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {clan.is_verified ? 'VERIFIED' : 'UNVERIFIED'}
                  </Text>
                </View>
              </View>

              <View style={styles.clanInfo}>
                <Text numberOfLines={1} style={styles.clanTitle}>
                  {clan.clan_name}
                </Text>
                <Text style={styles.createdText}>Created: {formattedDate}</Text>
              </View>
            </View>

            {/* Roster Section */}
            <View style={styles.rosterSection}>
              <Text style={styles.rosterTitle}>
                ROSTER ({clanPlayers.length} {clanPlayers.length === 1 ? 'MEMBER' : 'MEMBERS'})
              </Text>

              {clanPlayers.length > 0 ? (
                <View style={styles.playerList}>
                  {clanPlayers.slice(0, 3).map((player) => (
                    <View key={player.id} style={styles.playerRow}>
                      {player.player_avatar ? (
                        <Image source={{ uri: player.player_avatar }} style={styles.playerAvatar} />
                      ) : (
                        <View style={[styles.playerAvatar, styles.avatarPlaceholder]}>
                          <Ionicons name="person" size={10} color="#64748B" />
                        </View>
                      )}
                      <Text style={styles.playerName} numberOfLines={1}>
                        {player.name}
                      </Text>
                    </View>
                  ))}

                  {clanPlayers.length > 3 && (
                    <Text style={styles.morePlayersText}>
                      +{clanPlayers.length - 3} more member(s)
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.emptyRosterText}>No players registered in this clan yet.</Text>
              )}
            </View>

            {/* Action CTA */}
            <Pressable
              style={({ pressed }) => [styles.joinButton, pressed && styles.pressedState]}
              onPress={handleOpenRegisterPage}
            >
              <Text style={styles.joinButtonText}>Register / Join Clan</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </Animated.View>
      );
    },
    [playersMap, handleOpenRegisterPage]
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
              <Text style={styles.headerSubtitle}>Registered Clans</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.refreshBtn, pressed && styles.pressedState]}
              onPress={fetchClansData}
              disabled={loading}
            >
              <Ionicons name="reload" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Search Bar & Action Header */}
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clans by name..."
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

      {/* Content Area */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {/* Create Clan Banner Card */}
          <View style={styles.bannerWrapper}>
            <LinearGradient
              colors={['#EFF6FF', '#F3E8FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bannerCard}
            >
              <View style={styles.bannerHeader}>
                <Ionicons name="shield-checkmark" size={20} color="#2563EB" />
                <Text style={styles.bannerTitle}>Official Clan Portal</Text>
              </View>
              <Text style={styles.bannerNoticeText}>
                Avoid unverified clans. Only verified clans guarantee official event participation.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.createClanBtn, pressed && styles.pressedState]}
                onPress={handleOpenRegisterPage}
              >
                <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.createClanBtnText}>Create New Clan</Text>
              </Pressable>
            </LinearGradient>
          </View>

          {/* Clans List */}
          {filteredClans.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No clans match your search.' : 'No registered clans available.'}
              </Text>
            </View>
          ) : (
            <FlashList
              data={filteredClans}
              estimatedItemSize={180}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listPadding}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
            />
          )}
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
  bannerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  bannerCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
    textTransform: 'uppercase',
  },
  bannerNoticeText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 12,
  },
  createClanBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createClanBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  listPadding: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  /* Clan Cards */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  clanAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  verifiedBadge: {
    backgroundColor: '#16A34A',
  },
  unverifiedBadge: {
    backgroundColor: '#64748B',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  clanInfo: {
    flex: 1,
  },
  clanTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  createdText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  rosterSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  rosterTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  playerList: {
    gap: 4,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  playerName: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '500',
  },
  morePlayersText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 2,
  },
  emptyRosterText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  joinButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pressedState: {
    opacity: 0.7,
  },
});