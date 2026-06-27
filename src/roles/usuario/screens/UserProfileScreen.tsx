import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../styles/theme';
import { useAuth } from '../../../context/AuthContext';
import usuarioService, { Ticket, RefundRequest } from '../services/usuario.service';
import Card from '../../../components/Card';
import Loader from '../../../components/Loader';
import Button from '../../../components/Button';
import * as Haptics from 'expo-haptics';
import EditProfileModal from '../../../components/EditProfileModal';

export const UserProfileScreen = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'refunds' | 'security'>('profile');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  // Refund states
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [refundReason, setRefundReason] = useState('');

  // Promotion states
  const [selectedRole, setSelectedRole] = useState<'operador' | 'gestor'>('operador');
  const [promotionReason, setPromotionReason] = useState('');

  useEffect(() => {
    fetchRefundsData();
  }, [activeTab]);

  const fetchRefundsData = async () => {
    if (activeTab === 'refunds') {
      setLoading(true);
      try {
        const uTickets = await usuarioService.getMyTickets();
        const uRefunds = await usuarioService.getRefunds();
        setTickets(uTickets.filter(t => t.status === 'valid'));
        setRefunds(uRefunds);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', style: 'destructive', onPress: () => logout() }
      ]
    );
  };

  const handleRequestRefund = async () => {
    if (!selectedTicketId) {
      Alert.alert('Boleto requerido', 'Por favor selecciona un boleto para reembolsar.');
      return;
    }
    if (!refundReason.trim()) {
      Alert.alert('Motivo requerido', 'Por favor ingresa la razón de la devolución.');
      return;
    }

    setLoading(true);
    try {
      const success = await usuarioService.requestRefund(selectedTicketId, refundReason);
      if (success) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (h) {}
        Alert.alert('Solicitud enviada', 'Tu solicitud de reembolso ha sido registrada y está en proceso de revisión.');
        setSelectedTicketId('');
        setRefundReason('');
        // Reload
        fetchRefundsData();
      } else {
        Alert.alert('Error', 'No se pudo registrar la solicitud de reembolso.');
      }
    } catch (e) {
      Alert.alert('Error de red', 'La solicitud no pudo ser enviada.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPromotion = async () => {
    if (!promotionReason.trim()) {
      Alert.alert('Motivo requerido', 'Por favor explica por qué solicitas el ascenso.');
      return;
    }

    setLoading(true);
    try {
      const success = await usuarioService.requestPermissionPromotion(selectedRole, promotionReason);
      if (success) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (h) {}
        Alert.alert('Solicitud enviada', 'Tu postulación ha sido enviada al Administrador del sistema.');
        setPromotionReason('');
      } else {
        Alert.alert('Error', 'No se pudo procesar la postulación.');
      }
    } catch (e) {
      Alert.alert('Error de red', 'La solicitud no pudo ser transmitida.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.profileMeta}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch(e){}
              setIsEditModalVisible(true);
            }}
            style={styles.avatarCircle}
          >
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={10} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <View>
            <Text style={styles.profileName}>{user?.name || 'Usuario Laika'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'usuario@laikaclub.com'}</Text>
          </View>
        </View>

        {/* Tabs switcher */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'profile' && styles.tabBtnActive]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
              Ajustes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'refunds' && styles.tabBtnActive]}
            onPress={() => setActiveTab('refunds')}
          >
            <Text style={[styles.tabText, activeTab === 'refunds' && styles.tabTextActive]}>
              Devoluciones
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'security' && styles.tabBtnActive]}
            onPress={() => setActiveTab('security')}
          >
            <Text style={[styles.tabText, activeTab === 'security' && styles.tabTextActive]}>
              Seguridad
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {loading && activeTab === 'refunds' ? (
          <Loader visible={true} message="Cargando historial..." />
        ) : activeTab === 'profile' ? (
          /* SETTINGS TAB */
          <View style={styles.tabContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>Ajustes de Cuenta</Text>
              <TouchableOpacity 
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch(e){}
                  setIsEditModalVisible(true);
                }} 
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: COLORS.primary }}>Editar Perfil</Text>
              </TouchableOpacity>
            </View>
            <Card>
              <View style={styles.settingsRow}>
                <Ionicons name="person-outline" size={20} color={COLORS.primary} />
                <View style={styles.settingsMeta}>
                  <Text style={styles.settingsLabel}>Nombre de usuario</Text>
                  <Text style={styles.settingsVal}>{user?.name || 'Invitado'}</Text>
                </View>
              </View>
              <View style={styles.settingsRow}>
                <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
                <View style={styles.settingsMeta}>
                  <Text style={styles.settingsLabel}>Correo electrónico</Text>
                  <Text style={styles.settingsVal}>{user?.email || 'invitado@laikaclub.com'}</Text>
                </View>
              </View>
              <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
                <Ionicons name="key-outline" size={20} color={COLORS.primary} />
                <View style={styles.settingsMeta}>
                  <Text style={styles.settingsLabel}>Rol actual del sistema</Text>
                  <Text style={[styles.settingsVal, { textTransform: 'uppercase', color: COLORS.success }]}>
                    {user?.role || 'usuario'} (Nivel 1)
                  </Text>
                </View>
              </View>
            </Card>

            <Button
              title="Cerrar Sesión"
              variant="danger"
              onPress={handleLogout}
              icon={<Ionicons name="log-out-outline" size={18} color="#FFFFFF" />}
              style={styles.logoutBtn}
            />
          </View>
        ) : activeTab === 'refunds' ? (
          /* REFUNDS TAB */
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Solicitar Reembolso</Text>
            <Card>
              <Text style={styles.inputLabel}>Seleccionar Boleto Vigente</Text>
              <View style={styles.pickerContainer}>
                {tickets.length === 0 ? (
                  <Text style={styles.pickerPlaceholder}>No tienes boletos reembolsables</Text>
                ) : (
                  tickets.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.pickerItem,
                        selectedTicketId === t.id && styles.pickerItemActive,
                      ]}
                      onPress={() => setSelectedTicketId(t.id)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedTicketId === t.id && styles.pickerItemTextActive,
                        ]}
                      >
                        {t.event_title} ({t.seat_label})
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>Motivo de la Devolución</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={3}
                placeholder="Explica detalladamente el motivo por el cual solicitas el reembolso..."
                placeholderTextColor={COLORS.dark.textMuted}
                value={refundReason}
                onChangeText={setRefundReason}
              />

              <Button
                title="Enviar Solicitud"
                disabled={tickets.length === 0}
                onPress={handleRequestRefund}
                style={{ marginTop: SPACING.md }}
              />
            </Card>

            {/* Refund History */}
            <Text style={[styles.sectionTitle, { marginTop: SPACING.md }]}>
              Historial de Solicitudes ({refunds.length})
            </Text>
            {refunds.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>No tienes reembolsos solicitados.</Text>
              </Card>
            ) : (
              refunds.map((ref) => (
                <Card key={ref.id} style={styles.refundHistoryCard}>
                  <View style={styles.refundHistoryHeader}>
                    <Text style={styles.refundHistoryEvent} numberOfLines={1}>{ref.event_title}</Text>
                    <Text style={[
                      styles.refundStatus,
                      ref.status === 'approved' ? styles.statusApproved :
                      ref.status === 'rejected' ? styles.statusRejected : styles.statusPending
                    ]}>
                      {ref.status === 'approved' ? 'APROBADO' :
                       ref.status === 'rejected' ? 'RECHAZADO' : 'PENDIENTE'}
                    </Text>
                  </View>
                  <Text style={styles.refundHistoryReason}>Motivo: {ref.reason}</Text>
                  <Text style={styles.refundHistoryMeta}>Código: {ref.ticket_code} | {new Date(ref.requested_at).toLocaleDateString()}</Text>
                </Card>
              ))
            )}
          </View>
        ) : (
          /* SECURITY / PROMOTION TAB */
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Solicitar Ascenso de Permisos</Text>
            <Card style={{ gap: SPACING.md }}>
              <Text style={styles.cardDesc}>
                ¿Eres miembro del staff de puerta o coordinador técnico? Solicita una elevación de privilegios al Administrador del sistema.
              </Text>
              
              <View>
                <Text style={styles.inputLabel}>Seleccionar Rol Solicitado</Text>
                <View style={styles.rolePickerRow}>
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      selectedRole === 'operador' && styles.roleOptionActive,
                    ]}
                    onPress={() => setSelectedRole('operador')}
                  >
                    <Ionicons name="shield-outline" size={18} color={selectedRole === 'operador' ? '#FFFFFF' : COLORS.dark.textSecondary} />
                    <Text style={[styles.roleOptionText, selectedRole === 'operador' && styles.roleOptionTextActive]}>
                      Operador Staff
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      selectedRole === 'gestor' && styles.roleOptionActive,
                    ]}
                    onPress={() => setSelectedRole('gestor')}
                  >
                    <Ionicons name="calendar-outline" size={18} color={selectedRole === 'gestor' ? '#FFFFFF' : COLORS.dark.textSecondary} />
                    <Text style={[styles.roleOptionText, selectedRole === 'gestor' && styles.roleOptionTextActive]}>
                      Gestor Organizador
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text style={styles.inputLabel}>Justificación / Motivo del Cambio</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={4}
                  placeholder="Detalla tu clave de empleado, recinto asignado o justificación..."
                  placeholderTextColor={COLORS.dark.textMuted}
                  value={promotionReason}
                  onChangeText={setPromotionReason}
                />
              </View>

              <Button
                title="Enviar Postulación"
                onPress={handleRequestPromotion}
              />
            </Card>
          </View>
        )}
      </ScrollView>
      <EditProfileModal visible={isEditModalVisible} onClose={() => setIsEditModalVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070a13',
  },
  header: {
    backgroundColor: '#0b0f19',
    borderBottomWidth: 1,
    borderColor: '#151c2c',
    paddingTop: 45,
  },
  profileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  avatarCircle: {
    backgroundColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  avatarEditBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    backgroundColor: COLORS.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#070a13',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.fontSizes.md + 2,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  profileName: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
  },
  profileEmail: {
    fontSize: 10,
    color: COLORS.dark.textSecondary,
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#151c2c',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.dark.textSecondary,
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  scrollContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  tabContent: {
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textSecondary,
    textTransform: 'uppercase',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderColor: '#151c2c',
    gap: SPACING.md,
  },
  settingsMeta: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 9,
    color: COLORS.dark.textMuted,
  },
  settingsVal: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
    marginTop: 2,
  },
  logoutBtn: {
    marginTop: SPACING.sm,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textSecondary,
    marginBottom: SPACING.xs,
  },
  pickerContainer: {
    gap: SPACING.xs,
  },
  pickerPlaceholder: {
    fontSize: 10,
    color: COLORS.dark.textMuted,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
  },
  pickerItem: {
    backgroundColor: '#151c2c',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  pickerItemActive: {
    backgroundColor: `${COLORS.primary}20`,
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  pickerItemText: {
    fontSize: 10,
    color: COLORS.dark.textSecondary,
  },
  pickerItemTextActive: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  textArea: {
    backgroundColor: '#151c2c',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    color: '#FFFFFF',
    fontSize: 11,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  emptyCard: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 10,
    color: COLORS.dark.textMuted,
  },
  refundHistoryCard: {
    marginBottom: SPACING.xs,
  },
  refundHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refundHistoryEvent: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
    flex: 1,
  },
  refundStatus: {
    fontSize: 8,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusApproved: {
    backgroundColor: `${COLORS.success}20`,
    color: COLORS.success,
  },
  statusRejected: {
    backgroundColor: `${COLORS.error}20`,
    color: COLORS.error,
  },
  statusPending: {
    backgroundColor: '#3b82f620',
    color: '#3b82f6',
  },
  refundHistoryReason: {
    fontSize: 10,
    color: COLORS.dark.textSecondary,
    marginTop: 4,
  },
  refundHistoryMeta: {
    fontSize: 8,
    color: COLORS.dark.textMuted,
    marginTop: 2,
  },
  cardDesc: {
    fontSize: 10,
    color: COLORS.dark.textSecondary,
    lineHeight: 14,
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#151c2c',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
  },
  roleOptionActive: {
    backgroundColor: COLORS.primary,
  },
  roleOptionText: {
    fontSize: 10,
    color: COLORS.dark.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  roleOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
});

export default UserProfileScreen;
