import messaging from "@react-native-firebase/messaging";
import { Alert, Platform, PermissionsAndroid } from "react-native";

export const requestNotificationPermission = async () => {
  if (Platform.OS === "android" && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
};

export const getFCMToken = async () => {
  const authStatus = await messaging().requestPermission();

  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    Alert.alert("Permission required", "Enable notifications to stay updated");
    return null;
  }

  const token = await messaging().getToken();
  return token;
};
