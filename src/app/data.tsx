// app/data.tsx
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PackageItem } from '@/components/profile/WeeklyProgressCard';
import { ThemedText } from '@/components/themed-text';

const HOURLY_PACKAGES: PackageItem[] = [
  { id: 'h1', type: 'data', title: 'Kaduda Rush', value: '350 MB', validity: '1 Hour', price: 10 },
  { id: 'h2', type: 'data', title: 'Giga Hour', value: '1 GB', validity: '1 Hour', price: 20, popular: true },
  { id: 'h3', type: 'data', title: 'Night Owl', value: '1.2 GB', validity: '3 Hours', price: 50 },
];

const DAILY_PACKAGES: PackageItem[] = [
  { id: 'd1', type: 'data', title: 'Daily Lite', value: '60 MB', validity: '24 Hours', price: 10 },
  { id: 'd2', type: 'data', title: 'Daily Standard', value: '250 MB', validity: '24 Hours', price: 20, popular: true },
  { id: 'd3', type: 'data', title: 'Daily Heavy', value: '750 MB', validity: '24 Hours', price: 50 },
  { id: 'd4', type: 'data', title: 'Daily Max', value: '1.5 GB', validity: '24 Hours', price: 99 },
];

const WEEKLY_PACKAGES: PackageItem[] = [
  { id: 'w1', type: 'data', title: 'Weekly Lite', value: '400 MB', validity: '7 Days', price: 50 },
  { id: 'w2', type: 'data', title: 'Weekly Standard', value: '1.1 GB', validity: '7 Days', price: 99, popular: true },
  { id: 'w3', type: 'data', title: 'Weekly Pro', value: '3.2 GB', validity: '7 Days', price: 250 },
];

export default function BuyDataScreen() {
  const [walletBalance, setWalletBalance] = useState(250);

  // Entrance animation values for scrollable content
  const translateY = useSharedValue(80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, {
      damping: 18,
      stiffness: 120,
      mass: 0.9,
    });
    opacity.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handlePurchase = (pkg: PackageItem) => {
    if (walletBalance < pkg.price) {
      Alert.alert('Low Balance', 'You do not have enough wallet balance. Please top up.');
      return;
    }

    Alert.alert(
      'Confirm Bundle Purchase',
      `Buy ${pkg.value} (${pkg.validity}) for KES ${pkg.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy Now',
          onPress: () => {
            setWalletBalance((prev) => prev - pkg.price);
            Alert.alert(
              'Purchase Successful',
              `Successfully purchased ${pkg.value}. Balance left: KES ${walletBalance - pkg.price}`
            );
          },
        },
      ]
    );
  };

  const renderGridSection = (
    title: string,
    subtitle: string,
    items: PackageItem[],
    icon: React.ReactNode
  ) => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeaderRow}>
        {icon}
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      </View>
      <ThemedText style={styles.sectionSubtitle}>{subtitle}</ThemedText>

      <View style={styles.grid}>
        {items.map((pkg) => (
          <Pressable
            key={pkg.id}
            style={({ pressed }) => [styles.gridCard, pressed && { opacity: 0.9 }]}
            onPress={() => handlePurchase(pkg)}
          >
            {pkg.popular && (
              <View style={styles.hotBadge}>
                <ThemedText style={styles.hotText}>HOT</ThemedText>
              </View>
            )}

            <View style={styles.cardTop}>
              <ThemedText style={styles.gridTitle}>{pkg.title}</ThemedText>
              <ThemedText style={styles.gridValidity}>{pkg.validity}</ThemedText>
            </View>

            <ThemedText style={styles.gridValue}>{pkg.value}</ThemedText>

            <View style={styles.gridFooter}>
              <ThemedText style={styles.gridPrice}>KES {pkg.price}</ThemedText>
              <View style={styles.gridBuyBtn}>
                <ThemedText style={styles.gridBuyText}>Buy</ThemedText>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.screenContainer}>
      {/* Fixed Safe Area Header Container */}
      <View style={styles.headerWrapper}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <View>
              <ThemedText style={styles.headerSubtitle}>Bundle Store</ThemedText>
              <ThemedText style={styles.headerTitle}>Buy Data & Airtime</ThemedText>
            </View>

            <View style={styles.walletBox}>
              <ThemedText style={styles.walletLabel}>In-App Wallet</ThemedText>
              <ThemedText style={styles.walletValue}>KES {walletBalance}</ThemedText>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Animated & Scrollable Body */}
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Hourly */}
          {renderGridSection(
            'Hourly Power Bundles',
            'Short on time? Quick high-speed bundles',
            HOURLY_PACKAGES,
            <Ionicons name="flash-outline" size={18} color="#1E293B" style={styles.sectionIcon} />
          )}

          {/* Daily */}
          {renderGridSection(
            '24-Hour Bundles',
            'All-day connection for daily tasks',
            DAILY_PACKAGES,
            <MaterialIcons name="today" size={18} color="#1E293B" style={styles.sectionIcon} />
          )}

          {/* Weekly */}
          {renderGridSection(
            '7-Day Weekly Deals',
            'Save more with longer validity',
            WEEKLY_PACKAGES,
            <MaterialIcons name="date-range" size={18} color="#1E293B" style={styles.sectionIcon} />
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContainer: { flex: 1 },

  /* Header Styles following ProfileHeader architectural pattern */
  headerWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingBottom: 12,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  headerSubtitle: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  walletBox: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  walletLabel: { fontSize: 10, color: '#2563EB', fontWeight: '600' },
  walletValue: { fontSize: 15, fontWeight: '800', color: '#1E40AF' },

  /* Main Content Styles */
  sectionContainer: { marginTop: 20, paddingHorizontal: 16 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 6,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  sectionSubtitle: { fontSize: 12, color: '#64748B', marginBottom: 12, marginTop: 2 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    backgroundColor: '#FFFFFF',
    width: '48%',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  hotBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderBottomLeftRadius: 8,
  },
  hotText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },
  cardTop: { marginBottom: 6 },
  gridTitle: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  gridValidity: { fontSize: 10, color: '#94A3B8' },
  gridValue: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  gridPrice: { fontSize: 13, fontWeight: '800', color: '#2563EB' },
  gridBuyBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gridBuyText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});