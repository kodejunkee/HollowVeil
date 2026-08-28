import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, Image, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { useGameStore } from '../src/stores/gameStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Network from 'expo-network';

export default function HomeScreen() {
  const { user, signOut } = useAuthStore();
  const { setUserId } = useGameStore();
  const [roomCode, setRoomCode] = useState('');
  const [privateModalState, setPrivateModalState] = useState<'none' | 'menu' | 'join'>('none');
  
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const SERVER_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hollowveil-api.onrender.com';

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    } else {
      setUserId(user.id);
      pingServer();
    }
  }, [user]);

  const pingServer = async () => {
    try {
      setIsConnecting(true);
      setConnectionError(null);

      // 1. Check if the device has an active internet connection first
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        throw new Error('Your device is currently offline. Please check your internet connection.');
      }

      // 2. Simple GET request to the root health endpoint to check if SERVER is alive
      const res = await fetch(SERVER_URL);
      if (!res.ok) throw new Error('Cannot reach the game servers. They might be down for maintenance.');
      
      // Success!
      setIsConnecting(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    } catch (err: any) {
      console.error("Ping failed:", err);
      // If it's a fetch network error, it means the server is completely unreachable (not responding at all)
      const errorMsg = err.message.includes('Network request failed') 
        ? 'Cannot reach the game servers. They might be waking up or offline.' 
        : err.message;
        
      setConnectionError(errorMsg);
    }
  };

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const handleQuickPlay = () => {
    router.push({ pathname: '/lobby', params: { mode: 'quickplay' } });
  };

  const handleJoinPrivate = () => {
    if (roomCode.trim()) {
      setPrivateModalState('none');
      router.push({ pathname: '/lobby', params: { mode: 'private', code: roomCode.trim() } });
    }
  };

  const handleCreatePrivate = () => {
    setPrivateModalState('none');
    router.push({ pathname: '/lobby', params: { mode: 'create_private' } });
  };

  return (
    <ImageBackground
      source={require('../assets/images/backgrounds/Main-screen-background.png')}
      style={styles.container}
      resizeMode="cover"
    >
      {/* LOADING OVERLAY */}
      {(isConnecting || connectionError) && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5, 3, 8, 0.75)', justifyContent: 'center', alignItems: 'center', zIndex: 50 }]}>
          {connectionError ? (
            <>
              <MaterialCommunityIcons name="wifi-off" size={64} color="#dc2626" />
              <Text style={{ color: '#dc2626', marginTop: 14, fontFamily: 'Cinzel_700Bold', fontSize: 16, textAlign: 'center', marginHorizontal: 40 }}>
                {connectionError}
              </Text>
              <TouchableOpacity style={[styles.mainBtnWrapper, { marginTop: 30 }]} activeOpacity={0.7} onPress={() => { setConnectionError(null); setIsConnecting(true); pingServer(); }}>
                <ImageBackground source={require('../assets/images/borders/main-button-1.png')} style={styles.mainBtnBg} resizeMode="stretch">
                  <Text style={styles.mainBtnText}>RETRY</Text>
                </ImageBackground>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 20 }} onPress={handleSignOut}>
                <Text style={{ color: '#888', fontWeight: 'bold' }}>SIGN OUT</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color="#d4af37" />
              <Text style={{ color: '#d4af37', marginTop: 14, fontFamily: 'Cinzel_700Bold', fontSize: 16 }}>
                CONNECTING TO SERVER...
              </Text>
            </>
          )}
        </View>
      )}

      {/* ALL UI ELEMENTS (Fades in when connected) */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]} pointerEvents={isConnecting || connectionError ? 'none' : 'auto'}>
        {/* PERFECTLY CENTERED ELEMENTS (Ignores notch padding to center with background) */}
        <View style={[StyleSheet.absoluteFill, { zIndex: 10, elevation: 10 }]} pointerEvents="box-none">
        {/* CENTER TOP: TITLE */}
        <View style={styles.titleContainer}>
          <Image
            source={require('../assets/images/icons/HollowVeil-Title.png')}
            style={styles.titleImage}
            resizeMode="contain"
          />
        </View>

        {/* CENTER: BUTTONS */}
        <View style={styles.centerButtons}>
          <TouchableOpacity style={styles.mainBtnWrapper} activeOpacity={0.7} onPress={handleQuickPlay}>
            <ImageBackground source={require('../assets/images/borders/main-button-1.png')} style={styles.mainBtnBg} resizeMode="stretch">
              <Text style={styles.mainBtnText}>QUICK PLAY</Text>
            </ImageBackground>
          </TouchableOpacity>

          <TouchableOpacity style={styles.mainBtnWrapper} activeOpacity={0.7} onPress={() => setPrivateModalState('menu')}>
            <ImageBackground source={require('../assets/images/borders/main-button-2.png')} style={styles.mainBtnBg} resizeMode="stretch">
              <Text style={styles.mainBtnText}>PRIVATE ROOM</Text>
            </ImageBackground>
          </TouchableOpacity>

          <TouchableOpacity style={styles.mainBtnWrapper} activeOpacity={0.7}>
            <ImageBackground source={require('../assets/images/borders/main-button-3.png')} style={styles.mainBtnBg} resizeMode="stretch">
              <Text style={styles.mainBtnText}>TUTORIAL</Text>
            </ImageBackground>
          </TouchableOpacity>
        </View>
      </View>

      {/* HUD ELEMENTS (Respects notch padding) */}
      <SafeAreaView style={styles.safeArea} pointerEvents="box-none">

        {/* TOP LEFT: PROFILE HUD */}
        <LinearGradient 
          colors={['rgba(10, 10, 15, 0.6)', 'rgba(10, 10, 15, 0)']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 0 }} 
          style={styles.topLeftHud}
        >
          {/* Fading Top and Bottom Borders */}
          <LinearGradient colors={['#3a2a1a', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hudTopBorder} />
          <LinearGradient colors={['#3a2a1a', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hudBottomBorder} />

          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={40} color="#555" />
          </View>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{user.user_metadata?.display_name || user.email}</Text>
            <Text style={styles.playerLevel}>Level 7</Text>
            <View style={styles.xpRow}>
              <View style={styles.xpBarContainer}>
                <View style={styles.xpBarFill} />
              </View>
              <Text style={styles.xpText}>620 / 1200</Text>
            </View>
          </View>
        </LinearGradient>

        {/* TOP RIGHT: ICONS */}
        <View style={styles.topRightHud}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="newspaper-outline" size={24} color="#d4af37" />
            <Text style={styles.iconBtnText}>NEWS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={24} color="#d4af37" />
            <Text style={styles.iconBtnText}>SETTINGS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={handleSignOut}>
            <Ionicons name="person-outline" size={24} color="#d4af37" />
            <Text style={styles.iconBtnText}>PROFILE</Text>
          </TouchableOpacity>
        </View>

        {/* BOTTOM LEFT: EVENTS */}
        <View style={styles.bottomLeftHud}>
          <TouchableOpacity style={styles.eventBtnWrapper} activeOpacity={0.7}>
            <ImageBackground source={require('../assets/images/borders/event-button.png')} style={styles.eventBtnBg} resizeMode="stretch">
              <Text style={styles.eventBtnText}>EVENTS</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>1</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        </View>

        {/* BOTTOM RIGHT: SOCIALS */}
        <View style={styles.bottomRightHud}>
          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
            <Ionicons name="logo-discord" size={24} color="#d4af37" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="bat" size={24} color="#d4af37" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
            <Ionicons name="mail-outline" size={24} color="#d4af37" />
          </TouchableOpacity>
        </View>

        {/* ROOM CODE MODAL */}
        {privateModalState !== 'none' && (
          <Modal transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                
                {privateModalState === 'menu' ? (
                  <>
                    <Text style={styles.modalTitle}>Private Room</Text>
                    <View style={{ gap: 15, width: '100%' }}>
                      <TouchableOpacity 
                        style={[styles.modalBtnJoin, { flex: 0, width: '100%', paddingVertical: 15, justifyContent: 'center' }]} 
                        activeOpacity={0.7} 
                        onPress={handleCreatePrivate}
                      >
                        <Text style={[styles.modalBtnText, { color: '#000', fontSize: 16 }]}>CREATE NEW ROOM</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.modalBtnCancel, { flex: 0, width: '100%', paddingVertical: 15, borderWidth: 1, borderColor: '#444', backgroundColor: '#2a2a35', justifyContent: 'center' }]} 
                        activeOpacity={0.7} 
                        onPress={() => setPrivateModalState('join')}
                      >
                        <Text style={[styles.modalBtnText, { fontSize: 16 }]}>JOIN WITH CODE</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setPrivateModalState('none')}>
                      <Text style={{ color: '#888', fontWeight: 'bold' }}>CANCEL</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.modalTitle}>Enter Room Code</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="CODE"
                      placeholderTextColor="#666"
                      value={roomCode}
                      onChangeText={setRoomCode}
                      autoCapitalize="characters"
                      maxLength={6}
                    />
                    <View style={styles.modalBtns}>
                      <TouchableOpacity style={styles.modalBtnCancel} activeOpacity={0.7} onPress={() => setPrivateModalState('none')}>
                        <Text style={styles.modalBtnText}>CANCEL</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.modalBtnJoin} activeOpacity={0.7} onPress={handleJoinPrivate}>
                        <Text style={styles.modalBtnText}>JOIN</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                
              </View>
            </View>
          </Modal>
        )}
      </SafeAreaView>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  safeArea: {
    flex: 1,
  },

  // TOP LEFT HUD
  topLeftHud: {
    position: 'absolute',
    top: 20,
    left: 30,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#3a2a1a',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    padding: 8,
    paddingRight: 40, // extra padding so text doesn't hit the zero-opacity edge
  },
  hudTopBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  hudBottomBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  avatarContainer: {
    marginRight: 10,
    backgroundColor: '#111',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#3a2a1a',
  },
  playerInfo: {
    justifyContent: 'center',
  },
  playerName: {
    fontFamily: 'Cinzel_400Regular',
    color: '#e5d9c5',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  playerLevel: {
    fontFamily: 'Cinzel_400Regular',
    color: '#d4af37',
    fontSize: 10,
    marginTop: 2,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  xpBarContainer: {
    height: 6,
    backgroundColor: '#222',
    borderRadius: 3,
    width: 80,
    borderWidth: 1,
    borderColor: '#000',
  },
  xpBarFill: {
    height: '100%',
    width: '52%',
    backgroundColor: '#d4af37',
    borderRadius: 3,
  },
  xpText: {
    fontFamily: 'Cinzel_400Regular',
    color: '#aaa',
    fontSize: 10,
  },

  // TOP RIGHT HUD
  topRightHud: {
    position: 'absolute',
    top: 20,
    right: 30,
    flexDirection: 'row',
    gap: 20,
  },
  iconBtn: {
    alignItems: 'center',
  },
  iconBtnText: {
    fontFamily: 'Cinzel_400Regular',
    color: '#d4af37',
    fontSize: 10,
    marginTop: 4,
  },

  // CENTER TOP TITLE
  titleContainer: {
    position: 'absolute',
    top: '8%',
    width: '100%',
    alignItems: 'center',
  },
  titleImage: {
    width: 450,
    height: 100,
  },

  // CENTER BUTTONS
  centerButtons: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
    gap: 12,
  },
  mainBtnWrapper: {
    width: 272,
    height: 52,
  },
  mainBtnBg: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainBtnText: {
    fontFamily: 'Cinzel_700Bold',
    color: '#e5d9c5',
    fontSize: 15,
    letterSpacing: 2,
  },

  // BOTTOM LEFT HUD
  bottomLeftHud: {
    position: 'absolute',
    bottom: 20,
    left: 30,
  },
  eventBtnWrapper: {
    width: 130,
    height: 45,
  },
  eventBtnBg: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventBtnText: {
    fontFamily: 'Cinzel_400Regular',
    color: '#e5d9c5',
    fontSize: 16,
    letterSpacing: 1,
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#b91c1c',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // BOTTOM RIGHT HUD
  bottomRightHud: {
    position: 'absolute',
    bottom: 20,
    right: 30,
    flexDirection: 'row',
    gap: 15,
  },
  socialBtn: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(10, 10, 15, 0.4)',
    borderWidth: 1,
    borderColor: '#3a2a1a',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d4af37',
    width: 320,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'Cinzel_700Bold',
    color: '#d4af37',
    fontSize: 20,
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#0a0a0f',
    color: '#e0e0e0',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    textAlign: 'center',
    fontSize: 28,
    letterSpacing: 6,
    width: '100%',
    marginBottom: 20,
    fontFamily: 'Cinzel_400Regular',
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtnCancel: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  modalBtnJoin: {
    padding: 12,
    backgroundColor: '#d4af37',
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  modalBtnText: {
    fontFamily: 'Cinzel_700Bold',
    color: '#fff',
    fontSize: 16,
  },
});
