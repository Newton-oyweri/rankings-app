import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

export interface UserPost {
  id: string;
  title: string;
  summary: string;
  image_url: string | null;
  likes: number;
  created_at: string;
}

interface UserPostsListProps {
  posts: UserPost[];
  onLikePost: (postId: string) => void;
}

// Regex to detect standard web URLs
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// Helper to extract YouTube Video ID
const getYouTubeVideoId = (url: string): string | null => {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
};

// Format timestamp
const formatTimeAgo = (dateStr: string) => {
  const now = new Date();
  const postDate = new Date(dateStr);
  const diffMs = now.getTime() - postDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return postDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

// Single Post Card Component
function SinglePostCard({
  post,
  onLikePost,
}: {
  post: UserPost;
  onLikePost: (postId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const fullText = [post.title, post.summary].filter(Boolean).join('\n\n');
  const urls = fullText.match(URL_REGEX) || [];
  const firstUrl = urls[0] || null;

  // Media Link Detection
  const ytId = firstUrl ? getYouTubeVideoId(firstUrl) : null;
  const isTikTok = firstUrl ? firstUrl.includes('tiktok.com') : false;

  // Text Truncation
  const isLongText = fullText.length > 180;
  const displayedText =
    isLongText && !expanded ? `${fullText.slice(0, 180)}...` : fullText;

  // Render clickable text containing inline URLs
  const renderFormattedText = (text: string) => {
    const parts = text.split(URL_REGEX);
    return (
      <Text style={styles.postContent}>
        {parts.map((part, index) => {
          if (URL_REGEX.test(part)) {
            return (
              <Text
                key={index}
                style={styles.inlineLink}
                onPress={() => Linking.openURL(part)}
              >
                {part}{' '}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

  return (
    <View style={styles.postCard}>
      {/* Header */}
      <View style={styles.postHeader}>
        <Text style={styles.postTime}>{formatTimeAgo(post.created_at)}</Text>
      </View>

      {/* Body Content */}
      {renderFormattedText(displayedText)}

      {/* Read More / Read Less Toggle */}
      {isLongText && (
        <Pressable onPress={() => setExpanded(!expanded)} style={styles.readMoreBtn}>
          <Text style={styles.readMoreText}>
            {expanded ? 'Show Less' : 'Read More'}
          </Text>
        </Pressable>
      )}

      {/* Native Image Upload Preview */}
      {post.image_url && (
        <Image
          source={{ uri: post.image_url }}
          style={styles.postImage}
          contentFit="cover"
        />
      )}

      {/* Embedded YouTube Media Preview Card */}
      {ytId && (
        <Pressable
          style={styles.mediaPreviewCard}
          onPress={() => firstUrl && Linking.openURL(firstUrl)}
        >
          <View style={styles.thumbnailWrapper}>
            <Image
              source={{ uri: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` }}
              style={styles.mediaThumbnail}
              contentFit="cover"
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

      {/* Embedded TikTok Media Preview Card */}
      {isTikTok && !ytId && (
        <Pressable
          style={styles.mediaPreviewCard}
          onPress={() => firstUrl && Linking.openURL(firstUrl)}
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

      {/* Generic Link Preview Card (Non-YT / Non-TikTok) */}
      {firstUrl && !ytId && !isTikTok && !post.image_url && (
        <Pressable
          style={styles.genericLinkCard}
          onPress={() => Linking.openURL(firstUrl)}
        >
          <Ionicons name="link-outline" size={20} color="#2563EB" />
          <Text style={styles.genericLinkText} numberOfLines={1}>
            {firstUrl}
          </Text>
        </Pressable>
      )}

      {/* Like Actions Footer */}
      <View style={styles.postActions}>
        <Pressable
          style={({ pressed }) => [styles.likeBtn, pressed && styles.pressedState]}
          onPress={() => onLikePost(post.id)}
        >
          <Ionicons name="football-outline" size={20} color="#2563EB" />
          <Text style={styles.likeCount}>{post.likes}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function UserPostsList({ posts, onLikePost }: UserPostsListProps) {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Ionicons name="grid-outline" size={16} color="#0F172A" />
        <Text style={styles.sectionTitle}>Posts ({posts.length})</Text>
      </View>

      {/* Posts Stream */}
      {posts.length === 0 ? (
        <View style={styles.noPostsContainer}>
          <Ionicons name="document-text-outline" size={42} color="#94A3B8" />
          <Text style={styles.noPostsText}>No posts published yet.</Text>
        </View>
      ) : (
        posts.map((post) => (
          <SinglePostCard key={post.id} post={post} onLikePost={onLikePost} />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  noPostsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noPostsText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  postTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#0F172A',
    marginBottom: 6,
  },
  inlineLink: {
    color: '#2563EB',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  readMoreBtn: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  readMoreText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '700',
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 10,
  },

  /* Media Preview Card Styles */
  mediaPreviewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 10,
  },
  thumbnailWrapper: {
    position: 'relative',
    width: '100%',
    height: 180,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  playButtonOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 30,
  },
  mediaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: '#FFFFFF',
  },
  mediaFooterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  tikTokBanner: {
    height: 120,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  tikTokBannerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  genericLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  genericLinkText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    flex: 1,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  likeCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  pressedState: {
    opacity: 0.7,
  },
});