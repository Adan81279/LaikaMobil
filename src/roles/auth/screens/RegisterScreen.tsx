import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import Loader from '../../../components/Loader';
import { useTheme } from '../../../context/ThemeContext';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../styles/theme';
import { useRouter } from 'expo-router';
import authService from '../../../services/auth.service';

export const RegisterScreen = () => {
  const { isDarkMode, colors } = useTheme();
  const styles = getStyles(colors, isDarkMode);
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Campos Incompletos', 'Por favor, rellene todos los campos.');
      return;
    }

    setLoading(true);
    try {
      await authService.register(email, name, password);
      Alert.alert(
        'Cuenta Creada',
        'Tu cuenta ha sido creada exitosamente. Ahora puedes iniciar sesión.',
        [{ text: 'Aceptar', onPress: () => router.replace('/(auth)/login' as any) }]
      );
    } catch (error: any) {
      Alert.alert('Error al Registrar', error.message || 'No se pudo crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Loader visible={loading} message="Creando cuenta..." />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">

          {/* Brand/Logo Section */}
          <View style={styles.logoSection}>
            <Image
              source={require('../../../../assets/images/laika_club_logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.brandTagline}>Únete a la plataforma de espectáculos de Laika Club</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Crear Cuenta</Text>

            <Input
              label="Nombre Completo"
              placeholder="Juan Pérez"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
              leftIcon="person-outline"
            />

            <Input
              label="Correo Electrónico"
              placeholder="correo@ejemplo.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              leftIcon="mail-outline"
            />

            <Input
              label="Contraseña"
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              leftIcon="lock-closed-outline"
            />

            <Button
              title="Registrarse"
              variant="primary"
              size="lg"
              onPress={handleRegister}
              style={styles.registerBtn}
            />

            <TouchableOpacity 
              onPress={() => router.replace('/(auth)/login' as any)}
              style={{ marginTop: SPACING.md, alignItems: 'center' }}
            >
              <Text style={{ color: colors.primary, fontSize: TYPOGRAPHY.fontSizes.xs - 1, fontWeight: 'bold' }}>
                ¿Ya tienes cuenta? Inicia sesión aquí
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoImage: {
    width: 220,
    height: 70,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#FFFFFF',
    padding: SPACING.xs,
    marginBottom: SPACING.md,
  },
  brandTagline: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  formTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: SPACING.md,
  },
  registerBtn: {
    marginTop: SPACING.sm,
  },
});

export default RegisterScreen;
