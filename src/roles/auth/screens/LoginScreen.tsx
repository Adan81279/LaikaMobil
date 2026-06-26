import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import Loader from '../../../components/Loader';
import { useAuth } from '../../../context/AuthContext';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../styles/theme';

export const LoginScreen = () => {
  const { login, loginMock } = useAuth();
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
        Alert.alert('Modo Local (Offline)', 'Servidor no disponible. Accediendo con credenciales locales de Administrador.');
        await loginMock('admin');
      } else if (trimmedEmail.includes('jimena') || trimmedEmail.includes('gestor')) {
        Alert.alert('Modo Local (Offline)', 'Servidor no disponible. Accediendo con credenciales locales de Gestor.');
        await loginMock('gestor');
      } else if (trimmedEmail.includes('operador')) {
        Alert.alert('Modo Local (Offline)', 'Servidor no disponible. Accediendo con credenciales locales de Operador.');
        await loginMock('operador');
      } else {
        Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor central: ' + (error.message || 'Request timed out'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'admin' | 'gestor') => {
    setLoading(true);
    const quickEmail = role === 'admin' ? 'admin@laikaclub.com' : 'jimena@laikaclub.com';
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
            <View style={styles.logoCircle}>
              <Ionicons name="paw" size={48} color={COLORS.secondary} />
            </View>
            <Text style={styles.brandName}>LAIKA CLUB</Text>
            <Text style={styles.brandTagline}>Plataforma de Control de Espectáculos</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Iniciar Sesión</Text>

            <Input
              label="Correo Electrónico"
              placeholder="correo@ejemplo.com"
              placeholderTextColor={COLORS.dark.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              leftIcon="mail-outline"
            />

            <Input
              label="Contraseña"
              placeholder="••••••••"
              placeholderTextColor={COLORS.dark.textMuted}
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
          </View>

          {/* Quick Mock Credentials Section */}
          <View style={styles.quickAccessSection}>
            <Text style={styles.quickAccessTitle}>Ingreso Rápido (Desarrollo/Demo)</Text>
            <View style={styles.quickAccessButtons}>
              <TouchableOpacity
                style={[styles.quickBtn, { borderColor: COLORS.primary }]}
                onPress={() => handleQuickLogin('admin')}
              >
                <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
                <Text style={[styles.quickBtnText, { color: COLORS.primary }]}>Admin Role</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickBtn, { borderColor: COLORS.secondary }]}
                onPress={() => handleQuickLogin('gestor')}
              >
                <Ionicons name="ribbon" size={16} color={COLORS.secondary} />
                <Text style={[styles.quickBtnText, { color: COLORS.secondary }]}>Gestor Role</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark.background,
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
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: `${COLORS.secondary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    ...SHADOWS.md,
  },
  brandName: {
    fontSize: 26,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
    letterSpacing: 2,
  },
  brandTagline: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.dark.textSecondary,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: COLORS.dark.surface,
    borderColor: COLORS.dark.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  formTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
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
    color: COLORS.dark.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  quickAccessButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    justifyContent: 'center',
    width: '100%',
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1.5,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.dark.surface,
    gap: SPACING.xs,
    minWidth: 130,
  },
  quickBtnText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
});

export default LoginScreen;
