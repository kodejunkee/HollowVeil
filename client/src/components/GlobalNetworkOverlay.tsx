import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useGameStore } from '../stores/gameStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts, Cinzel_700Bold } from '@expo-google-fonts/cinzel';

export default function GlobalNetworkOverlay() {
  const netInfo = useNetInfo();
  const { wsStatus, roomId } = useGameStore();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [isVisible, setIsVisible] = useState(false);

  // We only care about websocket reconnection if we are actually in a game/lobby (roomId is present)
  // and we didn't intentionally disconnect.
  const isWsReconnecting = roomId !== null && wsStatus === 'reconnecting';
  
  // Is the device physically disconnected from the internet?
  const isDeviceOffline = netInfo.isConnected === false;

  const shouldShow = isDeviceOffline || isWsReconnecting;

  useEffect(() => {
    if (shouldShow) {
      setIsVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsVisible(false));
    }
  }, [shouldShow]);

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        {isDeviceOffline ? (
          <>
            <MaterialCommunityIcons name="wifi-off" size={64} color="#dc2626" />
            <Text style={styles.errorText}>NO INTERNET CONNECTION</Text>
            <Text style={styles.subText}>Please check your Wi-Fi or cellular data.</Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#d4af37" />
            <Text style={styles.connectingText}>RECONNECTING TO SERVER...</Text>
            <Text style={styles.subText}>Don't close the app</Text>
          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 3, 8, 0.85)', // 85% transparency full block
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: 'rgba(20, 16, 32, 0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3a2a1a',
  },
  errorText: {
    color: '#dc2626',
    fontFamily: 'Cinzel_700Bold',
    fontSize: 18,
    marginTop: 16,
    letterSpacing: 1,
  },
  connectingText: {
    color: '#d4af37',
    fontFamily: 'Cinzel_700Bold',
    fontSize: 18,
    marginTop: 16,
    letterSpacing: 1,
  },
  subText: {
    color: '#8b80a0',
    fontSize: 12,
    marginTop: 8,
  }
});
