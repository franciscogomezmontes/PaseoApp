import { View, Text, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

export function MapView({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.placeholder, style]}>
      <Text style={styles.text}>🗺️ Mapa no disponible en web</Text>
    </View>
  );
}

export function Marker(_props: object) {
  return null;
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  text: { color: "#64748b", fontSize: 14 },
});
