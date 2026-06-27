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

export const OperadorDashboardScreen = () => {
  const router = useRouter();
  const { logout } = useAuth();
  const [ticketCode, setTicketCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<OperatorStats | null>(null);

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

  return (
    <SafeAreaView style={styles.container}>
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
              <Ionicons name="analytics" size={20} color={COLORS.secondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.logoutBtnHeader} 
              onPress={handleLogout}
            >
              <Ionicons name="log-out" size={20} color={COLORS.error} />
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
            <View style={[styles.statMiniCard, { borderColor: `${COLORS.success}40` }]}>
              <Text style={[styles.statMiniVal, { color: COLORS.success }]}>{stats.valid_today}</Text>
              <Text style={styles.statMiniLabel}>Válidos</Text>
            </View>
            <View style={[styles.statMiniCard, { borderColor: `${COLORS.error}40` }]}>
              <Text style={[styles.statMiniVal, { color: COLORS.error }]}>
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
                <Ionicons name="camera-outline" size={32} color={COLORS.dark.textMuted} />
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
                    <Ionicons name="refresh-outline" size={22} color="#FFFFFF" />
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
              placeholderTextColor={COLORS.dark.textMuted}
              value={ticketCode}
              onChangeText={setTicketCode}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={() => handleValidate()}
            />
            <TouchableOpacity style={styles.scanBtn} onPress={() => handleValidate()}>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Card>

        {/* SIMULATOR PRESET BADGES */}
        <View style={styles.presetSection}>
          <Text style={styles.presetTitle}>Simulación de Escaneo (Desarrollo)</Text>
          <View style={styles.presetRow}>
            <TouchableOpacity 
              style={[styles.presetBadge, { backgroundColor: `${COLORS.success}20`, borderColor: COLORS.success }]}
              onPress={() => triggerPreset('TKT-VALID-123')}
            >
              <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.success} />
              <Text style={[styles.presetText, { color: COLORS.success }]}>QR Válido</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.presetBadge, { backgroundColor: `${COLORS.warning}20`, borderColor: COLORS.warning }]}
              onPress={() => triggerPreset('TKT-USED-456')}
            >
              <Ionicons name="alert-circle-outline" size={14} color={COLORS.warning} />
              <Text style={[styles.presetText, { color: COLORS.warning }]}>QR Usado</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.presetBadge, { backgroundColor: `${COLORS.error}20`, borderColor: COLORS.error }]}
              onPress={() => triggerPreset('TKT-INVALID-999')}
            >
              <Ionicons name="close-circle-outline" size={14} color={COLORS.error} />
              <Text style={[styles.presetText, { color: COLORS.error }]}>QR Inválido</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* VALIDATION RESULT PANEL */}
        {validationResult && (
          <Card 
            style={StyleSheet.flatten([
              styles.resultCard, 
              validationResult.valid 
                ? { borderColor: COLORS.success, backgroundColor: `${COLORS.success}10` }
                : { borderColor: COLORS.warning, backgroundColor: `${COLORS.warning}10` }
            ])}
          >
            <View style={styles.resultHeader}>
              <Ionicons 
                name={validationResult.valid ? "checkmark-circle" : "warning"} 
                size={36} 
                color={validationResult.valid ? COLORS.success : COLORS.warning} 
              />
              <View style={styles.resultMeta}>
                <Text style={[styles.resultTitleText, { color: validationResult.valid ? COLORS.success : COLORS.warning }]}>
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
                <View style={[styles.detailRow, { borderTopWidth: 0.5, borderTopColor: `${COLORS.warning}30`, marginTop: 4, paddingTop: 4 }]}>
                  <Text style={[styles.detailLabel, { color: COLORS.warning }]}>Redimido el:</Text>
                  <Text style={[styles.detailVal, { color: COLORS.warning }]}>
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
                icon={<Ionicons name="shield-outline" size={14} color="#FFFFFF" />}
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
          <Card style={StyleSheet.flatten([styles.resultCard, { borderColor: COLORS.error, backgroundColor: `${COLORS.error}10` }])}>
            <View style={styles.resultHeader}>
              <Ionicons name="close-circle" size={36} color={COLORS.error} />
              <View style={styles.resultMeta}>
                <Text style={[styles.resultTitleText, { color: COLORS.error }]}>ACCESO DENEGADO</Text>
                <Text style={styles.resultCodeText}>Error de Validación</Text>
              </View>
            </View>
            <Text style={styles.errorText}>{validationError}</Text>
            <Button
              title="Reportar como Sospechoso"
              variant="secondary"
              size="sm"
              icon={<Ionicons name="flag-outline" size={14} color="#FFFFFF" />}
              onPress={() => router.push({
                pathname: '/(operador)/incidents',
                params: { code: ticketCode || 'DESCONOCIDO' }
              } as any)}
              style={styles.incidentBtn}
            />
          </Card>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark.background,
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
    color: COLORS.dark.textPrimary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.dark.textSecondary,
    marginTop: 2,
  },
  statsShortcut: {
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.dark.surface,
    borderColor: COLORS.dark.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: COLORS.dark.surface,
    borderColor: COLORS.dark.border,
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
    backgroundColor: COLORS.dark.surface,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  statMiniVal: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
  },
  statMiniLabel: {
    fontSize: 9,
    color: COLORS.dark.textSecondary,
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
    color: COLORS.dark.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  scannerWrapper: {
    height: 180,
    backgroundColor: '#070a13',
    borderRadius: BORDER_RADIUS.md,
    borderColor: '#1e293b',
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
    borderColor: COLORS.secondary,
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
    backgroundColor: COLORS.secondary,
    shadowColor: COLORS.secondary,
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
    color: COLORS.dark.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.md,
  },
  codeInput: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.dark.background,
    borderColor: COLORS.dark.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    color: COLORS.dark.textPrimary,
    fontSize: TYPOGRAPHY.fontSizes.sm,
  },
  scanBtn: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.primary,
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
    color: COLORS.dark.textSecondary,
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
    borderBottomColor: '#334155',
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
    color: COLORS.dark.textSecondary,
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
    color: COLORS.dark.textSecondary,
  },
  detailVal: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
  },
  incidentBtn: {
    marginTop: SPACING.xs,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.error,
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
    color: COLORS.dark.textSecondary,
    textAlign: 'center',
  },
  permissionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  permissionBtnText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(11, 15, 25, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  scanAgainText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
    marginTop: 4,
  },
});

export default OperadorDashboardScreen;
