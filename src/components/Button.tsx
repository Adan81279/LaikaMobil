import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../styles/theme';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  style,
  textStyle,
  disabled,
  ...props
}) => {
  const getButtonStyles = (): ViewStyle[] => {
    const stylesList: ViewStyle[] = [styles.button];

    // Variant style
    switch (variant) {
      case 'primary':
        stylesList.push(styles.primary);
        break;
      case 'secondary':
        stylesList.push(styles.secondary);
        break;
      case 'success':
        stylesList.push(styles.success);
        break;
      case 'danger':
        stylesList.push(styles.danger);
        break;
      case 'outline':
        stylesList.push(styles.outline);
        break;
      case 'ghost':
        stylesList.push(styles.ghost);
        break;
    }

    // Size style
    switch (size) {
      case 'sm':
        stylesList.push(styles.sm);
        break;
      case 'md':
        stylesList.push(styles.md);
        break;
      case 'lg':
        stylesList.push(styles.lg);
        break;
    }

    if (disabled || loading) {
      stylesList.push(styles.disabled);
    }

    return stylesList;
  };

  const getTextStyles = (): TextStyle[] => {
    const stylesList: TextStyle[] = [styles.text];

    // Variant text color
    if (variant === 'outline') {
      stylesList.push(styles.textOutline);
    } else if (variant === 'ghost') {
      stylesList.push(styles.textGhost);
    } else {
      stylesList.push(styles.textWhite);
    }

    // Size text
    switch (size) {
      case 'sm':
        stylesList.push(styles.textSm);
        break;
      case 'md':
        stylesList.push(styles.textMd);
        break;
      case 'lg':
        stylesList.push(styles.textLg);
        break;
    }

    return stylesList;
  };

  const getLoaderColor = () => {
    if (variant === 'outline') return COLORS.primary;
    if (variant === 'ghost') return COLORS.primary;
    return '#FFFFFF';
  };

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getLoaderColor()} />
      ) : (
        <>
          {icon && <React.Fragment>{icon}</React.Fragment>}
          <Text style={[getTextStyles(), textStyle, icon ? { marginLeft: SPACING.sm } : {}]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  // Variants
  primary: {
    backgroundColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: COLORS.secondary,
  },
  success: {
    backgroundColor: COLORS.success,
  },
  danger: {
    backgroundColor: COLORS.error,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: COLORS.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  // Sizes
  sm: {
    paddingVertical: SPACING.xs * 1.5,
    paddingHorizontal: SPACING.md,
  },
  md: {
    paddingVertical: SPACING.sm * 1.5,
    paddingHorizontal: SPACING.lg,
  },
  lg: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  // Text Styles
  text: {
    fontFamily: undefined, // default
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    textAlign: 'center',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textOutline: {
    color: COLORS.primary,
  },
  textGhost: {
    color: COLORS.primary,
  },
  textSm: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
  },
  textMd: {
    fontSize: TYPOGRAPHY.fontSizes.md,
  },
  textLg: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
  },
});

export default Button;
