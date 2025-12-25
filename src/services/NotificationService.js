// import { Alert } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import { Platform } from 'react-native';
// import notifee, { AndroidImportance } from '@notifee/react-native';


// class NotificationService {
//   async init() {
//   // 🔔 ANDROID CHANNEL (CRITICAL)
//   if (Platform.OS === 'android') {
//     await notifee.createChannel({
//       id: 'default',
//       name: 'Default Notifications',
//       importance: AndroidImportance.HIGH,
//     });
//   }

//   // 1️⃣ Foreground
//   this.foregroundUnsubscribe = messaging().onMessage(
//     async remoteMessage => {
//       console.log('🔔 FCM FOREGROUND:', remoteMessage);

//       const { title, body } = remoteMessage.notification || {};

//       if (title || body) {
//         await notifee.displayNotification({
//           title,
//           body,
//           android: {
//             channelId: 'default',
//             importance: AndroidImportance.HIGH,
//           },
//         });
//       }
//     }
//   );

//   // 2️⃣ Background tap
//   this.backgroundUnsubscribe =
//     messaging().onNotificationOpenedApp(remoteMessage => {
//       console.log('🔔 Opened from background:', remoteMessage);
//     });

//   // 3️⃣ Killed state
//   messaging()
//     .getInitialNotification()
//     .then(remoteMessage => {
//       if (remoteMessage) {
//         console.log('🔔 Opened from quit state:', remoteMessage);
//       }
//     });
// }


//   cleanup() {
//     this.foregroundUnsubscribe?.();
//     this.backgroundUnsubscribe?.();
//   }
// }

// export default new NotificationService();
