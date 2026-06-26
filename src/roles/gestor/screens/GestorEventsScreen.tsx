import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../styles/theme';
import gestorService, { EventItem, VenueItem } from '../services/gestor.service';
import Card from '../../../components/Card';
import Loader from '../../../components/Loader';
import Button from '../../../components/Button';

type FilterTab = 'todos' | 'draft' | 'published' | 'cancelled';

export const GestorEventsScreen = () => {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventItem[]>([]);
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<FilterTab>('todos');

  const loadData = async () => {
    try {
      const [eventsData, venuesData] = await Promise.all([
        gestorService.getEvents(),
        gestorService.getVenues(),
      ]);
      setEvents(eventsData);
      setVenues(venuesData);
      applyFilter(selectedTab, eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
      Alert.alert('Error', 'No se pudieron recuperar los eventos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const applyFilter = (tab: FilterTab, allEvents: EventItem[]) => {
    if (tab === 'todos') {
      setFilteredEvents(allEvents);
    } else {
      setFilteredEvents(allEvents.filter(e => e.status === tab));
    }
  };

  const handleTabChange = (tab: FilterTab) => {
    setSelectedTab(tab);
    applyFilter(tab, events);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleTogglePublish = async (event: EventItem) => {
    const isPublishing = event.status === 'draft';
    const title = isPublishing ? 'Publicar Evento' : 'Despublicar Evento';
    const message = isPublishing
      ? '¿Desea publicar este evento en el catálogo público? Los usuarios finales podrán verlo e iniciar compras.'
      : '¿Desea retirar este evento del catálogo? Se convertirá en borrador.';

    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: isPublishing ? 'Publicar' : 'Convertir en Borrador',
        onPress: async () => {
          setActionLoading(true);
          try {
            if (isPublishing) {
              await gestorService.publishEvent(event.id);
              Alert.alert('Éxito', 'El evento ya se encuentra publicado y en vivo.');
            } else {
              await gestorService.unpublishEvent(event.id);
              Alert.alert('Éxito', 'El evento ha sido despublicado.');
            }
            loadData(); // Reload list
          } catch (error: any) {
            Alert.alert('Error', error.message || 'La operación falló.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const getVenueName = (venueId: number) => {
    const venue = venues.find(v => v.id === venueId);
    return venue ? venue.name : `Recinto #${venueId}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return COLORS.success;
      case 'draft':
        return COLORS.warning;
      case 'cancelled':
        return COLORS.error;
      default:
        return COLORS.dark.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published':
        return 'Público';
      case 'draft':
        return 'Borrador';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const renderEventCard = ({ item }: { item: EventItem }) => {
    const statusColor = getStatusColor(item.status);
    const dateObj = new Date(item.date);

    return (
      <Card style={styles.eventCard}>
        <View style={styles.cardLayout}>
          {item.image && (
            <Image source={{ uri: item.image }} style={styles.eventImage} />
          )}
          <View style={styles.eventDetails}>
            <View style={styles.categoryRow}>
              <Text style={styles.categoryText}>{item.category}</Text>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
            <Text style={styles.eventName} numberOfLines={2}>{item.name}</Text>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.dark.textSecondary} />
              <Text style={styles.infoText} numberOfLines={1}>
                {getVenueName(item.venue_id)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={14} color={COLORS.dark.textSecondary} />
              <Text style={styles.infoText}>
                {dateObj.toLocaleDateString()} a las {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons Footer */}
        <View style={styles.cardActionsFooter}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push({ pathname: '/(gestor)/event-form' as any, params: { id: item.id } })}
          >
            <Ionicons name="create-outline" size={16} color={COLORS.dark.textSecondary} />
            <Text style={styles.actionBtnText}>Editar</Text>
          </TouchableOpacity>

          {item.use_seating_map && item.status !== 'cancelled' && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push({ pathname: '/(gestor)/seatmap-config' as any, params: { roomId: item.room_id, eventId: item.id } })}
            >
              <Ionicons name="grid-outline" size={16} color={COLORS.primary} />
              <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>Mapa SVG</Text>
            </TouchableOpacity>
          )}

          {item.status !== 'cancelled' && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleTogglePublish(item)}
            >
              <Ionicons
                name={item.status === 'published' ? 'eye-off-outline' : 'cloud-upload-outline'}
                size={16}
                color={item.status === 'published' ? COLORS.warning : COLORS.success}
              />
              <Text style={[styles.actionBtnText, { color: item.status === 'published' ? COLORS.warning : COLORS.success }]}>
                {item.status === 'published' ? 'Bajar' : 'Publicar'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'published', label: 'Públicos' },
    { key: 'draft', label: 'Borradores' },
    { key: 'cancelled', label: 'Cancelados' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Loader visible={loading && !refreshing} message="Cargando catálogo..." />
      <Loader visible={actionLoading} message="Actualizando estado en base de datos..." />

      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.title}>Mis Eventos</Text>
            <Text style={styles.subtitle}>Listado de espectáculos bajo su coordinación.</Text>
          </View>
          <Button
            title="Crear"
            variant="primary"
            size="sm"
            icon={<Ionicons name="add" size={16} color="#FFFFFF" />}
            onPress={() => router.push('/(gestor)/event-form' as any)}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, selectedTab === tab.key && styles.activeTab]}
            onPress={() => handleTabChange(tab.key)}
          >
            <Text style={[styles.tabText, selectedTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredEvents}
        keyExtractor={item => item.id.toString()}
        renderItem={renderEventCard}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.dark.textMuted} />
              <Text style={styles.emptyText}>No hay eventos en esta sección</Text>
            </View>
          ) : null
        }
      />
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
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dark.border,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.secondary,
  },
  tabText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.dark.textSecondary,
  },
  activeTabText: {
    color: COLORS.secondary,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  listContainer: {
    padding: SPACING.md,
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  eventCard: {
    padding: SPACING.md,
  },
  cardLayout: {
    flexDirection: 'row',
  },
  eventImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.md,
    backgroundColor: COLORS.dark.border,
  },
  eventDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.secondary,
    textTransform: 'uppercase',
    marginRight: SPACING.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  eventName: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  infoText: {
    fontSize: 11,
    color: COLORS.dark.textSecondary,
    flex: 1,
  },
  cardActionsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.dark.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 11,
    color: COLORS.dark.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    color: COLORS.dark.textMuted,
    marginTop: SPACING.sm,
  },
});

export default GestorEventsScreen;
