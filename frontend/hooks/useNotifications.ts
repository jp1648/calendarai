import { useEffect, useRef } from "react";
import { Platform } from "react-native";

let Notifications: typeof import("expo-notifications") | null = null;

// Only load expo-notifications on native platforms (crashes on web)
if (Platform.OS !== "web") {
  Notifications = require("expo-notifications");

  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "web" || !Notifications) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export function useNotifications() {
  const permissionGranted = useRef(false);

  useEffect(() => {
    requestPermissions().then((granted) => {
      permissionGranted.current = granted;
    });
  }, []);

  const notifyEventCreated = async (title: string, time: string) => {
    if (Platform.OS === "web" || !Notifications || !permissionGranted.current) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Event added",
        body: `${title} — ${time}`,
      },
      trigger: null,
    });
  };

  return { notifyEventCreated };
}
