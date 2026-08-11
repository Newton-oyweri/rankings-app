import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

export interface TournamentRegistration {
  id?: number;
  team_name: string;
  username: string;
  whatsapp: string;
  registration_id: number;
  user_id: string | null;
  status: string;
  created_at?: string;
}

export interface RegistrationDetail {
  id: number;
  name: string;
  tournament_type: string | null;
  max_players: number | null;
  registration_amount: number;
}

export default function SpecificRegistrationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [reg, setReg] = useState<RegistrationDetail | null>(null);
  const [teams, setTeams] = useState<TournamentRegistration[]>([]);

  // Form inputs
  const [formData, setFormData] = useState({
    team_name: "",
    username: "",
    whatsapp: "+254",
  });

  const getTournamentTypeLabel = (type: string | null) => {
    if (!type) return "Custom Tournament";
    const types: Record<string, string> = {
      single_elimination: "Single Elimination",
      round_robin_single: "Round Robin (Single)",
      round_robin_double: "Round Robin (Double)",
      double_elimination: "Double Elimination",
    };
    return types[type] || type.replace(/_/g, " ").toUpperCase();
  };

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    try {
      // 1. Fetch current auth user
      const {
        data: { user: userData },
      } = await supabase.auth.getUser();
      setUser(userData || null);

      // 2. Fetch specific registration tournament details
      const { data: regData, error: regError } = await supabase
        .from("registrations")
        .select("id, name, tournament_type, max_players, registration_amount")
        .eq("id", id)
        .single();

      if (regError) throw regError;
      setReg(regData);

      // 3. Fetch enlisted teams for this registration
      const { data: teamsData, error: teamsError } = await supabase
        .from("tournament_registrations")
        .select("*")
        .eq("registration_id", id)
        .order("created_at", { ascending: true });

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);
    } catch (err: any) {
      console.error("Fetch Specific Registration Error:", err.message);
      Alert.alert("Error", err.message || "Failed to load tournament details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived variables
  const userReg = useMemo(() => {
    return teams.find((team) => team.user_id === user?.id);
  }, [teams, user]);

  const isFull = useMemo(() => {
    return teams.length >= (reg?.max_players || 0);
  }, [teams, reg]);
const handleSubmit = async () => {
  if (!reg) return;

  // 1. Check authentication first
  if (!user) {
    router.push('/sign-in');
    return;
  }

  // 2. Perform validations
  if (!formData.team_name.trim() || !formData.username.trim()) {
    Alert.alert("Validation Error", "Please fill in all required fields.");
    return;
  }

  const cleanedWhatsapp = formData.whatsapp.replace(/\s+/g, "");
  const whatsappRegex = /^\+\d{10,15}$/;
  if (!whatsappRegex.test(cleanedWhatsapp)) {
    Alert.alert("Invalid Phone", "Please enter a valid WhatsApp number starting with country code (e.g., +254700000000)");
    return;
  }

  if (isFull) {
    Alert.alert("Tournament Full", `${reg.name} is full! Maximum ${reg.max_players} teams allowed.`);
    return;
  }

  if (userReg) {
    Alert.alert("Already Registered", `You are already registered for ${reg.name}.`);
    return;
  }

  setSubmitting(true);

  try {
    const { data: inserted, error } = await supabase
      .from("tournament_registrations")
      .insert([
        {
          team_name: formData.team_name.trim(),
          username: formData.username.trim(),
          whatsapp: cleanedWhatsapp,
          registration_id: reg.id,
          user_id: user.id,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    Alert.alert("Success", "Registration Submitted Successfully!");
    setTeams((prev) => [inserted, ...prev]);
    setFormData({ team_name: "", username: "", whatsapp: "+254" });

    setTimeout(() => {
      fetchData();
    }, 2000);
  } catch (err: any) {
    Alert.alert("Registration Error", err.message || "An unexpected error occurred.");
  } finally {
    setSubmitting(false);
  }
};

  const renderTeamItem = useCallback(
    ({ item: team, index }: { item: TournamentRegistration; index: number }) => {
      const isConfirmed = team.status === "confirmed";
      return (
        <Animated.View entering={FadeInDown.delay(Math.min(index * 20, 200)).duration(200)}>
          <View style={styles.teamCard}>
            <View style={styles.teamLeft}>
              <View style={styles.indexBadge}>
                <Text style={styles.indexText}>{index + 1}</Text>
              </View>
              <View>
                <Text style={styles.teamName}>{team.team_name}</Text>
                <Text style={styles.usernameText}>@{team.username}</Text>
              </View>
            </View>

            <View style={[styles.statusBadge, isConfirmed ? styles.statusConfirmed : styles.statusPending]}>
              <Text style={[styles.statusBadgeText, isConfirmed ? styles.statusConfirmedText : styles.statusPendingText]}>
                {team.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </Animated.View>
      );
    },
    []
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient colors={["#1E3A8A", "#2563EB", "#7C3AED"]} style={styles.headerGradient}>
          <SafeAreaView edges={["top"]}>
            <View style={styles.headerRow}>
              <Pressable onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.headerTitle}>Tournament Details</Text>
              <View style={{ width: 36 }} />
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </View>
    );
  }

  if (!reg) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient colors={["#1E3A8A", "#2563EB", "#7C3AED"]} style={styles.headerGradient}>
          <SafeAreaView edges={["top"]}>
            <View style={styles.headerRow}>
              <Pressable onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.headerTitle}>Not Found</Text>
              <View style={{ width: 36 }} />
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={56} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Tournament Not Found</Text>
          <Pressable style={styles.homeBtn} onPress={() => router.replace("/" as any)}>
            <Text style={styles.homeBtnText}>Go Back Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient colors={["#1E3A8A", "#2563EB", "#7C3AED"]} style={styles.headerGradient}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerRow}>
            <Pressable
              style={({ pressed }) => [styles.backButton, pressed && styles.pressedState]}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
            <View style={styles.headerTitleGroup}>
              <Text numberOfLines={1} style={styles.headerTitle}>
                {reg.name}
              </Text>
              <Text style={styles.headerSubtitle}>
                Format: {getTournamentTypeLabel(reg.tournament_type)}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.refreshBtn, pressed && styles.pressedState]}
              onPress={fetchData}
              disabled={loading}
            >
              <Ionicons name="reload" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
          {/* Registration Form / Status Container */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              {userReg ? "Your Registration Status" : "Join Tournament"}
            </Text>

            {userReg ? (
              <View style={styles.registeredBox}>
                <View style={styles.checkIconWrapper}>
                  <Ionicons name="checkmark-circle" size={52} color="#16A34A" />
                </View>
                <Text style={styles.registeredTeamName}>{userReg.team_name}</Text>
                <Text style={styles.registeredUsername}>@{userReg.username}</Text>
                <View style={styles.registeredBadge}>
                  <Text style={styles.registeredBadgeText}>{userReg.status.toUpperCase()}</Text>
                </View>
              </View>
            ) : isFull ? (
              <View style={styles.fullBox}>
                <Ionicons name="warning-outline" size={48} color="#D97706" />
                <Text style={styles.fullTitle}>Tournament Full</Text>
                <Text style={styles.fullSubText}>
                  Maximum quota of {reg.max_players} teams reached.
                </Text>
              </View>
            ) : (
              <View style={styles.formGroup}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>TEAM NAME</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your team name"
                    placeholderTextColor="#94A3B8"
                    value={formData.team_name}
                    onChangeText={(text) => setFormData({ ...formData, team_name: text })}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>USERNAME</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Choose a username"
                    placeholderTextColor="#94A3B8"
                    value={formData.username}
                    onChangeText={(text) => setFormData({ ...formData, username: text })}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>WHATSAPP CONTACT</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+254 700 000000"
                    placeholderTextColor="#94A3B8"
                    value={formData.whatsapp}
                    onChangeText={(text) => setFormData({ ...formData, whatsapp: text })}
                    keyboardType="phone-pad"
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.submitBtn,
                    submitting && styles.disabledBtn,
                    pressed && styles.pressedState,
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  <LinearGradient
                    colors={["#667EEA", "#764BA2"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtnGradient}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        Register - KES {reg.registration_amount}
                      </Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            )}
          </View>

          {/* Enlisted Teams Section */}
          <View style={styles.sectionCard}>
            <View style={styles.teamsHeaderRow}>
              <Text style={styles.sectionTitle}>Enlisted Teams</Text>
              <View style={styles.teamCountBadge}>
                <Text style={styles.teamCountText}>{teams.length}</Text>
              </View>
            </View>

            {teams.length === 0 ? (
              <View style={styles.emptyTeamsBox}>
                <Ionicons name="game-controller-outline" size={44} color="#94A3B8" />
                <Text style={styles.emptyTeamsTitle}>No teams registered yet</Text>
                <Text style={styles.emptyTeamsSub}>Be the first to secure your slot!</Text>
              </View>
            ) : (
              <View style={styles.teamsListWrapper}>
                <FlashList
                  data={teams}
                  estimatedItemSize={60}
                  scrollEnabled={false}
                  keyExtractor={(item, idx) => item.id?.toString() || idx.toString()}
                  renderItem={renderTeamItem}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollPadding: {
    padding: 16,
    gap: 16,
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
    flex: 1,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
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
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E3A8A",
    marginBottom: 12,
  },
  formGroup: {
    gap: 12,
  },
  inputContainer: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F172A",
  },
  submitBtn: {
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 6,
  },
  submitBtnGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  disabledBtn: {
    opacity: 0.6,
  },
  registeredBox: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 6,
  },
  checkIconWrapper: {
    marginBottom: 4,
  },
  registeredTeamName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  registeredUsername: {
    fontSize: 13,
    color: "#64748B",
  },
  registeredBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  registeredBadgeText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "700",
  },
  fullBox: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 4,
  },
  fullTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 4,
  },
  fullSubText: {
    fontSize: 12,
    color: "#64748B",
  },
  teamsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  teamCountBadge: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  teamCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  teamsListWrapper: {
    minHeight: 100,
  },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  teamLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  indexBadge: {
    width: 28,
    alignItems: "center",
  },
  indexText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
  teamName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  usernameText: {
    fontSize: 12,
    color: "#64748B",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusConfirmed: {
    backgroundColor: "#DCFCE7",
  },
  statusPending: {
    backgroundColor: "#FEF3C7",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  statusConfirmedText: {
    color: "#15803D",
  },
  statusPendingText: {
    color: "#B45309",
  },
  emptyTeamsBox: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 4,
  },
  emptyTeamsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 4,
  },
  emptyTeamsSub: {
    fontSize: 12,
    color: "#94A3B8",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  homeBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  homeBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  pressedState: {
    opacity: 0.7,
  },
});