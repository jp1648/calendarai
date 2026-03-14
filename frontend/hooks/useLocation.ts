import { Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";

interface LocationInfo {
  latitude: number;
  longitude: number;
  displayName: string; // e.g. "Murray Hill, New York, NY"
}

/** Native (iOS/Android) — uses expo-location */
async function fetchLocationNative(): Promise<LocationInfo> {
  const Location = require("expo-location") as typeof import("expo-location");

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission denied");
  }

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const [geo] = await Location.reverseGeocodeAsync({
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
  });

  const parts = [geo?.subregion || geo?.district, geo?.city, geo?.region].filter(Boolean);
  const displayName = parts.join(", ") || `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`;

  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    displayName,
  };
}

/** Web — uses browser Geolocation API + reverse geocode via Nominatim */
async function fetchLocationWeb(): Promise<LocationInfo> {
  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
    });
  });

  const { latitude, longitude } = pos.coords;

  // Reverse geocode via OpenStreetMap Nominatim (free, no API key)
  let displayName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=14`,
      { headers: { "User-Agent": "CalendarAI/1.0" } },
    );
    if (resp.ok) {
      const data = await resp.json();
      const addr = data.address || {};
      const parts = [
        addr.neighbourhood || addr.suburb || addr.hamlet,
        addr.city || addr.town || addr.village,
        addr.state,
      ].filter(Boolean);
      if (parts.length) displayName = parts.join(", ");
    }
  } catch {
    // Fall back to coordinates
  }

  return { latitude, longitude, displayName };
}

export function useLocation(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const { data: location = null, error, refetch } = useQuery<LocationInfo>({
    queryKey: ["location"],
    queryFn: Platform.OS === "web" ? fetchLocationWeb : fetchLocationNative,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 1,
    enabled,
  });

  return { location, error: error?.message ?? null, refetch };
}
