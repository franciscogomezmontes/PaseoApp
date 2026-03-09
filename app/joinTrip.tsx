import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import { useAuthStore } from "../src/store/useAuthStore";

export default function JoinTripScreen() {
  const router = useRouter();
  const { persona } = useAuthStore();
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (codigo.trim().length < 6) {
      Alert.alert("Error", "Por favor ingresa un código válido.");
      return;
    }

    setLoading(true);

    // Find trip by invite code
    const { data: paseo, error: paseoError } = await supabase
      .from("paseos")
      .select("id, nombre, lugar, fecha_inicio, fecha_fin")
      .eq("codigo_invitacion", codigo.trim().toLowerCase())
      .single();

    if (paseoError || !paseo) {
      Alert.alert(
        "Error",
        "Código no encontrado. Verifica e intenta de nuevo.",
      );
      setLoading(false);
      return;
    }

    // Check if already a participant
    const { data: existing } = await supabase
      .from("participaciones")
      .select("id")
      .eq("paseo_id", paseo.id)
      .eq("persona_id", persona!.id)
      .single();

    if (existing) {
      Alert.alert("Ya eres participante", `Ya estás unido a ${paseo.nombre}.`, [
        {
          text: "Ver paseo",
          onPress: () => {
            router.replace("/(tabs)");
            router.push({ pathname: "/tripDetail", params: { id: paseo.id } });
          },
        },
      ]);
      setLoading(false);
      return;
    }

    // Add as participant (family 0 = unassigned, organizer can move them)
    const { error: joinError } = await supabase.from("participaciones").insert({
      paseo_id: paseo.id,
      persona_id: persona!.id,
      unidad_familiar: 99,
      factor: 1.0,
      puso: 0,
    });

    if (joinError) {
      Alert.alert("Error", "No se pudo unir al paseo. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    setLoading(false);
    Alert.alert(
      "¡Te uniste! 🎉",
      `Ahora eres participante de ${paseo.nombre}.`,
      [
        {
          text: "Ver paseo",
          onPress: () => {
            router.replace("/(tabs)");
            router.push({ pathname: "/tripDetail", params: { id: paseo.id } });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          {/* ICON */}
          <View style={styles.iconArea}>
            <Text style={styles.icon}>🗺️</Text>
            <Text style={styles.title}>Unirse a un paseo</Text>
            <Text style={styles.sub}>
              Pídele el código de invitación al organizador del paseo
            </Text>
          </View>

          {/* CODE INPUT */}
          <View style={styles.inputArea}>
            <Text style={styles.label}>Código de invitación</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="ej: a1b2c3d4"
              placeholderTextColor="#94a3b8"
              value={codigo}
              onChangeText={(t) => setCodigo(t.toLowerCase())}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={8}
            />
            <Text style={styles.hint}>El código tiene 8 caracteres</Text>
          </View>

          {/* JOIN BUTTON */}
          <TouchableOpacity
            style={[
              styles.joinButton,
              (!codigo || loading) && styles.joinButtonDisabled,
            ]}
            onPress={handleJoin}
            disabled={!codigo || loading}
          >
            <Text style={styles.joinButtonText}>
              {loading ? "Buscando..." : "Unirse al paseo"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  content: { flex: 1, padding: 24, justifyContent: "center" },

  iconArea: { alignItems: "center", marginBottom: 40 },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "800", color: "#1e293b", marginBottom: 8 },
  sub: { fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 20 },

  inputArea: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 8 },
  codeInput: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#1B4F72",
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: "800",
    color: "#1e293b",
    textAlign: "center",
    letterSpacing: 4,
  },
  hint: { fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 8 },

  joinButton: {
    backgroundColor: "#1B4F72",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  joinButtonDisabled: { backgroundColor: "#94a3b8" },
  joinButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
