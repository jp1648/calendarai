import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, ACCENT, FONTS } from "../../lib/theme";

interface Props {
  visible: boolean;
  value: string; // "HH:mm"
  onSelect: (time: string) => void;
  onClose: () => void;
}

function timeStringToDate(time: string): Date {
  const [h, m] = (time || "12:00").split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function dateToTimeString(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function TimePickerModal({ visible, value, onSelect, onClose }: Props) {
  const [tempDate, setTempDate] = useState(() => timeStringToDate(value));

  const handleChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      if (selectedDate) {
        onSelect(dateToTimeString(selectedDate));
      }
      onClose();
      return;
    }
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleConfirm = () => {
    onSelect(dateToTimeString(tempDate));
    onClose();
  };

  if (Platform.OS === "android") {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={timeStringToDate(value)}
        mode="time"
        display="default"
        onChange={handleChange}
      />
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Select Time</Text>
          <DateTimePicker
            value={tempDate}
            mode="time"
            display="spinner"
            onChange={handleChange}
            style={styles.picker}
            textColor={EARTHY.bark}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(1,35,64,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: EARTHY.white,
    borderRadius: s(20),
    padding: s(20),
    width: s(320),
    shadowColor: EARTHY.bark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
  title: {
    fontSize: fontSize(16),
    fontFamily: FONTS.heading,
    color: EARTHY.bark,
    textAlign: "center",
    marginBottom: s(8),
  },
  picker: {
    height: 200,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: s(12),
    gap: s(12),
  },
  cancelButton: {
    flex: 1,
    paddingVertical: s(12),
    borderRadius: s(12),
    backgroundColor: EARTHY.sandLight,
    alignItems: "center",
  },
  cancelText: {
    fontSize: fontSize(15),
    fontFamily: FONTS.bodyMedium,
    color: EARTHY.barkSoft,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: s(12),
    borderRadius: s(12),
    backgroundColor: ACCENT,
    alignItems: "center",
  },
  confirmText: {
    fontSize: fontSize(15),
    fontFamily: FONTS.bodyMedium,
    color: EARTHY.white,
  },
});
