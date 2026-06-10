import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../stores/gameStore';
import { wsClient } from '../services/websocket';

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

  // Simple permission check for input
  const canChat = () => {
    if (activeTab === 'village') return isAlive && phase === 'DISCUSSION';
    if (activeTab === 'ghost') return !isAlive;
    if (activeTab === 'coven') return allowCoven && phase === 'NIGHT';
    return false;
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, activeTab === 'village' && styles.activeTab]} onPress={() => setActiveTab('village')}>
          <Text style={styles.tabText}>Village</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'ghost' && styles.activeTab]} onPress={() => setActiveTab('ghost')}>
          <Text style={styles.tabText}>Ghost</Text>
        </TouchableOpacity>
        {allowCoven && (
          <TouchableOpacity style={[styles.tab, activeTab === 'coven' && styles.activeTab]} onPress={() => setActiveTab('coven')}>
            <Text style={styles.tabText}>Coven</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.messageList}>
        {filteredMessages.map((msg, i) => (
          <View key={i} style={styles.messageRow}>
            <Text style={[styles.sender, msg.is_ghost && styles.ghostText]}>{msg.sender_name}: </Text>
            <Text style={[styles.text, msg.is_ghost && styles.ghostText]}>{msg.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputArea}>
        <TextInput 
          style={styles.input} 
          value={text} 
          onChangeText={setText} 
          placeholder="Type a message..." 
          placeholderTextColor="#666"
          editable={canChat()}
        />
        <TouchableOpacity style={[styles.sendBtn, !canChat() && styles.disabledBtn]} onPress={handleSend} disabled={!canChat()}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333' },
  tab: { flex: 1, padding: 10, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#7c3aed' },
  tabText: { color: '#e0e0e0', fontWeight: 'bold' },
  messageList: { flex: 1, padding: 10 },
  messageRow: { flexDirection: 'row', marginBottom: 5 },
  sender: { color: '#3b82f6', fontWeight: 'bold' },
  text: { color: '#e0e0e0' },
  ghostText: { color: '#888', fontStyle: 'italic' },
  inputArea: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#333' },
  input: { flex: 1, backgroundColor: '#222', color: '#e0e0e0', padding: 10, borderRadius: 5, marginRight: 10 },
  sendBtn: { backgroundColor: '#7c3aed', padding: 10, borderRadius: 5, justifyContent: 'center' },
  disabledBtn: { backgroundColor: '#444' },
  sendText: { color: '#fff', fontWeight: 'bold' }
});
