import { Session } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityItem} from '@/components/profile/ActivityItem';
import { MyGamesSection } from '@/components/profile/MyGamesSection';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { QuickStatsRow } from '@/components/profile/QuickStatsRow';
import { UserProfileCard } from '@/components/profile/UserProfileCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  mockAchievements,
  mockActivities,
  mockGames,
  mockQuickStats,
  mockUserProfile,
} from '@/data/mock-profile';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('Recent Activity');
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Listen for auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    } catch (err) {
      console.error('Error refreshing profile session:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const bottomInset = safeAreaInsets.bottom + BottomTabInset + Spacing.three;

  const scrollContentStyle = Platform.select({
    android: {
      paddingLeft: safeAreaInsets.left,
      paddingRight: safeAreaInsets.right,
      paddingBottom: bottomInset,
    },
    web: {
      paddingBottom: Spacing.four,
    },
  });

  // 2. Loading state fallback
  if (loading) {
    return (
      <ThemedView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </ThemedView>
    );
  }

  // 3. Unauthenticated State (Centered Box)
  if (!session) {
    return (
      <ThemedView style={styles.rootContainer}>
        <ProfileHeader />
        <View style={styles.centeredContainer}>
          <View style={styles.unauthCard}>
            <ThemedText type="title" style={styles.unauthTitle}>
              You're not logged in
            </ThemedText>
            <ThemedText style={styles.unauthSubtitle}>
              Sign in or create an account to view your profile, track stats, and save predictions.
            </ThemedText>

            <Pressable
              style={({ pressed }) => [
                styles.signInButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push('/(auth)/sign-in')}
            >
              <ThemedText style={styles.signInButtonText}>Sign In / Register</ThemedText>
            </Pressable>
          </View>
        </View>
      </ThemedView>
    );
  }

  // 4. Authenticated State (Full Profile Screen)
  return (
    <ThemedView style={styles.rootContainer}>
      {/* Static Header */}
      <ProfileHeader />

      {/* Scrollable Body */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, scrollContentStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1E40AF"
            colors={['#1E40AF']}
          />
        }
      >
        <View style={styles.container}>
<UserProfileCard userId={session.user.id} profile={mockUserProfile} />
          <QuickStatsRow userId={session.user.id} />
          <MyGamesSection/>
          <ActivityItem userId={session.user.id} />
         
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  unauthCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  unauthTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  unauthSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  signInButton: {
    backgroundColor: '#1E40AF',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  activityList: {
    gap: 10,
    marginBottom: 20,
  },
  bottomSection: {
    gap: 16,
  },
});