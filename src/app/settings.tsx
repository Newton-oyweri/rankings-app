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
  StatusBar,
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
  'Kisumu', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira', 'Nairobi',
];

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [county, setCounty] = useState('');

  const [isGenderLocked, setIsGenderLocked] = useState(false);
  const [isCountyLocked, setIsCountyLocked] = useState(false);

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
        setPhone(profile.phone || '');
        setGender(profile.gender || '');
        setCounty(profile.county || '');
        setIsGenderLocked(!!profile.gender);
        setIsCountyLocked(!!profile.county);
      }
    } catch (e: any) {
      console.error('fetchProfile error:', e?.message ?? e);
    } finally {
      setLoading(false);
    }
  };

  const handlePickAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        console.warn('Gallery permission denied');
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

      setProfilePic(publicUrlData.publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err?.message ?? err);
    } finally {
      setUploadingImage(false);
    }
  };

  const formatPhoneNumber = (phoneNumber: string): string => {
    let formatted = phoneNumber.trim().replace(/\s/g, '');
    
    if (!formatted) return '';

    // If it starts with 0, replace with +254
    if (formatted.startsWith('0')) {
      formatted = '+254' + formatted.substring(1);
    }
    // If it starts with 254 (without +), add +
    else if (formatted.startsWith('254') && !formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }
    // If it doesn't start with + and doesn't match above patterns
    else if (!formatted.startsWith('+')) {
      formatted = '+254' + formatted;
    }

    return formatted;
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const formattedPhone = formatPhoneNumber(phone);

      const updates = {
        id: user.id,
        display_name: displayName.trim(),
        username: username.trim(),
        phone: formattedPhone || null,
        gender: gender || null,
        county: county || null,
        profile_pic: profilePic,
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        console.error('Save failed:', error.message);
        Alert.alert('Error', 'Failed to save profile: ' + error.message);
      } else {
        setPhone(formattedPhone);
        if (gender) setIsGenderLocked(true);
        if (county) setIsCountyLocked(true);
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } catch (e: any) {
      console.error('handleSaveProfile error:', e?.message ?? e);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
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
              console.error('Error signing out:', error.message);
              return;
            }
            router.replace('/(tabs)');
          } catch (e: any) {
            console.error('Sign out error:', e?.message ?? e);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ThemedText style={styles.title}>Edit Profile</ThemedText>

          {/* Avatar */}
          <Pressable onPress={handlePickAvatar} disabled={uploadingImage} style={styles.avatarWrap}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#9ca3af" />
              </View>
            )}
            {uploadingImage && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </Pressable>

          {/* Display Name */}
          <ThemedText style={styles.label}>Display Name</ThemedText>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter display name"
            placeholderTextColor="#9ca3af"
          />

          {/* Username */}
          <ThemedText style={styles.label}>Username</ThemedText>
          <View style={styles.row}>
            <ThemedText style={{ marginRight: 4 }}>@</ThemedText>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={username}
              onChangeText={setUsername}
              placeholder="username"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Phone Number */}
          <ThemedText style={styles.label}>Phone Number</ThemedText>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="0712345678 or +254712345678"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          <ThemedText style={styles.helperText}>
            Enter Kenyan phone number (starts with 0 or +254)
          </ThemedText>

          {/* Gender */}
          <ThemedText style={styles.label}>
            Gender {genderDisabled ? '(Locked)' : ''}
          </ThemedText>
          <View style={styles.row}>
            {['Male', 'Female'].map((option) => (
              <Pressable
                key={option}
                disabled={genderDisabled}
                onPress={() => setGender(option)}
                style={styles.radio}
              >
                <Ionicons
                  name={gender === option ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={gender === option ? '#3B82F6' : '#9ca3af'}
                />
                <ThemedText style={{ marginLeft: 6 }}>{option}</ThemedText>
              </Pressable>
            ))}
          </View>

          {/* County */}
          <ThemedText style={styles.label}>
            County {countyDisabled ? '(Locked)' : ''}
          </ThemedText>
          <Pressable
            disabled={countyDisabled}
            onPress={() => setCountyModalVisible(true)}
            style={styles.input}
          >
            <ThemedText>{county || 'Select your county'}</ThemedText>
          </Pressable>

          {/* Save */}
          <Pressable
            style={[styles.button, saving && { opacity: 0.6 }]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Save Changes</ThemedText>
            )}
          </Pressable>

          {/* Sign Out */}
          <Pressable
            style={[styles.signOut, signingOut && { opacity: 0.6 }]}
            onPress={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <ActivityIndicator color="#EF4444" />
            ) : (
              <ThemedText style={{ color: '#EF4444', fontWeight: '700' }}>
                Sign Out
              </ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* County Modal */}
      <Modal visible={countyModalVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.title}>Select County</ThemedText>
              <Pressable onPress={() => setCountyModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Search county..."
              placeholderTextColor="#9ca3af"
              value={countySearch}
              onChangeText={setCountySearch}
              autoCorrect={false}
            />

            <FlatList
              data={filteredCounties}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={styles.countyItem}
                  onPress={() => {
                    setCounty(item);
                    setCountyModalVisible(false);
                    setCountySearch('');
                  }}
                >
                  <ThemedText style={county === item ? { color: '#3B82F6', fontWeight: '700' } : undefined}>
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
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: Spacing.four, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  radio: { flexDirection: 'row', alignItems: 'center', marginRight: 20, paddingVertical: 8 },
  avatarWrap: { alignSelf: 'center', marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  signOut: {
    marginTop: 24,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 60,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  countyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
});