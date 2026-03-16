import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  storageKey: string;
  emoji: string;
  titulo: string;
  descripcion: string;
  color?: string;
  bgColor?: string;
}

export default function TabTooltip({
  storageKey,
  emoji,
  titulo,
  descripcion,
  color = "#1B4F72",
  bgColor = "#EFF6FF",
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    checkIfSeen();
  }, []);

  const checkIfSeen = async () => {
    const seen = await AsyncStorage.getItem(storageKey);
    if (seen !== "true") setVisible(true);
  };

  const handleDismiss = async () => {
    await AsyncStorage.setItem(storageKey, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bgColor, borderLeftColor: color },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.titulo, { color }]}>{titulo}</Text>
          <Text style={styles.descripcion}>{descripcion}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
        <Text style={[styles.dismissText, { color }]}>✕ Entendido</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    borderLeftWidth: 4,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  emoji: { fontSize: 24, flexShrink: 0, marginTop: 1 },
  titulo: { fontSize: 13, fontWeight: "700", marginBottom: 3 },
  descripcion: { fontSize: 12, color: "#475569", lineHeight: 18 },
  dismissBtn: { alignSelf: "flex-end" },
  dismissText: { fontSize: 12, fontWeight: "700" },
});
