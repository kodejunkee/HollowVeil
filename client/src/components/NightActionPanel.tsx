import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../stores/gameStore';
import PlayerList from './PlayerList';
import { wsClient } from '../services/websocket';

export default function NightActionPanel() {
  const { myRole, players, myUserId, isAlive, round, covenMateIds, hasRevived, nonRevivableIds, myArrows, lastProtectedTargetId } = useGameStore();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // ── GUARD: Dead players see spectator view ──
  if (!isAlive) {
    return (
      <LinearGradient colors={['rgba(25, 20, 38, 0.95)', 'rgba(12, 10, 20, 0.98)']} style={styles.container}>
        <Text style={styles.title}>NIGHT PHASE</Text>
        <Text style={styles.spectatorText}>💀 You are deceased. Watching the shadows from beyond...</Text>
      </LinearGradient>
    );
  }

  // ── GUARD: Roles with no night action ──
  if (myRole === 'VILLAGER' || myRole === 'CURSED_VILLAGER' || myRole === 'JESTER') {
    return (
      <LinearGradient colors={['rgba(25, 20, 38, 0.95)', 'rgba(12, 10, 20, 0.98)']} style={styles.container}>
        <Text style={styles.title}>NIGHT PHASE</Text>
        <Text style={styles.message}>Rest easy tonight. Waiting for the light of dawn...</Text>
      </LinearGradient>
    );
  }

  // ── GUARD: Necromancer already used revive ──
  if (myRole === 'NECROMANCER' && hasRevived) {
    return (
      <LinearGradient colors={['rgba(25, 20, 38, 0.95)', 'rgba(12, 10, 20, 0.98)']} style={styles.container}>
        <Text style={styles.title}>NIGHT PHASE</Text>
        <Text style={styles.message}>💀 Your power has been spent. The dead rest undisturbed tonight.</Text>
      </LinearGradient>
    );
  }

  // ── GUARD: Hunter Night 1 restriction ──
  if (myRole === 'HUNTER' && round <= 1) {
    return (
      <LinearGradient colors={['rgba(25, 20, 38, 0.95)', 'rgba(12, 10, 20, 0.98)']} style={styles.container}>
        <Text style={styles.title}>NIGHT PHASE</Text>
        <Text style={styles.message}>🏹 You cannot fire on the first night. Waiting for dawn...</Text>
      </LinearGradient>
    );
  }

  // ── GUARD: Hunter no arrows left ──
  if (myRole === 'HUNTER' && myArrows !== null && myArrows <= 0) {
    return (
      <LinearGradient colors={['rgba(25, 20, 38, 0.95)', 'rgba(12, 10, 20, 0.98)']} style={styles.container}>
        <Text style={styles.title}>NIGHT PHASE</Text>
        <Text style={styles.message}>🏹 You have spent all your arrows. Waiting for dawn...</Text>
      </LinearGradient>
    );
  }

  if (submitted) {
    return (
      <LinearGradient colors={['rgba(25, 20, 38, 0.95)', 'rgba(12, 10, 20, 0.98)']} style={styles.container}>
        <Text style={styles.successMessage}>✨ Action submitted to the shadows. Awaiting dawn...</Text>
      </LinearGradient>
    );
  }

  const getValidTargets = () => {
    switch (myRole) {
      case 'SEER':
      case 'HUNTER':
      case 'WEREWOLF':
        return players.filter(p => p.user_id !== myUserId && p.is_alive);
      case 'VAMPIRE':
        return players.filter(p => p.user_id !== myUserId && p.is_alive && !covenMateIds.includes(p.user_id));
      case 'WARDEN':
        return players.filter(p => p.is_alive);
      case 'NECROMANCER':
        return players.filter(p => !p.is_alive && !nonRevivableIds.includes(p.user_id));
      default:
        return [];
    }
  };

  const targets = getValidTargets();

  if (targets.length === 0) {
    return (
      <LinearGradient colors={['rgba(25, 20, 38, 0.95)', 'rgba(12, 10, 20, 0.98)']} style={styles.container}>
        <Text style={styles.title}>NIGHT PHASE</Text>
        <Text style={styles.message}>No valid targets available. Waiting for dawn...</Text>
      </LinearGradient>
    );
  }

  const handleSubmit = () => {
    if (!selectedTarget) return;
    wsClient.send('action_submit', { action: 'use_ability', target_id: selectedTarget });
    if (myRole === 'NECROMANCER') useGameStore.setState({ hasRevived: true });
    if (myRole === 'HUNTER') useGameStore.setState((state) => ({ myArrows: (state.myArrows || 0) - 1 }));
    if (myRole === 'WARDEN') useGameStore.setState({ currentNightTargetId: selectedTarget });
    setSubmitted(true);
  };

  const getPromptText = () => {
    switch (myRole) {
      case 'SEER': return '🔮 Select a target to scry:';
      case 'VAMPIRE': return '🧛 Select a target for the Coven kill:';
      case 'WEREWOLF': return '🐺 Select a target to maul:';
      case 'HUNTER': return `🏹 Select a target to shoot (${myArrows ?? '?'} arrows left):`;
      case 'WARDEN': return '🛡️ Select a target to protect:';
      case 'NECROMANCER': return '💀 Select a fallen target to revive:';
      default: return 'Select a target:';
    }
  };

  const getActionLabel = () => {
    switch (myRole) {
      case 'SEER': return '🔮 SCRY TARGET';
      case 'VAMPIRE': return '🧛 BITE TARGET';
      case 'WEREWOLF': return '🐺 MAUL TARGET';
      case 'HUNTER': return '🏹 FIRE ARROW';
      case 'WARDEN': return '🛡️ PROTECT TARGET';
      case 'NECROMANCER': return '💀 REVIVE TARGET';
      default: return 'CONFIRM ACTION';
    }
  };

  return (
    <LinearGradient colors={['rgba(25, 20, 38, 0.95)', 'rgba(12, 10, 20, 0.98)']} style={styles.container}>
      <Text style={styles.title}>NIGHT ABILITY</Text>
      <Text style={styles.prompt}>{getPromptText()}</Text>
      <PlayerList 
        players={targets} 
        selectedId={selectedTarget} 
        onSelect={setSelectedTarget}
        allowSelectDead={myRole === 'NECROMANCER'}
        disabledTargetIds={myRole === 'WARDEN' && lastProtectedTargetId ? [lastProtectedTargetId] : []}
      />
      <TouchableOpacity 
        activeOpacity={0.8}
        style={[styles.submitBtnWrapper, !selectedTarget && styles.disabledWrapper]} 
        onPress={handleSubmit}
        disabled={!selectedTarget}
      >
        <LinearGradient
          colors={selectedTarget ? ['#d4af37', '#997a20'] : ['#2a2238', '#181320']}
          style={styles.submitBtn}
        >
          <Text style={[styles.submitText, { color: selectedTarget ? '#0a0710' : '#665a78' }]}>
            {getActionLabel()}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, borderRadius: 12, borderWidth: 1, borderColor: '#3a2e50' },
  title: { color: '#d4af37', fontSize: 18, fontFamily: 'Cinzel_700Bold', letterSpacing: 1, marginBottom: 8 },
  message: { color: '#a894c2', fontFamily: 'Cinzel_400Regular', fontStyle: 'italic', textAlign: 'center', marginVertical: 20 },
  successMessage: { color: '#10b981', fontFamily: 'Cinzel_700Bold', textAlign: 'center', marginVertical: 20, fontSize: 15 },
  spectatorText: { color: '#8b80a0', fontFamily: 'Cinzel_400Regular', fontStyle: 'italic', textAlign: 'center', marginVertical: 20, fontSize: 14 },
  prompt: { color: '#e5d9c5', fontFamily: 'Cinzel_400Regular', marginBottom: 10, fontSize: 13 },
  submitBtnWrapper: { marginTop: 16, borderRadius: 8, overflow: 'hidden' },
  disabledWrapper: { opacity: 0.5 },
  submitBtn: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  submitText: { fontFamily: 'Cinzel_700Bold', fontSize: 14, letterSpacing: 1 },
});
