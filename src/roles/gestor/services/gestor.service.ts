import api from '../../../services/api.service';

export interface EventItem {
  id: number;
  name: string;
  description: string;
  date: string;
  venue_id: number;
  room_id: number;
  status: 'draft' | 'published' | 'cancelled';
  use_seating_map: boolean;
  category: string;
  image?: string;
  created_at: string;
}

export interface VenueItem {
  id: number;
  name: string;
  address: string;
  city: string;
  capacity: number;
}

export interface RoomItem {
  id: number;
  venue_id: number;
  name: string;
  capacity: number;
  rows_count: number;
  cols_count: number;
  layout_metadata?: string; // JSON layout string
}

export interface MerchandiseItem {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image?: string;
  admin_approved: boolean;
  event_id?: number;
}

export interface GestorDashboardStats {
  total_events: number;
  published_events: number;
  tickets_sold: number;
  total_revenue: number;
  sold_percentage: number;
  recent_sales_trend: { date: string; amount: number }[];
}

export const gestorService = {
  // --- DASHBOARD METRICS ---
  async getDashboardStats(): Promise<GestorDashboardStats> {
    try {
      return await api.get('/api/stats/manager/dashboard');
    } catch (e) {
      return this.getMockDashboardStats();
    }
  },

  // --- EVENTS MODULE ---
  async getEvents(): Promise<EventItem[]> {
    try {
      // In production gateway forwards manager specific events.
      // We can also fetch the manager events list
      return await api.get('/api/events/manager/events');
    } catch (e) {
      console.warn('Fallback to mock events list');
      return this.getMockEvents();
    }
  },

  async createEvent(eventData: Omit<EventItem, 'id' | 'created_at' | 'status'>): Promise<EventItem> {
    return await api.post('/api/events/manager/events', { ...eventData, status: 'draft' });
  },

  async updateEvent(eventId: number, eventData: Partial<EventItem>): Promise<EventItem> {
    return await api.put(`/api/events/${eventId}`, eventData);
  },

  async publishEvent(eventId: number): Promise<{ message: string }> {
    return await api.patch(`/api/events/${eventId}/publish`);
  },

  async unpublishEvent(eventId: number): Promise<{ message: string }> {
    return await api.patch(`/api/events/${eventId}/unpublish`);
  },

  // --- VENUES & ROOMS MODULE ---
  async getVenues(): Promise<VenueItem[]> {
    try {
      return await api.get('/api/events/venues');
    } catch (e) {
      return this.getMockVenues();
    }
  },

  async createVenue(venueData: Omit<VenueItem, 'id'>): Promise<VenueItem> {
    return await api.post('/api/events/venues', venueData);
  },

  async getRooms(venueId: number): Promise<RoomItem[]> {
    try {
      return await api.get(`/api/events/venues/${venueId}/rooms`);
    } catch (e) {
      return this.getMockRooms(venueId);
    }
  },

  async createRoom(venueId: number, roomData: Omit<RoomItem, 'id' | 'venue_id'>): Promise<RoomItem> {
    return await api.post(`/api/events/venues/${venueId}/rooms`, roomData);
  },

  async saveRoomMap(roomId: number, mapLayout: any): Promise<{ message: string }> {
    // Saves seating map matrix layout metadata
    return await api.post(`/api/events/venues/rooms/${roomId}/map`, { layout: mapLayout });
  },

  // --- MERCHANDISE MODULE ---
  async getMerchandise(): Promise<MerchandiseItem[]> {
    try {
      // General bazar retrieve, filtered internally or shown completely
      return await api.get('/api/merchandise');
    } catch (e) {
      return this.getMockMerchandise();
    }
  },

  async createMerchandise(itemData: Omit<MerchandiseItem, 'id' | 'admin_approved'>): Promise<MerchandiseItem> {
    return await api.post('/api/merchandise/', itemData);
  },

  async updateMerchandise(itemId: number, itemData: Partial<MerchandiseItem>): Promise<MerchandiseItem> {
    return await api.put(`/api/merchandise/${itemId}`, itemData);
  },

  // --- OFFLINE DEVELOPMENT MOCK DATA ---
  getMockDashboardStats(): GestorDashboardStats {
    return {
      total_events: 5,
      published_events: 3,
      tickets_sold: 1420,
      total_revenue: 568000,
      sold_percentage: 71,
      recent_sales_trend: [
        { date: '2026-06-20', amount: 48000 },
        { date: '2026-06-21', amount: 56000 },
        { date: '2026-06-22', amount: 72000 },
        { date: '2026-06-23', amount: 64000 },
        { date: '2026-06-24', amount: 98000 },
        { date: '2026-06-25', amount: 110000 },
      ]
    };
  },

  getMockEvents(): EventItem[] {
    return [
      { id: 1, name: 'Concierto Rock Fest 2026', description: 'El festival de rock más grande del norte del país con bandas internacionales en vivo.', date: '2026-08-15T20:00:00Z', venue_id: 1, room_id: 1, status: 'published', use_seating_map: true, category: 'Música', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500', created_at: '2026-06-01T10:00:00Z' },
      { id: 2, name: 'Obra de Teatro Hamlet', description: 'Una interpretación dramática moderna de la clásica obra de William Shakespeare.', date: '2026-09-02T19:00:00Z', venue_id: 2, room_id: 3, status: 'published', use_seating_map: true, category: 'Teatro', image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=500', created_at: '2026-06-10T12:00:00Z' },
      { id: 3, name: 'Lucha Libre Mexicana Triple A', description: 'La emoción de las llaves, vuelos espectaculares y la mística de las máscaras en el cuadrilátero.', date: '2026-08-28T18:00:00Z', venue_id: 1, room_id: 2, status: 'draft', use_seating_map: false, category: 'Deportes', image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=500', created_at: '2026-06-15T09:00:00Z' },
      { id: 4, name: 'Festival Gastronómico Laika Sabor', description: 'Reunión de los mejores chefs de la cocina urbana mexicana con música acústica de fondo.', date: '2026-07-22T12:00:00Z', venue_id: 3, room_id: 5, status: 'cancelled', use_seating_map: false, category: 'Comida', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500', created_at: '2026-06-18T15:00:00Z' },
      { id: 5, name: 'Masterclass Piano Clásico', description: 'Taller intensivo con el pianista de renombre Frédéric Chopin Junior.', date: '2026-10-05T16:00:00Z', venue_id: 2, room_id: 4, status: 'draft', use_seating_map: true, category: 'Música', image: 'https://images.unsplash.com/photo-1552422535-c45813c61732?w=500', created_at: '2026-06-25T11:00:00Z' },
    ];
  },

  getMockVenues(): VenueItem[] {
    return [
      { id: 1, name: 'Estadio Olímpico de la Ciudad', address: 'Av. de la Juventud 450', city: 'Monterrey', capacity: 25000 },
      { id: 2, name: 'Teatro Gran Laika', address: 'Calle Hidalgo 120 Col. Centro', city: 'Guadalajara', capacity: 1800 },
      { id: 3, name: 'Jardín de la Cerveza', address: 'Km 5.5 Carretera Nacional', city: 'Santiago', capacity: 5000 },
    ];
  },

  getMockRooms(venueId: number): RoomItem[] {
    if (venueId === 1) {
      return [
        { id: 1, venue_id: 1, name: 'Cancha Principal (Seccionado)', capacity: 15000, rows_count: 30, cols_count: 20 },
        { id: 2, venue_id: 1, name: 'Gradas Preferente Oriente', capacity: 10000, rows_count: 50, cols_count: 40 },
      ];
    }
    if (venueId === 2) {
      return [
        { id: 3, venue_id: 2, name: 'Platea Baja Vip', capacity: 800, rows_count: 15, cols_count: 20 },
        { id: 4, venue_id: 2, name: 'Anfiteatro Balcón General', capacity: 1000, rows_count: 20, cols_count: 25 },
      ];
    }
    return [
      { id: 5, venue_id: 3, name: 'Terraza Principal Lounge', capacity: 5000, rows_count: 0, cols_count: 0 },
    ];
  },

  getMockMerchandise(): MerchandiseItem[] {
    return [
      { id: 1, name: 'Playera Oficial Rock Fest 2026', description: 'Playera negra 100% algodón preencogido con el logotipo bordado del festival.', price: 350.0, stock: 500, image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200', admin_approved: true, event_id: 1 },
      { id: 2, name: 'Gorra Triple A Conmemorativa', description: 'Gorra ajustable snapback de los rudos vs técnicos de la Lucha Triple A.', price: 280.0, stock: 250, image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=200', admin_approved: false, event_id: 3 },
      { id: 3, name: 'Taza de Porcelana Hamlet Teatro', description: 'Taza negra mate con grabado láser de calavera dramática shakesperiana.', price: 150.0, stock: 120, image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200', admin_approved: true, event_id: 2 },
    ];
  }
};

export default gestorService;
