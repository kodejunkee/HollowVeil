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
  const { phase, timeRemaining, myRole, myUserId, updateState, dawnEvents, gameOverData, executionData, timelineEvents, reset } = useGameStore();
  const [showTimeline, setShowTimeline] = useState(false);

  const groupedTimeline = (gameOverData?.timeline || []).reduce((acc: any, event: any) => {
    if (!acc[event.day]) acc[event.day] = [];
    acc[event.day].push(event);
    return acc;
  }, {});

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
            <Text style={styles.cardContent}>
              {executionData?.message || 'The village decides...'}
            </Text>
          </View>
        );
      case 'VICTORY':
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Game Over</Text>
            <Text style={styles.victoryText}>{gameOverData?.message || 'The game has ended.'}</Text>
            <Text style={styles.cardContent}>Winner: {gameOverData?.winner}</Text>
            
            <Text style={{...styles.cardTitle, marginTop: 16}}>All Roles</Text>
            {gameOverData?.all_roles && Object.entries(gameOverData.all_roles).map(([uid, p]: [string, any]) => (
              <Text key={uid} style={styles.cardContent}>
                {p.display_name}: {p.role} {p.is_alive ? '(Survived)' : '(Died)'}
              </Text>
            ))}

            <TouchableOpacity style={styles.timelineBtn} onPress={() => setShowTimeline(true)}>
              <Text style={styles.timelineBtnText}>View Event Timeline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.homeBtn}
              onPress={() => {
                wsClient.disconnect();
                reset();
                router.replace('/');
              }}
            >
              <Text style={styles.homeBtnText}>Return to Home</Text>
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
      {/* Top header bar */}
      <View style={styles.header}>
        <Text style={styles.phaseTitle}>{phase.replace('_', ' ')}</Text>
        <Text style={styles.roleLabel}>{myRole || ''}</Text>
        <Text style={styles.timer}>{timeRemaining}s</Text>
      </View>

      {/* Main content: game panel left, chat right */}
      <View style={styles.mainLayout}>
        <ScrollView style={styles.gameContent}>
          {renderPhaseContent()}
        </ScrollView>

        <View style={styles.chatSide}>
          <ChatPanel allowCoven={myRole === 'VAMPIRE'} />
        </View>
      </View>

      {/* Timeline modal */}
      <Modal visible={showTimeline} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Match Timeline</Text>
            <ScrollView style={styles.timelineScroll}>
              {Object.keys(groupedTimeline).map(day => (
                <View key={day} style={styles.timelineDayContainer}>
                  <Text style={styles.timelineDayTitle}>[Day {day}]</Text>
                  {groupedTimeline[day].map((evt: any, idx: number) => (
                    <View key={idx} style={styles.timelineItem}>
                      <Text style={styles.timelinePhase}>({evt.phase})</Text>
                      <Text style={styles.timelineText}>{evt.message}</Text>
                    </View>
                  ))}
                </View>
              ))}
              {(!gameOverData?.timeline || gameOverData.timeline.length === 0) && <Text style={styles.cardContent}>No events recorded.</Text>}
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

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#1a1a2e', borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  phaseTitle: { fontSize: 18, fontWeight: 'bold', color: '#e0e0e0' },
  roleLabel: { fontSize: 14, color: '#7c3aed', fontWeight: '600' },
  timer: { fontSize: 20, color: '#dc2626', fontWeight: 'bold' },

  // Main layout - side by side
  mainLayout: { flex: 1, flexDirection: 'row' },
  gameContent: { flex: 2, padding: 12 },
  chatSide: { flex: 1, borderLeftWidth: 1, borderLeftColor: '#2a2a4a' },

  // Cards
  card: { backgroundColor: '#1a1a2e', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#2a2a4a' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#e0e0e0', marginBottom: 8 },
  cardContent: { color: '#aaa', fontSize: 14 },
  roleText: { fontSize: 26, color: '#7c3aed', fontWeight: 'bold', textAlign: 'center', marginVertical: 16 },
  victoryText: { fontSize: 22, color: '#10b981', fontWeight: 'bold', marginVertical: 8, textAlign: 'center' },

  // Timeline button
  timelineBtn: { backgroundColor: '#3b82f6', padding: 12, borderRadius: 8, marginTop: 16, alignItems: 'center' },
  timelineBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // Return to Home button
  homeBtn: { backgroundColor: '#10b981', padding: 14, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  homeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', maxHeight: '85%', backgroundColor: '#1a1a2e', borderRadius: 10, padding: 20, borderWidth: 1, borderColor: '#2a2a4a' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#e0e0e0', marginBottom: 12, textAlign: 'center' },
  timelineScroll: { marginBottom: 12 },
  timelineItem: { flexDirection: 'row', marginBottom: 8 },
  timelinePhase: { color: '#7c3aed', fontWeight: 'bold', marginRight: 8, minWidth: 55, fontSize: 13 },
  timelineText: { color: '#e0e0e0', flex: 1, fontSize: 13 },
  timelineDayContainer: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 8 },
  timelineDayTitle: { fontSize: 16, fontWeight: 'bold', color: '#10b981', marginBottom: 8 },
  closeBtn: { backgroundColor: '#dc2626', padding: 12, borderRadius: 8, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: 'bold' },
});
