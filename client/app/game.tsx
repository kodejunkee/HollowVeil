import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../src/stores/gameStore';
import { wsClient } from '../src/services/websocket';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChatPanel from '../src/components/ChatPanel';
import NightActionPanel from '../src/components/NightActionPanel';
import VotePanel from '../src/components/VotePanel';

export default function GameScreen() {
  const { phase, timeRemaining, myRole, myRoleName, myRoleFaction, myRoleDescription, myRoleAbility, myRolePassive, myUserId, updateState, dawnEvents, gameOverData, executionData, timelineEvents, reset } = useGameStore();
  const [showTimeline, setShowTimeline] = useState(false);
  const [showRoleInfo, setShowRoleInfo] = useState(false);

  const phaseFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    phaseFadeAnim.setValue(0);
    Animated.timing(phaseFadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [phase]);

  const groupedTimeline = (gameOverData?.timeline || []).reduce((acc: any, event: any) => {
    if (!acc[event.day]) acc[event.day] = [];
    acc[event.day].push(event);
    return acc;
  }, {});

  useEffect(() => {
    wsClient.onMessage = (msg) => {
      if (msg.type === 'error') {
        alert(msg.message);
      }
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
          <LinearGradient colors={['rgba(25, 20, 38, 0.95)', 'rgba(12, 10, 20, 0.98)']} style={styles.card}>
            <Text style={styles.cardTitle}>YOUR ROLE DESTINY</Text>
            <Text style={styles.roleText}>{myRole || 'Awaiting destiny...'}</Text>
            <Text style={styles.roleSubtext}>Keep your identity secret. The Veil descends...</Text>
          </LinearGradient>
        );
      case 'NIGHT':
        return <NightActionPanel />;
      case 'DAWN':
        return (
          <LinearGradient colors={['rgba(25, 20, 38, 0.95)', 'rgba(12, 10, 20, 0.98)']} style={styles.card}>
            <Text style={styles.cardTitle}>DAWN ANNOUNCEMENTS</Text>
            {dawnEvents.length === 0 ? (
              <Text style={styles.cardContent}>The village awakens to quiet streets...</Text>
            ) : (
              dawnEvents.map((evt, idx) => (
                <View key={idx} style={styles.eventRow}>
                  <Text style={styles.eventDot}>•</Text>
                  <Text style={styles.cardContent}>{evt.message}</Text>
                </View>
              ))
            )}
          </LinearGradient>
        );
      case 'DISCUSSION':
        return (
          <LinearGradient colors={['rgba(25, 20, 38, 0.95)', 'rgba(12, 10, 20, 0.98)']} style={styles.card}>
            <Text style={styles.cardTitle}>TOWN DISCUSSION</Text>
            <Text style={styles.cardContent}>Discuss clues and uncover deception! Dawn ends in {timeRemaining}s</Text>
          </LinearGradient>
        );
      case 'VOTING':
        return <VotePanel />;
      case 'EXECUTION':
        return (
          <LinearGradient colors={['rgba(25, 20, 38, 0.95)', 'rgba(12, 10, 20, 0.98)']} style={styles.card}>
            <Text style={styles.cardTitle}>EXECUTION VERDICT</Text>
            <Text style={styles.cardContent}>
              {executionData?.message || 'The village awaits the gallows...'}
            </Text>
          </LinearGradient>
        );
      case 'VICTORY':
        return (
          <LinearGradient colors={['rgba(25, 20, 38, 0.95)', 'rgba(12, 10, 20, 0.98)']} style={styles.card}>
            <Text style={styles.cardTitle}>GAME OVER</Text>
            <Text style={styles.victoryText}>{gameOverData?.message || 'The match has concluded.'}</Text>
            <Text style={styles.winnerText}>VICTORIOUS FACTION: {gameOverData?.winner}</Text>
            
            <Text style={[styles.cardTitle, { marginTop: 18, fontSize: 15 }]}>ROLES REVEALED</Text>
            {gameOverData?.all_roles && Object.entries(gameOverData.all_roles).map(([uid, p]: [string, any]) => (
              <View key={uid} style={styles.roleRow}>
                <Text style={styles.roleName}>{p.display_name}: <Text style={{ color: '#d4af37' }}>{p.role}</Text></Text>
                <Text style={{ color: p.is_alive ? '#34d399' : '#ef4444', fontFamily: 'Cinzel_700Bold', fontSize: 12 }}>
                  {p.is_alive ? 'SURVIVED' : 'FALLEN'}
                </Text>
              </View>
            ))}

            <TouchableOpacity style={styles.timelineBtnWrapper} activeOpacity={0.8} onPress={() => setShowTimeline(true)}>
              <View style={styles.timelineBtn}>
                <Text style={styles.timelineBtnText}>VIEW MATCH TIMELINE</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.homeBtnWrapper}
              onPress={() => {
                wsClient.disconnect();
                router.replace('/');
                setTimeout(() => reset(), 100);
              }}
            >
              <LinearGradient colors={['#d4af37', '#997a20']} style={styles.homeBtn}>
                <Text style={styles.homeBtnText}>RETURN TO MAIN MENU</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        );
      default:
        return (
          <LinearGradient colors={['rgba(25, 20, 38, 0.95)', 'rgba(12, 10, 20, 0.98)']} style={styles.card}>
            <Text style={styles.cardTitle}>{phase.replace('_', ' ')}</Text>
          </LinearGradient>
        );
    }
  };

  return (
    <LinearGradient colors={['#07040b', '#110a1f', '#050308']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top header bar */}
        <LinearGradient colors={['rgba(25, 20, 38, 0.95)', 'rgba(12, 10, 20, 0.95)']} style={styles.header}>
          <Text style={styles.phaseTitle}>{phase.replace('_', ' ')}</Text>
          <Text style={styles.roleLabel}>{myRole ? `ROLE: ${myRole}` : ''}</Text>
          <Text style={[styles.timer, timeRemaining <= 10 && styles.lowTimer]}>{timeRemaining}s</Text>
        </LinearGradient>

        {/* Main content: game panel left, chat right */}
        <View style={styles.mainLayout}>
          <ScrollView style={styles.gameContent} showsVerticalScrollIndicator={false}>
            <Animated.View style={{ opacity: phaseFadeAnim }}>
              {renderPhaseContent()}
            </Animated.View>
          </ScrollView>

          <View style={styles.chatSide}>
            <ChatPanel allowCoven={myRole === 'VAMPIRE'} />
          </View>
        </View>

        {/* Role Info Button */}
        {phase !== 'ROLE_ASSIGNMENT' && phase !== 'LOBBY' && myRole && (
          <TouchableOpacity 
            style={styles.infoBtn} 
            activeOpacity={0.8} 
            onPress={() => setShowRoleInfo(true)}
          >
            <Text style={styles.infoBtnText}>i</Text>
          </TouchableOpacity>
        )}

        {/* Role Info Modal */}
        <Modal visible={showRoleInfo} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <LinearGradient colors={['rgba(25, 20, 38, 0.98)', 'rgba(12, 10, 20, 0.98)']} style={styles.modalContent}>
              <Text style={styles.modalTitle}>YOUR IDENTITY</Text>
              <Text style={styles.roleText}>{myRoleName}</Text>
              <Text style={styles.roleSubtext}>Faction: {myRoleFaction}</Text>
              <View style={{ marginVertical: 16 }}>
                <Text style={styles.cardContent}>{myRoleDescription}</Text>
                {myRoleAbility && myRoleAbility !== 'None' && (
                  <Text style={[styles.cardContent, { marginTop: 12, color: '#a894c2' }]}>
                    Ability: {myRoleAbility}
                  </Text>
                )}
                {myRolePassive && (
                  <Text style={[styles.cardContent, { marginTop: 12, color: '#34d399' }]}>
                    Passive: {myRolePassive}
                  </Text>
                )}
              </View>
              <TouchableOpacity activeOpacity={0.8} style={styles.closeBtn} onPress={() => setShowRoleInfo(false)}>
                <Text style={styles.closeBtnText}>CLOSE INFO</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Modal>

        {/* Timeline modal */}
        <Modal visible={showTimeline} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <LinearGradient colors={['rgba(25, 20, 38, 0.98)', 'rgba(12, 10, 20, 0.98)']} style={styles.modalContent}>
              <Text style={styles.modalTitle}>MATCH TIMELINE HISTORY</Text>
              <ScrollView style={styles.timelineScroll} showsVerticalScrollIndicator={false}>
                {Object.keys(groupedTimeline).map(day => (
                  <View key={day} style={styles.timelineDayContainer}>
                    <Text style={styles.timelineDayTitle}>DAY {day}</Text>
                    {groupedTimeline[day].map((evt: any, idx: number) => (
                      <View key={idx} style={styles.timelineItem}>
                        <Text style={styles.timelinePhase}>[{evt.phase}]</Text>
                        <Text style={styles.timelineText}>{evt.message}</Text>
                      </View>
                    ))}
                  </View>
                ))}
                {(!gameOverData?.timeline || gameOverData.timeline.length === 0) && (
                  <Text style={styles.cardContent}>No timeline events recorded.</Text>
                )}
              </ScrollView>
              <TouchableOpacity activeOpacity={0.8} style={styles.closeBtn} onPress={() => setShowTimeline(false)}>
                <Text style={styles.closeBtnText}>CLOSE TIMELINE</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3a2e50',
  },
  phaseTitle: { fontSize: 16, fontFamily: 'Cinzel_700Bold', color: '#d4af37', letterSpacing: 1 },
  roleLabel: { fontSize: 13, color: '#a894c2', fontFamily: 'Cinzel_700Bold', letterSpacing: 1 },
  timer: { fontSize: 18, color: '#e5d9c5', fontFamily: 'Cinzel_700Bold' },
  lowTimer: { color: '#ef4444' },

  // Main layout
  mainLayout: { flex: 1, flexDirection: 'row', padding: 12, gap: 12 },
  gameContent: { flex: 1.8 },
  chatSide: { flex: 1.2 },

  // Cards
  card: { padding: 18, borderRadius: 12, borderWidth: 1, borderColor: '#3a2e50' },
  cardTitle: { fontSize: 16, fontFamily: 'Cinzel_700Bold', color: '#d4af37', letterSpacing: 1, marginBottom: 10 },
  cardContent: { color: '#e5d9c5', fontFamily: 'Cinzel_400Regular', fontSize: 13, leadingHeight: 18 },
  roleText: { fontSize: 26, color: '#d4af37', fontFamily: 'Cinzel_700Bold', textAlign: 'center', marginVertical: 16, letterSpacing: 2 },
  roleSubtext: { color: '#8b80a0', fontFamily: 'Cinzel_400Regular', fontStyle: 'italic', textAlign: 'center' },
  victoryText: { fontSize: 20, color: '#34d399', fontFamily: 'Cinzel_700Bold', marginVertical: 8, textAlign: 'center', letterSpacing: 1 },
  winnerText: { color: '#d4af37', fontFamily: 'Cinzel_700Bold', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  eventRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  eventDot: { color: '#d4af37', fontSize: 14 },
  roleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(58, 46, 80, 0.4)' },
  roleName: { color: '#e5d9c5', fontFamily: 'Cinzel_400Regular', fontSize: 13 },

  // Timeline button
  timelineBtnWrapper: { marginTop: 16 },
  timelineBtn: { backgroundColor: '#1f1b2c', paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#4a3860' },
  timelineBtnText: { color: '#a894c2', fontFamily: 'Cinzel_700Bold', fontSize: 13, letterSpacing: 1 },

  // Return to Home button
  homeBtnWrapper: { marginTop: 10, borderRadius: 8, overflow: 'hidden' },
  homeBtn: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  homeBtnText: { color: '#0a0710', fontFamily: 'Cinzel_700Bold', fontSize: 14, letterSpacing: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', maxHeight: '85%', borderRadius: 14, padding: 22, borderWidth: 1, borderColor: '#3a2e50' },
  modalTitle: { fontSize: 18, fontFamily: 'Cinzel_700Bold', color: '#d4af37', marginBottom: 14, textAlign: 'center', letterSpacing: 1 },
  timelineScroll: { marginBottom: 14 },
  timelineItem: { flexDirection: 'row', marginBottom: 8, flexWrap: 'wrap' },
  timelinePhase: { color: '#d4af37', fontFamily: 'Cinzel_700Bold', marginRight: 8, fontSize: 12 },
  timelineText: { color: '#e5d9c5', fontFamily: 'Cinzel_400Regular', flex: 1, fontSize: 13 },
  timelineDayContainer: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#3a2e50', paddingBottom: 8 },
  timelineDayTitle: { fontSize: 14, fontFamily: 'Cinzel_700Bold', color: '#34d399', marginBottom: 8, letterSpacing: 1 },
  closeBtn: { backgroundColor: '#dc2626', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontFamily: 'Cinzel_700Bold', fontSize: 13, letterSpacing: 1 },

  // Floating Info Button
  infoBtn: { position: 'absolute', bottom: 20, left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: '#1f1b2c', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#4a3860', zIndex: 10 },
  infoBtnText: { color: '#d4af37', fontFamily: 'Cinzel_700Bold', fontSize: 24, fontStyle: 'italic', paddingBottom: 2 },
});
