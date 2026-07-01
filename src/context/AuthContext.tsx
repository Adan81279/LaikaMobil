import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import APP_CONFIG from '../core/config/app.config';
import { UserRole, canAccess, hasPermission } from '../core/config/roles.config';
import { UserProfile, authService } from '../services/auth.service';

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  savedCard: any | null;
  saveCardDetails: (cardDetails: any) => Promise<void>;
  clearSavedCard: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  loginMock: (role: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
  checkPermission: (module: string, action: string) => boolean;
  hasRole: (minRole: UserRole) => boolean;
  updateBaseUrl: (url: string) => Promise<void>;
  updateProfile: (name: string, email: string, avatar?: string, password?: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savedCard, setSavedCard] = useState<any | null>(null);

  // Load user-specific card details dynamically
  useEffect(() => {
    const loadSavedCard = async () => {
      if (user) {
        try {
          const cardData = await AsyncStorage.getItem(`@laika_saved_card_${user.email}`);
          if (cardData) {
            setSavedCard(JSON.parse(cardData));
          } else {
            setSavedCard(null);
          }
        } catch (e) {
          console.error('Error loading saved card:', e);
        }
      } else {
        setSavedCard(null);
      }
    };
    loadSavedCard();
  }, [user]);

  const saveCardDetails = async (cardDetails: any) => {
    if (user) {
      try {
        await AsyncStorage.setItem(`@laika_saved_card_${user.email}`, JSON.stringify(cardDetails));
        setSavedCard(cardDetails);
      } catch (e) {
        console.error('Error saving card:', e);
      }
    }
  };

  const clearSavedCard = async () => {
    if (user) {
      try {
        await AsyncStorage.removeItem(`@laika_saved_card_${user.email}`);
        setSavedCard(null);
      } catch (e) {
        console.error('Error clearing saved card:', e);
      }
    }
  };

  // Initialize and check stored session
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN);
        const storedUser = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER);
        const lastActivity = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);

        if (storedToken && storedUser && lastActivity) {
          // Check for session timeout (30 minutes)
          const timeElapsed = Date.now() - parseInt(lastActivity, 10);
          if (timeElapsed > APP_CONFIG.SESSION_TIMEOUT_MS) {
            // Session expired
            await handleLogout();
          } else {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            // Update last activity
            await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.LAST_ACTIVITY, String(Date.now()));
          }
        }
      } catch (error) {
        console.error('Error restoring auth session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Periodic inactivity check
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(async () => {
      const lastActivity = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);
      if (lastActivity) {
        const timeElapsed = Date.now() - parseInt(lastActivity, 10);
        if (timeElapsed > APP_CONFIG.SESSION_TIMEOUT_MS) {
          await handleLogout();
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [token]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem(APP_CONFIG.STORAGE_KEYS.TOKEN);
      await AsyncStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER);
      await AsyncStorage.removeItem(APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN);
      await AsyncStorage.removeItem(APP_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await authService.login(email, password);
      
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.TOKEN, response.access_token);
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER, JSON.stringify(response.user));
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.LAST_ACTIVITY, String(Date.now()));

      setToken(response.access_token);
      setUser(response.user);
      return true;
    } catch (error) {
      await handleLogout();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Log in with a mock role (very useful for offline/testing/demoing).
   */
  const loginMock = async (role: UserRole): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = authService.mockLogin(role);
      
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.TOKEN, response.access_token);
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER, JSON.stringify(response.user));
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.LAST_ACTIVITY, String(Date.now()));

      setToken(response.access_token);
      setUser(response.user);
      return true;
    } catch (error) {
      await handleLogout();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(async () => {
    await handleLogout();
  }, []);

  const checkPermission = useCallback((module: string, action: string): boolean => {
    if (!user) return false;
    return hasPermission(user.role, module, action);
  }, [user]);

  const hasRole = useCallback((minRole: UserRole): boolean => {
    if (!user) return false;
    return canAccess(user.role, minRole);
  }, [user]);

  const updateBaseUrl = async (url: string) => {
    // Dynamic IP update for backend testing
    // Let's implement changing base URL inside app configs and AsyncStorage
    await AsyncStorage.setItem('custom_backend_url', url);
  };

  const updateProfile = useCallback(async (name: string, email: string, avatar?: string, password?: string): Promise<boolean> => {
    try {
      if (!user) return false;
      const updatedUser = { ...user, name, email };
      if (avatar) {
        updatedUser.avatar = avatar;
      }
      setUser(updatedUser);
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      if (password) {
        await AsyncStorage.setItem('@laika_user_password_hash', password);
      }
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        savedCard,
        saveCardDetails,
        clearSavedCard,
        login,
        loginMock,
        logout,
        checkPermission,
        hasRole,
        updateBaseUrl,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
