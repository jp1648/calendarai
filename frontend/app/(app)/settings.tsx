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
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import ScreenContainer from "../../components/ui/ScreenContainer";
import ScreenHeader from "../../components/ui/ScreenHeader";
import ResyConnectModal from "../../components/integrations/ResyConnectModal";
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
  const queryClient = useQueryClient();
  const { data: profile, isLoading: loading } = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: () => api.profile.get(),
    staleTime: 1000 * 60 * 10,
  });
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("");
  const [defaultLocation, setDefaultLocation] = useState("");

  // Sync form fields when profile loads
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setPhone(profile.phone);
    setTimezone(profile.timezone);
    setDefaultLocation(profile.default_location);
  }, [profile]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await api.profile.update({
        full_name: fullName,
        phone,
        timezone,
        default_location: defaultLocation,
      });
      queryClient.setQueryData(["profile"], updated);
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

  const disconnectResy = async () => {
    try {
      await api.resy.unlink();
      queryClient.setQueryData<Profile | undefined>(["profile"], (prev) => prev ? { ...prev, resy_connected: false } : prev);
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
          <TouchableOpacity style={styles.actionButton} onPress={() => setResyModalVisible(true)}>
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

      <ResyConnectModal
        visible={resyModalVisible}
        onClose={() => setResyModalVisible(false)}
      />
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
    backgroundColor: "#3A7D6E",
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
    color: "#944B43",
    fontSize: fontSize(15),
    fontFamily: FONTS.bodyMedium,
  },
});
