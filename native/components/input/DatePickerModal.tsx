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
  value: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

export default function DatePickerModal({ visible, value, onSelect, onClose }: Props) {
  const [tempDate, setTempDate] = useState(value);

  const handleChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      // Android dismisses on selection
      if (selectedDate) {
        onSelect(selectedDate);
      }
      onClose();
      return;
    }
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleConfirm = () => {
    onSelect(tempDate);
    onClose();
  };

  if (Platform.OS === "android") {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={value}
        mode="date"
        display="default"
        onChange={handleChange}
      />
    );
  }

  // iOS: spinning wheel in a modal
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Select Date</Text>
          <DateTimePicker
            value={tempDate}
            mode="date"
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
    backgroundColor: "rgba(59,47,38,0.18)",
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
