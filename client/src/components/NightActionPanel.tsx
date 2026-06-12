import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useGameStore } from '../stores/gameStore';
import PlayerList from './PlayerList';
import { wsClient } from '../services/websocket';

export default function NightActionPanel() {
  const { myRole, players, myUserId } = useGameStore();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selectedTarget && myRole !== 'VILLAGER' && myRole !== 'CURSED_VILLAGER') return;
    
    wsClient.send('action_submit', { 
      action: 'use_ability', 
      target_id: selectedTarget 
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Action submitted. Waiting for dawn...</Text>
      </View>
    );
  }

  // Filter valid targets based on role
  const getValidTargets = () => {
    const sortedPlayers = [...players].sort((a, b) => Number(b.is_alive) - Number(a.is_alive));
    
    switch (myRole) {
      case 'SEER':
      case 'WEREWOLF':
      case 'VAMPIRE':
      case 'HUNTER':
        return sortedPlayers.filter(p => p.user_id !== myUserId);
      case 'WARDEN':
        // TODO: exclude last protected
        return sortedPlayers;
      case 'NECROMANCER':
        // Necromancer only revives dead players, so we show all players but only allow selecting dead ones.
        // Actually, PlayerList inherently disables dead players. We need Necromancer to select *dead* players.
        // Let's pass all players, but we need PlayerList to allow selecting dead players for Necromancer.
        // Wait, PlayerList has `p.is_alive` hardcoded in `disabled`. We will fix this by passing an override.
        return sortedPlayers;
      default:
        return [];
    }
  };

  const targets = getValidTargets();
  const hasAction = targets.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Night Action</Text>
      
      {!hasAction ? (
        <Text style={styles.message}>You have no actions tonight. Waiting for dawn...</Text>
      ) : (
        <>
          <Text style={styles.prompt}>Select a target:</Text>
          <PlayerList 
            players={targets} 
            selectedId={selectedTarget} 
            onSelect={setSelectedTarget} 
            allowSelectDead={myRole === 'NECROMANCER'}
          />
          <TouchableOpacity 
            style={[styles.submitBtn, !selectedTarget && styles.disabledBtn]} 
            onPress={handleSubmit}
            disabled={!selectedTarget}
          >
            <Text style={styles.submitText}>Submit Action</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#1a1a2e', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#2a2a4a' },
  title: { color: '#e0e0e0', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  message: { color: '#aaa', fontStyle: 'italic', textAlign: 'center', marginVertical: 20 },
  prompt: { color: '#e0e0e0', marginBottom: 10 },
  submitBtn: { backgroundColor: '#7c3aed', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  disabledBtn: { backgroundColor: '#444' },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
