import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useGameStore } from '../stores/gameStore';
import PlayerList from './PlayerList';
import { wsClient } from '../services/websocket';

export default function NightActionPanel() {
  const { myRole, players, myUserId, isAlive, round, covenMateIds, hasRevived, nonRevivableIds } = useGameStore();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // ── GUARD: Dead players see spectator view ──
  if (!isAlive) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Night Phase</Text>
        <Text style={styles.spectatorText}>💀 You are dead. Watching from beyond the grave...</Text>
      </View>
    );
  }

  // ── GUARD: Roles with no night action ──
  if (myRole === 'VILLAGER' || myRole === 'CURSED_VILLAGER' || myRole === 'JESTER') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Night Phase</Text>
        <Text style={styles.message}>You have no actions tonight. Waiting for dawn...</Text>
      </View>
    );
  }

  // ── GUARD: Necromancer already used revive ──
  const me = players.find(p => p.user_id === myUserId);
  if (myRole === 'NECROMANCER' && hasRevived) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Night Phase</Text>
        <Text style={styles.message}>💀 Your power has been spent. The dead rest undisturbed tonight.</Text>
      </View>
    );
  }

  // ── GUARD: Hunter Night 1 restriction ──
  if (myRole === 'HUNTER' && round <= 1) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Night Phase</Text>
        <Text style={styles.message}>🏹 You cannot fire on the first night. Waiting for dawn...</Text>
      </View>
    );
  }

  // ── GUARD: Hunter no arrows left ──
  if (myRole === 'HUNTER' && me?.arrows !== undefined && me.arrows <= 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Night Phase</Text>
        <Text style={styles.message}>🏹 You have no arrows remaining. Waiting for dawn...</Text>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Action submitted. Waiting for dawn...</Text>
      </View>
    );
  }

  // ── Build valid target list based on role ──
  const getValidTargets = () => {
    switch (myRole) {
      case 'SEER':
      case 'HUNTER':
      case 'WEREWOLF':
        // Can only target OTHER ALIVE players
        return players.filter(p => p.user_id !== myUserId && p.is_alive);
      case 'VAMPIRE':
        // Filter out self and coven-mates (server sends coven_mate_ids on role assignment)
        return players.filter(p => p.user_id !== myUserId && p.is_alive && !covenMateIds.includes(p.user_id));
      case 'WARDEN':
        // Can protect self or other alive players
        return players.filter(p => p.is_alive);
      case 'NECROMANCER':
        // Only dead players, excluding non-revivable targets (dead vampires)
        return players.filter(p => !p.is_alive && !nonRevivableIds.includes(p.user_id));
      default:
        return [];
    }
  };

  const targets = getValidTargets();

  // Edge case: Necromancer with no dead players to revive
  if (targets.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Night Phase</Text>
        <Text style={styles.message}>No valid targets available. Waiting for dawn...</Text>
      </View>
    );
  }

  const handleSubmit = () => {
    if (!selectedTarget) return;
    wsClient.send('action_submit', { 
      action: 'use_ability', 
      target_id: selectedTarget 
    });
    // Mark necromancer's revive as used immediately so UI won't show again
    if (myRole === 'NECROMANCER') {
      useGameStore.setState({ hasRevived: true });
    }
    setSubmitted(true);
  };

  // Role-specific prompt text
  const getPromptText = () => {
    switch (myRole) {
      case 'SEER': return '🔮 Choose a player to investigate:';
      case 'VAMPIRE': return '🧛 Choose a target for the Coven kill:';
      case 'WEREWOLF': return '🐺 Choose a player to maul:';
      case 'HUNTER': return `🏹 Choose a target to shoot (${me?.arrows ?? '?'} arrow${(me?.arrows ?? 0) !== 1 ? 's' : ''} left):`;
      case 'WARDEN': return '🛡️ Choose a player to protect:';
      case 'NECROMANCER': return '💀 Choose a dead player to revive:';
      default: return 'Select a target:';
    }
  };

  const getActionLabel = () => {
    switch (myRole) {
      case 'SEER': return '🔮 Scry';
      case 'VAMPIRE': return '🧛 Bite';
      case 'WEREWOLF': return '🐺 Maul';
      case 'HUNTER': return '🏹 Shoot';
      case 'WARDEN': return '🛡️ Protect';
      case 'NECROMANCER': return '💀 Revive';
      default: return 'Confirm';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Night Action</Text>
      <Text style={styles.prompt}>{getPromptText()}</Text>
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
        <Text style={styles.submitText}>{getActionLabel()}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#1a1a2e', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#2a2a4a' },
  title: { color: '#e0e0e0', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  message: { color: '#aaa', fontStyle: 'italic', textAlign: 'center', marginVertical: 20 },
  spectatorText: { color: '#666', fontStyle: 'italic', textAlign: 'center', marginVertical: 20, fontSize: 16 },
  prompt: { color: '#e0e0e0', marginBottom: 10 },
  submitBtn: { backgroundColor: '#7c3aed', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  disabledBtn: { backgroundColor: '#444' },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
