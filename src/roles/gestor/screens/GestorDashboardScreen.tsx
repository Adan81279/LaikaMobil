import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../styles/theme';
import gestorService, { GestorDashboardStats } from '../services/gestor.service';
import Card from '../../../components/Card';
import Loader from '../../../components/Loader';

export const GestorDashboardScreen = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<GestorDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await gestorService.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching gestor statistics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Desea salir del portal de Gestor de Eventos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const menuItems = [
    {
      title: 'Mis Eventos',
      desc: 'Crear borradores, editar y publicar en catálogo',
      icon: 'calendar-outline' as const,
      route: '/(gestor)/events',
      color: COLORS.secondary,
    },
    {
      title: 'Recintos y Salas',
      desc: 'Definir complejos de espectáculos y aforos',
      icon: 'business-outline' as const,
      route: '/(gestor)/venues',
      color: COLORS.primary,
    },
    {
      title: 'Bazar de Recuerdos',
      desc: 'Administrar mercancía oficial y stock de ventas',
      icon: 'shirt-outline' as const,
      route: '/(gestor)/merchandise',
      color: COLORS.warning,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Loader visible={loading && !refreshing} message="Analizando ingresos..." />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header Block */}
        <View style={styles.header}>
          <View style={styles.profileRow}>
            <View style={styles.avatarMock}>
              <Ionicons name="person" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.profileText}>
              <Text style={styles.welcomeText}>Portal de Organización</Text>
              <Text style={styles.nameText}>{user?.name || 'Gestor Laika'}</Text>
              <View style={styles.badge}>
                <Ionicons name="ribbon-outline" size={12} color="#FFFFFF" />
                <Text style={styles.badgeText}>Event Coordinator</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
              <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Business Sales Dashboard */}
        <Text style={styles.sectionTitle}>Resumen de Ventas</Text>
        <View style={styles.statsOverviewRow}>
          <Card style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Boletos Vendidos</Text>
            <Text style={styles.overviewValue}>{stats?.tickets_sold || 0}</Text>
            <Text style={styles.overviewSubText}>Boletos Totales</Text>
          </Card>
          <Card style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Ingresos Totales</Text>
            <Text style={[styles.overviewValue, { color: COLORS.success }]}>
              {stats ? `$${stats.total_revenue.toLocaleString()}` : '$0'}
            </Text>
            <Text style={styles.overviewSubText}>Moneda Nacional (MXN)</Text>
          </Card>
        </View>

        {/* Capacity sold percentage */}
        <Card style={styles.capacityCard}>
          <View style={styles.capacityHeader}>
            <Text style={styles.capacityTitle}>Aforo Promedio Vendido</Text>
            <Text style={styles.capacityValue}>{stats?.sold_percentage || 0}%</Text>
          </View>
          <View style={styles.capacityBarBg}>
            <View style={[styles.capacityBarFill, { width: `${stats?.sold_percentage || 0}%` }]} />
          </View>
          <Text style={styles.capacityDesc}>
            Se han colocado {stats?.tickets_sold} entradas de los recintos activos organizados.
          </Text>
        </Card>

        {/* Coordinator Operations */}
        <Text style={styles.sectionTitle}>Módulos del Organizador</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuCard}
              activeOpacity={0.8}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon} size={26} color={item.color} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.dark.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
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
    paddingBottom: SPACING.xl,
  },
  header: {
    marginBottom: SPACING.lg,
    paddingTop: SPACING.xs,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarMock: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  welcomeText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.dark.textSecondary,
  },
  nameText: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    marginLeft: 4,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.dark.surface,
    borderColor: COLORS.dark.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  statsOverviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  overviewCard: {
    flex: 0.48,
    padding: SPACING.md,
  },
  overviewLabel: {
    fontSize: 11,
    color: COLORS.dark.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  overviewValue: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
    marginVertical: SPACING.xs,
  },
  overviewSubText: {
    fontSize: 9,
    color: COLORS.dark.textMuted,
  },
  capacityCard: {
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  capacityTitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
  },
  capacityValue: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.secondary,
  },
  capacityBarBg: {
    height: 8,
    backgroundColor: COLORS.dark.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  capacityBarFill: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: 4,
  },
  capacityDesc: {
    fontSize: 10,
    color: COLORS.dark.textSecondary,
    lineHeight: 14,
  },
  menuGrid: {
    gap: SPACING.md,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dark.surface,
    borderColor: COLORS.dark.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
  },
  menuDesc: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.dark.textSecondary,
    marginTop: 2,
  },
});

export default GestorDashboardScreen;
