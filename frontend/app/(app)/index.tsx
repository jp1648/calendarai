import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { format, addMonths, subMonths } from "../../lib/dates";
import { s, fontSize } from "../../lib/responsive";
import { useEventsQuery } from "../../hooks/useEventsQuery";
import MonthView from "../../components/calendar/MonthView";
import ChatPanel from "../../components/chat/ChatPanel";
import NaturalLanguageBar from "../../components/input/NaturalLanguageBar";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentMonth.getFullYear());
  const { events, loading, refresh } = useEventsQuery(currentMonth);
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
          title: "",
          headerLeft: () => (
            <Text style={styles.headerTitle}>CalendarAI</Text>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push("/(app)/settings")}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>Settings</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openPicker}>
            <Text style={styles.monthTitle}>
              {format(currentMonth, "MMMM yyyy")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarArea}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#9CA3AF" />
            </View>
          ) : (
            <MonthView
              currentMonth={currentMonth}
              events={events}
              onDayPress={onDayPress}
              onNextMonth={goToNextMonth}
              onPrevMonth={goToPrevMonth}
            />
          )}
        </View>

        <ChatPanel />
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
    backgroundColor: "#FAFAFA",
  },
  calendarArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: fontSize(17),
    fontWeight: "700",
    color: "#1A1A1A",
    marginLeft: s(4),
  },
  headerButton: {
    marginRight: s(4),
  },
  headerButtonText: {
    color: "#6B7280",
    fontSize: fontSize(13),
    fontWeight: "500",
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: s(16),
    paddingVertical: s(6),
  },
  navButton: {
    padding: s(6),
  },
  navArrow: {
    fontSize: fontSize(22),
    color: "#1A1A1A",
    fontWeight: "300",
  },
  monthTitle: {
    fontSize: fontSize(15),
    fontWeight: "600",
    color: "#1A1A1A",
    letterSpacing: -0.3,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerCard: {
    backgroundColor: "#fff",
    borderRadius: s(20),
    padding: s(20),
    width: s(280),
    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
    elevation: 8,
  } as any,
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: s(16),
  },
  yearArrow: {
    fontSize: fontSize(22),
    color: "#1A1A1A",
    paddingHorizontal: s(12),
  },
  yearText: {
    fontSize: fontSize(17),
    fontWeight: "700",
    color: "#1A1A1A",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  monthCell: {
    width: "25%" as any,
    alignItems: "center" as const,
    paddingVertical: s(10),
    borderRadius: s(10),
  },
  monthCellActive: {
    backgroundColor: "#1A1A1A",
  },
  monthCellText: {
    fontSize: fontSize(13),
    color: "#6B7280",
    fontWeight: "500",
  },
  monthCellTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
});
