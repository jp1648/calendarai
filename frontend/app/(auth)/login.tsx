import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, ACCENT, FONTS } from "../../lib/theme";
import { isValidEmail, normalizeEmail } from "../../lib/validation";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    const trimmedEmail = normalizeEmail(email);
    if (!trimmedEmail || !password) return;
    if (!isValidEmail(trimmedEmail)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      await signIn(trimmedEmail, password);
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
            placeholderTextColor={EARTHY.stoneLight}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={EARTHY.stoneLight}
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
    backgroundColor: EARTHY.cream,
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
    fontFamily: FONTS.headingBold,
    color: EARTHY.bark,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize(16),
    color: EARTHY.stone,
    fontFamily: FONTS.bodyLight,
    marginTop: s(4),
  },
  form: {
    gap: s(12),
  },
  input: {
    borderWidth: 1,
    borderColor: EARTHY.sand,
    borderRadius: s(14),
    padding: s(16),
    fontSize: fontSize(16),
    backgroundColor: EARTHY.white,
    color: EARTHY.bark,
    fontFamily: FONTS.body,
  },
  button: {
    backgroundColor: ACCENT,
    borderRadius: s(14),
    padding: s(16),
    alignItems: "center",
    marginTop: s(4),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: EARTHY.white,
    fontSize: fontSize(16),
    fontFamily: FONTS.bodyMedium,
  },
  linkButton: {
    marginTop: s(24),
    alignItems: "center",
  },
  linkText: {
    color: EARTHY.stone,
    fontSize: fontSize(14),
    fontFamily: FONTS.body,
  },
  linkBold: {
    color: ACCENT,
    fontFamily: FONTS.bodyMedium,
  },
});
