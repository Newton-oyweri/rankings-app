import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PROMO_SLIDES = [
  {
    id: 'leaderboard',
    title: 'VIEW PLAYER STANDINGS.\nTRACK PERFORMANCE.\nCLIMB THE RANKINGS.',
    subtitle: 'Check player standings, compare performance and see who is leading the competition.',
    buttonText: 'View Leaderboard',
    iconName: 'trophy' as const,
    iconColor: '#FFD700',
    badgeIcon: 'star' as const,
    route: '/leaderboard',
  },
  {
    id: 'registration',
    title: 'REGISTER FOR TOURNAMENTS.\nCOMPETE.\nMAKE YOUR MARK.',
    subtitle: 'Find an upcoming tournament, register your team and compete against other players.',
    buttonText: 'Register for Tournament',
    iconName: 'calendar' as const,
    iconColor: '#38BDF8',
    badgeIcon: 'flame' as const,
    route: '/registration',
  },
];

export function PromoBanner() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const isNavigating = useRef(false);

  // Auto-rotate every 4.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % PROMO_SLIDES.length;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  const handleNavigation = (route: string) => {
    if (isNavigating.current) return;
    isNavigating.current = true;

    router.push(route as any);

    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    if (index >= 0 && index < PROMO_SLIDES.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const handleDotPress = (index: number) => {
    setActiveIndex(index);
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
  };

  return (
    <View style={styles.wrapper}>
      <FlatList
        ref={flatListRef}
        data={PROMO_SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <View style={styles.promoBanner}>
              <View style={styles.promoTextContainer}>
                <ThemedText style={styles.promoTitle}>{item.title}</ThemedText>
                <ThemedText style={styles.promoSubtitle}>{item.subtitle}</ThemedText>
                <Pressable
                  style={styles.promoButton}
                  onPress={() => handleNavigation(item.route)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ThemedText style={styles.promoButtonText}>{item.buttonText}</ThemedText>
                  <Ionicons name="chevron-forward" size={16} color="#1a1a2e" />
                </Pressable>
              </View>

              <View style={styles.trophyContainer}>
                <Ionicons name={item.iconName} size={56} color={item.iconColor} />
                <View style={styles.starBadge}>
                  <Ionicons name={item.badgeIcon} size={16} color="#FFD700" />
                </View>
              </View>
            </View>
          </View>
        )}
      />

      {/* Pagination Dots */}
      <View style={styles.paginationContainer}>
        {PROMO_SLIDES.map((_, index) => (
          <Pressable
            key={index}
            onPress={() => handleDotPress(index)}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <View
              style={[
                styles.dot,
                activeIndex === index ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },
  cardWrapper: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 16, // Controls inner card padding relative to screen edges
  },
  promoBanner: {
    backgroundColor: '#1E40AF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 160,
  },
  promoTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  promoTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 6,
  },
  promoSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  promoButton: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  promoButtonText: {
    color: '#1a1a2e',
    fontWeight: '700',
    fontSize: 13,
  },
  trophyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  starBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#1E40AF',
    borderRadius: 12,
    padding: 3,
  },

  /* Dots Indicator */
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: '#1E40AF',
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#CBD5E1',
  },
});