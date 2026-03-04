import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import * as Clipboard from "expo-clipboard";

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session?.user?.id)
      .single();
    setProfile(data);
    setLoading(false);
  };

  const connectGmail = async () => {
    try {
      const { url } = await api.gmail.getAuthUrl();
      Linking.openURL(url);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const copyIcalUrl = async () => {
    if (!profile?.ical_feed_token) return;
    const url = `${process.env.EXPO_PUBLIC_API_URL}/api/ical/feed/${profile.ical_feed_token}`;
    if (Clipboard.setStringAsync) {
      await Clipboard.setStringAsync(url);
    }
    Alert.alert("Copied!", "iCal feed URL copied to clipboard");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{session?.user?.email}</Text>
      </View>

      <Text style={styles.sectionTitle}>Gmail Integration</Text>
      <View style={styles.card}>
        {profile?.gmail_connected ? (
          <View style={styles.row}>
            <View style={[styles.dot, styles.dotGreen]} />
            <Text style={styles.value}>Connected</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.connectButton} onPress={connectGmail}>
            <Text style={styles.connectText}>Connect Gmail</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>iCal Feed</Text>
      <View style={styles.card}>
        <Text style={styles.helpText}>
          Add this URL to Google Calendar to sync your events.
        </Text>
        <TouchableOpacity style={styles.copyButton} onPress={copyIcalUrl}>
          <Text style={styles.copyText}>Copy Feed URL</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  label: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: "#000",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: "#34C759",
  },
  connectButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  connectText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  helpText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  copyButton: {
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  copyText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  signOutButton: {
    marginTop: 32,
    padding: 16,
    alignItems: "center",
  },
  signOutText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "600",
  },
});
