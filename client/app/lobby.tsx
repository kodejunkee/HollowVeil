import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../src/stores/gameStore';
import { useAuthStore } from '../src/stores/authStore';
import { wsClient } from '../src/services/websocket';
import { router, useLocalSearchParams } from 'expo-router';

export default function LobbyScreen() {
  const { session } = useAuthStore();
  const { players, phase, updateState, myUserId, reset, isHost, lobbyCountdown } = useGameStore();
  const [loading, setLoading] = useState(true);
  const params = useLocalSearchParams();

  const SERVER_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.103.2.13:8000';

  useEffect(() => {
    let mounted = true;

    const connectToGame = async () => {
      try {
        let roomId = '';
        if (params.mode === 'private' && params.code) {
           const res = await fetch(`${SERVER_URL}/api/rooms/join?token=${session.access_token}`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ room_code: params.code })
           });
           if (!res.ok) {
             const errorText = await res.text();
             throw new Error(`Failed to join (Status ${res.status}): ${errorText}`);
           }
           const data = await res.json();
           roomId = data.room_id;
        } else {
           const res = await fetch(`${SERVER_URL}/api/rooms/quickplay?token=${session.access_token}`, {
             method: 'POST'
           });
           if (!res.ok) throw new Error('Failed to join quickplay');
           const data = await res.json();
           roomId = data.room_id;
        }
        
        wsClient.onMessage = (msg) => {
          if (mounted) {
            updateState(msg);
            if (msg.type === 'phase_changed' && msg.phase !== 'LOBBY') {
              router.replace('/game');
            }
          }
        };

        wsClient.connect(SERVER_URL, roomId, session.access_token);
        setLoading(false);
      } catch (err) {
        console.error(err);
        if (mounted) setLoading(false);
      }
    };

    connectToGame();
    return () => { mounted = false; };
  }, []);

  const handleToggleReady = () => {
    const me = players.find(p => p.user_id === myUserId);
    if (me) {
      wsClient.send('lobby_ready', { is_ready: !me.is_ready });
    }
  };

  const handleStartGame = () => {
    wsClient.send('lobby_start');
  };

  const handleLeave = () => {
    wsClient.disconnect();
    reset();
    router.replace('/');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: '#e0e0e0', marginTop: 10 }}>Finding match...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const me = players.find(p => p.user_id === myUserId);
  const isReady = me?.is_ready || false;
  const readyCount = players.filter(p => p.is_ready).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top countdown bar */}
      {lobbyCountdown !== null && (
        <View style={styles.countdownBar}>
          <Text style={styles.countdownText}>Game starting in {lobbyCountdown}...</Text>
        </View>
      )}

      <View style={styles.layout}>
        {/* Left side - Player list */}
        <View style={styles.playerSide}>
          <View style={styles.playerHeader}>
            <Text style={styles.title}>Lobby</Text>
            <Text style={styles.subtitle}>Players: {players.length}/12</Text>
          </View>
          <ScrollView style={styles.playerList}>
            {players.map((p, index) => (
              <View key={index} style={styles.playerRow}>
                <Text style={styles.playerName}>
                  {p.display_name} {p.user_id === myUserId ? '(You)' : ''}
                </Text>
                <View style={[styles.statusDot, { backgroundColor: p.is_ready ? '#10b981' : '#6b7280' }]} />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Right side - Controls */}
        <View style={styles.controlSide}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: isReady ? '#dc2626' : '#7c3aed' }]}
            onPress={handleToggleReady}
          >
            <Text style={styles.buttonText}>{isReady ? 'Cancel' : 'Ready'}</Text>
          </TouchableOpacity>

          {isHost && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: readyCount >= 8 ? '#3b82f6' : '#1e3a8a', opacity: readyCount < 8 ? 0.5 : 1 }]}
              onPress={handleStartGame}
              disabled={readyCount < 8}
            >
              <Text style={styles.buttonText}>Start Game</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: isReady ? '#4b5563' : '#dc2626' }]}
            onPress={handleLeave}
            disabled={isReady}
          >
            <Text style={styles.buttonText}>Leave</Text>
          </TouchableOpacity>

          <Text style={styles.readyInfo}>{readyCount}/{players.length} Ready</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  layout: { flex: 1, flexDirection: 'row', padding: 16, gap: 16 },
  countdownBar: { backgroundColor: '#7c3aed', paddingVertical: 10, alignItems: 'center' },
  countdownText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // Left - players
  playerSide: { flex: 2 },
  playerHeader: { marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#e0e0e0' },
  subtitle: { fontSize: 14, color: '#aaa', marginTop: 2 },
  playerList: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 10, padding: 8 },
  playerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  playerName: { color: '#e0e0e0', fontSize: 15 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },

  // Right - controls
  controlSide: { flex: 1, justifyContent: 'center', gap: 12 },
  button: { padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  readyInfo: { color: '#aaa', textAlign: 'center', fontSize: 13, marginTop: 4 },
});
