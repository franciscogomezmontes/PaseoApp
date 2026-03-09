import { StyleSheet, Text, View } from "react-native";

export default function GroceryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🛒 Mercado</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#1B4F72" },
});
