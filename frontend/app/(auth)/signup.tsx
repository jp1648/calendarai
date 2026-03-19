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
import { Link, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../hooks/useAuth";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, ACCENT, FONTS } from "../../lib/theme";
import { isValidEmail, normalizeEmail, validatePassword } from "../../lib/validation";

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: "8+ characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "Uppercase letter" },
  { test: (p: string) => /[0-9]/.test(p), label: "Number" },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "Special character" },
];

export default function SignupScreen() {
  const { firstName, lastName } = useLocalSearchParams<{ firstName?: string; lastName?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { signUp } = useAuth();

  const allRulesPassed = PASSWORD_RULES.every((r) => r.test(password));

  const handleSignup = async () => {
    setError("");
    const trimmedEmail = normalizeEmail(email);
    if (!trimmedEmail) {
      setError("Please enter your email");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }
    if (!password) {
      setError("Please enter a password");
      return;
    }
    if (!allRulesPassed) return;
    setLoading(true);
    try {
      // Store name for the connect screen to save (session may not be ready yet)
      if (firstName || lastName) {
        const fullName = [firstName, lastName].filter(Boolean).join(" ");
        await AsyncStorage.setItem("pending_full_name", fullName);
      }
      await signUp(trimmedEmail, password);
    } catch (e: any) {
      setError(e.message);
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
          <Text style={styles.subtitle}>
            {firstName ? `Hey ${firstName}, create your account` : "Create your account"}
          </Text>
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
            onChangeText={(t) => { setPassword(t); setError(""); }}
            secureTextEntry
            placeholderTextColor={EARTHY.stoneLight}
          />

          {password.length > 0 && (
            <View style={styles.rules}>
              {PASSWORD_RULES.map((rule) => {
                const passed = rule.test(password);
                return (
                  <Text
                    key={rule.label}
                    style={[styles.ruleText, passed && styles.ruleTextPassed]}
                  >
                    {passed ? "\u2713" : "\u2022"} {rule.label}
                  </Text>
                );
              })}
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, (loading || (password.length > 0 && !allRulesPassed)) && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading || (password.length > 0 && !allRulesPassed)}
          >
            <Text style={styles.buttonText}>
              {loading ? "Creating account..." : "Sign up"}
            </Text>
          </TouchableOpacity>
        </View>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>
              Already have an account?{" "}
              <Text style={styles.linkBold}>Sign in</Text>
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
  rules: {
    gap: s(4),
    paddingHorizontal: s(4),
  },
  ruleText: {
    fontSize: fontSize(12),
    fontFamily: FONTS.body,
    color: EARTHY.stone,
  },
  ruleTextPassed: {
    color: EARTHY.success,
  },
  errorText: {
    fontSize: fontSize(13),
    fontFamily: FONTS.body,
    color: EARTHY.error,
    paddingHorizontal: s(4),
  },
});
