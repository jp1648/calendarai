import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  Pressable,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { format, addMonths, subMonths } from "../../lib/dates";
import { useEvents } from "../../hooks/useEvents";
import MonthView from "../../components/calendar/MonthView";
import NaturalLanguageBar from "../../components/input/NaturalLanguageBar";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentMonth.getFullYear());
  const { events, loading, refresh } = useEvents(currentMonth);
  const router = useRouter();

  const goToPrevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const goToNextMonth = () => setCurrentMonth((m) => addMonths(m, 1));

  const openPicker = () => {
    setPickerYear(currentMonth.getFullYear());
    setPickerVisible(true);
  };

  const selectMonth = (monthIndex: number) => {
    setCurrentMonth(new Date(pickerYear, monthIndex, 1));
    setPickerVisible(false);
  };

  const onDayPress = useCallback(
    (date: Date) => {
      router.push(`/(app)/day/${format(date, "yyyy-MM-dd")}`);
    },
    [router]
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "CalendarAI",
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push("/(app)/settings")} style={{ marginRight: 16 }}>
              <Text style={{ color: "#007AFF", fontSize: 16 }}>Settings</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
            <Text style={styles.navText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openPicker}>
            <Text style={styles.monthTitle}>
              {format(currentMonth, "MMMM yyyy")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
            <Text style={styles.navText}>›</Text>
          </TouchableOpacity>
        </View>

        <MonthView
          currentMonth={currentMonth}
          events={events}
          onDayPress={onDayPress}
        />

        <NaturalLanguageBar onEventCreated={refresh} />
      </SafeAreaView>

      <Modal visible={pickerVisible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setPickerVisible(false)}>
          <Pressable style={styles.pickerCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.yearRow}>
              <TouchableOpacity onPress={() => setPickerYear((y) => y - 1)}>
                <Text style={styles.yearArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.yearText}>{pickerYear}</Text>
              <TouchableOpacity onPress={() => setPickerYear((y) => y + 1)}>
                <Text style={styles.yearArrow}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.monthGrid}>
              {MONTHS.map((name, i) => {
                const isActive =
                  i === currentMonth.getMonth() &&
                  pickerYear === currentMonth.getFullYear();
                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.monthCell, isActive && styles.monthCellActive]}
                    onPress={() => selectMonth(i)}
                  >
                    <Text
                      style={[
                        styles.monthCellText,
                        isActive && styles.monthCellTextActive,
                      ]}
                    >
                      {name.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navButton: {
    padding: 8,
  },
  navText: {
    fontSize: 28,
    color: "#007AFF",
    fontWeight: "300",
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  yearArrow: {
    fontSize: 24,
    color: "#007AFF",
    paddingHorizontal: 12,
  },
  yearText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  monthCell: {
    width: "25%" as any,
    alignItems: "center" as const,
    paddingVertical: 12,
    borderRadius: 8,
  },
  monthCellActive: {
    backgroundColor: "#007AFF",
  },
  monthCellText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  monthCellTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
});
