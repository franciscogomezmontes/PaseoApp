import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";

const TIPO_CONFIG: Record<
  string,
  { icon: string; color: string; bgColor: string }
> = {
  desayuno: { icon: "☀️", color: "#B45309", bgColor: "#FEF3C7" },
  almuerzo: { icon: "🍽️", color: "#1D4ED8", bgColor: "#DBEAFE" },
  cena: { icon: "🌙", color: "#6D28D9", bgColor: "#EDE9FE" },
  snack: { icon: "🥐", color: "#065F46", bgColor: "#D1FAE5" },
};

const ORDEN = ["desayuno", "almuerzo", "cena", "snack"];

export default function AttendanceScreen() {
  const router = useRouter();
  const { participacionId, nombre, paseoId } = useLocalSearchParams<{
    participacionId: string;
    nombre: string;
    paseoId: string;
  }>();

  const [momentos, setMomentos] = useState<any[]>([]);
  const [asistencia, setAsistencia] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [participacionId]);

  const loadData = async () => {
    setLoading(true);

    // Load meals for this trip
    const { data: momentosData } = await supabase
      .from("momentos_comida")
      .select("*, recetas(nombre)")
      .eq("paseo_id", paseoId)
      .order("fecha")
      .order("tipo_comida");

    setMomentos(momentosData ?? []);

    // Load existing attendance
    const { data: asistenciaData } = await supabase
      .from("asistencia_comidas")
      .select("*")
      .eq("participacion_id", participacionId);

    // Build attendance map
    const map: Record<string, boolean> = {};

    if (momentosData && momentosData.length > 0) {
      // Default all to true
      momentosData.forEach((m) => {
        map[m.id] = true;
      });

      // Override with saved values
      asistenciaData?.forEach((a) => {
        map[a.momento_comida_id] = a.asiste;
      });
    }

    setAsistencia(map);
    setLoading(false);
  };

  const handleToggle = (momentoId: string, value: boolean) => {
    setAsistencia((prev) => ({ ...prev, [momentoId]: value }));
  };

  const handleSave = async () => {
    setSaving(true);

    const rows = momentos.map((m) => ({
      participacion_id: participacionId,
      momento_comida_id: m.id,
      fecha: m.fecha,
      tipo_comida: m.tipo_comida,
      asiste: asistencia[m.id] ?? true,
    }));

    const { error } = await supabase
      .from("asistencia_comidas")
      .upsert(rows, { onConflict: "participacion_id,fecha,tipo_comida" });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("✓ Guardado", "Asistencia actualizada.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
    setSaving(false);
  };

  // Group by date
  const fechas = [...new Set(momentos.map((m) => m.fecha))];

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#1B4F72" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🍽️ Asistencia</Text>
        <Text style={styles.headerSub}>{nombre}</Text>
      </View>

      {momentos.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🍴</Text>
          <Text style={styles.emptyText}>No hay comidas en este paseo</Text>
          <Text style={styles.emptySub}>
            Agrega comidas desde la pestaña Menú
          </Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            {fechas.map((fecha) => {
              const comidas = momentos
                .filter((m) => m.fecha === fecha)
                .sort(
                  (a, b) =>
                    ORDEN.indexOf(a.tipo_comida) - ORDEN.indexOf(b.tipo_comida),
                );

              return (
                <View key={fecha} style={styles.dateSection}>
                  <Text style={styles.dateTitle}>
                    📅{" "}
                    {new Date(fecha + "T12:00:00").toLocaleDateString("es-CO", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </Text>

                  {comidas.map((m) => {
                    const config =
                      TIPO_CONFIG[m.tipo_comida] ?? TIPO_CONFIG["snack"];
                    const attending = asistencia[m.id] ?? true;

                    return (
                      <View
                        key={m.id}
                        style={[
                          styles.mealRow,
                          !attending && styles.mealRowInactive,
                        ]}
                      >
                        <View
                          style={[
                            styles.tipoBadge,
                            { backgroundColor: config.bgColor },
                          ]}
                        >
                          <Text style={styles.tipoIcon}>{config.icon}</Text>
                          <Text
                            style={[styles.tipoText, { color: config.color }]}
                          >
                            {m.tipo_comida.charAt(0).toUpperCase() +
                              m.tipo_comida.slice(1)}
                          </Text>
                        </View>
                        <View style={styles.mealInfo}>
                          <Text
                            style={[
                              styles.mealNombre,
                              !attending && styles.mealNombreInactive,
                            ]}
                          >
                            {m.recetas?.nombre ?? "Sin receta"}
                          </Text>
                        </View>
                        <Switch
                          value={attending}
                          onValueChange={(v) => handleToggle(m.id, v)}
                          trackColor={{ false: "#e2e8f0", true: "#1B4F72" }}
                          thumbColor="#fff"
                        />
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>

          {/* SAVE BUTTON */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? "Guardando..." : "✓ Guardar asistencia"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  header: {
    backgroundColor: "#1B4F72",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  backText: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginBottom: 8 },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 2,
  },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 14 },

  content: { padding: 16, paddingBottom: 100 },

  dateSection: { marginBottom: 20 },
  dateTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 10,
    textTransform: "capitalize",
  },

  mealRow: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mealRowInactive: { opacity: 0.5 },
  tipoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tipoIcon: { fontSize: 12 },
  tipoText: { fontSize: 11, fontWeight: "700" },
  mealInfo: { flex: 1 },
  mealNombre: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  mealNombreInactive: { color: "#94a3b8" },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  saveButton: {
    backgroundColor: "#1B4F72",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  saveButtonDisabled: { backgroundColor: "#94a3b8" },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  emptySub: { fontSize: 13, color: "#94a3b8", textAlign: "center" },
});
