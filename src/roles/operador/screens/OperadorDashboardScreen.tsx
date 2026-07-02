import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../styles/theme';
import operadorService, { TicketValidationResponse, OperatorStats } from '../services/operador.service';
import Card from '../../../components/Card';
import Loader from '../../../components/Loader';
import Button from '../../../components/Button';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import EditProfileModal from '../../../components/EditProfileModal';
import { StatusBar } from 'expo-status-bar';

export const OperadorDashboardScreen = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isDarkMode, colors } = useTheme();
  const [ticketCode, setTicketCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<OperatorStats | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const handleLogout = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir de la cuenta de Operador?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', style: 'destructive', onPress: () => logout() }
      ]
    );
  };
  
  // Validation Results State
  const [validationResult, setValidationResult] = useState<TicketValidationResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Camera scanning permissions and state
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  
  // Animated laser line value
  const laserAnim = useState(new Animated.Value(0))[0];

  const fetchStats = async () => {
    try {
      const data = await operadorService.getStats();
      setStats(data);
    } catch (e) {
      console.error('Error fetching operator stats:', e);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Animate the scanner laser line continuously
    Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleValidate = async (codeToUse?: string) => {
    const code = (codeToUse || ticketCode).trim();
    if (!code) {
      Alert.alert('Código Requerido', 'Por favor, ingrese un código de boleto.');
      return;
    }

    setScanned(true); // Pause scanning
    setLoading(true);
    setValidationResult(null);
    setValidationError(null);

    // Simulate haptic scan start
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    try {
      const result = await operadorService.validateTicket(code);
      setValidationResult(result);
      
      // Haptics success or warning
      try {
        if (result.valid) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      } catch (h) {}
      
      setTicketCode('');
      fetchStats(); // Update totals
    } catch (err: any) {
      setValidationError(err.message || 'Código de boleto inexistente.');
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (h) {}
    } finally {
      setLoading(false);
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (loading || scanned) return;
    handleValidate(data);
  };

  const handleResetScanner = () => {
    setScanned(false);
    setValidationResult(null);
    setValidationError(null);
    setTicketCode('');
  };

  const triggerPreset = (code: string) => {
    setTicketCode(code);
    handleValidate(code);
  };

  const laserY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 170], // Height of scanning window bounds
  });

  const styles = getStyles(colors, isDarkMode);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Loader visible={loading} message="Validando boleto..." />

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: SPACING.sm }}>
            <Text style={styles.title}>Control de Acceso</Text>
            <Text style={styles.subtitle}>Escaneo en puerta del recinto y registro de boletos.</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.statsShortcut} 
              onPress={() => router.push('/(operador)/stats' as any)}
            >
              <Ionicons name="analytics" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.statsShortcut} 
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch(e){}
                setIsEditModalVisible(true);
              }}
            >
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarMini} />
              ) : (
                <Ionicons name="person" size={20} color={colors.textPrimary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.logoutBtnHeader} 
              onPress={handleLogout}
            >
              <Ionicons name="log-out" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Counter Stats Cards */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statMiniCard}>
              <Text style={styles.statMiniVal}>{stats.scanned_today}</Text>
              <Text style={styles.statMiniLabel}>Escaneados</Text>
            </View>
            <View style={[styles.statMiniCard, { borderColor: `${colors.success}40` }]}>
              <Text style={[styles.statMiniVal, { color: colors.success }]}>{stats.valid_today}</Text>
              <Text style={styles.statMiniLabel}>Válidos</Text>
            </View>
            <View style={[styles.statMiniCard, { borderColor: `${colors.error}40` }]}>
              <Text style={[styles.statMiniVal, { color: colors.error }]}>
                {stats.invalid_today + stats.incidents_today}
              </Text>
              <Text style={styles.statMiniLabel}>Alertas</Text>
            </View>
          </View>
        )}

        {/* Camera or Fallback Scanner Window */}
        <Card style={styles.scannerCard}>
          <Text style={styles.cardTitle}>Lector QR de Acceso</Text>
          
          <View style={styles.scannerWrapper}>
            {/* Corner Bracket decorations */}
            <View style={[styles.bracket, styles.bracketTopLeft]} />
            <View style={[styles.bracket, styles.bracketTopRight]} />
            <View style={[styles.bracket, styles.bracketBottomLeft]} />
            <View style={[styles.bracket, styles.bracketBottomRight]} />

            {/* Camera View or Permission Prompt */}
            {!permission ? (
              <View style={styles.qrMockContainer}>
                <Text style={styles.scannerHint}>Cargando lector...</Text>
              </View>
            ) : !permission.granted ? (
              <View style={styles.permissionContainer}>
                <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
                <Text style={styles.permissionText}>El lector de cámara está inactivo</Text>
                <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                  <Text style={styles.permissionBtnText}>Habilitar Cámara</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={StyleSheet.absoluteFillObject}>
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                />
                
                {/* Laser animation */}
                {!scanned && (
                  <Animated.View style={[styles.laserLine, { transform: [{ translateY: laserY }] }]} />
                )}

                {/* Target Frame Overlay */}
                <View style={styles.qrTargetOverlay}>
                  <View style={styles.targetBox} />
                </View>

                {scanned && (
                  <TouchableOpacity style={styles.scanAgainOverlay} onPress={handleResetScanner}>
                    <Ionicons name="refresh-outline" size={22} color={colors.background} />
                    <Text style={styles.scanAgainText}>Reactivar Lector</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Manual Input Fallback */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.codeInput}
              placeholder="Ingrese código de boleto (Ej: TKT-VALID-123)"
              placeholderTextColor={colors.textMuted}
              value={ticketCode}
              onChangeText={setTicketCode}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={() => handleValidate()}
            />
            <TouchableOpacity style={styles.scanBtn} onPress={() => handleValidate()}>
              <Ionicons name="checkmark-circle" size={24} color={colors.background} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* SIMULATOR PRESET BADGES */}
        <View style={styles.presetSection}>
          <Text style={styles.presetTitle}>Simulación de Escaneo (Desarrollo)</Text>
          <View style={styles.presetRow}>
            <TouchableOpacity 
              style={[styles.presetBadge, { backgroundColor: `${colors.success}20`, borderColor: colors.success }]}
              onPress={() => triggerPreset('TKT-VALID-123')}
            >
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
              <Text style={[styles.presetText, { color: colors.success }]}>QR Válido</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.presetBadge, { backgroundColor: `${colors.warning}20`, borderColor: colors.warning }]}
              onPress={() => triggerPreset('TKT-USED-456')}
            >
              <Ionicons name="alert-circle-outline" size={14} color={colors.warning} />
              <Text style={[styles.presetText, { color: colors.warning }]}>QR Usado</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.presetBadge, { backgroundColor: `${colors.error}20`, borderColor: colors.error }]}
              onPress={() => triggerPreset('TKT-INVALID-999')}
            >
              <Ionicons name="close-circle-outline" size={14} color={colors.error} />
              <Text style={[styles.presetText, { color: colors.error }]}>QR Inválido</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* VALIDATION RESULT PANEL */}
        {validationResult && (
          <Card 
            style={StyleSheet.flatten([
              styles.resultCard, 
              validationResult.valid 
                ? { borderColor: colors.success, backgroundColor: `${colors.success}15` }
                : { borderColor: colors.warning, backgroundColor: `${colors.warning}15` }
            ])}
          >
            <View style={styles.resultHeader}>
              <Ionicons 
                name={validationResult.valid ? "checkmark-circle" : "warning"} 
                size={36} 
                color={validationResult.valid ? colors.success : colors.warning} 
              />
              <View style={styles.resultMeta}>
                <Text style={[styles.resultTitleText, { color: validationResult.valid ? colors.success : colors.warning }]}>
                  {validationResult.valid ? 'ACCESO PERMITIDO' : 'BOLETO YA REIVINDICADO'}
                </Text>
                <Text style={styles.resultCodeText}>Código: {validationResult.ticket_code}</Text>
              </View>
            </View>

            <View style={styles.resultDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Titular:</Text>
                <Text style={styles.detailVal}>{validationResult.owner_name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Espectáculo:</Text>
                <Text style={styles.detailVal} numberOfLines={1}>{validationResult.event_title}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Recinto / Asiento:</Text>
                <Text style={styles.detailVal}>{validationResult.venue_name} - {validationResult.seat_label}</Text>
              </View>
              {!validationResult.valid && validationResult.redeemed_at && (
                <View style={[styles.detailRow, { borderTopWidth: 0.5, borderTopColor: colors.border, marginTop: 4, paddingTop: 4 }]}>
                  <Text style={[styles.detailLabel, { color: colors.warning }]}>Redimido el:</Text>
                  <Text style={[styles.detailVal, { color: colors.warning }]}>
                    {new Date(validationResult.redeemed_at).toLocaleTimeString()} ({new Date(validationResult.redeemed_at).toLocaleDateString()})
                  </Text>
                </View>
              )}
            </View>

            {!validationResult.valid && (
              <Button
                title="Registrar Incidencia"
                variant="danger"
                size="sm"
                icon={<Ionicons name="shield-outline" size={14} color={colors.background} />}
                onPress={() => router.push({
                  pathname: '/(operador)/incidents',
                  params: { code: validationResult.ticket_code }
                } as any)}
                style={styles.incidentBtn}
              />
            )}
          </Card>
        )}

        {validationError && (
          <Card style={StyleSheet.flatten([styles.resultCard, { borderColor: colors.error, backgroundColor: `${colors.error}15` }])}>
            <View style={styles.resultHeader}>
              <Ionicons name="close-circle" size={36} color={colors.error} />
              <View style={styles.resultMeta}>
                <Text style={[styles.resultTitleText, { color: colors.error }]}>ACCESO DENEGADO</Text>
                <Text style={styles.resultCodeText}>Error de Validación</Text>
              </View>
            </View>
            <Text style={styles.errorText}>{validationError}</Text>
            <Button
              title="Reportar como Sospechoso"
              variant="secondary"
              size="sm"
              icon={<Ionicons name="flag-outline" size={14} color={colors.textPrimary} />}
              onPress={() => router.push({
                pathname: '/(operador)/incidents',
                params: { code: ticketCode || 'DESCONOCIDO' }
              } as any)}
              style={styles.incidentBtn}
            />
          </Card>
        )}

      </ScrollView>
      <EditProfileModal visible={isEditModalVisible} onClose={() => setIsEditModalVisible(false)} />
    </SafeAreaView>
  );
};

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    padding: SPACING.md,
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes.xxl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsShortcut: {
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  logoutBtnHeader: {
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  statMiniCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  statMiniVal: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  statMiniLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    marginTop: 2,
  },
  scannerCard: {
    padding: SPACING.md,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  scannerWrapper: {
    height: 180,
    backgroundColor: isDarkMode ? '#070a13' : '#F8FAFC',
    borderRadius: BORDER_RADIUS.md,
    borderColor: colors.border,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bracket: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: colors.primary,
  },
  bracketTopLeft: {
    top: 15,
    left: 15,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  bracketTopRight: {
    top: 15,
    right: 15,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bracketBottomLeft: {
    bottom: 15,
    left: 15,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bracketBottomRight: {
    bottom: 15,
    right: 15,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  laserLine: {
    position: 'absolute',
    left: 15,
    right: 15,
    height: 2,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 4,
  },
  qrMockContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  scannerHint: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.md,
  },
  codeInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    color: colors.textPrimary,
    fontSize: TYPOGRAPHY.fontSizes.sm,
  },
  scanBtn: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  presetSection: {
    marginTop: SPACING.xs,
  },
  presetTitle: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  presetRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  presetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1.5,
  },
  presetText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  resultCard: {
    borderWidth: 2,
    padding: SPACING.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingBottom: SPACING.sm,
  },
  resultMeta: {
    flex: 1,
  },
  resultTitleText: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    letterSpacing: 0.5,
  },
  resultCodeText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  resultDetails: {
    marginVertical: SPACING.sm,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: colors.textSecondary,
  },
  detailVal: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  incidentBtn: {
    marginTop: SPACING.xs,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: colors.error,
    marginVertical: SPACING.sm,
    lineHeight: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  permissionText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  permissionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  permissionBtnText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.background,
  },
  qrTargetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  targetBox: {
    width: 100,
    height: 100,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'transparent',
  },
  scanAgainOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  scanAgainText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.background,
    marginTop: 4,
  },
});

export default OperadorDashboardScreen;
