import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '../../src/styles/theme';

export default function OperadorLayout() {
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
        name="incidents"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="stats"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
