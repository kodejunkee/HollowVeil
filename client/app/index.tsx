import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
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
    <View style={styles.container}>
      <Text style={styles.title}>HollowVeil</Text>
      <Text style={styles.subtitle}>Welcome, {user.user_metadata?.display_name || user.email}</Text>

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
        />
        <TouchableOpacity style={styles.buttonSecondary} onPress={handleJoinPrivate}>
          <Text style={styles.buttonText}>Join Private Room</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#0a0a0f' },
  title: { fontSize: 36, fontWeight: 'bold', color: '#e0e0e0', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#aaa', textAlign: 'center', marginBottom: 40 },
  card: { backgroundColor: '#1a1a2e', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4a' },
  buttonPrimary: { backgroundColor: '#7c3aed', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonSecondary: { backgroundColor: '#3b82f6', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#2a2a4a', marginVertical: 20 },
  input: { backgroundColor: '#0a0a0f', color: '#e0e0e0', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#2a2a4a', textAlign: 'center', fontSize: 18, letterSpacing: 2 },
  signOutButton: { marginTop: 40, alignItems: 'center' },
  signOutText: { color: '#dc2626', fontSize: 16 }
});
