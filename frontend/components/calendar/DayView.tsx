import { useRef, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { CalendarEvent } from "../../stores/eventStore";
import EventCard from "./EventCard";
import { parseISO } from "../../lib/dates";

const HOUR_HEIGHT = 60;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface Props {
  date: Date;
  events: CalendarEvent[];
}

export default function DayView({ date, events }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Scroll to 8 AM on mount
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 8 * HOUR_HEIGHT, animated: false });
    }, 100);
  }, []);

  const getEventPosition = (event: CalendarEvent) => {
    const start = parseISO(event.start_time);
    const end = parseISO(event.end_time);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const top = (startMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max(
      ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT,
      24
    );
    return { top, height };
  };

  return (
    <ScrollView ref={scrollRef} style={styles.container}>
      <View style={styles.timeline}>
        {HOURS.map((hour) => (
          <View key={hour} style={styles.hourRow}>
            <Text style={styles.hourLabel}>
              {hour === 0
                ? "12 AM"
                : hour < 12
                  ? `${hour} AM`
                  : hour === 12
                    ? "12 PM"
                    : `${hour - 12} PM`}
            </Text>
            <View style={styles.hourLine} />
          </View>
        ))}

        {events.map((event) => {
          const { top, height } = getEventPosition(event);
          return (
            <View
              key={event.id}
              style={[styles.eventWrapper, { top, height }]}
            >
              <EventCard event={event} compact />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timeline: {
    position: "relative",
    height: 24 * HOUR_HEIGHT,
    marginLeft: 60,
    marginRight: 12,
  },
  hourRow: {
    height: HOUR_HEIGHT,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  hourLabel: {
    position: "absolute",
    left: -56,
    fontSize: 12,
    color: "#999",
    width: 48,
    textAlign: "right",
    top: -7,
  },
  hourLine: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5E5",
  },
  eventWrapper: {
    position: "absolute",
    left: 4,
    right: 4,
  },
});
