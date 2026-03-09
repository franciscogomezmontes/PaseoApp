import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../src/store/useAuthStore";
import { useTripStore } from "../src/store/useTripStore";

export default function NewTripScreen() {
  const router = useRouter();
  const { crearPaseo } = useTripStore();

  const [nombre, setNombre] = useState("");
  const [lugar, setLugar] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [saving, setSaving] = useState(false);

  const isValid = nombre.trim() && lugar.trim() && fechaInicio && fechaFin;

  const handleCreate = async () => {
    if (!isValid) return;
    setSaving(true);
    const { user } = useAuthStore.getState();
    const paseo = await crearPaseo({
      nombre: nombre.trim(),
      lugar: lugar.trim(),
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      estado: "planificacion",
      organizer_id: user?.id,
    });

    setSaving(false);

    if (!paseo) {
      Alert.alert("Error", "No se pudo crear el paseo. Revisa tu conexión.");
      return;
    }
    Alert.alert(
      "¡Paseo creado! 🎉",
      `${paseo.nombre} fue creado. Ahora puedes agregar participantes.`,
      [{ text: "Continuar", onPress: () => router.back() }],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Información básica</Text>

        {/* NAME */}
        <View style={styles.field}>
          <Text style={styles.label}>Nombre del paseo *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Anapoima Enero 2026"
            placeholderTextColor="#94a3b8"
            value={nombre}
            onChangeText={setNombre}
          />
        </View>

        {/* LOCATION */}
        <View style={styles.field}>
          <Text style={styles.label}>Lugar *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Anapoima, Cundinamarca"
            placeholderTextColor="#94a3b8"
            value={lugar}
            onChangeText={setLugar}
          />
        </View>

        {/* DATES */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Fecha inicio *</Text>
            <TextInput
              style={styles.input}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#94a3b8"
              value={fechaInicio}
              onChangeText={setFechaInicio}
              keyboardType="numeric"
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Fecha fin *</Text>
            <TextInput
              style={styles.input}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#94a3b8"
              value={fechaFin}
              onChangeText={setFechaFin}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* INFO BOX */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Después de crear el paseo podrás agregar familias, participantes
            y definir en qué comidas participa cada uno.
          </Text>
        </View>

        {/* CREATE BUTTON */}
        <TouchableOpacity
          style={[styles.createButton, !isValid && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={!isValid || saving}
        >
          <Text style={styles.createButtonText}>
            {saving ? "Creando..." : "✓ Crear paseo"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },

  content: { padding: 20, paddingBottom: 40 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 16,
  },

  field: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1e293b",
  },
  row: { flexDirection: "row" },

  infoBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },
  infoText: { fontSize: 13, color: "#1D4ED8", lineHeight: 20 },

  createButton: {
    backgroundColor: "#1B4F72",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  createButtonDisabled: { backgroundColor: "#94a3b8" },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});
