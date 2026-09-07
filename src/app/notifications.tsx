import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { registerForPushNotificationsAsync } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface DBNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  route: string | null;
  read: boolean;
  created_at: string;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const isNavigating = useRef(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    let channel: any;

    const setupAuthAndListeners = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUser(user);
      await registerForPushNotificationsAsync(user.id);
      await fetchNotifications(user.id);
      setLoading(false);

      // 1. Listen for real-time database insertions (so new rows show up instantly)
      channel = supabase
        .channel(`public:notifications:user_id=eq.${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('New notification inserted in DB:', payload.new);
            setNotifications((prev) => [payload.new as DBNotification, ...prev]);
          }
        )
        .subscribe();
    };

    setupAuthAndListeners();

    // 2. Catch incoming pushes while app is active in foreground
    const foregroundSub = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Foreground push received:', notification);
    });

    // 3. Handle notification taps
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.route && typeof data.route === 'string') {
        router.push(data.route as any);
      }
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
      foregroundSub.remove();
      responseSub.remove();
    };
  }, []);

  const fetchNotifications = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setNotifications(data as DBNotification[]);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const onRefresh = async () => {
    if (!currentUser) return;
    setRefreshing(true);
    await fetchNotifications(currentUser.id);
    setRefreshing(false);
  };

  const handleMarkAllRead = async () => {
    if (!currentUser) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', currentUser.id)
        .eq('read', false);
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  const handleNotificationPress = async (item: DBNotification) => {
    if (!item.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );

      try {
        await supabase.from('notifications').update({ read: true }).eq('id', item.id);
      } catch (err) {
        console.error('Error marking notification read:', err);
      }
    }

    if (item.route) {
      if (isNavigating.current) return;
      isNavigating.current = true;
      router.push(item.route as any);
      setTimeout(() => {
        isNavigating.current = false;
      }, 500);
    }
  };

  const getIconDetails = (type: string) => {
    switch (type) {
      case 'match':
        return { name: 'football-outline' as const, bg: '#EFF6FF', color: '#1E40AF' };
      case 'follower':
        return { name: 'person-add-outline' as const, bg: '#F0FDF4', color: '#166534' };
      default:
        return { name: 'notifications-outline' as const, bg: '#F1F5F9', color: '#475569' };
    }
  };

  const formatTimestamp = (dateStr: string) => {
    const now = new Date();
    const created = new Date(dateStr);
    const diffInMins = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;

    const diffInHours = Math.floor(diffInMins / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    return created.toLocaleDateString();
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="dark" />

      <View style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={[styles.headerBar, { paddingTop: insets.top + 12 }]}>
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

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2563EB" />
          </View>
        ) : (
          <FlashList
            data={notifications}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listPadding}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off-outline" size={40} color="#94A3B8" />
                <ThemedText style={styles.emptyText}>No notifications yet</ThemedText>
              </View>
            }
            renderItem={({ item, index }) => {
              const iconMeta = getIconDetails(item.type);
              return (
                <Animated.View
                  entering={FadeInDown.delay(index * 40).duration(250)}
                  layout={Layout.springify()}
                >
                  <Pressable
                    style={[styles.notifCard, !item.read && styles.unreadCard]}
                    onPress={() => handleNotificationPress(item)}
                  >
                    {!item.read && <View style={styles.unreadDot} />}
                    <View style={[styles.iconBox, { backgroundColor: iconMeta.bg }]}>
                      <Ionicons name={iconMeta.name} size={22} color={iconMeta.color} />
                    </View>
                    <View style={styles.cardContent}>
                      <View style={styles.titleRow}>
                        <ThemedText style={styles.itemTitle}>{item.title}</ThemedText>
                        <ThemedText style={styles.timestamp}>
                          {formatTimestamp(item.created_at)}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.messageText}>{item.message}</ThemedText>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            }}
          />
        )}
      </View>
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
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
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