import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccelerometer } from '../hooks/useAccelerometer';
import { useGeolocation } from '../hooks/useGeolocation';
import websocketService from '../services/websocket.service';
import notificationService from '../services/notification.service';
import usuarioService, { Ticket } from '../roles/usuario/services/usuario.service';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WearableSimulatorModalProps {
  visible: boolean;
  onClose: () => void;
  initialTicket?: Ticket | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WATCH_DIAL_SIZE = SCREEN_WIDTH * 0.82; // ~320px on standard phones

export const WearableSimulatorModal: React.FC<WearableSimulatorModalProps> = ({ visible, onClose, initialTicket }) => {
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  
  // 1. Devices states for "more than one device support"
  const [selectedDevice, setSelectedDevice] = useState<'LAIKA-WATCH-01' | 'LAIKA-WATCH-02'>('LAIKA-WATCH-01');
  const [batteryLevel, setBatteryLevel] = useState(88);
  const [heartRate, setHeartRate] = useState(74);

  // 2. Active sensors hooks
  const {
    data: accelData,
    isWristRaised,
    isFallDetected,
    simulateWristRaise,
    simulateFall,
  } = useAccelerometer();

  const {
    currentCoords,
    closestVenue,
    simulateLocation,
    resetToRealLocation,
  } = useGeolocation();

  // 3. WS status
  const [isWsConnected, setIsWsConnected] = useState(websocketService.isClientConnected());
  const [isMockMode, setIsMockMode] = useState(websocketService.isMockMode());

  // 4. Notifications state inside watch
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; body: string; time: string }>>([
    { id: '1', title: 'Sistema Wearable', body: 'Reloj conectado al canal local.', time: '08:00' },
    { id: '2', title: 'Boleto QR Sincronizado', body: 'Listo para acceso sin conexión.', time: '08:05' },
  ]);

  // 5. Real User Tickets and Active View States
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [watchView, setWatchView] = useState<'dashboard' | 'ticket-list' | 'ticket-detail' | 'validated-success'>('dashboard');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isTicketRevealed, setIsTicketRevealed] = useState(false);

  // 6. Navigation & UI states
  const [activeTab, setActiveTab] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  
  // Pulsating Heart animation
  const heartScale = useRef(new Animated.Value(1)).current;
  // SOS Pulsing Ring
  const sosPulse = useRef(new Animated.Value(1)).current;
  // SOS Countdown states
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimer = useRef<any>(null);
  
  // Strobe beacon flash animation
  const strobeAnim = useRef(new Animated.Value(0)).current;

  // Clock state
  const [timeStr, setTimeStr] = useState('');

  // Load configured device
  useEffect(() => {
    const loadDevice = async () => {
      try {
        const saved = await AsyncStorage.getItem('@laika_wearable_device_id');
        if (saved && (saved === 'LAIKA-WATCH-01' || saved === 'LAIKA-WATCH-02')) {
          setSelectedDevice(saved);
        }
      } catch (e) {}
    };
    loadDevice();
  }, []);

  const handleDeviceChange = async (device: 'LAIKA-WATCH-01' | 'LAIKA-WATCH-02') => {
    setSelectedDevice(device);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await AsyncStorage.setItem('@laika_wearable_device_id', device);
    } catch (e) {}
  };

  // Fetch user tickets
  const fetchTickets = async () => {
    try {
      const data = await usuarioService.getMyTickets();
      setTickets(data || []);
    } catch (e) {
      console.warn('Error fetching tickets for watch:', e);
    }
  };

  // Update view when modal becomes visible or when initialTicket changes
  useEffect(() => {
    if (visible) {
      fetchTickets();
      if (initialTicket) {
        setSelectedTicket(initialTicket);
        setIsTicketRevealed(false);
        setWatchView('ticket-detail');
      } else {
        setWatchView('dashboard');
        setSelectedTicket(null);
        setIsTicketRevealed(false);
      }
    }
  }, [visible, initialTicket]);

  // Real-time WebSocket validation subscriber for watch
  useEffect(() => {
    const unsubscribeVal = websocketService.subscribe('ticket_validated', (data) => {
      if (data && data.ticket_code) {
        // Check if the validated ticket belongs to this watch
        const matchedTicket = tickets.find(t => t.ticket_code === data.ticket_code);
        if (matchedTicket) {
          // Play success vibration & show validation screen
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {}
          
          setWatchView('validated-success');
          fetchTickets(); // Refresh list to remove validated/used ticket
          
          setTimeout(() => {
            setWatchView('dashboard');
            setSelectedTicket(null);
          }, 2500);
        }
      }
    });

    return () => unsubscribeVal();
  }, [tickets, selectedTicket]);

  // Clock updater
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      setTimeStr(`${hh}:${mm}:${ss}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Heart rate fluctuation simulator
  useEffect(() => {
    const hrInterval = setInterval(() => {
      setHeartRate(prev => {
        const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
        const next = prev + delta;
        return Math.max(60, Math.min(120, next));
      });
    }, 4000);
    return () => clearInterval(hrInterval);
  }, []);

  // Sync WS status changes
  useEffect(() => {
    const unsubscribeStatus = websocketService.subscribe('status_change', (data) => {
      setIsWsConnected(data.connected);
      setIsMockMode(data.mode === 'mock');
    });
    return () => unsubscribeStatus();
  }, []);

  // Listen to incoming notifications in real-time
  useEffect(() => {
    const unsubscribeNotifications = notificationService.subscribe((title, body) => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      setNotifications(prev => [
        {
          id: Math.random().toString(),
          title,
          body,
          time: timeStr
        },
        ...prev
      ]);

      // Vibrate watch to simulate notice
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
    });

    return () => unsubscribeNotifications();
  }, []);

  // Listen to accelerometer wrist raise/shake gestures to reveal the ticket
  useEffect(() => {
    if (watchView === 'ticket-detail' && !isTicketRevealed) {
      if (isWristRaised || isFallDetected) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
        setIsTicketRevealed(true);
        console.log('[WearableSimulatorModal] Wrist raise/shake detected. Ticket revealed.');
      }
    }
  }, [isWristRaised, isFallDetected, watchView, isTicketRevealed]);

  // Beating heart animation loop
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.25,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [heartScale]);

  // Pulsating SOS ring loop
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(sosPulse, {
          toValue: 1.8,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(sosPulse, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [sosPulse]);

  // Strobe beacon flashing animation effect when drop/fall is detected
  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (isFallDetected) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(strobeAnim, {
            toValue: 1,
            duration: 120, // Fast flash speed
            useNativeDriver: false,
          }),
          Animated.timing(strobeAnim, {
            toValue: 0.1,
            duration: 120,
            useNativeDriver: false,
          }),
        ])
      );
      anim.start();
    } else {
      strobeAnim.setValue(0);
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [isFallDetected]);

  // SOS Countdown triggers
  const startSOSCountdown = () => {
    if (countdown !== null) return;
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch (e) {}
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      countdownTimer.current = setTimeout(() => {
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch (e) {}
        setCountdown(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else {
      triggerSOS();
      setCountdown(null);
    }

    return () => {
      if (countdownTimer.current) clearTimeout(countdownTimer.current);
    };
  }, [countdown]);

  const cancelSOS = () => {
    if (countdownTimer.current) clearTimeout(countdownTimer.current);
    setCountdown(null);
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
    Alert.alert('SOS Cancelado', 'Se ha cancelado el envío de auxilio.');
  };

  const triggerSOS = () => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch (e) {}

    // Dispatch WebSocket emergency event
    websocketService.send('fall_detected', {
      device_id: selectedDevice,
      user_name: user?.name || 'Usuario Laika Club',
      user_email: user?.email || 'cliente@laikaclub.com',
      latitude: currentCoords.latitude,
      longitude: currentCoords.longitude,
      closest_venue: closestVenue ? closestVenue.venueName : 'Recinto Cercano',
      timestamp: new Date().toISOString(),
      type: 'SOS_MANUAL',
    });

    // Trigger local notification
    notificationService.triggerLocalNotification(
      '🚨 SOS MANUAL ENVIADO',
      `Se ha enviado una alerta de emergencia desde tu ${selectedDevice} al personal del recinto.`
    );

    Alert.alert(
      '¡SOS Enviado!',
      `Se ha notificado al personal médico y de seguridad del evento. Coordenadas de auxilio enviadas: ${currentCoords.latitude.toFixed(5)}, ${currentCoords.longitude.toFixed(5)}.`
    );
  };

  // Scroll handler for dots
  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / WATCH_DIAL_SIZE);
    if (page !== activeTab) {
      setActiveTab(page);
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    }
  };

  const validTicketsCount = tickets.filter(t => t.status === 'valid').length;

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Top bar dismiss */}
        <TouchableOpacity style={styles.dismissArea} onPress={onClose} activeOpacity={1}>
          <View style={styles.closeHandle} />
          <Text style={styles.dismissText}>Desliza hacia abajo o toca fuera para cerrar</Text>
        </TouchableOpacity>

        {/* Watch physical case container */}
        <View style={styles.watchCaseFrame}>
          {/* Metallic outer bezel */}
          <View style={styles.bezelBorder}>
            
            {/* Side buttons simulation */}
            <View style={styles.digitalCrown} />
            <TouchableOpacity style={styles.actionButtonPhysical} onPress={startSOSCountdown}>
              <View style={styles.redButtonDot} />
            </TouchableOpacity>

            {/* Circular Screen Viewport */}
            <View style={styles.watchScreen}>
              
              {/* Watch Dropped distress white flashing strobe overlay */}
              {isFallDetected && (
                <Animated.View 
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: '#FFFFFF',
                    opacity: strobeAnim,
                    zIndex: 9999,
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 20,
                  }}
                >
                  <Ionicons name="warning" size={48} color="#FF3B30" />
                  <Text style={{ 
                    color: '#000000', 
                    fontSize: 13, 
                    fontWeight: '900', 
                    textAlign: 'center', 
                    marginTop: 6,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}>
                    ¡RELOJ CAÍDO!
                  </Text>
                  <Text style={{ 
                    color: '#374151', 
                    fontSize: 8, 
                    fontWeight: 'bold', 
                    textAlign: 'center', 
                    marginTop: 4,
                    lineHeight: 11,
                  }}>
                    Sigue los destellos de luz para encontrar el dispositivo.
                  </Text>
                </Animated.View>
              )}
              
              {watchView === 'dashboard' ? (
                <>
                  <ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    contentContainerStyle={{ width: WATCH_DIAL_SIZE * 4 }}
                  >
                    
                    {/* PAGE 1: WATCHFACE & DASHBOARD */}
                    <View style={[styles.watchPage, { width: WATCH_DIAL_SIZE }]}>
                      {/* Time and Battery */}
                      <View style={styles.pageHeader}>
                        <Text style={styles.watchTimeHeader}>{timeStr.substring(0, 5)}</Text>
                        <View style={styles.batteryRow}>
                          <Ionicons name="battery-charging" size={11} color="#10B981" />
                          <Text style={styles.batteryText}>{batteryLevel}%</Text>
                        </View>
                      </View>

                      {/* Pulsating pulse monitor */}
                      <View style={styles.pulseContainer}>
                        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                          <Ionicons name="heart" size={20} color="#EF4444" />
                        </Animated.View>
                        <Text style={styles.pulseVal}>{heartRate} BPM</Text>
                      </View>

                      {/* View Actual Tickets Button */}
                      <TouchableOpacity 
                        style={styles.watchTicketsButton} 
                        onPress={() => {
                          try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch(e){}
                          setWatchView('ticket-list');
                        }}
                      >
                        <Ionicons name="ticket" size={10} color="#000000" />
                        <Text style={styles.watchTicketsButtonText}>Ver Boletos ({validTicketsCount})</Text>
                      </TouchableOpacity>

                      {/* Multi-Device Selector */}
                      <View style={styles.deviceSelectionBox}>
                        <Text style={styles.deviceLabel}>DISPOSITIVO ASOCIADO:</Text>
                        <View style={styles.deviceBtnGroup}>
                          <TouchableOpacity
                            style={[styles.deviceBtn, selectedDevice === 'LAIKA-WATCH-01' && styles.deviceBtnActive]}
                            onPress={() => handleDeviceChange('LAIKA-WATCH-01')}
                          >
                            <Text style={[styles.deviceBtnText, selectedDevice === 'LAIKA-WATCH-01' && styles.deviceBtnTextActive]}>
                              Reloj 1
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.deviceBtn, selectedDevice === 'LAIKA-WATCH-02' && styles.deviceBtnActive]}
                            onPress={() => handleDeviceChange('LAIKA-WATCH-02')}
                          >
                            <Text style={[styles.deviceBtnText, selectedDevice === 'LAIKA-WATCH-02' && styles.deviceBtnTextActive]}>
                              Reloj 2
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Connection indicator */}
                      <View style={styles.connStatusContainer}>
                        <View style={[styles.statusDotDot, { backgroundColor: isWsConnected ? '#10B981' : '#EF4444' }]} />
                        <Text style={styles.connStatusText}>
                          {isMockMode ? 'Simulador Relé' : isWsConnected ? 'Servidor Live' : 'Desconectado'}
                        </Text>
                      </View>
                    </View>

                    {/* PAGE 2: LIVE SENSORS GRAPH/VIEW */}
                    <View style={[styles.watchPage, { width: WATCH_DIAL_SIZE }]}>
                      <Text style={styles.pageTitle}>SÍNDROME SENSOR</Text>
                      
                      {/* Accelerometer data layout */}
                      <View style={styles.sensorGrid}>
                        <View style={styles.sensorRow}>
                          <Text style={styles.axisLabel}>X:</Text>
                          <View style={styles.gaugeTrack}>
                            <View style={[styles.gaugeFill, { width: `${Math.min(100, Math.abs(accelData.x) * 100)}%`, backgroundColor: '#3B82F6' }]} />
                          </View>
                          <Text style={styles.axisVal}>{accelData.x.toFixed(2)}G</Text>
                        </View>

                        <View style={styles.sensorRow}>
                          <Text style={styles.axisLabel}>Y:</Text>
                          <View style={styles.gaugeTrack}>
                            <View style={[styles.gaugeFill, { width: `${Math.min(100, Math.abs(accelData.y) * 100)}%`, backgroundColor: '#10B981' }]} />
                          </View>
                          <Text style={styles.axisVal}>{accelData.y.toFixed(2)}G</Text>
                        </View>

                        <View style={styles.sensorRow}>
                          <Text style={styles.axisLabel}>Z:</Text>
                          <View style={styles.gaugeTrack}>
                            <View style={[styles.gaugeFill, { width: `${Math.min(100, Math.abs(accelData.z) * 100)}%`, backgroundColor: '#F59E0B' }]} />
                          </View>
                          <Text style={styles.axisVal}>{accelData.z.toFixed(2)}G</Text>
                        </View>
                      </View>

                      {/* GPS Data summary */}
                      <View style={styles.gpsSummaryBox}>
                        <Ionicons name="location-sharp" size={10} color="#FF3B30" />
                        <Text style={styles.gpsText}>
                          Recinto: {closestVenue ? `${closestVenue.distance}m` : 'Buscando...'}
                        </Text>
                      </View>
                    </View>

                    {/* PAGE 3: NOTIFICATIONS CENTER */}
                    <View style={[styles.watchPage, { width: WATCH_DIAL_SIZE }]}>
                      <Text style={styles.pageTitle}>AVISOS ({notifications.length})</Text>
                      
                      <ScrollView style={styles.watchNotificationList} contentContainerStyle={{ paddingBottom: 24 }} nestedScrollEnabled={true}>
                        {notifications.length === 0 ? (
                          <View style={{ alignItems: 'center', marginTop: 30 }}>
                            <Ionicons name="notifications-off-outline" size={24} color="#525252" />
                            <Text style={{ fontSize: 9, color: '#A3A3A3', marginTop: 4 }}>Sin alertas</Text>
                          </View>
                        ) : (
                          notifications.map(item => (
                            <View key={item.id} style={styles.watchNotifCard}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                <Text style={styles.watchNotifTitle} numberOfLines={1}>{item.title}</Text>
                                <Text style={styles.watchNotifTime}>{item.time}</Text>
                              </View>
                              <Text style={styles.watchNotifBody} numberOfLines={2}>{item.body}</Text>
                            </View>
                          ))
                        )}
                      </ScrollView>

                      {notifications.length > 0 && (
                        <TouchableOpacity style={styles.clearNotifBtn} onPress={() => setNotifications([])}>
                          <Text style={styles.clearNotifText}>Limpiar</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* PAGE 4: SOS EMERGENCY COUNTDOWN & BUTTON */}
                    <View style={[styles.watchPage, { width: WATCH_DIAL_SIZE }]}>
                      {countdown !== null ? (
                        <View style={styles.sosActiveContainer}>
                          <Text style={styles.sosCountdownLabel}>ENVIANDO ALERTA SOS</Text>
                          <Text style={styles.sosCountdownNumber}>{countdown}</Text>
                          <TouchableOpacity style={styles.sosCancelBtn} onPress={cancelSOS}>
                            <Ionicons name="close" size={14} color="#FFFFFF" />
                            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>CANCELAR</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.sosInactiveContainer}>
                          <Text style={styles.sosTitleText}>BOTÓN SOS</Text>
                          
                          {/* Pulse rings background */}
                          <View style={styles.sosTriggerCircleWrapper}>
                            <Animated.View style={[styles.sosPulseRing, { transform: [{ scale: sosPulse }] }]} />
                            <TouchableOpacity style={styles.sosTriggerCircle} onPress={startSOSCountdown}>
                              <Ionicons name="warning" size={32} color="#FFFFFF" />
                              <Text style={styles.sosBtnLabel}>PANIC</Text>
                            </TouchableOpacity>
                          </View>
                          
                          <Text style={styles.sosDisclaimer}>Presiona 3s para enviar auxilio</Text>
                        </View>
                      )}
                    </View>

                  </ScrollView>

                  {/* Navigation Page Dots */}
                  <View style={styles.pageIndicatorContainer}>
                    {[0, 1, 2, 3].map(idx => (
                      <View key={idx} style={[styles.indicatorDot, activeTab === idx && styles.indicatorDotActive]} />
                    ))}
                  </View>
                </>
              ) : watchView === 'ticket-list' ? (
                <View style={styles.circularContainer}>
                  <Text style={styles.circularTitle}>MIS PASES</Text>
                  
                  <ScrollView 
                    style={styles.circularScroll} 
                    contentContainerStyle={{ paddingBottom: 20, alignItems: 'center' }}
                    nestedScrollEnabled={true}
                  >
                    {tickets.filter(t => t.status === 'valid').length === 0 ? (
                      <View style={{ alignItems: 'center', marginTop: 28 }}>
                        <Ionicons name="ticket-outline" size={24} color="#525252" />
                        <Text style={{ fontSize: 9, color: '#A3A3A3', marginTop: 4 }}>Sin pases activos</Text>
                      </View>
                    ) : (
                      tickets.filter(t => t.status === 'valid').map(ticket => (
                        <TouchableOpacity 
                          key={ticket.id} 
                          style={styles.watchTicketItem}
                          onPress={() => {
                            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch(e){}
                            setSelectedTicket(ticket);
                            setIsTicketRevealed(false);
                            setWatchView('ticket-detail');
                          }}
                        >
                          <Text style={styles.watchTicketTitle} numberOfLines={1}>
                            {ticket.event_title || ticket.event_name || 'Espectáculo'}
                          </Text>
                          <Text style={styles.watchTicketSeat} numberOfLines={1}>
                            {ticket.seat_label} • {ticket.date}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                  
                  <TouchableOpacity 
                    style={styles.circularBackBtn} 
                    onPress={() => {
                      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch(e){}
                      setWatchView('dashboard');
                    }}
                  >
                    <Ionicons name="arrow-back" size={9} color="#FFFFFF" />
                    <Text style={styles.circularBackText}>Volver</Text>
                  </TouchableOpacity>
                </View>
              ) : watchView === 'ticket-detail' && selectedTicket ? (
                <View style={styles.circularContainer}>
                  {!isTicketRevealed ? (
                    // LOCKED GESTURE VIEW
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '85%', gap: 6 }}>
                      <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                        <Ionicons name="phone-portrait-outline" size={32} color={colors.primary} />
                      </Animated.View>
                      <Ionicons name="sync-outline" size={20} color="#FFFFFF" style={{ marginTop: -12 }} />
                      
                      <Text style={{ 
                        fontSize: 9, 
                        fontWeight: 'bold', 
                        color: '#FFFFFF', 
                        textAlign: 'center',
                        marginTop: 4,
                        lineHeight: 12
                      }}>
                        AGITE LA MUÑECA PARA VISUALIZAR EL BOLETO
                      </Text>
                      
                      <Text style={{ 
                        fontSize: 7, 
                        color: colors.textSecondary, 
                        textAlign: 'center',
                        paddingHorizontal: 4
                      }}>
                        Mueve el dispositivo rápidamente o usa el panel de simulador
                      </Text>

                      <TouchableOpacity 
                        style={[styles.circularBackBtn, { marginTop: 6 }]} 
                        onPress={() => {
                          try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch(e){}
                          if (initialTicket) {
                            onClose();
                          } else {
                            setWatchView('ticket-list');
                          }
                        }}
                      >
                        <Ionicons name="arrow-back" size={9} color="#FFFFFF" />
                        <Text style={styles.circularBackText}>Atrás</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    // REVEALED TICKET VIEW
                    <>
                      <Text style={[styles.circularTitle, { width: '85%', textAlign: 'center' }]} numberOfLines={1}>
                        {selectedTicket.event_title || selectedTicket.event_name || 'Boleto QR'}
                      </Text>
                      
                      {/* REAL QR CODE RENDERED FROM QR SERVER */}
                      <View style={styles.watchQrBox}>
                        <Image 
                          source={{ 
                            uri: (() => {
                              const payload = {
                                id: selectedTicket.id,
                                c: selectedTicket.ticket_code,
                                o: (selectedTicket as any).owner_name || user?.name || 'Cliente',
                                e: selectedTicket.owner_email || user?.email || 'cliente@laikaclub.com',
                                t: selectedTicket.event_title || selectedTicket.event_name || 'Espectáculo',
                                v: selectedTicket.venue_name || selectedTicket.venue || 'Recinto Central',
                                s: selectedTicket.seat_label || 'General',
                                p: selectedTicket.price || 0,
                                d: selectedTicket.date,
                                h: selectedTicket.time,
                                st: selectedTicket.status
                              };
                              const dataStr = JSON.stringify(payload);
                              return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(dataStr)}`;
                            })()
                          }} 
                          style={styles.watchQrImage}
                        />
                      </View>

                      <Text style={styles.watchQrCodeText}>{selectedTicket.ticket_code}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 8, fontWeight: 'medium', marginBottom: 2 }}>
                        Zona: {selectedTicket.seat_label}
                      </Text>
                      
                      <TouchableOpacity 
                        style={styles.circularBackBtn} 
                        onPress={() => {
                          try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch(e){}
                          if (initialTicket) {
                            onClose();
                          } else {
                            setWatchView('ticket-list');
                          }
                        }}
                      >
                        <Ionicons name="arrow-back" size={9} color="#FFFFFF" />
                        <Text style={styles.circularBackText}>Atrás</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ) : watchView === 'validated-success' ? (
                <View style={[styles.circularContainer, { backgroundColor: '#064e3b', justifyContent: 'center' }]}>
                  <Ionicons name="checkmark-circle-outline" size={42} color="#10B981" style={{ marginBottom: 4 }} />
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 }}>¡VALIDADO!</Text>
                  <Text style={{ color: '#A3A3A3', fontSize: 8, textAlign: 'center', marginTop: 2, paddingHorizontal: 20 }}>
                    Acceso verificado con éxito en puerta.
                  </Text>
                </View>
              ) : null}

              {/* Glowing watch screen glare reflections */}
              <View style={styles.screenGlassReflect} pointerEvents="none" />
            </View>

          </View>
        </View>

        {/* Bottom manual close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.90)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissArea: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  closeHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 8,
  },
  dismissText: {
    color: '#A3A3A3',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  watchCaseFrame: {
    width: WATCH_DIAL_SIZE + 42,
    height: WATCH_DIAL_SIZE + 42,
    borderRadius: (WATCH_DIAL_SIZE + 42) / 2,
    backgroundColor: '#0a0d15',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#1f2937',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 15,
    position: 'relative',
  },
  bezelBorder: {
    width: WATCH_DIAL_SIZE + 24,
    height: WATCH_DIAL_SIZE + 24,
    borderRadius: (WATCH_DIAL_SIZE + 24) / 2,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#374151',
    borderWidth: 6,
    position: 'relative',
  },
  digitalCrown: {
    position: 'absolute',
    right: -16,
    top: '36%',
    width: 14,
    height: 42,
    backgroundColor: '#1f2937',
    borderColor: '#4b5563',
    borderWidth: 2,
    borderRadius: 4,
  },
  actionButtonPhysical: {
    position: 'absolute',
    right: -14,
    top: '58%',
    width: 12,
    height: 28,
    backgroundColor: '#374151',
    borderColor: '#4b5563',
    borderWidth: 2,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  redButtonDot: {
    width: 4,
    height: 12,
    backgroundColor: '#FF3B30',
    borderRadius: 2,
  },
  watchScreen: {
    width: WATCH_DIAL_SIZE,
    height: WATCH_DIAL_SIZE,
    borderRadius: WATCH_DIAL_SIZE / 2,
    backgroundColor: '#000000',
    overflow: 'hidden',
    position: 'relative',
  },
  screenGlassReflect: {
    ...StyleSheet.absoluteFillObject,
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderRadius: WATCH_DIAL_SIZE / 2,
    backgroundColor: 'transparent',
    opacity: 0.15,
  },
  watchPage: {
    height: WATCH_DIAL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingTop: 36,
    paddingBottom: 32,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    alignItems: 'center',
    position: 'absolute',
    top: 36,
  },
  watchTimeHeader: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  batteryText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: 'bold',
  },
  pulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
  },
  pulseVal: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  watchTicketsButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  watchTicketsButtonText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: 'bold',
  },
  deviceSelectionBox: {
    width: '90%',
    backgroundColor: '#0F0F0F',
    borderColor: '#262626',
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  deviceLabel: {
    color: '#A3A3A3',
    fontSize: 7,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  deviceBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  deviceBtn: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    borderColor: '#262626',
    borderWidth: 1,
  },
  deviceBtnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  deviceBtnText: {
    color: '#A3A3A3',
    fontSize: 8,
    fontWeight: 'bold',
  },
  deviceBtnTextActive: {
    color: '#000000',
  },
  connStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'absolute',
    bottom: 34,
  },
  statusDotDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  connStatusText: {
    color: '#525252',
    fontSize: 8,
    fontWeight: 'bold',
  },
  pageTitle: {
    color: '#A3A3A3',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  sensorGrid: {
    width: '92%',
    gap: 8,
  },
  sensorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  axisLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    width: 12,
  },
  gaugeTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#111827',
    borderRadius: 3,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 3,
  },
  axisVal: {
    color: '#A3A3A3',
    fontSize: 8,
    fontWeight: 'bold',
    width: 32,
    textAlign: 'right',
  },
  gpsSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F0F0F',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  gpsText: {
    color: '#A3A3A3',
    fontSize: 8,
    fontWeight: 'bold',
  },
  miniTriggerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  miniBtn: {
    borderColor: '#262626',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: '#0F0F0F',
  },
  miniBtnText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: 'bold',
  },
  watchNotificationList: {
    width: '90%',
    maxHeight: 120,
    marginTop: 4,
  },
  watchNotifCard: {
    backgroundColor: '#0F0F0F',
    borderColor: '#262626',
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
    marginBottom: 5,
  },
  watchNotifTitle: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    maxWidth: '75%',
  },
  watchNotifTime: {
    color: '#525252',
    fontSize: 6,
  },
  watchNotifBody: {
    color: '#A3A3A3',
    fontSize: 7,
    marginTop: 1,
    lineHeight: 9,
  },
  clearNotifBtn: {
    marginTop: 4,
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#111827',
  },
  clearNotifText: {
    color: '#A3A3A3',
    fontSize: 7,
    fontWeight: 'bold',
  },
  sosInactiveContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  sosTitleText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  sosTriggerCircleWrapper: {
    position: 'relative',
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosPulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  sosTriggerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    gap: 2,
  },
  sosBtnLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'heavy',
    letterSpacing: 0.5,
  },
  sosDisclaimer: {
    color: '#525252',
    fontSize: 7,
    textAlign: 'center',
  },
  sosActiveContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sosCountdownLabel: {
    color: '#EF4444',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  sosCountdownNumber: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'heavy',
  },
  sosCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#374151',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  pageIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    position: 'absolute',
    bottom: 12,
    width: '100%',
  },
  indicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#374151',
  },
  indicatorDotActive: {
    backgroundColor: '#FFFFFF',
    width: 8,
  },
  closeBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  // Circular UI styles for Ticket Viewer
  circularContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 28,
    width: '100%',
    height: '100%',
  },
  circularTitle: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'heavy',
    letterSpacing: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  circularScroll: {
    width: '100%',
    flex: 1,
    marginTop: 2,
  },
  watchTicketItem: {
    width: '90%',
    backgroundColor: '#0F0F0F',
    borderColor: '#262626',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 4,
    alignSelf: 'center',
  },
  watchTicketTitle: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  watchTicketSeat: {
    color: '#A3A3A3',
    fontSize: 6.5,
    textAlign: 'center',
    marginTop: 1,
  },
  circularBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1C1917',
    borderColor: '#44403C',
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  circularBackText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: 'bold',
  },
  watchQrBox: {
    width: 140,
    height: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    alignSelf: 'center',
  },
  watchQrImage: {
    width: 128,
    height: 128,
  },
  watchQrCodeText: {
    color: '#E5E5E5',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginTop: 2,
    marginBottom: 1,
  },
});
