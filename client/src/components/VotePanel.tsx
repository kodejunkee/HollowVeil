import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useGameStore } from '../stores/gameStore';
import PlayerList from './PlayerList';
import { wsClient } from '../services/websocket';

export default function VotePanel() {
  const { players, voteCounts, votesCast, myUserId } = useGameStore();
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  const alivePlayers = players.filter(p => p.is_alive);

  const handleVote = () => {
    if (!selectedTarget) return;
    wsClient.send('vote_cast', { target_id: selectedTarget });
    setHasVoted(true);
  };

  const handleSkip = () => {
    wsClient.send('vote_cast', { target_id: 'skip' });
    setHasVoted(true);
  };



  return (
    <View style={styles.container}>
      <Text style={styles.title}>Town Voting</Text>
      
      {hasVoted ? (
        <Text style={styles.message}>Vote registered. Waiting for others...</Text>
      ) : (
        <>
          <PlayerList 
            players={alivePlayers} 
            selectedId={selectedTarget} 
            onSelect={setSelectedTarget} 
          />
          
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.btnText}>Skip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.voteBtn, !selectedTarget && styles.disabledBtn]} 
              onPress={handleVote}
              disabled={!selectedTarget}
            >
              <Text style={styles.btnText}>Cast Vote</Text>
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
  tallyText: { color: '#e0e0e0', fontSize: 16, marginVertical: 2 }
});
