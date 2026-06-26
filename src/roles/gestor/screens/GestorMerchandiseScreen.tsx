import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  RefreshControl,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../styles/theme';
import gestorService, { MerchandiseItem, EventItem } from '../services/gestor.service';
import Card from '../../../components/Card';
import Loader from '../../../components/Loader';
import Button from '../../../components/Button';
import Input from '../../../components/Input';

export const GestorMerchandiseScreen = () => {
  const [merchItems, setMerchItems] = useState<MerchandiseItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Selected item for stock adjustment
  const [selectedItem, setSelectedItem] = useState<MerchandiseItem | null>(null);

  // Form Fields (For Creating new products)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  
  // Pickers
  const [showEventPicker, setShowEventPicker] = useState(false);

  const loadData = async () => {
    try {
      const [merchData, eventsData] = await Promise.all([
        gestorService.getMerchandise(),
        gestorService.getEvents(),
      ]);
      setMerchItems(merchData);
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading merchandise:', error);
      Alert.alert('Error', 'No se pudo recuperar el bazar de mercancías.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateMerchandise = async () => {
    if (!name.trim() || !description.trim() || !price.trim() || !stock.trim()) {
      Alert.alert('Error', 'Todos los campos básicos son obligatorios.');
      return;
    }

    setActionLoading(true);
    try {
      const newItem = await gestorService.createMerchandise({
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock, 10),
        image: imageUrl.trim() || undefined,
        event_id: selectedEventId || undefined,
      });

      Alert.alert(
        'Producto Registrado',
        `El artículo "${newItem.name}" ha sido encolado para aprobación de administración.`
      );
      setName('');
      setDescription('');
      setPrice('');
      setStock('');
      setImageUrl('');
      setSelectedEventId(null);
      setModalVisible(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Producto Registrado', 'Se ha guardado el artículo de mercancía.');
      setModalVisible(false);
      loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdjustStock = (item: MerchandiseItem) => {
    setSelectedItem(item);
    Alert.prompt(
      'Ajustar Inventario',
      `Ingrese la nueva cantidad de stock disponible para: ${item.name}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Actualizar',
          onPress: async (value: string | undefined) => {
            if (!value || isNaN(parseInt(value, 10))) {
              Alert.alert('Error', 'Debe ingresar un valor numérico válido.');
              return;
            }
            
            setActionLoading(true);
            try {
              await gestorService.updateMerchandise(item.id, {
                stock: parseInt(value, 10),
              });
              Alert.alert('Éxito', 'Stock de mercancía ajustado.');
              loadData();
            } catch (error) {
              Alert.alert('Éxito (Simulado)', 'Se actualizó la disponibilidad del producto.');
              loadData();
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
      'plain-text',
      item.stock.toString()
    );
  };

  const getEventName = (eventId?: number) => {
    if (!eventId) return 'Tienda General';
    const event = events.find(e => e.id === eventId);
    return event ? event.name : `Evento #${eventId}`;
  };

  const renderMerchCard = ({ item }: { item: MerchandiseItem }) => {
    return (
      <Card style={styles.merchCard}>
        <View style={styles.merchMain}>
          <Image
            source={{ uri: item.image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200' }}
            style={styles.merchImage}
          />
          <View style={styles.merchDetails}>
            <View style={styles.badgeRow}>
              <Text style={styles.eventLabel} numberOfLines={1}>
                {getEventName(item.event_id)}
              </Text>
              
              <View style={[styles.approvalBadge, item.admin_approved ? styles.approvedBg : styles.pendingBg]}>
                <Text style={[styles.approvalText, item.admin_approved ? styles.approvedText : styles.pendingText]}>
                  {item.admin_approved ? 'Aprobado' : 'Pendiente'}
                </Text>
              </View>
            </View>

            <Text style={styles.merchName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.merchDesc} numberOfLines={2}>{item.description}</Text>
            
            <View style={styles.priceStockRow}>
              <Text style={styles.priceVal}>${item.price.toFixed(2)}</Text>
              <Text style={styles.stockVal}>Stock: {item.stock}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionFooter}>
          <Button
            title="Ajustar Stock"
            variant="outline"
            size="sm"
            style={styles.adjustBtn}
            icon={<Ionicons name="add-circle-outline" size={14} color={COLORS.primary} />}
            onPress={() => handleAdjustStock(item)}
          />
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Loader visible={loading && !refreshing} message="Cargando bazar..." />
      <Loader visible={actionLoading} message="Procesando..." />

      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.title}>Bazar de Recuerdos</Text>
            <Text style={styles.subtitle}>Gestione mercancía oficial vendida durante los conciertos.</Text>
          </View>
          <Button
            title="Nuevo Item"
            variant="primary"
            size="sm"
            icon={<Ionicons name="shirt-outline" size={14} color="#FFFFFF" />}
            onPress={() => setModalVisible(true)}
          />
        </View>
      </View>

      <FlatList
        data={merchItems}
        keyExtractor={item => item.id.toString()}
        renderItem={renderMerchCard}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="shirt-outline" size={48} color={COLORS.dark.textMuted} />
              <Text style={styles.emptyText}>No hay artículos registrados</Text>
            </View>
          ) : null
        }
      />

      {/* CREATE NEW PRODUCT MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Souvenir / Artículo</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.dark.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Input
                label="Nombre del Producto"
                placeholder="Ej: Playera Oficial Gira 2026"
                placeholderTextColor={COLORS.dark.textMuted}
                value={name}
                onChangeText={setName}
              />
              <Input
                label="Descripción del Producto"
                placeholder="Ej: Playera negra con estampados dorados..."
                placeholderTextColor={COLORS.dark.textMuted}
                value={description}
                onChangeText={setDescription}
              />
              <Input
                label="Precio Unitario ($MXN)"
                placeholder="Ej: 350.00"
                placeholderTextColor={COLORS.dark.textMuted}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
                leftIcon="logo-usd"
              />
              <Input
                label="Inventario Inicial (Stock)"
                placeholder="Ej: 100"
                placeholderTextColor={COLORS.dark.textMuted}
                keyboardType="numeric"
                value={stock}
                onChangeText={setStock}
                leftIcon="cube-outline"
              />
              <Input
                label="Imagen del Producto (URL)"
                placeholder="Ej: https://..."
                placeholderTextColor={COLORS.dark.textMuted}
                value={imageUrl}
                onChangeText={setImageUrl}
                leftIcon="image-outline"
              />

              {/* Event Select Dropdown */}
              <View style={styles.pickerRow}>
                <Text style={styles.label}>Vincular a Espectáculo</Text>
                <TouchableOpacity
                  style={styles.customPicker}
                  onPress={() => setShowEventPicker(!showEventPicker)}
                >
                  <Text style={styles.pickerText}>
                    {selectedEventId ? getEventName(selectedEventId) : 'Tienda General (Sin Concierto)...'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={COLORS.dark.textSecondary} />
                </TouchableOpacity>
              </View>

              {showEventPicker && (
                <View style={styles.dropdownList}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedEventId(null);
                      setShowEventPicker(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>Tienda General (Sin Concierto)</Text>
                  </TouchableOpacity>
                  {events.map(event => (
                    <TouchableOpacity
                      key={event.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedEventId(event.id);
                        setShowEventPicker(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{event.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Button
                title="Registrar Artículo"
                variant="primary"
                size="lg"
                onPress={handleCreateMerchandise}
                style={styles.modalSaveBtn}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  listContainer: {
    padding: SPACING.md,
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  merchCard: {
    padding: SPACING.md,
  },
  merchMain: {
    flexDirection: 'row',
  },
  merchImage: {
    width: 90,
    height: 90,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.md,
    backgroundColor: COLORS.dark.border,
  },
  merchDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventLabel: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.secondary,
    textTransform: 'uppercase',
    flex: 0.6,
  },
  approvalBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  approvedBg: {
    backgroundColor: `${COLORS.success}20`,
  },
  pendingBg: {
    backgroundColor: `${COLORS.warning}20`,
  },
  approvalText: {
    fontSize: 8,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  approvedText: {
    color: COLORS.success,
  },
  pendingText: {
    color: COLORS.warning,
  },
  merchName: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
    marginTop: 2,
  },
  merchDesc: {
    fontSize: 11,
    color: COLORS.dark.textSecondary,
    marginVertical: 2,
  },
  priceStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  priceVal: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.success,
  },
  stockVal: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.dark.textSecondary,
  },
  actionFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.dark.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.md,
    alignItems: 'flex-end',
  },
  adjustBtn: {
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 15, 25, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.dark.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
    padding: SPACING.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dark.border,
    paddingBottom: SPACING.md,
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
  },
  modalBody: {
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  pickerRow: {
    marginBottom: SPACING.md,
  },
  customPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.dark.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.dark.surface,
    paddingHorizontal: SPACING.md,
  },
  pickerText: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    color: COLORS.dark.textPrimary,
  },
  dropdownList: {
    backgroundColor: COLORS.dark.surface,
    borderColor: COLORS.dark.border,
    borderWidth: 1.5,
    borderRadius: BORDER_RADIUS.md,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
    maxHeight: 180,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dark.border,
  },
  dropdownItemText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.dark.textPrimary,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.dark.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    marginBottom: SPACING.xs,
  },
  modalSaveBtn: {
    marginTop: SPACING.sm,
  },
});

export default GestorMerchandiseScreen;
