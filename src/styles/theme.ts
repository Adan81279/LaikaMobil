export const COLORS = {
  // Brand Colors
  primary: '#8B5CF6',     // Vibrant Violet
  primaryDark: '#7C3AED',
  primaryLight: '#A78BFA',
  secondary: '#EC4899',   // Electric Pink
  accent: '#3B82F6',      // Blue Spark

  // Semantic Status
  success: '#10B981',     // Emerald Green
  warning: '#F59E0B',     // Amber
  error: '#EF4444',       // Coral Red
  info: '#06B6D4',        // Cyan

  // Dark Theme Palette (Default for Premium Vibe)
  dark: {
    background: '#0B0F19',      // Deep Space Blue
    surface: '#161F30',         // Sleek Card Background
    surfaceAlt: '#1F2A40',      // Header/Interactive Surface
    border: '#2A364F',          // Subtle Border
    textPrimary: '#F8FAFC',     // Pure White/Slate 50
    textSecondary: '#94A3B8',   // Cool Grey/Slate 400
    textMuted: '#64748B',       // Slate 500
    shadow: 'rgba(0, 0, 0, 0.4)',
  },

  // Light Theme Palette
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F5F9',
    border: '#E2E8F0',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    shadow: 'rgba(15, 23, 42, 0.08)',
  }
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
};

export const TYPOGRAPHY = {
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '900' as const,
  },
};

export default {
  colors: COLORS,
  spacing: SPACING,
  borderRadius: BORDER_RADIUS,
  shadows: SHADOWS,
  typography: TYPOGRAPHY,
};
