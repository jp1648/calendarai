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
import { useRouter } from "expo-router";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, ACCENT, FONTS } from "../../lib/theme";

export default function NameScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");

  const handleContinue = () => {
    setError("");
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first) {
      setError("Please enter your first name");
      return;
    }
    if (!last) {
      setError("Please enter your last name");
      return;
    }
    router.push({
      pathname: "/(auth)/signup",
      params: { firstName: first, lastName: last },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.brand}>
            calendar<Text style={styles.brandAccent}>ai</Text>
          </Text>
          <Text style={styles.title}>What's your name?</Text>
          <Text style={styles.subtitle}>
            Used to auto-fill bookings and reservations.
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="First name"
            value={firstName}
            onChangeText={(t) => { setFirstName(t); setError(""); }}
            autoCapitalize="words"
            placeholderTextColor={EARTHY.stoneLight}
            autoFocus
          />
          <TextInput
            style={styles.input}
            placeholder="Last name"
            value={lastName}
            onChangeText={(t) => { setLastName(t); setError(""); }}
            autoCapitalize="words"
            placeholderTextColor={EARTHY.stoneLight}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, (!firstName.trim() || !lastName.trim()) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!firstName.trim() || !lastName.trim()}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={styles.linkText}>
            Already have an account?{" "}
            <Text style={styles.linkBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
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
    marginBottom: s(32),
  },
  brand: {
    fontSize: fontSize(14),
    fontFamily: FONTS.bodyLight,
    color: EARTHY.bark,
    letterSpacing: 0.5,
    marginBottom: s(24),
  },
  brandAccent: {
    color: ACCENT,
    fontFamily: FONTS.bodyMedium,
  },
  title: {
    fontSize: fontSize(26),
    fontFamily: FONTS.heading,
    color: EARTHY.bark,
  },
  subtitle: {
    fontSize: fontSize(14),
    color: EARTHY.stone,
    fontFamily: FONTS.bodyLight,
    marginTop: s(6),
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
  errorText: {
    fontSize: fontSize(13),
    fontFamily: FONTS.body,
    color: "#B44040",
    paddingHorizontal: s(4),
  },
});
