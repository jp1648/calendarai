import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, FONTS } from "../../lib/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

export default function ResyConnectModal({ visible, onClose, onConnected }: Props) {
  const queryClient = useQueryClient();
  const [resyEmail, setResyEmail] = useState("");
  const [resyPassword, setResyPassword] = useState("");
  const [resyConnecting, setResyConnecting] = useState(false);
  const [resyError, setResyError] = useState("");

  const handleClose = () => {
    setResyEmail("");
    setResyPassword("");
    setResyError("");
    onClose();
  };

  const submitResyConnect = async () => {
    if (!resyEmail || !resyPassword) {
      setResyError("Please enter both email and password.");
      return;
    }
    setResyConnecting(true);
    setResyError("");
    try {
      await api.resy.connect(resyEmail, resyPassword);
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      onConnected?.();
      handleClose();
    } catch (e: any) {
      const msg = e.message || "Could not connect to Resy.";
      if (msg.includes("401")) {
        setResyError("Invalid email or password.");
      } else {
        setResyError(msg || "Could not connect to Resy. Please try again.");
      }
    } finally {
      setResyConnecting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalKeyboard}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={handleClose}
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
  );
}

const styles = StyleSheet.create({
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
  buttonDisabled: {
    opacity: 0.5,
  },
  resySubmitText: {
    color: "#FFFFFF",
    fontSize: fontSize(16),
    fontFamily: FONTS.bodyMedium,
    fontWeight: "600",
  },
});
