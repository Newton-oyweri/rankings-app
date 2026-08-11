import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// Show the notification even while the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  route?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'Test Notification',
    message: 'This is a simple test notification to check the UI.',
    timestamp: 'Just now',
    read: false,
    icon: 'notifications-outline',
    iconBg: '#EFF6FF',
    iconColor: '#1E40AF',
  },
];

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const isNavigating = useRef(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    })();
  }, []);

  const handleSendTestNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification 🔔',
        body: 'This is a simple test push notification.',
      },
      trigger: null,
    });
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationPress = (item: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );

    if (item.route) {
      if (isNavigating.current) return;
      isNavigating.current = true;

      router.push(item.route as any);

      setTimeout(() => {
        isNavigating.current = false;
      }, 500);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header Action Bar */}
        <View style={styles.headerBar}>
          <View style={styles.headerTitleRow}>
            <ThemedText style={styles.headerTitle}>Notifications</ThemedText>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <ThemedText style={styles.unreadBadgeText}>{unreadCount} new</ThemedText>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <Pressable onPress={handleMarkAllRead} hitSlop={8}>
              <ThemedText style={styles.markReadText}>Mark all read</ThemedText>
            </Pressable>
          )}
        </View>

        {/* Test Notification Button */}
        <Pressable style={styles.testButton} onPress={handleSendTestNotification}>
          <Ionicons name="notifications-outline" size={16} color="#FFFFFF" />
          <ThemedText style={styles.testButtonText}>Send Test Notification</ThemedText>
        </Pressable>

        {/* List */}
        <FlashList
          data={notifications}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listPadding}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.delay(index * 50).duration(300)}
              layout={Layout.springify()}
            >
              <Pressable
                style={[styles.notifCard, !item.read && styles.unreadCard]}
                onPress={() => handleNotificationPress(item)}
              >
                {!item.read && <View style={styles.unreadDot} />}

                <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon} size={22} color={item.iconColor} />
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.titleRow}>
                    <ThemedText style={styles.itemTitle}>{item.title}</ThemedText>
                    <ThemedText style={styles.timestamp}>{item.timestamp}</ThemedText>
                  </View>
                  <ThemedText style={styles.messageText}>{item.message}</ThemedText>
                </View>
              </Pressable>
            </Animated.View>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  safeArea: {
    flex: 1,
  },
  listPadding: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  /* Header Bar */
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  unreadBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },

  /* Test Notification Button */
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E40AF',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  testButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Notification Items */
  notifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  unreadCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#BFDBFE',
    borderWidth: 1.5,
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    paddingRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  timestamp: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  messageText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
});