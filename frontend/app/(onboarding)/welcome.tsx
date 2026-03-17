import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import ScreenContainer from "../../components/ui/ScreenContainer";
import ScreenHeader from "../../components/ui/ScreenHeader";
import { api } from "../../lib/api";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, ACCENT, FONTS } from "../../lib/theme";

export default function WelcomeScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError("");
    try {
      await api.profile.update({ full_name: trimmed });
      router.push("/(onboarding)/connect");
    } catch (e: any) {
      setError(e.message || "Could not save your name.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader left={null} title="" />
      <View style={styles.container}>
        <Text style={styles.brand}>
          calendar<Text style={styles.brandAccent}>ai</Text>
        </Text>
        <Text style={styles.headline}>Let's set up your calendar</Text>
        <Text style={styles.subtext}>What should we call you?</Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={EARTHY.stoneLight}
          autoFocus
          maxLength={100}
          returnKeyType="done"
          onSubmitEditing={handleContinue}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.continueButton, (!name.trim() || saving) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!name.trim() || saving}
          >
            {saving ? (
              <ActivityIndicator color={EARTHY.white} />
            ) : (
              <Text style={styles.continueText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: s(24),
    paddingTop: s(40),
  },
  brand: {
    fontSize: fontSize(16),
    fontFamily: FONTS.bodyLight,
    color: EARTHY.bark,
    letterSpacing: 0.5,
    marginBottom: s(32),
  },
  brandAccent: {
    color: ACCENT,
    fontFamily: FONTS.bodyMedium,
  },
  headline: {
    fontSize: fontSize(26),
    fontFamily: FONTS.heading,
    color: EARTHY.bark,
    marginBottom: s(8),
  },
  subtext: {
    fontSize: fontSize(15),
    fontFamily: FONTS.bodyLight,
    color: EARTHY.stone,
    marginBottom: s(24),
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
  error: {
    color: "#991B1B",
    fontSize: fontSize(13),
    fontFamily: FONTS.body,
    marginTop: s(8),
  },
  footer: {
    marginTop: "auto",
    paddingBottom: s(40),
  },
  continueButton: {
    backgroundColor: ACCENT,
    borderRadius: s(14),
    padding: s(16),
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  continueText: {
    color: EARTHY.white,
    fontSize: fontSize(16),
    fontFamily: FONTS.bodyMedium,
  },
});
