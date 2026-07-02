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
import usuarioService, { EventInfo, MerchItem } from '../services/usuario.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Card from '../../../components/Card';
import Loader from '../../../components/Loader';
import Button from '../../../components/Button';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export const UserEventsScreen = () => {
  const { user, savedCard, saveCardDetails, clearSavedCard } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Shopping Cart Item type
  interface CartItem {
    eventId: string;
    event: EventInfo;
    seats: string[];
    selectedMerch?: Array<{ id: string; title: string; price: number; quantity: number; image: string }>;
  }

  // Booking Modal & Seat Map States
  const [activeEvent, setActiveEvent] = useState<EventInfo | null>(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showDetailsStep, setShowDetailsStep] = useState(true);
  const [useAnotherCard, setUseAnotherCard] = useState(false);

  // Shopping Cart States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartModalVisible, setCartModalVisible] = useState(false);

  // Bazaar merchandise items & selection
  const [merchItems, setMerchItems] = useState<MerchItem[]>([]);
  const [selectedMerch, setSelectedMerch] = useState<Record<string, number>>({});

  // Save active event IDs to AsyncStorage for Bazaar filtering
  const saveActiveEventIdsToStorage = async (currentCart: CartItem[]) => {
    try {
      const eventIds = currentCart.map(item => item.eventId);
      await AsyncStorage.setItem('@Laika:cart_event_ids', JSON.stringify(eventIds));
    } catch (e) {
      console.error('Error saving active cart event ids', e);
    }
  };

  // Card Payment Form States
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'oxxo'>('card');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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
      const mData = await usuarioService.getMerchandise();
      setMerchItems(mData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['Todos', 'Pop', 'Rock', 'Electrónica', 'Urbano', 'Convención', 'Indie'];

  const filteredEvents = events.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.venue.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenBooking = (event: EventInfo) => {
    setActiveEvent(event);
    setSelectedSeats([]);
    setSelectedMerch({});
    setCheckoutVisible(false);
    setPaymentSuccess(false);
    setShowDetailsStep(true);
    setUseAnotherCard(false);

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
    const seatsTotal = selectedSeats.reduce((sum, seat) => {
      const row = seat.split('-')[0];
      return sum + getSeatPrice(row);
    }, 0);
    const merchTotal = Object.entries(selectedMerch).reduce((sum, [id, qty]) => {
      const prod = merchItems.find(p => p.id === id);
      return sum + (prod ? prod.price * qty : 0);
    }, 0);
    return seatsTotal + merchTotal;
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
      
      const itemsToAdd = Object.entries(selectedMerch).map(([id, qty]) => {
        const prod = merchItems.find(p => p.id === id);
        return {
          id,
          title: prod?.title || 'Producto',
          price: prod?.price || 0,
          quantity: qty,
          image: prod?.image || '',
        };
      });

      const success = await usuarioService.purchaseTickets(
        activeEvent.id,
        selectedSeats,
        totalAmount,
        itemsToAdd
      );
      if (success) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (h) {}
        setPaymentSuccess(true);
        await AsyncStorage.removeItem('@Laika:cart_event_ids');
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

  // Card Number formatting (adds spaces every 4 digits, limits to 16 digits)
  const handleCardNumberChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const limited = cleaned.slice(0, 16);
    const formatted = limited.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Card Expiry formatting (adds '/' after 2 digits, limits to 5 chars MM/AA)
  const handleCardExpiryChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const limited = cleaned.slice(0, 4);
    let formatted = limited;
    if (limited.length > 2) {
      formatted = `${limited.slice(0, 2)}/${limited.slice(2)}`;
    }
    setCardExpiry(formatted);
  };

  // Card CVV formatting (limits to 4 digits max)
  const handleCardCvvChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const limited = cleaned.slice(0, 4);
    setCardCvv(limited);
  };

  // Detect card brand based on first digit
  const getCardTypeName = () => {
    const cleanNum = cardNumber.replace(/\s/g, '');
    if (cleanNum.startsWith('4')) return 'Visa';
    if (cleanNum.startsWith('5')) return 'Mastercard';
    if (cleanNum.startsWith('3')) return 'AMEX';
    return 'Tarjeta';
  };

  // Get seat price helper for items already in the cart
  const getCartItemSeatPrice = (event: EventInfo, row: string) => {
    if (row === 'A') return event.price * 1.5; // VIP
    if (row === 'B' || row === 'C') return event.price * 1.1; // Gold
    return event.price; // General
  };

  // Add to cart from seat selector
  const handleAddToCart = () => {
    if (selectedSeats.length === 0) {
      Alert.alert('Selección vacía', 'Por favor selecciona al menos un asiento.');
      return;
    }
    if (!activeEvent) return;

    const itemsToAdd = Object.entries(selectedMerch).map(([id, qty]) => {
      const prod = merchItems.find(p => p.id === id);
      return {
        id,
        title: prod?.title || 'Producto',
        price: prod?.price || 0,
        quantity: qty,
        image: prod?.image || '',
      };
    });

    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.eventId === activeEvent.id);
      let newCart = [...prevCart];
      if (existingItemIndex > -1) {
        const currentSeats = prevCart[existingItemIndex].seats;
        const mergedSeats = Array.from(new Set([...currentSeats, ...selectedSeats]));
        if (mergedSeats.length > 6) {
          Alert.alert('Límite excedido', 'Solo puedes comprar un máximo de 6 boletos por evento.');
          return prevCart;
        }
        
        const existingMerch = prevCart[existingItemIndex].selectedMerch || [];
        const newMerch = [...existingMerch];
        itemsToAdd.forEach(item => {
          const idx = newMerch.findIndex(m => m.id === item.id);
          if (idx > -1) {
            newMerch[idx] = { ...newMerch[idx], quantity: newMerch[idx].quantity + item.quantity };
          } else {
            newMerch.push(item);
          }
        });

        newCart[existingItemIndex] = {
          ...prevCart[existingItemIndex],
          seats: mergedSeats,
          selectedMerch: newMerch,
        };
        Alert.alert('Carrito actualizado', 'Los asientos y souvenirs han sido agregados a tu carrito.');
      } else {
        newCart = [...prevCart, { eventId: activeEvent.id, event: activeEvent, seats: selectedSeats, selectedMerch: itemsToAdd }];
        Alert.alert('Agregado al carrito', 'El concierto, asientos y souvenirs han sido agregados a tu carrito.');
      }
      saveActiveEventIdsToStorage(newCart);
      return newCart;
    });

    setBookingModalVisible(false);
    setSelectedSeats([]);
    setSelectedMerch({});
  };

  // Add to cart and open checkout immediately
  const handleBuyNow = () => {
    if (!user) {
      Alert.alert(
        'Inicio de Sesión Requerido',
        'Para realizar compras de boletos es necesario estar registrado e iniciar sesión.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar Sesión', onPress: () => {
            setBookingModalVisible(false);
            router.replace('/(auth)/login' as any);
          }}
        ]
      );
      return;
    }
    if (selectedSeats.length === 0) {
      Alert.alert('Selección vacía', 'Por favor selecciona al menos un asiento.');
      return;
    }
    if (!activeEvent) return;

    const itemsToAdd = Object.entries(selectedMerch).map(([id, qty]) => {
      const prod = merchItems.find(p => p.id === id);
      return {
        id,
        title: prod?.title || 'Producto',
        price: prod?.price || 0,
        quantity: qty,
        image: prod?.image || '',
      };
    });

    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.eventId === activeEvent.id);
      let newCart = [...prevCart];
      if (existingItemIndex > -1) {
        const currentSeats = prevCart[existingItemIndex].seats;
        const mergedSeats = Array.from(new Set([...currentSeats, ...selectedSeats]));
        if (mergedSeats.length > 6) {
          Alert.alert('Límite excedido', 'Solo puedes comprar un máximo de 6 boletos por evento.');
          return prevCart;
        }
        
        const existingMerch = prevCart[existingItemIndex].selectedMerch || [];
        const newMerch = [...existingMerch];
        itemsToAdd.forEach(item => {
          const idx = newMerch.findIndex(m => m.id === item.id);
          if (idx > -1) {
            newMerch[idx] = { ...newMerch[idx], quantity: newMerch[idx].quantity + item.quantity };
          } else {
            newMerch.push(item);
          }
        });

        newCart[existingItemIndex] = {
          ...prevCart[existingItemIndex],
          seats: mergedSeats,
          selectedMerch: newMerch,
        };
      } else {
        newCart = [...prevCart, { eventId: activeEvent.id, event: activeEvent, seats: selectedSeats, selectedMerch: itemsToAdd }];
      }
      saveActiveEventIdsToStorage(newCart);
      return newCart;
    });

    setBookingModalVisible(false);
    setSelectedSeats([]);
    setSelectedMerch({});
    setCheckoutVisible(true);
    setCartModalVisible(true);
  };

  // Remove a single seat from a cart item
  const handleRemoveSeat = (eventId: string, seatId: string) => {
    setCart(prevCart => {
      const nextCart = prevCart.map(item => {
        if (item.eventId === eventId) {
          return {
            ...item,
            seats: item.seats.filter(s => s !== seatId),
          };
        }
        return item;
      }).filter(item => item.seats.length > 0);
      saveActiveEventIdsToStorage(nextCart);
      return nextCart;
    });
  };

  // Remove whole event from cart
  const handleRemoveEvent = (eventId: string) => {
    setCart(prevCart => {
      const nextCart = prevCart.filter(item => item.eventId !== eventId);
      saveActiveEventIdsToStorage(nextCart);
      return nextCart;
    });
  };

  // Compute total amount for all cart contents
  const calculateCartTotal = () => {
    return cart.reduce((total, item) => {
      const seatsTotal = item.seats.reduce((sum, seat) => {
        const row = seat.split('-')[0];
        return sum + getCartItemSeatPrice(item.event, row);
      }, 0);
      const merchTotal = (item.selectedMerch || []).reduce((sum, merch) => {
        return sum + (merch.price * merch.quantity);
      }, 0);
      return total + seatsTotal + merchTotal;
    }, 0);
  };

  // Handle final checkout payment from shopping cart
  const handleConfirmCartPayment = async () => {
    if (!user) {
      Alert.alert(
        'Inicio de Sesión Requerido',
        'Para realizar compras de boletos es necesario estar registrado e iniciar sesión.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar Sesión', onPress: () => {
            setCartModalVisible(false);
            setCheckoutVisible(false);
            router.replace('/(auth)/login' as any);
          }}
        ]
      );
      return;
    }
    
    if (paymentMethod === 'card' && (!savedCard || useAnotherCard)) {
      if (!cardHolder.trim()) {
        Alert.alert('Datos incompletos', 'Por favor ingresa el nombre del titular.');
        return;
      }
      const cleanNum = cardNumber.replace(/\s/g, '');
      if (cleanNum.length < 15) {
        Alert.alert('Número incorrecto', 'Por favor ingresa un número de tarjeta válido.');
        return;
      }
      if (cardExpiry.length < 5) {
        Alert.alert('Vencimiento incorrecto', 'Por favor ingresa la fecha de expiración MM/AA.');
        return;
      }
      if (cardCvv.length < 3) {
        Alert.alert('CVV incorrecto', 'Por favor ingresa un código de seguridad válido.');
        return;
      }
    }

    setIsProcessingPayment(true);

    setTimeout(async () => {
      try {
        // Send requests for all elements in cart
        for (const item of cart) {
          const seatsTotal = item.seats.reduce((sum, seat) => {
            const row = seat.split('-')[0];
            return sum + getCartItemSeatPrice(item.event, row);
          }, 0);
          const merchTotal = (item.selectedMerch || []).reduce((sum, merch) => {
            return sum + (merch.price * merch.quantity);
          }, 0);
          const itemTotal = seatsTotal + merchTotal;
          
          await usuarioService.purchaseTickets(
            item.eventId,
            item.seats,
            itemTotal,
            item.selectedMerch
          );
        }

        // Save card details if they entered a new one
        if (paymentMethod === 'card' && (!savedCard || useAnotherCard)) {
          const newCard = {
            holder: cardHolder,
            number: cardNumber,
            expiry: cardExpiry,
            brand: getCardTypeName(),
          };
          await saveCardDetails(newCard);
        }

        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (h) {}

        setPaymentSuccess(true);
        setCart([]); // Clear cart
        await AsyncStorage.removeItem('@Laika:cart_event_ids');
      } catch (err) {
        Alert.alert('Error', 'Hubo un inconveniente al procesar la compra.');
      } finally {
        setIsProcessingPayment(false);
      }
    }, 1800);
  };

  if (loading && events.length === 0) {
    return <Loader visible={true} message="Cargando catálogo de eventos..." />;
  }

  const relatedMerch = merchItems.filter(item => item.eventId === activeEvent?.id);

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Explora Espectáculos</Text>
            <Text style={styles.headerSubtitle}>Laika Club Arena & Foro Monumental</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: SPACING.xs, alignItems: 'center' }}>
            {!user && (
              <TouchableOpacity 
                style={styles.loginHeaderBtn}
                onPress={() => router.replace('/(auth)/login' as any)}
              >
                <Ionicons name="log-in-outline" size={16} color="#FFFFFF" />
                <Text style={styles.loginHeaderBtnText}>Entrar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.cartHeaderBtn}
              onPress={() => setCartModalVisible(true)}
            >
              <Ionicons name="cart-outline" size={22} color="#FFFFFF" />
              {cart.length > 0 && (
                <View style={styles.cartBadgeCount}>
                  <Text style={styles.cartBadgeCountText}>
                    {cart.reduce((sum, item) => sum + item.seats.length, 0)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
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
              showDetailsStep ? (
                /* DETAILS VIEW */
                <ScrollView contentContainerStyle={styles.detailsScroll}>
                  {activeEvent?.image && (
                    <Image
                      source={{ uri: activeEvent.image }}
                      style={styles.detailImage}
                      contentFit="cover"
                    />
                  )}
                  
                  <View style={styles.detailCategoryBadge}>
                    <Text style={styles.detailCategoryText}>{activeEvent?.category}</Text>
                  </View>

                  <View style={styles.detailMetaRow}>
                    <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.detailMetaText}>{activeEvent?.date} a las {activeEvent?.time} hrs</Text>
                  </View>
                  
                  <View style={styles.detailMetaRow}>
                    <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.detailMetaText}>{activeEvent?.venue}</Text>
                  </View>

                  <Text style={styles.detailPrice}>Desde ${activeEvent?.price.toLocaleString()} MXN</Text>

                  <Text style={styles.detailSectionTitle}>Descripción del Evento</Text>
                  <Text style={styles.detailDescription}>{activeEvent?.description}</Text>

                  <Text style={styles.detailSectionTitle}>Información Relevante</Text>
                  <View style={styles.infoList}>
                    <View style={styles.infoItem}>
                      <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.success} />
                      <Text style={styles.infoItemText}>
                        <Text style={{ fontWeight: 'bold', color: '#FFFFFF' }}>Seguridad: </Text>
                        Bolsos sujetos a revisión. Prohibido ingresar cámaras profesionales, objetos punzocortantes, alimentos y bebidas.
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Ionicons name="ticket-outline" size={14} color={COLORS.primary} />
                      <Text style={styles.infoItemText}>
                        <Text style={{ fontWeight: 'bold', color: '#FFFFFF' }}>Acceso digital: </Text>
                        Presenta tu boleto QR digital desde la Wallet. No requiere conexión a internet en la entrada.
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Ionicons name="time-outline" size={14} color="#f59e0b" />
                      <Text style={styles.infoItemText}>
                        <Text style={{ fontWeight: 'bold', color: '#FFFFFF' }}>Horarios: </Text>
                        Las puertas abren 1.5 horas antes del espectáculo. Se recomienda llegar temprano.
                      </Text>
                    </View>
                  </View>

                  {relatedMerch.length > 0 && (
                    <View style={{ marginTop: SPACING.md, marginBottom: SPACING.md }}>
                      <Text style={styles.detailSectionTitle}>Productos Oficiales del Evento</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm, paddingVertical: 4 }}>
                        {relatedMerch.map(prod => {
                          const qty = selectedMerch[prod.id] || 0;
                          return (
                            <View key={prod.id} style={styles.relatedMerchCard}>
                              <Image source={{ uri: prod.image }} style={styles.relatedMerchImg} />
                              <View style={styles.relatedMerchInfo}>
                                <Text style={styles.relatedMerchTitle} numberOfLines={1}>{prod.title}</Text>
                                <Text style={styles.relatedMerchPrice}>${prod.price} MXN</Text>
                                
                                {qty === 0 ? (
                                  <TouchableOpacity
                                    style={styles.relatedMerchAddBtn}
                                    onPress={() => {
                                      setSelectedMerch(prev => ({ ...prev, [prod.id]: 1 }));
                                    }}
                                  >
                                    <Ionicons name="add" size={14} color="#FFFFFF" />
                                    <Text style={styles.relatedMerchAddText}>Agregar</Text>
                                  </TouchableOpacity>
                                ) : (
                                  <View style={styles.relatedMerchQtyRow}>
                                    <TouchableOpacity
                                      style={styles.relatedMerchQtyBtn}
                                      onPress={() => {
                                        setSelectedMerch(prev => {
                                          const next = { ...prev };
                                          if (qty <= 1) {
                                            delete next[prod.id];
                                          } else {
                                            next[prod.id] = qty - 1;
                                          }
                                          return next;
                                        });
                                      }}
                                    >
                                      <Ionicons name="remove" size={12} color="#FFFFFF" />
                                    </TouchableOpacity>
                                    <Text style={styles.relatedMerchQtyText}>{qty}</Text>
                                    <TouchableOpacity
                                      style={styles.relatedMerchQtyBtn}
                                      onPress={() => {
                                        setSelectedMerch(prev => ({ ...prev, [prod.id]: qty + 1 }));
                                      }}
                                    >
                                      <Ionicons name="add" size={12} color="#FFFFFF" />
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  <Button
                    title="Reservar Lugar"
                    onPress={() => setShowDetailsStep(false)}
                    style={{ marginTop: SPACING.sm }}
                  />
                </ScrollView>
              ) : (
                /* SEAT SELECTION VIEW */
                <ScrollView contentContainerStyle={styles.bookingScroll}>
                  <TouchableOpacity
                    style={styles.bookingBackButton}
                    onPress={() => setShowDetailsStep(true)}
                  >
                    <Ionicons name="arrow-back" size={14} color={COLORS.primary} />
                    <Text style={styles.bookingBackButtonText}>Volver a Detalles</Text>
                  </TouchableOpacity>

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
                          else if (isSelected) seatBg = COLORS.success;
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
                      <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
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

                  <View style={styles.bookingActionRow}>
                    <Button
                      title="Agregar al Carrito"
                      variant="secondary"
                      disabled={selectedSeats.length === 0}
                      onPress={handleAddToCart}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Comprar Ahora"
                      disabled={selectedSeats.length === 0}
                      onPress={handleBuyNow}
                      style={{ flex: 1.2 }}
                    />
                  </View>
                </ScrollView>
              )
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
                    {Object.entries(selectedMerch).length > 0 && (
                      <View style={{ marginTop: SPACING.xs, borderTopWidth: 1, borderTopColor: '#1f2937', paddingTop: SPACING.xs }}>
                        {Object.entries(selectedMerch).map(([id, qty]) => {
                          const prod = merchItems.find(p => p.id === id);
                          if (!prod) return null;
                          return (
                            <View key={id} style={styles.checkoutSeatItem}>
                              <Text style={styles.checkoutSeatName}>{prod.title} (x{qty})</Text>
                              <Text style={styles.checkoutSeatPrice}>${(prod.price * qty).toLocaleString()} MXN</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
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
                  {Object.entries(selectedMerch).length > 0 && (
                    <Text style={styles.orderSummarySeats}>
                      Souvenirs: {Object.entries(selectedMerch).map(([id, qty]) => {
                        const prod = merchItems.find(p => p.id === id);
                        return prod ? `${prod.title} (x${qty})` : '';
                      }).filter(Boolean).join(', ')}
                    </Text>
                  )}
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

      {/* SHOPPING CART MODAL */}
      <Modal
        visible={cartModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (isProcessingPayment) return;
          setCartModalVisible(false);
          setCheckoutVisible(false);
          setPaymentSuccess(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {checkoutVisible ? 'Completar Pago Seguro' : 'Carrito de Compra'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {checkoutVisible ? 'Ingresa los detalles de tu pago' : `${cart.reduce((sum, item) => sum + item.seats.length, 0)} boletos seleccionados`}
                </Text>
              </View>
              {!isProcessingPayment && (
                <TouchableOpacity 
                  style={styles.closeBtn} 
                  onPress={() => {
                    setCartModalVisible(false);
                    setCheckoutVisible(false);
                    setPaymentSuccess(false);
                  }}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>

            {!checkoutVisible ? (
              /* CART ITEMS VIEW */
              <View style={{ flex: 1 }}>
                {cart.length === 0 ? (
                  <View style={styles.emptyCartContainer}>
                    <Ionicons name="cart-outline" size={64} color={COLORS.dark.textMuted} />
                    <Text style={styles.emptyCartText}>Tu carrito está vacío</Text>
                    <Text style={styles.emptyCartSub}>Agrega asientos de cualquier evento para iniciar.</Text>
                    <Button
                      title="Explorar Eventos"
                      variant="primary"
                      onPress={() => setCartModalVisible(false)}
                      style={{ marginTop: SPACING.md, width: '70%' }}
                    />
                  </View>
                ) : (
                  <View style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={{ paddingBottom: SPACING.lg }}>
                      {cart.map((item) => (
                        <Card key={item.eventId} style={styles.cartCard}>
                          <View style={styles.cartCardHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.cartEventTitle}>{item.event.title}</Text>
                              <Text style={styles.cartEventVenue}>{item.event.venue}</Text>
                              <Text style={styles.cartEventTime}>{item.event.date} | {item.event.time}</Text>
                            </View>
                            <TouchableOpacity 
                              onPress={() => handleRemoveEvent(item.eventId)}
                              style={styles.cartDeleteAllBtn}
                            >
                              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                            </TouchableOpacity>
                          </View>
                          
                          <View style={styles.divider} />
                          
                          <Text style={styles.cartSeatsLabel}>Asientos Seleccionados:</Text>
                          <View style={styles.cartSeatsRow}>
                            {item.seats.map(seat => (
                              <View key={seat} style={styles.cartSeatBadge}>
                                <Text style={styles.cartSeatBadgeText}>{seat}</Text>
                                <TouchableOpacity onPress={() => handleRemoveSeat(item.eventId, seat)}>
                                  <Ionicons name="close-circle" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                          
                          {item.selectedMerch && item.selectedMerch.length > 0 && (
                            <View style={{ marginTop: SPACING.sm, marginBottom: SPACING.xs }}>
                              <Text style={styles.cartSeatsLabel}>Souvenirs Vinculados:</Text>
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                {item.selectedMerch.map(merch => (
                                  <View key={merch.id} style={[styles.cartSeatBadge, { backgroundColor: '#111827', borderWidth: 1, borderColor: COLORS.primary }]}>
                                    <Text style={[styles.cartSeatBadgeText, { color: '#FFFFFF' }]}>
                                      {merch.title} (x{merch.quantity}) - ${merch.price * merch.quantity} MXN
                                    </Text>
                                    <TouchableOpacity 
                                      onPress={() => {
                                        setCart(prevCart => {
                                          const nextCart = prevCart.map(prevItem => {
                                            if (prevItem.eventId === item.eventId) {
                                              return {
                                                ...prevItem,
                                                selectedMerch: (prevItem.selectedMerch || []).filter(m => m.id !== merch.id)
                                              };
                                            }
                                            return prevItem;
                                          });
                                          saveActiveEventIdsToStorage(nextCart);
                                          return nextCart;
                                        });
                                      }}
                                    >
                                      <Ionicons name="close-circle" size={14} color={COLORS.primary} style={{ marginLeft: 4 }} />
                                    </TouchableOpacity>
                                  </View>
                                ))}
                              </View>
                            </View>
                          )}
                          
                          <View style={styles.cartSubtotalRow}>
                            <Text style={styles.cartSubtotalLabel}>Subtotal Evento:</Text>
                            <Text style={styles.cartSubtotalVal}>
                              ${(
                                item.seats.reduce((sum, seat) => {
                                  const row = seat.split('-')[0];
                                  return sum + getCartItemSeatPrice(item.event, row);
                                }, 0) + 
                                (item.selectedMerch || []).reduce((sum, merch) => {
                                  return sum + (merch.price * merch.quantity);
                                }, 0)
                              ).toLocaleString()} MXN
                            </Text>
                          </View>
                        </Card>
                      ))}

                      {/* Cart Summary Card */}
                      <Card style={styles.summaryCard}>
                        <View style={styles.priceSummaryRow}>
                          <Text style={styles.totalLabel}>Total del Carrito:</Text>
                          <Text style={styles.totalVal}>${calculateCartTotal().toLocaleString()} MXN</Text>
                        </View>
                      </Card>
                    </ScrollView>

                    <Button
                      title="Proceder al Pago"
                      onPress={() => {
                        if (!user) {
                          Alert.alert(
                            'Inicio de Sesión Requerido',
                            'Para realizar compras de boletos es necesario estar registrado e iniciar sesión.',
                            [
                              { text: 'Cancelar', style: 'cancel' },
                              { text: 'Iniciar Sesión', onPress: () => {
                                setCartModalVisible(false);
                                router.replace('/(auth)/login' as any);
                              }}
                            ]
                          );
                        } else {
                          setCheckoutVisible(true);
                        }
                      }}
                      style={styles.actionBtn}
                    />
                  </View>
                )}
              </View>
            ) : !paymentSuccess ? (
              /* DETAIL CHECKOUT PANEL (Amazon/Stripe style) */
              <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xl }}>
                <Text style={styles.checkoutSectionTitle}>Resumen de Orden</Text>
                <Card style={styles.checkoutCard}>
                  <View style={styles.checkoutSeatsList}>
                    {cart.map(item => (
                      <View key={item.eventId} style={{ marginBottom: 6 }}>
                        <Text style={styles.checkoutEventName}>{item.event.title}</Text>
                        <Text style={styles.checkoutSeatsListText}>
                          {item.seats.length} boletos ({item.seats.join(', ')})
                        </Text>
                        {item.selectedMerch && item.selectedMerch.length > 0 && (
                          <Text style={[styles.checkoutSeatsListText, { color: COLORS.primary }]}>
                            + Souvenirs: {item.selectedMerch.map(m => `${m.title} (x${m.quantity})`).join(', ')}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.checkoutTotalRow}>
                    <Text style={styles.checkoutTotalLabel}>Monto Final:</Text>
                    <Text style={styles.checkoutTotalVal}>${calculateCartTotal().toLocaleString()} MXN</Text>
                  </View>
                </Card>

                <Text style={styles.checkoutSectionTitle}>Método de Pago</Text>
                
                {/* Method selector */}
                <View style={styles.paymentMethodsGrid}>
                  <TouchableOpacity
                    style={[styles.methodSelectorBtn, paymentMethod === 'card' && styles.methodSelectorBtnActive]}
                    onPress={() => setPaymentMethod('card')}
                  >
                    <Ionicons name="card-outline" size={20} color={paymentMethod === 'card' ? '#FFFFFF' : COLORS.dark.textSecondary} />
                    <Text style={[styles.methodSelectorText, paymentMethod === 'card' && styles.methodSelectorTextActive]}>Tarjeta</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.methodSelectorBtn, paymentMethod === 'paypal' && styles.methodSelectorBtnActive]}
                    onPress={() => setPaymentMethod('paypal')}
                  >
                    <Ionicons name="logo-paypal" size={20} color={paymentMethod === 'paypal' ? '#FFFFFF' : COLORS.dark.textSecondary} />
                    <Text style={[styles.methodSelectorText, paymentMethod === 'paypal' && styles.methodSelectorTextActive]}>PayPal</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.methodSelectorBtn, paymentMethod === 'oxxo' && styles.methodSelectorBtnActive]}
                    onPress={() => setPaymentMethod('oxxo')}
                  >
                    <Ionicons name="barcode-outline" size={20} color={paymentMethod === 'oxxo' ? '#FFFFFF' : COLORS.dark.textSecondary} />
                    <Text style={[styles.methodSelectorText, paymentMethod === 'oxxo' && styles.methodSelectorTextActive]}>OXXO Pay</Text>
                  </TouchableOpacity>
                </View>

                {/* Form fields based on selection */}
                {paymentMethod === 'card' && (
                  <Card style={styles.cardFormCard}>
                    {savedCard && !useAnotherCard ? (
                      <View>
                        <Text style={styles.formTitle}>Método de Pago Registrado</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#151c2c', padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.md }}>
                          <Ionicons name="card" size={28} color={COLORS.primary} style={{ marginRight: SPACING.sm }} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>
                              {savedCard.brand} •••• {savedCard.number.slice(-4)}
                            </Text>
                            <Text style={{ color: COLORS.dark.textSecondary, fontSize: 10, marginTop: 2 }}>
                              Titular: {savedCard.holder || savedCard.name} | Vence: {savedCard.expiry}
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => setUseAnotherCard(true)}>
                            <Text style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: 11 }}>Cambiar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm }}>
                          <Text style={styles.formTitle}>Información de la Tarjeta</Text>
                          {savedCard && (
                            <TouchableOpacity onPress={() => setUseAnotherCard(false)}>
                              <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: 'bold' }}>Usar guardada</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        
                        <View style={styles.formGroup}>
                          <Text style={styles.inputLabel}>Titular de la Tarjeta</Text>
                          <TextInput
                            style={styles.cardInput}
                            placeholder="Nombre completo impreso"
                            placeholderTextColor={COLORS.dark.textMuted}
                            value={cardHolder}
                            onChangeText={setCardHolder}
                          />
                        </View>

                        <View style={styles.formGroup}>
                          <Text style={styles.inputLabel}>Número de Tarjeta</Text>
                          <View style={styles.cardNumberContainer}>
                            <TextInput
                              style={[styles.cardInput, { flex: 1 }]}
                              placeholder="0000 0000 0000 0000"
                              placeholderTextColor={COLORS.dark.textMuted}
                              keyboardType="numeric"
                              value={cardNumber}
                              onChangeText={handleCardNumberChange}
                            />
                            <View style={styles.cardTypeContainer}>
                              <Text style={styles.cardTypeText}>{getCardTypeName()}</Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.formRow}>
                          <View style={[styles.formGroup, { flex: 1.2 }]}>
                            <Text style={styles.inputLabel}>Expiración</Text>
                            <TextInput
                              style={styles.cardInput}
                              placeholder="MM/AA"
                              placeholderTextColor={COLORS.dark.textMuted}
                              keyboardType="numeric"
                              value={cardExpiry}
                              onChangeText={handleCardExpiryChange}
                            />
                          </View>

                          <View style={[styles.formGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>CVV</Text>
                            <TextInput
                              style={styles.cardInput}
                              placeholder="123"
                              placeholderTextColor={COLORS.dark.textMuted}
                              keyboardType="numeric"
                              secureTextEntry
                              value={cardCvv}
                              onChangeText={handleCardCvvChange}
                            />
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Trust badges */}
                    <View style={styles.trustBadges}>
                      <Ionicons name="lock-closed" size={12} color={COLORS.success} />
                      <Text style={styles.trustText}>Conexión Encriptada SSL. Cumple con norma PCI-DSS.</Text>
                    </View>
                  </Card>
                )}

                {paymentMethod === 'paypal' && (
                  <Card style={styles.cardFormCard}>
                    <Text style={styles.formTitle}>Autenticación Directa PayPal</Text>
                    <Text style={styles.paymentMethodDescText}>
                      Al presionar pagar, se abrirá un portal seguro de PayPal para autorizar tu saldo o saldo en cuenta bancaria asociada.
                    </Text>
                    <View style={styles.paypalBanner}>
                      <Ionicons name="logo-paypal" size={24} color="#003087" />
                      <Text style={styles.paypalBannerText}>Pay Later & Protección al Comprador Activa.</Text>
                    </View>
                  </Card>
                )}

                {paymentMethod === 'oxxo' && (
                  <Card style={styles.cardFormCard}>
                    <Text style={styles.formTitle}>Ficha de Pago OXXO Pay</Text>
                    <Text style={styles.paymentMethodDescText}>
                      Se generará un código de barras único para pagar en efectivo en cualquier tienda OXXO de la República. El saldo se acredita en 5 minutos.
                    </Text>
                    <View style={styles.oxxoBanner}>
                      <Ionicons name="barcode-outline" size={24} color="#f59e0b" />
                      <Text style={styles.oxxoBannerText}>Comisión de $15 MXN cobrada en ventanilla.</Text>
                    </View>
                  </Card>
                )}

                <View style={styles.checkoutActionRow}>
                  <Button
                    title="Atrás"
                    variant="secondary"
                    disabled={isProcessingPayment}
                    onPress={() => setCheckoutVisible(false)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title={isProcessingPayment ? "Procesando..." : "Confirmar y Pagar"}
                    disabled={isProcessingPayment}
                    onPress={handleConfirmCartPayment}
                    style={{ flex: 2 }}
                  />
                </View>
              </ScrollView>
            ) : (
              /* ORDER COMPLETED VIEW */
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle-outline" size={80} color={COLORS.success} />
                <Text style={styles.successTitle}>¡Compra Exitosa!</Text>
                <Text style={styles.successDesc}>
                  Todos tus boletos han sido generados con éxito y agregados a tu Wallet digital. Puedes presentarlos sin conexión en la puerta de acceso.
                </Text>

                {cart.length > 0 && (
                  <Card style={{ ...styles.successOrderSummary, marginBottom: SPACING.md }}>
                    {cart.map(item => (
                      <View key={item.eventId} style={{ marginBottom: 4 }}>
                        <Text style={styles.orderSummaryEvent}>{item.event.title}</Text>
                        <Text style={styles.orderSummarySeats}>Asientos: {item.seats.join(', ')}</Text>
                        {item.selectedMerch && item.selectedMerch.length > 0 && (
                          <Text style={styles.orderSummarySeats}>
                            Souvenirs: {item.selectedMerch.map(m => `${m.title} (x${m.quantity})`).join(', ')}
                          </Text>
                        )}
                      </View>
                    ))}
                  </Card>
                )}
                <Button
                  title="Entendido, Ir a Eventos"
                  onPress={() => {
                    setCartModalVisible(false);
                    setCheckoutVisible(false);
                    setPaymentSuccess(false);
                    fetchEvents();
                  }}
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
    backgroundColor: COLORS.success,
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
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartHeaderBtn: {
    backgroundColor: '#151c2c',
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderColor: '#2a364f',
    borderWidth: 1,
  },
  cartBadgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0b0f19',
  },
  cartBadgeCountText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  bookingActionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyCartText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    marginTop: SPACING.md,
  },
  emptyCartSub: {
    color: COLORS.dark.textSecondary,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  cartCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  cartCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cartEventTitle: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.fontSizes.sm + 1,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  cartEventVenue: {
    color: COLORS.dark.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  cartEventTime: {
    color: COLORS.dark.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  cartDeleteAllBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartSeatsLabel: {
    color: COLORS.dark.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  cartSeatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  cartSeatBadge: {
    backgroundColor: COLORS.success,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartSeatBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cartSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#151c2c',
    paddingTop: SPACING.xs,
    marginTop: SPACING.xs,
  },
  cartSubtotalLabel: {
    fontSize: 10,
    color: COLORS.dark.textSecondary,
  },
  cartSubtotalVal: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.success,
  },
  checkoutEventName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  checkoutSeatsListText: {
    color: COLORS.dark.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  methodSelectorBtn: {
    flex: 1,
    backgroundColor: '#151c2c',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#2a364f',
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    gap: 4,
  },
  methodSelectorBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  methodSelectorText: {
    color: COLORS.dark.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  methodSelectorTextActive: {
    color: '#FFFFFF',
  },
  cardFormCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  formTitle: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.fontSizes.xs + 1,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  formGroup: {
    marginBottom: SPACING.sm,
  },
  formRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  cardInput: {
    backgroundColor: '#070a13',
    borderColor: '#151c2c',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    height: 40,
    paddingHorizontal: SPACING.sm,
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.fontSizes.xs + 1,
    marginTop: 4,
  },
  cardNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  cardTypeContainer: {
    position: 'absolute',
    right: SPACING.sm,
    top: 14,
    backgroundColor: '#151c2c',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  cardTypeText: {
    color: COLORS.primaryLight,
    fontSize: 8,
    fontWeight: 'bold',
  },
  trustBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.sm,
  },
  trustText: {
    color: COLORS.dark.textMuted,
    fontSize: 8,
  },
  paymentMethodDescText: {
    color: COLORS.dark.textSecondary,
    fontSize: 10,
    lineHeight: 14,
    marginBottom: SPACING.sm,
  },
  paypalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(0, 48, 135, 0.08)',
    borderColor: 'rgba(0, 48, 135, 0.2)',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
  },
  paypalBannerText: {
    color: '#003087',
    fontSize: 9,
    fontWeight: 'bold',
  },
  oxxoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
  },
  oxxoBannerText: {
    color: '#f59e0b',
    fontSize: 9,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.dark.textSecondary,
    marginBottom: 4,
  },
  loginHeaderBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm + 2,
    height: 42,
    borderRadius: BORDER_RADIUS.md,
    borderColor: COLORS.primaryLight,
    borderWidth: 1,
  },
  loginHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  detailsScroll: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  detailImage: {
    width: '100%',
    height: 180,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  detailCategoryBadge: {
    backgroundColor: 'rgba(255, 0, 127, 0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
    alignSelf: 'flex-start',
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 127, 0.3)',
  },
  detailCategoryText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  detailMetaText: {
    color: COLORS.dark.textSecondary,
    fontSize: 12,
  },
  detailPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailDescription: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  infoList: {
    gap: SPACING.xs,
    backgroundColor: '#111827',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: SPACING.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
  },
  infoItemText: {
    color: COLORS.dark.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  bookingBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  bookingBackButtonText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  changeCardLink: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.sm,
    paddingVertical: 4,
  },
  changeCardLinkText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 11,
  },
  relatedMerchCard: {
    width: 140,
    backgroundColor: '#111827',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#1f2937',
    overflow: 'hidden',
    marginRight: SPACING.xs,
  },
  relatedMerchImg: {
    width: '100%',
    height: 90,
  },
  relatedMerchInfo: {
    padding: SPACING.xs,
    alignItems: 'center',
    gap: 4,
  },
  relatedMerchTitle: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  relatedMerchPrice: {
    color: COLORS.dark.textSecondary,
    fontSize: 9,
  },
  relatedMerchAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: 4,
    gap: 2,
  },
  relatedMerchAddText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  relatedMerchQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1f2937',
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginTop: 4,
    width: '100%',
  },
  relatedMerchQtyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relatedMerchQtyText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default UserEventsScreen;
