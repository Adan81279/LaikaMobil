import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../styles/theme';
import adminService, { AdminUserItem } from '../services/admin.service';
import { UserRole, ROLES } from '../../../core/config/roles.config';
import Card from '../../../components/Card';
import Loader from '../../../components/Loader';
import Button from '../../../components/Button';

export const AdminUsersScreen = () => {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUserItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Selected user for management modal
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Form updates
  const [selectedRole, setSelectedRole] = useState<UserRole>('usuario');
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = async () => {
    try {
      const data = await adminService.getUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'No se pudieron recuperar los usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = search.toLowerCase();
      const filtered = users.filter(
        u =>
          u.email.toLowerCase().includes(query) ||
          (u.name && u.name.toLowerCase().includes(query))
      );
      setFilteredUsers(filtered);
    }
  }, [search, users]);

  const handleOpenUserModal = (user: AdminUserItem) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setNewPassword('');
    setModalVisible(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await adminService.changeUserRole(selectedUser.id, selectedRole);
      Alert.alert('Éxito', `Rol del usuario actualizado a ${ROLES[selectedRole].name}`);
      // Update local state
      setUsers(prev =>
        prev.map(u => (u.id === selectedUser.id ? { ...u, role: selectedRole } : u))
      );
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar el rol.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!selectedUser) return;
    const shouldBlock = !selectedUser.is_locked;
    const actionText = shouldBlock ? 'bloquear' : 'desbloquear';
    
    Alert.alert(
      'Confirmar Acción',
      `¿Está seguro de que desea ${actionText} a este usuario?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: shouldBlock ? 'Bloquear' : 'Desbloquear',
          style: shouldBlock ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoading(true);
            try {
              await adminService.toggleUserBlock(selectedUser.id, shouldBlock);
              Alert.alert('Éxito', `Usuario ${shouldBlock ? 'bloqueado' : 'desbloqueado'} con éxito.`);
              // Update local state
              setUsers(prev =>
                prev.map(u => (u.id === selectedUser.id ? { ...u, is_locked: shouldBlock, lockout_until: shouldBlock ? 'Locked' : null } : u))
              );
              setModalVisible(false);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Operación fallida.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleForcePassword = async () => {
    if (!selectedUser) return;
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setActionLoading(true);
    try {
      await adminService.forcePasswordChange(selectedUser.id, newPassword);
      Alert.alert('Éxito', 'Contraseña restablecida con éxito.');
      setNewPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return { bg: `${COLORS.primary}20`, text: COLORS.primary };
      case 'gestor':
        return { bg: `${COLORS.secondary}20`, text: COLORS.secondary };
      case 'operador':
        return { bg: `${COLORS.success}20`, text: COLORS.success };
      default:
        return { bg: `${COLORS.dark.border}`, text: COLORS.dark.textSecondary };
    }
  };

  const renderUserCard = ({ item }: { item: AdminUserItem }) => {
    const badge = getRoleBadgeStyle(item.role);
    const isSelf = item.id === currentAdmin?.id;

    return (
      <Card style={styles.userCard} onPress={() => !isSelf && handleOpenUserModal(item)}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name || 'Sin Nombre'}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.roleText, { color: badge.text }]}>
              {ROLES[item.role].name}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>Registrado: {new Date(item.created_at).toLocaleDateString()}</Text>
          {item.is_locked ? (
            <View style={styles.lockRow}>
              <Ionicons name="lock-closed" size={14} color={COLORS.error} />
              <Text style={styles.lockText}>Bloqueado</Text>
            </View>
          ) : (
            <View style={styles.lockRow}>
              <Ionicons name="lock-open-outline" size={14} color={COLORS.success} />
              <Text style={[styles.lockText, { color: COLORS.success }]}>Activo</Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Loader visible={loading} message="Cargando usuarios..." />

      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Usuarios</Text>
        <Text style={styles.subtitle}>Supervisa cuentas, cambia roles y desbloquea perfiles.</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={COLORS.dark.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o correo..."
          placeholderTextColor={COLORS.dark.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={item => item.id.toString()}
        renderItem={renderUserCard}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={COLORS.dark.textMuted} />
              <Text style={styles.emptyText}>No se encontraron usuarios</Text>
            </View>
          ) : null
        }
      />

      {/* Action Modal */}
      {selectedUser && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{selectedUser.name}</Text>
                  <Text style={styles.modalSubtitle}>{selectedUser.email}</Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color={COLORS.dark.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Loader inside modal */}
              {actionLoading && (
                <View style={styles.modalLoaderContainer}>
                  <Loader visible={true} overlay={false} message="Procesando..." />
                </View>
              )}

              {!actionLoading && (
                <View style={styles.modalBody}>
                  {/* Lock/Unlock Section */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionLabel}>Estado de Cuenta</Text>
                    <View style={styles.statusRow}>
                      <Text style={styles.statusDescription}>
                        El usuario se encuentra {selectedUser.is_locked ? 'bloqueado temporal o permanentemente por exceso de intentos.' : 'activo en el sistema.'}
                      </Text>
                      <Button
                        title={selectedUser.is_locked ? 'Desbloquear' : 'Bloquear Usuario'}
                        variant={selectedUser.is_locked ? 'success' : 'danger'}
                        size="sm"
                        onPress={handleToggleBlock}
                      />
                    </View>
                  </View>

                  {/* Role Assignment */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionLabel}>Cambiar Rol del Sistema</Text>
                    <View style={styles.rolePickerRow}>
                      {(['usuario', 'operador', 'gestor', 'admin'] as UserRole[]).map(role => (
                        <TouchableOpacity
                          key={role}
                          style={[
                            styles.roleSelectButton,
                            selectedRole === role && styles.roleSelectActive,
                          ]}
                          onPress={() => setSelectedRole(role)}
                        >
                          <Text
                            style={[
                              styles.roleSelectText,
                              selectedRole === role && styles.roleSelectTextActive,
                            ]}
                          >
                            {ROLES[role].name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Button
                      title="Guardar Nuevo Rol"
                      variant="primary"
                      size="sm"
                      style={styles.saveRoleButton}
                      onPress={handleSaveRole}
                    />
                  </View>

                  {/* Reset Password */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionLabel}>Restablecer Contraseña (Fuerza Bruta/Reset)</Text>
                    <View style={styles.passwordRow}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Nueva contraseña temporal..."
                        placeholderTextColor={COLORS.dark.textMuted}
                        secureTextEntry
                        value={newPassword}
                        onChangeText={setNewPassword}
                      />
                      <Button
                        title="Restablecer"
                        variant="outline"
                        size="sm"
                        style={styles.resetButton}
                        onPress={handleForcePassword}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
    padding: SPACING.md,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dark.surface,
    borderColor: COLORS.dark.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.md,
    paddingHorizontal: SPACING.md,
    height: 48,
    marginBottom: SPACING.md,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.dark.textPrimary,
    fontSize: TYPOGRAPHY.fontSizes.md,
    height: '100%',
  },
  listContainer: {
    padding: SPACING.md,
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  userCard: {
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dark.border,
    paddingBottom: SPACING.sm,
  },
  userInfo: {
    flex: 0.7,
  },
  userName: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
  },
  userEmail: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.dark.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  roleText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.dark.textMuted,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.error,
    marginLeft: 4,
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
  modalSubtitle: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.dark.textSecondary,
    marginTop: 2,
  },
  modalLoaderContainer: {
    paddingVertical: SPACING.xxl,
  },
  modalBody: {
    gap: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  modalSection: {
    gap: SPACING.sm,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'column',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.dark.background}80`,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
  },
  statusDescription: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.dark.textSecondary,
    lineHeight: 18,
  },
  rolePickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  roleSelectButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.dark.background,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleSelectActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  roleSelectText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.dark.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  roleSelectTextActive: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  saveRoleButton: {
    marginTop: SPACING.xs,
  },
  passwordRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.dark.background,
    paddingHorizontal: SPACING.md,
    color: COLORS.dark.textPrimary,
    fontSize: TYPOGRAPHY.fontSizes.sm,
  },
  resetButton: {
    height: 44,
  },
});

export default AdminUsersScreen;
