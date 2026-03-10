import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CalendarEvent } from "../../stores/eventStore";
import { formatTime } from "../../lib/dates";
import { s, fontSize } from "../../lib/responsive";
import AgentBadge from "./AgentBadge";

interface Props {
  event: CalendarEvent;
  compact?: boolean;
  onPress?: (event: CalendarEvent) => void;
}

const SOURCE_COLORS: Record<string, string> = {
  manual: "#3B82F6",
  email_agent: "#EC4899",
  schedule_agent: "#8B5CF6",
};

export default function EventCard({ event, compact, onPress }: Props) {
  const color = SOURCE_COLORS[event.source] || SOURCE_COLORS.manual;

  const card = (
    <View style={[styles.card, { backgroundColor: color + "10", borderLeftColor: color }]}>
      <View style={styles.header}>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
          {event.title}
        </Text>
        {event.source !== "manual" && <AgentBadge source={event.source} />}
      </View>
      {!compact && (
        <Text style={styles.time}>
          {formatTime(event.start_time)} – {formatTime(event.end_time)}
        </Text>
      )}
      {!compact && event.location ? (
        <Text style={styles.location} numberOfLines={1}>
          {event.location}
        </Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.6} onPress={() => onPress(event)}>
        {card}
      </TouchableOpacity>
    );
  }

  return card;
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 3,
    borderRadius: s(8),
    padding: s(8),
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(4),
  },
  title: {
    fontSize: fontSize(13),
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 1,
  },
  titleCompact: {
    fontSize: fontSize(11),
  },
  time: {
    fontSize: fontSize(11),
    color: "#6B7280",
    marginTop: s(2),
  },
  location: {
    fontSize: fontSize(11),
    color: "#9CA3AF",
    marginTop: s(1),
  },
});
