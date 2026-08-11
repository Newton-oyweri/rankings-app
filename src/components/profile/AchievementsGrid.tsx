import { router } from 'expo-router';
import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Achievement } from '@/types/profile';

interface AchievementsGridProps {
  achievements: Achievement[];
  onViewAll?: () => void;
}

export function AchievementsGrid({ achievements, onViewAll }: AchievementsGridProps) {
  const isNavigating = useRef(false);

  const handleViewAll = () => {
    // 1. Lock execution to prevent double-tap duplicate screens
    if (isNavigating.current) return;
    isNavigating.current = true;

    // 2. Execute custom handler if passed, otherwise default to router.push
    if (onViewAll) {
      onViewAll();
    } else {
      router.push('/achievements');
    }

    // 3. Reset lock after transition completes
    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  };

  return (
    <View style={styles.achievementsCard}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Achievements</ThemedText>
        <Pressable
          onPress={handleViewAll}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ThemedText style={styles.viewAll}>View all</ThemedText>
        </Pressable>
      </View>

      <View style={styles.achievementsGrid}>
        {achievements.map((item) => (
          <View key={item.id} style={styles.achievementItem}>
            <View
              style={[
                styles.achievementIcon,
                item.isCompleted ? styles.achievementCompleted : styles.achievementLocked,
              ]}
            >
              <ThemedText style={styles.achievementEmoji}>{item.icon}</ThemedText>
            </View>
            <ThemedText style={styles.achievementTitle}>{item.title}</ThemedText>
            <ThemedText style={styles.achievementDesc}>{item.description}</ThemedText>
            {item.isCompleted ? (
              <ThemedText style={styles.completedText}>✓ Completed</ThemedText>
            ) : (
              <ThemedText style={styles.progressText}>{item.progressText}</ThemedText>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  achievementsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  viewAll: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementItem: {
    width: '47%',
    alignItems: 'center',
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  achievementCompleted: {
    backgroundColor: '#EEF2FF',
  },
  achievementLocked: {
    backgroundColor: '#F1F5F9',
  },
  achievementEmoji: {
    fontSize: 22,
  },
  achievementTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  achievementDesc: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  completedText: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 4,
  },
  progressText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
});