import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../src/services/supabase';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleAuth = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (isSignUp) {
        if (!displayName) throw new Error("Display name is required");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } }
        });
        if (error) throw error;
        alert('Signup successful! Check email or login.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#07040a', '#120a21', '#050308']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.layout, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {/* Left side - Branding */}
          <View style={styles.brandingSide}>
            <Text style={styles.title}>HollowVeil</Text>
            <View style={styles.titleDivider} />
            <Text style={styles.tagline}>DECEPTION IN THE DARK</Text>
          </View>

          {/* Right side - Auth Form */}
          <View style={styles.formSide}>
            <LinearGradient colors={['rgba(25, 20, 38, 0.85)', 'rgba(12, 10, 20, 0.95)']} style={styles.formCard}>
              <Text style={styles.cardHeader}>{isSignUp ? 'JOIN THE VEIL' : 'ENTER THE LOBBY'}</Text>
              
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#665a78"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
              
              {isSignUp && (
                <TextInput
                  style={styles.input}
                  placeholder="Display Name"
                  placeholderTextColor="#665a78"
                  value={displayName}
                  onChangeText={setDisplayName}
                />
              )}

              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  placeholderTextColor="#665a78"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#d4af37" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.buttonWrapper} activeOpacity={0.8} onPress={handleAuth} disabled={loading}>
                <LinearGradient colors={['#d4af37', '#997a20']} style={styles.button}>
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.buttonText}>{isSignUp ? 'CREATE ACCOUNT' : 'LOG IN'}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.switchButton} onPress={() => setIsSignUp(!isSignUp)}>
                <Text style={styles.switchText}>
                  {isSignUp ? 'Already registered? Log in here' : 'Need an account? Sign up now'}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  layout: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 30 },
  brandingSide: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingRight: 30 },
  formSide: { flex: 1, justifyContent: 'center', paddingLeft: 10 },
  title: {
    fontFamily: 'Cinzel_700Bold',
    fontSize: 42,
    color: '#d4af37',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  titleDivider: {
    height: 2,
    width: 140,
    backgroundColor: '#d4af37',
    marginVertical: 12,
    opacity: 0.6,
  },
  tagline: {
    fontFamily: 'Cinzel_400Regular',
    fontSize: 13,
    color: '#a894c2',
    letterSpacing: 4,
  },
  formCard: {
    padding: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3a2e50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    fontFamily: 'Cinzel_700Bold',
    fontSize: 18,
    color: '#e5d9c5',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: 'rgba(10, 8, 16, 0.8)',
    color: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2e2640',
    fontFamily: 'Cinzel_400Regular',
    fontSize: 14,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 8, 16, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2e2640',
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    color: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Cinzel_400Regular',
    fontSize: 14,
  },
  eyeIcon: { paddingRight: 14 },
  buttonWrapper: { marginTop: 6, borderRadius: 8, overflow: 'hidden' },
  button: { paddingVertical: 14, alignItems: 'center', borderRadius: 8 },
  buttonText: { fontFamily: 'Cinzel_700Bold', color: '#0a0710', fontSize: 15, letterSpacing: 1 },
  switchButton: { marginTop: 16, alignItems: 'center' },
  switchText: { fontFamily: 'Cinzel_400Regular', color: '#a894c2', fontSize: 12 },
  errorText: { color: '#ef4444', marginBottom: 14, textAlign: 'center', fontSize: 13, fontFamily: 'Cinzel_400Regular' },
});
