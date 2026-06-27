import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  FlatList,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../styles/theme';
import usuarioService, { EventInfo } from '../services/usuario.service';
import Card from '../../../components/Card';
import Loader from '../../../components/Loader';
import Button from '../../../components/Button';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export const UserEventsScreen = () => {
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Booking Modal & Seat Map States
  const [activeEvent, setActiveEvent] = useState<EventInfo | null>(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Simulated Seat Grid (Rows A-E, Cols 1-8)
  const rows = ['A', 'B', 'C', 'D', 'E'];
  const columns = Array.from({ length: 8 }, (_, i) => i + 1);

  // Simulated occupied seats cache
  const [occupiedSeats, setOccupiedSeats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await usuarioService.getPublicEvents();
      setEvents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['Todos', 'Música', 'Electrónica', 'Convención'];

  const filteredEvents = events.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.venue.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenBooking = (event: EventInfo) => {
    setActiveEvent(event);
    setSelectedSeats([]);
    setCheckoutVisible(false);
    setPaymentSuccess(false);

    // Randomize occupied seats for this event
    const occupied: Record<string, boolean> = {};
    rows.forEach(r => {
      columns.forEach(c => {
        const id = `${r}-${c}`;
        if (Math.random() < 0.35) {
          occupied[id] = true;
        }
      });
    });
    setOccupiedSeats(occupied);
    setBookingModalVisible(true);
  };

  const toggleSeat = (seatId: string) => {
    if (occupiedSeats[seatId]) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(prev => prev.filter(s => s !== seatId));
    } else {
      if (selectedSeats.length >= 6) {
        Alert.alert('Límite excedido', 'Solo puedes comprar un máximo de 6 boletos por transacción.');
        return;
      }
      setSelectedSeats(prev => [...prev, seatId]);
    }
  };

  const getSeatPrice = (row: string) => {
    if (!activeEvent) return 0;
    if (row === 'A') return activeEvent.price * 1.5; // VIP
    if (row === 'B' || row === 'C') return activeEvent.price * 1.1; // Gold
    return activeEvent.price; // General
  };

  const getSeatCategoryName = (row: string) => {
    if (row === 'A') return 'VIP';
    if (row === 'B' || row === 'C') return 'GOLD';
    return 'GENERAL';
  };

  const calculateTotal = () => {
    return selectedSeats.reduce((sum, seat) => {
      const row = seat.split('-')[0];
      return sum + getSeatPrice(row);
    }, 0);
  };

  const handleProceedCheckout = () => {
    if (selectedSeats.length === 0) {
      Alert.alert('Sin selección', 'Por favor, selecciona al menos un asiento.');
      return;
    }
    setCheckoutVisible(true);
  };

  const handleConfirmPayment = async () => {
    if (!activeEvent) return;
    setLoading(true);
    try {
      const totalAmount = calculateTotal();
      const success = await usuarioService.purchaseTickets(
        activeEvent.id,
        selectedSeats,
        totalAmount
      );
      if (success) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (h) {}
        setPaymentSuccess(true);
      } else {
        Alert.alert('Error', 'No se pudo completar la compra del boleto.');
      }
    } catch (err) {
      Alert.alert('Error de red', 'La compra no pudo ser transmitida al servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishBooking = () => {
    setBookingModalVisible(false);
    setCheckoutVisible(false);
    setPaymentSuccess(false);
    fetchEvents(); // Refresh capacity
  };

  if (loading && events.length === 0) {
    return <Loader visible={true} message="Cargando catálogo de eventos..." />;
  }

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explora Espectáculos</Text>
        <Text style={styles.headerSubtitle}>Laika Club Arena & Foro Monumental</Text>
        
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.dark.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar conciertos, complejos..."
            placeholderTextColor={COLORS.dark.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.dark.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories FlatList */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={{ gap: SPACING.xs }}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat && styles.categoryTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.dark.textMuted} />
            <Text style={styles.emptyText}>No se encontraron eventos disponibles</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.eventCard}>
            <Image source={{ uri: item.image }} style={styles.eventImg} />
            <View style={styles.eventInfo}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{item.category}</Text>
              </View>
              <Text style={styles.eventTitle}>{item.title}</Text>
              
              <View style={styles.eventDetailRow}>
                <Ionicons name="location-outline" size={14} color={COLORS.dark.textSecondary} />
                <Text style={styles.eventDetailText} numberOfLines={1}>{item.venue}</Text>
              </View>

              <View style={styles.eventDetailRow}>
                <Ionicons name="time-outline" size={14} color={COLORS.dark.textSecondary} />
                <Text style={styles.eventDetailText}>{item.date} a las {item.time}</Text>
              </View>

              <View style={styles.eventFooter}>
                <View>
                  <Text style={styles.priceLabel}>Desde</Text>
                  <Text style={styles.priceText}>${item.price} MXN</Text>
                </View>
                <Button
                  title="Reservar Lugar"
                  size="sm"
                  onPress={() => handleOpenBooking(item)}
                />
              </View>
            </View>
          </Card>
        )}
      />

      {/* BOOKING MODAL */}
      <Modal
        visible={bookingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{activeEvent?.title}</Text>
                <Text style={styles.modalSubtitle}>{activeEvent?.venue}</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeBtn} 
                onPress={() => setBookingModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {!checkoutVisible ? (
              /* SEAT SELECTION VIEW */
              <ScrollView contentContainerStyle={styles.bookingScroll}>
                {/* Stage Indicator */}
                <View style={styles.stageContainer}>
                  <View style={styles.stageBorder} />
                  <Text style={styles.stageText}>ESCENARIO</Text>
                </View>

                {/* Seat Map Grid */}
                <View style={styles.gridCard}>
                  {rows.map((row) => (
                    <View key={row} style={styles.gridRow}>
                      {/* Row Label */}
                      <Text style={styles.rowLabel}>{row}</Text>
                      
                      {/* Seats */}
                      {columns.map((col) => {
                        const id = `${row}-${col}`;
                        const isOccupied = occupiedSeats[id];
                        const isSelected = selectedSeats.includes(id);
                        const seatCat = getSeatCategoryName(row);

                        let seatBg = '#1e293b';
                        if (isOccupied) seatBg = '#475569';
                        else if (isSelected) seatBg = COLORS.primary;
                        else if (seatCat === 'VIP') seatBg = '#f59e0b';
                        else if (seatCat === 'GOLD') seatBg = '#a855f7';

                        return (
                          <TouchableOpacity
                            key={id}
                            style={[styles.seat, { backgroundColor: seatBg }]}
                            disabled={isOccupied}
                            onPress={() => toggleSeat(id)}
                          >
                            <Text style={styles.seatText}>{col}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>

                {/* Color Legend */}
                <View style={styles.legendContainer}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                    <Text style={styles.legendText}>VIP</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#a855f7' }]} />
                    <Text style={styles.legendText}>Gold</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#1e293b' }]} />
                    <Text style={styles.legendText}>Gral</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                    <Text style={styles.legendText}>Mi Selección</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#475569' }]} />
                    <Text style={styles.legendText}>Ocupado</Text>
                  </View>
                </View>

                {/* Selected Info Summary */}
                {selectedSeats.length > 0 && (
                  <Card style={styles.summaryCard}>
                    <Text style={styles.summaryHeader}>Boletos Seleccionados ({selectedSeats.length})</Text>
                    <View style={styles.selectedSeatsRow}>
                      {selectedSeats.map(s => (
                        <View key={s} style={styles.seatBadge}>
                          <Text style={styles.seatBadgeText}>{s}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.priceSummaryRow}>
                      <Text style={styles.totalLabel}>Total Estimado:</Text>
                      <Text style={styles.totalVal}>${calculateTotal().toLocaleString()} MXN</Text>
                    </View>
                  </Card>
                )}

                <Button
                  title="Proceder al Pago"
                  disabled={selectedSeats.length === 0}
                  onPress={handleProceedCheckout}
                  style={styles.actionBtn}
                />
              </ScrollView>
            ) : !paymentSuccess ? (
              /* CHECKOUT PANEL */
              <View style={styles.checkoutContainer}>
                <Text style={styles.checkoutSectionTitle}>Resumen de Orden</Text>
                
                <Card style={styles.checkoutCard}>
                  <Text style={styles.eventTicketTitle}>{activeEvent?.title}</Text>
                  <Text style={styles.eventTicketMeta}>{activeEvent?.venue}</Text>
                  <Text style={styles.eventTicketMeta}>{activeEvent?.date} | {activeEvent?.time}</Text>
                  
                  <View style={styles.divider} />
                  
                  <View style={styles.checkoutSeatsList}>
                    {selectedSeats.map(s => {
                      const row = s.split('-')[0];
                      return (
                        <View key={s} style={styles.checkoutSeatItem}>
                          <Text style={styles.checkoutSeatName}>Asiento {s} ({getSeatCategoryName(row)})</Text>
                          <Text style={styles.checkoutSeatPrice}>${getSeatPrice(row).toLocaleString()} MXN</Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.divider} />
                  
                  <View style={styles.checkoutTotalRow}>
                    <Text style={styles.checkoutTotalLabel}>Monto a Pagar:</Text>
                    <Text style={styles.checkoutTotalVal}>${calculateTotal().toLocaleString()} MXN</Text>
                  </View>
                </Card>

                {/* Payment Form (Simulated) */}
                <Text style={styles.checkoutSectionTitle}>Método de Pago</Text>
                <Card style={styles.paymentCard}>
                  <View style={styles.paymentMethodRow}>
                    <Ionicons name="card" size={24} color={COLORS.primary} />
                    <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                      <Text style={styles.paymentMethodName}>Bypass Gateway LaikaPay</Text>
                      <Text style={styles.paymentMethodDesc}>Confirmación instantánea de balance</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  </View>
                </Card>

                <View style={styles.checkoutActionRow}>
                  <Button
                    title="Atrás"
                    variant="secondary"
                    onPress={() => setCheckoutVisible(false)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Confirmar y Pagar"
                    onPress={handleConfirmPayment}
                    style={{ flex: 2 }}
                  />
                </View>
              </View>
            ) : (
              /* ORDER COMPLETED VIEW */
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle-outline" size={80} color={COLORS.success} />
                <Text style={styles.successTitle}>¡Compra Exitosa!</Text>
                <Text style={styles.successDesc}>
                  Tus boletos han sido generados y agregados a tu Wallet digital. Puedes presentarlos sin conexión en la puerta de acceso del recinto.
                </Text>
                
                <Card style={styles.successOrderSummary}>
                  <Text style={styles.orderSummaryEvent}>{activeEvent?.title}</Text>
                  <Text style={styles.orderSummarySeats}>Asientos: {selectedSeats.join(', ')}</Text>
                  <Text style={styles.orderSummaryTotal}>Total Cargado: ${calculateTotal().toLocaleString()} MXN</Text>
                </Card>

                <Button
                  title="Listo, Volver al Inicio"
                  onPress={handleFinishBooking}
                  style={styles.successBtn}
                />
              </View>
            )}
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
    marginBottom: SPACING.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151c2c',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    height: 40,
    gap: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.fontSizes.sm,
  },
  categoriesContainer: {
    marginTop: SPACING.sm,
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm + 4,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: '#151c2c',
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryText: {
    color: COLORS.dark.textSecondary,
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  listContainer: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: COLORS.dark.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    marginTop: SPACING.sm,
  },
  eventCard: {
    padding: 0,
    overflow: 'hidden',
  },
  eventImg: {
    width: '100%',
    height: 140,
  },
  eventInfo: {
    padding: SPACING.md,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${COLORS.primary}20`,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.xs,
  },
  categoryBadgeText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  eventTitle: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
    marginBottom: SPACING.sm,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 6,
  },
  eventDetailText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.dark.textSecondary,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderColor: '#151c2c',
    paddingTop: SPACING.sm,
  },
  priceLabel: {
    fontSize: 9,
    color: COLORS.dark.textMuted,
  },
  priceText: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.success,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0b0f19',
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    height: '85%',
    padding: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#151c2c',
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSizes.md + 2,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.dark.textSecondary,
  },
  closeBtn: {
    backgroundColor: '#151c2c',
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingScroll: {
    paddingBottom: SPACING.lg,
  },
  stageContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  stageBorder: {
    width: '70%',
    height: 8,
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  stageText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textMuted,
    marginTop: 4,
    letterSpacing: 2,
  },
  gridCard: {
    backgroundColor: '#070a13',
    borderColor: '#151c2c',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginVertical: 4,
  },
  rowLabel: {
    width: 20,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textMuted,
    textAlign: 'center',
  },
  seat: {
    width: 26,
    height: 26,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatText: {
    fontSize: 8,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.dark.textSecondary,
  },
  summaryCard: {
    marginBottom: SPACING.md,
  },
  summaryHeader: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
    marginBottom: SPACING.xs,
  },
  selectedSeatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginVertical: SPACING.xs,
  },
  seatBadge: {
    backgroundColor: COLORS.primary,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.sm,
  },
  seatBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  priceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderColor: '#151c2c',
    paddingTop: SPACING.xs,
  },
  totalLabel: {
    fontSize: 11,
    color: COLORS.dark.textSecondary,
  },
  totalVal: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.success,
  },
  actionBtn: {
    marginTop: SPACING.xs,
  },
  checkoutContainer: {
    flex: 1,
    gap: SPACING.sm,
  },
  checkoutSectionTitle: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textSecondary,
    marginTop: SPACING.xs,
  },
  checkoutCard: {
    marginBottom: SPACING.xs,
  },
  eventTicketTitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm + 1,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
  },
  eventTicketMeta: {
    fontSize: 10,
    color: COLORS.dark.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#151c2c',
    marginVertical: SPACING.sm,
  },
  checkoutSeatsList: {
    gap: SPACING.xs,
  },
  checkoutSeatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  checkoutSeatName: {
    fontSize: 11,
    color: COLORS.dark.textSecondary,
  },
  checkoutSeatPrice: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: '#FFFFFF',
  },
  checkoutTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  checkoutTotalLabel: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
  },
  checkoutTotalVal: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.success,
  },
  paymentCard: {
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodName: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
  },
  paymentMethodDesc: {
    fontSize: 9,
    color: COLORS.dark.textMuted,
    marginTop: 1,
  },
  checkoutActionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  successTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.success,
  },
  successDesc: {
    fontSize: 11,
    color: COLORS.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: SPACING.sm,
  },
  successOrderSummary: {
    width: '100%',
    marginVertical: SPACING.sm,
  },
  orderSummaryEvent: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
  },
  orderSummarySeats: {
    fontSize: 10,
    color: COLORS.dark.textSecondary,
    marginTop: 4,
  },
  orderSummaryTotal: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.success,
    marginTop: 2,
  },
  successBtn: {
    width: '100%',
    marginTop: SPACING.sm,
  },
});

export default UserEventsScreen;
