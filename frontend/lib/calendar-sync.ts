import { Linking } from "react-native";

/**
 * Open Google Calendar's subscription dialog for the given iCal feed URL.
 * Converts http(s):// to webcal:// and constructs the Google Calendar deep link.
 */
export function openGoogleCalendarSubscribe(icalFeedUrl: string) {
  if (!icalFeedUrl) return;
  const webcalUrl = icalFeedUrl.replace(/^https?:\/\//, "webcal://");
  const googleCalUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;
  if (typeof window !== "undefined") {
    window.open(googleCalUrl, "_blank");
  } else {
    Linking.openURL(googleCalUrl);
  }
}
