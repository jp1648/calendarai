import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ScreenContainer from "../../components/ui/ScreenContainer";
import ScreenHeader from "../../components/ui/ScreenHeader";
import ResyConnectModal from "../../components/integrations/ResyConnectModal";
import { api } from "../../lib/api";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, ACCENT, FONTS } from "../../lib/theme";

export default function ConnectScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.profile.get(),
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
  });

  const [resyModalVisible, setResyModalVisible] = useState(false);

  const connectGmail = async () => {
    try {
      const { url } = await api.gmail.getAuthUrl();
      if (typeof window !== "undefined") {
        window.open(url, "_blank");
      } else {
        Linking.openURL(url);
      }
      // Poll for profile update after OAuth window opens
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["profile"] }), 5000);
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["profile"] }), 15000);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader left="back" title="Connect" />
      <View style={styles.container}>
        <Text style={styles.headline}>Connect your accounts</Text>
        <Text style={styles.subtext}>
          Link your accounts so the AI can manage bookings and parse events from
          your email. You can always do this later in Settings.
        </Text>

        {/* Gmail Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Gmail</Text>
            {profile?.gmail_connected && (
              <View style={styles.connectedBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.connectedText}>Connected</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDescription}>
            Parse events and confirmations from your email automatically.
          </Text>
          {!profile?.gmail_connected && (
            <TouchableOpacity style={styles.connectButton} onPress={connectGmail}>
              <Text style={styles.connectButtonText}>Connect Gmail</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Google Calendar Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Google Calendar</Text>
            {profile?.gmail_connected && (
              <View style={styles.connectedBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.connectedText}>Ready</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDescription}>
            Import your existing events so the AI knows your real schedule.
            {!profile?.gmail_connected ? " Connect Gmail above to enable." : ""}
          </Text>
          {profile?.gmail_connected && (
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedText}>
                Enabled via Gmail connection
              </Text>
            </View>
          )}
        </View>

        {/* Resy Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Resy</Text>
            {profile?.resy_connected && (
              <View style={styles.connectedBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.connectedText}>Connected</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDescription}>
            Let the AI book restaurant reservations for you.
          </Text>
          {!profile?.resy_connected && (
            <TouchableOpacity
              style={styles.connectButton}
              onPress={() => setResyModalVisible(true)}
            >
              <Text style={styles.connectButtonText}>Connect Resy</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => router.push("/(onboarding)/permissions")}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.push("/(onboarding)/permissions")}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ResyConnectModal
        visible={resyModalVisible}
        onClose={() => setResyModalVisible(false)}
      />
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
  connectedBadge: { flexDirection: "row", alignItems: "center", gap: s(6) },
  statusDot: { width: s(8), height: s(8), borderRadius: s(4), backgroundColor: "#3A7D6E" },
  connectedText: { fontSize: fontSize(13), fontFamily: FONTS.bodyMedium, color: "#2B5E52" },
  connectButton: { backgroundColor: ACCENT, borderRadius: s(10), padding: s(12), alignItems: "center" },
  connectButtonText: { color: EARTHY.white, fontSize: fontSize(14), fontFamily: FONTS.bodyMedium },
  footer: { marginTop: "auto", paddingBottom: s(40) },
  continueButton: { backgroundColor: ACCENT, borderRadius: s(14), padding: s(16), alignItems: "center" },
  continueButtonText: { color: EARTHY.white, fontSize: fontSize(16), fontFamily: FONTS.bodyMedium },
  skipButton: { alignItems: "center", paddingVertical: s(14) },
  skipText: { color: EARTHY.stone, fontSize: fontSize(14), fontFamily: FONTS.body },
});
