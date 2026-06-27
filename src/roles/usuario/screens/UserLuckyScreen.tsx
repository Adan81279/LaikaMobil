import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../styles/theme';
import usuarioService, { UserStats, Coupon } from '../services/usuario.service';
import Card from '../../../components/Card';
import Loader from '../../../components/Loader';
import Button from '../../../components/Button';
import * as Haptics from 'expo-haptics';

export const UserLuckyScreen = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Roulette Animation States
  const [spinning, setSpinning] = useState(false);
  const spinAnim = useState(new Animated.Value(0))[0];
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [spinResultMsg, setSpinResultMsg] = useState('');
  const [spinSuccess, setSpinSuccess] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const uStats = await usuarioService.getAchievements();
      const uCoupons = await usuarioService.getCoupons();
      setStats(uStats);
      setCoupons(uCoupons);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSpinWheel = () => {
    if (spinning) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    setSpinning(true);
    spinAnim.setValue(0);

    // Run spin animation (4 rotations = 1440 degrees + random offset)
    const randomOffset = Math.random();
    Animated.timing(spinAnim, {
      toValue: 1 + randomOffset,
      duration: 3500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(async () => {
      // Call service to process reward
      try {
        const result = await usuarioService.spinLuckySeat();
        setSpinResultMsg(result.message);
        setSpinSuccess(result.success);
        setResultModalVisible(true);
        
        // Haptic feedback for result
        try {
          if (result.success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        } catch (h) {}
      } catch (err) {
        Alert.alert('Error', 'Hubo un error al girar la ruleta.');
      } finally {
        setSpinning(false);
        fetchUserData(); // Reload XP and coupons
      }
    });
  };

  if (loading && !stats) {
    return <Loader visible={true} message="Cargando tus recompensas..." />;
  }

  // Map 0-1 spinAnim value to rotation string degrees
  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 2],
    outputRange: ['0deg', '1080deg'], // up to 3 full rotations
  });

  const xpPercent = stats ? (stats.xp / stats.next_level_xp) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gamificación & Recompensas</Text>
        <Text style={styles.headerSubtitle}>Gana descuentos exclusivos asistiendo a shows</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* LEVEL PROGRESS PANEL */}
        {stats && (
          <Card style={styles.progressCard}>
            <View style={styles.levelHeader}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelLabel}>NIVEL</Text>
                <Text style={styles.levelNumber}>{stats.level}</Text>
              </View>
              <View style={styles.levelMeta}>
                <Text style={styles.rankTitle}>Espectador Frecuente</Text>
                <Text style={styles.xpText}>{stats.xp} / {stats.next_level_xp} XP</Text>
              </View>
            </View>
            
            {/* Progress bar */}
            <View style={styles.progressBarWrapper}>
              <View style={[styles.progressBarFill, { width: `${xpPercent}%` }]} />
            </View>
            <Text style={styles.progressBarHint}>Consigue 500 XP más para subir de nivel</Text>
          </Card>
        )}

        {/* LUCKY SEAT WHEEL OF FORTUNE */}
        <Text style={styles.sectionTitle}>Sorteo Diario: Lucky Seat</Text>
        <Card style={styles.wheelCard}>
          <Text style={styles.wheelCardTitle}>¡Gira y Gana Cupones!</Text>
          <Text style={styles.wheelCardDesc}>Puedes ganar hasta un 25% de descuento en boletos.</Text>
          
          <View style={styles.wheelWrapper}>
            {/* Pointer indicator */}
            <View style={styles.wheelPointer}>
              <Ionicons name="caret-down-sharp" size={28} color={COLORS.primary} />
            </View>

            {/* Rotating Wheel body */}
            <Animated.View style={[styles.wheelCircle, { transform: [{ rotate: spinRotation }] }]}>
              {/* Concentric colored segments */}
              <View style={[styles.wheelSegment, styles.seg1]} />
              <View style={[styles.wheelSegment, styles.seg2]} />
              <View style={[styles.wheelSegment, styles.seg3]} />
              <View style={[styles.wheelSegment, styles.seg4]} />
              
              {/* Inner ring */}
              <View style={styles.wheelInner}>
                <Ionicons name="sparkles" size={24} color={COLORS.primary} />
              </View>
            </Animated.View>
          </View>

          <Button
            title={spinning ? 'Girando...' : 'Girar Ruleta'}
            disabled={spinning}
            onPress={handleSpinWheel}
            style={styles.spinBtn}
            icon={<Ionicons name="refresh" size={18} color="#FFFFFF" />}
          />
        </Card>

        {/* BADGES COLLECTION */}
        <Text style={styles.sectionTitle}>Mis Medallas ({stats?.badges.length})</Text>
        <Card style={styles.badgesCard}>
          <View style={styles.badgesGrid}>
            {stats?.badges.map((badge) => (
              <View key={badge.id} style={styles.badgeItem}>
                <View style={styles.badgeIconContainer}>
                  <Ionicons name={badge.icon as any} size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.badgeItemName}>{badge.name}</Text>
                <Text style={styles.badgeItemDesc}>{badge.desc}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* ACTIVE COUPONS */}
        <Text style={styles.sectionTitle}>Mis Cupones Disponibles</Text>
        {coupons.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No tienes cupones de descuento activos.</Text>
            <Text style={styles.emptySubtext}>Gira la ruleta Lucky Seat para obtener cupones.</Text>
          </Card>
        ) : (
          coupons.map((coupon) => (
            <Card key={coupon.code} style={styles.couponCard}>
              <View style={styles.couponLeft}>
                <Text style={styles.couponCode}>{coupon.code}</Text>
                <Text style={styles.couponDesc}>{coupon.description}</Text>
                <Text style={styles.couponExpiry}>Expira: {coupon.expiry}</Text>
              </View>
              <View style={styles.couponRight}>
                <Text style={styles.discountPct}>{coupon.discount}%</Text>
                <Text style={styles.discountOff}>OFF</Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* RESULT MODAL */}
      <Modal
        visible={resultModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setResultModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.resultHeader}>
              <Ionicons 
                name={spinSuccess ? 'trophy' : 'sad-outline'} 
                size={54} 
                color={spinSuccess ? '#f59e0b' : COLORS.dark.textSecondary} 
              />
              <Text style={styles.resultTitle}>
                {spinSuccess ? '¡Excelente!' : 'Suerte para la próxima'}
              </Text>
            </View>
            
            <Text style={styles.resultText}>{spinResultMsg}</Text>
            
            <Button
              title="Aceptar"
              onPress={() => setResultModalVisible(false)}
              style={styles.resultBtn}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070a13',
  },
  header: {
    padding: SPACING.md,
    backgroundColor: '#0b0f19',
    borderBottomWidth: 1,
    borderColor: '#151c2c',
    paddingTop: 45,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg + 2,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.dark.textSecondary,
    marginTop: 2,
  },
  scrollContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  progressCard: {
    marginBottom: SPACING.md,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  levelBadge: {
    backgroundColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelLabel: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  levelNumber: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.fontSizes.md + 2,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    lineHeight: 18,
  },
  levelMeta: {
    flex: 1,
  },
  rankTitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
  },
  xpText: {
    fontSize: 10,
    color: COLORS.dark.textSecondary,
    marginTop: 2,
  },
  progressBarWrapper: {
    height: 6,
    backgroundColor: '#151c2c',
    borderRadius: BORDER_RADIUS.round,
    overflow: 'hidden',
    marginVertical: SPACING.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.round,
  },
  progressBarHint: {
    fontSize: 9,
    color: COLORS.dark.textMuted,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    marginTop: SPACING.sm,
  },
  wheelCard: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  wheelCardTitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm + 1,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
  },
  wheelCardDesc: {
    fontSize: 10,
    color: COLORS.dark.textSecondary,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  wheelWrapper: {
    width: 170,
    height: 170,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  wheelPointer: {
    position: 'absolute',
    top: -12,
    zIndex: 10,
  },
  wheelCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: '#151c2c',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#070a13',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelSegment: {
    position: 'absolute',
    width: 80,
    height: 80,
    top: 0,
    left: 0,
    transformOrigin: 'bottom right',
  },
  seg1: {
    backgroundColor: `${COLORS.primary}30`,
    transform: [{ rotate: '0deg' }],
  },
  seg2: {
    backgroundColor: `${COLORS.success}20`,
    transform: [{ rotate: '90deg' }],
  },
  seg3: {
    backgroundColor: '#f59e0b20',
    transform: [{ rotate: '180deg' }],
  },
  seg4: {
    backgroundColor: '#a855f720',
    transform: [{ rotate: '270deg' }],
  },
  wheelInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0b0f19',
    borderColor: '#1e293b',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  spinBtn: {
    width: '100%',
  },
  badgesCard: {
    marginBottom: SPACING.md,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'space-between',
  },
  badgeItem: {
    width: '30%',
    alignItems: 'center',
    padding: SPACING.xs,
  },
  badgeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#151c2c',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeItemName: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  badgeItemDesc: {
    fontSize: 7,
    color: COLORS.dark.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  emptyCard: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textSecondary,
  },
  emptySubtext: {
    fontSize: 9,
    color: COLORS.dark.textMuted,
    marginTop: 2,
  },
  couponCard: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    padding: SPACING.sm,
  },
  couponLeft: {
    flex: 1,
    gap: 3,
  },
  couponCode: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  couponDesc: {
    fontSize: 10,
    color: '#FFFFFF',
  },
  couponExpiry: {
    fontSize: 8,
    color: COLORS.dark.textMuted,
  },
  couponRight: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#151c2c',
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    width: 60,
  },
  discountPct: {
    fontSize: TYPOGRAPHY.fontSizes.sm + 1,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.success,
  },
  discountOff: {
    fontSize: 8,
    color: COLORS.dark.textMuted,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#0b0f19',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    width: '80%',
    gap: SPACING.md,
  },
  resultHeader: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  resultTitle: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
  },
  resultText: {
    fontSize: 11,
    color: COLORS.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  resultBtn: {
    width: '100%',
  },
});

export default UserLuckyScreen;
