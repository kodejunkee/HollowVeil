import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../stores/gameStore';
import { wsClient } from '../services/websocket';
import { Ionicons } from '@expo/vector-icons';

interface ChatPanelProps {
  allowCoven: boolean;
}

export default function ChatPanel({ allowCoven }: ChatPanelProps) {
  const [activeTab, setActiveTab] = useState<'village' | 'ghost' | 'coven'>('village');
  const [text, setText] = useState('');
  const { chatMessages, phase, isAlive } = useGameStore();

  const handleSend = () => {
    if (!text.trim()) return;
    wsClient.send('chat_message', { channel: activeTab, text });
    setText('');
  };

  const filteredMessages = chatMessages.filter(m => m.channel === activeTab);

  const canChat = () => {
    if (activeTab === 'village') return isAlive && phase === 'DISCUSSION';
    if (activeTab === 'ghost') return !isAlive;
    if (activeTab === 'coven') return allowCoven && phase === 'NIGHT';
    return false;
  };

  return (
    <LinearGradient colors={['rgba(20, 16, 32, 0.95)', 'rgba(10, 8, 16, 0.98)']} style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'village' && styles.activeTab]}
          onPress={() => setActiveTab('village')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'village' && styles.activeTabText]}>VILLAGE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'ghost' && styles.activeTab]}
          onPress={() => setActiveTab('ghost')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'ghost' && styles.activeTabText]}>REALM OF DEAD</Text>
        </TouchableOpacity>

        {allowCoven && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'coven' && styles.activeTab]}
            onPress={() => setActiveTab('coven')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'coven' && styles.activeTabText]}>COVEN</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Message List */}
      <ScrollView style={styles.messageList} showsVerticalScrollIndicator={false}>
        {filteredMessages.map((msg, i) => (
          <View key={i} style={styles.messageRow}>
            <Text style={[styles.sender, msg.is_ghost && styles.ghostSender]}>
              {msg.sender_name}:
            </Text>
            <Text style={[styles.text, msg.is_ghost && styles.ghostText]}>{msg.text}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={canChat() ? "Whisper your thoughts..." : "Channel silent during this phase"}
          placeholderTextColor="#665a78"
          editable={canChat()}
        />
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.sendBtn, !canChat() && styles.disabledBtn]}
          onPress={handleSend}
          disabled={!canChat()}
        >
          <Ionicons name="send" size={16} color={canChat() ? '#d4af37' : '#555'} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#3a2e50', overflow: 'hidden' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#3a2e50', backgroundColor: 'rgba(10, 8, 16, 0.5)' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#d4af37', backgroundColor: 'rgba(212, 175, 55, 0.08)' },
  tabText: { color: '#a894c2', fontSize: 11, fontFamily: 'Cinzel_700Bold', letterSpacing: 1 },
  activeTabText: { color: '#d4af37' },
  messageList: { flex: 1, padding: 12 },
  messageRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  sender: { color: '#d4af37', fontFamily: 'Cinzel_700Bold', fontSize: 13, marginRight: 6 },
  ghostSender: { color: '#a78bfa' },
  text: { color: '#e5d9c5', fontFamily: 'Cinzel_400Regular', fontSize: 13 },
  ghostText: { color: '#9ca3af', fontStyle: 'italic' },
  inputArea: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#3a2e50', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: 'rgba(10, 8, 16, 0.8)',
    color: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2e2640',
    fontFamily: 'Cinzel_400Regular',
    fontSize: 13,
  },
  sendBtn: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d4af37',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledBtn: { backgroundColor: 'rgba(20, 20, 30, 0.5)', borderColor: '#333' },
});
