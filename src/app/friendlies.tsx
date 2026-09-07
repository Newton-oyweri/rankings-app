import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import CreateFriendlyTab from '@/components/friendlies/CreateFriendlyTab';
import OpenChallengesTab, { FriendlyRequest } from '@/components/friendlies/OpenChallengesTab';
import { supabase } from '@/lib/supabase';

export default function FriendliesScreen() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'open' | 'create'>('open');

  // List State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<FriendlyRequest[]>([]);

  // Get current logged-in user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUserId(data.user.id);
    });
  }, []);

  // Fetch all pending open challenges
  const fetchOpenChallenges = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('friendly_match_requests')
        .select(`
          id,
          requester_id,
          opponent_id,
          amount,
          status,
          created_at,
          requester:profiles!friendly_match_requests_requester_fkey(id, username, display_name, profile_pic),
          opponent:profiles!friendly_match_requests_opponent_fkey(id, username, display_name, profile_pic)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as unknown as FriendlyRequest[]) || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'open') {
      fetchOpenChallenges();
    }
  }, [activeTab, fetchOpenChallenges]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOpenChallenges();
  };

  const handleMatchCreated = () => {
    setActiveTab('open');
    fetchOpenChallenges();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Friendlies</Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tabItem, activeTab === 'open' && styles.activeTab]}
            onPress={() => setActiveTab('open')}
          >
            <Text style={[styles.tabText, activeTab === 'open' && styles.activeTabText]}>
              Open Challenges
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabItem, activeTab === 'create' && styles.activeTab]}
            onPress={() => setActiveTab('create')}
          >
            <Text style={[styles.tabText, activeTab === 'create' && styles.activeTabText]}>
              Create Friendly Match
            </Text>
          </Pressable>
        </View>

        {/* Tab Content */}
        {activeTab === 'open' ? (
          <OpenChallengesTab
            loading={loading}
            refreshing={refreshing}
            requests={requests}
            onRefresh={handleRefresh}
          />
        ) : (
          <CreateFriendlyTab
            currentUserId={currentUserId}
            onSuccess={handleMatchCreated}
          />
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: StatusBar.currentHeight || 10,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#2563EB',
    fontWeight: '700',
  },
});