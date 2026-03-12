import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function registerPushToken(): Promise<string | null> {
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

export function useNotifications() {
  const permissionGranted = useRef(false);

  useEffect(() => {
    requestPermissions().then((granted) => {
      permissionGranted.current = granted;
      if (granted) {
        registerPushToken();
      }
    });
  }, []);

  const notifyEventCreated = async (title: string, time: string) => {
    if (!permissionGranted.current) return;

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
