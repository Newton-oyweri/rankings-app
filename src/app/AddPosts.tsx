import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

const WORKER_URL = "https://posts-api.unscriptedusa.workers.dev";

interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
}

interface UserPost {
  id: number;
  summary: string | null;
  image_url: string | null;
  likes: number;
  created_at: string;
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

export default function AddPosts() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [content, setContent] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  // User's own posts
  const [myPosts, setMyPosts] = useState<UserPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchMyPosts = useCallback(async (userId: string) => {
    try {
      setLoadingPosts(true);
      const { data, error } = await supabase
        .from("posts")
        .select("id, summary, image_url, likes, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyPosts(data || []);
    } catch (err) {
      console.error("Failed to load your posts:", err);
    } finally {
      setLoadingPosts(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          router.replace("/(auth)/sign-in");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, username, profile_pic")
          .eq("id", user.id)
          .single();

        const profileData: UserProfile = {
          id: user.id,
          name: profile?.display_name || user.email?.split("@")[0] || "User",
          username: profile?.username || "user",
          avatar: profile?.profile_pic || null,
        };

        setCurrentUser(profileData);
        await fetchMyPosts(user.id);
      } catch (err) {
        console.error("Auth check failed:", err);
        router.replace("/(auth)/sign-in");
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, [router, fetchMyPosts]);

  const onRefresh = () => {
    if (!currentUser) return;
    setRefreshing(true);
    fetchMyPosts(currentUser.id);
  };

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission required",
        "Permission to access media library is required."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const removeImage = () => setImageUri(null);

  const uploadImageToWorker = async (uri: string): Promise<string> => {
    const filename = uri.split("/").pop() || "upload.jpg";
    const response = await fetch(uri);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append("file", blob, filename);

    const uploadRes = await fetch(WORKER_URL, {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      throw new Error("Image upload failed.");
    }

    const data = await uploadRes.json();
    return data.image_url;
  };

  const handlePost = async () => {
    if (!content.trim() && !imageUri) {
      Alert.alert("Empty Post", "Please write something or attach an image.");
      return;
    }

    if (!currentUser) {
      router.replace("/(auth)/sign-in");
      return;
    }

    setIsPosting(true);

    try {
      let uploadedImageUrl = "";

      if (imageUri) {
        uploadedImageUrl = await uploadImageToWorker(imageUri);
      }

      const { data, error } = await supabase
        .from("posts")
        .insert([
          {
            user_id: currentUser.id,
            summary: content.trim() || null,
            image_url: uploadedImageUrl || null,
            likes: 0,
            views: 0,
          },
        ])
        .select("id, summary, image_url, likes, created_at")
        .single();

      if (error) throw error;

      // Add the new post to the top of the list
      if (data) {
        setMyPosts((prev) => [data, ...prev]);
      }

      setContent("");
      setImageUri(null);

      Alert.alert("Success", "Your post is live!");
    } catch (err: any) {
      console.error("Failed to submit post:", err);
      Alert.alert(
        "Post Error",
        err.message || "Failed to publish post. Please try again."
      );
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = (post: UserPost) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to permanently delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(post.id);
            try {
              const { error } = await supabase
                .from("posts")
                .delete()
                .eq("id", post.id)
                .eq("user_id", currentUser?.id); // extra safety

              if (error) throw error;

              setMyPosts((prev) => prev.filter((p) => p.id !== post.id));
            } catch (err: any) {
              console.error("Delete failed:", err);
              Alert.alert("Error", err.message || "Failed to delete post.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  if (checkingAuth) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  const canPost = content.trim().length > 0 || imageUri !== null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Make a Post</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
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
          {/* ========== COMPOSER CARD ========== */}
          <View style={styles.card}>
            <View style={styles.userRow}>
              {currentUser?.avatar ? (
                <Image
                  source={{ uri: currentUser.avatar }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={22} color="#64748B" />
                </View>
              )}
              <View>
                <Text style={styles.displayName}>{currentUser?.name}</Text>
                <Text style={styles.username}>@{currentUser?.username}</Text>
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="What's happening in the community?"
              placeholderTextColor="#94A3B8"
              multiline
              value={content}
              onChangeText={setContent}
              maxLength={500}
              textAlignVertical="top"
              editable={!isPosting}
            />

            <Text style={styles.charCount}>{content.length}/500</Text>

            {imageUri && (
              <View style={styles.imagePreviewWrapper}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.imagePreview}
                  resizeMode="contain"
                />
                <Pressable
                  style={styles.removeImageBtn}
                  onPress={removeImage}
                  hitSlop={10}
                  disabled={isPosting}
                >
                  <Ionicons name="close-circle" size={26} color="#FFFFFF" />
                </Pressable>
              </View>
            )}

            <View style={styles.actionsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.mediaBtn,
                  pressed && styles.pressed,
                ]}
                onPress={pickImage}
                disabled={isPosting}
              >
                <Ionicons name="image-outline" size={20} color="#2563EB" />
                <Text style={styles.mediaBtnText}>Photo</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.postBtn,
                  (!canPost || isPosting) && styles.postBtnDisabled,
                  pressed && canPost && !isPosting && styles.pressed,
                ]}
                onPress={handlePost}
                disabled={!canPost || isPosting}
              >
                {isPosting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.postBtnText}>Post</Text>
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                  </>
                )}
              </Pressable>
            </View>
          </View>

          {/* ========== YOUR POSTS SECTION ========== */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Posts</Text>
            <Text style={styles.sectionCount}>
              {myPosts.length} {myPosts.length === 1 ? "post" : "posts"}
            </Text>
          </View>

          {loadingPosts && myPosts.length === 0 ? (
            <View style={styles.postsLoading}>
              <ActivityIndicator size="small" color="#2563EB" />
            </View>
          ) : myPosts.length === 0 ? (
            <View style={styles.emptyPosts}>
              <Ionicons name="document-text-outline" size={36} color="#94A3B8" />
              <Text style={styles.emptyPostsText}>
                You haven’t posted anything yet
              </Text>
            </View>
          ) : (
            myPosts.map((post) => (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postCardHeader}>
                  <Text style={styles.postTime}>
                    {formatTimeAgo(post.created_at)}
                  </Text>

                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDeletePost(post)}
                    disabled={deletingId === post.id}
                    hitSlop={8}
                  >
                    {deletingId === post.id ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    )}
                  </Pressable>
                </View>

                {post.summary ? (
                  <Text style={styles.postSummary} numberOfLines={4}>
                    {post.summary}
                  </Text>
                ) : null}

                {post.image_url ? (
                  <Image
                    source={{ uri: post.image_url }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                ) : null}

                <View style={styles.postMeta}>
                  <Ionicons name="football-outline" size={14} color="#64748B" />
                  <Text style={styles.postLikes}>{post.likes} likes</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerRightSpacer: {
    width: 32,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Composer
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
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
  displayName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  username: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  input: {
    fontSize: 15,
    lineHeight: 22,
    color: "#0F172A",
    minHeight: 110,
    padding: 0,
  },
  charCount: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "right",
    marginTop: 6,
    marginBottom: 8,
  },
  imagePreviewWrapper: {
    position: "relative",
    marginBottom: 14,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 250,
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 14,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  mediaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  mediaBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  postBtnDisabled: {
    backgroundColor: "#93C5FD",
  },
  postBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.7,
  },

  // Your Posts section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionCount: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  postsLoading: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyPosts: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    paddingVertical: 36,
    alignItems: "center",
  },
  emptyPostsText: {
    marginTop: 10,
    fontSize: 14,
    color: "#64748B",
  },
  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
  },
  postCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  postTime: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  deleteBtn: {
    padding: 4,
  },
  postSummary: {
    fontSize: 14,
    lineHeight: 20,
    color: "#0F172A",
    marginBottom: 10,
  },
  postImage: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    marginBottom: 10,
  },
  postMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  postLikes: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
});