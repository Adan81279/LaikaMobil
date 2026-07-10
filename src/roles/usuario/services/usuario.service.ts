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
  status: 'valid' | 'used' | 'refunded' | 'transferred';
  event_name?: string;
  eventName?: string;
  venue?: string;
  event_date?: string;
  event_time?: string;
  seat_id?: string;
  related_merch?: Array<{ id: string; title: string; price: number; quantity: number; image: string }>;
  owner_email?: string;
  transfer_code?: string;
  original_owner_name?: string;
  original_owner_email?: string;
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
  eventId?: string;
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

    if (savedTickets) {
      mockTickets = JSON.parse(savedTickets);
      const hasMetallica = mockTickets.some((t: any) => t.ticket_code === 'TKT-VALID-905171');
      if (!hasMetallica) {
        mockTickets.push({
          id: 'TKT-103',
          event_id: '9',
          event_title: 'Metallica - M72 World Tour',
          venue_name: 'Arena Ciudad de México',
          date: '18/10/2026',
          time: '20:00',
          seat_label: 'A-1 (VIP)',
          price: 2850,
          ticket_code: 'TKT-VALID-905171',
          purchased_at: new Date(Date.now() - 86400000).toISOString(),
          status: 'valid',
          owner_email: 'cliente@laikaclub.com',
          related_merch: [
            { id: 'm-met-1', title: 'Gorra Metallica Black Album', price: 0, quantity: 1, image: '' }
          ]
        });
        await AsyncStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(mockTickets));
      }
    } else {
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
          status: 'valid',
          owner_email: 'cliente@laikaclub.com'
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
          status: 'used',
          owner_email: 'cliente@laikaclub.com'
        },
        {
          id: 'TKT-103',
          event_id: '9',
          event_title: 'Metallica - M72 World Tour',
          venue_name: 'Arena Ciudad de México',
          date: '18/10/2026',
          time: '20:00',
          seat_label: 'A-1 (VIP)',
          price: 2850,
          ticket_code: 'TKT-VALID-905171',
          purchased_at: new Date(Date.now() - 86400000).toISOString(),
          status: 'valid',
          owner_email: 'cliente@laikaclub.com',
          related_merch: [
            { id: 'm-met-1', title: 'Gorra Metallica Black Album', price: 0, quantity: 1, image: '' }
          ]
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

const offlineEvents: EventInfo[] = [
  {
    id: '1',
    title: 'Duki - A.D.A. Tour 2026',
    description: 'El referente mundial de la música urbana llega a México para presentar su nuevo álbum A.D.A. junto con sus mayores éxitos globales en una noche legendaria.',
    date: '15/07/2026',
    time: '21:00',
    venue: 'Estadio Laika Arena',
    price: 1500,
    image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=600&q=80',
    category: 'Urbano',
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
    category: 'Pop',
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
  },
  {
    id: '5',
    title: 'Bad Bunny - Most Wanted Tour',
    description: 'El Conejo Malo regresa con un espectáculo sin precedentes dedicado a sus raíces trap y sus hits número uno a nivel mundial.',
    date: '22/09/2026',
    time: '20:30',
    venue: 'Estadio Azteca',
    price: 1800,
    image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=600&q=80',
    category: 'Urbano',
    available_seats: 310,
    total_seats: 80000
  },
  {
    id: '6',
    title: 'Taylor Swift - The Eras Tour',
    description: 'Un viaje a través de todas las eras musicales de la carrera de Taylor Swift, con una producción masiva e inolvidable.',
    date: '05/10/2026',
    time: '19:30',
    venue: 'Foro Sol Monumental',
    price: 3500,
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80',
    category: 'Pop',
    available_seats: 40,
    total_seats: 60000
  },
  {
    id: '7',
    title: 'Metallica - M72 World Tour',
    description: 'La legendaria banda de metal regresa con su icónico escenario circular y un setlist doble en dos noches inolvidables.',
    date: '18/10/2026',
    time: '20:00',
    venue: 'Arena Ciudad de México',
    price: 1900,
    image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=600&q=80',
    category: 'Rock',
    available_seats: 150,
    total_seats: 22000
  },
  {
    id: '8',
    title: 'Martin Garrix - Live Beats',
    description: 'Disfruta de la magia electrónica de uno de los mejores DJs del mundo en una noche llena de luces, lásers y pirotecnia.',
    date: '31/10/2026',
    time: '22:00',
    venue: 'Explanada Laika Park',
    price: 750,
    image: 'https://images.unsplash.com/photo-1482578008906-8d697d897d28?auto=format&fit=crop&w=600&q=80',
    category: 'Electrónica',
    available_seats: 980,
    total_seats: 15000
  },
  {
    id: '9',
    title: 'Billie Eilish - Hit Me Hard and Soft',
    description: 'Presentando su nuevo material discográfico con un show íntimo pero espectacular que destaca su inigualable rango vocal y estilo alternativo.',
    date: '12/11/2026',
    time: '20:30',
    venue: 'Palacio de los Deportes',
    price: 1600,
    image: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=600&q=80',
    category: 'Pop',
    available_seats: 200,
    total_seats: 18000
  },
  {
    id: '10',
    title: 'Bruno Mars - Live in Concert',
    description: 'El rey del funk y el pop regresa con su espectacular banda The Hooligans para hacernos bailar con su inigualable energía.',
    date: '25/11/2026',
    time: '21:00',
    venue: 'Estadio Laika Arena',
    price: 2400,
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    category: 'Pop',
    available_seats: 180,
    total_seats: 25000
  },
  {
    id: '11',
    title: 'Iron Maiden - Future Past Tour',
    description: 'Un show épico que celebra lo mejor de Somewhere in Time, Senjutsu y sus mayores clásicos con Eddie en escena.',
    date: '04/12/2026',
    time: '20:00',
    venue: 'Foro Sol Monumental',
    price: 1700,
    image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=600&q=80',
    category: 'Rock',
    available_seats: 400,
    total_seats: 50000
  },
  {
    id: '12',
    title: 'Daft Punk Tribute - Laser Show',
    description: 'Una experiencia sensorial de luces y lásers sincronizada con los mayores éxitos de Daft Punk en vivo.',
    date: '15/12/2026',
    time: '22:00',
    venue: 'Planetario Laika Dome',
    price: 450,
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
    category: 'Electrónica',
    available_seats: 80,
    total_seats: 800
  },
  {
    id: '13',
    title: 'Karol G - Mañana Será Bonito',
    description: 'La Bichota llega con su vibra positiva, tiernos animales mágicos en el escenario y todos sus éxitos urbanos.',
    date: '10/01/2027',
    time: '20:00',
    venue: 'Estadio Azteca',
    price: 1550,
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80',
    category: 'Urbano',
    available_seats: 600,
    total_seats: 75000
  },
  {
    id: '14',
    title: 'The Weeknd - After Hours til Dawn',
    description: 'Una noche teatral y cinematográfica que recorre el desierto de luces rojas y sintetizadores de The Weeknd.',
    date: '28/01/2027',
    time: '21:00',
    venue: 'Foro Sol Monumental',
    price: 2100,
    image: 'https://images.unsplash.com/photo-1486591978090-58e619d37fe7?auto=format&fit=crop&w=600&q=80',
    category: 'Pop',
    available_seats: 250,
    total_seats: 60000
  },
  {
    id: '15',
    title: 'Red Hot Chili Peppers - Unlimited Love',
    description: 'Los californianos regresan con John Frusciante en la guitarra en una sesión pura de funk rock y energía ilimitada.',
    date: '14/02/2027',
    time: '20:30',
    venue: 'Arena Ciudad de México',
    price: 1650,
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=600&q=80',
    category: 'Rock',
    available_seats: 330,
    total_seats: 20000
  },
  {
    id: '16',
    title: 'Tomorrowland Unite México',
    description: 'La conexión satelital en vivo con el festival de música electrónica más grande del mundo, con DJs en vivo locales e internacionales.',
    date: '06/03/2027',
    time: '16:00',
    venue: 'Explanada Laika Park',
    price: 1200,
    image: 'https://images.unsplash.com/photo-1472653431158-6364773b2a56?auto=format&fit=crop&w=600&q=80',
    category: 'Electrónica',
    available_seats: 1200,
    total_seats: 30000
  },
  {
    id: '17',
    title: 'Rock in Laika Festival',
    description: 'Un festival dedicado enteramente al rock en español y alternativo. 12 bandas nacionales en un solo día.',
    date: '20/03/2027',
    time: '12:00',
    venue: 'Centro de Exposiciones Laika Center',
    price: 950,
    image: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=600&q=80',
    category: 'Rock',
    available_seats: 850,
    total_seats: 15000
  },
  {
    id: '18',
    title: 'Indie Fest 2026',
    description: 'Descubre los nuevos proyectos emergentes y consolidados del movimiento indie alternativo internacional.',
    date: '04/04/2027',
    time: '15:00',
    venue: 'Jardines de Laika Arena',
    price: 400,
    image: 'https://images.unsplash.com/photo-1453090923802-60c3b538ee25?auto=format&fit=crop&w=600&q=80',
    category: 'Indie',
    available_seats: 190,
    total_seats: 4000
  },
  {
    id: '19',
    title: 'Anime & Manga Fest',
    description: 'La celebración de la cultura japonesa más grande del año. Cosplay, stands de venta oficiales, actores de doblaje y conciertos de anisong.',
    date: '18/04/2027',
    time: '10:00',
    venue: 'Centro de Exposiciones Laika Center',
    price: 300,
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
    category: 'Convención',
    available_seats: 1400,
    total_seats: 6000
  },
  {
    id: '20',
    title: 'Travis Scott - Utopia Tour',
    description: 'Una experiencia audiovisual inmersiva y de alta intensidad. Vive la utopía trap con Travis Scott en vivo.',
    date: '05/05/2027',
    time: '21:00',
    venue: 'Palacio de los Deportes',
    price: 1850,
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=600&q=80',
    category: 'Urbano',
    available_seats: 120,
    total_seats: 16000
  },
  {
    id: '21',
    title: 'Eminem - The Resurrection Tour',
    description: 'El dios del rap Slim Shady regresa a los escenarios en un show que resume sus mayores batallas y éxitos clásicos.',
    date: '20/05/2027',
    time: '20:00',
    venue: 'Estadio Laika Arena',
    price: 2250,
    image: 'https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=600&q=80',
    category: 'Urbano',
    available_seats: 160,
    total_seats: 30000
  },
  {
    id: '22',
    title: 'Shakira - Las Mujeres Ya No Lloran',
    description: 'La estrella mundial del pop latino regresa con un despliegue de baile, hits históricos y una producción de vanguardia.',
    date: '10/06/2027',
    time: '20:30',
    venue: 'Estadio Azteca',
    price: 2000,
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
    category: 'Pop',
    available_seats: 320,
    total_seats: 80000
  },
  {
    id: '23',
    title: 'Peso Pluma - Éxodo Tour',
    description: 'La máxima estrella del regional mexicano y los corridos tumbados llega para una noche histórica de fiesta.',
    date: '24/06/2027',
    time: '21:00',
    venue: 'Arena Ciudad de México',
    price: 1300,
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80',
    category: 'Urbano',
    available_seats: 430,
    total_seats: 22000
  },
  {
    id: '24',
    title: 'Bizarrap - Live Session',
    description: 'El productor estrella argentino Bizarrap presenta su aclamado espectáculo visual tocando sus sesiones más virales.',
    date: '08/07/2027',
    time: '22:00',
    venue: 'Club Omnia Club',
    price: 800,
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    category: 'Electrónica',
    available_seats: 75,
    total_seats: 3000
  },
  {
    id: '25',
    title: 'Justin Bieber - Justice Tour',
    description: 'La superestrella del pop mundial regresa con su tour mundial Justice en una noche de hits coreados por miles.',
    date: '25/07/2027',
    time: '20:30',
    venue: 'Foro Sol Monumental',
    price: 1950,
    image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=600&q=80',
    category: 'Pop',
    available_seats: 540,
    total_seats: 60000
  }
];

const offlineMerch: MerchItem[] = [
  {
    id: 'm1',
    title: 'Playera Oficial Duki A.D.A Tour',
    price: 450,
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80',
    stock: 45,
    description: 'Algodón 100% premium, estampado de alta durabilidad en espalda y frente, edición limitada del tour.',
    eventId: '1'
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
    description: 'Capacidad de 750ml, aislamiento de doble capa para mantener bebidas frías o calientes por 12 horas.',
    eventId: '2'
  },
  {
    id: 'm5',
    title: 'Sudadera Bad Bunny "Most Wanted"',
    price: 850,
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=400&q=80',
    stock: 35,
    description: 'Sudadera con gorro y bolsa frontal, diseño exclusivo del tour "Most Wanted" en serigrafía.',
    eventId: '5'
  },
  {
    id: 'm6',
    title: 'Pulsera LED Coldplay Neon',
    price: 150,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
    stock: 200,
    description: 'Pulsera interactiva con luz LED que parpadea al ritmo de los sensores de audio.',
    eventId: '2'
  },
  {
    id: 'm7',
    title: 'Playera Metallica M72 Tour',
    price: 480,
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=400&q=80',
    stock: 50,
    description: 'Playera de manga corta con el imponente arte del tour mundial M72 de Metallica.',
    eventId: '7'
  },
  {
    id: 'm8',
    title: 'Gorra Steve Aoki Cake',
    price: 300,
    image: 'https://images.unsplash.com/photo-1534215754734-18e55d13e346?auto=format&fit=crop&w=400&q=80',
    stock: 40,
    description: 'Gorra oficial con el divertido logo "Cake Me" del DJ Steve Aoki.',
    eventId: '3'
  },
  {
    id: 'm9',
    title: 'Playera Taylor Swift The Eras Tour',
    price: 500,
    image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=400&q=80',
    stock: 80,
    description: 'Playera oficial con el collage de fotos de las eras de Taylor Swift.',
    eventId: '6'
  },
  {
    id: 'm10',
    title: 'Tote Bag Billie Eilish Blohsh',
    price: 250,
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80',
    stock: 90,
    description: 'Bolsa ecológica de lona resistente con el icónico isotipo Blohsh de Billie Eilish.',
    eventId: '9'
  },
  {
    id: 'm11',
    title: 'Llavero Metálico Coldplay',
    price: 90,
    image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=400&q=80',
    stock: 120,
    description: 'Llavero metálico grabado con el logotipo de Coldplay "Music of the Spheres".',
    eventId: '2'
  },
  {
    id: 'm12',
    title: 'Sudadera Duki Diabla Negra',
    price: 890,
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=400&q=80',
    stock: 25,
    description: 'Sudadera premium color negro con logo bordado en color rojo de la diabla.',
    eventId: '1'
  },
  {
    id: 'm13',
    title: 'Poster Edición Limitada Steve Aoki',
    price: 180,
    image: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?auto=format&fit=crop&w=400&q=80',
    stock: 60,
    description: 'Poster con acabado metálico firmado digitalmente por Steve Aoki. Edición numerada.',
    eventId: '3'
  },
  {
    id: 'm14',
    title: 'Vaso Coleccionable Gamer Con 2026',
    price: 140,
    image: 'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=400&q=80',
    stock: 300,
    description: 'Vaso de plástico rígido holográfico coleccionable de la convención de videojuegos.',
    eventId: '4'
  },
  {
    id: 'm15',
    title: 'Playera Karol G Bichota Blanca',
    price: 460,
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80',
    stock: 55,
    description: 'Playera blanca con diseño floral e impresión frontal del single "Bichota" de Karol G.',
    eventId: '13'
  },
  {
    id: 'm16',
    title: 'Sudadera The Weeknd XO Logo',
    price: 900,
    image: 'https://images.unsplash.com/photo-1609873814058-a8928924184a?auto=format&fit=crop&w=400&q=80',
    stock: 30,
    description: 'Sudadera ultra suave con estampado del logo XO de The Weeknd en el pecho.',
    eventId: '14'
  },
  {
    id: 'm17',
    title: 'Calcomanías Pack Rock & Metal',
    price: 80,
    image: 'https://images.unsplash.com/photo-1572375995501-4b0894dbe0d1?auto=format&fit=crop&w=400&q=80',
    stock: 500,
    description: 'Paquete con 12 calcomanías impermeables de vinilo con logos de bandas de rock y metal.',
    eventId: '17'
  },
  {
    id: 'm18',
    title: 'Gorro de Lana Red Hot Chili Peppers',
    price: 280,
    image: 'https://images.unsplash.com/photo-1576871337622-98d48d4aa53e?auto=format&fit=crop&w=400&q=80',
    stock: 65,
    description: 'Gorro de lana tejido con el clásico isotipo del asterisco de los Red Hot Chili Peppers.',
    eventId: '15'
  },
  {
    id: 'm19',
    title: 'Mochila Impermeable Tomorrowland',
    price: 650,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80',
    stock: 18,
    description: 'Mochila ligera e impermeable con el logotipo de Tomorrowland, perfecta para festivales.',
    eventId: '16'
  },
  {
    id: 'm20',
    title: 'Playera Travis Scott Utopia',
    price: 550,
    image: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=400&q=80',
    stock: 40,
    description: 'Playera de corte holgado con tipografía exclusiva del disco Utopia de Travis Scott.',
    eventId: '20'
  },
  {
    id: 'm21',
    title: 'Sudadera Eminem Shady Records',
    price: 920,
    image: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=400&q=80',
    stock: 22,
    description: 'Sudadera conmemorativa color gris jaspeado con el logo clásico de Shady Records.',
    eventId: '21'
  },
  {
    id: 'm22',
    title: 'Playera Shakira Loba Edición',
    price: 480,
    image: 'https://images.unsplash.com/photo-1554568218-0f1715e72254?auto=format&fit=crop&w=400&q=80',
    stock: 45,
    description: 'Playera de colección de Shakira alusiva al icónico videoclip de "She Wolf".',
    eventId: '22'
  },
  {
    id: 'm23',
    title: 'Gorra Peso Pluma Double P',
    price: 340,
    image: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=400&q=80',
    stock: 80,
    description: 'Gorra oficial tipo trucker con el bordado de las letras PP de Peso Pluma.',
    eventId: '23'
  },
  {
    id: 'm24',
    title: 'Llavero Acrílico Bizarrap Session',
    price: 95,
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=400&q=80',
    stock: 140,
    description: 'Llavero de acrílico de alta calidad con el logo oficial del productor Bizarrap.',
    eventId: '24'
  },
  {
    id: 'm25',
    title: 'Playera Justin Bieber Justice Tour',
    price: 490,
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80',
    stock: 75,
    description: 'Playera de color verde neón oficial de la gira mundial Justice de Justin Bieber.',
    eventId: '25'
  },
  {
    id: 'm26',
    title: 'Playera Steve Aoki Neon Logo',
    price: 420,
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=400&q=80',
    stock: 60,
    description: 'Playera negra con logo Aoki impreso en tinta reactiva a la luz negra o ultravioleta.',
    eventId: '3'
  },
  {
    id: 'm27',
    title: 'Sudadera Coldplay Spheres Blanca',
    price: 880,
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=400&q=80',
    stock: 35,
    description: 'Sudadera blanca con el arte planetario del tour "Music of the Spheres" impreso a color.',
    eventId: '2'
  },
  {
    id: 'm28',
    title: 'Gorra Bad Bunny Corazón',
    price: 330,
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=400&q=80',
    stock: 90,
    description: 'Gorra de mezclilla con el parche bordado del corazón triste de "Un Verano Sin Ti".',
    eventId: '5'
  },
  {
    id: 'm29',
    title: 'Termo Duki A.D.A Aluminio',
    price: 520,
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80',
    stock: 50,
    description: 'Termo de aluminio para bebidas frías con la tipografía oficial del álbum A.D.A.',
    eventId: '1'
  },
  {
    id: 'm30',
    title: 'Case iPhone Laika Club Oficial',
    price: 190,
    image: 'https://images.unsplash.com/photo-1601597111158-2fceff270190?auto=format&fit=crop&w=400&q=80',
    stock: 120,
    description: 'Funda protectora anticaídas compatible con iPhone con el logo neón de Laika Club.'
  },
  {
    id: 'm31',
    title: 'Playera Billie Eilish Oversized',
    price: 470,
    image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=400&q=80',
    stock: 100,
    description: 'Playera de corte holgado en color verde brillante característico de Billie Eilish.',
    eventId: '9'
  },
  {
    id: 'm32',
    title: 'Taza de Cerámica Rock Legends',
    price: 160,
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=400&q=80',
    stock: 150,
    description: 'Taza de cerámica de 11oz apta para microondas con collage impreso de bandas legendarias.',
    eventId: '17'
  },
  {
    id: 'm33',
    title: 'Calcomanías Pack Anime Fest VIP',
    price: 70,
    image: 'https://images.unsplash.com/photo-1572375995501-4b0894dbe0d1?auto=format&fit=crop&w=400&q=80',
    stock: 400,
    description: 'Colección de pegatinas de vinil de las series de anime y manga más populares del momento.',
    eventId: '19'
  },
  {
    id: 'm34',
    title: 'Pulsera de Tela Tomorrowland Gold',
    price: 110,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
    stock: 250,
    description: 'Pulsera de tela tejida de Tomorrowland con broche de seguridad de plástico. Conmemorativa.',
    eventId: '16'
  },
  {
    id: 'm35',
    title: 'Playera Bruno Mars 24K Magic',
    price: 490,
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80',
    stock: 40,
    description: 'Playera estampada con letras doradas inspiradas en el exitoso álbum 24K Magic.',
    eventId: '10'
  },
  {
    id: 'm36',
    title: 'Gorra Metallica Black Album',
    price: 320,
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=400&q=80',
    stock: 35,
    description: 'Gorra bordada de color negro con la icónica serpiente de la portada de Metallica.',
    eventId: '7'
  },
  {
    id: 'm37',
    title: 'Sudadera Karol G Bichota Rosa',
    price: 860,
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=400&q=80',
    stock: 45,
    description: 'Sudadera color rosa pastel con tipografía e ilustraciones de flores de Karol G.',
    eventId: '13'
  },
  {
    id: 'm38',
    title: 'Playera The Weeknd Starboy Tour',
    price: 450,
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=400&q=80',
    stock: 70,
    description: 'Playera retro que rememora el icónico álbum y gira Starboy de The Weeknd.',
    eventId: '14'
  },
  {
    id: 'm39',
    title: 'Termo Steve Aoki Dim Mak',
    price: 540,
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80',
    stock: 30,
    description: 'Botella de vacío de acero inoxidable con el logo de la disquera Dim Mak de Aoki.',
    eventId: '3'
  },
  {
    id: 'm40',
    title: 'Lanyard Duki SSJ Conmemorativa',
    price: 120,
    image: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=400&q=80',
    stock: 180,
    description: 'Correa para llaves o credenciales alusiva al clásico "Super Sangre Joven" de Duki.',
    eventId: '1'
  },
  {
    id: 'm41',
    title: 'Llavero Funko Pop DJ Steve Aoki',
    price: 290,
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=400&q=80',
    stock: 50,
    description: 'Llavero oficial coleccionable de vinilo en miniatura de la figura de Steve Aoki.',
    eventId: '3'
  },
  {
    id: 'm42',
    title: 'Playera Oficial Rock in Laika',
    price: 390,
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80',
    stock: 100,
    description: 'Playera del festival de rock con todas las bandas participantes impresas en la espalda.',
    eventId: '17'
  },
  {
    id: 'm43',
    title: 'Poster Holográfico Daft Punk',
    price: 220,
    image: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?auto=format&fit=crop&w=400&q=80',
    stock: 90,
    description: 'Poster impreso sobre papel holográfico con los cascos de Daft Punk brillando en 3D.',
    eventId: '12'
  },
  {
    id: 'm44',
    title: 'Sudadera Travis Scott Astroworld',
    price: 950,
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=400&q=80',
    stock: 15,
    description: 'Sudadera conmemorativa multicolor con el lema "Wish You Were Here" bordado.',
    eventId: '20'
  },
  {
    id: 'm45',
    title: 'Gorra Eminem Rap God bordada',
    price: 350,
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=400&q=80',
    stock: 45,
    description: 'Gorra plana de hip hop color negro bordada en 3D con el texto Rap God.',
    eventId: '21'
  },
  {
    id: 'm46',
    title: 'Vaso Térmico Shakira Pies Descalzos',
    price: 320,
    image: 'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=400&q=80',
    stock: 70,
    description: 'Vaso térmico hermético de doble pared con design retro de la fundación Pies Descalzos.',
    eventId: '22'
  },
  {
    id: 'm47',
    title: 'Playera Peso Pluma Génesis',
    price: 450,
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=400&q=80',
    stock: 85,
    description: 'Playera oficial alusiva al exitoso álbum Génesis de Peso Pluma. Ajuste holgado.',
    eventId: '23'
  },
  {
    id: 'm48',
    title: 'Sudadera Bizarrap Session Oficial',
    price: 890,
    image: 'https://images.unsplash.com/photo-1609873814058-a8928924184a?auto=format&fit=crop&w=400&q=80',
    stock: 40,
    description: 'Sudadera premium unisex con capucha inspirada en las sesiones de Bizarrap.',
    eventId: '24'
  },
  {
    id: 'm49',
    title: 'Termo Justin Bieber Peaches',
    price: 480,
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80',
    stock: 60,
    description: 'Termo color melocotón de acero inoxidable con el single Peaches impreso.',
    eventId: '25'
  },
  {
    id: 'm50',
    title: 'Set de Pines Retro Laika Club',
    price: 130,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
    stock: 120,
    description: 'Juego de 5 pines metálicos esmaltados con diferentes logotipos vintage de Laika.'
  }
];

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
      return offlineEvents;
    }
  }

  /**
   * Purchase seats for an event
   */
  async purchaseTickets(
    eventId: string, 
    seats: string[], 
    price: number, 
    relatedMerch?: Array<{ id: string; title: string; price: number; quantity: number; image: string }>
  ): Promise<boolean> {
    try {
      // Simulate API call
      await apiService.post('/api/tickets/purchase', {
        event_id: eventId,
        seats: seats,
        total_amount: price
      }, { timeout: 2000 });
      
      // Keep mock synchronization
      await this.saveMockTickets(eventId, seats, price, relatedMerch);
      return true;
    } catch (e) {
      console.warn('Purchase API timed out, performing offline mock transaction.');
      await this.saveMockTickets(eventId, seats, price, relatedMerch);
      return true;
    }
  }

  private async saveMockTickets(
    eventId: string, 
    seats: string[], 
    price: number,
    relatedMerch?: Array<{ id: string; title: string; price: number; quantity: number; image: string }>
  ) {
    const events = await this.getPublicEvents();
    const event = events.find(e => e.id === eventId);
    const basePrice = event?.price || 0;
    
    let currentUserEmail = 'cliente@laikaclub.com';
    try {
      const userStr = await AsyncStorage.getItem('@laika_auth_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        currentUserEmail = user.email || 'cliente@laikaclub.com';
      }
    } catch (e) {}

    const newTickets = seats.map((seat, index) => {
      const ticketId = `TKT-${Math.floor(100 + Math.random() * 900)}`;
      const randomCode = `TKT-VALID-${Math.floor(100000 + Math.random() * 900000)}`;
      
      const row = seat.split('-')[0];
      let seatPrice = basePrice;
      let zoneName = 'General';
      if (row === 'A') {
        seatPrice = Math.round(basePrice * 1.5);
        zoneName = 'VIP';
      } else if (row === 'B' || row === 'C') {
        seatPrice = Math.round(basePrice * 1.1);
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
        status: 'valid' as const,
        related_merch: index === 0 ? relatedMerch : undefined, // Store on the first ticket to avoid repetition
        owner_email: currentUserEmail
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
      let currentUserEmail = 'cliente@laikaclub.com';
      try {
        const userStr = await AsyncStorage.getItem('@laika_auth_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          currentUserEmail = user.email || 'cliente@laikaclub.com';
        }
      } catch (err) {}
      return mockTickets.filter(t => 
        (t.owner_email === currentUserEmail) && t.status !== 'transferred'
      );
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
      return offlineMerch;
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

  /**
   * Generate a transfer code for a ticket
   */
  async transferTicket(ticketId: string): Promise<string> {
    try {
      // In a real API:
      // const response = await apiService.post(`/api/tickets/${ticketId}/transfer`);
      // return response.transfer_code;
      throw new Error("API not available");
    } catch (e) {
      // Offline fallback:
      const ticketIdx = mockTickets.findIndex(t => t.id === ticketId);
      if (ticketIdx === -1) {
        throw new Error("Boleto no encontrado.");
      }
      
      if (mockTickets[ticketIdx].status !== 'valid') {
        throw new Error("Solo se pueden transferir boletos válidos y activos.");
      }

      // Generate random code in format XFER-XXXX-XXXX
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let part1 = '';
      let part2 = '';
      for (let i = 0; i < 4; i++) {
        part1 += chars.charAt(Math.floor(Math.random() * chars.length));
        part2 += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const transferCode = `XFER-${part1}-${part2}`;

      mockTickets[ticketIdx].transfer_code = transferCode;
      await saveTicketsToStorage(mockTickets);
      return transferCode;
    }
  }

  /**
   * Claim a transferred ticket using a code
   */
  async claimTransferredTicket(transferCode: string): Promise<Ticket> {
    try {
      // In a real API:
      // return await apiService.post('/api/tickets/claim', { transfer_code: transferCode });
      throw new Error("API not available");
    } catch (e) {
      // Offline fallback:
      const code = transferCode.trim().toUpperCase();
      const ticketIdx = mockTickets.findIndex(t => t.transfer_code === code);
      
      if (ticketIdx === -1) {
        throw new Error("Código de transferencia inválido o ya utilizado.");
      }

      const ticket = mockTickets[ticketIdx];
      if (ticket.status !== 'valid') {
        throw new Error("Este boleto ya no es válido.");
      }

      // Get current claimant details
      let claimerEmail = 'cliente@laikaclub.com';
      try {
        const userStr = await AsyncStorage.getItem('@laika_auth_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          claimerEmail = user.email || 'cliente@laikaclub.com';
        }
      } catch (err) {}

      if (ticket.owner_email === claimerEmail) {
        throw new Error("No puedes canjear un boleto que ya te pertenece.");
      }

      // Find original owner name/details
      let originalOwnerName = ticket.original_owner_name || 'Otro Usuario';
      if (ticket.owner_email === 'cliente@laikaclub.com') {
        originalOwnerName = 'Lucia Usuario Final';
      } else if (ticket.owner_email === 'operador@laikaclub.com') {
        originalOwnerName = 'Carlos Operador Staff';
      } else if (ticket.owner_email === 'admin@laikaclub.com') {
        originalOwnerName = 'Adán Administrador';
      } else if (ticket.owner_email === 'jimena@laikaclub.com' || ticket.owner_email === 'gestor@laikaclub.com') {
        originalOwnerName = 'Jimena Gestor de Eventos';
      } else if (ticket.owner_email) {
        try {
          const regStr = await AsyncStorage.getItem('@laika_registered_users');
          if (regStr) {
            const users = JSON.parse(regStr);
            const foundUser = users.find((u: any) => u.email === ticket.owner_email);
            if (foundUser) {
              originalOwnerName = foundUser.name;
            }
          }
        } catch (err) {}
      }

      // Update ticket fields for transfer
      const updatedTicket: Ticket = {
        ...ticket,
        original_owner_email: ticket.owner_email,
        original_owner_name: originalOwnerName,
        owner_email: claimerEmail,
        status: 'valid', // remains valid for the new user
      };
      
      // Remove transfer code so it can't be reused
      delete updatedTicket.transfer_code;

      // Update the ticket in the mockTickets list
      mockTickets[ticketIdx] = updatedTicket;
      await saveTicketsToStorage(mockTickets);

      return updatedTicket;
    }
  }

  /**
   * Get active ticket code
   */
  async getTicketCode(): Promise<string | null> {
    const tickets = await this.getTickets();
    const active = tickets.find(t => t.status === 'valid');
    return active ? active.ticket_code : null;
  }

  /**
   * Report fall/accident to the server/mock database
   */
  async reportFall(latitude: number, longitude: number, closestVenue: string): Promise<boolean> {
    console.log(`[UsuarioService] Fall reported at coordinates: ${latitude}, ${longitude} near ${closestVenue}`);
    // Simulate server report
    return true;
  }
}

const usuarioService = new UsuarioService();
export default usuarioService;
