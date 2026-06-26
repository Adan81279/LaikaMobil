import api from './api.service';
import { UserRole } from '../core/config/roles.config';

export interface UserProfile {
  id: number;
  email: string;
  role: UserRole;
  name?: string;
  avatar?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export const authService = {
  /**
   * Log in user with email and password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    // In many FastAPI systems, login uses OAuth2 password flow (FormData),
    // but the manual lists: POST /api/auth/login (email, password) as a standard JSON request.
    // If it's form data, we can adjust. Let's send it as standard JSON first.
    return api.post('/api/auth/login', { email, password });
  },

  /**
   * Get current authenticated user details
   */
  async getMe(): Promise<UserProfile> {
    return api.get('/api/auth/users/me');
  },

  /**
   * Register a new user
   */
  async register(email: string, name: string, password: string): Promise<any> {
    return api.post('/api/auth/register', { email, name, password });
  },
  
  /**
   * Mock login for development and fallback when backend is disconnected
   */
  mockLogin(role: UserRole): LoginResponse {
    const roleNames: Record<UserRole, string> = {
      admin: 'Adán Administrador',
      gestor: 'Jimena Gestor de Eventos',
      operador: 'Carlos Operador Staff',
      usuario: 'Lucia Usuario Final',
    };
    return {
      access_token: `mock_jwt_token_${role}_${Date.now()}`,
      token_type: 'bearer',
      user: {
        id: Math.floor(Math.random() * 100) + 1,
        email: `${role}@laikaclub.com`,
        role: role,
        name: roleNames[role],
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      }
    };
  }
};

export default authService;
