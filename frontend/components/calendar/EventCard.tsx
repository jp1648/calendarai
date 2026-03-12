import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CalendarEvent } from "../../stores/eventStore";
import { formatTime } from "../../lib/dates";
import { s, fontSize } from "../../lib/responsive";
import AgentBadge from "./AgentBadge";
import { EARTHY, FONTS, getCategoryColors } from "../../lib/theme";

interface Props {
  event: CalendarEvent;
  compact?: boolean;
  onPress?: (event: CalendarEvent) => void;
}

export default function EventCard({ event, compact, onPress }: Props) {
  const cat = getCategoryColors(event);

  const card = (
    <View style={[styles.card, { backgroundColor: cat.bg, borderLeftColor: cat.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
          {event.title}
        </Text>
        {event.source !== "manual" && <AgentBadge source={event.source} />}
      </View>
      {!compact && (
        <Text style={[styles.time, { color: cat.text }]}>
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
    fontFamily: FONTS.body,
    color: EARTHY.bark,
    flex: 1,
  },
  titleCompact: {
    fontSize: fontSize(11),
  },
  time: {
    fontSize: fontSize(11),
    fontFamily: FONTS.bodyLight,
    marginTop: s(2),
  },
  location: {
    fontSize: fontSize(11),
    color: EARTHY.stone,
    fontFamily: FONTS.bodyLight,
    marginTop: s(1),
  },
});
