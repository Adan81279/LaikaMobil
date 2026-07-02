import api from '../../../services/api.service';

export interface TicketValidationResponse {
  valid: boolean;
  status: 'active' | 'used' | 'refunded';
  ticket_code: string;
  owner_name: string;
  owner_email?: string;
  original_owner_name?: string;
  original_owner_email?: string;
  event_title: string;
  venue_name: string;
  seat_label: string;
  date?: string;
  time?: string;
  price?: number;
  redeemed_at?: string;
}

export interface IncidentReport {
  ticket_code: string;
  type: 'duplicate' | 'damaged' | 'impersonation' | 'altercation' | 'other';
  description: string;
  reported_at: string;
}

export interface OperatorStats {
  scanned_today: number;
  valid_today: number;
  invalid_today: number;
  incidents_today: number;
  recent_scans: Array<{
    id: string;
    ticket_code: string;
    status: 'success' | 'used' | 'invalid';
    timestamp: string;
    event_title: string;
  }>;
}

export interface AttendeeSearchResult {
  ticket_code: string;
  owner_name: string;
  owner_email: string;
  event_title: string;
  venue_name: string;
  seat_label: string;
  status: 'active' | 'used' | 'refunded';
  redeemed_at?: string;
}

class OperadorService {
  // Local list to persist scanned ticket state in-memory during mock mode
  private mockScannedTickets: Record<string, { status: 'active' | 'used', redeemed_at?: string }> = {
    'TKT-VALID-123': { status: 'active' },
    'TKT-USED-456': { status: 'used', redeemed_at: new Date(Date.now() - 3600000).toISOString() },
  };

  private mockIncidents: IncidentReport[] = [];
  private mockStats: OperatorStats = {
    scanned_today: 12,
    valid_today: 10,
    invalid_today: 2,
    incidents_today: 1,
    recent_scans: [
      { id: '1', ticket_code: 'TKT-VALID-100', status: 'success', timestamp: new Date(Date.now() - 60000).toISOString(), event_title: 'Slayer Live Arena' },
      { id: '2', ticket_code: 'TKT-USED-456', status: 'used', timestamp: new Date(Date.now() - 300000).toISOString(), event_title: 'Bad Bunny Concert' },
      { id: '3', ticket_code: 'TKT-VALID-099', status: 'success', timestamp: new Date(Date.now() - 600000).toISOString(), event_title: 'Slayer Live Arena' },
    ],
  };

  private mockAttendees: AttendeeSearchResult[] = [
    {
      ticket_code: 'TKT-VALID-905171',
      owner_name: 'Adán Rodríguez',
      owner_email: 'cliente@laikaclub.com',
      event_title: 'Metallica - M72 World Tour',
      venue_name: 'Arena Ciudad de México',
      seat_label: 'A-1 (VIP)',
      status: 'active'
    },
    {
      ticket_code: 'TKT-VALID-123',
      owner_name: 'Juan Pérez',
      owner_email: 'juan.perez@example.com',
      event_title: 'Luis Miguel Tour 2026',
      venue_name: 'Estadio Arena Monterrey',
      seat_label: 'Planta Baja - B4',
      status: 'active'
    },
    {
      ticket_code: 'TKT-USED-456',
      owner_name: 'Jimena Díaz',
      owner_email: 'jimena.diaz@example.com',
      event_title: 'Bad Bunny Tour Coahuila',
      venue_name: 'Coliseo Centenario',
      seat_label: 'Balcón General - G12',
      status: 'used',
      redeemed_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      ticket_code: 'TKT-OK-789',
      owner_name: 'Carlos Mendoza',
      owner_email: 'carlos.mendoza@example.com',
      event_title: 'Daft Punk Reunion Show',
      venue_name: 'Foro Sol',
      seat_label: 'General A',
      status: 'active'
    },
    {
      ticket_code: 'TKT-OK-010',
      owner_name: 'María Rodríguez',
      owner_email: 'maria.rod@example.com',
      event_title: 'Coldplay Spheres Tour',
      venue_name: 'Estadio BBVA',
      seat_label: 'VIP Oro - V2',
      status: 'active'
    },
    {
      ticket_code: 'TKT-OK-011',
      owner_name: 'Sofía Castro',
      owner_email: 'sofia.castro@example.com',
      event_title: 'Steve Aoki ElectroFest',
      venue_name: 'Club Laika',
      seat_label: 'Zona VIP',
      status: 'active'
    },
    {
      ticket_code: 'TKT-REFUND-012',
      owner_name: 'Fernando Ruiz',
      owner_email: 'fernando.ruiz@example.com',
      event_title: 'Metallica World Tour',
      venue_name: 'Estadio Azteca',
      seat_label: 'General B',
      status: 'refunded'
    }
  ];

  /**
   * Validate ticket QR code at the gate
   */
  async validateTicket(ticketCode: string): Promise<TicketValidationResponse> {
    try {
      return await api.post('/api/tickets/validate', { ticket_code: ticketCode });
    } catch (error: any) {
      console.warn('validateTicket using offline fallback...', error);
      
      const code = ticketCode.trim().toUpperCase();

      // Check if ticket exists in AsyncStorage first
      let localTicket: any = null;
      let ticketsList: any[] = [];
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const stored = await AsyncStorage.getItem('@laika_user_tickets');
        if (stored) {
          ticketsList = JSON.parse(stored);
          localTicket = ticketsList.find((t: any) => 
            t.ticket_code.toUpperCase() === code || 
            t.id === code || 
            (t.transfer_code && t.transfer_code.toUpperCase() === code)
          );
        }
      } catch (err) {
        console.warn('Error reading local tickets in operadorService:', err);
      }

      if (localTicket) {
        // Resolve names
        let ownerName = 'Usuario Final';
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const storedUsers = await AsyncStorage.getItem('@laika_registered_users');
          if (storedUsers) {
            const users = JSON.parse(storedUsers);
            const matchedUser = users.find((u: any) => u.email === localTicket.owner_email);
            if (matchedUser) {
              ownerName = matchedUser.name;
            }
          }
        } catch (e) {}

        const isValid = localTicket.status === 'valid';
        
        if (isValid) {
          // Mark as used
          localTicket.status = 'used';
          localTicket.redeemed_at = new Date().toISOString();
          try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.setItem('@laika_user_tickets', JSON.stringify(ticketsList));
          } catch (e) {}
        }

        // Stats update
        this.mockStats.scanned_today += 1;
        if (isValid) {
          this.mockStats.valid_today += 1;
        } else {
          this.mockStats.invalid_today += 1;
        }
        this.mockStats.recent_scans.unshift({
          id: String(Date.now()),
          ticket_code: localTicket.ticket_code,
          status: isValid ? 'success' : 'used',
          timestamp: new Date().toISOString(),
          event_title: localTicket.event_title || localTicket.event_name || 'Espectáculo',
        });

        return {
          valid: isValid,
          status: isValid ? 'active' : 'used',
          ticket_code: localTicket.ticket_code,
          owner_name: ownerName,
          owner_email: localTicket.owner_email,
          original_owner_name: localTicket.original_owner_name || ownerName,
          original_owner_email: localTicket.original_owner_email || localTicket.owner_email,
          event_title: localTicket.event_title || localTicket.event_name || 'Espectáculo',
          venue_name: localTicket.venue_name || 'Recinto Laika',
          seat_label: localTicket.seat_label || 'General',
          date: localTicket.date,
          time: localTicket.time,
          price: localTicket.price,
          redeemed_at: localTicket.redeemed_at,
        };
      }
      
      // Standard local presets
      if (code === 'TKT-VALID-123' || code.startsWith('TKT-OK') || code === 'TKT-VALID-905171') {
        const matched = this.mockAttendees.find(att => att.ticket_code === code);
        const ticketState = this.mockScannedTickets[code] || { status: 'active' };
        
        if (ticketState.status === 'used') {
          // Already used offline
          this.mockStats.scanned_today += 1;
          this.mockStats.invalid_today += 1;
          this.mockStats.recent_scans.unshift({
            id: String(Date.now()),
            ticket_code: code,
            status: 'used',
            timestamp: new Date().toISOString(),
            event_title: matched ? matched.event_title : 'Luis Miguel Tour 2026',
          });
          return {
            valid: false,
            status: 'used',
            ticket_code: code,
            owner_name: matched ? matched.owner_name : 'Juan Pérez',
            event_title: matched ? matched.event_title : 'Luis Miguel Tour 2026',
            venue_name: matched ? matched.venue_name : 'Estadio Arena Monterrey',
            seat_label: matched ? matched.seat_label : 'Planta Baja - B4',
            redeemed_at: ticketState.redeemed_at || new Date().toISOString(),
          };
        }

        // Successfully redeem offline
        this.mockScannedTickets[code] = {
          status: 'used',
          redeemed_at: new Date().toISOString(),
        };
        this.mockStats.scanned_today += 1;
        this.mockStats.valid_today += 1;
        this.mockStats.recent_scans.unshift({
          id: String(Date.now()),
          ticket_code: code,
          status: 'success',
          timestamp: new Date().toISOString(),
          event_title: matched ? matched.event_title : 'Luis Miguel Tour 2026',
        });

        if (matched) {
          matched.status = 'used';
          matched.redeemed_at = new Date().toISOString();
        }

        return {
          valid: true,
          status: 'active', // returned status prior to redemption
          ticket_code: code,
          owner_name: matched ? matched.owner_name : 'Juan Pérez',
          event_title: matched ? matched.event_title : 'Luis Miguel Tour 2026',
          venue_name: matched ? matched.venue_name : 'Estadio Arena Monterrey',
          seat_label: matched ? matched.seat_label : 'Planta Baja - B4',
        };
      } else if (code === 'TKT-USED-456') {
        this.mockStats.scanned_today += 1;
        this.mockStats.invalid_today += 1;
        this.mockStats.recent_scans.unshift({
          id: String(Date.now()),
          ticket_code: code,
          status: 'used',
          timestamp: new Date().toISOString(),
          event_title: 'Bad Bunny Tour Coahuila',
        });
        return {
          valid: false,
          status: 'used',
          ticket_code: code,
          owner_name: 'Jimena Díaz',
          event_title: 'Bad Bunny Tour Coahuila',
          venue_name: 'Coliseo Centenario',
          seat_label: 'Balcón General - G12',
          redeemed_at: this.mockScannedTickets['TKT-USED-456'].redeemed_at,
        };
      } else {
        // Inexistent ticket
        this.mockStats.scanned_today += 1;
        this.mockStats.invalid_today += 1;
        this.mockStats.recent_scans.unshift({
          id: String(Date.now()),
          ticket_code: code,
          status: 'invalid',
          timestamp: new Date().toISOString(),
          event_title: 'Evento Desconocido',
        });
        throw new Error('Boleto inexistente o inválido (Código no registrado en base de datos).');
      }
    }
  }

  /**
   * Search attendees by query string
   */
  async searchAttendees(query: string): Promise<AttendeeSearchResult[]> {
    try {
      return await api.get(`/api/tickets/search?q=${encodeURIComponent(query)}`);
    } catch (e) {
      console.warn('searchAttendees using offline fallback...', e);
      const q = query.trim().toLowerCase();
      if (!q) return [];

      return this.mockAttendees.filter(att => {
        // Update local status with any offline redemptions
        const state = this.mockScannedTickets[att.ticket_code];
        if (state) {
          att.status = state.status;
          att.redeemed_at = state.redeemed_at;
        }
        return (
          att.owner_name.toLowerCase().includes(q) ||
          att.owner_email.toLowerCase().includes(q) ||
          att.ticket_code.toLowerCase().includes(q)
        );
      });
    }
  }

  /**
   * Report an incident in gate control
   */
  async reportIncident(ticketCode: string, type: IncidentReport['type'], description: string): Promise<IncidentReport> {
    try {
      return await api.post('/api/tickets/incidents', { ticket_code: ticketCode, type, description });
    } catch (error) {
      console.warn('reportIncident using offline fallback...', error);
      
      const newIncident: IncidentReport = {
        ticket_code: ticketCode.toUpperCase(),
        type,
        description,
        reported_at: new Date().toISOString(),
      };
      
      this.mockIncidents.push(newIncident);
      this.mockStats.incidents_today += 1;
      
      return newIncident;
    }
  }

  /**
   * Fetch real-time scanner statistics for the current logged-in operator
   */
  async getStats(): Promise<OperatorStats> {
    try {
      return await api.get('/api/stats/operator/dashboard');
    } catch (error) {
      console.warn('getStats using offline fallback...', error);
      return this.mockStats;
    }
  }

  /**
   * Fetch list of reported incidents (offline helper)
   */
  getMockIncidents(): IncidentReport[] {
    return this.mockIncidents;
  }
}

export const operadorService = new OperadorService();
export default operadorService;
