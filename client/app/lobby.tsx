import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../src/stores/gameStore';
import { useAuthStore } from '../src/stores/authStore';
import { wsClient } from '../src/services/websocket';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function LobbyScreen() {
  const { session } = useAuthStore();
  const { players, phase, updateState, myUserId, reset, isHost, lobbyCountdown, is_quick_play, roomCode } = useGameStore();
  const [loading, setLoading] = useState(true);
  const params = useLocalSearchParams();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const SERVER_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.133.42.13:8000';

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
        } else if (params.mode === 'create_private') {
           const res = await fetch(`${SERVER_URL}/api/rooms?token=${session.access_token}`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ is_private: true })
           });
           if (!res.ok) throw new Error('Failed to create private room');
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

  useEffect(() => {
    const me = players.find(p => p.user_id === myUserId);
    if (!me?.is_ready) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [players, myUserId]);

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
    useGameStore.setState({ phase: 'LOBBY' });
    router.replace('/');
  };

  if (loading) {
    return (
      <LinearGradient colors={['#08050e', '#130a21', '#050308']} style={styles.container}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#d4af37" />
          <Text style={{ color: '#d4af37', marginTop: 14, fontFamily: 'Cinzel_700Bold', fontSize: 16 }}>
            CONNECTING TO CHAMBER...
          </Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const me = players.find(p => p.user_id === myUserId);
  const isReady = me?.is_ready || false;
  const readyCount = players.filter(p => p.is_ready).length;

  return (
    <LinearGradient colors={['#08050e', '#130a21', '#050308']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top countdown bar */}
        {lobbyCountdown !== null && (
          <LinearGradient colors={['#7c1d1d', '#581c87']} style={styles.countdownBar}>
            <Text style={styles.countdownText}>GAME BEGINNING IN {lobbyCountdown}s...</Text>
          </LinearGradient>
        )}

        <View style={styles.layout}>
          {/* Left side - Player list */}
          <View style={styles.playerSide}>
            <View style={styles.playerHeader}>
              <Text style={styles.title}>GATHERING LOBBY</Text>
              {is_quick_play === false && roomCode && (
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>CODE: {roomCode}</Text>
                </View>
              )}
              <Text style={styles.subtitle}>PLAYERS IN CHAMBER: {players.length} / 12</Text>
            </View>

            <LinearGradient colors={['rgba(20, 16, 32, 0.9)', 'rgba(10, 8, 16, 0.95)']} style={styles.playerListCard}>
              <ScrollView style={styles.playerList} showsVerticalScrollIndicator={false}>
                {players.map((p, index) => {
                  const isMe = p.user_id === myUserId;
                  const host = p.is_host || index === 0;

                  return (
                    <View key={p.user_id || index} style={[styles.playerRow, isMe && styles.myPlayerRow]}>
                      <View style={styles.playerLeftInfo}>
                        <Ionicons name="person-circle-outline" size={26} color={isMe ? '#d4af37' : '#8b80a0'} />
                        <Text style={[styles.playerName, isMe && styles.myPlayerName]}>
                          {p.display_name} {isMe ? '(You)' : ''}
                        </Text>
                        {host && (
                          <View style={styles.hostBadge}>
                            <MaterialCommunityIcons name="crown" size={14} color="#d4af37" />
                            <Text style={styles.hostBadgeText}>HOST</Text>
                          </View>
                        )}
                      </View>

                      <View style={[styles.statusBadge, { backgroundColor: p.is_ready ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.15)', borderColor: p.is_ready ? '#10b981' : '#4b5563' }]}>
                        <View style={[styles.statusDot, { backgroundColor: p.is_ready ? '#10b981' : '#6b7280' }]} />
                        <Text style={[styles.statusText, { color: p.is_ready ? '#34d399' : '#9ca3af' }]}>
                          {p.is_ready ? 'READY' : 'PREPARING'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </LinearGradient>
          </View>

          {/* Right side - Controls */}
          <View style={styles.controlSide}>
            <LinearGradient colors={['rgba(25, 20, 38, 0.85)', 'rgba(12, 10, 20, 0.95)']} style={styles.controlCard}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%' }}>
                <TouchableOpacity activeOpacity={0.8} onPress={handleToggleReady} style={styles.btnTouchable}>
                  <LinearGradient
                    colors={isReady ? ['#dc2626', '#991b1b'] : ['#7c3aed', '#581c87']}
                    style={styles.actionBtn}
                  >
                    <Text style={styles.buttonText}>{isReady ? 'CANCEL READY' : 'READY UP'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {isHost && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleStartGame}
                  disabled={readyCount < 8}
                  style={styles.btnTouchable}
                >
                  <LinearGradient
                    colors={readyCount >= 8 ? ['#d4af37', '#997a20'] : ['#2e2640', '#1c1728']}
                    style={styles.actionBtn}
                  >
                    <Text style={[styles.buttonText, { color: readyCount >= 8 ? '#000' : '#665a78' }]}>
                      START MATCH ({readyCount}/8)
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleLeave}
                disabled={isReady}
                style={[styles.btnTouchable, { opacity: isReady ? 0.4 : 1 }]}
              >
                <View style={styles.leaveBtn}>
                  <Text style={styles.leaveBtnText}>LEAVE LOBBY</Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.readyInfo}>{readyCount} / {players.length} PLAYERS READY</Text>
            </LinearGradient>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  layout: { flex: 1, flexDirection: 'row', padding: 20, gap: 20 },
  countdownBar: { paddingVertical: 10, alignItems: 'center' },
  countdownText: { color: '#fff', fontSize: 16, fontFamily: 'Cinzel_700Bold', letterSpacing: 2 },

  // Left - players
  playerSide: { flex: 1.8 },
  playerHeader: { marginBottom: 12 },
  title: { fontSize: 24, fontFamily: 'Cinzel_700Bold', color: '#d4af37', letterSpacing: 1 },
  codeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d4af37',
    marginTop: 6,
  },
  codeText: { color: '#d4af37', fontSize: 14, fontFamily: 'Cinzel_700Bold', letterSpacing: 1 },
  subtitle: { fontSize: 12, fontFamily: 'Cinzel_400Regular', color: '#a894c2', marginTop: 6, letterSpacing: 1 },
  playerListCard: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#3a2e50', padding: 10 },
  playerList: { flex: 1 },
  playerRow: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(58, 46, 80, 0.4)',
    borderRadius: 6,
  },
  myPlayerRow: { backgroundColor: 'rgba(212, 175, 55, 0.08)' },
  playerLeftInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  playerName: { color: '#e5d9c5', fontSize: 14, fontFamily: 'Cinzel_400Regular' },
  myPlayerName: { color: '#d4af37', fontFamily: 'Cinzel_700Bold' },
  hostBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(212, 175, 55, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  hostBadgeText: { color: '#d4af37', fontSize: 10, fontFamily: 'Cinzel_700Bold' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontFamily: 'Cinzel_700Bold' },

  // Right - controls
  controlSide: { flex: 1, justifyContent: 'center' },
  controlCard: { padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#3a2e50', gap: 14, alignItems: 'center' },
  btnTouchable: { width: '100%' },
  actionBtn: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', width: '100%' },
  buttonText: { color: '#fff', fontSize: 14, fontFamily: 'Cinzel_700Bold', letterSpacing: 1 },
  leaveBtn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: '#1f162b', borderWidth: 1, borderColor: '#4a3860' },
  leaveBtnText: { color: '#a894c2', fontSize: 13, fontFamily: 'Cinzel_700Bold' },
  readyInfo: { color: '#a894c2', textAlign: 'center', fontSize: 11, fontFamily: 'Cinzel_400Regular', marginTop: 4, letterSpacing: 1 },
});
