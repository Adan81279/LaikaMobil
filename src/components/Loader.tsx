import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Modal } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../styles/theme';

interface LoaderProps {
  visible: boolean;
  message?: string;
  overlay?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({
  visible,
  message = 'Cargando...',
  overlay = true,
}) => {
  if (!visible) return null;

  const content = (
    <View style={overlay ? styles.overlayContainer : styles.inlineContainer}>
      <View style={styles.box}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    </View>
  );

  if (overlay) {
    return (
      <Modal transparent visible={visible} animationType="fade">
        {content}
      </Modal>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(11, 15, 25, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineContainer: {
    padding: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: COLORS.dark.surface,
    borderColor: COLORS.dark.border,
    borderWidth: 1,
    padding: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 150,
  },
  message: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.dark.textPrimary,
  },
});
export default Loader;
