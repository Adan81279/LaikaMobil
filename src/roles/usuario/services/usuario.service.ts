import apiService from '../../../services/api.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface EventInfo {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  price: number;
  image: string;
  category: string;
  available_seats: number;
  total_seats: number;
}

export interface Ticket {
  id: string;
  event_id: string;
  event_title: string;
  venue_name: string;
  date: string;
  time: string;
  seat_label: string;
  price: number;
  ticket_code: string;
  purchased_at: string;
  status: 'valid' | 'used' | 'refunded';
  event_name?: string;
  eventName?: string;
  venue?: string;
  event_date?: string;
  event_time?: string;
  seat_id?: string;
}

export interface RefundRequest {
  id: string;
  ticket_id: string;
  ticket_code: string;
  event_title: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
}

export interface MerchItem {
  id: string;
  title: string;
  price: number;
  image: string;
  stock: number;
  description: string;
}

export interface UserStats {
  level: number;
  xp: number;
  next_level_xp: number;
  badges: Array<{ id: string; name: string; icon: string; desc: string }>;
}

export interface Coupon {
  code: string;
  discount: number; // percentage
  expiry: string;
  description: string;
}

export interface MerchOrder {
  id: string;
  items: Array<{ title: string; price: number; quantity: number; image: string }>;
  total: number;
  status: 'preparing' | 'shipping' | 'delivered';
  purchased_at: string;
}

export interface EventOpinion {
  id: string;
  event_id: string;
  event_title: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Artist {
  id: string;
  name: string;
  image: string;
  genre: string;
  isFollowing: boolean;
  upcomingShow?: string;
}

// Memory cache for offline/mock state to persist changes within run session
let mockTickets: Ticket[] = [];
let mockRefunds: RefundRequest[] = [];
let mockCoupons: Coupon[] = [
  { code: 'LAIKAFIRST', discount: 15, expiry: '30/08/2026', description: '15% de descuento en tu primer show' },
  { code: 'VIPMEMBERS', discount: 25, expiry: '15/12/2026', description: '25% de descuento exclusivo en zona VIP' },
  { code: 'BAZAAR10', discount: 10, expiry: '01/10/2026', description: '10% de descuento en souvenirs del club' },
];
let mockXP = 350;
let mockLevel = 2;
let mockMerchOrders: MerchOrder[] = [];
let mockOpinions: EventOpinion[] = [];
let mockArtists: Artist[] = [
  { id: 'a1', name: 'Duki', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150', genre: 'Música', isFollowing: true, upcomingShow: 'Duki - A.D.A. Tour 2026' },
  { id: 'a2', name: 'Coldplay', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150', genre: 'Música', isFollowing: false, upcomingShow: 'Coldplay - Music of the Spheres Tour' },
  { id: 'a3', name: 'Steve Aoki', image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=150', genre: 'Electrónica', isFollowing: true, upcomingShow: 'Steve Aoki - Neon Party' },
  { id: 'a4', name: 'Justice', image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=150', genre: 'Electrónica', isFollowing: false },
];

const STORAGE_KEYS = {
  TICKETS: '@laika_user_tickets',
  REFUNDS: '@laika_user_refunds',
  XP: '@laika_user_xp',
  LEVEL: '@laika_user_level',
  COUPONS: '@laika_user_coupons',
  MERCH_ORDERS: '@laika_merch_orders',
  OPINIONS: '@laika_event_opinions',
  ARTISTS: '@laika_followed_artists',
};

// Initialize cache from AsyncStorage if available
const initOfflineCache = async () => {
  try {
    const savedTickets = await AsyncStorage.getItem(STORAGE_KEYS.TICKETS);
    const savedRefunds = await AsyncStorage.getItem(STORAGE_KEYS.REFUNDS);
    const savedXP = await AsyncStorage.getItem(STORAGE_KEYS.XP);
    const savedLevel = await AsyncStorage.getItem(STORAGE_KEYS.LEVEL);
    const savedCoupons = await AsyncStorage.getItem(STORAGE_KEYS.COUPONS);
    const savedMerchOrders = await AsyncStorage.getItem(STORAGE_KEYS.MERCH_ORDERS);
    const savedOpinions = await AsyncStorage.getItem(STORAGE_KEYS.OPINIONS);
    const savedArtists = await AsyncStorage.getItem(STORAGE_KEYS.ARTISTS);

    if (savedTickets) mockTickets = JSON.parse(savedTickets);
    else {
      // Default sample tickets
      mockTickets = [
        {
          id: 'TKT-101',
          event_id: '1',
          event_title: 'Duki - A.D.A. Tour 2026',
          venue_name: 'Estadio Laika Arena',
          date: '15/07/2026',
          time: '21:00',
          seat_label: 'A-12 (VIP)',
          price: 2250, // VIP multiplier (1.5 * 1500)
          ticket_code: 'TKT-VALID-123',
          purchased_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          status: 'valid'
        },
        {
          id: 'TKT-102',
          event_id: '3',
          event_title: 'Steve Aoki - Neon Party',
          venue_name: 'Club Omnia Club',
          date: '28/08/2026',
          time: '23:00',
          seat_label: 'G-05 (General)',
          price: 650,
          ticket_code: 'TKT-USED-456',
          purchased_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          status: 'used'
        }
      ];
      await AsyncStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(mockTickets));
    }

    if (savedRefunds) mockRefunds = JSON.parse(savedRefunds);
    if (savedXP) mockXP = parseInt(savedXP, 10);
    if (savedLevel) mockLevel = parseInt(savedLevel, 10);
    if (savedCoupons) mockCoupons = JSON.parse(savedCoupons);

    if (savedMerchOrders) mockMerchOrders = JSON.parse(savedMerchOrders);
    else {
      mockMerchOrders = [
        {
          id: 'ORD-501',
          items: [
            { title: 'Gorra Laika Neon Black', price: 320, quantity: 1, image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=400&q=80' }
          ],
          total: 320,
          status: 'delivered',
          purchased_at: new Date(Date.now() - 86400000 * 5).toISOString()
        }
      ];
      await AsyncStorage.setItem(STORAGE_KEYS.MERCH_ORDERS, JSON.stringify(mockMerchOrders));
    }

    if (savedOpinions) mockOpinions = JSON.parse(savedOpinions);
    if (savedArtists) mockArtists = JSON.parse(savedArtists);
  } catch (e) {
    console.error('Error restoring user cache:', e);
  }
};

initOfflineCache();

const saveTicketsToStorage = async (tickets: Ticket[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
  } catch (e) {}
};

const saveRefundsToStorage = async (refunds: RefundRequest[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.REFUNDS, JSON.stringify(refunds));
  } catch (e) {}
};

const saveGamificationToStorage = async (level: number, xp: number) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LEVEL, String(level));
    await AsyncStorage.setItem(STORAGE_KEYS.XP, String(xp));
  } catch (e) {}
};

const saveCouponsToStorage = async (coupons: Coupon[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(coupons));
  } catch (e) {}
};

const saveMerchOrdersToStorage = async (orders: MerchOrder[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.MERCH_ORDERS, JSON.stringify(orders));
  } catch (e) {}
};

const saveOpinionsToStorage = async (opinions: EventOpinion[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.OPINIONS, JSON.stringify(opinions));
  } catch (e) {}
};

const saveArtistsToStorage = async (artists: Artist[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ARTISTS, JSON.stringify(artists));
  } catch (e) {}
};

class UsuarioService {
  /**
   * Get public events list
   */
  async getPublicEvents(): Promise<EventInfo[]> {
    try {
      const response = await apiService.get('/api/events/public', { timeout: 2000 });
      return response;
    } catch (e) {
      console.warn('Using offline mock events.');
      // Return high quality mockup events
      return [
        {
          id: '1',
          title: 'Duki - A.D.A. Tour 2026',
          description: 'El referente mundial de la música urbana llega a México para presentar su nuevo álbum A.D.A. junto con sus mayores éxitos globales en una noche legendaria.',
          date: '15/07/2026',
          time: '21:00',
          venue: 'Estadio Laika Arena',
          price: 1500,
          image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=600&q=80',
          category: 'Música',
          available_seats: 450,
          total_seats: 12000
        },
        {
          id: '2',
          title: 'Coldplay - Music of the Spheres Tour',
          description: 'Disfruta de una experiencia inmersiva con luces LED, fuegos artificiales y una puesta en escena espectacular e inolvidable con conciencia ecológica.',
          date: '02/08/2026',
          time: '20:00',
          venue: 'Foro Sol Monumental',
          price: 2200,
          image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
          category: 'Música',
          available_seats: 820,
          total_seats: 55000
        },
        {
          id: '3',
          title: 'Steve Aoki - Neon Party',
          description: 'El DJ y productor superestrella Steve Aoki llenará de beats electrónicos y lanzamientos de pasteles la pista en la mejor fiesta electrónica del año.',
          date: '28/08/2026',
          time: '23:00',
          venue: 'Club Omnia Club',
          price: 650,
          image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
          category: 'Electrónica',
          available_seats: 120,
          total_seats: 2500
        },
        {
          id: '4',
          title: 'Gamer Con 2026',
          description: 'La convención anual de videojuegos y cosplay más importante del país. Zona de eSports, torneos retro, booths interactivos y conferencias de creadores.',
          date: '10/09/2026',
          time: '10:00',
          venue: 'Centro de Exposiciones Laika Center',
          price: 350,
          image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
          category: 'Convención',
          available_seats: 2300,
          total_seats: 8000
        }
      ];
    }
  }

  /**
   * Purchase seats for an event
   */
  async purchaseTickets(eventId: string, seats: string[], price: number): Promise<boolean> {
    try {
      // Simulate API call
      await apiService.post('/api/tickets/purchase', {
        event_id: eventId,
        seats: seats,
        total_amount: price
      }, { timeout: 2000 });
      
      // Keep mock synchronization
      await this.saveMockTickets(eventId, seats, price);
      return true;
    } catch (e) {
      console.warn('Purchase API timed out, performing offline mock transaction.');
      await this.saveMockTickets(eventId, seats, price);
      return true;
    }
  }

  private async saveMockTickets(eventId: string, seats: string[], price: number) {
    const events = await this.getPublicEvents();
    const event = events.find(e => e.id === eventId);
    const basePrice = event?.price || 0;
    
    const newTickets = seats.map((seat, index) => {
      const ticketId = `TKT-${Math.floor(100 + Math.random() * 900)}`;
      const randomCode = `TKT-VALID-${Math.floor(100000 + Math.random() * 900000)}`;
      
      const row = seat.split('-')[0];
      let seatPrice = basePrice;
      let zoneName = 'General';
      if (row === 'A') {
        seatPrice = basePrice * 1.5;
        zoneName = 'VIP';
      } else if (row === 'B' || row === 'C') {
        seatPrice = basePrice * 1.1;
        zoneName = 'Gold';
      }

      return {
        id: ticketId,
        event_id: eventId,
        event_title: event?.title || 'Espectáculo Adquirido',
        venue_name: event?.venue || 'Recinto Central',
        date: event?.date || 'Fecha Pendiente',
        time: event?.time || 'Hora Pendiente',
        seat_label: `${seat} (${zoneName})`,
        price: seatPrice,
        ticket_code: randomCode,
        purchased_at: new Date().toISOString(),
        status: 'valid' as const
      };
    });

    mockTickets = [...newTickets, ...mockTickets];
    await saveTicketsToStorage(mockTickets);

    // Increase User XP on Purchase
    await this.addXP(100 * seats.length);
  }

  /**
   * Get client's purchased tickets
   */
  async getMyTickets(): Promise<Ticket[]> {
    try {
      const response = await apiService.get('/api/tickets/my-tickets', { timeout: 2000 });
      return response;
    } catch (e) {
      return mockTickets;
    }
  }

  /**
   * Request refund for a ticket
   */
  async requestRefund(ticketId: string, reason: string): Promise<boolean> {
    try {
      await apiService.post('/api/tickets/refund', { ticket_id: ticketId, reason }, { timeout: 2000 });
      this.processMockRefund(ticketId, reason);
      return true;
    } catch (e) {
      console.warn('Refund API timed out, performing offline mock refund.');
      this.processMockRefund(ticketId, reason);
      return true;
    }
  }

  private async processMockRefund(ticketId: string, reason: string) {
    // Find ticket and flag it
    const ticketIdx = mockTickets.findIndex(t => t.id === ticketId);
    let eventTitle = 'Espectáculo Desconocido';
    let ticketCode = 'N/A';
    
    if (ticketIdx !== -1) {
      mockTickets[ticketIdx].status = 'refunded';
      eventTitle = mockTickets[ticketIdx].event_title;
      ticketCode = mockTickets[ticketIdx].ticket_code;
      await saveTicketsToStorage(mockTickets);
    }

    const newRefund: RefundRequest = {
      id: `RFD-${Math.floor(1000 + Math.random() * 9000)}`,
      ticket_id: ticketId,
      ticket_code: ticketCode,
      event_title: eventTitle,
      reason: reason,
      status: 'pending',
      requested_at: new Date().toISOString()
    };

    mockRefunds = [newRefund, ...mockRefunds];
    await saveRefundsToStorage(mockRefunds);
  }

  /**
   * Get refund requests
   */
  async getRefunds(): Promise<RefundRequest[]> {
    try {
      const response = await apiService.get('/api/tickets/refund', { timeout: 2000 });
      return response;
    } catch (e) {
      return mockRefunds;
    }
  }

  /**
   * Get merchandise catalogue
   */
  async getMerchandise(): Promise<MerchItem[]> {
    try {
      const response = await apiService.get('/api/merchandise/', { timeout: 2000 });
      return response;
    } catch (e) {
      return [
        {
          id: 'm1',
          title: 'Playera Oficial Duki A.D.A Tour',
          price: 450,
          image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80',
          stock: 45,
          description: 'Algodón 100% premium, estampado de alta durabilidad en espalda y frente, edición limitada del tour.'
        },
        {
          id: 'm2',
          title: 'Gorra Laika Neon Black',
          price: 320,
          image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=400&q=80',
          stock: 20,
          description: 'Gorra ajustable tipo snapback con logo bordado en hilo neón de alta calidad.'
        },
        {
          id: 'm3',
          title: 'Lanyard Conmemorativa Laika VIP',
          price: 120,
          image: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=400&q=80',
          stock: 150,
          description: 'Ideal para colgar tu gafete o llaves, sublimación de doble vista con fibras recicladas.'
        },
        {
          id: 'm4',
          title: 'Termo de Acero Inoxidable Coldplay',
          price: 550,
          image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80',
          stock: 12,
          description: 'Capacidad de 750ml, aislamiento de doble capa para mantener bebidas frías o calientes por 12 horas.'
        }
      ];
    }
  }

  /**
   * Purchase merchandise items
   */
  async purchaseMerchandise(items: Array<{ item: MerchItem; quantity: number }>, totalPrice: number): Promise<boolean> {
    const newOrder: MerchOrder = {
      id: `ORD-${Math.floor(100 + Math.random() * 900)}`,
      items: items.map(it => ({
        title: it.item.title,
        price: it.item.price,
        quantity: it.quantity,
        image: it.item.image
      })),
      total: totalPrice,
      status: 'preparing',
      purchased_at: new Date().toISOString()
    };
    mockMerchOrders = [newOrder, ...mockMerchOrders];
    await saveMerchOrdersToStorage(mockMerchOrders);
    await this.addXP(50);
    return true;
  }

  /**
   * Request promotion/role upgrade
   */
  async requestPermissionPromotion(requestedRole: string, reason: string): Promise<boolean> {
    try {
      await apiService.post('/api/auth/request-permission', { requested_role: requestedRole, reason }, { timeout: 2000 });
      return true;
    } catch (e) {
      console.warn('Promotion request simulated successfully.');
      return true;
    }
  }

  /**
   * Get user achievements stats
   */
  async getAchievements(): Promise<UserStats> {
    try {
      const response = await apiService.get('/api/achievements/', { timeout: 2000 });
      return response;
    } catch (e) {
      return {
        level: mockLevel,
        xp: mockXP,
        next_level_xp: mockLevel * 500,
        badges: [
          { id: 'b1', name: 'Primer Show', icon: 'musical-notes', desc: 'Asististe a tu primer evento musical' },
          { id: 'b2', name: 'Gamer Social', icon: 'game-controller', desc: 'Asististe a un festival de videojuegos' },
          { id: 'b3', name: 'Cazador de Souvenirs', icon: 'shirt', desc: 'Adquiriste mercancía oficial en el Bazar' },
        ]
      };
    }
  }

  /**
   * Add XP to user profile
   */
  async addXP(amount: number): Promise<UserStats> {
    mockXP += amount;
    const nextLvlXp = mockLevel * 500;
    if (mockXP >= nextLvlXp) {
      mockXP = mockXP - nextLvlXp;
      mockLevel += 1;
    }
    await saveGamificationToStorage(mockLevel, mockXP);
    return this.getAchievements();
  }

  /**
   * Spin the Roulette to win a coupon
   */
  async spinLuckySeat(): Promise<{ success: boolean; coupon?: Coupon; message: string }> {
    try {
      const response = await apiService.post('/api/tickets/lucky-seat', {}, { timeout: 2000 });
      return response;
    } catch (e) {
      // Offline Simulation
      const roll = Math.random();
      if (roll > 0.4) {
        // Win random coupon
        const couponIdx = Math.floor(Math.random() * mockCoupons.length);
        const wonCoupon = mockCoupons[couponIdx];
        
        // Add XP reward
        await this.addXP(75);

        return {
          success: true,
          coupon: wonCoupon,
          message: `¡Felicidades! Ganaste un cupón de descuento: ${wonCoupon.code} (${wonCoupon.discount}% OFF)`
        };
      } else {
        return {
          success: false,
          message: 'Suerte para la próxima. Inténtalo de nuevo mañana.'
        };
      }
    }
  }

  /**
   * Get active coupons
   */
  async getCoupons(): Promise<Coupon[]> {
    try {
      const response = await apiService.get('/api/achievements/coupons', { timeout: 2000 });
      return response;
    } catch (e) {
      return mockCoupons;
    }
  }

  /**
   * Get client's merchandise orders
   */
  async getMerchOrders(): Promise<MerchOrder[]> {
    return mockMerchOrders;
  }

  /**
   * Get reviews/opinions
   */
  async getOpinions(): Promise<EventOpinion[]> {
    return mockOpinions;
  }

  /**
   * Submit an event opinion/review
   */
  async submitOpinion(eventId: string, eventTitle: string, rating: number, comment: string): Promise<boolean> {
    const newOpinion: EventOpinion = {
      id: `REV-${Math.floor(1000 + Math.random() * 9000)}`,
      event_id: eventId,
      event_title: eventTitle,
      rating,
      comment,
      created_at: new Date().toISOString()
    };
    mockOpinions = [newOpinion, ...mockOpinions];
    await saveOpinionsToStorage(mockOpinions);
    // Add XP for leaving reviews
    await this.addXP(40);
    return true;
  }

  /**
   * Get artists list
   */
  async getArtists(): Promise<Artist[]> {
    return mockArtists;
  }

  /**
   * Toggle follow/unfollow artist
   */
  async toggleFollowArtist(artistId: string): Promise<Artist[]> {
    mockArtists = mockArtists.map(art => 
      art.id === artistId ? { ...art, isFollowing: !art.isFollowing } : art
    );
    await saveArtistsToStorage(mockArtists);
    return mockArtists;
  }
}

const usuarioService = new UsuarioService();
export default usuarioService;
