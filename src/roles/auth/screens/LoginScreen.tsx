import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import Loader from '../../../components/Loader';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import APP_CONFIG from '../../../core/config/app.config';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../styles/theme';
import { useRouter } from 'expo-router';

export const LoginScreen = () => {
  const { isDarkMode, colors } = useTheme();
  const styles = getStyles(colors, isDarkMode);
  const { login, loginMock } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos Incompletos', 'Por favor, ingrese su correo electrónico y contraseña.');
      return;
    }

    setLoading(true);
    const trimmedEmail = email.trim().toLowerCase();
    try {
      const success = await login(trimmedEmail, password);
      if (!success) {
        Alert.alert('Acceso Denegado', 'Las credenciales proporcionadas no son válidas.');
      }
    } catch (error: any) {
      console.warn('Network login failed, trying fallback to offline mock...', error);

      // Auto-fallback to offline mock session for development
      if (trimmedEmail.includes('admin')) {
        if (APP_CONFIG.FEATURES.ENABLE_ADMIN_GESTOR_ROLES) {
          Alert.alert('Modo Local (Offline)', 'Servidor no disponible. Accediendo con credenciales locales de Administrador.');
          await loginMock('admin');
        } else {
          Alert.alert('Acceso Denegado', 'El rol de Administrador está desactivado en esta versión.');
        }
      } else if (trimmedEmail.includes('jimena') || trimmedEmail.includes('gestor')) {
        if (APP_CONFIG.FEATURES.ENABLE_ADMIN_GESTOR_ROLES) {
          Alert.alert('Modo Local (Offline)', 'Servidor no disponible. Accediendo con credenciales locales de Gestor.');
          await loginMock('gestor');
        } else {
          Alert.alert('Acceso Denegado', 'El rol de Gestor está desactivado en esta versión.');
        }
      } else if (trimmedEmail.includes('operador')) {
        Alert.alert('Modo Local (Offline)', 'Servidor no disponible. Accediendo con credenciales locales de Operador.');
        await loginMock('operador');
      } else if (trimmedEmail.includes('cliente') || trimmedEmail.includes('usuario')) {
        Alert.alert('Modo Local (Offline)', 'Servidor no disponible. Accediendo con credenciales locales de Usuario.');
        await loginMock('usuario');
      } else {
        Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor central: ' + (error.message || 'Request timed out'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'admin' | 'gestor' | 'operador' | 'usuario') => {
    if ((role === 'admin' || role === 'gestor') && !APP_CONFIG.FEATURES.ENABLE_ADMIN_GESTOR_ROLES) {
      Alert.alert('Acceso Denegado', 'El rol seleccionado está desactivado en esta versión.');
      return;
    }

    setLoading(true);
    let quickEmail = 'admin@laikaclub.com';
    if (role === 'gestor') quickEmail = 'jimena@laikaclub.com';
    if (role === 'operador') quickEmail = 'operador@laikaclub.com';
    if (role === 'usuario') quickEmail = 'cliente@laikaclub.com';
    const quickPass = 'password123'; // Standard mock password

    setEmail(quickEmail);
    setPassword(quickPass);

    try {
      const success = await loginMock(role);
      if (!success) {
        Alert.alert('Acceso Denegado', 'Fallo al autenticar la cuenta de prueba.');
      }
    } catch (error: any) {
      Alert.alert('Error de Autenticación', error.message || 'No se pudo realizar el inicio rápido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Loader visible={loading} message="Autenticando credenciales..." />

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
            <Text style={styles.brandTagline}>Plataforma de Control de Espectáculos</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Iniciar Sesión</Text>

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
              title="Iniciar Sesión"
              variant="primary"
              size="lg"
              onPress={handleLogin}
              style={styles.loginBtn}
            />

            <TouchableOpacity 
              onPress={() => router.push('/(auth)/register' as any)}
              style={{ marginTop: SPACING.md, alignItems: 'center' }}
            >
              <Text style={{ color: colors.primary, fontSize: TYPOGRAPHY.fontSizes.xs - 1, fontWeight: 'bold' }}>
                ¿No tienes cuenta? Regístrate aquí
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Mock Credentials Section */}
          <View style={styles.quickAccessSection}>
            <Text style={styles.quickAccessTitle}>Ingreso Rápido (Desarrollo/Demo)</Text>
            <View style={styles.quickAccessButtons}>
              {APP_CONFIG.FEATURES.ENABLE_ADMIN_GESTOR_ROLES && (
                <>
                  <TouchableOpacity
                    style={[styles.quickBtn, { borderColor: colors.primary }]}
                    onPress={() => handleQuickLogin('admin')}
                  >
                    <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
                    <Text style={[styles.quickBtnText, { color: colors.primary }]}>Admin Role</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.quickBtn, { borderColor: colors.secondary }]}
                    onPress={() => handleQuickLogin('gestor')}
                  >
                    <Ionicons name="ribbon" size={14} color={colors.secondary} />
                    <Text style={[styles.quickBtnText, { color: colors.secondary }]}>Gestor Role</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={[styles.quickBtn, { borderColor: colors.success }]}
                onPress={() => handleQuickLogin('operador')}
              >
                <Ionicons name="barcode-outline" size={14} color={colors.success} />
                <Text style={[styles.quickBtnText, { color: colors.success }]}>Operador Role</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickBtn, { borderColor: '#e2e8f0' }]}
                onPress={() => handleQuickLogin('usuario')}
              >
                <Ionicons name="people-outline" size={14} color="#e2e8f0" />
                <Text style={[styles.quickBtnText, { color: '#e2e8f0' }]}>Usuario Role</Text>
              </TouchableOpacity>
            </View>
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
  loginBtn: {
    marginTop: SPACING.sm,
  },
  quickAccessSection: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  quickAccessTitle: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  quickAccessButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
    width: '100%',
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1.5,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: colors.surface,
    gap: SPACING.xs,
    minWidth: 100,
    flex: 1,
  },
  quickBtnText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
});

export default LoginScreen;
