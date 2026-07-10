import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldVibrate: true,
  }),
});

class NotificationService {
  private hasPermissions: boolean = false;

  constructor() {
    this.checkPermissions();
  }

  /**
   * Check if notification permission is granted
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      this.hasPermissions = status === 'granted';
      return this.hasPermissions;
    } catch (e) {
      console.warn('[NotificationService] Error checking permissions:', e);
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      this.hasPermissions = status === 'granted';

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('laika_notifications', {
          name: 'Laika Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF2353',
        });
      }

      return this.hasPermissions;
    } catch (e) {
      console.warn('[NotificationService] Error requesting permissions:', e);
      return false;
    }
  }

  /**
   * Display a local instant notification
   */
  async triggerLocalNotification(title: string, body: string, data: Record<string, any> = {}) {
    // If permission not checked or granted, request it
    if (!this.hasPermissions) {
      const granted = await this.requestPermissions();
      if (!granted) {
        console.warn('[NotificationService] Notifications blocked by user permission.');
        return;
      }
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // trigger immediately
      });
      console.log(`[NotificationService] Dispatched local notification: "${title}"`);
    } catch (err) {
      console.error('[NotificationService] Error triggering notification:', err);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {}
  }
}

const notificationService = new NotificationService();
export default notificationService;
