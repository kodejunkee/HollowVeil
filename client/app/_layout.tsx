import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../src/stores/authStore';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useFonts, Cinzel_400Regular, Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import * as SplashScreen from 'expo-splash-screen';
import GlobalNetworkOverlay from '../src/components/GlobalNetworkOverlay';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initialize, isLoading: isAuthLoading } = useAuthStore();
  const [fontsLoaded, fontError] = useFonts({
    Cinzel_400Regular,
    Cinzel_700Bold,
  });

  useEffect(() => {
    initialize();
    // Lock to landscape orientation
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && !isAuthLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, isAuthLoading]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (isAuthLoading) {
    return <View style={{ flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#e0e0e0' }}>Loading...</Text>
    </View>;
  }

  return (
    <SafeAreaProvider>
      <StatusBar hidden={true} />
      <Stack screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0a0f' }
      }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="index" />
        <Stack.Screen name="lobby" />
        <Stack.Screen name="game" />
      </Stack>
      <GlobalNetworkOverlay />
    </SafeAreaProvider>
  );
}
