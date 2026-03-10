import { View, Text, StyleSheet } from "react-native";
import { s, fontSize } from "../../lib/responsive";

interface Props {
  source: string;
}

const BADGE_CONFIG: Record<string, { label: string; color: string }> = {
  email_agent: { label: "Email", color: "#EC4899" },
  schedule_agent: { label: "AI", color: "#8B5CF6" },
};

export default function AgentBadge({ source }: Props) {
  const config = BADGE_CONFIG[source];
  if (!config) return null;

  return (
    <View style={[styles.badge, { backgroundColor: config.color + "14" }]}>
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
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
