import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { useGameStore } from '../src/stores/gameStore';

export default function HomeScreen() {
  const { user, signOut } = useAuthStore();
  const { setUserId } = useGameStore();
  const [roomCode, setRoomCode] = useState('');

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    } else {
      setUserId(user.id);
    }
  }, [user]);

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const handleQuickPlay = () => {
    router.push({ pathname: '/lobby', params: { mode: 'quickplay' } }); 
  };

  const handleJoinPrivate = () => {
    if (roomCode.trim()) {
      router.push({ pathname: '/lobby', params: { mode: 'private', code: roomCode.trim() } });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.layout}>
        {/* Left side - Branding */}
        <View style={styles.brandingSide}>
          <Text style={styles.title}>HollowVeil</Text>
          <Text style={styles.subtitle}>Welcome, {user.user_metadata?.display_name || user.email}</Text>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Right side - Actions */}
        <View style={styles.actionSide}>
          <View style={styles.card}>
            <TouchableOpacity style={styles.buttonPrimary} onPress={handleQuickPlay}>
              <Text style={styles.buttonText}>Quick Play</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TextInput
              style={styles.input}
              placeholder="Room Code"
              placeholderTextColor="#666"
              value={roomCode}
              onChangeText={setRoomCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.buttonSecondary} onPress={handleJoinPrivate}>
              <Text style={styles.buttonText}>Join Private Room</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  layout: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  brandingSide: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingRight: 20 },
  actionSide: { flex: 1, justifyContent: 'center', paddingLeft: 20 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#e0e0e0', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#aaa', marginBottom: 20 },
  card: { backgroundColor: '#1a1a2e', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4a' },
  buttonPrimary: { backgroundColor: '#7c3aed', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonSecondary: { backgroundColor: '#3b82f6', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#2a2a4a', marginVertical: 16 },
  input: { backgroundColor: '#0a0a0f', color: '#e0e0e0', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#2a2a4a', textAlign: 'center', fontSize: 18, letterSpacing: 2 },
  signOutButton: { marginTop: 10 },
  signOutText: { color: '#dc2626', fontSize: 14 },
});
