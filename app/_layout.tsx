import { useEffect } from 'react';
import { Alert, LogBox } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

// Suppress the warning regarding expo-notifications remote push token in Expo Go.
// We only use local notifications, which work perfectly in Expo Go.
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
]);

import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ThemeProvider as CustomThemeProvider, useTheme } from '../src/context/ThemeContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import Loader from '../src/components/Loader';
import APP_CONFIG from '../src/core/config/app.config';

export const unstable_settings = {
  anchor: '(auth)',
};

function RootLayoutNavigation() {
  const { isDarkMode } = useTheme();
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
    const inOperadorGroup = firstSegment === '(operador)';

    if (!isAuthenticated) {
      // Guest mode: only redirect to login if attempting to access restricted admin, gestor, or operator groups
      if (inAdminGroup || inGestorGroup || inOperadorGroup) {
        router.replace('/(auth)/login' as any);
      } else {
        // If guest is at root path, send to tabs (guest home page)
        const isRootPath = !firstSegment || firstSegment === 'index';
        if (isRootPath) {
          router.replace('/(tabs)' as any);
        }
      }
    } else {
      // Redirect authenticated users to their dashboard if they are in the auth screen or root index
      const isRootPath = !firstSegment || firstSegment === 'index' || (firstSegment === '(tabs)' && segments.length === 1);
      if (inAuthGroup || isRootPath) {
        if (user?.role === 'admin') {
          if (APP_CONFIG.FEATURES.ENABLE_ADMIN_GESTOR_ROLES) {
            router.replace('/(admin)/dashboard' as any);
          } else {
            router.replace('/(tabs)' as any);
          }
        } else if (user?.role === 'gestor') {
          if (APP_CONFIG.FEATURES.ENABLE_ADMIN_GESTOR_ROLES) {
            router.replace('/(gestor)/dashboard' as any);
          } else {
            router.replace('/(tabs)' as any);
          }
        } else if (user?.role === 'operador') {
          router.replace('/(operador)/dashboard' as any);
        } else {
          router.replace('/(tabs)' as any);
        }
      }

      // Authorization guard: restrict access to admin group
      if (inAdminGroup) {
        if (!APP_CONFIG.FEATURES.ENABLE_ADMIN_GESTOR_ROLES) {
          router.replace('/(tabs)' as any);
        } else if (user?.role !== 'admin') {
          Alert.alert('Acceso Restringido', 'No tiene privilegios para acceder al panel de administración.');
          if (user?.role === 'gestor') {
            router.replace('/(gestor)/dashboard' as any);
          } else if (user?.role === 'operador') {
            router.replace('/(operador)/dashboard' as any);
          } else {
            router.replace('/(auth)/login' as any);
          }
        }
      }

      // Authorization guard: restrict access to gestor group
      if (inGestorGroup) {
        if (!APP_CONFIG.FEATURES.ENABLE_ADMIN_GESTOR_ROLES) {
          router.replace('/(tabs)' as any);
        } else if (user?.role !== 'gestor' && user?.role !== 'admin') {
          Alert.alert('Acceso Restringido', 'No tiene privilegios para acceder al panel de organización.');
          if (user?.role === 'operador') {
            router.replace('/(operador)/dashboard' as any);
          } else {
            router.replace('/(auth)/login' as any);
          }
        }
      }

      // Authorization guard: restrict access to operador group
      if (inOperadorGroup) {
        const hasSupervisorAccess = APP_CONFIG.FEATURES.ENABLE_ADMIN_GESTOR_ROLES
          ? (user?.role === 'operador' || user?.role === 'admin' || user?.role === 'gestor')
          : (user?.role === 'operador');

        if (!hasSupervisorAccess) {
          Alert.alert('Acceso Restringido', 'No tiene privilegios para acceder al panel de control de puerta.');
          router.replace('/(auth)/login' as any);
        }
      }
    }
  }, [isAuthenticated, isLoading, segments, user]);

  return (
    <ThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        {APP_CONFIG.FEATURES.ENABLE_ADMIN_GESTOR_ROLES && (
          <>
            <Stack.Screen name="(admin)" options={{ headerShown: false }} />
            <Stack.Screen name="(gestor)" options={{ headerShown: false }} />
          </>
        )}
        <Stack.Screen name="(operador)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Loader visible={isLoading} message="Inicializando sesión..." />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <CustomThemeProvider>
        <AuthProvider>
          <RootLayoutNavigation />
        </AuthProvider>
      </CustomThemeProvider>
    </LanguageProvider>
  );
}
