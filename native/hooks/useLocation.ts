import { useEffect, useState } from "react";
import * as Location from "expo-location";

interface LocationInfo {
  latitude: number;
  longitude: number;
  displayName: string;
}

let cached: LocationInfo | null = null;

export function useLocation() {
  const [location, setLocation] = useState<LocationInfo | null>(cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cached) return;

    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [geo] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      if (cancelled) return;

      const parts = [geo?.subregion || geo?.district, geo?.city, geo?.region].filter(Boolean);
      const displayName = parts.join(", ") || `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`;

      const info: LocationInfo = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        displayName,
      };

      cached = info;
      setLocation(info);
    })().catch((e) => {
      if (!cancelled) setError(e.message);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { location, error };
}
