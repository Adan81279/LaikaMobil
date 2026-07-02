export const COLORS = {
  // Brand Colors (General Monochromatic Fallbacks)
  primary: '#000000',     // Monochromatic Deep
  primaryDark: '#1A1A1A',
  primaryLight: '#262626',
  secondary: '#000000',
  accent: '#737373',

  // Semantic Status (Kept clear for functional usability, styled minimally)
  success: '#000000',     // High contrast active/success (Black)
  warning: '#737373',
  error: '#FF0000',       // Keep red for critical errors
  info: '#000000',

  // Monochromatic Dark Theme Palette (Pure Black & White)
  dark: {
    background: '#000000',      // Pure Black
    surface: '#0F0F0F',         // Sleek Monochromatic Card
    surfaceAlt: '#1A1A1A',      // Interactive Slate
    border: '#262626',          // Dark Border
    textPrimary: '#FFFFFF',     // Pure White
    textSecondary: '#A3A3A3',   // Muted White
    textMuted: '#525252',       // Gray Muted
    shadow: 'rgba(0, 0, 0, 0.6)',
    primary: '#FFFFFF',
    primaryDark: '#E5E5E5',
    primaryLight: '#F5F5F5',
    secondary: '#FFFFFF',
    accent: '#A3A3A3',
    success: '#FFFFFF',
    warning: '#A3A3A3',
    error: '#FF3B30',
    info: '#FFFFFF',
  },

  // Monochromatic Light Theme Palette (Pure White & Black)
  light: {
    background: '#FFFFFF',      // Pure White
    surface: '#F5F5F5',         // Light Card
    surfaceAlt: '#E5E5E5',      // Interactive Light Grey
    border: '#D4D4D4',          // Soft Light Border
    textPrimary: '#000000',     // Pure Black
    textSecondary: '#525252',   // Muted Black
    textMuted: '#A3A3A3',       // Light Muted Grey
    shadow: 'rgba(0, 0, 0, 0.05)',
    primary: '#000000',
    primaryDark: '#1A1A1A',
    primaryLight: '#262626',
    secondary: '#000000',
    accent: '#525252',
    success: '#000000',
    warning: '#525252',
    error: '#FF3B30',
    info: '#000000',
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
