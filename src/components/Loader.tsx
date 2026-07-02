import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Modal, ViewStyle, TextStyle } from 'react-native';
import { SPACING, TYPOGRAPHY } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

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
  const { colors } = useTheme();

  if (!visible) return null;

  const dynamicBoxStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  };

  const dynamicMessageStyle: TextStyle = {
    color: colors.textPrimary,
  };

  const content = (
    <View style={overlay ? styles.overlayContainer : styles.inlineContainer}>
      <View style={[styles.box, dynamicBoxStyle]}>
        <ActivityIndicator size="large" color={colors.primary} />
        {message && <Text style={[styles.message, dynamicMessageStyle]}>{message}</Text>}
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineContainer: {
    padding: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
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
  },
});

export default Loader;
