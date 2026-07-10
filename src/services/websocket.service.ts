import AsyncStorage from '@react-native-async-storage/async-storage';

export type WSEventCallback = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private serverUrl: string = 'ws://192.168.1.100:8080'; // Default placeholder, editable in developer panel
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: any = null;
  private listeners: Map<string, Set<WSEventCallback>> = new Map();
  private messageQueue: any[] = [];
  private mockMode: boolean = true; // Enabled by default for easy local testing without running a custom WS backend

  constructor() {
    this.loadConfig();
  }

  /**
   * Load URL configuration and mock setting from storage
   */
  private async loadConfig() {
    try {
      const savedUrl = await AsyncStorage.getItem('@laika_ws_url');
      if (savedUrl) this.serverUrl = savedUrl;

      const savedMockMode = await AsyncStorage.getItem('@laika_ws_mock_mode');
      if (savedMockMode !== null) {
        this.mockMode = savedMockMode === 'true';
      }
    } catch (e) {
      console.error('Error loading WebSocket config:', e);
    }
  }

  /**
   * Set configuration at runtime
   */
  async configure(url: string, mock: boolean) {
    this.serverUrl = url;
    this.mockMode = mock;
    try {
      await AsyncStorage.setItem('@laika_ws_url', url);
      await AsyncStorage.setItem('@laika_ws_mock_mode', String(mock));
    } catch (e) {}

    // Reconnect with new settings
    this.disconnect();
    if (!this.mockMode) {
      this.connect();
    }
  }

  /**
   * Check connection status
   */
  isClientConnected(): boolean {
    return this.isConnected || this.mockMode;
  }

  /**
   * Check if running in mock simulation mode
   */
  isMockMode(): boolean {
    return this.mockMode;
  }

  /**
   * Establish WebSocket Connection
   */
  connect() {
    if (this.mockMode) {
      console.log('[WS] Running in Mock/Simulator Mode. Direct local relay active.');
      this.isConnected = true;
      this.triggerEvent('status_change', { connected: true, mode: 'mock' });
      return;
    }

    if (this.socket || this.isConnected) return;

    console.log(`[WS] Connecting to ${this.serverUrl}...`);
    try {
      this.socket = new WebSocket(this.serverUrl);

      this.socket.onopen = () => {
        console.log('[WS] Connection established successfully.');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.triggerEvent('status_change', { connected: true, mode: 'live' });
        this.processQueue();
      };

      this.socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.event) {
            console.log(`[WS] Received Event: ${parsed.event}`, parsed.data);
            this.triggerEvent(parsed.event, parsed.data);
          }
        } catch (e) {
          console.warn('[WS] Non-JSON message received:', event.data);
        }
      };

      this.socket.onerror = (error) => {
        console.warn('[WS] Socket error occurred:', error);
      };

      this.socket.onclose = (event) => {
        console.log(`[WS] Connection closed: Code=${event.code}, Reason=${event.reason}`);
        this.isConnected = false;
        this.socket = null;
        this.triggerEvent('status_change', { connected: false, mode: 'live' });
        this.handleReconnect();
      };
    } catch (err) {
      console.error('[WS] Exception during connection:', err);
      this.handleReconnect();
    }
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.triggerEvent('status_change', { connected: false, mode: this.mockMode ? 'mock' : 'live' });
  }

  /**
   * Handle auto reconnection with backoff
   */
  private handleReconnect() {
    if (this.mockMode || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WS] Maximum reconnect attempts reached or in Mock Mode. Reconnection stopped.');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
    console.log(`[WS] Reconnecting in ${delay / 1000}s (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Process queued messages once connected
   */
  private processQueue() {
    if (this.messageQueue.length === 0) return;
    console.log(`[WS] Flushing ${this.messageQueue.length} queued messages.`);
    while (this.messageQueue.length > 0 && this.isConnected) {
      const msg = this.messageQueue.shift();
      this.send(msg.event, msg.data);
    }
  }

  /**
   * Send event to WebSocket server or broadcast locally if mock mode
   */
  send(event: string, data: any) {
    const payload = { event, data, timestamp: new Date().toISOString() };

    if (this.mockMode) {
      console.log(`[WS-Mock] Local Broadcast Event: ${event}`, data);
      // In mock mode, we immediately broadcast back to ourselves/local app listeners
      // This simulates receiving a reply or synchronizing state in the same screen/session.
      setTimeout(() => {
        this.triggerEvent(event, data);
      }, 300);
      return;
    }

    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(payload));
        console.log(`[WS] Sent Event: ${event}`);
      } catch (err) {
        console.error('[WS] Failed to send payload, queueing...', err);
        this.messageQueue.push(payload);
      }
    } else {
      console.warn(`[WS] Disconnected, event queued: ${event}`);
      this.messageQueue.push(payload);
    }
  }

  /**
   * Register listener for specific event
   */
  subscribe(event: string, callback: WSEventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Auto-connect if socket is idle
    if (!this.mockMode && !this.socket) {
      this.connect();
    }

    return () => this.unsubscribe(event, callback);
  }

  /**
   * Unsubscribe listener
   */
  unsubscribe(event: string, callback: WSEventCallback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Trigger registered event callbacks
   */
  private triggerEvent(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          callback(data);
        } catch (err) {
          console.error(`[WS] Error in listener callback for event: ${event}`, err);
        }
      });
    }
  }
}

const websocketService = new WebSocketService();
export default websocketService;
