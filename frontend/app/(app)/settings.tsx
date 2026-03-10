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
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../lib/api";
import * as Clipboard from "expo-clipboard";
import { s, fontSize } from "../../lib/responsive";

interface Profile {
  full_name: string;
  phone: string;
  timezone: string;
  default_location: string;
  email: string;
  gmail_connected: boolean;
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
      Linking.openURL(url);
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
        <ActivityIndicator size="large" color="#1A1A1A" />
      </View>
    );
  }

  return (
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
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Your phone number"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Default Location</Text>
        <TextInput
          style={styles.input}
          value={defaultLocation}
          onChangeText={setDefaultLocation}
          placeholder='e.g. "Midtown Manhattan, NYC"'
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>Timezone</Text>
        <TextInput
          style={styles.input}
          value={timezone}
          onChangeText={setTimezone}
          placeholder="e.g. America/New_York"
          placeholderTextColor="#9CA3AF"
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  content: {
    padding: s(24),
    paddingBottom: s(60),
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  sectionTitle: {
    fontSize: fontSize(12),
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: s(28),
    marginBottom: s(6),
    marginLeft: s(4),
  },
  helpText: {
    fontSize: fontSize(13),
    color: "#6B7280",
    marginBottom: s(10),
    marginLeft: s(4),
    lineHeight: fontSize(18),
  },
  helpTextInCard: {
    fontSize: fontSize(14),
    color: "#6B7280",
    marginBottom: s(12),
    lineHeight: fontSize(20),
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: s(14),
    padding: s(16),
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  label: {
    fontSize: fontSize(12),
    color: "#9CA3AF",
    fontWeight: "500",
    marginBottom: s(4),
    marginTop: s(12),
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: s(10),
    padding: s(12),
    fontSize: fontSize(15),
    backgroundColor: "#FAFAFA",
    color: "#1A1A1A",
  },
  value: {
    fontSize: fontSize(15),
    color: "#1A1A1A",
    fontWeight: "500",
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
    backgroundColor: "#22C55E",
  },
  saveButton: {
    backgroundColor: "#1A1A1A",
    borderRadius: s(12),
    padding: s(14),
    alignItems: "center",
    marginTop: s(16),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: fontSize(15),
    fontWeight: "600",
  },
  actionButton: {
    backgroundColor: "#1A1A1A",
    borderRadius: s(10),
    padding: s(14),
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: fontSize(15),
    fontWeight: "600",
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: s(10),
    padding: s(14),
    alignItems: "center",
  },
  outlineButtonText: {
    color: "#1A1A1A",
    fontSize: fontSize(15),
    fontWeight: "600",
  },
  signOutButton: {
    marginTop: s(40),
    padding: s(16),
    alignItems: "center",
  },
  signOutText: {
    color: "#EF4444",
    fontSize: fontSize(15),
    fontWeight: "600",
  },
});
