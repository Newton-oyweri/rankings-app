import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface HeaderProps {
  notificationCount?: number;
}

export function Header({ notificationCount = 3 }: HeaderProps) {
  const isNavigating = useRef(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch current user on mount
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
      }
    });

    // 2. Listen for auth state changes (e.g. sign in/out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleOpenNotifications = () => {
    if (isNavigating.current) return;
    isNavigating.current = true;

    router.push('/notifications');

    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  };

  return (
    <View style={styles.header}>
      <View>
        <ThemedText style={styles.headerTitle}>RANKINGS</ThemedText>
        <ThemedText style={styles.headerSubtitle} numberOfLines={1}>
          {userEmail ? userEmail : 'Predict • Challenge • Compete'}
        </ThemedText>
      </View>
      <Pressable
        style={styles.bellButton}
        onPress={handleOpenNotifications}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="notifications-outline" size={20} color="#1a1a2e" />
        {notificationCount > 0 && (
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>{notificationCount}</ThemedText>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#1a1a2e',
    lineHeight: 22,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 0,
  },
  bellButton: {
    position: 'relative',
    padding: 6,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});