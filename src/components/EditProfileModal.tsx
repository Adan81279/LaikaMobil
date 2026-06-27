import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import Input from './Input';
import Button from './Button';
import * as Haptics from 'expo-haptics';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150',
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ visible, onClose }) => {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  useEffect(() => {
    if (visible && user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setSelectedAvatar(user.avatar || '');
      setPassword('');
      setConfirmPassword('');
      setNameError('');
      setEmailError('');
      setPasswordError('');
      setConfirmPasswordError('');
    }
  }, [visible, user]);

  const handleSave = async () => {
    let valid = true;
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');

    if (!name.trim()) {
      setNameError('El nombre es requerido');
      valid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('El correo es requerido');
      valid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError('El formato del correo es inválido');
      valid = false;
    }

    // Password validation if they filled any password fields
    if (password || confirmPassword) {
      if (password.length < 6) {
        setPasswordError('La contraseña debe tener al menos 6 caracteres');
        valid = false;
      }
      if (password !== confirmPassword) {
        setConfirmPasswordError('Las contraseñas no coinciden');
        valid = false;
      }
    }

    if (!valid) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    setLoading(true);
    const success = await updateProfile(
      name.trim(),
      email.trim(),
      selectedAvatar.trim() || undefined,
      password ? password : undefined
    );
    setLoading(false);

    if (success) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
      Alert.alert('Perfil Actualizado', 'Tus datos de cuenta y credenciales han sido actualizados con éxito.');
      onClose();
    } else {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (e) {}
      Alert.alert('Error', 'No se pudo guardar la información del perfil.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Datos Personales</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={COLORS.dark.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalBodyScroll} 
              contentContainerStyle={styles.modalBody} 
              keyboardShouldPersistTaps="handled"
            >
              {/* Photo presets selector */}
              <Text style={styles.sectionLabel}>Seleccionar Foto de Perfil</Text>
              <View style={styles.avatarPresetsContainer}>
                {AVATAR_PRESETS.map((url, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    style={[
                      styles.avatarPresetWrapper,
                      selectedAvatar === url && styles.avatarPresetWrapperActive,
                    ]}
                    onPress={() => setSelectedAvatar(url)}
                  >
                    <Image source={{ uri: url }} style={styles.avatarPresetImg} />
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="URL de Foto Personalizada (Opcional)"
                value={selectedAvatar}
                onChangeText={setSelectedAvatar}
                placeholder="https://ejemplo.com/mi_foto.jpg"
                leftIcon="image-outline"
              />

              <Input
                label="Nombre Completo"
                value={name}
                onChangeText={setName}
                placeholder="Ingresa tu nombre completo"
                leftIcon="person-outline"
                error={nameError}
              />

              <Input
                label="Correo Electrónico"
                value={email}
                onChangeText={setEmail}
                placeholder="Ingresa tu correo electrónico"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="mail-outline"
                error={emailError}
              />

              <Text style={[styles.sectionLabel, { marginTop: SPACING.md }]}>Cambiar Contraseña (Opcional)</Text>
              
              <Input
                label="Nueva Contraseña"
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 6 caracteres"
                leftIcon="lock-closed-outline"
                isPassword={true}
                error={passwordError}
              />

              <Input
                label="Confirmar Contraseña"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repite la nueva contraseña"
                leftIcon="lock-closed-outline"
                isPassword={true}
                error={confirmPasswordError}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Cancelar"
                variant="secondary"
                onPress={onClose}
                style={styles.footerBtn}
                disabled={loading}
              />
              <Button
                title="Guardar"
                variant="primary"
                onPress={handleSave}
                style={styles.footerBtn}
                loading={loading}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  keyboardContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0b0f19',
    borderColor: '#151c2c',
    borderWidth: 1.5,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#151c2c',
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  modalBodyScroll: {
    maxHeight: 400,
  },
  modalBody: {
    padding: SPACING.md,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.dark.textSecondary,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
  },
  avatarPresetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    justifyContent: 'space-between',
  },
  avatarPresetWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  avatarPresetWrapperActive: {
    borderColor: COLORS.primary,
  },
  avatarPresetImg: {
    width: '100%',
    height: '100%',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#151c2c',
    backgroundColor: '#070a13',
  },
  footerBtn: {
    flex: 1,
  },
});

export default EditProfileModal;
