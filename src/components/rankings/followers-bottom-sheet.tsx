// components/rankings/followers-bottom-sheet.tsx
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

export interface FollowerProfile {
  id: string;
  username: string;
  display_name: string;
  profile_pic: string | null;
}

interface FollowersBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  tournamentName?: string;
  followers: FollowerProfile[];
}

export function FollowersBottomSheet({
  visible,
  onClose,
  tournamentName,
  followers,
}: FollowersBottomSheetProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handlePressUser = (userId: string) => {
    onClose();
    router.push({ pathname: '/profile/[id]', params: { id: userId } });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}
          onPress={() => {}}
        >
          <View style={styles.dragHandle} />

          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Followers</ThemedText>
            {tournamentName ? (
              <ThemedText style={styles.modalSubTitle} numberOfLines={1}>
                {tournamentName}
              </ThemedText>
            ) : null}
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.followersScrollList,
              { paddingBottom: Math.max(insets.bottom, 24) + 12 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {followers.map((follower) => {
              const name = follower.display_name || follower.username || 'Follower';
              const avatar =
                follower.profile_pic ||
                `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`;

              return (
                <Pressable
                  key={follower.id}
                  style={styles.followerListItem}
                  onPress={() => handlePressUser(follower.id)}
                >
                  <Image source={{ uri: avatar }} style={styles.circularAvatar} />
                  <View style={styles.followerTextInfo}>
                    <ThemedText style={styles.followerName} numberOfLines={1}>
                      {name}
                    </ThemedText>
                    {follower.username ? (
                      <ThemedText style={styles.followerUsername} numberOfLines={1}>
                        @{follower.username}
                      </ThemedText>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  followersScrollList: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  followerListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  circularAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  followerTextInfo: {
    flex: 1,
  },
  followerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  followerUsername: {
    fontSize: 12,
    color: '#94A3B8',
  },
});