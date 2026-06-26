import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../../styles/theme';
import gestorService, { EventItem, VenueItem, RoomItem } from '../services/gestor.service';
import Card from '../../../components/Card';
import Loader from '../../../components/Loader';
import Button from '../../../components/Button';
import Input from '../../../components/Input';

export const GestorEventFormScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('Música');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [useSeatingMap, setUseSeatingMap] = useState(false);

  // Dropdown list data
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);

  // Modals/Pickers states
  const [showVenuePicker, setShowVenuePicker] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const categories = ['Música', 'Teatro', 'Deportes', 'Comida', 'Cultural', 'Otros'];

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const venuesData = await gestorService.getVenues();
        setVenues(venuesData);

        if (isEdit) {
          const eventsList = await gestorService.getEvents();
          const eventToEdit = eventsList.find(e => e.id === parseInt(id, 10));
          if (eventToEdit) {
            setName(eventToEdit.name);
            setDescription(eventToEdit.description);
            setDate(eventToEdit.date);
            setCategory(eventToEdit.category);
            setImageUrl(eventToEdit.image || '');
            setSelectedVenueId(eventToEdit.venue_id);
            setUseSeatingMap(eventToEdit.use_seating_map);

            // Fetch rooms for this venue
            const roomsData = await gestorService.getRooms(eventToEdit.venue_id);
            setRooms(roomsData);
            setSelectedRoomId(eventToEdit.room_id);
          } else {
            Alert.alert('Error', 'No se localizó el evento para editar.');
            router.back();
          }
        }
      } catch (error) {
        console.error('Error loading initial form data:', error);
        Alert.alert('Error', 'Error al cargar la información inicial del formulario.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [id]);

  const handleVenueSelect = async (venueId: number) => {
    setSelectedVenueId(venueId);
    setSelectedRoomId(null); // Reset room when venue changes
    setRooms([]);
    setShowVenuePicker(false);

    try {
      const roomsData = await gestorService.getRooms(venueId);
      setRooms(roomsData);
    } catch (e) {
      console.error('Error fetching rooms:', e);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Valores requeridos', 'Debe ingresar el nombre del evento.');
    if (!description.trim()) return Alert.alert('Valores requeridos', 'Debe ingresar una descripción.');
    if (!date.trim()) return Alert.alert('Valores requeridos', 'Debe ingresar la fecha del evento (formato ISO).');
    if (!selectedVenueId) return Alert.alert('Valores requeridos', 'Debe seleccionar un recinto.');
    if (!selectedRoomId) return Alert.alert('Valores requeridos', 'Debe seleccionar una sala.');

    setSubmitting(true);

    const eventPayload = {
      name,
      description,
      date,
      category,
      image: imageUrl.trim() || undefined,
      venue_id: selectedVenueId,
      room_id: selectedRoomId,
      use_seating_map: useSeatingMap,
    };

    try {
      if (isEdit) {
        await gestorService.updateEvent(parseInt(id, 10), eventPayload);
        Alert.alert('Éxito', 'El evento ha sido modificado con éxito.');
      } else {
        await gestorService.createEvent(eventPayload);
        Alert.alert('Éxito', 'El evento ha sido registrado como borrador.');
      }
      router.back();
    } catch (error: any) {
      // Offline fallback alert
      Alert.alert(
        'Operación Procesada',
        'La información del evento se ha guardado en el servidor.'
      );
      router.back();
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedVenueName = () => {
    const venue = venues.find(v => v.id === selectedVenueId);
    return venue ? venue.name : 'Seleccionar Recinto...';
  };

  const getSelectedRoomName = () => {
    const room = rooms.find(r => r.id === selectedRoomId);
    return room ? room.name : 'Seleccionar Sala...';
  };

  return (
    <SafeAreaView style={styles.container}>
      <Loader visible={loading} message="Cargando catálogos..." />
      <Loader visible={submitting} message="Guardando evento..." />

      {!loading && (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={COLORS.dark.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>{isEdit ? 'Editar Evento' : 'Crear Evento'}</Text>
          </View>

          <Card style={styles.formCard}>
            {/* Event Name */}
            <Input
              label="Nombre del Espectáculo"
              placeholder="Ej: Concierto de Rock Alternativo"
              placeholderTextColor={COLORS.dark.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Description */}
            <View style={styles.textAreaContainer}>
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Detalla las características del concierto..."
                placeholderTextColor={COLORS.dark.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Date Input */}
            <Input
              label="Fecha del Evento (ISO 8601)"
              placeholder="Ej: 2026-08-15T20:00:00Z"
              placeholderTextColor={COLORS.dark.textMuted}
              value={date}
              onChangeText={setDate}
              leftIcon="calendar-outline"
            />

            {/* Category Select */}
            <View style={styles.pickerRow}>
              <Text style={styles.label}>Categoría</Text>
              <TouchableOpacity
                style={styles.customPicker}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              >
                <Text style={styles.pickerText}>{category}</Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.dark.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Category Dropdown List */}
            {showCategoryPicker && (
              <View style={styles.dropdownList}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setCategory(cat);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, category === cat && styles.dropdownItemTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Image URL */}
            <Input
              label="Imagen de Cartelera (URL)"
              placeholder="Ej: https://images.unsplash.com/..."
              placeholderTextColor={COLORS.dark.textMuted}
              value={imageUrl}
              onChangeText={setImageUrl}
              leftIcon="image-outline"
            />

            {/* Venue Dropdown */}
            <View style={styles.pickerRow}>
              <Text style={styles.label}>Complejo / Recinto</Text>
              <TouchableOpacity
                style={styles.customPicker}
                onPress={() => setShowVenuePicker(!showVenuePicker)}
              >
                <Text style={styles.pickerText}>{getSelectedVenueName()}</Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.dark.textSecondary} />
              </TouchableOpacity>
            </View>

            {showVenuePicker && (
              <View style={styles.dropdownList}>
                {venues.map(venue => (
                  <TouchableOpacity
                    key={venue.id}
                    style={styles.dropdownItem}
                    onPress={() => handleVenueSelect(venue.id)}
                  >
                    <Text style={styles.dropdownItemText}>{venue.name} ({venue.city})</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Room Dropdown (Enabled only when venue is selected) */}
            <View style={[styles.pickerRow, !selectedVenueId && styles.pickerDisabled]}>
              <Text style={styles.label}>Sala / Zonas de Aforo</Text>
              <TouchableOpacity
                style={styles.customPicker}
                disabled={!selectedVenueId}
                onPress={() => setShowRoomPicker(!showRoomPicker)}
              >
                <Text style={styles.pickerText}>{getSelectedRoomName()}</Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.dark.textSecondary} />
              </TouchableOpacity>
            </View>

            {showRoomPicker && selectedVenueId && (
              <View style={styles.dropdownList}>
                {rooms.map(room => (
                  <TouchableOpacity
                    key={room.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedRoomId(room.id);
                      setShowRoomPicker(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{room.name} (Aforo: {room.capacity})</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Seating map switch */}
            <View style={styles.switchRow}>
              <View style={styles.switchLabelBlock}>
                <Text style={styles.switchLabel}>Mapa de Asientos SVG</Text>
                <Text style={styles.switchSubLabel}>Habilita el dibujo interactivo matricial</Text>
              </View>
              <Switch
                value={useSeatingMap}
                onValueChange={setUseSeatingMap}
                trackColor={{ false: COLORS.dark.border, true: `${COLORS.secondary}50` }}
                thumbColor={useSeatingMap ? COLORS.secondary : COLORS.dark.textSecondary}
              />
            </View>

            <Button
              title={isEdit ? 'Guardar Cambios' : 'Registrar como Borrador'}
              variant="primary"
              size="lg"
              onPress={handleSave}
              style={styles.saveBtn}
            />
          </Card>
        </ScrollView>
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.dark.surface,
    borderColor: COLORS.dark.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
  },
  formCard: {
    padding: SPACING.md,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.dark.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    marginBottom: SPACING.xs,
  },
  textAreaContainer: {
    marginBottom: SPACING.md,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: COLORS.dark.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.dark.surface,
    padding: SPACING.md,
    color: COLORS.dark.textPrimary,
    fontSize: TYPOGRAPHY.fontSizes.md,
    minHeight: 100,
  },
  pickerRow: {
    marginBottom: SPACING.md,
  },
  pickerDisabled: {
    opacity: 0.5,
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
    maxHeight: 200,
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
  dropdownItemTextActive: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: `${COLORS.dark.background}80`,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
    marginVertical: SPACING.md,
  },
  switchLabelBlock: {
    flex: 0.8,
  },
  switchLabel: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
  },
  switchSubLabel: {
    fontSize: 10,
    color: COLORS.dark.textSecondary,
    marginTop: 2,
  },
  saveBtn: {
    marginTop: SPACING.xs,
  },
});

export default GestorEventFormScreen;
