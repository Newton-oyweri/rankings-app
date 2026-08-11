import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Session } from '@supabase/supabase-js';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { shouldHandleAuthUrl } from '@/lib/authRedirectGuard';

// Helper to safely parse auth parameters whether returned in hash (#) or query (?)
function extractAuthTokens(url: string) {
  const params: Record<string, string> = {};
  const match = url.match(/[?#](.*)/);
  if (!match) return params;

  const queryString = match[1];
  const pairs = queryString.split('&');

  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }

  return params;
}

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  // Check if session exists on screen load
  useEffect(() => {
    // 1. Get initial session state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCheckingSession(false);
    });

    // 2. Subscribe to auth changes (e.g. when web session completes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setCheckingSession(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Show an indicator while evaluating auth state to prevent UI flashing
  if (checkingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Redirect automatically to tabs if authenticated
  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  async function handleSignIn() {
    if (!email || !password) {
      Alert.alert('Required Fields', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      Alert.alert('Sign In Failed', error.message);
    }
    setLoading(false);
  }

  const handleCreateAccountWeb = async () => {
    try {
      const redirectUrl = Linking.createURL('(auth)/sign-in');

      const webAuthUrl = `https://efootballkenyaleague.website/auth?redirect_to=${encodeURIComponent(
        redirectUrl
      )}`;

      const result = await WebBrowser.openAuthSessionAsync(webAuthUrl, redirectUrl);

      if (result.type === 'success' && result.url) {
        if (!shouldHandleAuthUrl(result.url)) return;

        const tokens = extractAuthTokens(result.url);
        if (tokens.access_token && tokens.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: String(tokens.access_token),
            refresh_token: String(tokens.refresh_token),
          });

          if (error) {
            Alert.alert('Authentication Error', error.message);
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not launch web authentication.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <ThemedText style={styles.brandTitle}>RANKINGS</ThemedText>
          <ThemedText style={styles.brandSubtitle}>Predict • Challenge • Compete</ThemedText>
        </View>

        {/* Auth Card */}
        <View style={styles.card}>
          <ThemedText style={styles.title}>Sign In</ThemedText>
          <ThemedText style={styles.subtitle}>
            Use your eFootball Kenya League account credentials to sign in.
          </ThemedText>

          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <ThemedText style={styles.buttonText}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </ThemedText>
          </Pressable>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <ThemedText style={styles.dividerText}>OR</ThemedText>
            <View style={styles.dividerLine} />
          </View>

          {/* Web Redirect Login / Signup */}
          <Pressable style={styles.webAuthButton} onPress={handleCreateAccountWeb}>
            <ThemedText style={styles.webAuthButtonText}>
              Login / Register with eFootball Website
            </ThemedText>
          </Pressable>

          <ThemedText style={styles.redirectNote}>
            Note: You will be redirected to{' '}
            <ThemedText style={styles.redirectUrl}>efootballkenyaleague.website</ThemedText> and returned automatically upon logging in.
          </ThemedText>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#1a1a2e',
    lineHeight: 26,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#F8F9FC',
    color: '#1a1a2e',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  webAuthButton: {
    backgroundColor: '#0A1A44',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00B5AD',
  },
  webAuthButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  redirectNote: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
  redirectUrl: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});