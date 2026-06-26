import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../styles/theme';
import adminService, { SystemLog } from '../services/admin.service';
import Card from '../../../components/Card';
import Loader from '../../../components/Loader';

const SERVICES = ['todos', 'gateway', 'auth', 'events', 'tickets', 'stats', 'admin'] as const;
type ServiceType = typeof SERVICES[number];

const LEVELS = ['todos', 'info', 'warning', 'error', 'critical'] as const;
type LevelType = typeof LEVELS[number];

export const AdminLogsScreen = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [selectedService, setSelectedService] = useState<ServiceType>('todos');
  const [selectedLevel, setSelectedLevel] = useState<LevelType>('todos');

  const fetchLogs = async () => {
    try {
      const s = selectedService === 'todos' ? undefined : selectedService;
      const l = selectedLevel === 'todos' ? undefined : selectedLevel;
      const data = await adminService.getSystemLogs(s, l);
      // Sort logs descending (newest first)
      data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedService, selectedLevel]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return COLORS.error;
      case 'error':
        return '#F87171'; // lighter red
      case 'warning':
        return COLORS.warning;
      case 'info':
        return COLORS.info;
      default:
        return COLORS.dark.textSecondary;
    }
  };

  const renderLogItem = ({ item }: { item: SystemLog }) => {
    const color = getLevelColor(item.level);

    return (
      <View style={styles.logRow}>
        <View style={styles.logMeta}>
          <Text style={[styles.logLevel, { color }]}>
            [{item.level.toUpperCase()}]
          </Text>
          <Text style={styles.logService}>
            {item.service}
          </Text>
          <Text style={styles.logTime}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
        </View>
        <Text style={styles.logMessage}>{item.message}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Loader visible={loading && !refreshing} message="Extrayendo registros..." />

      <View style={styles.header}>
        <Text style={styles.title}>Auditoría de Logs</Text>
        <Text style={styles.subtitle}>Visor centralizado de consola para microservicios de Laika Club.</Text>
      </View>

      {/* Filter Tabs Scrollable */}
      <View style={styles.filtersBlock}>
        <Text style={styles.filterTitle}>Microservicio:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {SERVICES.map(service => (
            <TouchableOpacity
              key={service}
              style={[
                styles.filterTab,
                selectedService === service && styles.filterTabActive,
              ]}
              onPress={() => setSelectedService(service)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  selectedService === service && styles.filterTabTextActive,
                ]}
              >
                {service.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.filterTitle, { marginTop: SPACING.xs }]}>Criticidad:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {LEVELS.map(level => (
            <TouchableOpacity
              key={level}
              style={[
                styles.filterTab,
                selectedLevel === level && styles.filterTabActive,
              ]}
              onPress={() => setSelectedLevel(level)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  selectedLevel === level && styles.filterTabTextActive,
                ]}
              >
                {level.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Console Output Screen */}
      <View style={styles.terminalContainer}>
        <View style={styles.terminalHeader}>
          <View style={styles.terminalDots}>
            <View style={[styles.terminalDot, { backgroundColor: '#FF5F56' }]} />
            <View style={[styles.terminalDot, { backgroundColor: '#FFBD2E' }]} />
            <View style={[styles.terminalDot, { backgroundColor: '#27C93F' }]} />
          </View>
          <Text style={styles.terminalTitle}>bash - consolidado_logs.sh</Text>
          <Ionicons name="refresh" size={16} color={COLORS.dark.textSecondary} onPress={fetchLogs} />
        </View>

        <FlatList
          data={logs}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderLogItem}
          contentContainerStyle={styles.terminalBody}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="terminal-outline" size={32} color={COLORS.dark.textMuted} />
                <Text style={styles.emptyText}>Consola vacía. Sin registros coincidentes.</Text>
              </View>
            ) : null
          }
        />
      </View>
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
  filtersBlock: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  filterTitle: {
    fontSize: 10,
    color: COLORS.dark.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  filterRow: {
    gap: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.dark.surface,
    borderColor: COLORS.dark.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
  },
  filterTabActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
  },
  filterTabText: {
    fontSize: 10,
    color: COLORS.dark.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  filterTabTextActive: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  terminalContainer: {
    flex: 1,
    backgroundColor: '#010409', // Dark GitHub Code Black
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  terminalHeader: {
    height: 38,
    backgroundColor: '#0D1117',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
  },
  terminalDots: {
    flexDirection: 'row',
    gap: 6,
  },
  terminalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  terminalTitle: {
    fontSize: 11,
    color: COLORS.dark.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  terminalBody: {
    padding: SPACING.md,
  },
  logRow: {
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#161b22',
    paddingBottom: 6,
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logLevel: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    fontFamily: undefined,
  },
  logService: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#E6EDF2',
  },
  logTime: {
    fontSize: 10,
    color: '#8B949E',
  },
  logMessage: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: '#C9D1D9',
    marginTop: 4,
    lineHeight: 18,
    fontFamily: undefined,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.dark.textMuted,
    marginTop: SPACING.sm,
  },
});

export default AdminLogsScreen;
