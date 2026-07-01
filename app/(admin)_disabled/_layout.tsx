import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '../../src/styles/theme';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.dark.background,
        },
        headerTintColor: COLORS.dark.textPrimary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="dashboard"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="users"
        options={{
          title: 'Usuarios',
        }}
      />
      <Stack.Screen
        name="backups"
        options={{
          title: 'Base de Datos',
        }}
      />
      <Stack.Screen
        name="metrics"
        options={{
          title: 'Rendimiento',
        }}
      />
      <Stack.Screen
        name="logs"
        options={{
          title: 'Visor de Sockets',
        }}
      />
      <Stack.Screen
        name="broadcast"
        options={{
          title: 'Anuncio SMTP',
        }}
      />
    </Stack>
  );
}
