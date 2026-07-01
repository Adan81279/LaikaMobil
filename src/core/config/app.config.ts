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
};

export default APP_CONFIG;
