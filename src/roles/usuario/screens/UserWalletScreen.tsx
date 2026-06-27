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

export const UserWalletScreen = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
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
          <Ionicons name="cloud-offline-outline" size={16} color={COLORS.primary} />
          <Text style={styles.offlineNoticeText}>
            Acceso Offline Habilitado: Muestra tus boletos sin internet.
          </Text>
        </View>

        {/* ACTIVE TICKETS SECTION */}
        <Text style={styles.sectionTitle}>Próximos Espectáculos ({activeTickets.length})</Text>
        {activeTickets.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="ticket-outline" size={36} color={COLORS.dark.textMuted} />
            <Text style={styles.emptyText}>No tienes boletos vigentes en tu wallet.</Text>
            <Text style={styles.emptySubtext}>Ve al catálogo de eventos para conseguir tus accesos.</Text>
          </Card>
        ) : (
          activeTickets.map(ticket => (
            <Card key={ticket.id} style={styles.ticketCard}>
              <View style={styles.ticketMain}>
                <View style={styles.ticketLeft}>
                  <Text style={styles.ticketEventTitle} numberOfLines={1}>{ticket.event_title}</Text>
                  <Text style={styles.ticketVenue} numberOfLines={1}>{ticket.venue_name}</Text>
                  <Text style={styles.ticketTime}>{ticket.date} | {ticket.time}</Text>
                  <Text style={styles.ticketSeat}>Zona: <Text style={{fontWeight: 'bold', color: COLORS.primary}}>{ticket.seat_label}</Text></Text>
                </View>
                <TouchableOpacity style={styles.qrTrigger} onPress={() => handleOpenTicket(ticket)}>
                  <Ionicons name="qr-code" size={32} color="#FFFFFF" />
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
                    <Text style={styles.ticketEventTitle} numberOfLines={1}>{ticket.event_title}</Text>
                    <Text style={styles.ticketVenue} numberOfLines={1}>{ticket.venue_name}</Text>
                    <Text style={styles.ticketTime}>{ticket.date} | {ticket.time}</Text>
                    <Text style={styles.ticketSeat}>Asiento: {ticket.seat_label}</Text>
                  </View>
                  <View style={styles.qrTriggerDisabled}>
                    <Ionicons name="lock-closed-outline" size={24} color={COLORS.dark.textMuted} />
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
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Ticket body */}
            {activeTicket && (
              <View style={styles.digitalPass}>
                <View style={styles.passHeader}>
                  <Text style={styles.passTitle}>{activeTicket.event_title}</Text>
                  <Text style={styles.passVenue}>{activeTicket.venue_name}</Text>
                </View>
                
                <View style={styles.passMetaGrid}>
                  <View style={styles.passMetaCol}>
                    <Text style={styles.passMetaLabel}>FECHA</Text>
                    <Text style={styles.passMetaVal}>{activeTicket.date}</Text>
                  </View>
                  <View style={styles.passMetaCol}>
                    <Text style={styles.passMetaLabel}>HORA</Text>
                    <Text style={styles.passMetaVal}>{activeTicket.time}</Text>
                  </View>
                </View>

                <View style={styles.passMetaGrid}>
                  <View style={styles.passMetaCol}>
                    <Text style={styles.passMetaLabel}>ZONA / ASIENTO</Text>
                    <Text style={[styles.passMetaVal, { color: COLORS.primary }]}>{activeTicket.seat_label}</Text>
                  </View>
                  <View style={styles.passMetaCol}>
                    <Text style={styles.passMetaLabel}>PRECIO</Text>
                    <Text style={styles.passMetaVal}>${activeTicket.price} MXN</Text>
                  </View>
                </View>

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
  },
  scrollContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
    borderColor: `${COLORS.primary}30`,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  offlineNoticeText: {
    fontSize: 10,
    color: COLORS.dark.textPrimary,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  emptyCard: {
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.dark.textSecondary,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    marginTop: SPACING.sm,
  },
  emptySubtext: {
    color: COLORS.dark.textMuted,
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
    color: '#FFFFFF',
  },
  ticketVenue: {
    fontSize: 10,
    color: COLORS.dark.textSecondary,
  },
  ticketTime: {
    fontSize: 10,
    color: COLORS.dark.textSecondary,
  },
  ticketSeat: {
    fontSize: 10,
    color: COLORS.dark.textSecondary,
    marginTop: 2,
  },
  qrTrigger: {
    backgroundColor: COLORS.primary,
    padding: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    gap: 4,
  },
  qrTriggerText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  qrTriggerDisabled: {
    backgroundColor: '#151c2c',
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
    borderColor: '#1e293b',
    marginHorizontal: SPACING.md,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#090d18',
  },
  ticketCode: {
    fontSize: 9,
    color: COLORS.dark.textMuted,
  },
  statusBadge: {
    fontSize: 8,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusValid: {
    backgroundColor: `${COLORS.success}20`,
    color: COLORS.success,
  },
  statusUsed: {
    backgroundColor: '#334155',
    color: '#94a3b8',
  },
  statusRefunded: {
    backgroundColor: `${COLORS.error}20`,
    color: COLORS.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#0b0f19',
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
    borderColor: '#151c2c',
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.md,
  },
  modalHeaderTitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textSecondary,
  },
  modalClose: {
    backgroundColor: '#151c2c',
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
    color: '#FFFFFF',
  },
  passVenue: {
    fontSize: 11,
    color: COLORS.dark.textSecondary,
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
    color: COLORS.dark.textMuted,
    letterSpacing: 1,
  },
  passMetaVal: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
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
});

export default UserWalletScreen;
