import { View, Text, StyleSheet } from "react-native";
import { CalendarEvent } from "../../stores/eventStore";
import { formatTime, parseISO } from "../../lib/dates";
import AgentBadge from "./AgentBadge";

interface Props {
  event: CalendarEvent;
  compact?: boolean;
}

const SOURCE_COLORS: Record<string, string> = {
  manual: "#007AFF",
  email_agent: "#AF52DE",
  schedule_agent: "#5AC8FA",
};

export default function EventCard({ event, compact }: Props) {
  const color = SOURCE_COLORS[event.source] || SOURCE_COLORS.manual;

  return (
    <View style={[styles.card, { backgroundColor: color + "18", borderLeftColor: color }]}>
      <View style={styles.header}>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
          {event.title}
        </Text>
        {event.source !== "manual" && <AgentBadge source={event.source} />}
      </View>
      {!compact && (
        <Text style={styles.time}>
          {formatTime(event.start_time)} - {formatTime(event.end_time)}
        </Text>
      )}
      {!compact && event.location ? (
        <Text style={styles.location} numberOfLines={1}>
          {event.location}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 3,
    borderRadius: 6,
    padding: 8,
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    flex: 1,
  },
  titleCompact: {
    fontSize: 12,
  },
  time: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  location: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
});
