import { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  getCalendarDays,
  isSameDay,
  isSameMonth,
  format,
  parseISO,
} from "../../lib/dates";
import { CalendarEvent } from "../../stores/eventStore";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  currentMonth: Date;
  events: CalendarEvent[];
  onDayPress: (date: Date) => void;
}

export default function MonthView({ currentMonth, events, onDayPress }: Props) {
  const days = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);
  const today = new Date();

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const key = format(parseISO(e.start_time), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  return (
    <View style={styles.container}>
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day, i) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) || [];
          const isToday = isSameDay(day, today);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const hasAgent = dayEvents.some((e) => e.source !== "manual");

          return (
            <TouchableOpacity
              key={i}
              style={styles.dayCell}
              onPress={() => onDayPress(day)}
              activeOpacity={0.6}
            >
              <View
                style={[styles.dayNumber, isToday && styles.todayCircle]}
              >
                <Text
                  style={[
                    styles.dayText,
                    !isCurrentMonth && styles.dimText,
                    isToday && styles.todayText,
                  ]}
                >
                  {format(day, "d")}
                </Text>
              </View>
              <View style={styles.dotRow}>
                {dayEvents.length > 0 && (
                  <View
                    style={[
                      styles.dot,
                      hasAgent ? styles.dotBlue : styles.dotGray,
                    ]}
                  />
                )}
                {dayEvents.length > 1 && (
                  <View
                    style={[
                      styles.dot,
                      styles.dotGray,
                    ]}
                  />
                )}
                {dayEvents.length > 2 && (
                  <View
                    style={[
                      styles.dot,
                      styles.dotGray,
                    ]}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 8,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  weekdayText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    alignItems: "center",
    paddingVertical: 6,
    minHeight: 52,
  },
  dayNumber: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  dayText: {
    fontSize: 16,
    color: "#000",
  },
  dimText: {
    color: "#CCC",
  },
  todayCircle: {
    backgroundColor: "#007AFF",
  },
  todayText: {
    color: "#fff",
    fontWeight: "600",
  },
  dotRow: {
    flexDirection: "row",
    gap: 3,
    marginTop: 2,
    height: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotGray: {
    backgroundColor: "#CCC",
  },
  dotBlue: {
    backgroundColor: "#007AFF",
  },
});
