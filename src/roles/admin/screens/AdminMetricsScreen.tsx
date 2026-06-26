import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../styles/theme';
import adminService, { HardwareMetrics } from '../services/admin.service';
import Card from '../../../components/Card';
import Loader from '../../../components/Loader';

export const AdminMetricsScreen = () => {
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
    
    // Auto-update metrics every 5 seconds (simulated live monitoring)
    const interval = setInterval(() => {
      fetchMetrics();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMetrics();
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor((seconds % (3600*24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    const dDisplay = d > 0 ? `${d}d ` : '';
    const hDisplay = h > 0 ? `${h}h ` : '';
    const mDisplay = m > 0 ? `${m}m ` : '';
    const sDisplay = `${s}s`;
    
    return dDisplay + hDisplay + mDisplay + sDisplay;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Loader visible={loading && !refreshing} message="Analizando rendimiento de red..." />

      <View style={styles.header}>
        <Text style={styles.title}>Métricas del Servidor</Text>
        <Text style={styles.subtitle}>Supervisión de hardware y sockets activos en tiempo real.</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Status Indicators Panel */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Nodos Distribuidos</Text>
          <View style={styles.nodesContainer}>
            <View style={styles.nodeCard}>
              <View style={[styles.nodeIndicator, metrics?.mysql_status === 'online' ? styles.indicatorOnline : styles.indicatorOffline]} />
              <Ionicons name="server" size={24} color={metrics?.mysql_status === 'online' ? COLORS.success : COLORS.error} style={styles.nodeIcon} />
              <Text style={styles.nodeName}>MySQL</Text>
              <Text style={styles.nodeStatus}>{metrics?.mysql_status.toUpperCase() || 'OFFLINE'}</Text>
            </View>

            <View style={styles.nodeCard}>
              <View style={[styles.nodeIndicator, metrics?.mongodb_status === 'online' ? styles.indicatorOnline : styles.indicatorOffline]} />
              <Ionicons name="leaf" size={24} color={metrics?.mongodb_status === 'online' ? COLORS.success : COLORS.error} style={styles.nodeIcon} />
              <Text style={styles.nodeName}>MongoDB</Text>
              <Text style={styles.nodeStatus}>{metrics?.mongodb_status.toUpperCase() || 'OFFLINE'}</Text>
            </View>

            <View style={styles.nodeCard}>
              <View style={[styles.nodeIndicator, metrics?.spark_status === 'online' ? styles.indicatorOnline : styles.indicatorOffline]} />
              <Ionicons name="flash" size={24} color={metrics?.spark_status === 'online' ? COLORS.success : COLORS.error} style={styles.nodeIcon} />
              <Text style={styles.nodeName}>Spark</Text>
              <Text style={styles.nodeStatus}>{metrics?.spark_status.toUpperCase() || 'OFFLINE'}</Text>
            </View>
          </View>
        </Card>

        {/* CPU Detailed Card */}
        <Card style={styles.card}>
          <View style={styles.metricHeader}>
            <Text style={styles.cardTitle}>Procesador (CPU)</Text>
            <Text style={[styles.metricHighlight, { color: (metrics?.cpu_percent || 0) > 75 ? COLORS.error : COLORS.primary }]}>
              {metrics ? `${metrics.cpu_percent}%` : '0%'}
            </Text>
          </View>
          
          <View style={styles.barContainer}>
            <View style={[styles.barFill, { width: `${metrics?.cpu_percent || 0}%`, backgroundColor: COLORS.primary }]} />
          </View>

          <View style={styles.metricsDetailRow}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Carga Promedio</Text>
              <Text style={styles.detailVal}>{(metrics?.cpu_percent || 0) > 75 ? 'Alta' : 'Normal'}</Text>
            </View>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Núcleos Activos</Text>
              <Text style={styles.detailVal}>4 / 4 vCPUs</Text>
            </View>
          </View>
        </Card>

        {/* RAM Detailed Card */}
        <Card style={styles.card}>
          <View style={styles.metricHeader}>
            <Text style={styles.cardTitle}>Memoria Volátil (RAM)</Text>
            <Text style={[styles.metricHighlight, { color: (metrics?.ram_percent || 0) > 85 ? COLORS.error : COLORS.secondary }]}>
              {metrics ? `${metrics.ram_percent}%` : '0%'}
            </Text>
          </View>

          <View style={styles.barContainer}>
            <View style={[styles.barFill, { width: `${metrics?.ram_percent || 0}%`, backgroundColor: COLORS.secondary }]} />
          </View>

          <View style={styles.metricsDetailRow}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Memoria en Uso</Text>
              <Text style={styles.detailVal}>{metrics ? `${metrics.ram_used_gb.toFixed(2)} GB` : '0 GB'}</Text>
            </View>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Memoria Total</Text>
              <Text style={styles.detailVal}>{metrics ? `${metrics.ram_total_gb.toFixed(1)} GB` : '0 GB'}</Text>
            </View>
          </View>
        </Card>

        {/* Connections & Uptime Card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Socket de Red & Gateway</Text>
          
          <View style={styles.statsList}>
            <View style={styles.statRow}>
              <View style={styles.statRowLabelBlock}>
                <Ionicons name="people-outline" size={18} color={COLORS.info} style={styles.statIcon} />
                <Text style={styles.statLabel}>Clientes Conectados</Text>
              </View>
              <Text style={styles.statVal}>{metrics?.active_connections || 0}</Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statRowLabelBlock}>
                <Ionicons name="timer-outline" size={18} color={COLORS.warning} style={styles.statIcon} />
                <Text style={styles.statLabel}>Tiempo de Actividad (Uptime)</Text>
              </View>
              <Text style={styles.statVal}>{metrics ? formatUptime(metrics.uptime_seconds) : 'N/A'}</Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statRowLabelBlock}>
                <Ionicons name="cloud-done-outline" size={18} color={COLORS.success} style={styles.statIcon} />
                <Text style={styles.statLabel}>Gateway API</Text>
              </View>
              <Text style={[styles.statVal, { color: COLORS.success }]}>Online (8000)</Text>
            </View>
          </View>
        </Card>

        <View style={styles.liveIndicatorRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Actualizando automáticamente cada 5s</Text>
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
  header: {
    padding: SPACING.md,
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
  scrollContainer: {
    padding: SPACING.md,
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  card: {
    padding: SPACING.md,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nodesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  nodeCard: {
    flex: 0.31,
    backgroundColor: COLORS.dark.background,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    position: 'relative',
  },
  nodeIndicator: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  indicatorOnline: {
    backgroundColor: COLORS.success,
  },
  indicatorOffline: {
    backgroundColor: COLORS.error,
  },
  nodeIcon: {
    marginBottom: SPACING.xs,
  },
  nodeName: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
  },
  nodeStatus: {
    fontSize: 8,
    color: COLORS.dark.textMuted,
    marginTop: 2,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  metricHighlight: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  barContainer: {
    height: 12,
    backgroundColor: COLORS.dark.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  metricsDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailCol: {
    flex: 0.48,
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.dark.textSecondary,
  },
  detailVal: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.dark.textPrimary,
    marginTop: 2,
  },
  statsList: {
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dark.border,
    paddingBottom: SPACING.sm,
  },
  statRowLabelBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    marginRight: SPACING.sm,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.dark.textSecondary,
  },
  statVal: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    color: COLORS.dark.textMuted,
  },
});

export default AdminMetricsScreen;
