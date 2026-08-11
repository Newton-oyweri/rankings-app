import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth } from '@/constants/theme';

export function ProfileHeader() {
  const safeAreaInsets = useSafeAreaInsets();
  const isNavigating = useRef(false);

  const handleOpenSettings = () => {
    if (isNavigating.current) return;
    isNavigating.current = true;

    router.push('/settings');

    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  };

  return (
    <View style={[styles.headerWrapper, { paddingTop: safeAreaInsets.top + 8 }]}>
      <View style={styles.headerInner}>
        <View>
          <ThemedText style={styles.headerTitle}>RANKINGS</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Predict • Challenge • Compete</ThemedText>
        </View>

        <Pressable
          style={styles.iconButton}
          onPress={handleOpenSettings}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <SymbolView
            name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
            size={20}
            tintColor="#1A1A2E"
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: '#F8F9FC',
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  headerInner: {
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});