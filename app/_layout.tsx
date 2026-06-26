import { useEffect } from 'react';
import { Alert } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '../hooks/use-color-scheme';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import Loader from '../src/components/Loader';

export const unstable_settings = {
  anchor: '(auth)',
};

function RootLayoutNavigation() {
  const colorScheme = useColorScheme();
  const { token, isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const isAuthenticated = token !== null;

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0] as any;
    const inAuthGroup = firstSegment === '(auth)';
    const inAdminGroup = firstSegment === '(admin)';
    const inGestorGroup = firstSegment === '(gestor)';

    if (!isAuthenticated) {
      // Redirect to login if not authenticated and not in auth group
      if (!inAuthGroup) {
        router.replace('/(auth)/login' as any);
      }
    } else {
      // Redirect authenticated users to their dashboard if they are in the auth screen or root index
      const isRootPath = !firstSegment || firstSegment === 'index' || firstSegment === '(tabs)';
      if (inAuthGroup || isRootPath) {
        if (user?.role === 'admin') {
          router.replace('/(admin)/dashboard' as any);
        } else if (user?.role === 'gestor') {
          router.replace('/(gestor)/dashboard' as any);
        } else {
          router.replace('/(tabs)' as any);
        }
      }

      // Authorization guard: restrict access to admin group
      if (inAdminGroup && user?.role !== 'admin') {
        Alert.alert('Acceso Restringido', 'No tiene privilegios para acceder al panel de administración.');
        if (user?.role === 'gestor') {
          router.replace('/(gestor)/dashboard' as any);
        } else {
          router.replace('/(auth)/login' as any);
        }
      }

      // Authorization guard: restrict access to gestor group (allow admin as supervisor)
      if (inGestorGroup && user?.role !== 'gestor' && user?.role !== 'admin') {
        Alert.alert('Acceso Restringido', 'No tiene privilegios para acceder al panel de organización.');
        router.replace('/(auth)/login' as any);
      }
    }
  }, [isAuthenticated, isLoading, segments, user]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen name="(gestor)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="auto" />
      <Loader visible={isLoading} message="Inicializando sesión..." />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNavigation />
    </AuthProvider>
  );
}
