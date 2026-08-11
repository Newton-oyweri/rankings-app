import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  Share,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

export interface Registration {
  id: number;
  name: string;
  created_at: string | null;
  tournament_type: string | null;
  max_players: number | null;
  avatar_url: string | null;
  registration_amount: number;
  created_by: string | null;
  tournament_id: number | null;
}

export default function RegistrationsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  // Fetch registrations without relational joins
  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("registrations")
        .select(`
          id,
          name,
          created_at,
          tournament_type,
          max_players,
          avatar_url,
          registration_amount,
          created_by,
          tournament_id
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRegistrations((data as Registration[]) || []);
    } catch (err: any) {
      console.error("Fetch Registrations Error:", err.message);
      Alert.alert("Error loading registrations", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const filteredRegistrations = useMemo(() => {
    if (!searchTerm.trim()) return registrations;
    const query = searchTerm.toLowerCase().trim();
    return registrations.filter((reg) => reg.name?.toLowerCase().includes(query));
  }, [registrations, searchTerm]);

  const handleShare = useCallback(async (reg: Registration) => {
    const shareUrl = `https://efootballkenyaleague.website/registration/${reg.id}`;
    try {
      await Share.share({
        title: reg.name,
        message: `Entry Fee: KES ${reg.registration_amount}. Join the ${reg.name} tournament!\n${shareUrl}`,
        url: shareUrl,
      });
    } catch (error: any) {
      Alert.alert("Error sharing", error.message);
    }
  }, []);

  const renderRegistrationCard = useCallback(
    ({ item: reg, index }: { item: Registration; index: number }) => {
      const maxPlayers = reg.max_players || 0;
      const totalBudget = maxPlayers * Number(reg.registration_amount || 0);
      const hostName = reg.created_by ? reg.created_by.slice(0, 8) : "Organizer";
      const formattedDate = reg.created_at
        ? new Date(reg.created_at).toLocaleDateString()
        : "N/A";

      return (
        <Animated.View
          entering={FadeInDown.delay(Math.min(index * 20, 200)).duration(200)}
        >
          <View style={styles.card}>
            {/* Card Header & Avatar */}
            <View style={styles.cardHeader}>
              <View style={styles.avatarContainer}>
                {reg.avatar_url ? (
                  <Image source={{ uri: reg.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="trophy-outline" size={24} color="#64748B" />
                  </View>
                )}
                {reg.tournament_type && (
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>
                      {reg.tournament_type.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.cardHeaderInfo}>
                <Text numberOfLines={1} style={styles.titleText}>
                  {reg.name}
                </Text>
                <Text style={styles.subText}>Host ID: {hostName}</Text>
              </View>
            </View>

            {/* Metrics Section */}
            <View style={styles.metricsBox}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Total Prize</Text>
                <Text style={[styles.metricValue, styles.primaryText]}>
                  KES {new Intl.NumberFormat("en-KE").format(totalBudget)}
                </Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Entry Fee</Text>
                <Text style={[styles.metricValue, styles.primaryText]}>
                  KES {reg.registration_amount}
                </Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Max Squads</Text>
                <Text style={styles.metricValue}>{maxPlayers || "N/A"}</Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Created</Text>
                <Text style={styles.metricValue}>{formattedDate}</Text>
              </View>
            </View>

            {/* Actions Bar */}
            <View style={styles.actionRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.shareBtn,
                  pressed && styles.pressedState,
                ]}
                onPress={() => handleShare(reg)}
              >
                <Ionicons name="share-social-outline" size={16} color="#2563EB" />
                <Text style={styles.shareBtnText}>Invite</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.registerBtn,
                  pressed && styles.pressedState,
                ]}
                onPress={() => router.push(`/registration/${reg.id}` as any)}
              >
                <Text style={styles.registerBtnText}>Register Squad</Text>
                <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      );
    },
    [handleShare, router]
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header Bar */}
      <LinearGradient
        colors={["#1E3A8A", "#2563EB", "#7C3AED"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerRow}>
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressedState,
              ]}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.headerTitle}>Kenya eFootball</Text>
              <Text style={styles.headerSubtitle}>Active Registrations</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.refreshBtn,
                pressed && styles.pressedState,
              ]}
              onPress={fetchRegistrations}
              disabled={loading}
            >
              <Ionicons name="reload" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBarContainer}>
            <Ionicons
              name="search"
              size={16}
              color="#94A3B8"
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search registrations..."
              placeholderTextColor="#94A3B8"
              value={searchTerm}
              onChangeText={setSearchTerm}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchTerm.length > 0 && (
              <Pressable onPress={() => setSearchTerm("")}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Main Content */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <View style={styles.contentContainer}>

          {/* List Section */}
          {filteredRegistrations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="football-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyText}>
                {searchTerm
                  ? "No registrations match your search."
                  : "No active registrations found."}
              </Text>
            </View>
          ) : (
            <FlashList
              data={filteredRegistrations}
              estimatedItemSize={190}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listPadding}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderRegistrationCard}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  contentContainer: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  backButton: {
    padding: 4,
    width: 36,
    alignItems: "flex-start",
  },
  headerTitleGroup: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#E0E7FF",
    fontWeight: "500",
    marginTop: 1,
  },
  refreshBtn: {
    padding: 6,
    width: 36,
    alignItems: "flex-end",
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    marginTop: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
  },
  bannerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  bannerCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  bannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E3A8A",
    textTransform: "uppercase",
  },
  bannerNoticeText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 16,
    marginBottom: 12,
  },
  createBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  listPadding: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  /* Card Styles */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  typeBadge: {
    position: "absolute",
    bottom: -4,
    alignSelf: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  typeBadgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
  },
  cardHeaderInfo: {
    flex: 1,
  },
  titleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  subText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  metricsBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 8,
  },
  metricItem: {
    width: "48%",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
  },
  primaryText: {
    color: "#2563EB",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  shareBtnText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },
  registerBtn: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  registerBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  pressedState: {
    opacity: 0.7,
  },
});