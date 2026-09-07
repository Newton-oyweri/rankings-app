import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export function Header() {
  const isNavigating = useRef(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
      setIsLoggedIn(!!user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
      setIsLoggedIn(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigateSafely = (path: string) => {
    if (isNavigating.current) return;
    isNavigating.current = true;

    if (!isLoggedIn) {
      router.push('/(auth)/sign-in');
    } else {
      router.push(path as any);
    }

    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  };

  const handleOpenStreak = () => navigateSafely('/streak');
  const handleOpenSearch = () => navigateSafely('/searchprofiles');
  const handleOpenAddTeam = () => navigateSafely('/Addteam');
  const handleOpenNotifications = () => navigateSafely('/notifications');

  return (
    <View style={styles.header}>
      {/* Title & Subtitle */}
      <View style={styles.titleContainer}>
        <ThemedText style={styles.headerTitle}>RANKINGS</ThemedText>
        <ThemedText style={styles.headerSubtitle} numberOfLines={1}>
          {userEmail ? userEmail : 'Predict • Challenge • Compete'}
        </ThemedText>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
      {/* wallet / Flame Button */}
      <Pressable
        style={({ pressed }) => [
          styles.streakButton,
          pressed && styles.pressed,
        ]}
        onPress={handleOpenStreak}
        hitSlop={8}
      >
        <View style={styles.streakBadge}>
          <Ionicons name="sparkles" size={10} color="#D97706" />
        </View>
        <Ionicons name="wallet-outline" size={18} color="#F59E0B" />
      </Pressable>

        {/* Search Profiles */}
        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
          onPress={handleOpenSearch}
          hitSlop={8}
        >
          <Ionicons name="search-outline" size={18} color="#2563EB" />
        </Pressable>

        {/* Add Team / Create Challenge (+) */}
        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
          onPress={handleOpenAddTeam}
          hitSlop={8}
        >
          <Ionicons name="add-outline" size={22} color="#1E293B" />
        </Pressable>

        {/* Notifications */}
        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
          onPress={handleOpenNotifications}
          hitSlop={8}
        >
          <Ionicons name="notifications-outline" size={19} color="#1E293B" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: 10,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#0F172A',
    lineHeight: 22,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  /* Streak / Flame pill */
  streakButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  streakBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },

  /* Standard circular icon buttons */
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },

  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
});