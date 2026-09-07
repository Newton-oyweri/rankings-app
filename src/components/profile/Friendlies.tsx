import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

export interface FriendlyMatchItem {
  id: string;
  requester_id: string;
  opponent_id: string;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  created_at: string;
  requester?: {
    username: string;
    display_name: string;
    profile_pic?: string | null;
  };
  opponent?: {
    username: string;
    display_name: string;
    profile_pic?: string | null;
  };
}

interface AvailableFriendliesProps {
  currentUserId?: string;
  onAcceptChallenge?: (match: FriendlyMatchItem) => void;
  onViewChallenge?: (match: FriendlyMatchItem) => void;
}

export function AvailableFriendliesList({
  currentUserId,
  onAcceptChallenge,
  onViewChallenge,
}: AvailableFriendliesProps) {
  const router = useRouter();
  const [matches, setMatches] = useState<FriendlyMatchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAvailableFriendlies();

    // Realtime subscription for incoming pending match requests
    const channel = supabase
      .channel('public:friendly_match_requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendly_match_requests' },
        () => {
          fetchAvailableFriendlies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const fetchAvailableFriendlies = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('friendly_match_requests')
        .select(`
          id,
          requester_id,
          opponent_id,
          amount,
          status,
          created_at,
          requester:profiles!friendly_match_requests_requester_fkey(username, display_name, profile_pic),
          opponent:profiles!friendly_match_requests_opponent_fkey(username, display_name, profile_pic)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching friendly matches:', error);
        return;
      }

      if (data) {
        setMatches(data as unknown as FriendlyMatchItem[]);
      }
    } catch (err) {
      console.error('Unexpected error fetching friendlies:', err);
    } finally {
      setLoading(false);
    }
  };

  const navigateToFriendlies = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      router.push('/friendlies' as any);
    } else {
      Alert.alert('Sign In Required', 'Please sign in to view and create friendly matches.', [
        { text: 'Sign In', onPress: () => router.push('/(auth)/sign-in' as any) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const renderMatchCard = ({ item }: { item: FriendlyMatchItem }) => {
    const winnerAmount = item.amount * 2;

    const requesterName = item.requester?.display_name || item.requester?.username || 'Player 1';
    const opponentName = item.opponent?.display_name || item.opponent?.username || 'Open Challenge';

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.95 }]}
        onPress={navigateToFriendlies}
      >
        {/* Matchup Layout (Sports Matchup Style) */}
        <View style={styles.versusContainer}>
          {/* Home Player / Requester */}
          <View style={styles.playerColumn}>
            <Image
              source={{ uri: item.requester?.profile_pic || undefined }}
              style={styles.avatar}
            />
            <ThemedText style={styles.playerName} numberOfLines={1}>
              {requesterName}
            </ThemedText>
          </View>

          {/* Center VS Badge */}
          <View style={styles.vsBadgeContainer}>
            <View style={styles.vsBadge}>
              <ThemedText style={styles.vsBadgeText}>VS</ThemedText>
            </View>
          </View>

          {/* Away Player / Opponent */}
          <View style={styles.playerColumn}>
            <Image
              source={{ uri: item.opponent?.profile_pic || undefined }}
              style={styles.avatar}
            />
            <ThemedText style={styles.playerName} numberOfLines={1}>
              {opponentName}
            </ThemedText>
          </View>
        </View>

        {/* Stake and Prize Information */}
        <View style={styles.footer}>
          <View style={styles.prizeContainer}>
            <ThemedText style={styles.stakeLabel}>To challenge me: KES {item.amount}</ThemedText>
            <ThemedText style={styles.prizeValue}>
              Winner gets: KES {winnerAmount.toLocaleString()}
            </ThemedText>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View>
          <ThemedText style={styles.sectionTitle}>Friendly Matches</ThemedText>
          <ThemedText style={styles.subtitle}>Active challenges & open stakes</ThemedText>
        </View>

        <Pressable
          style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.7 }]}
          onPress={navigateToFriendlies}
          hitSlop={10}
        >
          <ThemedText style={styles.headerLink}>More Friendlies</ThemedText>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={16}
            tintColor="#2563EB"
          />
        </Pressable>
      </View>

      {/* List / Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2563EB" />
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>No active friendly challenges right now.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatchCard}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listPadding}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  headerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
  },
  listPadding: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    width: 240,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  versusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  playerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    marginBottom: 6,
  },
  playerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  vsBadgeContainer: {
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  vsBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  prizeContainer: {
    alignItems: 'center',
  },
  stakeLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  prizeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16A34A',
    marginTop: 2,
  },
});