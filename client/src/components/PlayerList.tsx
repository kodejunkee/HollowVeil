import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface Player {
  user_id: string;
  display_name: string;
  is_alive: boolean;
}

interface PlayerListProps {
  players: Player[];
  onSelect?: (userId: string) => void;
  selectedId?: string | null;
  disabled?: boolean;
  allowSelectDead?: boolean;
  disabledTargetIds?: string[];
}

export default function PlayerList({ players, onSelect, selectedId, disabled, allowSelectDead, disabledTargetIds = [] }: PlayerListProps) {
  return (
    <View style={styles.container}>
      {players.map(p => {
        const isSelected = p.user_id === selectedId;
        const isTargetDisabled = disabledTargetIds.includes(p.user_id);
        const cannotBeSelected = isTargetDisabled || (!allowSelectDead ? !p.is_alive : p.is_alive);

        return (
          <TouchableOpacity 
            key={p.user_id} 
            activeOpacity={0.8}
            style={styles.touchable}
            onPress={() => onSelect && !cannotBeSelected && onSelect(p.user_id)}
            disabled={disabled || !onSelect || cannotBeSelected}
          >
            <LinearGradient
              colors={
                isSelected 
                  ? ['rgba(212, 175, 55, 0.25)', 'rgba(150, 120, 30, 0.3)'] 
                  : cannotBeSelected
                  ? ['rgba(15, 12, 22, 0.4)', 'rgba(10, 8, 16, 0.5)']
                  : ['rgba(30, 24, 45, 0.8)', 'rgba(15, 12, 25, 0.9)']
              }
              style={[
                styles.playerRow,
                isSelected && styles.selectedRow,
                cannotBeSelected && styles.disabledRow
              ]}
            >
              <View style={styles.leftInfo}>
                <Ionicons 
                  name={p.is_alive ? "shield-outline" : "skull-outline"} 
                  size={18} 
                  color={isSelected ? '#d4af37' : p.is_alive ? '#a894c2' : '#6b7280'} 
                />
                <Text style={[
                  styles.name, 
                  !p.is_alive && styles.deadText, 
                  isSelected && styles.selectedText,
                  cannotBeSelected && styles.disabledText
                ]}>
                  {p.display_name} {!p.is_alive ? '💀' : ''}
                  {isTargetDisabled && ' (Protected)'}
                </Text>
              </View>

              {isSelected && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark-sharp" size={14} color="#d4af37" />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 10, gap: 8 },
  touchable: { borderRadius: 8, overflow: 'hidden' },
  playerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#3a2e50',
  },
  selectedRow: { borderColor: '#d4af37', borderWidth: 1.5 },
  disabledRow: { borderColor: '#221b30', opacity: 0.5 },
  leftInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { color: '#e5d9c5', fontFamily: 'Cinzel_400Regular', fontSize: 14 },
  selectedText: { color: '#d4af37', fontFamily: 'Cinzel_700Bold' },
  deadText: { color: '#888', fontStyle: 'italic' },
  disabledText: { color: '#555' },
  checkBadge: { 
    width: 22, 
    height: 22, 
    borderRadius: 11, 
    backgroundColor: 'rgba(212, 175, 55, 0.2)', 
    borderWidth: 1, 
    borderColor: '#d4af37', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
});
