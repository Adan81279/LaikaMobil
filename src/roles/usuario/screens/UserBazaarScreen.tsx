import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../styles/theme';
import usuarioService, { MerchItem } from '../services/usuario.service';
import Card from '../../../components/Card';
import Loader from '../../../components/Loader';
import Button from '../../../components/Button';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export const UserBazaarScreen = () => {
  const { isDarkMode, colors } = useTheme();
  const { t } = useLanguage();
  const styles = getStyles(colors, isDarkMode);
  const { user } = useAuth();
  const router = useRouter();
  const isFocused = useIsFocused();
  const [items, setItems] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCartEventIds, setActiveCartEventIds] = useState<string[]>([]);

  // Cart State (dict of itemId -> quantity)
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  useEffect(() => {
    fetchMerch();
  }, []);

  useEffect(() => {
    if (isFocused) {
      loadActiveCartFilters();
    }
  }, [isFocused]);

  const loadActiveCartFilters = async () => {
    try {
      const stored = await AsyncStorage.getItem('@Laika:cart_event_ids');
      if (stored) {
        setActiveCartEventIds(JSON.parse(stored));
      } else {
        setActiveCartEventIds([]);
      }
    } catch (e) {
      console.error('Error loading cart event filters', e);
    }
  };

  const handleResetFilters = async () => {
    try {
      await AsyncStorage.removeItem('@Laika:cart_event_ids');
      setActiveCartEventIds([]);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMerch = async () => {
    setLoading(true);
    try {
      const data = await usuarioService.getMerchandise();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (itemId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  const removeFromCart = (itemId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    setCart((prev) => {
      const current = prev[itemId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: current - 1,
      };
    });
  };

  const clearCart = () => {
    setCart({});
  };

  const getCartTotalItems = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  };

  const getCartTotalPrice = () => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const item = items.find((i) => i.id === id);
      return sum + (item ? item.price * qty : 0);
    }, 0);
  };

  const handleCheckout = async () => {
    if (getCartTotalItems() === 0) return;
    
    if (!user) {
      Alert.alert(
        t('Inicio de Sesión Requerido'),
        t('Para realizar compras de mercancía es necesario estar registrado e iniciar sesión.'),
        [
          { text: t('Cancelar'), style: 'cancel' },
          { text: t('Iniciar Sesión'), onPress: () => {
            setCartOpen(false);
            router.replace('/(auth)/login' as any);
          }}
        ]
      );
      return;
    }
    
    setLoading(true);
    try {
      const orderItems = Object.entries(cart).map(([id, qty]) => ({
        item: items.find((i) => i.id === id)!,
        quantity: qty,
      }));
      
      const success = await usuarioService.purchaseMerchandise(orderItems, getCartTotalPrice());
      if (success) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (h) {}
        setPurchaseSuccess(true);
        setCart({});
      } else {
        Alert.alert(t('Error'), t('No se pudo registrar la compra de mercancía.'));
      }
    } catch (err) {
      Alert.alert(t('Error de red'), t('La compra no pudo ser transmitida.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCart = () => {
    setCartOpen(false);
    setPurchaseSuccess(false);
  };

  if (loading && items.length === 0) {
    return <Loader visible={true} message={t("Cargando bazar de souvenirs...")} />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>{t("Bazar de Souvenirs")}</Text>
            <Text style={styles.headerSubtitle}>{t("Mercancía Oficial Coldplay, Duki & Aoki")}</Text>
          </View>
          
          <View style={{ flexDirection: 'row', gap: SPACING.xs, alignItems: 'center' }}>
            {!user && (
              <TouchableOpacity 
                style={styles.loginHeaderBtn}
                onPress={() => router.replace('/(auth)/login' as any)}
              >
                <Ionicons name="log-in-outline" size={16} color={colors.background} />
                <Text style={styles.loginHeaderBtnText}>{t("Entrar")}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cartIconContainer} onPress={() => setCartOpen(true)}>
              <Ionicons name="cart-outline" size={24} color={colors.textPrimary} />
              {getCartTotalItems() > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{getCartTotalItems()}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Active Cart Filter Notice */}
      {activeCartEventIds.length > 0 && (
        <View style={styles.filterBanner}>
          <Ionicons name="funnel-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.filterBannerText} numberOfLines={1}>
            {t("Filtrado por eventos en carrito")}
          </Text>
          <TouchableOpacity onPress={handleResetFilters} style={styles.filterResetBtn}>
            <Text style={styles.filterResetText}>{t("Mostrar Todo")}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Grid of items */}
      <FlatList
        data={items.filter(item => {
          if (activeCartEventIds.length === 0) return true;
          return item.eventId && activeCartEventIds.includes(item.eventId);
        })}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item }) => (
          <Card style={styles.itemCard}>
            <Image source={{ uri: item.image }} style={styles.itemImg} />
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {t(item.title)}
              </Text>
              <Text style={styles.itemDesc} numberOfLines={2}>
                {t(item.description)}
              </Text>
              <View style={styles.itemFooter}>
                <Text style={styles.itemPrice}>${item.price} MXN</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item.id)}>
                  <Ionicons name="add" size={16} color={colors.background} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )}
      />

      {/* CART MODAL */}
      <Modal
        visible={cartOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseCart}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("Mi Carrito de Compras")}</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={handleCloseCart}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {!purchaseSuccess ? (
              /* ACTIVE CART VIEW */
              <View style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.cartScroll}>
                  {Object.keys(cart).length === 0 ? (
                    <View style={styles.emptyCartContainer}>
                      <Ionicons name="cart-outline" size={60} color={colors.textMuted} />
                      <Text style={styles.emptyCartText}>{t("El carrito está vacío")}</Text>
                    </View>
                  ) : (
                    Object.entries(cart).map(([id, qty]) => {
                      const item = items.find((i) => i.id === id);
                      if (!item) return null;
                      return (
                        <Card key={id} style={styles.cartItem}>
                          <Image source={{ uri: item.image }} style={styles.cartItemImg} />
                          <View style={styles.cartItemInfo}>
                            <Text style={styles.cartItemTitle} numberOfLines={1}>
                              {t(item.title)}
                            </Text>
                            <Text style={styles.cartItemPrice}>
                              ${(item.price * qty).toLocaleString()} MXN
                            </Text>
                            <View style={styles.qtyContainer}>
                              <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() => removeFromCart(id)}
                              >
                                <Ionicons name="remove" size={12} color={colors.textPrimary} />
                              </TouchableOpacity>
                              <Text style={styles.qtyText}>{qty}</Text>
                              <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() => addToCart(id)}
                              >
                                <Ionicons name="add" size={12} color={colors.textPrimary} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </Card>
                      );
                    })
                  )}
                </ScrollView>

                {Object.keys(cart).length > 0 && (
                  <View style={styles.cartFooter}>
                    <View style={styles.cartSummaryRow}>
                      <Text style={styles.cartTotalLabel}>{t("Total Compra:")}</Text>
                      <Text style={styles.cartTotalVal}>
                        ${getCartTotalPrice().toLocaleString()} MXN
                      </Text>
                    </View>
                    
                    <View style={styles.checkoutActionRow}>
                      <Button
                        title={t("Limpiar")}
                        variant="secondary"
                        onPress={clearCart}
                        style={{ flex: 1 }}
                      />
                      <Button
                        title={t("Completar Pedido")}
                        onPress={handleCheckout}
                        style={{ flex: 2 }}
                      />
                    </View>
                  </View>
                )}
              </View>
            ) : (
              /* SUCCESS ORDER VIEW */
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle-outline" size={72} color={colors.success} />
                <Text style={styles.successTitle}>{t("¡Pedido Registrado!")}</Text>
                <Text style={styles.successDesc}>
                  {t("Tu orden de souvenirs ha sido procesada con éxito. Puedes recoger tu mercancía en los stands del club en la entrada del evento mostrando tu nombre de usuario.")}
                </Text>
                <Button
                  title={t("Entendido, Volver al Bazar")}
                  onPress={handleCloseCart}
                  style={styles.successBtn}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: SPACING.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.surfaceAlt,
    paddingTop: 45,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg + 2,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cartIconContainer: {
    backgroundColor: colors.surfaceAlt,
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: BORDER_RADIUS.round,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.background,
    fontSize: 8,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  listContainer: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  itemCard: {
    width: (width - SPACING.md * 3) / 2,
    padding: 0,
    overflow: 'hidden',
  },
  itemImg: {
    width: '100%',
    height: 100,
    backgroundColor: colors.surface,
  },
  itemInfo: {
    padding: SPACING.sm,
  },
  itemTitle: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  itemDesc: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 12,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  itemPrice: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.success,
  },
  addBtn: {
    backgroundColor: colors.primary,
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    height: '75%',
    padding: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: colors.surfaceAlt,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  closeBtn: {
    backgroundColor: colors.surfaceAlt,
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartScroll: {
    paddingBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  emptyCartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCartText: {
    color: colors.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    marginTop: SPACING.sm,
  },
  cartItem: {
    flexDirection: 'row',
    padding: SPACING.xs,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cartItemImg: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.sm,
  },
  cartItemInfo: {
    flex: 1,
    gap: 2,
  },
  cartItemTitle: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  cartItemPrice: {
    fontSize: 10,
    color: colors.success,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 2,
  },
  qtyBtn: {
    backgroundColor: colors.surfaceAlt,
    width: 18,
    height: 18,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  cartFooter: {
    borderTopWidth: 1,
    borderColor: colors.surfaceAlt,
    paddingTop: SPACING.sm,
    marginTop: SPACING.sm,
  },
  cartSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  cartTotalLabel: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.textPrimary,
  },
  cartTotalVal: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.success,
  },
  checkoutActionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  successTitle: {
    fontSize: TYPOGRAPHY.fontSizes.md + 2,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: colors.success,
  },
  successDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: SPACING.sm,
  },
  successBtn: {
    width: '100%',
    marginTop: SPACING.md,
  },
  loginHeaderBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm + 2,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    borderColor: colors.primaryLight,
    borderWidth: 1,
  },
  loginHeaderBtnText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: 'bold',
  },
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    justifyContent: 'space-between',
  },
  filterBannerText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: 'bold',
    flex: 1,
  },
  filterResetBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.sm,
  },
  filterResetText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default UserBazaarScreen;
