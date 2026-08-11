import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

const TABS = ['Recent Activity', 'Prediction History', 'Achievements', 'Challenges'];

interface ProfileTabsProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export function ProfileTabs({ activeTab, onSelectTab }: ProfileTabsProps) {
  return (
    <View style={styles.tabs}>
      {TABS.map((tab) => {
        const active = activeTab === tab;
        return (
          <Pressable
            key={tab}
            style={[styles.tabItem, active && styles.tabItemActive]}
            onPress={() => onSelectTab(tab)}
          >
            <ThemedText style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
              {tab}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#EFF6FF',
  },
  tabText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
});