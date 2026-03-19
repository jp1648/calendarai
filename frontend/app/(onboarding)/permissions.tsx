import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import ScreenContainer from "../../components/ui/ScreenContainer";
import ScreenHeader from "../../components/ui/ScreenHeader";
import { useLocation } from "../../hooks/useLocation";
import { api } from "../../lib/api";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, ACCENT, FONTS } from "../../lib/theme";

export default function PermissionsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Location: don't auto-request — wait for user tap
  const [locationEnabled, setLocationEnabled] = useState(false);
  const { location, error: locationError, refetch: refetchLocation } = useLocation({ enabled: locationEnabled });
  const locationGranted = locationEnabled && !!location && !locationError;
  const locationDenied = locationEnabled && !!locationError;

  // Notifications
  const [notificationStatus, setNotificationStatus] = useState<"idle" | "granted" | "denied">("idle");

  const handleLocationPress = useCallback(() => {
    if (locationEnabled) {
      refetchLocation();
    } else {
      setLocationEnabled(true);
    }
  }, [locationEnabled, refetchLocation]);

  const handleNotificationPress = useCallback(async () => {
    if (Platform.OS === "web") {
      if ("Notification" in window) {
        const result = await Notification.requestPermission();
        setNotificationStatus(result === "granted" ? "granted" : "denied");
      }
      return;
    }
    try {
      const Notifications = require("expo-notifications");
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing === "granted") {
        setNotificationStatus("granted");
        return;
      }
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationStatus(status === "granted" ? "granted" : "denied");
    } catch {
      setNotificationStatus("denied");
    }
  }, []);

  const handleGetStarted = async () => {
    try {
      await api.profile.update({ onboarding_completed: true });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch {}
    router.replace("/(app)");
  };

  return (
    <ScreenContainer>
      <ScreenHeader left="back" title="Permissions" />
      <View style={styles.container}>
        <Text style={styles.headline}>Almost there</Text>
        <Text style={styles.subtext}>
          These permissions help the AI work better for you. Both are optional.
        </Text>

        {/* Location Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Location</Text>
            {locationGranted && (
              <View style={styles.grantedBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.grantedText}>Enabled</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDescription}>
            Helps suggest nearby restaurants and relevant event locations.
          </Text>
          {!locationGranted && (
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={handleLocationPress}
            >
              <Text style={styles.permissionButtonText}>
                {locationDenied ? "Permission denied" : "Enable Location"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notifications Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Notifications</Text>
            {notificationStatus === "granted" && (
              <View style={styles.grantedBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.grantedText}>Enabled</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDescription}>
            Get notified when the AI adds or updates events on your calendar.
          </Text>
          {notificationStatus !== "granted" && (
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={handleNotificationPress}
            >
              <Text style={styles.permissionButtonText}>
                {notificationStatus === "denied" ? "Permission denied" : "Enable Notifications"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleGetStarted}
          >
            <Text style={styles.getStartedText}>Get started</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: s(24), paddingTop: s(8) },
  headline: { fontSize: fontSize(22), fontFamily: FONTS.heading, color: EARTHY.bark, marginBottom: s(8) },
  subtext: { fontSize: fontSize(14), fontFamily: FONTS.bodyLight, color: EARTHY.stone, lineHeight: fontSize(20), marginBottom: s(24) },
  card: { backgroundColor: EARTHY.white, borderRadius: s(14), padding: s(16), borderWidth: 1, borderColor: EARTHY.sand, marginBottom: s(12) },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: s(6) },
  cardTitle: { fontSize: fontSize(16), fontFamily: FONTS.bodyMedium, color: EARTHY.bark },
  cardDescription: { fontSize: fontSize(13), fontFamily: FONTS.bodyLight, color: EARTHY.barkSoft, lineHeight: fontSize(18), marginBottom: s(12) },
  grantedBadge: { flexDirection: "row", alignItems: "center", gap: s(6) },
  statusDot: { width: s(8), height: s(8), borderRadius: s(4), backgroundColor: EARTHY.success },
  grantedText: { fontSize: fontSize(13), fontFamily: FONTS.bodyMedium, color: EARTHY.successText },
  permissionButton: { borderWidth: 1, borderColor: ACCENT, borderRadius: s(10), padding: s(12), alignItems: "center" },
  permissionButtonText: { color: ACCENT, fontSize: fontSize(14), fontFamily: FONTS.bodyMedium },
  footer: { marginTop: "auto", paddingBottom: s(40) },
  getStartedButton: { backgroundColor: ACCENT, borderRadius: s(14), padding: s(16), alignItems: "center" },
  getStartedText: { color: EARTHY.white, fontSize: fontSize(16), fontFamily: FONTS.bodyMedium },
});
