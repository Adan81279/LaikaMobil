import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../styles/theme';
import adminService, { HardwareMetrics } from '../services/admin.service';
import Card from '../../../components/Card';
import Loader from '../../../components/Loader';

export const AdminDashboardScreen = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState<HardwareMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      const data = await adminService.getHardwareMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching hardware metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMetrics();
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Está seguro de que desea salir del panel de administración?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const menuItems = [
    {
      title: 'Usuarios',
      desc: 'Gestionar roles, permisos y bloqueos',
      icon: 'people-outline' as const,
      route: '/(admin)/users',
      color: COLORS.primary,
    },
    {
      title: 'Bases de Datos',
      desc: 'Backups, restauraciones y optimización',
      icon: 'server-outline' as const,
      route: '/(admin)/backups',
      color: COLORS.secondary,
    },
    {
      title: 'Métricas de Red',
      desc: 'Estado de hardware, Spark y conexiones',
      icon: 'pulse-outline' as const,
      route: '/(admin)/metrics',
      color: COLORS.success,
    },
    {
      title: 'Logs de Consola',
      desc: 'Auditoría y visor de microservicios',
      icon: 'terminal-outline' as const,
      route: '/(admin)/logs',
      color: COLORS.accent,
    },
    {
      title: 'Comunicados',
      desc: 'Envío de correo masivo a usuarios',
      icon: 'megaphone-outline' as const,
      route: '/(admin)/broadcast',
      color: COLORS.warning,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Loader visible={loading && !refreshing} message="Cargando métricas..." />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header Block */}
        <View style={styles.header}>
          <View style={styles.profileRow}>
            <Image
              source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' }}
              style={styles.avatar}
            />
            <View style={styles.profileText}>
              <Text style={styles.welcomeText}>Panel Administrativo</Text>
              <Text style={styles.nameText}>{user?.name || 'Administrador'}</Text>
              <View style={styles.badge}>
                <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
                <Text style={styles.badgeText}>Rol: Super Admin</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
              <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Server Status Dashboard Summary */}
        <Text style={styles.sectionTitle}>Estado de Infraestructura</Text>
        <Card style={styles.metricsCard}>
          <View style={styles.metricsHeader}>
            <Text style={styles.metricsTitle}>Servidor Central (API Gateway)</Text>
            <View style={styles.statusDotRow}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.statusText}>Saludable</Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Uso CPU</Text>
              <Text style={[styles.metricValue, { color: (metrics?.cpu_percent || 0) > 70 ? COLORS.error : COLORS.primary }]}>
                {metrics ? `${metrics.cpu_percent}%` : 'N/A'}
              </Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBar, { width: `${metrics?.cpu_percent || 0}%`, backgroundColor: COLORS.primary }]} />
              </View>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Uso Memoria RAM</Text>
              <Text style={[styles.metricValue, { color: (metrics?.ram_percent || 0) > 85 ? COLORS.error : COLORS.secondary }]}>
                {metrics ? `${metrics.ram_percent}%` : 'N/A'}
              </Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBar, { width: `${metrics?.ram_percent || 0}%`, backgroundColor: COLORS.secondary }]} />
              </View>
            </View>
          </View>

          <View style={styles.statusGrid}>
            <View style={styles.statusNode}>
              <Ionicons name="cube" size={14} color={metrics?.mysql_status === 'online' ? COLORS.success : COLORS.error} />
              <Text style={styles.nodeLabel}>MySQL</Text>
            </View>
            <View style={styles.statusNode}>
              <Ionicons name="leaf" size={14} color={metrics?.mongodb_status === 'online' ? COLORS.success : COLORS.error} />
              <Text style={styles.nodeLabel}>MongoDB</Text>
            </View>
            <View style={styles.statusNode}>
              <Ionicons name="flash" size={14} color={metrics?.spark_status === 'online' ? COLORS.success : COLORS.error} />
              <Text style={styles.nodeLabel}>Spark</Text>
            </View>
            <View style={styles.statusNode}>
              <Ionicons name="people" size={14} color={COLORS.info} />
              <Text style={styles.nodeLabel}>{metrics?.active_connections || 0} Hilos</Text>
            </View>
          </View>
        </Card>

        {/* Administration Modules Title */}
        <Text style={styles.sectionTitle}>Módulos Administrativos</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuCard}
              activeOpacity={0.8}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon} size={28} color={item.color} />
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
  avatar: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 2,
    borderColor: COLORS.primary,
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
    backgroundColor: COLORS.primary,
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
  metricsCard: {
    marginBottom: SPACING.lg,
  },
  metricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dark.border,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.md,
  },
  metricsTitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.dark.textPrimary,
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: BORDER_RADIUS.round,
    marginRight: 6,
  },
  statusText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.dark.textSecondary,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  metricItem: {
    flex: 0.48,
  },
  metricLabel: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.dark.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: TYPOGRAPHY.fontSizes.xxl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    marginBottom: 6,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.dark.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: `${COLORS.dark.background}80`,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  statusNode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  nodeLabel: {
    fontSize: 11,
    color: COLORS.dark.textSecondary,
    marginLeft: 4,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
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
    width: 52,
    height: 52,
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

export default AdminDashboardScreen;
