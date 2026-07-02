import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../styles/theme';
import usuarioService, { Ticket } from '../services/usuario.service';
import Card from '../../../components/Card';
import Loader from '../../../components/Loader';
import Button from '../../../components/Button';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';

export const UserWalletScreen = () => {
  const { isDarkMode, colors } = useTheme();
  const styles = getStyles(colors, isDarkMode);
  const { user } = useAuth();
  const router = useRouter();
  const isFocused = useIsFocused();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  useEffect(() => {
    if (isFocused && user) {
      fetchTickets();
    }
  }, [isFocused, user]);

  const fetchTickets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await usuarioService.getMyTickets();
      setTickets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.guestContainer}>
          <Ionicons name="wallet-outline" size={80} color={colors.textMuted} style={{ marginBottom: SPACING.md }} />
          <Text style={styles.guestTitle}>Mi Wallet Laika Club</Text>
          <Text style={styles.guestDesc}>
            Inicia sesión o regístrate para poder visualizar tus boletos comprados, generar tus códigos QR y acceder sin conexión a los eventos.
          </Text>
          <Button
            title="Iniciar Sesión / Registrarse"
            onPress={() => router.replace('/(auth)/login' as any)}
            style={styles.guestBtn}
          />
        </View>
      </View>
    );
  }

  const handleOpenTicket = (ticket: Ticket) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    setActiveTicket(ticket);
    setQrModalVisible(true);
  };

  if (loading && tickets.length === 0) {
    return <Loader visible={true} message="Cargando tu cartera digital..." />;
  }

  const activeTickets = tickets.filter(t => t.status === 'valid');
  const pastTickets = tickets.filter(t => t.status !== 'valid');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Boletos (Wallet)</Text>
        <Text style={styles.headerSubtitle}>Tus accesos rápidos para eventos de Laika Club</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Connection Notice */}
        <View style={styles.offlineNotice}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.primary} />
          <Text style={styles.offlineNoticeText}>
            Acceso Offline Habilitado: Muestra tus boletos sin internet.
          </Text>
        </View>

        {/* ACTIVE TICKETS SECTION */}
        <Text style={styles.sectionTitle}>Próximos Espectáculos ({activeTickets.length})</Text>
        {activeTickets.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="ticket-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>No tienes boletos vigentes en tu wallet.</Text>
            <Text style={styles.emptySubtext}>Ve al catálogo de eventos para conseguir tus accesos.</Text>
          </Card>
        ) : (
          activeTickets.map(ticket => (
            <Card key={ticket.id} style={styles.ticketCard}>
              <View style={styles.ticketMain}>
                <View style={styles.ticketLeft}>
                  <Text style={styles.ticketEventTitle} numberOfLines={1}>{ticket.event_title || ticket.event_name || ticket.eventName || 'Espectáculo'}</Text>
                  <Text style={styles.ticketVenue} numberOfLines={1}>{ticket.venue_name || ticket.venue || 'Recinto Central'}</Text>
                  <Text style={styles.ticketTime}>{(ticket.date || ticket.event_date || 'Fecha')} | {(ticket.time || ticket.event_time || 'N/A')}</Text>
                  <Text style={styles.ticketSeat}>Zona: <Text style={{fontWeight: 'bold', color: colors.primary}}>{ticket.seat_label || ticket.seat_id || 'N/A'}</Text></Text>
                </View>
                <TouchableOpacity style={styles.qrTrigger} onPress={() => handleOpenTicket(ticket)}>
                  <Ionicons name="qr-code" size={32} color={colors.textPrimary} />
                  <Text style={styles.qrTriggerText}>VER PASS</Text>
                </TouchableOpacity>
              </View>
              {/* Ticket Jagged Border simulation */}
              <View style={styles.ticketDottedLine} />
              <View style={styles.ticketFooter}>
                <Text style={styles.ticketCode}>CÓDIGO: {ticket.ticket_code}</Text>
                <Text style={[styles.statusBadge, styles.statusValid]}>ACTIVO</Text>
              </View>
            </Card>
          ))
        )}

        {/* PAST OR USED TICKETS */}
        {pastTickets.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: SPACING.md }]}>Historial de Boletos</Text>
            {pastTickets.map(ticket => (
              <Card key={ticket.id} style={StyleSheet.flatten([styles.ticketCard, { opacity: 0.6 }])}>
                <View style={styles.ticketMain}>
                  <View style={styles.ticketLeft}>
                    <Text style={styles.ticketEventTitle} numberOfLines={1}>{ticket.event_title || ticket.event_name || ticket.eventName || 'Espectáculo'}</Text>
                    <Text style={styles.ticketVenue} numberOfLines={1}>{ticket.venue_name || ticket.venue || 'Recinto Central'}</Text>
                    <Text style={styles.ticketTime}>{(ticket.date || ticket.event_date || 'Fecha')} | {(ticket.time || ticket.event_time || 'N/A')}</Text>
                    <Text style={styles.ticketSeat}>Asiento: {ticket.seat_label || ticket.seat_id || 'N/A'}</Text>
                  </View>
                  <View style={styles.qrTriggerDisabled}>
                    <Ionicons name="lock-closed-outline" size={24} color={colors.textMuted} />
                  </View>
                </View>
                <View style={styles.ticketDottedLine} />
                <View style={styles.ticketFooter}>
                  <Text style={styles.ticketCode}>CÓDIGO: {ticket.ticket_code}</Text>
                  <Text style={[
                    styles.statusBadge, 
                    ticket.status === 'used' ? styles.statusUsed : styles.statusRefunded
                  ]}>
                    {ticket.status === 'used' ? 'REIVINDICADO' : 'REEMBOLSADO'}
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      {/* DETAILED QR MODAL (PASSPORT) */}
      <Modal
        visible={qrModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal ticket header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Pase Digital de Acceso</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setQrModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Ticket body */}
            {activeTicket && (
              <View style={styles.digitalPass}>
                <View style={styles.passHeader}>
                  <Text style={styles.passTitle}>{activeTicket.event_title || activeTicket.event_name || activeTicket.eventName || 'Espectáculo'}</Text>
                  <Text style={styles.passVenue}>{activeTicket.venue_name || activeTicket.venue || 'Recinto Central'}</Text>
                </View>
                
                <View style={styles.passMetaGrid}>
                  <View style={styles.passMetaCol}>
                    <Text style={styles.passMetaLabel}>FECHA</Text>
                    <Text style={styles.passMetaVal}>{activeTicket.date || activeTicket.event_date || 'N/A'}</Text>
                  </View>
                  <View style={styles.passMetaCol}>
                    <Text style={styles.passMetaLabel}>HORA</Text>
                    <Text style={styles.passMetaVal}>{activeTicket.time || activeTicket.event_time || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.passMetaGrid}>
                  <View style={styles.passMetaCol}>
                    <Text style={styles.passMetaLabel}>ZONA / ASIENTO</Text>
                    <Text style={[styles.passMetaVal, { color: colors.primary }]}>{activeTicket.seat_label || activeTicket.seat_id || 'N/A'}</Text>
                  </View>
                  <View style={styles.passMetaCol}>
                    <Text style={styles.passMetaLabel}>PRECIO</Text>
                    <Text style={styles.passMetaVal}>${activeTicket.price} MXN</Text>
                  </View>
                </View>

                {activeTicket.related_merch && activeTicket.related_merch.length > 0 && (
                  <View style={{ marginVertical: SPACING.xs, padding: SPACING.sm, backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={[styles.passMetaLabel, { color: colors.primary, marginBottom: 2 }]}>SOUVENIRS VINCULADOS</Text>
                    {activeTicket.related_merch.map((m, idx) => (
                      <Text key={idx} style={{ color: colors.textPrimary, fontSize: 10, fontWeight: 'bold' }}>
                        • {m.title} (x{m.quantity})
                      </Text>
                    ))}
                  </View>
                )}

                {/* Simulated QR Code rendering */}
                <View style={styles.qrContainer}>
                  <View style={styles.qrBox}>
                    {/* Simulated QR grid with blocks */}
                    <Ionicons name="qr-code-sharp" size={160} color="#000000" />
                  </View>
                  <Text style={styles.qrCodeString}>{activeTicket.ticket_code}</Text>
                  <Text style={styles.qrHint}>Presenta este código en el lector de puerta</Text>
                </View>

                <Button
                  title="Listo, Cerrar Pase"
                  onPress={() => setQrModalVisible(false)}
                  style={{ marginTop: SPACING.md }}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: SPACING.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.surfaceAlt,
    paddingTop: 45,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg + 2,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scrollContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}10`,
    borderColor: `${colors.primary}30`,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  offlineNoticeText: {
    fontSize: 10,
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  emptyCard: {
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    marginTop: SPACING.sm,
  },
  emptySubtext: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  ticketCard: {
    padding: 0,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  ticketMain: {
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketLeft: {
    flex: 1,
    gap: 3,
  },
  ticketEventTitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm + 1,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  ticketVenue: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  ticketTime: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  ticketSeat: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  qrTrigger: {
    backgroundColor: colors.primary,
    padding: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    gap: 4,
  },
  qrTriggerText: {
    color: colors.background,
    fontSize: 8,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  qrTriggerDisabled: {
    backgroundColor: colors.surfaceAlt,
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketDottedLine: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 0.8,
    borderColor: colors.border,
    marginHorizontal: SPACING.md,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: colors.surfaceAlt,
  },
  ticketCode: {
    fontSize: 9,
    color: colors.textMuted,
  },
  statusBadge: {
    fontSize: 8,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusValid: {
    backgroundColor: `${colors.success}20`,
    color: colors.success,
  },
  statusUsed: {
    backgroundColor: colors.border,
    color: colors.textSecondary,
  },
  statusRefunded: {
    backgroundColor: `${colors.error}20`,
    color: colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    width: '90%',
    maxHeight: '85%',
    padding: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: colors.surfaceAlt,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.md,
  },
  modalHeaderTitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textSecondary,
  },
  modalClose: {
    backgroundColor: colors.surfaceAlt,
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitalPass: {
    gap: SPACING.md,
  },
  passHeader: {
    gap: 2,
  },
  passTitle: {
    fontSize: TYPOGRAPHY.fontSizes.md + 1,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  passVenue: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  passMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  passMetaCol: {
    flex: 1,
  },
  passMetaLabel: {
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  passMetaVal: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  qrBox: {
    padding: SPACING.xs,
    backgroundColor: '#FFFFFF',
  },
  qrCodeString: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#0f172a',
    marginTop: SPACING.sm,
    letterSpacing: 1,
  },
  qrHint: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: colors.background,
  },
  guestTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: SPACING.sm,
  },
  guestDesc: {
    fontSize: TYPOGRAPHY.fontSizes.sm - 1,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  guestBtn: {
    width: '100%',
  },
});

export default UserWalletScreen;
