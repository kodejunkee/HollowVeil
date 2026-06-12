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
      <Text style={styles.title}>HollowVeil</Text>
      
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
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#666" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#0a0a0f' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#e0e0e0', textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: '#1a1a2e', color: '#e0e0e0', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#2a2a4a' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e', borderRadius: 8, borderWidth: 1, borderColor: '#2a2a4a', marginBottom: 15 },
  passwordInput: { flex: 1, color: '#e0e0e0', padding: 15 },
  eyeIcon: { padding: 15 },
  button: { backgroundColor: '#7c3aed', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  switchButton: { marginTop: 20, alignItems: 'center' },
  switchText: { color: '#3b82f6', fontSize: 14 },
  errorText: { color: '#dc2626', marginBottom: 15, textAlign: 'center' }
});
