import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  profile_pic: string | null;
}

export interface FriendlyRequest {
  id: string;
  requester_id: string;
  opponent_id?: string | null;
  amount: number;
  status: string;
  created_at: string;
  requester?: Profile;
  opponent?: Profile;
}

interface OpenChallengesTabProps {
  loading: boolean;
  refreshing: boolean;
  requests: FriendlyRequest[];
  onRefresh: () => void;
}

export default function OpenChallengesTab({
  loading,
  refreshing,
  requests,
  onRefresh,
}: OpenChallengesTabProps) {
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const handleNavigateToProfile = (profileId?: string) => {
    if (profileId) {
      router.push(`/profile/${profileId}` as any);
    }
  };

  const handleAcceptChallenge = async (item: FriendlyRequest) => {
    try {
      setAcceptingId(item.id);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Sign In Required', 'You must be signed in to accept a challenge.', [
          {
            text: 'Sign In',
            onPress: () => router.push('/(auth)/sign-in' as any),
          },
          { text: 'Cancel', style: 'cancel' },
        ]);
        return;
      }

      if (user.id === item.requester_id) {
        Alert.alert('Action Not Allowed', "You can't accept your own challenge!");
        return;
      }

      const { error } = await supabase
        .from('friendly_match_requests')
        .update({
          opponent_id: user.id,
          status: 'accepted',
        })
        .eq('id', item.id);

      if (error) throw error;

      Alert.alert('Success', 'Challenge accepted! Get ready for the match.');
      onRefresh();
    } catch (err: any) {
      console.error('Error accepting challenge:', err);
      Alert.alert('Error', err.message || 'Failed to accept challenge.');
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <FlatList
      data={requests}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>No open challenges available right now.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const isAccepting = acceptingId === item.id;
        const prizePool = item.amount * 2;

        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Pressable
                onPress={() => handleNavigateToProfile(item.requester?.id)}
                style={({ pressed }) => [
                  styles.profileInfoGroup,
                  pressed && styles.pressed,
                ]}
              >
                <Image
                  source={{ uri: item.requester?.profile_pic || undefined }}
                  style={styles.avatar}
                />

                <View style={styles.nameContainer}>
                  <Text style={styles.requesterName} numberOfLines={1}>
                    {item.requester?.display_name ||
                      item.requester?.username ||
                      'Player'}
                  </Text>
                  {item.requester?.username && (
                    <Text style={styles.username} numberOfLines={1}>
                      @{item.requester.username}
                    </Text>
                  )}
                </View>
              </Pressable>
            </View>

            <Text style={styles.amountText}>Amount: KES {item.amount}</Text>
            <Text style={styles.winningsText}>Winner gets: KES {prizePool}</Text>
            <Text style={styles.dateText}>
              Created: {new Date(item.created_at).toLocaleDateString()}
            </Text>

            <TouchableOpacity
              style={[styles.acceptBtn, isAccepting && styles.btnDisabled]}
              onPress={() => handleAcceptChallenge(item)}
              disabled={isAccepting}
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.acceptBtnText}>Accept Challenge</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
  },
  nameContainer: {
    flex: 1,
  },
  requesterName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  username: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 1,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16A34A',
    marginBottom: 2,
  },
  winningsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
    marginBottom: 6,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 10,
  },
  acceptBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});