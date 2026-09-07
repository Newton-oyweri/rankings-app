import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export interface PackageItem {
  id: string;
  type: 'data' | 'sms' | 'minutes';
  title: string;
  value: string;
  validity: string;
  price: number;
  provider?: 'green' | 'red'; // 'green' for Safaricom, 'red' for Airtel
  popular?: boolean;
}

interface PackageSelectorProps {
  packages?: PackageItem[];
  onSelectPackage?: (pkg: PackageItem) => void;
}

const DEFAULT_PACKAGES: PackageItem[] = [
  { id: '1', type: 'data', title: '1 Hour Rush', value: '1 GB', validity: '1 hr', price: 20, provider: 'green', popular: true },
  { id: '2', type: 'data', title: 'Daily Data', value: '250 MB', validity: '24 hrs', price: 20, provider: 'red' },
  { id: '3', type: 'minutes', title: 'Voice Pass', value: '20 Mins', validity: '24 hrs', price: 20, provider: 'green' },
  { id: '4', type: 'sms', title: 'SMS Pack', value: '100 SMS', validity: '7 days', price: 20, provider: 'red' },
];

export function HorizontalPackageList({
  packages = DEFAULT_PACKAGES,
  onSelectPackage,
}: PackageSelectorProps) {
  const router = useRouter();
  const displayedPackages = packages.slice(0, 5);

  const renderChipItem = ({ item }: { item: PackageItem }) => {
    // Dynamic provider styling (Green/Red accent without brand text)
    const isRed = item.provider === 'red';
    const accentColor = isRed ? '#EF4444' : '#10B981';
    const bgLight = isRed ? '#FEF2F2' : '#ECFDF5';
    const borderTint = isRed ? '#FCA5A5' : '#A7F3D0';

    return (
      <Pressable
        style={({ pressed }) => [
          styles.chip,
          { backgroundColor: bgLight, borderColor: borderTint },
          pressed && { opacity: 0.8 },
        ]}
        onPress={() => onSelectPackage?.(item)}
      >
        {/* Brand visual indicator line */}
        <View style={[styles.providerDot, { backgroundColor: accentColor }]} />

        {/* Offer Details */}
        <ThemedText style={styles.valueText}>{item.value}</ThemedText>
        <ThemedText style={styles.validityText}>{item.validity}</ThemedText>

        {/* Action Button */}
        <View style={[styles.buyBadge, { backgroundColor: accentColor }]}>
          <ThemedText style={styles.buyText}>Buy ({item.price})</ThemedText>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Quick Offers</ThemedText>

        <Pressable
          style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.push('/data')}
          hitSlop={8}
        >
          <ThemedText style={styles.headerLink}>More</ThemedText>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={14}
            tintColor="#10B981"
          />
        </Pressable>
      </View>

      <FlatList
        data={displayedPackages}
        renderItem={renderChipItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listPadding}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  listPadding: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  providerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  valueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  validityText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginRight: 2,
  },
  buyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  buyText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
});