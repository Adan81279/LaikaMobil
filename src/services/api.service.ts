import AsyncStorage from '@react-native-async-storage/async-storage';
import APP_CONFIG from '../core/config/app.config';

export interface RequestOptions extends RequestInit {
  timeout?: number;
  params?: Record<string, string | number | boolean>;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiService {
  private baseUrl: string;
  private isOfflineMode = false;
  private lastNetworkCheckTime = 0;

  constructor() {
    this.baseUrl = APP_CONFIG.API_BASE_URL;
  }

  /**
   * Updates the base URL dynamically (e.g. if the user configures a custom backend IP)
   */
  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Main request runner
   */
  async request(endpoint: string, options: RequestOptions = {}): Promise<any> {
    const { timeout = APP_CONFIG.API_TIMEOUT_MS, params, headers, ...restOptions } = options;

    // Circuit Breaker: if server is offline, bypass real request to prevent 2-second timeout lag
    const now = Date.now();
    if (this.isOfflineMode && now - this.lastNetworkCheckTime < 30000) {
      console.warn(`[Circuit Breaker] Server is offline. Bypassing request to: ${endpoint}`);
      throw new ApiError('Network request failed (offline mode)', 503);
    }

    // 1. Build Query Parameters if present
    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }

    // 2. Fetch Auth Token and build headers
    const token = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN);
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const mergedHeaders = {
      ...defaultHeaders,
      ...headers,
    };

    // 3. Setup timeout mechanism
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    // Update session activity timestamp
    if (token) {
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.LAST_ACTIVITY, String(Date.now()));
    }

    try {
      const response = await fetch(url, {
        ...restOptions,
        headers: mergedHeaders,
        signal: controller.signal,
      });

      clearTimeout(id);

      // Reset circuit breaker on successful connection
      this.isOfflineMode = false;

      // Parse JSON if possible, otherwise get text
      let responseData: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        throw new ApiError(
          responseData?.detail || responseData?.message || `HTTP error ${response.status}`,
          response.status,
          responseData
        );
      }

      return responseData;
    } catch (error: any) {
      clearTimeout(id);

      // Trip circuit breaker on timeout or network connection loss
      if (
        error.name === 'AbortError' ||
        error.message?.includes('failed') ||
        error.message?.includes('Network') ||
        error.message?.includes('connection')
      ) {
        this.isOfflineMode = true;
        this.lastNetworkCheckTime = Date.now();
      }

      if (error.name === 'AbortError') {
        throw new ApiError('Request timed out', 408);
      }
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(error.message || 'Network request failed', 500);
    }
  }

  // HTTP Verb helpers
  async get(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<any> {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint: string, body?: any, options: Omit<RequestOptions, 'method'> = {}): Promise<any> {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put(endpoint: string, body?: any, options: Omit<RequestOptions, 'method'> = {}): Promise<any> {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch(endpoint: string, body?: any, options: Omit<RequestOptions, 'method'> = {}): Promise<any> {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<any> {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiService();
export default api;
