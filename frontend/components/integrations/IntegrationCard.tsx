import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, ACCENT, FONTS } from "../../lib/theme";

interface IntegrationCardProps {
  connected: boolean;
  connectLabel: string;
  disconnectLabel?: string;
  description?: string;
  loading?: boolean;
  onConnect: () => void;
  onDisconnect?: () => void;
}

export default function IntegrationCard({
  connected,
  connectLabel,
  disconnectLabel = "Disconnect",
  description,
  loading = false,
  onConnect,
  onDisconnect,
}: IntegrationCardProps) {
  return (
    <View style={styles.card}>
      {description && <Text style={styles.description}>{description}</Text>}
      {loading ? (
        <ActivityIndicator size="small" color={EARTHY.bark} />
      ) : connected ? (
        <View>
          <View style={styles.row}>
            <View style={styles.statusDot} />
            <Text style={styles.value}>Connected</Text>
          </View>
          {onDisconnect && (
            <TouchableOpacity
              style={[styles.outlineButton, { marginTop: s(12) }]}
              onPress={onDisconnect}
            >
              <Text style={styles.outlineButtonText}>{disconnectLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity style={styles.actionButton} onPress={onConnect}>
          <Text style={styles.actionButtonText}>{connectLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: EARTHY.white,
    borderRadius: s(14),
    padding: s(16),
    borderWidth: 1,
    borderColor: EARTHY.sand,
  },
  description: {
    fontSize: fontSize(13),
    color: EARTHY.barkSoft,
    fontFamily: FONTS.bodyLight,
    lineHeight: fontSize(18),
    marginBottom: s(12),
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
  value: {
    fontSize: fontSize(15),
    color: EARTHY.bark,
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
});
