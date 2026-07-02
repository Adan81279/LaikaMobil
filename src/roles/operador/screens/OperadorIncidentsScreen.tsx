import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../../styles/theme';
import operadorService, { IncidentReport } from '../services/operador.service';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import Loader from '../../../components/Loader';
import { useTheme } from '../../../context/ThemeContext';
import { StatusBar } from 'expo-status-bar';

const INCIDENT_TYPES: Array<{ key: IncidentReport['type']; label: string; icon: string }> = [
  { key: 'duplicate', label: 'Boleto Duplicado', icon: 'copy-outline' },
  { key: 'damaged', label: 'Código QR Dañado', icon: 'qr-code-outline' },
  { key: 'impersonation', label: 'Suplantación de Identidad', icon: 'people-outline' },
  { key: 'altercation', label: 'Altercado en Acceso', icon: 'warning-outline' },
  { key: 'other', label: 'Otro Incidente', icon: 'help-circle-outline' },
];

export const OperadorIncidentsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const { isDarkMode, colors } = useTheme();
  
  const [ticketCode, setTicketCode] = useState(params.code || '');
  const [selectedType, setSelectedType] = useState<IncidentReport['type']>('duplicate');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [incidents, setIncidents] = useState<IncidentReport[]>(operadorService.getMockIncidents());

  const handleReport = async () => {
    if (!ticketCode.trim()) {
      Alert.alert('Código Requerido', 'Por favor, ingrese el código del boleto.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Descripción Requerida', 'Por favor, proporcione los detalles del incidente.');
      return;
    }

    setLoading(true);
    try {
      const newIncident = await operadorService.reportIncident(
        ticketCode.trim().toUpperCase(),
        selectedType,
        description.trim()
      );
      
      Alert.alert('Incidencia Guardada', 'El reporte se ha enviado con éxito al servidor central.');
      
      // Clear form
      setTicketCode('');
      setDescription('');
      setSelectedType('duplicate');
      
      // Update list
      setIncidents(operadorService.getMockIncidents());
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo guardar el incidente.');
    } finally {
      setLoading(false);
    }
  };

  const renderIncidentCard = ({ item }: { item: IncidentReport }) => {
    const typeLabel = INCIDENT_TYPES.find(t => t.key === item.type)?.label || 'Incidente';
    return (
      <View style={styles.incidentItem}>
        <View style={styles.incidentHeader}>
          <View style={styles.badgeRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{typeLabel}</Text>
            </View>
            <Text style={styles.itemTicketCode}>{item.ticket_code}</Text>
          </View>
          <Text style={styles.itemTime}>
            {new Date(item.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={styles.itemDesc}>{item.description}</Text>
      </View>
    );
  };

  const styles = getStyles(colors, isDarkMode);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Loader visible={loading} message="Registrando incidencia..." />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Incidencias</Text>
          <Text style={styles.subtitle}>Reporte de anomalías e infracciones en el acceso.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Incident Form */}
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Nuevo Reporte de Puerta</Text>

          <Input
            label="Código de Boleto"
            placeholder="Ej: TKT-USED-456"
            value={ticketCode}
            onChangeText={setTicketCode}
            autoCapitalize="characters"
            leftIcon="barcode-outline"
          />

          <Text style={styles.label}>Categoría de Incidencia</Text>
          <View style={styles.typeSelectorGrid}>
            {INCIDENT_TYPES.map(type => {
              const isSelected = selectedType === type.key;
              return (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.typeOption,
                    isSelected && { borderColor: colors.error, backgroundColor: `${colors.error}15` }
                  ]}
                  onPress={() => setSelectedType(type.key)}
                >
                  <Ionicons 
                    name={type.icon as any} 
                    size={18} 
                    color={isSelected ? colors.error : colors.textSecondary} 
                  />
                  <Text style={[styles.typeOptionText, isSelected && { color: colors.error, fontWeight: 'bold' }]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Descripción Detallada</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Detalla lo sucedido (ej. Persona intentó ingresar con copia impresa de código ya escaneado, titular presentaba credenciales apócrifas...)"
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Button
            title="Enviar Reporte"
            variant="danger"
            size="lg"
            icon={<Ionicons name="shield-outline" size={18} color={colors.background} />}
            onPress={handleReport}
            style={styles.submitBtn}
          />
        </Card>

        {/* Incidents List section */}
        <View style={styles.listSection}>
          <Text style={styles.listSectionTitle}>Reportes Recientes del Turno</Text>
          {incidents.length > 0 ? (
            <FlatList
              data={incidents.slice().reverse()}
              renderItem={renderIncidentCard}
              keyExtractor={(item, index) => index.toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-checkmark-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No hay incidencias reportadas en este turno.</Text>
            </View>
          )}
        </View>

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
  },
  formCard: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  typeSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  typeOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  typeOptionText: {
    fontSize: 10,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  textArea: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: colors.textPrimary,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    minHeight: 100,
  },
  submitBtn: {
    marginTop: SPACING.lg,
  },
  listSection: {
    marginTop: SPACING.sm,
  },
  listSectionTitle: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  listContainer: {
    gap: SPACING.sm,
  },
  incidentItem: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  typeBadge: {
    backgroundColor: `${colors.error}15`,
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  typeBadgeText: {
    fontSize: 8,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.error,
  },
  itemTicketCode: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  itemTime: {
    fontSize: 9,
    color: colors.textMuted,
  },
  itemDesc: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: colors.textMuted,
    marginTop: SPACING.sm,
  },
});

export default OperadorIncidentsScreen;
