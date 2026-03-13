import { View, KeyboardAvoidingView, Platform, Keyboard, StyleSheet, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EARTHY } from "../../lib/theme";

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function ScreenContainer({ children, style }: ScreenContainerProps) {
  const Wrapper = Platform.OS === "web" ? View : SafeAreaView;

  const content = (
    <View
      style={styles.flex}
      {...(Platform.OS !== "web" && {
        onStartShouldSetResponder: () => {
          Keyboard.dismiss();
          return false;
        },
      })}
    >
      {children}
    </View>
  );

  if (Platform.OS === "ios") {
    return (
      <Wrapper style={[styles.container, style]}>
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          {content}
        </KeyboardAvoidingView>
      </Wrapper>
    );
  }

  return (
    <Wrapper style={[styles.container, style]}>
      {content}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: EARTHY.cream,
  },
  flex: {
    flex: 1,
  },
});
