import { Keyboard, Platform } from "react-native";

let keyboardVisible = false;

if (Platform.OS !== "web") {
  Keyboard.addListener("keyboardDidShow", () => { keyboardVisible = true; });
  Keyboard.addListener("keyboardDidHide", () => { keyboardVisible = false; });
}

/**
 * Wraps a press handler so that if the keyboard is open,
 * the first tap dismisses it instead of firing the handler.
 */
export function dismissKeyboardOr<T extends (...args: any[]) => any>(handler: T): T {
  let lastFired = 0;
  return ((...args: any[]) => {
    // Debounce: ignore rapid duplicate taps (within 400ms)
    const now = Date.now();
    if (now - lastFired < 400) return;
    lastFired = now;

    if (Platform.OS === "web") {
      return handler(...args);
    }
    if (keyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    return handler(...args);
  }) as T;
}
