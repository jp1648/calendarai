import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { s, fontSize } from "../../lib/responsive";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.title}>CalendarAI</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#9CA3AF"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Signing in..." : "Sign in"}
            </Text>
          </TouchableOpacity>
        </View>

        <Link href="/(auth)/signup" asChild>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>
              Don't have an account?{" "}
              <Text style={styles.linkBold}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: s(28),
  },
  header: {
    marginBottom: s(40),
  },
  title: {
    fontSize: fontSize(32),
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize(16),
    color: "#9CA3AF",
    marginTop: s(4),
  },
  form: {
    gap: s(12),
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: s(14),
    padding: s(16),
    fontSize: fontSize(16),
    backgroundColor: "#FFFFFF",
    color: "#1A1A1A",
  },
  button: {
    backgroundColor: "#1A1A1A",
    borderRadius: s(14),
    padding: s(16),
    alignItems: "center",
    marginTop: s(4),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: fontSize(16),
    fontWeight: "600",
  },
  linkButton: {
    marginTop: s(24),
    alignItems: "center",
  },
  linkText: {
    color: "#9CA3AF",
    fontSize: fontSize(14),
  },
  linkBold: {
    color: "#1A1A1A",
    fontWeight: "600",
  },
});
