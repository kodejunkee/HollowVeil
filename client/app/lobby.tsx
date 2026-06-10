import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useGameStore } from '../src/stores/gameStore';
import { useAuthStore } from '../src/stores/authStore';
import { wsClient } from '../src/services/websocket';
import { router, useLocalSearchParams } from 'expo-router';

export default function LobbyScreen() {
  const { session } = useAuthStore();
  const { players, phase, updateState, myUserId, reset, isHost } = useGameStore();
  const [loading, setLoading] = useState(true);
  const params = useLocalSearchParams();

  // Hardcoded for Android emulator. In production, use environment variables.
  const SERVER_URL = 'http://10.0.2.2:8000';
  const WS_URL = 'ws://10.0.2.2:8000';

  useEffect(() => {
    let mounted = true;

    const connectToGame = async () => {
      try {
        let roomId = '';
        if (params.mode === 'private' && params.code) {
           // Wait, do we have an API to resolve code -> room_id?
           // Currently we don't have an API to join by code. 
           // I'll assume we can't join private rooms via code yet for Phase 2 prototype.
           throw new Error("Joining by code not implemented in backend yet");
        } else {
           // Quickplay fetch
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

    return () => {
      mounted = false;
      // Note: we don't disconnect here because we want to keep the connection when navigating to /game
    };
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
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={{color: '#e0e0e0', marginTop: 10}}>Finding match...</Text>
      </View>
    );
  }

  const me = players.find(p => p.user_id === myUserId);
  const isReady = me?.is_ready || false;
  
  const readyCount = players.filter(p => p.is_ready).length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lobby</Text>
      <Text style={styles.subtitle}>Players: {players.length}/12</Text>

      <ScrollView style={styles.playerList}>
        {players.map((p, index) => (
          <View key={index} style={styles.playerRow}>
            <Text style={styles.playerName}>{p.display_name} {p.user_id === myUserId ? '(You)' : ''}</Text>
            <View style={[styles.statusIndicator, { backgroundColor: p.is_ready ? '#10b981' : '#6b7280' }]} />
          </View>
        ))}
      </ScrollView>

      <View style={styles.controls}>
        <TouchableOpacity style={[styles.button, { backgroundColor: isReady ? '#6b7280' : '#7c3aed' }]} onPress={handleToggleReady}>
          <Text style={styles.buttonText}>{isReady ? 'Unready' : 'Ready'}</Text>
        </TouchableOpacity>

        {isHost && (
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: readyCount >= 8 ? '#3b82f6' : '#1e3a8a' }]} 
            onPress={handleStartGame}
            disabled={readyCount < 8}
          >
            <Text style={styles.buttonText}>Start Game</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.button, { backgroundColor: '#dc2626' }]} onPress={handleLeave}>
          <Text style={styles.buttonText}>Leave</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#e0e0e0', textAlign: 'center', marginTop: 40 },
  subtitle: { fontSize: 16, color: '#aaa', textAlign: 'center', marginBottom: 20 },
  playerList: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 10, padding: 10 },
  playerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  playerName: { color: '#e0e0e0', fontSize: 18 },
  statusIndicator: { width: 15, height: 15, borderRadius: 7.5 },
  controls: { marginTop: 20, gap: 10 },
  button: { padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
