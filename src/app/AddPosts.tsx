import React, { useState, useEffect } from "react";
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

export default function AddPosts() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [content, setContent] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

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

        setCurrentUser({
          id: user.id,
          name: profile?.display_name || user.email?.split("@")[0] || "User",
          username: profile?.username || "user",
          avatar: profile?.profile_pic || null,
        });
      } catch (err) {
        console.error("Auth check failed:", err);
        router.replace("/(auth)/sign-in");
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, [router]);

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

    // Fixed Expo deprecation: Pass array ['images'] and disable cropping (allowsEditing: false)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const removeImage = () => setImageUri(null);

  // Convert local file URI to Blob to prevent 'Unsupported FormDataPart implementation'
  const uploadImageToWorker = async (uri: string): Promise<string> => {
    const filename = uri.split("/").pop() || "upload.jpg";

    // 1. Fetch file as Blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // 2. Build FormData matching web behavior
    const formData = new FormData();
    formData.append("file", blob, filename);

    // 3. Post to Cloudflare Worker (do NOT manually set Content-Type header so boundary generates automatically)
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

      const { error } = await supabase.from("posts").insert([
        {
          user_id: currentUser.id,
          summary: content.trim(),
          image_url: uploadedImageUrl || null,
          likes: 0,
          views: 0,
        },
      ]);

      if (error) throw error;

      Alert.alert("Success", "Your post is live!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
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

      {/* HEADER SECTION */}
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
        >
          {/* Composer Card */}
          <View style={styles.card}>
            {/* User row */}
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

            {/* Text Input */}
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

            {/* Character count */}
            <Text style={styles.charCount}>{content.length}/500</Text>

            {/* Uncropped Image Preview */}
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

            {/* Actions Row */}
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
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
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
});