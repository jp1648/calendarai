import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "../../hooks/useAuth";
import ScreenContainer from "../../components/ui/ScreenContainer";
import ScreenHeader from "../../components/ui/ScreenHeader";
import { api } from "../../lib/api";
import * as Clipboard from "expo-clipboard";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, ACCENT, FONTS } from "../../lib/theme";

interface Profile {
  full_name: string;
  phone: string;
  timezone: string;
  default_location: string;
  email: string;
  gmail_connected: boolean;
  resy_connected: boolean;
  ical_feed_token: string;
}

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("");
  const [defaultLocation, setDefaultLocation] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.profile.get();
      setProfile(data);
      setFullName(data.full_name);
      setPhone(data.phone);
      setTimezone(data.timezone);
      setDefaultLocation(data.default_location);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await api.profile.update({
        full_name: fullName,
        phone,
        timezone,
        default_location: defaultLocation,
      });
      setProfile(updated);
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    profile &&
    (fullName !== profile.full_name ||
      phone !== profile.phone ||
      timezone !== profile.timezone ||
      defaultLocation !== profile.default_location);

  const connectGmail = async () => {
    try {
      const { url } = await api.gmail.getAuthUrl();
      if (typeof window !== "undefined") {
        window.open(url, "_blank");
      } else {
        Linking.openURL(url);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  // Resy modal state
  const [resyModalVisible, setResyModalVisible] = useState(false);
  const [resyEmail, setResyEmail] = useState("");
  const [resyPassword, setResyPassword] = useState("");
  const [resyConnecting, setResyConnecting] = useState(false);
  const [resyError, setResyError] = useState("");

  const submitResyConnect = async () => {
    if (!resyEmail || !resyPassword) {
      setResyError("Please enter both email and password.");
      return;
    }
    setResyConnecting(true);
    setResyError("");
    try {
      await api.resy.connect(resyEmail, resyPassword);
      setResyModalVisible(false);
      setResyEmail("");
      setResyPassword("");
    } catch (e: any) {
      const msg = e.message || "Could not connect to Resy.";
      if (msg.includes("401")) {
        setResyError("Invalid email or password.");
      } else {
        // Connect may have succeeded server-side even if response parsing failed
        setResyModalVisible(false);
      }
    } finally {
      setResyConnecting(false);
      await loadProfile();
    }
  };

  const disconnectResy = async () => {
    try {
      await api.resy.unlink();
      setProfile((prev) => (prev ? { ...prev, resy_connected: false } : null));
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const copyIcalUrl = async () => {
    const url = `${process.env.EXPO_PUBLIC_API_URL}/api/ical/feed/${profile?.ical_feed_token}`;
    if (Clipboard.setStringAsync) {
      await Clipboard.setStringAsync(url);
    }
    Alert.alert("Copied!", "iCal feed URL copied to clipboard");
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={EARTHY.bark} />
      </View>
    );
  }

  return (
    <ScreenContainer>
    <ScreenHeader left="back" title="Settings" />
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Your Info</Text>
      <Text style={styles.helpText}>
        Used to auto-fill booking forms so the agent can book for you.
      </Text>
      <View style={styles.card}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your full name"
          placeholderTextColor={EARTHY.stoneLight}
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Your phone number"
          placeholderTextColor={EARTHY.stoneLight}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Default Location</Text>
        <TextInput
          style={styles.input}
          value={defaultLocation}
          onChangeText={setDefaultLocation}
          placeholder='e.g. "Midtown Manhattan, NYC"'
          placeholderTextColor={EARTHY.stoneLight}
        />

        <Text style={styles.label}>Timezone</Text>
        <TextInput
          style={styles.input}
          value={timezone}
          onChangeText={setTimezone}
          placeholder="e.g. America/New_York"
          placeholderTextColor={EARTHY.stoneLight}
        />
      </View>

      {hasChanges && (
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={saveProfile}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{profile?.email}</Text>
      </View>

      <Text style={styles.sectionTitle}>Gmail Integration</Text>
      <View style={styles.card}>
        {profile?.gmail_connected ? (
          <View style={styles.row}>
            <View style={styles.statusDot} />
            <Text style={styles.value}>Connected</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.actionButton} onPress={connectGmail}>
            <Text style={styles.actionButtonText}>Connect Gmail</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>Resy Integration</Text>
      <View style={styles.card}>
        {profile?.resy_connected ? (
          <View>
            <View style={styles.row}>
              <View style={styles.statusDot} />
              <Text style={styles.value}>Connected</Text>
            </View>
            <TouchableOpacity
              style={[styles.outlineButton, { marginTop: s(12) }]}
              onPress={disconnectResy}
            >
              <Text style={styles.outlineButtonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.actionButton} onPress={() => { setResyError(""); setResyModalVisible(true); }}>
            <Text style={styles.actionButtonText}>Connect Resy</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>iCal Feed</Text>
      <View style={styles.card}>
        <Text style={styles.helpTextInCard}>
          Add this URL to Google Calendar to sync your events.
        </Text>
        <TouchableOpacity style={styles.outlineButton} onPress={copyIcalUrl}>
          <Text style={styles.outlineButtonText}>Copy Feed URL</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>

      {/* Resy Connect Modal */}
      <Modal visible={resyModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setResyModalVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalKeyboard}
          >
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setResyModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>{"\u2715"}</Text>
              </TouchableOpacity>

              <View style={styles.resyBadge}>
                <Text style={styles.resyBadgeText}>RESY</Text>
              </View>

              <Text style={styles.modalTitle}>Connect your Resy Account</Text>

              <Text style={styles.modalBody}>
                Enter your Resy email and password. Your credentials are stored securely and will only be used to book your reservations.
              </Text>

              <Text style={styles.modalBody}>
                Make sure you have a valid payment method linked to your Resy account. If you don't, you won't be able to book reservations that require a payment upon booking.
              </Text>

              {resyError ? (
                <View style={styles.resyErrorBox}>
                  <Text style={styles.resyErrorText}>{resyError}</Text>
                </View>
              ) : null}

              <Text style={styles.modalLabel}>Email</Text>
              <TextInput
                style={styles.modalInput}
                value={resyEmail}
                onChangeText={setResyEmail}
                placeholder="your@email.com"
                placeholderTextColor={EARTHY.stoneLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <Text style={styles.modalLabel}>Password</Text>
              <TextInput
                style={styles.modalInput}
                value={resyPassword}
                onChangeText={setResyPassword}
                placeholder="Resy password"
                placeholderTextColor={EARTHY.stoneLight}
                secureTextEntry
                autoComplete="current-password"
              />

              <TouchableOpacity
                style={[styles.resySubmitButton, resyConnecting && styles.buttonDisabled]}
                onPress={submitResyConnect}
                disabled={resyConnecting}
              >
                <Text style={styles.resySubmitText}>
                  {resyConnecting ? "Connecting..." : "Submit"}
                </Text>
              </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: EARTHY.cream,
  },
  content: {
    padding: s(24),
    paddingBottom: s(60),
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: EARTHY.cream,
  },
  sectionTitle: {
    fontSize: fontSize(12),
    fontFamily: FONTS.bodyMedium,
    color: EARTHY.stone,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: s(28),
    marginBottom: s(6),
    marginLeft: s(4),
  },
  helpText: {
    fontSize: fontSize(13),
    color: EARTHY.barkSoft,
    fontFamily: FONTS.bodyLight,
    marginBottom: s(10),
    marginLeft: s(4),
    lineHeight: fontSize(18),
  },
  helpTextInCard: {
    fontSize: fontSize(14),
    color: EARTHY.barkSoft,
    fontFamily: FONTS.bodyLight,
    marginBottom: s(12),
    lineHeight: fontSize(20),
  },
  card: {
    backgroundColor: EARTHY.white,
    borderRadius: s(14),
    padding: s(16),
    borderWidth: 1,
    borderColor: EARTHY.sand,
  },
  label: {
    fontSize: fontSize(12),
    color: EARTHY.stone,
    fontFamily: FONTS.bodyMedium,
    marginBottom: s(4),
    marginTop: s(12),
  },
  input: {
    borderWidth: 1,
    borderColor: EARTHY.sand,
    borderRadius: s(10),
    padding: s(12),
    fontSize: fontSize(15),
    backgroundColor: EARTHY.cream,
    color: EARTHY.bark,
    fontFamily: FONTS.body,
  },
  value: {
    fontSize: fontSize(15),
    color: EARTHY.bark,
    fontFamily: FONTS.bodyMedium,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(8),
  },
  statusDot: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    backgroundColor: "#86C3B9",
  },
  saveButton: {
    backgroundColor: ACCENT,
    borderRadius: s(12),
    padding: s(14),
    alignItems: "center",
    marginTop: s(16),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: EARTHY.white,
    fontSize: fontSize(15),
    fontFamily: FONTS.bodyMedium,
  },
  actionButton: {
    backgroundColor: ACCENT,
    borderRadius: s(10),
    padding: s(14),
    alignItems: "center",
  },
  actionButtonText: {
    color: EARTHY.white,
    fontSize: fontSize(15),
    fontFamily: FONTS.bodyMedium,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: s(10),
    padding: s(14),
    alignItems: "center",
  },
  outlineButtonText: {
    color: ACCENT,
    fontSize: fontSize(15),
    fontFamily: FONTS.bodyMedium,
  },
  signOutButton: {
    marginTop: s(40),
    padding: s(16),
    alignItems: "center",
  },
  signOutText: {
    color: "#EF4444",
    fontSize: fontSize(15),
    fontFamily: FONTS.bodyMedium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(59,47,38,0.4)",
    justifyContent: "flex-end",
  },
  modalKeyboard: {
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: EARTHY.white,
    borderTopLeftRadius: s(24),
    borderTopRightRadius: s(24),
    padding: s(24),
    paddingTop: s(20),
    paddingBottom: s(40),
  },
  modalClose: {
    alignSelf: "flex-end",
    padding: s(4),
  },
  modalCloseText: {
    fontSize: fontSize(18),
    color: EARTHY.stone,
  },
  resyBadge: {
    backgroundColor: "#DA3743",
    borderRadius: s(6),
    paddingHorizontal: s(12),
    paddingVertical: s(4),
    alignSelf: "flex-start",
    marginBottom: s(16),
  },
  resyBadgeText: {
    color: "#FFFFFF",
    fontSize: fontSize(13),
    fontFamily: FONTS.bodyMedium,
    fontWeight: "700",
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: fontSize(22),
    fontFamily: FONTS.heading,
    color: EARTHY.bark,
    marginBottom: s(12),
  },
  modalBody: {
    fontSize: fontSize(14),
    fontFamily: FONTS.body,
    color: EARTHY.barkSoft,
    lineHeight: fontSize(20),
    marginBottom: s(12),
  },
  modalLabel: {
    fontSize: fontSize(12),
    color: EARTHY.stone,
    fontFamily: FONTS.bodyMedium,
    marginBottom: s(4),
    marginTop: s(8),
  },
  modalInput: {
    borderWidth: 1,
    borderColor: EARTHY.sand,
    borderRadius: s(10),
    padding: s(14),
    fontSize: fontSize(15),
    backgroundColor: EARTHY.white,
    color: EARTHY.bark,
    fontFamily: FONTS.body,
  },
  resyErrorBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: s(10),
    padding: s(12),
    marginBottom: s(8),
  },
  resyErrorText: {
    color: "#991B1B",
    fontSize: fontSize(13),
    fontFamily: FONTS.body,
  },
  resySubmitButton: {
    backgroundColor: "#C0935A",
    borderRadius: s(12),
    padding: s(16),
    alignItems: "center",
    marginTop: s(20),
  },
  resySubmitText: {
    color: "#FFFFFF",
    fontSize: fontSize(16),
    fontFamily: FONTS.bodyMedium,
    fontWeight: "600",
  },
});
