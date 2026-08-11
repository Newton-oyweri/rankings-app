import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import Posts from "@/components/share/Posts";

interface WelcomeTabProps {
  profile: {
    id?: string | null;
    username: string | null;
    display_name: string | null;
    profile_pic: string | null;
  } | null;
}

const HEADER_MAX_HEIGHT = 160;
const HEADER_MIN_HEIGHT = 70;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

export default function WelcomeTab({ profile }: WelcomeTabProps) {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;

  // Refreshing State
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Incrementing key causes Posts component to re-mount and re-fetch data
    setRefreshKey((prevKey) => prevKey + 1);

    // Simulate completion / buffer time for refresh feedback
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Header height collapsing animation
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: "clamp",
  });

  // Fade out subtitle
  const subtitleOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // Fade out and shrink the "+ Post" button when scrolling up
  const buttonOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const buttonScale = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2],
    outputRange: [1, 0.8],
    extrapolate: "clamp",
  });

  // Slightly scale down title on collapse
  const titleScale = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.9],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      {/* Animated Collapsible Header */}
      <Animated.View style={[styles.headerWrapper, { height: headerHeight }]}>
        <LinearGradient
          colors={["#1E3A8A", "#2563EB", "#7C3AED"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={["top"]} style={styles.safeArea}>
            <View style={styles.headerContent}>
              <View style={styles.topRow}>
                <Animated.Text
                  style={[
                    styles.welcomeTitle,
                    { transform: [{ scale: titleScale }] },
                  ]}
                >
                  Welcome, {profile?.display_name || profile?.username || "Player"}!
                </Animated.Text>

                {/* Animated wrapper to fade out the "+ Post" button */}
                <Animated.View
                  style={{
                    opacity: buttonOpacity,
                    transform: [{ scale: buttonScale }],
                  }}
                  pointerEvents={scrollY._value > HEADER_SCROLL_DISTANCE / 2 ? "none" : "auto"}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.addPostButton,
                      pressed && styles.pressedState,
                    ]}
                    onPress={() => router.push("/AddPosts")}
                  >
                    <Ionicons name="add" size={20} color="#2563EB" />
                    <Text style={styles.addPostText}>Post</Text>
                  </Pressable>
                </Animated.View>
              </View>

              {/* Subtitle */}
              <Animated.Text
                style={[styles.subtitle, { opacity: subtitleOpacity }]}
                numberOfLines={2}
              >
                Share updates, connect with players, and stay active in the
                community.
              </Animated.Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </Animated.View>

      {/* Scrollable Body with Top-Level Pull to Refresh */}
      <Animated.ScrollView
        contentContainerStyle={{ paddingTop: HEADER_MAX_HEIGHT }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={HEADER_MAX_HEIGHT}
            colors={["#2563EB"]}
            tintColor="#2563EB"
          />
        }
      >
        <Posts/>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: "hidden",
  },
  headerGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 13,
    color: "#E0E7FF",
    fontWeight: "500",
    marginTop: 6,
    lineHeight: 18,
  },
  addPostButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  addPostText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  pressedState: {
    opacity: 0.8,
  },
});