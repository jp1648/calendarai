import { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import {
  getCalendarDays,
  format,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
} from "../../lib/dates";
import { s, fontSize } from "../../lib/responsive";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

interface Props {
  visible: boolean;
  value: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

export default function DatePickerModal({ visible, value, onSelect, onClose }: Props) {
  const [viewMonth, setViewMonth] = useState(value);

  const days = useMemo(() => getCalendarDays(viewMonth), [viewMonth]);

  const handleSelect = (day: Date) => {
    onSelect(day);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={() => setViewMonth((m) => subMonths(m, 1))}>
              <Text style={styles.arrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthText}>{format(viewMonth, "MMMM yyyy")}</Text>
            <TouchableOpacity onPress={() => setViewMonth((m) => addMonths(m, 1))}>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((d, i) => (
              <View key={i} style={styles.cell}>
                <Text style={styles.weekdayText}>{d}</Text>
              </View>
            ))}
          </View>

          <View style={styles.grid}>
            {days.map((day, i) => {
              const selected = isSameDay(day, value);
              const inMonth = isSameMonth(day, viewMonth);
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.cell}
                  onPress={() => handleSelect(day)}
                >
                  <View style={[styles.dayCircle, selected && styles.selectedCircle]}>
                    <Text
                      style={[
                        styles.dayText,
                        !inMonth && styles.dimText,
                        selected && styles.selectedText,
                      ]}
                    >
                      {format(day, "d")}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: s(20),
    padding: s(20),
    width: s(320),
    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
    elevation: 8,
  } as any,
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: s(16),
  },
  arrow: {
    fontSize: fontSize(24),
    color: "#1A1A1A",
    paddingHorizontal: s(12),
  },
  monthText: {
    fontSize: fontSize(16),
    fontWeight: "600",
    color: "#1A1A1A",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: s(4),
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: "14.28%" as any,
    alignItems: "center",
    paddingVertical: s(4),
  },
  dayCircle: {
    width: s(36),
    height: s(36),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: s(18),
  },
  selectedCircle: {
    backgroundColor: "#1A1A1A",
  },
  dayText: {
    fontSize: fontSize(15),
    color: "#1A1A1A",
  },
  dimText: {
    color: "#D1D5DB",
  },
  selectedText: {
    color: "#fff",
    fontWeight: "600",
  },
  weekdayText: {
    fontSize: fontSize(12),
    color: "#9CA3AF",
    fontWeight: "500",
  },
});
