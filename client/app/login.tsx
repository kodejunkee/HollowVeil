import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
        alert('Signup successful! Check email or just login if auto-confirm is off.');
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
    <SafeAreaView style={styles.container}>
      <View style={styles.layout}>
        {/* Left side - Branding */}
        <View style={styles.brandingSide}>
          <Text style={styles.title}>HollowVeil</Text>
          <Text style={styles.tagline}>Deception in the Dark</Text>
        </View>

        {/* Right side - Auth Form */}
        <View style={styles.formSide}>
          <View style={styles.formCard}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
            
            {isSignUp && (
              <TextInput
                style={styles.input}
                placeholder="Display Name"
                placeholderTextColor="#666"
                value={displayName}
                onChangeText={setDisplayName}
              />
            )}

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchButton} onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.switchText}>
                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  layout: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  brandingSide: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingRight: 20 },
  formSide: { flex: 1, justifyContent: 'center', paddingLeft: 20 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#e0e0e0' },
  tagline: { fontSize: 16, color: '#7c3aed', marginTop: 8, fontStyle: 'italic' },
  formCard: { backgroundColor: '#1a1a2e', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4a' },
  input: { backgroundColor: '#0a0a0f', color: '#e0e0e0', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a4a' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0f', borderRadius: 8, borderWidth: 1, borderColor: '#2a2a4a', marginBottom: 12 },
  passwordInput: { flex: 1, color: '#e0e0e0', padding: 12 },
  eyeIcon: { padding: 12 },
  button: { backgroundColor: '#7c3aed', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  switchButton: { marginTop: 14, alignItems: 'center' },
  switchText: { color: '#3b82f6', fontSize: 13 },
  errorText: { color: '#dc2626', marginBottom: 12, textAlign: 'center', fontSize: 13 },
});
