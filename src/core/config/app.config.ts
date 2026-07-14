import { Platform } from 'react-native';

// Helper to determine the local machine's IP for emulators or physical devices.
// In React Native, 'localhost' points to the device/simulator itself, so:
// - Android Emulator uses 10.0.2.2 to access the host machine's localhost.
// - iOS Simulator can use localhost or 127.0.0.1.
// - Physical devices need the computer's local network IP.
const getLocalBackendUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
};

export const APP_CONFIG = {
  // Network Config
  API_BASE_URL: getLocalBackendUrl(),
  API_TIMEOUT_MS: 2000,
  
  // Cache durations (e.g. 60s for public events catalogue)
  CACHE_DURATIONS: {
    PUBLIC_EVENTS: 60000, // 60 seconds
  },

  // Feature Flags
  FEATURES: {
    ENABLE_ADMIN_GESTOR_ROLES: false, // Set to true to re-enable Admin and Gestor roles
  },

  // Storage Keys for AsyncStorage
  STORAGE_KEYS: {
    TOKEN: '@laika_auth_token',
    USER: '@laika_auth_user',
    SESSION_TOKEN: '@laika_session_token',
    LAST_ACTIVITY: '@laika_last_activity',
    APP_THEME: '@laika_app_theme',
  },

  // Session Management
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes in milliseconds

  // EmailJS Configuration (via Expo environment variables or fallbacks)
  EMAILJS: {
    SERVICE_ID: (process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID || 'service_o31g0l2').trim(),
    PUBLIC_KEY: (process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY || 'N2XvWn8j_zG9fN8mH').trim(),
    TEMPLATES: {
      TICKET_PURCHASE: (process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_TICKET || 'template_tickets').trim(),
      MERCH_PURCHASE: (process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_MERCH || 'template_merch').trim(),
      EVENT_ALERT: (process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_EVENT || 'template_event').trim(),
      PASSWORD_CHANGE: (process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_PASSWORD || 'template_password').trim(),
      COUPON_REWARD: (process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_COUPON || 'template_coupon').trim(),
    },
  },
};

export default APP_CONFIG;
