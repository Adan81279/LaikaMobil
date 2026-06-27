import api from '../../../services/api.service';

export interface TicketValidationResponse {
  valid: boolean;
  status: 'active' | 'used' | 'refunded';
  ticket_code: string;
  owner_name: string;
  event_title: string;
  venue_name: string;
  seat_label: string;
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

  /**
   * Validate ticket QR code at the gate
   */
  async validateTicket(ticketCode: string): Promise<TicketValidationResponse> {
    try {
      return await api.post('/api/tickets/validate', { ticket_code: ticketCode });
    } catch (error: any) {
      console.warn('validateTicket using offline fallback...', error);
      
      // Perform local validation check for offline testing
      const code = ticketCode.trim().toUpperCase();
      
      // Standard local presets
      if (code === 'TKT-VALID-123' || code.startsWith('TKT-OK')) {
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
            event_title: 'Luis Miguel Tour 2026',
          });
          return {
            valid: false,
            status: 'used',
            ticket_code: code,
            owner_name: 'Juan Pérez',
            event_title: 'Luis Miguel Tour 2026',
            venue_name: 'Estadio Arena Monterrey',
            seat_label: 'Planta Baja - B4',
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
          event_title: 'Luis Miguel Tour 2026',
        });

        return {
          valid: true,
          status: 'active', // returned status prior to redemption
          ticket_code: code,
          owner_name: 'Juan Pérez',
          event_title: 'Luis Miguel Tour 2026',
          venue_name: 'Estadio Arena Monterrey',
          seat_label: 'Planta Baja - B4',
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
