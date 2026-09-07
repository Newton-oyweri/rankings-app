import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

interface Team {
  id: number;
  name: string;
}

export default function AddTeamScreen() {
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState<any>(null);
  const [teamCode, setTeamCode] = useState('');
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'danger' | ''; text: string }>({
    type: '',
    text: '',
  });

  // Confirmation modals
  const [pendingTeam, setPendingTeam] = useState<Team | null>(null);
  const [selectedTeamToRemove, setSelectedTeamToRemove] = useState<Team | null>(null);

  useEffect(() => {
    const getSessionAndTeams = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          await fetchMyTeams(session.user.id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setInitialLoading(false);
      }
    };

    getSessionAndTeams();
  }, []);

  const fetchMyTeams = async (userId: string) => {
    const { data, error } = await supabase
      .from('teams')
      .select('id, name')
      .eq('profile_id', userId);

    if (!error && data) {
      setMyTeams(data);
    }
  };

  // Step 1 – Verify team code
  const handleVerifyCode = async () => {
    if (!user) {
      setMessage({ type: 'danger', text: 'You must be logged in to claim a team.' });
      return;
    }

    if (!teamCode.trim()) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { data: team, error: fetchError } = await supabase
        .from('teams')
        .select('id, name, profile_id')
        .eq('team_code', teamCode.trim().toUpperCase())
        .single();

      if (fetchError || !team) {
        setMessage({ type: 'danger', text: 'Invalid team code.' });
        return;
      }

      if (team.profile_id) {
        setMessage({ type: 'danger', text: 'This team has already been claimed.' });
        return;
      }

      setPendingTeam({ id: team.id, name: team.name });
    } catch (err: any) {
      setMessage({ type: 'danger', text: 'An error occurred while verifying the code.' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Step 2 – Confirm claim
  const handleConfirmClaim = async () => {
    if (!pendingTeam || !user) return;

    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('teams')
        .update({ profile_id: user.id })
        .eq('id', pendingTeam.id);

      if (updateError) throw updateError;

      setMessage({ type: 'success', text: `Successfully claimed ${pendingTeam.name}!` });
      setTeamCode('');
      setPendingTeam(null);
      await fetchMyTeams(user.id);
    } catch (err: any) {
      setMessage({ type: 'danger', text: 'Failed to claim team. Please try again.' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Remove / unlink team
  const handleRemoveTeam = async () => {
    if (!selectedTeamToRemove || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('teams')
        .update({ profile_id: null })
        .eq('id', selectedTeamToRemove.id);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: `Removed ${selectedTeamToRemove.name} from your profile.`,
      });
      setSelectedTeamToRemove(null);
      await fetchMyTeams(user.id);
    } catch (err: any) {
      setMessage({ type: 'danger', text: 'Failed to remove team.' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={['#1E3A8A', '#2563EB', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 12) }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="people" size={22} color="#FFFFFF" />
          </View>
          <ThemedText style={styles.headerTitle}>My Teams</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Claim Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark" size={18} color="#2563EB" />
              <ThemedText style={styles.cardTitle}>Claim a New Team</ThemedText>
            </View>

            <ThemedText style={styles.cardSubtitle}>
              Enter the unique access code generated by your tournament admin to add to your
              Leaderboard Statistics.
            </ThemedText>

            <View style={styles.inputRow}>
              <View style={styles.inputWrapper}>
                <Ionicons name="key" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="ENTER TEAM CODE"
                  placeholderTextColor="#94A3B8"
                  value={teamCode}
                  onChangeText={setTeamCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              <Pressable
                style={[
                  styles.findButton,
                  (loading || !teamCode.trim()) && styles.findButtonDisabled,
                ]}
                onPress={handleVerifyCode}
                disabled={loading || !teamCode.trim()}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="search" size={16} color="#FFFFFF" />
                    <ThemedText style={styles.findButtonText}>Find</ThemedText>
                  </>
                )}
              </Pressable>
            </View>

            {message.text ? (
              <View
                style={[
                  styles.messageBox,
                  message.type === 'success' ? styles.messageSuccess : styles.messageDanger,
                ]}
              >
                <Ionicons
                  name={message.type === 'success' ? 'checkmark-circle' : 'warning'}
                  size={16}
                  color={message.type === 'success' ? '#059669' : '#DC2626'}
                />
                <ThemedText
                  style={[
                    styles.messageText,
                    { color: message.type === 'success' ? '#059669' : '#DC2626' },
                  ]}
                >
                  {message.text}
                </ThemedText>
              </View>
            ) : null}
          </View>

          {/* Teams List */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Linked Teams</ThemedText>
          </View>

          {myTeams.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="person-remove-outline" size={42} color="#94A3B8" />
              <ThemedText style={styles.emptyTitle}>No teams linked yet</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Get your team code from your admin
              </ThemedText>
            </View>
          ) : (
            <View style={styles.teamsList}>
              {myTeams.map((team) => (
                <Pressable
                  key={team.id}
                  style={styles.teamCard}
                  onPress={() => setSelectedTeamToRemove(team)}
                >
                  <View style={styles.teamIcon}>
                    <Ionicons name="game-controller" size={22} color="#2563EB" />
                  </View>

                  <View style={styles.teamInfo}>
                    <ThemedText style={styles.teamName} numberOfLines={1}>
                      {team.name}
                    </ThemedText>
                    <View style={styles.teamBadge}>
                      <ThemedText style={styles.teamBadgeText}>Team</ThemedText>
                    </View>
                  </View>

                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ========== MODAL 1: Confirm Claim ========== */}
      <Modal
        visible={!!pendingTeam}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingTeam(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrapper}>
              <Ionicons name="shield-checkmark" size={40} color="#2563EB" />
            </View>

            <ThemedText style={styles.modalTitle}>Confirm Team Claim</ThemedText>
            <ThemedText style={styles.modalSubtitle}>Are you sure you want to link to:</ThemedText>
            <ThemedText style={styles.modalTeamName}>{pendingTeam?.name}</ThemedText>
            <ThemedText style={styles.modalHint}>
              Once linked, this team's statistics will be associated with your account profile.
            </ThemedText>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setPendingTeam(null)}
                disabled={loading}
              >
                <ThemedText style={styles.modalBtnSecondaryText}>Cancel</ThemedText>
              </Pressable>

              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleConfirmClaim}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.modalBtnPrimaryText}>Yes, Claim Team</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========== MODAL 2: Remove Team ========== */}
      <Modal
        visible={!!selectedTeamToRemove}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTeamToRemove(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIconWrapper, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="warning" size={40} color="#DC2626" />
            </View>

            <ThemedText style={[styles.modalTitle, { color: '#DC2626' }]}>Remove Team</ThemedText>
            <ThemedText style={styles.modalSubtitle}>Remove team ownership for:</ThemedText>
            <ThemedText style={styles.modalTeamName}>{selectedTeamToRemove?.name}</ThemedText>
            <ThemedText style={styles.modalHint}>
              This will unbind the team from your profile so someone else can claim it or you can
              re-claim it later with the code.
            </ThemedText>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setSelectedTeamToRemove(null)}
                disabled={loading}
              >
                <ThemedText style={styles.modalBtnSecondaryText}>Cancel</ThemedText>
              </Pressable>

              <Pressable
                style={[styles.modalBtn, styles.modalBtnDanger]}
                onPress={handleRemoveTeam}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.modalBtnPrimaryText}>Remove Team</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  headerGradient: {
    paddingBottom: 14,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIcon: {
    width: 32,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  scrollContent: {
    padding: 16,
  },

  // Claim Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 14,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: 1,
  },
  findButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 44,
  },
  findButtonDisabled: {
    opacity: 0.5,
  },
  findButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  messageSuccess: {
    backgroundColor: '#ECFDF5',
  },
  messageDanger: {
    backgroundColor: '#FEF2F2',
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },

  // Teams section
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  teamsList: {
    gap: 10,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  teamIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  teamBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563EB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  teamBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalTeamName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 8,
    textAlign: 'center',
  },
  modalHint: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnSecondary: {
    backgroundColor: '#F1F5F9',
  },
  modalBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  modalBtnPrimary: {
    backgroundColor: '#2563EB',
  },
  modalBtnDanger: {
    backgroundColor: '#DC2626',
  },
  modalBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});