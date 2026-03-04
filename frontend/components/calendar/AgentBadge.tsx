import { View, Text, StyleSheet } from "react-native";

interface Props {
  source: string;
}

const BADGE_CONFIG: Record<string, { label: string; color: string }> = {
  email_agent: { label: "Email", color: "#AF52DE" },
  schedule_agent: { label: "AI", color: "#5AC8FA" },
};

export default function AgentBadge({ source }: Props) {
  const config = BADGE_CONFIG[source];
  if (!config) return null;

  return (
    <View style={[styles.badge, { backgroundColor: config.color + "20" }]}>
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: {
    fontSize: 10,
    fontWeight: "700",
  },
});
