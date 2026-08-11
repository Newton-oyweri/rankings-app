import { Session } from '@supabase/supabase-js';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, View, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { SwipeableStreakBonus } from '@/components/rankings/SwipeableStreakBonus';
import { supabase } from '@/lib/supabase';
import { shouldHandleAuthUrl } from '@/lib/authRedirectGuard';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const [session, setSession] = useState<Session | null>(null);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);

  const checkTodayStatus = useCallback(async (userId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('check_ins')
        .select('id')
        .eq('user_id', userId)
        .eq('check_in_date', today)
        .maybeSingle();

      if (error) {
        console.error('[layout] check-in status error:', error.message);
        return;
      }

      setHasCheckedInToday(!!data);
    } catch (err) {
      console.error('[layout] checkTodayStatus error:', err);
    }
  }, []);

  const handleDeepLink = async (url: string | null) => {
    console.log('[layout] handleDeepLink raw url:', url);
    if (!url) return;
    if (!shouldHandleAuthUrl(url)) {
      console.log('[layout] skipped — already handled elsewhere');
      return;
    }

    const { queryParams } = Linking.parse(url);
    console.log('[layout] parsed queryParams:', queryParams);

    if (queryParams?.access_token && queryParams?.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: String(queryParams.access_token),
        refresh_token: String(queryParams.refresh_token),
      });
      if (error) console.log('[layout] setSession error:', error.message);
      else console.log('[layout] setSession SUCCESS');
    } else {
      console.log('[layout] no tokens found in queryParams — this is likely the real bug');
    }
  };

  // Fetch session, listen to Auth state, and handle incoming deep links
  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        checkTodayStatus(session.user.id);
      }
    });

    // 2. Listen to Auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) {
        checkTodayStatus(session.user.id);
      } else {
        setHasCheckedInToday(false);
      }
    });

    // 3. Process initial deep link if app opened via URL scheme
    Linking.getInitialURL().then(handleDeepLink);

    // 4. Listen for deep links while app is open/in background
    const linkSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, [checkTodayStatus]);

  // Re-check when app comes back to foreground (e.g. after midnight or after check-in elsewhere)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && session?.user?.id) {
        checkTodayStatus(session.user.id);
      }
    });
    return () => sub.remove();
  }, [session?.user?.id, checkTodayStatus]);

  // Optional: listen for realtime inserts so the card hides immediately after check-in
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel('check_ins_layout')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'check_ins',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          setHasCheckedInToday(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

        <AnimatedSplashOverlay />

        {/* Root Stack */}
        <Stack screenOptions={{ headerShown: false }}>
          {/* Main App Tabs */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* Auth Screen Group */}
          <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />

          {/* Drill-down Pages */}
          <Stack.Screen name="streak" options={{ title: 'Streak Details' }} />
          <Stack.Screen name="leaderboard" options={{ title: 'Global Leaderboard' }} />
          <Stack.Screen name="matches" options={{ title: 'All Matches' }} />
          <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
          <Stack.Screen name="achievements" options={{ title: 'Achievements' }} />
          <Stack.Screen name="my-games" options={{ title: 'My Predictions & Games' }} />
        </Stack>

        {/* Global Floating Streak Banner — only when logged in AND not checked in today */}
        {session && !hasCheckedInToday && (
          <View
            pointerEvents="box-none"
            style={[styles.floatingOverlay, { bottom: insets.bottom + 65 }]}
          >
            <SwipeableStreakBonus />
          </View>
        )}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
});