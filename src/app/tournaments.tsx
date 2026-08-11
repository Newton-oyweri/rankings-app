import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { format, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FollowersBottomSheet, FollowerProfile } from '@/components/rankings/followers-bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface Tournament {
  id: number;
  name: string;
  tournament_avatar?: string | null;
  tournament_type?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  is_verified: boolean;
  status?: string | null;
  followers_count: number;
  is_followed: boolean;
  follower_previews: FollowerProfile[];
}

export default function AllTournamentsScreen() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followingIds, setFollowingIds] = useState<Record<number, boolean>>({});

  // Tournament Avatar Preview Modal State
  const [previewAvatar, setPreviewAvatar] = useState<{ uri: string; name: string } | null>(null);

  // Follower List Bottom Sheet State
  const [followerListModal, setFollowerListModal] = useState<{
    tournamentName: string;
    followers: FollowerProfile[];
  } | null>(null);

  const fetchTournaments = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          id,
          name,
          tournament_avatar,
          tournament_type,
          start_time,
          end_time,
          is_verified,
          status,
          tournament_followers(
            user_id,
            profiles(
              id,
              username,
              display_name,
              profile_pic
            )
          )
        `)
        .order('start_time', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Error fetching tournaments:', error);
        setTournaments([]);
        return;
      }

      const formatted: Tournament[] = (data || []).map((item: any) => {
        const rawFollowers = item.tournament_followers || [];
        const isFollowed = userId
          ? rawFollowers.some((f: any) => f.user_id === userId)
          : false;

        const followerProfiles: FollowerProfile[] = rawFollowers
          .map((f: any) => f.profiles)
          .filter(Boolean);

        return {
          id: item.id,
          name: item.name,
          tournament_avatar: item.tournament_avatar,
          tournament_type: item.tournament_type?.replace(/_/g, ' '),
          start_time: item.start_time,
          end_time: item.end_time,
          is_verified: item.is_verified,
          status: item.status,
          followers_count: rawFollowers.length,
          is_followed: isFollowed,
          follower_previews: followerProfiles,
        };
      });

      setTournaments(formatted);
    } catch (err) {
      console.error('Unexpected error fetching tournaments:', err);
      setTournaments([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchTournaments().finally(() => setLoading(false));
  }, [fetchTournaments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTournaments();
    setRefreshing(false);
  }, [fetchTournaments]);

  const toggleFollow = async (tournamentId: number, currentlyFollowed: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.push('/(auth)/sign-in');
      return;
    }

    const userId = session.user.id;

    // Optimistic mutation
    setTournaments((prev) =>
      prev.map((t) => {
        if (t.id === tournamentId) {
          const nextState = !currentlyFollowed;
          return {
            ...t,
            is_followed: nextState,
            followers_count: nextState ? t.followers_count + 1 : Math.max(0, t.followers_count - 1),
          };
        }
        return t;
      })
    );

    setFollowingIds((prev) => ({ ...prev, [tournamentId]: true }));

    try {
      if (currentlyFollowed) {
        const { error } = await supabase
          .from('tournament_followers')
          .delete()
          .eq('tournament_id', tournamentId)
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tournament_followers')
          .insert({ tournament_id: tournamentId, user_id: userId });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      fetchTournaments();
    } finally {
      setFollowingIds((prev) => ({ ...prev, [tournamentId]: false }));
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'TBA';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return 'TBA';
    }
  };

  const filteredTournaments = tournaments.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.tournament_type && t.tournament_type.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openAvatarPreview = (uri: string, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreviewAvatar({ uri, name });
  };

  const openFollowerList = (tournamentName: string, followers: FollowerProfile[]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFollowerListModal({ tournamentName, followers });
  };

  const renderTournamentCard = ({ item }: { item: Tournament }) => {
    const isUpdating = followingIds[item.id];
    const avatarUri =
      item.tournament_avatar && item.tournament_avatar.trim() !== ''
        ? item.tournament_avatar
        : `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(item.name)}`;

    const previews = item.follower_previews || [];
    const displayedPreviews = previews.slice(0, 3);

    return (
      <View style={styles.card}>
        {/* Tapping Tournament Icon opens image preview modal */}
        <Pressable onPress={() => openAvatarPreview(avatarUri, item.name)} hitSlop={4}>
          <Image
            source={{ uri: avatarUri }}
            style={styles.logo}
            contentFit="cover"
            transition={200}
          />
        </Pressable>

        <View style={styles.detailsContainer}>
          <View style={styles.titleRow}>
            <ThemedText style={styles.tournamentName} numberOfLines={1}>
              {item.name}
            </ThemedText>
          </View>

          <ThemedText style={styles.gameTitle}>
            {item.tournament_type ? item.tournament_type.toUpperCase() : 'TOURNAMENT'}
          </ThemedText>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={12} color="#64748B" />
            <ThemedText style={styles.dateText}>
              {formatDate(item.start_time)} - {formatDate(item.end_time)}
            </ThemedText>
          </View>

          {/* Tapping Followers Row opens the separate Followers Bottom Sheet */}
          <Pressable
            style={styles.followersRow}
            onPress={() => previews.length > 0 && openFollowerList(item.name, previews)}
          >
            {displayedPreviews.length > 0 && (
              <View style={styles.avatarStack}>
                {displayedPreviews.map((follower, index) => {
                  const followerName =
                    follower.display_name || follower.username || 'Follower';
                  const followerAvatarUri =
                    follower.profile_pic ||
                    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(followerName)}`;

                  return (
                    <Image
                      key={follower.id || index}
                      source={{ uri: followerAvatarUri }}
                      style={[styles.stackAvatar, { left: index * -8 }]}
                      contentFit="cover"
                    />
                  );
                })}
              </View>
            )}

            <ThemedText style={styles.followersText}>
              {item.followers_count} {item.followers_count === 1 ? 'follower' : 'followers'}
            </ThemedText>
          </Pressable>
        </View>

        {/* Follow Button */}
        <Pressable
          disabled={isUpdating}
          style={[
            styles.followButton,
            item.is_followed && styles.followingButton,
            isUpdating && styles.disabledButton,
          ]}
          onPress={() => toggleFollow(item.id, item.is_followed)}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color={item.is_followed ? '#1E40AF' : '#FFFFFF'} />
          ) : (
            <ThemedText
              style={[
                styles.followButtonText,
                item.is_followed && styles.followingButtonText,
              ]}
            >
              {item.is_followed ? 'Following' : 'Follow'}
            </ThemedText>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Title Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Tournaments
          </ThemedText>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tournament or format..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* FlashList Body */}
        {loading ? (
          <ActivityIndicator size="small" color="#1E40AF" style={styles.loader} />
        ) : (
          <FlashList
            data={filteredTournaments}
            renderItem={renderTournamentCard}
            contentContainerStyle={styles.listPadding}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#1E40AF"
                colors={['#1E40AF']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="trophy-outline" size={32} color="#94A3B8" />
                <ThemedText style={styles.emptyText}>No tournaments found.</ThemedText>
              </View>
            }
          />
        )}
      </SafeAreaView>

      {/* 1. Tournament Avatar Preview Modal */}
      <Modal
        visible={!!previewAvatar}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewAvatar(null)}
      >
        <Pressable
          style={styles.previewBackdrop}
          onPress={() => setPreviewAvatar(null)}
        >
          <Pressable style={styles.previewCard} onPress={() => {}}>
            {previewAvatar && (
              <>
                <Image
                  source={{ uri: previewAvatar.uri }}
                  style={styles.previewImage}
                  contentFit="contain"
                  transition={150}
                />
                <ThemedText style={styles.previewName} numberOfLines={1}>
                  {previewAvatar.name}
                </ThemedText>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* 2. Imported Followers Bottom Sheet */}
      <FollowersBottomSheet
        visible={!!followerListModal}
        onClose={() => setFollowerListModal(null)}
        tournamentName={followerListModal?.tournamentName}
        followers={followerListModal?.followers || []}
      />
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
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  listPadding: {
    paddingHorizontal: Spacing.one,
    paddingBottom: 24,
  },
  loader: {
    marginVertical: 32,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginRight: 12,
  },
  detailsContainer: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  tournamentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  gameTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
  },
  followersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    marginRight: 4,
  },
  stackAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: '#E2E8F0',
  },
  followersText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  followButton: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  disabledButton: {
    opacity: 0.7,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#1E40AF',
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    maxWidth: 420,
    width: '100%',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  previewName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
});