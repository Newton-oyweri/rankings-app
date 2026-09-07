import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export interface ProfileItem {
  id: string;
  username: string;
  display_name: string;
  profile_pic: string | null;
  county?: string | null;
  role?: string;
  follower_count?: number;
  is_following?: boolean;
  rank?: number | null;
  loadingRank?: boolean;
}

interface ProfileCardProps {
  item: ProfileItem;
  onFollowToggle: (profile: ProfileItem) => void;
}

export function ProfileCard({ item, onFollowToggle }: ProfileCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/profile/${item.id}` as any)}
    >
      <Image
        source={{ uri: item.profile_pic || undefined }}
        style={styles.avatar}
      />

      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.displayName} numberOfLines={1}>
            {item.display_name || item.username}
          </Text>
          {item.role === 'admin' && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          )}
        </View>

        <Text style={styles.username} numberOfLines={1}>
          @{item.username}
        </Text>

        {item.county && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color="#2563EB" />
            <Text style={styles.locationText}>{item.county}</Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{item.follower_count || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>

          <View style={styles.statDot} />

          <View style={styles.statItem}>
            {item.loadingRank ? (
              <ActivityIndicator size="small" color="#2563EB" style={{ height: 16 }} />
            ) : (
              <Text style={styles.statNumber}>{item.rank ? `#${item.rank}` : '-'}</Text>
            )}
            <Text style={styles.statLabel}>Rank</Text>
          </View>
        </View>
      </View>

      {item.is_following ? (
        <Pressable
          style={styles.followingBtn}
          onPress={(e) => {
            e.stopPropagation();
            onFollowToggle(item);
          }}
        >
          <Ionicons name="checkmark" size={14} color="#2563EB" />
          <Text style={styles.followingBtnText}>Following</Text>
        </Pressable>
      ) : (
        <Pressable
          style={styles.followBtn}
          onPress={(e) => {
            e.stopPropagation();
            onFollowToggle(item);
          }}
        >
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.followGradient}
          >
            <Ionicons name="person-add" size={12} color="#FFFFFF" />
            <Text style={styles.followBtnText}>Follow</Text>
          </LinearGradient>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E3A8A',
    maxWidth: 140,
  },
  adminBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  username: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
  },
  followBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  followGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  followBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  followingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  followingBtnText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '600',
  },
});