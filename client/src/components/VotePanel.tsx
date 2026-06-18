import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useGameStore } from '../stores/gameStore';
import PlayerList from './PlayerList';
import { wsClient } from '../services/websocket';

export default function VotePanel() {
  const { players, voteCounts, votesCast, myUserId, isAlive, myRole, hasFinalWhisper } = useGameStore();
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  // Can this player vote?
  const canVote = isAlive || (myRole === 'NECROMANCER' && hasFinalWhisper);

  // Build selectable targets: alive players, excluding self (unless Jester)
  const selectablePlayers = players.filter(p => p.is_alive && (p.user_id !== myUserId || myRole === 'JESTER'));

  // Dead players for display context (non-interactive)
  const deadPlayers = players.filter(p => !p.is_alive);

  const handleVote = () => {
    if (!selectedTarget) return;
    wsClient.send('vote_cast', { target_id: selectedTarget });
    // Spend Final Whisper if dead necromancer
    if (!isAlive && myRole === 'NECROMANCER') {
      useGameStore.setState({ hasFinalWhisper: false });
    }
    setHasVoted(true);
  };

  const handleSkip = () => {
    wsClient.send('vote_cast', { target_id: 'skip' });
    // Spend Final Whisper if dead necromancer
    if (!isAlive && myRole === 'NECROMANCER') {
      useGameStore.setState({ hasFinalWhisper: false });
    }
    setHasVoted(true);
  };

  // Dead necromancer who already used their whisper
  const usedWhisper = !isAlive && myRole === 'NECROMANCER' && !hasFinalWhisper;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Town Voting</Text>
      
      {hasVoted ? (
        <Text style={styles.message}>Vote registered. Waiting for others...</Text>
      ) : usedWhisper ? (
        <Text style={styles.message}>💀 Your Final Whisper has been spent. The living decide now.</Text>
      ) : !canVote ? (
        <Text style={styles.message}>💀 You are dead and cannot vote.</Text>
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

          {/* Show dead players as non-interactive context */}
          {deadPlayers.length > 0 && (
            <View style={styles.deadSection}>
              <Text style={styles.deadSectionTitle}>Deceased</Text>
              {deadPlayers.map(p => (
                <View key={p.user_id} style={styles.deadRow}>
                  <Text style={styles.deadName}>💀 {p.display_name}</Text>
                </View>
              ))}
            </View>
          )}
          
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.btnText}>Skip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.voteBtn, !selectedTarget && styles.disabledBtn]} 
              onPress={handleVote}
              disabled={!selectedTarget}
            >
              <Text style={styles.btnText}>{!isAlive ? '👻 Final Whisper' : 'Cast Vote'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Live Tally Display */}
      <View style={styles.tallyArea}>
        <Text style={styles.tallyTitle}>Current Votes: ({votesCast} cast)</Text>
        {Object.entries(voteCounts).map(([name, count]) => (
          <Text key={name} style={styles.tallyText}>
            {name === 'skip' ? 'Skip' : name}: {count as number} votes
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#1a1a2e', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#2a2a4a', marginTop: 10 },
  title: { color: '#e0e0e0', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  message: { color: '#10b981', textAlign: 'center', marginVertical: 20 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  skipBtn: { backgroundColor: '#4b5563', padding: 15, borderRadius: 8, flex: 0.45, alignItems: 'center' },
  voteBtn: { backgroundColor: '#dc2626', padding: 15, borderRadius: 8, flex: 0.45, alignItems: 'center' },
  disabledBtn: { backgroundColor: '#444' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  tallyArea: { marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#2a2a4a' },
  tallyTitle: { color: '#aaa', marginBottom: 5 },
  tallyText: { color: '#e0e0e0', fontSize: 16, marginVertical: 2 },
  deadSection: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#222' },
  deadSectionTitle: { color: '#666', fontSize: 13, marginBottom: 6, fontStyle: 'italic' },
  deadRow: { paddingVertical: 6, paddingHorizontal: 12 },
  deadName: { color: '#555', fontSize: 14, textDecorationLine: 'line-through' },
  whisperBanner: { color: '#a78bfa', fontStyle: 'italic', textAlign: 'center', marginBottom: 12, fontSize: 14 },
});
