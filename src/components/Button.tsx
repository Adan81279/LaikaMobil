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
import { SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

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
  const { colors } = useTheme();

  const getButtonStyles = (): ViewStyle[] => {
    const stylesList: ViewStyle[] = [styles.button];

    // Variant style
    const variantStyles: Record<ButtonVariant, ViewStyle> = {
      primary: {
        backgroundColor: colors.primary,
      },
      secondary: {
        backgroundColor: colors.surfaceAlt,
        borderColor: colors.border,
        borderWidth: 1,
      },
      success: {
        backgroundColor: colors.success,
      },
      danger: {
        backgroundColor: colors.error,
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: colors.primary,
        borderWidth: 1.5,
      },
      ghost: {
        backgroundColor: 'transparent',
      },
    };

    stylesList.push(variantStyles[variant]);

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
      stylesList.push({ color: colors.primary });
    } else if (variant === 'ghost') {
      stylesList.push({ color: colors.primary });
    } else if (variant === 'secondary') {
      stylesList.push({ color: colors.textPrimary });
    } else {
      stylesList.push({ color: colors.background }); // Inverted color for contrast
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
    if (variant === 'outline' || variant === 'ghost') return colors.primary;
    if (variant === 'secondary') return colors.textPrimary;
    return colors.background;
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
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    textAlign: 'center',
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
