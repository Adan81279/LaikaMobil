import { Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

export const BACKGROUND_LAIKA_LOCATION_TASK = 'BACKGROUND_LAIKA_LOCATION_TASK';

// Define the background task for location updates
TaskManager.defineTask(BACKGROUND_LAIKA_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundLocationTask] Task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    console.log('[BackgroundLocationTask] Locations received in background:', locations);
    // Since task manager runs in its own context, it can emit events or save to AsyncStorage
    // for subsequent foreground retrieval, keeping it decoupled and clean.
  }
});

class WearableService {
  private accelSubscription: any = null;
  private locationSubscription: any = null;
  private locationPermissionGranted: boolean = false;

  constructor() {
    try {
      if (Accelerometer && typeof Accelerometer.setUpdateInterval === 'function') {
        Accelerometer.setUpdateInterval(100); // 100ms updates
      }
    } catch (e) {
      console.warn('[WearableService] Accelerometer is not available or failed to initialize:', e);
    }
  }

  /**
   * Request GPS tracking permissions (foreground and background)
   */
  async requestLocationPermissions(): Promise<boolean> {
    try {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') return false;

      this.locationPermissionGranted = true;

      // Request background permission if platform supports it
      if (Platform.OS !== 'web') {
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        return bgStatus === 'granted';
      }

      return true;
    } catch (e) {
      console.warn('[WearableService] Error requesting location permissions:', e);
      return false;
    }
  }

  /**
   * Start tracking accelerometer data
   */
  startAccelerometer(onData: (data: { x: number; y: number; z: number }) => void) {
    this.stopAccelerometer();
    try {
      this.accelSubscription = Accelerometer.addListener((data) => {
        onData(data);
      });
      console.log('[WearableService] Accelerometer subscription started.');
    } catch (e) {
      console.warn('[WearableService] Accelerometer not available on this device/simulator.', e);
    }
  }

  /**
   * Stop tracking accelerometer data
   */
  stopAccelerometer() {
    if (this.accelSubscription) {
      this.accelSubscription.remove();
      this.accelSubscription = null;
      console.log('[WearableService] Accelerometer subscription stopped.');
    }
  }

  /**
   * Start tracking foreground GPS location
   */
  async startLocationUpdates(onLocation: (coords: { latitude: number; longitude: number; accuracy: number | null }) => void) {
    this.stopLocationUpdates();

    if (!this.locationPermissionGranted) {
      const granted = await this.requestLocationPermissions();
      if (!granted) {
        console.warn('[WearableService] Location permissions not granted.');
        return;
      }
    }

    try {
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000, // every 5 seconds
          distanceInterval: 5, // or every 5 meters
        },
        (location) => {
          onLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
          });
        }
      );
      console.log('[WearableService] Location foreground watching started.');
    } catch (e) {
      console.warn('[WearableService] Location services not available or disabled.', e);
    }
  }

  /**
   * Stop tracking foreground GPS location
   */
  stopLocationUpdates() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
      console.log('[WearableService] Location foreground watching stopped.');
    }
  }

  /**
   * Start background location tracking using TaskManager
   */
  async startBackgroundLocation() {
    if (Platform.OS === 'web') return;

    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LAIKA_LOCATION_TASK);
      if (hasStarted) return;

      const isPermitted = await this.requestLocationPermissions();
      if (!isPermitted) return;

      await Location.startLocationUpdatesAsync(BACKGROUND_LAIKA_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // every 30 seconds
        distanceInterval: 50, // or 50 meters
        foregroundService: {
          notificationTitle: 'Laika Club GPS Activo',
          notificationBody: 'Monitoreando cercanía a recintos de eventos.',
          notificationColor: '#FF2353',
        },
      });
      console.log('[WearableService] Background location service started.');
    } catch (e) {
      console.warn('[WearableService] Failed to start background location:', e);
    }
  }

  /**
   * Stop background location tracking
   */
  async stopBackgroundLocation() {
    if (Platform.OS === 'web') return;

    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LAIKA_LOCATION_TASK);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LAIKA_LOCATION_TASK);
        console.log('[WearableService] Background location service stopped.');
      }
    } catch (e) {}
  }
}

const wearableService = new WearableService();
export default wearableService;
