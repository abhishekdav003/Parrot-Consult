import messaging from '@react-native-firebase/messaging';
import { Alert, Platform, PermissionsAndroid } from 'react-native';

/**
 * Request notification permission
 * - Android 13+ requires POST_NOTIFICATIONS
 * - iOS handled by Firebase internally
 */
export const requestNotificationPermission = async () => {
  try {
    // Android 13+
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('[FCM] Android notification permission GRANTED');
        return true;
      } else {
        console.log('[FCM] Android notification permission DENIED');
        return false;
      }
    }

    // Android < 13 OR iOS
    console.log('[FCM] Notification permission auto-granted (OS < 13 or iOS)');
    return true;
  } catch (error) {
    console.error('[FCM] Permission request error:', error);
    return false;
  }
};

/**
 * Get Firebase Cloud Messaging token
 * - Requests Firebase permission (iOS / internal Android check)
 * - Returns FCM token string
 */
export const getFCMToken = async () => {
  try {
    const authStatus = await messaging().requestPermission();

    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('[FCM] Firebase permission NOT granted');
      Alert.alert(
        'Permission Required',
        'Enable notifications to stay updated with bookings and messages.'
      );
      return null;
    }

    console.log('[FCM] Firebase permission granted');

    const token = await messaging().getToken();

    if (token) {
      console.log('[FCM] FCM TOKEN GENERATED:', token);
      return token;
    }

    console.log('[FCM] Failed to generate FCM token');
    return null;
  } catch (error) {
    console.error('[FCM] Error getting FCM token:', error);
    return null;
  }
};
