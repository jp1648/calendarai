import { View, Text, StyleSheet } from "react-native";
import { s, fontSize } from "../../lib/responsive";
import { FONTS } from "../../lib/theme";

interface Props {
  source: string;
}

const BADGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  email_agent: { label: "Email", color: "#8C6046", bg: "rgba(140,96,70,0.12)" },
  schedule_agent: { label: "AI", color: "#012340", bg: "rgba(2,64,89,0.10)" },
};

export default function AgentBadge({ source }: Props) {
  const config = BADGE_CONFIG[source];
  if (!config) return null;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: s(7),
    paddingVertical: s(2),
    borderRadius: s(6),
  },
  text: {
    fontSize: fontSize(10),
    fontFamily: FONTS.bodyMedium,
    letterSpacing: 0.3,
  },
});
