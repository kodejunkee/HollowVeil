import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

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
            style={[
              styles.playerRow, 
              !p.is_alive && styles.deadRow,
              isSelected && styles.selectedRow,
              isTargetDisabled && styles.disabledRow
            ]}
            onPress={() => onSelect && !cannotBeSelected && onSelect(p.user_id)}
            disabled={disabled || !onSelect || cannotBeSelected}
          >
            <Text style={[styles.name, !p.is_alive && styles.deadText, isTargetDisabled && styles.disabledText]}>
              {p.display_name} {p.is_alive ? '' : '💀'}
              {isTargetDisabled && ' (Protected)'}
            </Text>
            {isSelected && <Text style={styles.selectedIcon}>✓</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 10 },
  playerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    backgroundColor: '#1a1a2e', 
    padding: 15, 
    borderRadius: 8, 
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#2a2a4a'
  },
  selectedRow: { borderColor: '#7c3aed', backgroundColor: '#2a1a4a' },
  deadRow: { backgroundColor: '#111', borderColor: '#222' },
  disabledRow: { backgroundColor: '#222', borderColor: '#333' },
  name: { color: '#e0e0e0', fontSize: 16 },
  deadText: { color: '#666', textDecorationLine: 'line-through' },
  disabledText: { color: '#666', fontStyle: 'italic' },
  selectedIcon: { color: '#7c3aed', fontWeight: 'bold' }
});
