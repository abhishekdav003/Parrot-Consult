import messaging from '@react-native-firebase/messaging';
import { Alert } from 'react-native';

/**
 * Initializes Firebase Cloud Messaging listeners
 * This MUST be called ONCE when the app starts
 *
 * Responsibilities:
 * 1. Foreground notifications
 * 2. Background notification tap
 * 3. Killed app notification tap
 *
 * ❌ No token logic
 * ❌ No permission logic
 * ❌ No backend calls
 */
export const initNotificationBootstrap = () => {
  console.log('[FCM] Initializing notification listeners');

  // 1️⃣ FOREGROUND NOTIFICATIONS
  const foregroundUnsubscribe = messaging().onMessage(
    async remoteMessage => {
      console.log('[FCM] Foreground message received:', remoteMessage);

      const { title, body } = remoteMessage.notification || {};

      // OS does NOT show notification in foreground
      // We show a simple alert (safe & production-acceptable)
      if (title || body) {
        Alert.alert(
          title || 'Notification',
          body || '',
          [{ text: 'OK' }],
          { cancelable: true }
        );
      }
    }
  );

  // 2️⃣ BACKGROUND → APP OPENED FROM NOTIFICATION
  const backgroundUnsubscribe = messaging().onNotificationOpenedApp(
    remoteMessage => {
      console.log(
        '[FCM] App opened from BACKGROUND notification:',
        remoteMessage
      );

      // Later you can navigate using:
      // remoteMessage.data?.type
      // remoteMessage.data?.bookingId
    }
  );

  // 3️⃣ KILLED STATE → APP OPENED FROM NOTIFICATION
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log(
          '[FCM] App opened from KILLED notification:',
          remoteMessage
        );

        // Same navigation logic can go here later
      }
    })
    .catch(error => {
      console.error('[FCM] getInitialNotification error:', error);
    });

  // Return cleanup function (optional but clean)
  return () => {
    console.log('[FCM] Cleaning up notification listeners');
    foregroundUnsubscribe?.();
    backgroundUnsubscribe?.();
  };
};
