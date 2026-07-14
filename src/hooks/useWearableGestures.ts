import { useEffect, useRef, useState } from 'react';
import { useAccelerometer } from './useAccelerometer';
import { useGeolocation } from './useGeolocation';
import websocketService from '../services/websocket.service';
import notificationService from '../services/notification.service';
import usuarioService, { Ticket } from '../roles/usuario/services/usuario.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useWearableGestures(onWristRaiseCallback?: () => void) {
  const {
    isWristRaised,
    isFallDetected,
    gestureType,
    simulateWristRaise,
    simulateFall,
  } = useAccelerometer();

  const {
    currentCoords,
    venueDistances,
    closestVenue,
    simulateLocation,
    resetToRealLocation,
  } = useGeolocation();

  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const notifiedVenues = useRef<Set<string>>(new Set());
  const lastProximityAlert = useRef<Record<string, number>>({});

  // 1. Fetch user tickets to check for venue proximity match
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const tickets = await usuarioService.getMyTickets();
        const validTickets = tickets.filter((t) => t.status === 'valid');
        setActiveTickets(validTickets);
      } catch (e) {
        console.warn('[useWearableGestures] Error fetching tickets:', e);
      }
    };
    fetchTickets();
  }, []);

  // 2. Respond to wrist raise gesture
  useEffect(() => {
    if (isWristRaised) {
      if (onWristRaiseCallback) {
        onWristRaiseCallback();
      }
      // Broadcast wrist raise event to WebSocket so that other devices can observe it if needed
      websocketService.send('wrist_raise_detected', {
        timestamp: new Date().toISOString(),
      });
    }
  }, [isWristRaised]);

  // 3. Respond to fall detection
  useEffect(() => {
    if (isFallDetected) {
      handleFallEmergency();
    }
  }, [isFallDetected]);

  // 4. Respond to GPS proximity changes
  useEffect(() => {
    if (!closestVenue) return;

    const venueName = closestVenue.venueName;
    const distance = closestVenue.distance; // in meters
    const now = Date.now();

    // Check if user has a valid ticket for this venue
    const hasTicketForVenue = activeTickets.some(
      (t) =>
        t.venue_name?.toLowerCase().includes(venueName.toLowerCase()) ||
        t.venue?.toLowerCase().includes(venueName.toLowerCase())
    );

    // Limit notification dispatch to once every 10 minutes per venue
    const lastAlertTime = lastProximityAlert.current[venueName] || 0;
    const isSpam = now - lastAlertTime < 600000; // 10 minutes lockout

    if (hasTicketForVenue && !isSpam) {
      if (distance < 500 && distance >= 100) {
        lastProximityAlert.current[venueName] = now;
        notificationService.triggerLocalNotification(
          '¡Estás cerca del recinto!',
          `Estás a ${distance} metros de ${venueName}. Prepárate para ingresar a tu evento.`,
          { venueName, distance }
        );
      } else if (distance < 100) {
        lastProximityAlert.current[venueName] = now;
        notificationService.triggerLocalNotification(
          '¡Acceso de boleto sugerido!',
          `Estás en la entrada de ${venueName}. Haz el gesto de levantar la muñeca para abrir tu boleto QR.`,
          { venueName, distance }
        );
      }
    }
  }, [closestVenue, activeTickets]);

  /**
   * Handle fall event: dispatch local push notification and send real-time coordinates over WebSockets
   */
  const handleFallEmergency = async () => {
    // 1. Trigger local notification
    notificationService.triggerLocalNotification(
      '⚠️ ¡Caída Detectada!',
      'Se ha detectado un impacto fuerte. Reportando incidente al staff de seguridad y auxilio.',
      { latitude: currentCoords.latitude, longitude: currentCoords.longitude }
    );

    // 2. Fetch current user context
    let userName = 'Usuario Laika Club';
    let userEmail = 'cliente@laikaclub.com';
    let deviceId = 'LAIKA-WATCH-01';

    try {
      const userStr = await AsyncStorage.getItem('@laika_auth_user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        userName = userObj.name || userName;
        userEmail = userObj.email || userEmail;
      }
      
      const savedDevice = await AsyncStorage.getItem('@laika_wearable_device_id');
      if (savedDevice) {
        deviceId = savedDevice;
      }
    } catch (e) {}

    // 3. Emit emergency fallback event through WebSocket
    websocketService.send('fall_detected', {
      device_id: deviceId,
      user_name: userName,
      user_email: userEmail,
      latitude: currentCoords.latitude,
      longitude: currentCoords.longitude,
      closest_venue: closestVenue ? closestVenue.venueName : 'Desconocido',
      timestamp: new Date().toISOString(),
    });
  };

  return {
    isWristRaised,
    isFallDetected,
    gestureType,
    currentCoords,
    closestVenue,
    venueDistances,
    simulateWristRaise,
    simulateFall,
    simulateLocation,
    resetToRealLocation,
    hasActiveTickets: activeTickets.length > 0,
  };
}
export default useWearableGestures;
