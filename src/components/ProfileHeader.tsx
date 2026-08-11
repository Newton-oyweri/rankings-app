import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ProfileHeaderProps {
  username?: string;
  loading: boolean;
  onBack: () => void;
  onRefresh: () => void;
}

export function ProfileHeader({
  username,
  loading,
  onBack,
  onRefresh,
}: ProfileHeaderProps) {
  return (
    <LinearGradient
      colors={['#1E3A8A', '#2563EB', '#7C3AED']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerGradient}
    >
      <SafeAreaView edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressedState]}
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>

          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>PLAYER PROFILE</Text>
            {username && (
              <Text style={styles.headerSubtitle}>@{username}</Text>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressedState]}
            onPress={onRefresh}
            disabled={loading}
          >
            <Ionicons name="reload" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingBottom: 14,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#E0E7FF',
    fontWeight: '500',
    marginTop: 1,
  },
  pressedState: {
    opacity: 0.8,
  },
});