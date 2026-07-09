import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../../styles/theme';
import operadorService, { OperatorStats } from '../services/operador.service';
import Card from '../../../components/Card';
import Loader from '../../../components/Loader';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { StatusBar } from 'expo-status-bar';

export const OperadorStatsScreen = () => {
  const router = useRouter();
  const { isDarkMode, colors } = useTheme();
  const { t } = useLanguage();
  const [stats, setStats] = useState<OperatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await operadorService.getStats();
      setStats(data);
    } catch (e) {
      console.error('Error fetching stats:', e);
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

  const getValidationRate = () => {
    if (!stats || stats.scanned_today === 0) return '0%';
    const rate = (stats.valid_today / stats.scanned_today) * 100;
    return `${rate.toFixed(0)}%`;
  };

  const renderScanItem = ({ item }: { item: OperatorStats['recent_scans'][number] }) => {
    const isSuccess = item.status === 'success';
    const isUsed = item.status === 'used';
    
    let statusColor = colors.error;
    let statusText = 'Inválido';
    let statusIcon = 'close-circle';
    
    if (isSuccess) {
      statusColor = colors.success;
      statusText = 'Válido';
      statusIcon = 'checkmark-circle';
    } else if (isUsed) {
      statusColor = colors.warning;
      statusText = 'Usado';
      statusIcon = 'alert-circle';
    }

    return (
      <View style={styles.scanLogItem}>
        <View style={styles.scanLogIcon}>
          <Ionicons name={statusIcon as any} size={20} color={statusColor} />
        </View>
        
        <View style={styles.scanLogMeta}>
          <Text style={styles.scanLogCode}>{item.ticket_code}</Text>
          <Text style={styles.scanLogEvent} numberOfLines={1}>{t(item.event_title)}</Text>
        </View>

        <View style={styles.scanLogTime}>
          <Text style={[styles.scanLogStatus, { color: statusColor }]}>{t(statusText)}</Text>
          <Text style={styles.scanLogTimestamp}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const styles = getStyles(colors, isDarkMode);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Loader visible={loading && !refreshing} message={t("Obteniendo estadísticas...")} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>{t("Bitácora y Estadísticas")}</Text>
          <Text style={styles.subtitle}>{t("Resumen analítico de validaciones durante el día.")}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {stats && (
          <>
            {/* KPI Cards Grid */}
            <View style={styles.kpiGrid}>
              <Card style={styles.kpiCard}>
                <Ionicons name="scan-outline" size={24} color={colors.primary} />
                <Text style={styles.kpiValue}>{stats.scanned_today}</Text>
                <Text style={styles.kpiLabel}>{t("Total Escaneados")}</Text>
              </Card>

              <Card style={styles.kpiCard}>
                <Ionicons name="checkmark-done" size={24} color={colors.success} />
                <Text style={[styles.kpiValue, { color: colors.success }]}>{stats.valid_today}</Text>
                <Text style={styles.kpiLabel}>{t("Accesos Exitosos")}</Text>
              </Card>

              <Card style={styles.kpiCard}>
                <Ionicons name="close" size={24} color={colors.error} />
                <Text style={[styles.kpiValue, { color: colors.error }]}>
                  {stats.invalid_today + stats.incidents_today}
                </Text>
                <Text style={styles.kpiLabel}>{t("Boletos Rechazados")}</Text>
              </Card>
            </View>

            {/* Performance Chart / Validation Rate */}
            <Card style={styles.rateCard}>
              <View style={styles.rateHeader}>
                <Text style={styles.rateTitle}>{t("Tasa de Aprobación")}</Text>
                <Text style={styles.ratePercentage}>{getValidationRate()}</Text>
              </View>
              <View style={styles.rateBarBg}>
                <View 
                  style={[
                    styles.rateBarFill, 
                    { 
                      width: getValidationRate() as any,
                      backgroundColor: stats.valid_today / stats.scanned_today > 0.7 ? colors.success : colors.warning
                    }
                  ]} 
                  />
              </View>
              <Text style={styles.rateText}>
                {stats.valid_today} {t("de")} {stats.scanned_today} {t("boletos presentados resultaron auténticos.")}
              </Text>
            </Card>

            {/* Recent Scans Log */}
            <View style={styles.logSection}>
              <Text style={styles.logSectionTitle}>{t("Historial de Lecturas Recientes")}</Text>
              
              <Card style={styles.logCard}>
                {stats.recent_scans.length > 0 ? (
                  <FlatList
                    data={stats.recent_scans}
                    renderItem={renderScanItem}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="bar-chart-outline" size={32} color={colors.textMuted} />
                    <Text style={styles.emptyText}>{t("No hay lecturas registradas en la bitácora.")}</Text>
                  </View>
                )}
              </Card>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scrollContainer: {
    padding: SPACING.md,
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  kpiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  kpiCard: {
    flex: 1,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  kpiLabel: {
    fontSize: 8,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    textAlign: 'center',
  },
  rateCard: {
    padding: SPACING.md,
  },
  rateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  rateTitle: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  ratePercentage: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textSecondary,
  },
  rateBarBg: {
    height: 8,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.round,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  rateBarFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.round,
  },
  rateText: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 14,
  },
  logSection: {
    marginTop: SPACING.xs,
  },
  logSectionTitle: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  logCard: {
    padding: 0,
    overflow: 'hidden',
  },
  scanLogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  scanLogIcon: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanLogMeta: {
    flex: 1,
  },
  scanLogCode: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  scanLogEvent: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scanLogTime: {
    alignItems: 'flex-end',
  },
  scanLogStatus: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  scanLogTimestamp: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: colors.textMuted,
    marginTop: SPACING.sm,
  },
});

export default OperadorStatsScreen;
