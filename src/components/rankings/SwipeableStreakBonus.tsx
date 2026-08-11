import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export function SwipeableStreakBonus() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        translateX.value = withTiming(
          event.translationX > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH,
          {},
          () => {
            runOnJS(setDismissed)(true);
          }
        );
      } else {
        translateX.value = withTiming(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: withTiming(1 - Math.abs(translateX.value) / SCREEN_WIDTH),
  }));

  if (dismissed) return null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.streakBanner, animatedStyle]}>
        <View style={styles.streakIcon}>
          <Ionicons name="gift" size={28} color="#5B7CFF" />
        </View>
        <View style={styles.streakTextContainer}>
          <ThemedText style={styles.streakTitle}>Daily Streak Bonus</ThemedText>
          <ThemedText style={styles.streakSubtitle}>
            Check in and earn 20 points
          </ThemedText>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.streakButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push('/streak')}
        >
          <ThemedText style={styles.streakButtonText}>View Details</ThemedText>
          <Ionicons name="chevron-forward" size={14} color="#5B7CFF" />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  streakBanner: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 16,
  },
  streakIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakTextContainer: {
    flex: 1,
  },
  streakTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  streakSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  streakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  streakButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5B7CFF',
  },
  pressed: {
    opacity: 0.7,
  },
});