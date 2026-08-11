import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const KENYAN_COUNTIES = [
  'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita-Taveta',
  'Garissa', 'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru',
  'Tharaka-Nithi', 'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua',
  'Nyeri', 'Kirinyaga', "Murang'a", 'Kiambu', 'Turkana', 'West Pokot',
  'Samburu', 'Trans Nzoia', 'Uasin Gishu', 'Elgeyo-Marakwet', 'Nandi',
  'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado', 'Kericho',
  'Bomet', 'Kakamega', 'Vihiga', 'Bungoma', 'Busia', 'Siaya',
  'Kisumu', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira', 'Nairobi'
];

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Form State
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState('');
  const [county, setCounty] = useState('');

  // Lock State
  const [isGenderLocked, setIsGenderLocked] = useState(false);
  const [isCountyLocked, setIsCountyLocked] = useState(false);

  // Modal Picker State
  const [countyModalVisible, setCountyModalVisible] = useState(false);
  const [countySearch, setCountySearch] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/(auth)/sign-in');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error.message);
      }

      if (profile) {
        setProfilePic(profile.profile_pic || null);
        setDisplayName(profile.display_name || '');
        setUsername(profile.username || '');
        setGender(profile.gender || '');
        setCounty(profile.county || '');

        setIsGenderLocked(!!profile.gender);
        setIsCountyLocked(!!profile.county);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePickAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Permission to access gallery is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]?.uri) return;

      const image = result.assets[0];
      setUploadingImage(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = image.uri.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const response = await fetch(image.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;
      setProfilePic(publicUrl);
    } catch (err: any) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const updates = {
        id: user.id,
        display_name: displayName.trim(),
        username: username.trim(),
        gender,
        county,
        profile_pic: profilePic,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        Alert.alert('Save Failed', error.message);
      } else {
        Alert.alert('Success', 'Profile updated successfully.');
        if (gender) setIsGenderLocked(true);
        if (county) setIsCountyLocked(true);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            setSigningOut(true);
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert('Error signing out', error.message);
              return;
            }
            // Redirect to the (tabs) index route
            router.replace('/(tabs)');
          } catch (e: any) {
            Alert.alert('Error', e.message);
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  const filteredCounties = KENYAN_COUNTIES.filter((c) =>
    c.toLowerCase().includes(countySearch.toLowerCase())
  );

  const genderDisabled = isGenderLocked && !!gender;
  const countyDisabled = isCountyLocked && !!county;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <ThemedText style={styles.sectionTitle}>Edit Profile</ThemedText>

              {/* Avatar Section */}
              <View style={styles.avatarSection}>
                <Pressable style={styles.avatarWrapper} onPress={handlePickAvatar} disabled={uploadingImage}>
                  {profilePic ? (
                    <Image source={{ uri: profilePic }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={40} color="#9ca3af" />
                    </View>
                  )}
                  {uploadingImage ? (
                    <View style={styles.avatarLoadingOverlay}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    </View>
                  ) : (
                    <View style={styles.cameraIconBadge}>
                      <Ionicons name="camera" size={14} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              </View>

              {/* Security Info Banner */}
              {(genderDisabled || countyDisabled) && (
                <View style={styles.infoBanner}>
                  <Ionicons name="lock-closed" size={16} color="#1E40AF" style={{ marginRight: 6 }} />
                  <ThemedText style={styles.infoBannerText}>
                    Gender and County are locked once saved for security verification.
                  </ThemedText>
                </View>
              )}

              {/* Display Name */}
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>DISPLAY NAME</ThemedText>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Enter display name"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Username */}
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>USERNAME</ThemedText>
                <View style={styles.usernameInputWrapper}>
                  <ThemedText style={styles.atSymbol}>@</ThemedText>
                  <TextInput
                    style={styles.usernameInput}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="username"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Gender Radio */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <ThemedText style={styles.label}>GENDER</ThemedText>
                  {genderDisabled && (
                    <View style={styles.lockBadge}>
                      <Ionicons name="lock-closed" size={10} color="#6b7280" />
                      <ThemedText style={styles.lockBadgeText}>Locked</ThemedText>
                    </View>
                  )}
                </View>
                <View style={styles.radioRow}>
                  {['Male', 'Female'].map((option) => (
                    <Pressable
                      key={option}
                      style={[
                        styles.radioButton,
                        gender === option && styles.radioButtonSelected,
                        genderDisabled && styles.disabledOption,
                      ]}
                      disabled={genderDisabled}
                      onPress={() => setGender(option)}
                    >
                      <Ionicons
                        name={gender === option ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={gender === option ? '#3B82F6' : '#9ca3af'}
                      />
                      <ThemedText
                        style={[
                          styles.radioText,
                          gender === option && styles.radioTextSelected,
                        ]}
                      >
                        {option}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* County Selection */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <ThemedText style={styles.label}>COUNTY</ThemedText>
                  {countyDisabled && (
                    <View style={styles.lockBadge}>
                      <Ionicons name="lock-closed" size={10} color="#6b7280" />
                      <ThemedText style={styles.lockBadgeText}>Locked</ThemedText>
                    </View>
                  )}
                </View>
                <Pressable
                  style={[styles.selectInput, countyDisabled && styles.disabledOption]}
                  disabled={countyDisabled}
                  onPress={() => setCountyModalVisible(true)}
                >
                  <ThemedText style={county ? styles.selectValue : styles.selectPlaceholder}>
                    {county || 'Select your county'}
                  </ThemedText>
                  <Ionicons
                    name={countyDisabled ? 'lock-closed' : 'chevron-down'}
                    size={18}
                    color="#6b7280"
                  />
                </Pressable>
              </View>

              {/* Save Button */}
              <Pressable
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
                )}
              </Pressable>
            </View>

            {/* Bottom Sign Out Button */}
            <View style={styles.signOutContainer}>
              <Pressable
                style={[styles.signOutButton, signingOut && styles.disabledButton]}
                onPress={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                    <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* County Search Modal */}
      <Modal visible={countyModalVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select County</ThemedText>
              <Pressable onPress={() => setCountyModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color="#1a1a2e" />
              </Pressable>
            </View>

            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search county..."
              placeholderTextColor="#9ca3af"
              value={countySearch}
              onChangeText={setCountySearch}
              autoCorrect={false}
            />

            <FlatList
              data={filteredCounties}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.countyItem}
                  onPress={() => {
                    setCounty(item);
                    setCountyModalVisible(false);
                    setCountySearch('');
                  }}
                >
                  <ThemedText
                    style={[
                      styles.countyItemText,
                      county === item && styles.selectedCountyText,
                    ]}
                  >
                    {item}
                  </ThemedText>
                  {county === item && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
                </Pressable>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.four,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3B82F6',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  infoBannerText: {
    fontSize: 12,
    color: '#1E40AF',
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 6,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  lockBadgeText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F8F9FC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a2e',
  },
  usernameInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  atSymbol: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a2e',
  },
  radioRow: {
    flexDirection: 'row',
    gap: 16,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  radioButtonSelected: {},
  radioText: {
    fontSize: 14,
    color: '#6b7280',
  },
  radioTextSelected: {
    color: '#1a1a2e',
    fontWeight: '700',
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectValue: {
    fontSize: 14,
    color: '#1a1a2e',
  },
  selectPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
  },
  disabledOption: {
    backgroundColor: '#E5E7EB',
    opacity: 0.7,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  signOutContainer: {
    marginTop: 24,
    marginBottom: 40,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingVertical: 14,
  },
  signOutText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  modalSearchInput: {
    backgroundColor: '#F8F9FC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a2e',
    marginBottom: 12,
  },
  countyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  countyItemText: {
    fontSize: 15,
    color: '#1a1a2e',
  },
  selectedCountyText: {
    color: '#3B82F6',
    fontWeight: '700',
  },
});