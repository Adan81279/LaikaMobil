import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../../styles/theme';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import usuarioService, {
  Ticket,
  RefundRequest,
  MerchOrder,
  EventOpinion,
  Artist,
  Coupon,
  EventInfo,
  UserStats
} from '../services/usuario.service';
import { Card } from '../../../components/Card';
import { Loader } from '../../../components/Loader';
import { Button } from '../../../components/Button';
import * as Haptics from 'expo-haptics';
import { EditProfileModal } from '../../../components/EditProfileModal';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { useLanguage } from '../../../context/LanguageContext';

const AVAILABLE_GENRES = ['Pop', 'Rock', 'Electrónica', 'Urbano', 'Convención', 'Indie'];

export const UserProfileScreen = () => {
  const { isDarkMode, colors, toggleTheme } = useTheme();
  const styles = getStyles(colors, isDarkMode);
  const { user, logout, savedCard, saveCardDetails, clearSavedCard } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'explore' | 'benefits'>('profile');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  // Sub-tab for history
  const [historySubTab, setHistorySubTab] = useState<'tickets' | 'merch' | 'opinions'>('tickets');

  // Loaded states from service
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [, setRefunds] = useState<RefundRequest[]>([]);
  const [merchOrders, setMerchOrders] = useState<MerchOrder[]>([]);
  const [opinions, setOpinions] = useState<EventOpinion[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [publicEvents, setPublicEvents] = useState<EventInfo[]>([]);
  const [, setStats] = useState<UserStats | null>(null);

  // Preference states
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Pop', 'Electrónica']);

  // Refund request inputs

  // Opinion review form states
  const [reviewEventId, setReviewEventId] = useState('');
  const [reviewEventTitle, setReviewEventTitle] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // QR Modal states
  const [selectedTicketForQR, setSelectedTicketForQR] = useState<Ticket | null>(null);
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);

  // Simulated notifications
  const [notifications] = useState([
    { id: '1', title: '¡Cupón de Bienvenida!', body: 'Disfruta de un 15% de descuento usando el código LAIKAFIRST.', time: 'Hace 2 horas', read: false },
    { id: '2', title: 'Compra Confirmada', body: 'Tu boleto para Duki - A.D.A. Tour ya está disponible en tu Historial.', time: 'Hace 1 día', read: true },
    { id: '3', title: 'Oferta Especial', body: 'Obtén 2x1 en la zona General para Steve Aoki - Neon Party.', time: 'Hace 3 días', read: true }
  ]);

  // Load preferences on start
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const stored = await AsyncStorage.getItem(`@laika_pref_genres_${user?.email}`);
        if (stored) {
          setSelectedGenres(JSON.parse(stored));
        }
      } catch {}
    };
    if (user) {
      loadPreferences();
    }
  }, [user]);

  // Fetch all profile details when tabs switch or screen is focused
  useEffect(() => {
    if (user && isFocused) {
      fetchProfileData();
    }
  }, [activeTab, user, isFocused]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const uTickets = await usuarioService.getMyTickets();
      const uRefunds = await usuarioService.getRefunds();
      const uOrders = await usuarioService.getMerchOrders();
      const uOpinions = await usuarioService.getOpinions();
      const uArtists = await usuarioService.getArtists();
      const uCoupons = await usuarioService.getCoupons();
      const uEvents = await usuarioService.getPublicEvents();
      const uStats = await usuarioService.getAchievements();

      setTickets(uTickets);
      setRefunds(uRefunds);
      setMerchOrders(uOrders);
      setOpinions(uOpinions);
      setArtists(uArtists);
      setCoupons(uCoupons);
      setPublicEvents(uEvents);
      setStats(uStats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.guestContainer}>
          <Ionicons name="person-circle-outline" size={80} color={colors.textMuted} style={{ marginBottom: SPACING.md }} />
          <Text style={styles.guestTitle}>{t("Mi Cuenta Laika Club")}</Text>
          <Text style={styles.guestDesc}>
            {t("Inicia sesión o regístrate para poder comprar boletos, recibir reembolsos, registrar tus pases y acceder a tu Wallet digital.")}
          </Text>
          <Button
            title={t("Iniciar Sesión / Registrarse")}
            onPress={() => router.replace('/(auth)/login' as any)}
            style={styles.guestBtn}
          />
        </View>
      </View>
    );
  }

  // Calculate Loyalty Program details
  const validTicketCount = tickets.filter(t => t.status === 'valid' || t.status === 'used').length;
  let loyaltyTier = 'Bronce';
  let nextTier = 'Plata';
  let nextTierThreshold = 3;
  let progressToNext = validTicketCount / nextTierThreshold;
  let tierColor = '#C19A6B'; // Bronze
  let tierIcon = 'ribbon-outline';

  if (validTicketCount >= 3 && validTicketCount < 6) {
    loyaltyTier = 'Plata';
    nextTier = 'Oro';
    nextTierThreshold = 6;
    progressToNext = (validTicketCount - 3) / 3;
    tierColor = '#C0C0C0'; // Silver
    tierIcon = 'shield-half-outline';
  } else if (validTicketCount >= 6) {
    loyaltyTier = 'Oro';
    nextTier = 'Máxima Categoría';
    progressToNext = 1.0;
    tierColor = '#FFD700'; // Gold
    tierIcon = 'trophy-outline';
  }

  const handleLogout = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', style: 'destructive', onPress: () => logout() }
      ]
    );
  };

  // Toggle favorite genre
  const handleToggleGenre = async (genre: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    let updated = [...selectedGenres];
    if (updated.includes(genre)) {
      updated = updated.filter(g => g !== genre);
    } else {
      updated.push(genre);
    }
    setSelectedGenres(updated);
    await AsyncStorage.setItem(`@laika_pref_genres_${user.email}`, JSON.stringify(updated));
  };

  // Toggle follow artist
  const handleToggleFollowArtist = async (artistId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    const updated = await usuarioService.toggleFollowArtist(artistId);
    setArtists(updated);
  };

  // Submit opinion/review
  const handleSubmitReview = async () => {
    if (!reviewEventId) {
      Alert.alert('Evento requerido', 'Por favor selecciona un concierto de tu lista.');
      return;
    }
    if (!reviewComment.trim()) {
      Alert.alert('Comentario vacío', 'Por favor escribe tu opinión.');
      return;
    }

    setLoading(true);
    try {
      const success = await usuarioService.submitOpinion(reviewEventId, reviewEventTitle, reviewRating, reviewComment);
      if (success) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        Alert.alert('Opinión Registrada', '¡Gracias por compartir tu reseña! Recibiste +40 XP.');
        setReviewComment('');
        setReviewEventId('');
        // Reload
        const uOpinions = await usuarioService.getOpinions();
        const uStats = await usuarioService.getAchievements();
        setOpinions(uOpinions);
        setStats(uStats);
      }
    } catch {
      Alert.alert('Error', 'No se pudo enviar tu reseña.');
    } finally {
      setLoading(false);
    }
  };

  // Save demo card
  const handleRegisterDemoCard = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    saveCardDetails({
      number: '4242424242424242',
      expiry: '12/29',
      cvv: '123',
      name: user.name || 'Titular de la Cuenta',
    });
    Alert.alert('Tarjeta Registrada', 'Se ha guardado una tarjeta de pruebas exitosamente.');
  };

  // Remove saved card
  const handleRemoveCard = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    Alert.alert(
      'Eliminar Tarjeta',
      '¿Deseas desvincular tu tarjeta del perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => {
          clearSavedCard();
          Alert.alert('Tarjeta Eliminada', 'Tus métodos de pago han sido borrados de tu perfil.');
        }}
      ]
    );
  };

  // Copy Coupon Code
  const handleCopyCoupon = (code: string) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    Alert.alert('Código Copiado', `¡El cupón "${code}" ha sido copiado al portapapeles!`);
  };

  // Filter recommended events dynamically
  const recommendedEvents = publicEvents.filter(e => {
    // Matches followed artists OR selected genres
    const artistMatch = artists.some(art => art.isFollowing && art.upcomingShow === e.title);
    const genreMatch = selectedGenres.includes(e.category);
    return artistMatch || genreMatch;
  });

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.profileMeta}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              setIsEditModalVisible(true);
            }}
            style={styles.avatarCircle}
          >
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={10} color={colors.background} />
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.name || t('Usuario Laika')}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'usuario@laikaclub.com'}</Text>
          </View>

          {/* Loyalty Level Quick Indicator */}
          <View style={[styles.loyaltyBadgeSmall, { borderColor: tierColor }]}>
            <Ionicons name={tierIcon as any} size={14} color={tierColor} />
            <Text style={[styles.loyaltyTextSmall, { color: tierColor }]}>
              {t('Socio')} {t(loyaltyTier)}
            </Text>
          </View>
        </View>

        {/* Tab row navigation */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'profile' && styles.tabBtnActive]}
            onPress={() => setActiveTab('profile')}
          >
            <Ionicons name="cog-outline" size={16} color={activeTab === 'profile' ? colors.background : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
              {t('Ajustes')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons name="receipt-outline" size={16} color={activeTab === 'history' ? colors.background : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              {t('Historial')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'explore' && styles.tabBtnActive]}
            onPress={() => setActiveTab('explore')}
          >
            <Ionicons name="compass-outline" size={16} color={activeTab === 'explore' ? colors.background : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'explore' && styles.tabTextActive]}>
              {t('Descubrir')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'benefits' && styles.tabBtnActive]}
            onPress={() => setActiveTab('benefits')}
          >
            <Ionicons name="gift-outline" size={16} color={activeTab === 'benefits' ? colors.background : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'benefits' && styles.tabTextActive]}>
              {t('Beneficios')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Loader if fetching */}
        {loading && <Loader visible={true} message={t("Cargando perfil...")} />}

        {/* Loyalty Progress Banner (Rendered at top of scroll view for context) */}
        <Card style={styles.loyaltyCard}>
          <View style={styles.loyaltyHeader}>
            <View style={[styles.loyaltyIconBg, { backgroundColor: `${tierColor}15` }]}>
              <Ionicons name={tierIcon as any} size={24} color={tierColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.loyaltyLabel}>{t('PROGRAMA DE FIDELIDAD LAIKA CLUB')}</Text>
              <Text style={styles.loyaltyTitle}>{t('Socio Nivel')} {t(loyaltyTier)}</Text>
            </View>
            <View style={styles.loyaltyCountBadge}>
              <Text style={styles.loyaltyCountText}>{validTicketCount} {t('Shows')}</Text>
            </View>
          </View>
          <Text style={styles.loyaltyDesc}>
            {loyaltyTier === 'Bronce' && t('¡Asiste a 3 eventos para subir a Socio Plata y recibir preventas anticipadas!')}
            {loyaltyTier === 'Plata' && t('¡Asiste a 6 eventos para ser Socio Oro, obtener 10% de descuento en el Bazar y fila rápida!')}
            {loyaltyTier === 'Oro' && t('¡Felicidades! Tienes preventas exclusivas, 10% de descuento en Bazaar y acceso VIP.')}
          </Text>
          
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressLabel}>{t('Progreso al nivel')} {t(nextTier)}</Text>
              <Text style={styles.progressVal}>{Math.min(validTicketCount, nextTierThreshold)} / {nextTierThreshold} {t('Shows')}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressToNext * 100}%`, backgroundColor: tierColor }]} />
            </View>
          </View>
        </Card>

        {/* TAB 1: PROFILE / SETTINGS */}
        {activeTab === 'profile' && (
          <View style={styles.tabContent}>
            {/* Account Settings */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t('Ajustes de Perfil')}</Text>
              <TouchableOpacity
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  setIsEditModalVisible(true);
                }}
                style={styles.editLink}
              >
                <Ionicons name="create-outline" size={14} color={colors.primary} />
                <Text style={styles.editLinkText}>{t('Editar Perfil')}</Text>
              </TouchableOpacity>
            </View>
            <Card>
              <View style={styles.settingsRow}>
                <Ionicons name="person-outline" size={18} color={colors.primary} />
                <View style={styles.settingsMeta}>
                  <Text style={styles.settingsLabel}>{t('Nombre de usuario')}</Text>
                  <Text style={styles.settingsVal}>{user?.name || t('Usuario')}</Text>
                </View>
              </View>
              <View style={styles.settingsRow}>
                <Ionicons name="mail-outline" size={18} color={colors.primary} />
                <View style={styles.settingsMeta}>
                  <Text style={styles.settingsLabel}>{t('Correo electrónico')}</Text>
                  <Text style={styles.settingsVal}>{user?.email || 'usuario@laika.com'}</Text>
                </View>
              </View>
              <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
                <Ionicons name="key-outline" size={18} color={colors.primary} />
                <View style={styles.settingsMeta}>
                  <Text style={styles.settingsLabel}>{t('Rol en el sistema')}</Text>
                  <Text style={[styles.settingsVal, { textTransform: 'uppercase', color: colors.success }]}>
                    {t(user?.role || 'usuario')}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Preferencia de Tema */}
            <Text style={[styles.sectionTitle, { marginTop: SPACING.sm }]}>{t('Preferencia de Tema')}</Text>
            <Card style={{ paddingVertical: 4 }}>
              <TouchableOpacity style={[styles.settingsRow, { borderBottomWidth: 0, paddingVertical: SPACING.sm }]} onPress={toggleTheme}>
                <Ionicons name={isDarkMode ? 'moon-outline' : 'sunny-outline'} size={18} color={colors.primary} />
                <View style={styles.settingsMeta}>
                  <Text style={styles.settingsLabel}>{t('Modo de visualización')}</Text>
                  <Text style={styles.settingsVal}>{isDarkMode ? t('Oscuro (Monocromático)') : t('Claro (Monocromático)')}</Text>
                </View>
                <Ionicons name="swap-horizontal-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </Card>

            {/* Preferencia de Idioma */}
            <Text style={[styles.sectionTitle, { marginTop: SPACING.sm }]}>{t('Preferencia de Idioma')}</Text>
            <Card style={{ paddingVertical: 4 }}>
              <TouchableOpacity 
                style={[styles.settingsRow, { borderBottomWidth: 0, paddingVertical: SPACING.sm }]} 
                onPress={async () => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                  await setLanguage(language === 'es' ? 'en' : 'es');
                }}
              >
                <Ionicons name="language-outline" size={18} color={colors.primary} />
                <View style={styles.settingsMeta}>
                  <Text style={styles.settingsLabel}>{t('Idioma de la aplicación')}</Text>
                  <Text style={styles.settingsVal}>{language === 'es' ? 'Español' : 'English'}</Text>
                </View>
                <Ionicons name="swap-horizontal-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </Card>

            {/* Payment Method Manager */}
            <Text style={[styles.sectionTitle, { marginTop: SPACING.sm }]}>{t('Métodos de Pago Guardados')}</Text>
            <Card>
              {savedCard ? (
                <View style={styles.savedCardContainer}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardHeaderLeft}>
                      <Ionicons name="card" size={24} color={colors.primary} />
                      <Text style={styles.cardInfoBrand}>{t('Visa •••• ')}{savedCard.number.slice(-4)}</Text>
                    </View>
                    <TouchableOpacity onPress={handleRemoveCard} style={styles.deleteCardBtn}>
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.cardDetailsRow}>
                    <View>
                      <Text style={styles.cardDetailsLabel}>{t('TITULAR')}</Text>
                      <Text style={styles.cardDetailsText}>
                        {(savedCard.name || savedCard.holder || t('Titular de la Cuenta')).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.cardDetailsLabel}>{t('VENCE')}</Text>
                      <Text style={styles.cardDetailsText}>{savedCard.expiry}</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.noCardContainer}>
                  <Ionicons name="card-outline" size={32} color={colors.textMuted} style={{ marginBottom: 4 }} />
                  <Text style={styles.noCardTitle}>{t('No tienes tarjetas guardadas')}</Text>
                  <Text style={styles.noCardDesc}>
                    {t('Para guardar una tarjeta haz una compra de boletos o registra una tarjeta de pruebas aquí.')}
                  </Text>
                  <Button
                    title={t('Vincular Tarjeta Demo')}
                    variant="secondary"
                    onPress={handleRegisterDemoCard}
                    style={{ marginTop: SPACING.md }}
                  />
                </View>
              )}
            </Card>

            {/* Musical Preferences Selector */}
            <Text style={[styles.sectionTitle, { marginTop: SPACING.sm }]}>{t('Géneros Musicales Preferidos')}</Text>
            <Card>
              <Text style={styles.cardDesc}>
                {t('Selecciona tus géneros favoritos para que podamos recomendarte eventos alineados a tus gustos.')}
              </Text>
              <View style={styles.genresContainer}>
                {AVAILABLE_GENRES.map((genre) => {
                  const active = selectedGenres.includes(genre);
                  return (
                    <TouchableOpacity
                      key={genre}
                      style={[styles.genreTag, active && styles.genreTagActive]}
                      onPress={() => handleToggleGenre(genre)}
                    >
                      <Ionicons
                        name={active ? 'checkmark-circle' : 'add-circle-outline'}
                        size={12}
                        color={active ? colors.background : colors.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.genreTagText, active && styles.genreTagTextActive]}>
                        {t(genre)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            <Button
              title={t('Cerrar Sesión')}
              variant="danger"
              onPress={handleLogout}
              icon={<Ionicons name="log-out-outline" size={18} color={colors.background} />}
              style={styles.logoutBtn}
            />
          </View>
        )}

        {/* TAB 2: HISTORY & REVIEWS */}
        {activeTab === 'history' && (
          <View style={styles.tabContent}>
            {/* Segmented control for history subtab */}
            <View style={styles.subTabContainer}>
              <TouchableOpacity
                style={[styles.subTabBtn, historySubTab === 'tickets' && styles.subTabBtnActive]}
                onPress={() => setHistorySubTab('tickets')}
              >
                <Text style={[styles.subTabText, historySubTab === 'tickets' && styles.subTabTextActive]}>
                  {t('Boletos')} ({tickets.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, historySubTab === 'merch' && styles.subTabBtnActive]}
                onPress={() => setHistorySubTab('merch')}
              >
                <Text style={[styles.subTabText, historySubTab === 'merch' && styles.subTabTextActive]}>
                  {t('Bazar')} ({merchOrders.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, historySubTab === 'opinions' && styles.subTabBtnActive]}
                onPress={() => setHistorySubTab('opinions')}
              >
                <Text style={[styles.subTabText, historySubTab === 'opinions' && styles.subTabTextActive]}>
                  {t('Calificar Eventos')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Subtab content: TICKETS */}
            {historySubTab === 'tickets' && (
              <View style={{ gap: SPACING.md }}>
                {tickets.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <Text style={styles.emptyText}>{t('No has comprado boletos aún.')}</Text>
                  </Card>
                ) : (
                  tickets.map((tkt) => (
                    <Card key={tkt.id} style={styles.ticketHistoryCard}>
                      <View style={styles.ticketHistoryHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.ticketEventTitle} numberOfLines={1}>{t(tkt.event_title || tkt.event_name || tkt.eventName || 'Espectáculo')}</Text>
                          <Text style={styles.ticketVenue}>{t(tkt.venue_name || tkt.venue || 'Recinto Central')}</Text>
                        </View>
                        <Text style={[
                           styles.ticketStatusText,
                           tkt.status === 'valid' ? styles.statusValid :
                           tkt.status === 'used' ? styles.statusUsed : styles.statusRefunded
                        ]}>
                          {tkt.status === 'valid' ? t('VIGENTE') :
                           tkt.status === 'used' ? t('CANJEADO') : t('REEMBOLSADO')}
                        </Text>
                      </View>
                      <View style={styles.ticketMetaGrid}>
                        <View>
                          <Text style={styles.metaLabel}>{t('FECHA Y HORA')}</Text>
                          <Text style={styles.metaText}>{(tkt.date || tkt.event_date || 'Fecha')} | {(tkt.time || tkt.event_time || 'N/A')}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.metaLabel}>{t('ASIENTO')}</Text>
                          <Text style={styles.metaText}>{tkt.seat_label || tkt.seat_id || 'N/A'}</Text>
                        </View>
                      </View>
                      {tkt.related_merch && tkt.related_merch.length > 0 && (
                        <View style={{ marginTop: SPACING.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: SPACING.sm }}>
                          <Text style={[styles.metaLabel, { marginBottom: 4 }]}>{t('SOUVENIRS ADQUIRIDOS')}</Text>
                          {tkt.related_merch.map((m, idx) => (
                            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                                • {t(m.title)} (x{m.quantity})
                              </Text>
                              <Text style={{ color: colors.background, fontSize: 11, fontWeight: 'bold' }}>
                                ${m.price * m.quantity} MXN
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {tkt.status === 'valid' && (
                        <Button
                          title={t('Ver Código QR Acceso')}
                          variant="secondary"
                          icon={<Ionicons name="qr-code-outline" size={14} color={colors.background} />}
                          onPress={() => {
                            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                            setSelectedTicketForQR(tkt);
                            setIsQRModalVisible(true);
                          }}
                          style={{ marginTop: SPACING.sm }}
                        />
                      )}
                    </Card>
                  ))
                )}
              </View>
            )}

            {/* Subtab content: BAZAR SOUVENIRS */}
            {historySubTab === 'merch' && (
              <View style={{ gap: SPACING.md }}>
                {merchOrders.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <Text style={styles.emptyText}>{t('No tienes pedidos del Bazar.')}</Text>
                  </Card>
                ) : (
                  merchOrders.map((ord) => (
                    <Card key={ord.id} style={styles.orderCard}>
                      <View style={styles.orderHeader}>
                        <Text style={styles.orderId}>{t('Código:')} {ord.id}</Text>
                        <View style={[
                          styles.orderStatusBadge,
                          ord.status === 'delivered' ? styles.orderStatusDelivered : styles.orderStatusPreparing
                        ]}>
                          <Text style={styles.orderStatusText}>
                            {ord.status === 'delivered' ? t('ENTREGADO') : t('PREPARANDO')}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.orderDate}>{t('Fecha:')} {new Date(ord.purchased_at).toLocaleDateString()}</Text>

                      {ord.items.map((it, index) => (
                        <View key={index} style={styles.orderItemRow}>
                          <Image source={{ uri: it.image }} style={styles.orderItemThumb} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.orderItemTitle}>{t(it.title)}</Text>
                            <Text style={styles.orderItemQuantity}>{t('Cantidad')}: {it.quantity} | ${it.price} c/u</Text>
                          </View>
                          <Text style={styles.orderItemSubtotal}>${it.price * it.quantity}</Text>
                        </View>
                      ))}

                      <View style={styles.orderFooter}>
                        <Text style={styles.orderTotalLabel}>{t('TOTAL DE COMPRA')}</Text>
                        <Text style={styles.orderTotalVal}>${ord.total}</Text>
                      </View>
                    </Card>
                  ))
                )}
              </View>
            )}

            {/* Subtab content: CALIFICAR EVENTOS (LOCKED TO PURCHASERS) */}
            {historySubTab === 'opinions' && (
              <View style={{ gap: SPACING.md }}>
                <Text style={styles.cardDesc}>
                  {t('Únicamente las personas que compraron boletos para un concierto y ya asistieron pueden calificar y dejar su opinión pública.')}
                </Text>

                {/* Submit new review section */}
                <Card style={{ gap: SPACING.sm }}>
                  <Text style={styles.inputLabel}>{t('Seleccionar Evento Comprado')}</Text>
                  <View style={styles.pickerContainer}>
                    {tickets.length === 0 ? (
                      <Text style={styles.pickerPlaceholder}>{t('No has comprado boletos para ningún evento')}</Text>
                    ) : (
                      tickets.map((tkt) => (
                        <TouchableOpacity
                          key={tkt.id}
                          style={[
                            styles.pickerItem,
                            reviewEventId === tkt.event_id && styles.pickerItemActive,
                          ]}
                          onPress={() => {
                            setReviewEventId(tkt.event_id);
                            setReviewEventTitle(tkt.event_title);
                          }}
                        >
                          <Text
                            style={[
                              styles.pickerItemText,
                              reviewEventId === tkt.event_id && styles.pickerItemTextActive,
                            ]}
                          >
                            {t(tkt.event_title)} ({tkt.seat_label})
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>

                  {/* Star Rating Grid */}
                  <Text style={[styles.inputLabel, { marginTop: SPACING.sm }]}>Calificación del Evento</Text>
                  <View style={styles.ratingStarsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => {
                          try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                          setReviewRating(star);
                        }}
                      >
                        <Ionicons
                          name={star <= reviewRating ? 'star' : 'star-outline'}
                          size={28}
                          color={star <= reviewRating ? colors.success : colors.textMuted}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Comment input */}
                  <Text style={[styles.inputLabel, { marginTop: SPACING.sm }]}>Comentario / Opinión</Text>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={3}
                    placeholder={t("Comparte tu experiencia acerca del show, audio del recinto, organización...")}
                    placeholderTextColor={colors.textMuted}
                    value={reviewComment}
                    onChangeText={setReviewComment}
                  />

                  <Button
                    title={t("Publicar Calificación")}
                    disabled={tickets.length === 0 || !reviewEventId}
                    onPress={handleSubmitReview}
                    style={{ marginTop: SPACING.sm }}
                  />
                </Card>

                {/* Opinions history list */}
                <Text style={[styles.sectionTitle, { marginTop: SPACING.sm }]}>{t("Mis Opiniones Enviadas")}</Text>
                {opinions.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <Text style={styles.emptyText}>{t("No has enviado ninguna opinión aún.")}</Text>
                  </Card>
                ) : (
                  opinions.map((op) => (
                    <Card key={op.id} style={styles.opinionHistoryCard}>
                      <View style={styles.opinionHeaderRow}>
                        <Text style={styles.opinionEvent} numberOfLines={1}>{t(op.event_title)}</Text>
                        <View style={styles.opinionStars}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Ionicons
                              key={star}
                              name={star <= op.rating ? 'star' : 'star-outline'}
                              size={10}
                              color={star <= op.rating ? colors.success : colors.textMuted}
                            />
                          ))}
                        </View>
                      </View>
                      <Text style={styles.opinionComment}>{"\u201C"}{op.comment}{"\u201D"}</Text>
                      <Text style={styles.opinionMeta}>{t("Enviado el:")} {new Date(op.created_at).toLocaleDateString()}</Text>
                    </Card>
                  ))
                )}
              </View>
            )}
          </View>
        )}

        {/* TAB 3: EXPLORE & RECOMMENDATIONS */}
        {activeTab === 'explore' && (
          <View style={styles.tabContent}>
            {/* Followed Artists */}
            <Text style={styles.sectionTitle}>{t("Artistas que sigo")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistsScrollContainer}>
              {artists.map((art) => (
                <View key={art.id} style={styles.artistCard}>
                  <Image source={{ uri: art.image }} style={styles.artistThumb} />
                  <Text style={styles.artistName}>{t(art.name)}</Text>
                  <Text style={styles.artistGenre}>{t(art.genre)}</Text>
                  
                  {art.upcomingShow && art.isFollowing && (
                    <View style={styles.alertTourBadge}>
                      <Text style={styles.alertTourText}>{t("¡De Gira!")}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.artistFollowBtn, art.isFollowing && styles.artistFollowBtnActive]}
                    onPress={() => handleToggleFollowArtist(art.id)}
                  >
                    <Ionicons
                      name={art.isFollowing ? 'checkmark-done-circle' : 'add-outline'}
                      size={12}
                      color={art.isFollowing ? colors.success : colors.background}
                    />
                    <Text style={[styles.artistFollowText, art.isFollowing && styles.artistFollowTextActive]}>
                      {art.isFollowing ? t('Siguiendo') : t('Seguir')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            {/* Recommended Concerts (Matching genres or followed artists) */}
            <Text style={[styles.sectionTitle, { marginTop: SPACING.sm }]}>
              {t("Recomendados para ti")} ({recommendedEvents.length})
            </Text>
            {recommendedEvents.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  {t("Selecciona más géneros musicales en tus Ajustes o sigue artistas para recibir recomendaciones personalizadas.")}
                </Text>
              </Card>
            ) : (
              recommendedEvents.map((ev) => (
                <TouchableOpacity
                  key={ev.id}
                  style={styles.recomCard}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/(tabs)/index` as any)} // Goes back to explore
                >
                  <Image source={{ uri: ev.image }} style={styles.recomImage} />
                  <View style={styles.recomMetaContainer}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.recomCategoryRow}>
                        <Text style={styles.recomCategory}>{t(ev.category)}</Text>
                        <Text style={styles.recomDate}>{ev.date}</Text>
                      </View>
                      <Text style={styles.recomTitle} numberOfLines={1}>{t(ev.title)}</Text>
                      <Text style={styles.recomVenue}>{t(ev.venue)}</Text>
                    </View>
                    <View style={styles.recomPriceBadge}>
                      <Text style={styles.recomPriceLabel}>{t("DESDE")}</Text>
                      <Text style={styles.recomPriceVal}>${ev.price}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* TAB 4: BENEFITS & COUPONS */}
        {activeTab === 'benefits' && (
          <View style={styles.tabContent}>
            {/* Active coupons list */}
            <Text style={styles.sectionTitle}>{t("Mis Cupones de Descuento")}</Text>
            {coupons.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>{t("No tienes cupones de descuento disponibles.")}</Text>
              </Card>
            ) : (
              coupons.map((c) => (
                <View key={c.code} style={styles.couponTicket}>
                  <View style={styles.couponLeft}>
                    <Text style={styles.couponDisc}>{c.discount}%</Text>
                    <Text style={styles.couponDiscSub}>OFF</Text>
                  </View>
                  <View style={styles.couponMiddle}>
                    <Text style={styles.couponCode}>{c.code}</Text>
                    <Text style={styles.couponDescrip}>{t(c.description)}</Text>
                    <Text style={styles.couponExpiry}>{t("Expira:")} {c.expiry}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleCopyCoupon(c.code)} style={styles.couponCopyBtn}>
                    <Ionicons name="copy-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* Flash Deals / Special Promos */}
            <Text style={[styles.sectionTitle, { marginTop: SPACING.sm }]}>{t("Ofertas Relámpago y Promociones")}</Text>
            <Card style={styles.dealCard}>
              <View style={styles.dealHeaderRow}>
                <View style={styles.dealHeaderBadge}>
                  <Text style={styles.dealBadgeText}>{t("OFERTA 2X1")}</Text>
                </View>
                <Text style={styles.dealExpiryText}>{t("Expira en 4h")}</Text>
              </View>
              <Text style={styles.dealTitle}>{t("Doble Diversión en Electrónica")}</Text>
              <Text style={styles.dealDesc}>
                {t("Compra 1 boleto para Steve Aoki - Neon Party en zona general y recibe el segundo completamente gratis. ¡Promoción por tiempo limitado!")}
              </Text>
              <Button
                title={t("Aprovechar 2x1")}
                variant="primary"
                onPress={() => router.push('/(tabs)/index' as any)}
                style={{ marginTop: SPACING.md }}
              />
            </Card>

            {/* Notifications Inbox */}
            <Text style={[styles.sectionTitle, { marginTop: SPACING.sm }]}>{t("Bandeja de Notificaciones")}</Text>
            <Card>
              {notifications.map((not) => (
                <View key={not.id} style={styles.notificationRow}>
                  <View style={styles.notHeaderRow}>
                    <View style={styles.notTitleWrapper}>
                      {!not.read && <View style={styles.unreadDot} />}
                      <Text style={[styles.notTitle, !not.read && styles.notTitleUnread]}>{t(not.title)}</Text>
                    </View>
                    <Text style={styles.notTime}>{not.time}</Text>
                  </View>
                  <Text style={styles.notBody}>{t(not.body)}</Text>
                </View>
              ))}
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Ticket QR Modal */}
      {selectedTicketForQR && (
        <Modal
          visible={isQRModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsQRModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setIsQRModalVisible(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("Boleto Digital Acceso")}</Text>
                <TouchableOpacity onPress={() => setIsQRModalVisible(false)}>
                  <Ionicons name="close-circle" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.qrContainer}>
                <Text style={styles.qrEventTitle}>{t(selectedTicketForQR.event_title || selectedTicketForQR.event_name || selectedTicketForQR.eventName || 'Espectáculo')}</Text>
                <Text style={styles.qrVenue}>{t(selectedTicketForQR.venue_name || selectedTicketForQR.venue || 'Recinto Central')}</Text>
                
                {/* Simulated QR Code structure */}
                <View style={styles.qrBox}>
                  <Ionicons name="qr-code" size={160} color="#000000" />
                  <View style={styles.qrScannerHelper} />
                </View>

                <View style={styles.qrMetaRow}>
                  <View>
                    <Text style={styles.qrMetaLabel}>{t("ASIENTO")}</Text>
                    <Text style={styles.qrMetaVal}>{selectedTicketForQR.seat_label || selectedTicketForQR.seat_id || 'N/A'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.qrMetaLabel}>{t("CÓDIGO")}</Text>
                    <Text style={styles.qrMetaVal}>{selectedTicketForQR.ticket_code}</Text>
                  </View>
                </View>

                <View style={styles.instructionBox}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                  <Text style={styles.instructionText}>
                    {t("Presenta este código en el escáner del recinto. Se recomienda brillo de pantalla al máximo.")}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal visible={isEditModalVisible} onClose={() => setIsEditModalVisible(false)} />
    </View>
  );
};

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.surfaceAlt,
    paddingTop: 45,
  },
  profileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  avatarCircle: {
    backgroundColor: colors.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  avatarEditBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    backgroundColor: colors.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.background,
  },
  avatarInitial: {
    color: colors.background,
    fontSize: TYPOGRAPHY.fontSizes.md + 2,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  profileName: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  profileEmail: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  loyaltyBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.round,
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  loyaltyTextSmall: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    textTransform: 'uppercase',
  },
  tabsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: colors.surfaceAlt,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    flexDirection: 'column',
    gap: 3,
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  scrollContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  tabContent: {
    gap: SPACING.md,
  },
  loyaltyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  loyaltyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  loyaltyIconBg: {
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loyaltyLabel: {
    fontSize: 8,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  loyaltyTitle: {
    fontSize: TYPOGRAPHY.fontSizes.md - 1,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
    marginTop: 1,
  },
  loyaltyCountBadge: {
    backgroundColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.sm,
  },
  loyaltyCountText: {
    fontSize: 9,
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  loyaltyDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 14,
    marginBottom: SPACING.md,
  },
  progressBarWrapper: {
    marginTop: SPACING.xs,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 9,
    color: colors.textMuted,
  },
  progressVal: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editLinkText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderColor: colors.surfaceAlt,
    gap: SPACING.md,
  },
  settingsMeta: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 9,
    color: colors.textMuted,
  },
  settingsVal: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  logoutBtn: {
    marginTop: SPACING.sm,
  },
  savedCardContainer: {
    padding: SPACING.xs,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cardInfoBrand: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  deleteCardBtn: {
    padding: 4,
  },
  cardDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDetailsLabel: {
    fontSize: 7,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  cardDetailsText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  noCardContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  noCardTitle: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    marginTop: 4,
  },
  noCardDesc: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: SPACING.lg,
    lineHeight: 12,
  },
  cardDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 14,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  genreTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BORDER_RADIUS.round,
  },
  genreTagActive: {
    backgroundColor: colors.primary,
  },
  genreTagText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  genreTagTextActive: {
    color: colors.background,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: 4,
    gap: 4,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  subTabBtnActive: {
    backgroundColor: colors.surfaceAlt,
  },
  subTabText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  subTabTextActive: {
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  emptyCard: {
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },
  ticketHistoryCard: {
    backgroundColor: colors.surface,
  },
  ticketHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  ticketEventTitle: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  ticketVenue: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ticketStatusText: {
    fontSize: 8,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusValid: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: colors.success,
  },
  statusUsed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: colors.textMuted,
  },
  statusRefunded: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: colors.error,
  },
  ticketMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 7,
    color: colors.textMuted,
  },
  metaText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
    marginTop: 1,
  },
  orderCard: {
    backgroundColor: colors.surface,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  orderStatusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BORDER_RADIUS.sm,
  },
  orderStatusPreparing: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  orderStatusDelivered: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  orderStatusText: {
    fontSize: 8,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  orderDate: {
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: SPACING.md,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  orderItemThumb: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: colors.border,
  },
  orderItemTitle: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  orderItemQuantity: {
    fontSize: 8,
    color: colors.textSecondary,
    marginTop: 1,
  },
  orderItemSubtotal: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  orderTotalLabel: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textSecondary,
  },
  orderTotalVal: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.primary,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textSecondary,
    marginBottom: SPACING.xs,
  },
  pickerContainer: {
    gap: SPACING.xs,
  },
  pickerPlaceholder: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
  },
  pickerItem: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  pickerItemActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderColor: colors.primary,
    borderWidth: 1,
  },
  pickerItemText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  pickerItemTextActive: {
    color: colors.background,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  ratingStarsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginVertical: SPACING.xs,
  },
  textArea: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    color: colors.textPrimary,
    fontSize: 10,
    minHeight: 65,
    textAlignVertical: 'top',
  },
  opinionHistoryCard: {
    backgroundColor: colors.surface,
  },
  opinionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  opinionEvent: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
    flex: 1,
  },
  opinionStars: {
    flexDirection: 'row',
    gap: 2,
  },
  opinionComment: {
    fontSize: 10,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  opinionMeta: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 4,
  },
  artistsScrollContainer: {
    gap: SPACING.sm,
  },
  artistCard: {
    width: 100,
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    borderColor: colors.surfaceAlt,
    borderWidth: 1,
    position: 'relative',
  },
  artistThumb: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surfaceAlt,
    marginBottom: SPACING.xs,
  },
  artistName: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  artistGenre: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 1,
  },
  alertTourBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingVertical: 1,
    paddingHorizontal: 4,
  },
  alertTourText: {
    fontSize: 6,
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  artistFollowBtn: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.sm,
  },
  artistFollowBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  artistFollowText: {
    fontSize: 8,
    color: colors.textPrimary,
  },
  artistFollowTextActive: {
    color: colors.success,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  recomCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderColor: colors.surfaceAlt,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  recomImage: {
    width: '100%',
    height: 100,
    backgroundColor: colors.surfaceAlt,
  },
  recomMetaContainer: {
    flexDirection: 'row',
    padding: SPACING.sm,
    alignItems: 'center',
  },
  recomCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  recomCategory: {
    fontSize: 8,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  recomDate: {
    fontSize: 8,
    color: colors.textMuted,
  },
  recomTitle: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  recomVenue: {
    fontSize: 8,
    color: colors.textSecondary,
    marginTop: 1,
  },
  recomPriceBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  recomPriceLabel: {
    fontSize: 6,
    color: colors.textMuted,
  },
  recomPriceVal: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  couponTicket: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  couponLeft: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.2)',
    borderStyle: 'dashed',
  },
  couponDisc: {
    fontSize: 16,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.primary,
  },
  couponDiscSub: {
    fontSize: 8,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.primary,
  },
  couponMiddle: {
    flex: 1,
    padding: SPACING.sm,
  },
  couponCode: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  couponDescrip: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
  },
  couponExpiry: {
    fontSize: 7,
    color: colors.textMuted,
    marginTop: 4,
  },
  couponCopyBtn: {
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dealCard: {
    backgroundColor: isDarkMode ? '#181124' : '#F3E8FF',
    borderColor: isDarkMode ? '#37185e' : '#C084FC',
    borderWidth: 1,
  },
  dealHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  dealHeaderBadge: {
    backgroundColor: colors.error,
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  dealBadgeText: {
    fontSize: 8,
    color: colors.background,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  dealExpiryText: {
    fontSize: 8,
    color: colors.textMuted,
  },
  dealTitle: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  dealDesc: {
    fontSize: 9,
    color: colors.textSecondary,
    lineHeight: 13,
    marginTop: 2,
  },
  notificationRow: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderColor: colors.surfaceAlt,
  },
  notHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  notTitle: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  notTitleUnread: {
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  notTime: {
    fontSize: 8,
    color: colors.textMuted,
  },
  notBody: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 12,
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: colors.background,
  },
  guestTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: SPACING.sm,
  },
  guestDesc: {
    fontSize: TYPOGRAPHY.fontSizes.sm - 1,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  guestBtn: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    width: '100%',
    maxWidth: 320,
    borderColor: colors.border,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  qrContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  qrEventTitle: {
    fontSize: 14,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  qrVenue: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginVertical: SPACING.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  qrScannerHelper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
    opacity: 0.7,
  },
  qrMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    borderTopWidth: 1,
    borderColor: colors.surfaceAlt,
    paddingTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  qrMetaLabel: {
    fontSize: 7,
    color: colors.textMuted,
  },
  qrMetaVal: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  instructionBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(79, 70, 229, 0.05)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  instructionText: {
    fontSize: 8.5,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 12,
  },
});

export default UserProfileScreen;
