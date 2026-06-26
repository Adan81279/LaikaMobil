import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '../../src/styles/theme';

export default function GestorLayout() {
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
        name="events"
        options={{
          title: 'Organizador de Shows',
        }}
      />
      <Stack.Screen
        name="event-form"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="venues"
        options={{
          title: 'Auditorios y Complejos',
        }}
      />
      <Stack.Screen
        name="seatmap-config"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="merchandise"
        options={{
          title: 'Catálogo de Souvenirs',
        }}
      />
    </Stack>
  );
}
