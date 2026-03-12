import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, ACCENT, FONTS } from "../../lib/theme";

interface Props {
  visible: boolean;
  value: string; // "HH:mm"
  onSelect: (time: string) => void;
  onClose: () => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

type Step = "hour" | "minute";

export default function TimePickerModal({ visible, value, onSelect, onClose }: Props) {
  const parsed = parseTime(value);
  const [step, setStep] = useState<Step>("hour");
  const [hour, setHour] = useState(parsed.hour12);
  const [ampm, setAmpm] = useState<"AM" | "PM">(parsed.ampm);

  const handleOpen = () => {
    const p = parseTime(value);
    setHour(p.hour12);
    setAmpm(p.ampm);
    setStep("hour");
  };

  const selectHour = (h: number) => {
    setHour(h);
    setStep("minute");
  };

  const selectMinute = (m: number) => {
    const h24 = to24(hour, ampm);
    const hStr = String(h24).padStart(2, "0");
    const mStr = String(m).padStart(2, "0");
    onSelect(`${hStr}:${mStr}`);
    onClose();
    setStep("hour");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onShow={handleOpen}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>
            {step === "hour" ? "Select hour" : "Select minute"}
          </Text>

          {step === "hour" ? (
            <>
              <View style={styles.grid}>
                {HOURS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.cell, h === hour && styles.cellActive]}
                    onPress={() => selectHour(h)}
                  >
                    <Text style={[styles.cellText, h === hour && styles.cellTextActive]}>
                      {h}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.ampmRow}>
                <TouchableOpacity
                  style={[styles.ampmButton, ampm === "AM" && styles.ampmActive]}
                  onPress={() => setAmpm("AM")}
                >
                  <Text style={[styles.ampmText, ampm === "AM" && styles.ampmTextActive]}>
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ampmButton, ampm === "PM" && styles.ampmActive]}
                  onPress={() => setAmpm("PM")}
                >
                  <Text style={[styles.ampmText, ampm === "PM" && styles.ampmTextActive]}>
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.grid}>
              {MINUTES.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={styles.cell}
                  onPress={() => selectMinute(m)}
                >
                  <Text style={styles.cellText}>
                    :{String(m).padStart(2, "0")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function parseTime(time: string) {
  const [hStr, mStr] = (time || "12:00").split(":");
  const h = parseInt(hStr, 10);
  const hour = Number.isNaN(h) ? 12 : h;
  const ampm: "AM" | "PM" = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return { hour12, ampm };
}

function to24(hour12: number, ampm: "AM" | "PM"): number {
  if (ampm === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
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
    padding: s(24),
    width: s(300),
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
    marginBottom: s(20),
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: s(8),
  },
  cell: {
    width: s(60),
    height: s(44),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: s(12),
    backgroundColor: EARTHY.sandLight,
  },
  cellActive: {
    backgroundColor: ACCENT,
  },
  cellText: {
    fontSize: fontSize(16),
    color: EARTHY.bark,
    fontFamily: FONTS.bodyMedium,
  },
  cellTextActive: {
    color: EARTHY.white,
    fontFamily: FONTS.bodyMedium,
  },
  ampmRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: s(12),
    marginTop: s(16),
  },
  ampmButton: {
    paddingVertical: s(10),
    paddingHorizontal: s(28),
    borderRadius: s(12),
    backgroundColor: EARTHY.sandLight,
  },
  ampmActive: {
    backgroundColor: ACCENT,
  },
  ampmText: {
    fontSize: fontSize(15),
    fontFamily: FONTS.bodyMedium,
    color: EARTHY.bark,
  },
  ampmTextActive: {
    color: EARTHY.white,
  },
});
