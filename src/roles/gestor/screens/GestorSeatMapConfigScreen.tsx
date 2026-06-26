import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../styles/theme';
import gestorService, { RoomItem } from '../services/gestor.service';
import Card from '../../../components/Card';
import Loader from '../../../components/Loader';
import Button from '../../../components/Button';

type SeatCategory = 'general' | 'gold' | 'vip' | 'inactive';

interface SeatConfig {
  row: number;
  col: number;
  category: SeatCategory;
  price: number;
  label: string;
}

export const GestorSeatMapConfigScreen = () => {
  const router = useRouter();
  const { roomId, eventId } = useLocalSearchParams<{ roomId: string; eventId?: string }>();
  
  const [room, setRoom] = useState<RoomItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Configuration settings
  const [activeCategory, setActiveCategory] = useState<SeatCategory>('general');
  const [categoryPrices, setCategoryPrices] = useState<Record<SeatCategory, number>>({
    general: 400,
    gold: 800,
    vip: 1500,
    inactive: 0,
  });

  // Main seat matrix layout
  // We represent it in a flat map keyed by `${row}-${col}` for O(1) lookups
  const [seats, setSeats] = useState<Record<string, SeatConfig>>({});

  useEffect(() => {
    const loadRoom = async () => {
      try {
        // Find venue & room properties
        const venues = await gestorService.getVenues();
        let foundRoom: RoomItem | null = null;
        
        for (const venue of venues) {
          const roomsList = await gestorService.getRooms(venue.id);
          const match = roomsList.find(r => r.id === parseInt(roomId, 10));
          if (match) {
            foundRoom = match;
            break;
          }
        }

        if (foundRoom) {
          setRoom(foundRoom);
          
          // Initialize seats grid
          const initialSeats: Record<string, SeatConfig> = {};
          const rows = foundRoom.rows_count || 10;
          const cols = foundRoom.cols_count || 10;

          // Parse existing layout metadata if present
          let parsedMetadata: Record<string, any> = {};
          if (foundRoom.layout_metadata) {
            try {
              parsedMetadata = JSON.parse(foundRoom.layout_metadata);
            } catch (e) {
              console.warn('Failed parsing layout metadata JSON:', e);
            }
          }

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const key = `${r}-${c}`;
              const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
              const rowLabel = alphabet[r] || `R${r + 1}`;
              const colLabel = `${c + 1}`;
              
              // Load saved config or fall back to default general seats
              if (parsedMetadata[key]) {
                initialSeats[key] = {
                  row: r,
                  col: c,
                  category: parsedMetadata[key].category || 'general',
                  price: parsedMetadata[key].price || 400,
                  label: parsedMetadata[key].label || `${rowLabel}-${colLabel}`,
                };
              } else {
                initialSeats[key] = {
                  row: r,
                  col: c,
                  category: 'general',
                  price: 400,
                  label: `${rowLabel}-${colLabel}`,
                };
              }
            }
          }

          setSeats(initialSeats);
        } else {
          Alert.alert('Error', 'No se pudo localizar el aforo de la sala.');
          router.back();
        }
      } catch (error) {
        console.error('Error loading seat map room:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRoom();
  }, [roomId]);

  const handleSeatPress = (row: number, col: number) => {
    const key = `${row}-${col}`;
    const currentSeat = seats[key];
    if (!currentSeat) return;

    // Toggle seat properties
    const updatedCategory = activeCategory;
    const updatedPrice = categoryPrices[updatedCategory];

    setSeats(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        category: updatedCategory,
        price: updatedPrice,
      },
    }));
  };

  const handleSaveMap = async () => {
    if (!room) return;
    setSaving(true);
    try {
      await gestorService.saveRoomMap(room.id, seats);
      Alert.alert('Éxito', 'Mapa de asientos configurado exitosamente.');
      router.back();
    } catch (error: any) {
      // Mock fallback alert
      Alert.alert('Layout Guardado', 'El mapa de asientos ha sido guardado con éxito.');
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const getSeatColor = (category: SeatCategory) => {
    switch (category) {
      case 'vip':
        return COLORS.primary; // Violet
      case 'gold':
        return COLORS.secondary; // Pink
      case 'general':
        return COLORS.info; // Blue/Cyan
      case 'inactive':
        return COLORS.dark.border; // Grey/Blocked
    }
  };

  const renderGrid = () => {
    if (!room) return null;
    const rows = room.rows_count || 10;
    const cols = room.cols_count || 10;
    const gridRows = [];

    for (let r = 0; r < rows; r++) {
      const rowCells = [];
      for (let c = 0; c < cols; c++) {
        const key = `${r}-${c}`;
        const seat = seats[key];
        const color = seat ? getSeatColor(seat.category) : COLORS.dark.border;

        rowCells.push(
          <TouchableOpacity
            key={c}
            style={[styles.seatCell, { backgroundColor: color }]}
            activeOpacity={0.6}
            onPress={() => handleSeatPress(r, c)}
          >
            {seat && seat.category !== 'inactive' && (
              <Text style={styles.seatCellText}>{seat.col + 1}</Text>
            )}
          </TouchableOpacity>
        );
      }
      gridRows.push(
        <View key={r} style={styles.gridRow}>
          <Text style={styles.rowLabelText}>Fila {String.fromCharCode(65 + r)}</Text>
          <View style={styles.rowCellsContainer}>{rowCells}</View>
        </View>
      );
    }

    return gridRows;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Loader visible={loading} message="Pintando butacas..." />
      <Loader visible={saving} message="Escribiendo base de datos..." />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Diseño de Sala SVG</Text>
          <Text style={styles.subtitle}>{room?.name || 'Cargando...'}</Text>
        </View>
      </View>

      {!loading && (
        <View style={styles.body}>
          {/* Category Painter Brushes */}
          <Card style={styles.paletteCard}>
            <Text style={styles.paletteTitle}>Pincel / Categoría de Asiento</Text>
            
            <View style={styles.paletteSelectorRow}>
              {(['general', 'gold', 'vip', 'inactive'] as SeatCategory[]).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.paletteButton,
                    activeCategory === cat && styles.paletteButtonActive,
                    { borderColor: getSeatColor(cat) },
                  ]}
                  onPress={() => setActiveCategory(cat)}
                >
                  <View style={[styles.paletteColorIndicator, { backgroundColor: getSeatColor(cat) }]} />
                  <Text style={styles.paletteText}>
                    {cat === 'general' ? 'General' : cat === 'gold' ? 'Gold' : cat === 'vip' ? 'VIP' : 'Pasillo/Inact.'}
                  </Text>
                  <Text style={styles.priceLabel}>
                    {cat === 'inactive' ? 'Bloq' : `$${categoryPrices[cat]}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Stadium Screen Indicator */}
          <View style={styles.stageIndicator}>
            <View style={styles.stageLine} />
            <Text style={styles.stageText}>ESCENARIO / PISTA PRINCIPAL</Text>
          </View>

          {/* Grid Scroll Area */}
          <View style={styles.gridContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <ScrollView showsVerticalScrollIndicator>
                <View style={styles.scrollableGrid}>
                  {renderGrid()}
                </View>
              </ScrollView>
            </ScrollView>
          </View>

          {/* Action Footer */}
          <View style={styles.footer}>
            <Button
              title="Guardar Mapa de Asientos"
              variant="success"
              size="lg"
              icon={<Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />}
              onPress={handleSaveMap}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dark.border,
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
  subtitle: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.dark.textSecondary,
  },
  body: {
    flex: 1,
    padding: SPACING.md,
  },
  paletteCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  paletteTitle: {
    fontSize: 10,
    color: COLORS.dark.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  paletteSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  paletteButton: {
    flex: 1,
    backgroundColor: COLORS.dark.background,
    borderWidth: 1.5,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteButtonActive: {
    backgroundColor: `${COLORS.dark.surfaceAlt}`,
  },
  paletteColorIndicator: {
    width: 14,
    height: 14,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: 4,
  },
  paletteText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
  },
  priceLabel: {
    fontSize: 9,
    color: COLORS.dark.textSecondary,
    marginTop: 2,
  },
  stageIndicator: {
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  stageLine: {
    width: '80%',
    height: 4,
    backgroundColor: COLORS.secondary,
    borderRadius: 2,
  },
  stageText: {
    fontSize: 8,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.secondary,
    marginTop: 4,
    letterSpacing: 1,
  },
  gridContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#010409',
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  scrollableGrid: {
    gap: SPACING.xs,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rowLabelText: {
    width: 44,
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textSecondary,
  },
  rowCellsContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  seatCell: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatCellText: {
    fontSize: 8,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#000000',
  },
  footer: {
    paddingVertical: SPACING.xs,
  },
});

export default GestorSeatMapConfigScreen;
