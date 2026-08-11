import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

const { width, height } = Dimensions.get("window");
const TEXT_TRUNCATE_LIMIT = 150;

// Regex to detect web URLs
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// Extract YouTube Video ID without third-party libraries
const getYouTubeVideoId = (url: string): string | null => {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
};

interface FloatingEmoji {
  id: string;
  postId: string;
}

interface Post {
  id: string;
  userId: string;
  user: {
    name: string;
    username: string;
    avatar: string | null;
  };
  content: string;
  image?: string | null;
  likes: number;
  time: string;
  liked: boolean;
  followersCount: number;
  isFollowing: boolean;
}

const formatTimeAgo = (dateStr: string) => {
  const now = new Date();
  const postDate = new Date(dateStr);
  const diffMs = now.getTime() - postDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return postDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

function FloatingThumbsUp({ onAnimationEnd }: { onAnimationEnd: () => void }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.5);

  React.useEffect(() => {
    scale.value = withSpring(1.2, { damping: 12 });
    translateY.value = withTiming(-70, { duration: 700 });
    opacity.value = withTiming(0, { duration: 700 }, (finished) => {
      if (finished && onAnimationEnd) {
        runOnJS(onAnimationEnd)();
      }
    });
  }, [opacity, scale, translateY, onAnimationEnd]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.floatingEmojiContainer, animStyle]}>
      <Text style={styles.floatingEmojiText}>👍</Text>
    </Animated.View>
  );
}

// Sub-component for expandable text with link detection & media previews
function TruncatedText({ text, hasUploadedImage }: { text: string; hasUploadedImage: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = text.length > TEXT_TRUNCATE_LIMIT;

  const displayedText = shouldTruncate && !expanded
    ? `${text.slice(0, TEXT_TRUNCATE_LIMIT)}...`
    : text;

  // Extract detected links
  const detectedUrls = text.match(URL_REGEX) || [];
  const firstUrl = detectedUrls[0] || null;

  const ytId = firstUrl ? getYouTubeVideoId(firstUrl) : null;
  const isTikTok = firstUrl ? firstUrl.includes("tiktok.com") : false;

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch((err) => console.error("Could not open URL:", err));
  };

  const renderFormattedText = (rawText: string) => {
    const parts = rawText.split(URL_REGEX);
    return (
      <Text style={styles.content}>
        {parts.map((part, index) => {
          if (URL_REGEX.test(part)) {
            return (
              <Text
                key={index}
                style={styles.inlineLink}
                onPress={() => handleOpenLink(part)}
              >
                {part}{" "}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

  return (
    <View style={styles.contentContainer}>
      {renderFormattedText(displayedText)}

      {shouldTruncate && (
        <Pressable onPress={() => setExpanded(!expanded)} hitSlop={8}>
          <Text style={styles.readMoreText}>
            {expanded ? "Show less" : "Read more"}
          </Text>
        </Pressable>
      )}

      {/* Embedded YouTube Media Preview */}
      {ytId && (
        <Pressable
          style={styles.mediaPreviewCard}
          onPress={() => firstUrl && handleOpenLink(firstUrl)}
        >
          <View style={styles.thumbnailWrapper}>
            <Image
              source={{ uri: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` }}
              style={styles.mediaThumbnail}
              resizeMode="cover"
            />
            <View style={styles.playButtonOverlay}>
              <Ionicons name="play-circle" size={48} color="#FF0000" />
            </View>
          </View>
          <View style={styles.mediaFooter}>
            <Ionicons name="logo-youtube" size={16} color="#FF0000" />
            <Text style={styles.mediaFooterText} numberOfLines={1}>
              Watch Video on YouTube
            </Text>
          </View>
        </Pressable>
      )}

      {/* Embedded TikTok Media Preview */}
      {isTikTok && !ytId && (
        <Pressable
          style={styles.mediaPreviewCard}
          onPress={() => firstUrl && handleOpenLink(firstUrl)}
        >
          <View style={styles.tikTokBanner}>
            <Ionicons name="logo-tiktok" size={28} color="#FFFFFF" />
            <Text style={styles.tikTokBannerText}>Watch on TikTok</Text>
          </View>
          <View style={styles.mediaFooter}>
            <Ionicons name="open-outline" size={14} color="#64748B" />
            <Text style={styles.mediaFooterText} numberOfLines={1}>
              {firstUrl}
            </Text>
          </View>
        </Pressable>
      )}

      {/* Generic Link Preview Card (if no native post image exists) */}
      {firstUrl && !ytId && !isTikTok && !hasUploadedImage && (
        <Pressable
          style={styles.genericLinkCard}
          onPress={() => handleOpenLink(firstUrl)}
        >
          <Ionicons name="link-outline" size={18} color="#2563EB" />
          <Text style={styles.genericLinkText} numberOfLines={1}>
            {firstUrl}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function Posts() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Fetch session & current user details
  const fetchCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, display_name")
          .eq("id", user.id)
          .single();

        setUsername(profile?.username || profile?.display_name || user.email?.split("@")[0] || null);
      } else {
        setCurrentUserId(null);
        setUsername(null);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setUsername(null);
    }
  };

  const mapSupabasePostToUI = async (post: any, authUserId: string | null): Promise<Post> => {
    const postUserId = post.user_id;

    // Fetch follower count for author
    const { count: followersCount } = await supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("following_id", postUserId);

    // Check if current user follows this author
    let isFollowing = false;
    if (authUserId && authUserId !== postUserId) {
      const { data } = await supabase
        .from("followers")
        .select("id")
        .eq("follower_id", authUserId)
        .eq("following_id", postUserId)
        .maybeSingle();
      isFollowing = !!data;
    }

    return {
      id: String(post.id),
      userId: postUserId,
      user: {
        name: post.profiles?.display_name || "Unknown User",
        username: post.profiles?.username || "unknown",
        avatar: post.profiles?.profile_pic || null,
      },
      content: [post.title, post.summary].filter(Boolean).join("\n\n"),
      image: post.image_url || null,
      likes: post.likes || 0,
      time: formatTimeAgo(post.created_at),
      liked: false,
      followersCount: followersCount || 0,
      isFollowing,
    };
  };

  const fetchPosts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          title,
          summary,
          image_url,
          likes,
          created_at,
          user_id,
          profiles (
            username,
            display_name,
            profile_pic
          )
        `)
        .order("id", { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedPosts = await Promise.all(
          data.map((p) => mapSupabasePostToUI(p, user?.id || null))
        );
        setPosts(formattedPosts);
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCurrentUser();
    fetchPosts();
  }, []);

  const fetchSinglePost = async (id: number | string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        title,
        summary,
        image_url,
        likes,
        created_at,
        user_id,
        profiles (
          username,
          display_name,
          profile_pic
        )
      `)
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return mapSupabasePostToUI(data, user?.id || null);
  };

  useEffect(() => {
    let isActive = true;

    fetchCurrentUser();
    fetchPosts();

    // Guard against duplicate/stale channels caused by React Fabric's
    // reconnectPassiveEffects re-running this effect (e.g. tab screens
    // kept mounted via Activity) before the previous cleanup has fully
    // torn down the same-named realtime channel.
    const existing = supabase
      .getChannels()
      .find((c) => c.topic === "realtime:rn-newspaper-posts");
    if (existing) {
      supabase.removeChannel(existing);
    }

    const channel = supabase
      .channel("rn-newspaper-posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          const newPost = await fetchSinglePost(payload.new.id);
          if (newPost && isActive) {
            setPosts((prev) => [newPost, ...prev.filter((p) => p.id !== newPost.id)]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload) => {
          if (!isActive) return;
          setPosts((prev) =>
            prev.map((post) =>
              post.id === String(payload.new.id)
                ? { ...post, likes: payload.new.likes }
                : post
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "posts" },
        (payload) => {
          if (!isActive) return;
          setPosts((prev) => prev.filter((post) => post.id !== String(payload.old.id)));
        }
      )
      .subscribe();

    return () => {
      isActive = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleLike = useCallback(async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === id) {
          const isLiking = !post.liked;

          if (isLiking) {
            setFloatingEmojis((current) => [
              ...current,
              { id: `${id}-${Date.now()}`, postId: id },
            ]);
          }

          return {
            ...post,
            liked: isLiking,
            likes: isLiking ? post.likes + 1 : post.likes - 1,
          };
        }
        return post;
      })
    );

    try {
      const { error } = await supabase.rpc("increment_post_likes", {
        post_id: Number(id),
      });
      if (error) throw error;
    } catch (err) {
      console.error("Error updating likes on backend:", err);
      fetchPosts();
    }
  }, []);

  const handleFollowToggle = async (targetUserId: string, currentIsFollowing: boolean) => {
    if (!currentUserId) {
      router.push("/(auth)/sign-in");
      return;
    }
    if (currentUserId === targetUserId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Optimistically update all posts belonging to this target user
    setPosts((prev) =>
      prev.map((p) => {
        if (p.userId === targetUserId) {
          const nextState = !currentIsFollowing;
          return {
            ...p,
            isFollowing: nextState,
            followersCount: nextState
              ? p.followersCount + 1
              : Math.max(0, p.followersCount - 1),
          };
        }
        return p;
      })
    );

    try {
      if (currentIsFollowing) {
        const { error } = await supabase
          .from("followers")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUserId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("followers")
          .insert({ follower_id: currentUserId, following_id: targetUserId });

        if (error) throw error;
      }
    } catch (err) {
      console.error("Error toggling follow status:", err);
      fetchPosts();
    }
  };

  const navigateToProfile = (userId: string) => {
    router.push({
      pathname: "/profile/[id]",
      params: { id: userId },
    });
  };

  const removeFloatingEmoji = useCallback((emojiId: string) => {
    setFloatingEmojis((current) => current.filter((item) => item.id !== emojiId));
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2563EB"]}
            tintColor="#2563EB"
          />
        }
      >
        {/* Welcome Header */}
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>
            What's up, <Text style={styles.welcomeUsername}>{username || "Guest"}</Text>?
          </Text>
        </View>

        {posts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyText}>No posts yet. Be the first to share!</Text>
          </View>
        ) : (
          posts.map((item, index) => {
            const activeEmojis = floatingEmojis.filter(
              (emoji) => emoji.postId === item.id
            );
            const isSelf = currentUserId === item.userId;

            return (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(Math.min(index * 40, 200)).duration(280)}
                layout={Layout.springify()}
              >
                <View style={styles.card}>
                  {/* Interactive Header: Tapping opens User Profile */}
                  <View style={styles.postHeader}>
                    <Pressable
                      style={styles.authorTouchable}
                      onPress={() => navigateToProfile(item.userId)}
                    >
                      <View style={styles.avatarWrapper}>
                        {item.user.avatar ? (
                          <Image
                            source={{ uri: item.user.avatar }}
                            style={styles.avatar}
                          />
                        ) : (
                          <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Ionicons name="person" size={22} color="#64748B" />
                          </View>
                        )}
                      </View>

                      <View style={styles.userInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.displayName} numberOfLines={1}>
                            {item.user.name}
                          </Text>
                        </View>
                        <Text style={styles.username}>@{item.user.username}</Text>

                        {/* Followers Count Badge */}
                        <View style={styles.followersBadge}>
                          <Ionicons name="people-outline" size={12} color="#64748B" />
                          <Text style={styles.followersText}>
                            {item.followersCount.toLocaleString()} {item.followersCount === 1 ? 'follower' : 'followers'}
                          </Text>
                        </View>
                      </View>
                    </Pressable>

                    <View style={styles.headerRight}>
                      {/* Follow / Unfollow CTA */}
                      {!isSelf && (
                        <Pressable
                          style={({ pressed }) => [
                            styles.followButton,
                            item.isFollowing && styles.followingButton,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => handleFollowToggle(item.userId, item.isFollowing)}
                          hitSlop={8}
                        >
                          <Ionicons
                            name={item.isFollowing ? "checkmark" : "add"}
                            size={14}
                            color={item.isFollowing ? "#475569" : "#FFFFFF"}
                          />
                          <Text
                            style={[
                              styles.followBtnText,
                              item.isFollowing && styles.followingBtnText,
                            ]}
                          >
                            {item.isFollowing ? "Following" : "Follow"}
                          </Text>
                        </Pressable>
                      )}

                      <Text style={styles.time}>{item.time}</Text>
                    </View>
                  </View>

                  {/* Content with Read More toggle & Link / Video Previews */}
                  <TruncatedText text={item.content} hasUploadedImage={!!item.image} />

                  {/* Expandable Image */}
                  {item.image && (
                    <Pressable onPress={() => setSelectedImage(item.image ?? null)}>
                      <Image
                        source={{ uri: item.image }}
                        style={styles.postImage}
                        resizeMode="cover"
                      />
                    </Pressable>
                  )}

                  {/* Actions */}
                  <View style={styles.actions}>
                    <View style={styles.actionBtnWrapper}>
                      {activeEmojis.map((emoji) => (
                        <FloatingThumbsUp
                          key={emoji.id}
                          onAnimationEnd={() => removeFloatingEmoji(emoji.id)}
                        />
                      ))}

                      <Pressable
                        style={({ pressed }) => [
                          styles.actionBtn,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => toggleLike(item.id)}
                      >
                        <Ionicons
                          name={item.liked ? "football" : "football-outline"}
                          size={22}
                          color={item.liked ? "#2563EB" : "#64748B"}
                        />
                        <Text
                          style={[
                            styles.actionText,
                            item.liked && { color: "#2563EB", fontWeight: "700" },
                          ]}
                        >
                          {item.likes}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      {/* Full-Screen Expanded Image Modal */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.closeButton}
            onPress={() => setSelectedImage(null)}
            hitSlop={12}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>

          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  welcomeContainer: {
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  welcomeUsername: {
    color: "#2563EB",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  authorTouchable: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  avatarWrapper: {
    marginRight: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  displayName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  username: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  followersBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  followersText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  followButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    gap: 2,
  },
  followingButton: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  followBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  followingBtnText: {
    color: "#475569",
  },
  time: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  contentContainer: {
    marginBottom: 10,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    color: "#0F172A",
  },
  inlineLink: {
    color: "#2563EB",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
    marginTop: 4,
  },
  postImage: {
    width: "100%",
    height: width * 0.52,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#F1F5F9",
  },
  mediaPreviewCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 4,
  },
  thumbnailWrapper: {
    position: "relative",
    width: "100%",
    height: 180,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  mediaThumbnail: {
    width: "100%",
    height: "100%",
    opacity: 0.9,
  },
  playButtonOverlay: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 30,
  },
  mediaFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: "#FFFFFF",
  },
  mediaFooterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
  tikTokBanner: {
    height: 120,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  tikTokBannerText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  genericLinkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F1F5F9",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  genericLinkText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 4,
  },
  actionBtnWrapper: {
    position: "relative",
    alignItems: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  pressed: {
    opacity: 0.65,
  },
  floatingEmojiContainer: {
    position: "absolute",
    top: -10,
    left: 10,
    zIndex: 10,
    pointerEvents: "none",
  },
  floatingEmojiText: {
    fontSize: 26,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: 8,
  },
  fullScreenImage: {
    width: width,
    height: height * 0.8,
  },
});