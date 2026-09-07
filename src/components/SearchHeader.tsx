import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SearchHeaderProps {
  title?: string;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  placeholder?: string;
}

export function SearchHeader({
  title = 'Find Profiles',
  searchQuery,
  onSearchChange,
  placeholder = 'Search by name, username, county...',
}: SearchHeaderProps) {
  const [isFocused, setIsFocused] = useState(false);

  // Reanimated Shared Values
  const backBtnScale = useSharedValue(1);
  const searchContainerScale = useSharedValue(1);
  const focusProgress = useSharedValue(0);
  const clearBtnScale = useSharedValue(searchQuery.length > 0 ? 1 : 0);

  // Handle Back Button Press with Tactile Haptics
  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Focus / Blur Animations
  const handleFocus = () => {
    setIsFocused(true);
    Haptics.selectionAsync();
    focusProgress.value = withTiming(1, { duration: 250 });
    searchContainerScale.value = withSpring(1.02, { damping: 15, stiffness: 300 });
  };

  const handleBlur = () => {
    setIsFocused(false);
    focusProgress.value = withTiming(0, { duration: 200 });
    searchContainerScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  // Text change handler with subtle haptic on clear
  const handleTextChange = (text: string) => {
    if (text.length > 0 && searchQuery.length === 0) {
      clearBtnScale.value = withSpring(1, { damping: 12 });
    } else if (text.length === 0 && searchQuery.length > 0) {
      clearBtnScale.value = withTiming(0, { duration: 150 });
    }
    onSearchChange(text);
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearBtnScale.value = withTiming(0, { duration: 150 });
    onSearchChange('');
  };

  // Animated Styles
  const backBtnAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backBtnScale.value }],
  }));

  const searchContainerAnimatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusProgress.value,
      [0, 1],
      ['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 1)']
    );

    return {
      transform: [{ scale: searchContainerScale.value }],
      borderColor,
    };
  });

  const clearBtnAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: clearBtnScale.value }],
    opacity: clearBtnScale.value,
  }));

  return (
    <LinearGradient
      colors={['#0F172A', '#1E3A8A', '#2563EB']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerGradient}
    >
      {/* Decorative Gradient Glow Bubbles */}
      <View style={styles.glowBubble1} />
      <View style={styles.glowBubble2} />

      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        {/* Top Header Row */}
        <View style={styles.headerTopRow}>
          <AnimatedPressable
            style={[styles.backBtn, backBtnAnimatedStyle]}
            onPress={handleBackPress}
            onPressIn={() => {
              backBtnScale.value = withSpring(0.9, { damping: 12 });
            }}
            onPressOut={() => {
              backBtnScale.value = withSpring(1, { damping: 12 });
            }}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color="#1E3A8A" />
          </AnimatedPressable>

          <Text style={styles.headerTitle}>{title}</Text>

          <View style={{ width: 36 }} />
        </View>

        {/* Dynamic Search Input Card */}
        <Animated.View style={[styles.searchContainer, searchContainerAnimatedStyle]}>
          <Ionicons
            name={isFocused ? 'search-sharp' : 'search-outline'}
            size={18}
            color={isFocused ? '#2563EB' : '#64748B'}
            style={styles.searchIcon}
          />
          
          <TextInput
            style={styles.searchInput}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={handleTextChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <AnimatedPressable
            style={clearBtnAnimatedStyle}
            onPress={handleClear}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </AnimatedPressable>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingBottom: 16,
    overflow: 'hidden',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  glowBubble1: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
  },
  glowBubble2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(147, 197, 253, 0.15)',
  },
  headerSafeArea: {
    paddingHorizontal: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
});