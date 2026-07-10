import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Alert,
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
import * as Clipboard from 'expo-clipboard';
import Input from '../../../components/Input';

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

  // Transfer state
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferCode, setTransferCode] = useState('');
  const [transferringTicketId, setTransferringTicketId] = useState('');

  // Claim state
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [inputTransferCode, setInputTransferCode] = useState('');
  const [claimedTicket, setClaimedTicket] = useState<Ticket | null>(null);
  const [showClaimSuccess, setShowClaimSuccess] = useState(false);

  const handleTransferTicket = async (ticket: Ticket) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}
    
    setLoading(true);
    try {
      const code = await usuarioService.transferTicket(ticket.id);
      setTransferCode(code);
      setTransferringTicketId(ticket.id);
      setTransferModalVisible(true);
      await fetchTickets();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo generar el código de transferencia.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTransferCode = async () => {
    try {
      await Clipboard.setStringAsync(transferCode);
      Alert.alert('Código Copiado', 'El código de transferencia se ha copiado al portapapeles.');
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    } catch (e) {
      Alert.alert('Error', 'No se pudo copiar el código.');
    }
  };

  const handleCopyTicketCode = async () => {
    if (!activeTicket) return;
    try {
      await Clipboard.setStringAsync(activeTicket.ticket_code);
      Alert.alert('Código Copiado', 'El código del boleto se ha copiado al portapapeles.');
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    } catch (e) {
      Alert.alert('Error', 'No se pudo copiar el código.');
    }
  };

  const handleClaimTicket = async () => {
    if (!inputTransferCode.trim()) {
      Alert.alert('Campo Incompleto', 'Por favor, ingrese el código de transferencia.');
      return;
    }
    
    setLoading(true);
    try {
      const ticketClaimed = await usuarioService.claimTransferredTicket(inputTransferCode);
      setClaimedTicket(ticketClaimed);
      setShowClaimSuccess(true);
      setClaimModalVisible(false);
      setInputTransferCode('');
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
      await fetchTickets();
    } catch (e: any) {
      Alert.alert('Error al Canjear', e.message || 'No se pudo canjear el boleto.');
    } finally {
      setLoading(false);
    }
  };

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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Mis Boletos (Wallet)</Text>
            <Text style={styles.headerSubtitle}>Tus accesos rápidos para eventos de Laika Club</Text>
          </View>
          <TouchableOpacity style={styles.claimHeaderBtn} onPress={() => setClaimModalVisible(true)}>
            <Ionicons name="receipt-outline" size={16} color={colors.primary} />
            <Text style={styles.claimHeaderBtnText}>Canjear</Text>
          </TouchableOpacity>
        </View>
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
                  
                  {ticket.transfer_code && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <Ionicons name="gift-outline" size={12} color={colors.secondary} />
                      <Text style={{ fontSize: 9, color: colors.secondary, fontWeight: 'bold' }}>
                        Pendiente transferir: {ticket.transfer_code}
                      </Text>
                    </View>
                  )}
                  {ticket.original_owner_name && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Ionicons name="arrow-undo-outline" size={12} color={colors.textSecondary} />
                      <Text style={{ fontSize: 9, color: colors.textSecondary }}>
                        De: {ticket.original_owner_name}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ gap: SPACING.xs, alignItems: 'center' }}>
                  <TouchableOpacity style={styles.qrTrigger} onPress={() => handleOpenTicket(ticket)}>
                    <Ionicons name="qr-code" size={16} color={colors.background || '#FFFFFF'} />
                    <Text style={styles.qrTriggerText}>VER PASS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.transferTrigger} onPress={() => handleTransferTicket(ticket)}>
                    <Ionicons name="send" size={16} color={colors.secondary} />
                    <Text style={styles.transferTriggerText}>TRANSFERIR</Text>
                  </TouchableOpacity>
                </View>
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
                    <Text style={styles.passMetaVal}>${Math.round(Number(activeTicket.price))} MXN</Text>
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
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, marginTop: SPACING.xs }}>
                    <Text style={[styles.qrCodeString, { marginTop: 0 }]}>{activeTicket.ticket_code}</Text>
                    <TouchableOpacity onPress={handleCopyTicketCode} style={{ padding: 4, backgroundColor: colors.surfaceAlt, borderRadius: BORDER_RADIUS.sm, borderWidth: 1, borderColor: colors.border }}>
                      <Ionicons name="copy-outline" size={12} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

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

      {/* MODAL DE TRANSFERENCIA */}
      <Modal
        visible={transferModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTransferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Transferir Boleto</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setTransferModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: SPACING.md, alignItems: 'center', paddingVertical: SPACING.sm }}>
              <Ionicons name="gift-outline" size={60} color={colors.secondary} />
              <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: 'center', fontWeight: 'bold' }}>
                ¡Código de Transferencia Generado!
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'center', paddingHorizontal: SPACING.sm }}>
                Envía este código a la persona que deseas transferir el boleto. Quien lo canjee se convertirá en el nuevo dueño.
              </Text>

              <View style={{
                backgroundColor: colors.surfaceAlt,
                padding: SPACING.md,
                borderRadius: BORDER_RADIUS.md,
                borderWidth: 1,
                borderColor: colors.border,
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                marginVertical: SPACING.xs
              }}>
                <Text style={{ color: colors.primary, fontSize: 18, fontWeight: 'bold', letterSpacing: 1.5 }}>
                  {transferCode}
                </Text>
              </View>

              <Button
                title="Copiar Código"
                variant="primary"
                onPress={handleCopyTransferCode}
                style={{ width: '100%' }}
              />

              <TouchableOpacity
                onPress={() => setTransferModalVisible(false)}
                style={{ marginTop: 4 }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CANJE (COLOCAR CÓDIGO) */}
      <Modal
        visible={claimModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setClaimModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Canjear Boleto Transferido</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setClaimModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: SPACING.md, paddingVertical: SPACING.xs }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                Ingresa el código de transferencia que te enviaron para reclamar el boleto y agregarlo a tu wallet:
              </Text>

              <Input
                label="Código de Transferencia"
                placeholder="XFER-XXXX-XXXX"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                value={inputTransferCode}
                onChangeText={setInputTransferCode}
                leftIcon="gift-outline"
              />

              <Button
                title="Canjear y Reclamar Boleto"
                variant="primary"
                onPress={handleClaimTicket}
                style={{ marginTop: SPACING.xs }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE ÉXITO DE CANJE */}
      <Modal
        visible={showClaimSuccess}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowClaimSuccess(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>¡Canje Exitoso!</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowClaimSuccess(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {claimedTicket && (
              <View style={{ gap: SPACING.md, alignItems: 'center', paddingVertical: SPACING.sm }}>
                <Ionicons name="checkmark-circle-outline" size={64} color="#10B981" />
                <Text style={{ color: colors.textPrimary, fontSize: 14, textAlign: 'center', fontWeight: 'bold' }}>
                  ¡Has reclamado tu boleto correctamente!
                </Text>

                <View style={{
                  backgroundColor: colors.surfaceAlt,
                  padding: SPACING.md,
                  borderRadius: BORDER_RADIUS.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  width: '100%',
                  gap: 8,
                }}>
                  <View>
                    <Text style={{ fontSize: 9, color: colors.textMuted }}>TE LO ENVIÓ</Text>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textPrimary }}>
                      {claimedTicket.original_owner_name || 'Otro Usuario'}
                    </Text>
                  </View>
                  
                  <View style={{ height: 1, backgroundColor: colors.border }} />

                  <View>
                    <Text style={{ fontSize: 9, color: colors.textMuted }}>EVENTO</Text>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textPrimary }}>
                      {claimedTicket.event_title || 'Espectáculo'}
                    </Text>
                  </View>

                  <View style={{ height: 1, backgroundColor: colors.border }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontSize: 9, color: colors.textMuted }}>FECHA Y HORA</Text>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.textPrimary }}>
                        {claimedTicket.date} a las {claimedTicket.time}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 9, color: colors.textMuted }}>ASIENTO/ZONA</Text>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary }}>
                        {claimedTicket.seat_label}
                      </Text>
                    </View>
                  </View>

                  <View style={{ height: 1, backgroundColor: colors.border }} />

                  <View>
                    <Text style={{ fontSize: 9, color: colors.textMuted }}>LUGAR</Text>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.textPrimary }}>
                      {claimedTicket.venue_name}
                    </Text>
                  </View>
                </View>

                <Button
                  title="Entendido, Ir a Wallet"
                  variant="primary"
                  onPress={() => setShowClaimSuccess(false)}
                  style={{ width: '100%', marginTop: SPACING.xs }}
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
  claimHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 4,
  },
  claimHeaderBtnText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  qrTrigger: {
    backgroundColor: colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    gap: 2,
    width: 75,
  },
  qrTriggerText: {
    color: colors.background || '#FFFFFF',
    fontSize: 8,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  transferTrigger: {
    backgroundColor: `${colors.secondary}15`,
    borderColor: colors.secondary,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    gap: 2,
    width: 75,
  },
  transferTriggerText: {
    color: colors.secondary,
    fontSize: 7,
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
