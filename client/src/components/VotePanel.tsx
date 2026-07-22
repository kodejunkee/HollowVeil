import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../stores/gameStore';
import PlayerList from './PlayerList';
import { wsClient } from '../services/websocket';

export default function VotePanel() {
  const { players, voteCounts, votesCast, myUserId, isAlive, myRole, hasFinalWhisper } = useGameStore();
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  const canVote = isAlive || (myRole === 'NECROMANCER' && hasFinalWhisper);
  const selectablePlayers = players.filter(p => p.is_alive && (p.user_id !== myUserId || myRole === 'JESTER'));
  const deadPlayers = players.filter(p => !p.is_alive);

  const handleVote = () => {
    if (!selectedTarget) return;
    wsClient.send('vote_cast', { target_id: selectedTarget });
    if (!isAlive && myRole === 'NECROMANCER') {
      useGameStore.setState({ hasFinalWhisper: false });
    }
    setHasVoted(true);
  };

  const handleSkip = () => {
    wsClient.send('vote_cast', { target_id: 'skip' });
    if (!isAlive && myRole === 'NECROMANCER') {
      useGameStore.setState({ hasFinalWhisper: false });
    }
    setHasVoted(true);
  };

  const usedWhisper = !isAlive && myRole === 'NECROMANCER' && !hasFinalWhisper;

  return (
    <LinearGradient colors={['rgba(25, 20, 38, 0.95)', 'rgba(12, 10, 20, 0.98)']} style={styles.container}>
      <Text style={styles.title}>TOWN JUDGMENT</Text>
      
      {hasVoted ? (
        <Text style={styles.message}>✨ Vote registered. Waiting for the verdict...</Text>
      ) : usedWhisper ? (
        <Text style={styles.message}>💀 Your Final Whisper has been spent. The living decide now.</Text>
      ) : !canVote ? (
        <Text style={styles.message}>💀 You are deceased and cannot participate in voting.</Text>
      ) : (
        <>
          {!isAlive && myRole === 'NECROMANCER' && (
            <Text style={styles.whisperBanner}>👻 Final Whisper — your last vote from beyond the grave.</Text>
          )}

          <PlayerList 
            players={selectablePlayers} 
            selectedId={selectedTarget} 
            onSelect={setSelectedTarget} 
          />

          {deadPlayers.length > 0 && (
            <View style={styles.deadSection}>
              <Text style={styles.deadSectionTitle}>DECEASED SOULS</Text>
              {deadPlayers.map(p => (
                <View key={p.user_id} style={styles.deadRow}>
                  <Text style={styles.deadName}>💀 {p.display_name}</Text>
                </View>
              ))}
            </View>
          )}
          
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.skipBtnWrapper} activeOpacity={0.8} onPress={handleSkip}>
              <View style={styles.skipBtn}>
                <Text style={styles.skipBtnText}>SKIP VOTE</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.voteBtnWrapper, !selectedTarget && styles.disabledWrapper]} 
              onPress={handleVote}
              disabled={!selectedTarget}
            >
              <LinearGradient
                colors={selectedTarget ? ['#dc2626', '#991b1b'] : ['#2a2238', '#181320']}
                style={styles.voteBtn}
              >
                <Text style={[styles.voteBtnText, { color: selectedTarget ? '#fff' : '#665a78' }]}>
                  {!isAlive ? '👻 FINAL WHISPER' : 'CAST VOTE'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Live Tally Display */}
      <View style={styles.tallyArea}>
        <Text style={styles.tallyTitle}>CURRENT VOTES ({votesCast} CAST):</Text>
        {Object.entries(voteCounts).length === 0 ? (
          <Text style={styles.noVotesText}>No votes recorded yet.</Text>
        ) : (
          Object.entries(voteCounts).map(([name, count]) => (
            <View key={name} style={styles.tallyRow}>
              <Text style={styles.tallyName}>{name === 'skip' ? 'Abstain / Skip' : name}</Text>
              <Text style={styles.tallyCount}>{count as number} votes</Text>
            </View>
          ))
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, borderRadius: 12, borderWidth: 1, borderColor: '#3a2e50', marginTop: 10 },
  title: { color: '#d4af37', fontSize: 18, fontFamily: 'Cinzel_700Bold', letterSpacing: 1, marginBottom: 12 },
  message: { color: '#34d399', fontFamily: 'Cinzel_700Bold', textAlign: 'center', marginVertical: 18, fontSize: 14 },
  whisperBanner: { color: '#a78bfa', fontFamily: 'Cinzel_400Regular', fontStyle: 'italic', textAlign: 'center', marginBottom: 12, fontSize: 13 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  skipBtnWrapper: { flex: 1 },
  skipBtn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: '#1f1b2c', borderWidth: 1, borderColor: '#4a3860' },
  skipBtnText: { color: '#a894c2', fontFamily: 'Cinzel_700Bold', fontSize: 13, letterSpacing: 1 },
  voteBtnWrapper: { flex: 1.2, borderRadius: 8, overflow: 'hidden' },
  disabledWrapper: { opacity: 0.5 },
  voteBtn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  voteBtnText: { fontFamily: 'Cinzel_700Bold', fontSize: 13, letterSpacing: 1 },
  deadSection: { marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(58, 46, 80, 0.4)' },
  deadSectionTitle: { color: '#8b80a0', fontSize: 11, fontFamily: 'Cinzel_700Bold', letterSpacing: 1, marginBottom: 6 },
  deadRow: { paddingVertical: 4 },
  deadName: { color: '#6b7280', fontSize: 13, fontFamily: 'Cinzel_400Regular', textDecorationLine: 'line-through' },
  tallyArea: { marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#3a2e50' },
  tallyTitle: { color: '#d4af37', fontSize: 12, fontFamily: 'Cinzel_700Bold', letterSpacing: 1, marginBottom: 8 },
  noVotesText: { color: '#8b80a0', fontSize: 12, fontFamily: 'Cinzel_400Regular', fontStyle: 'italic' },
  tallyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  tallyName: { color: '#e5d9c5', fontSize: 13, fontFamily: 'Cinzel_400Regular' },
  tallyCount: { color: '#d4af37', fontSize: 13, fontFamily: 'Cinzel_700Bold' },
});
