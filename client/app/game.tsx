import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { useGameStore } from '../src/stores/gameStore';
import { wsClient } from '../src/services/websocket';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChatPanel from '../src/components/ChatPanel';
import NightActionPanel from '../src/components/NightActionPanel';
import VotePanel from '../src/components/VotePanel';

export default function GameScreen() {
  const { phase, timeRemaining, myRole, myUserId, updateState, dawnEvents, gameOverData, timelineEvents } = useGameStore();
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    wsClient.onMessage = (msg) => {
      updateState(msg);
    };
  }, []);

  if (phase === 'LOBBY') {
    router.replace('/lobby');
    return null;
  }

  const renderPhaseContent = () => {
    switch (phase) {
      case 'ROLE_ASSIGNMENT':
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Role</Text>
            <Text style={styles.roleText}>{myRole || 'Waiting...'}</Text>
          </View>
        );
      case 'NIGHT':
        return <NightActionPanel />;
      case 'DAWN':
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dawn Announcements</Text>
            {dawnEvents.map((evt, idx) => (
              <Text key={idx} style={styles.cardContent}>• {evt.message}</Text>
            ))}
          </View>
        );
      case 'DISCUSSION':
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Discussion Phase</Text>
            <Text style={styles.cardContent}>Discuss who is suspicious! Time remaining: {timeRemaining}s</Text>
          </View>
        );
      case 'VOTING':
        return <VotePanel />;
      case 'EXECUTION':
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Execution Result</Text>
            <Text style={styles.cardContent}>Someone was executed. See dawn announcements.</Text>
          </View>
        );
      case 'VICTORY':
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Game Over</Text>
            <Text style={styles.victoryText}>{gameOverData?.message || 'The game has ended.'}</Text>
            <Text style={styles.cardContent}>Winner: {gameOverData?.winner}</Text>
            
            <Text style={{...styles.cardTitle, marginTop: 20}}>All Roles</Text>
            {gameOverData?.all_roles && Object.entries(gameOverData.all_roles).map(([uid, p]: [string, any]) => (
              <Text key={uid} style={styles.cardContent}>
                {p.display_name}: {p.role} {p.is_alive ? '(Survived)' : '(Died)'}
              </Text>
            ))}

            <TouchableOpacity style={styles.timelineBtn} onPress={() => setShowTimeline(true)}>
              <Text style={styles.timelineBtnText}>View Event Timeline</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{phase}</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.phaseTitle}>{phase.replace('_', ' ')}</Text>
        <Text style={styles.timer}>{timeRemaining}s</Text>
      </View>

      <ScrollView style={styles.content}>
        {renderPhaseContent()}
      </ScrollView>

      <View style={styles.chatContainer}>
        <ChatPanel allowCoven={myRole === 'VAMPIRE'} />
      </View>

      <Modal visible={showTimeline} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Match Timeline</Text>
            <ScrollView style={styles.timelineScroll}>
              {timelineEvents.map((evt, idx) => (
                <View key={idx} style={styles.timelineItem}>
                  <Text style={styles.timelinePhase}>[{evt.phase}]</Text>
                  <Text style={styles.timelineText}>{evt.message}</Text>
                </View>
              ))}
              {timelineEvents.length === 0 && <Text style={styles.cardContent}>No events recorded.</Text>}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowTimeline(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#1a1a2e', borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  phaseTitle: { fontSize: 24, fontWeight: 'bold', color: '#e0e0e0' },
  timer: { fontSize: 24, color: '#dc2626', fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },
  card: { backgroundColor: '#1a1a2e', padding: 20, borderRadius: 10, borderWidth: 1, borderColor: '#2a2a4a' },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#e0e0e0', marginBottom: 10 },
  cardContent: { color: '#aaa', fontSize: 16 },
  roleText: { fontSize: 28, color: '#7c3aed', fontWeight: 'bold', textAlign: 'center', marginVertical: 20 },
  chatContainer: { height: 250, borderTopWidth: 1, borderTopColor: '#2a2a4a' },
  victoryText: { fontSize: 24, color: '#10b981', fontWeight: 'bold', marginVertical: 10, textAlign: 'center' },
  timelineBtn: { backgroundColor: '#3b82f6', padding: 15, borderRadius: 8, marginTop: 20, alignItems: 'center' },
  timelineBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxHeight: '80%', backgroundColor: '#1a1a2e', borderRadius: 10, padding: 20, borderWidth: 1, borderColor: '#2a2a4a' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#e0e0e0', marginBottom: 15, textAlign: 'center' },
  timelineScroll: { marginBottom: 15 },
  timelineItem: { marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 10 },
  timelinePhase: { color: '#7c3aed', fontWeight: 'bold', marginBottom: 2 },
  timelineText: { color: '#e0e0e0' },
  closeBtn: { backgroundColor: '#dc2626', padding: 15, borderRadius: 8, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: 'bold' }
});
