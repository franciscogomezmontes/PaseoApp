import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../src/lib/supabase";
import { useRecipeStore } from "../../src/store/useRecipeStore";
import { useTripStore } from "../../src/store/useTripStore";

const TIPO_CONFIG: Record<
  string,
  { icon: string; color: string; bgColor: string }
> = {
  desayuno: { icon: "☀️", color: "#B45309", bgColor: "#FEF3C7" },
  almuerzo: { icon: "🍽️", color: "#1D4ED8", bgColor: "#DBEAFE" },
  cena: { icon: "🌙", color: "#6D28D9", bgColor: "#EDE9FE" },
  snack: { icon: "🥐", color: "#065F46", bgColor: "#D1FAE5" },
};

const TIPOS = ["desayuno", "almuerzo", "cena", "snack"];

export default function MenuScreen() {
  const { paseos, fetchPaseos } = useTripStore();
  const { recetas, fetchRecetas } = useRecipeStore();

  const [selectedPaseoId, setSelectedPaseoId] = useState<string | null>(null);
  const [fechas, setFechas] = useState<string[]>([]);
  const [fechaActiva, setFechaActiva] = useState<string | null>(null);
  const [momentos, setMomentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState("almuerzo");
  const [selectedRecetaId, setSelectedRecetaId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPaseos();
    fetchRecetas();
  }, []);

  useEffect(() => {
    if (paseos.length > 0 && !selectedPaseoId) {
      selectPaseo(paseos[0].id!);
    }
  }, [paseos]);

  const selectPaseo = async (paseoId: string) => {
    setSelectedPaseoId(paseoId);
    setLoading(true);

    const paseo = paseos.find((p) => p.id === paseoId);
    if (!paseo) return;

    // Generate dates between start and end
    const dates: string[] = [];
    const start = new Date(paseo.fecha_inicio + "T12:00:00");
    const end = new Date(paseo.fecha_fin + "T12:00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split("T")[0]);
    }
    setFechas(dates);
    setFechaActiva(dates[0] ?? null);
    await loadMomentos(paseoId);
    setLoading(false);
  };

  const loadMomentos = async (paseoId: string) => {
    const { data } = await supabase
      .from("momentos_comida")
      .select("*, recetas(nombre)")
      .eq("paseo_id", paseoId)
      .order("fecha")
      .order("tipo_comida");
    setMomentos(data ?? []);
  };

  const handleAddMomento = async () => {
    if (!selectedPaseoId || !fechaActiva) return;
    setSaving(true);

    const { error } = await supabase.from("momentos_comida").insert({
      paseo_id: selectedPaseoId,
      fecha: fechaActiva,
      tipo_comida: selectedTipo,
      receta_id: selectedRecetaId,
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setShowAddModal(false);
      setSelectedRecetaId(null);
      await loadMomentos(selectedPaseoId);
    }
    setSaving(false);
  };

  const handleDeleteMomento = (id: string) => {
    Alert.alert("Eliminar comida", "¿Eliminar esta comida del menú?", [
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await supabase.from("momentos_comida").delete().eq("id", id);
          await loadMomentos(selectedPaseoId!);
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const momentosDelDia = momentos
    .filter((m) => m.fecha === fechaActiva)
    .sort(
      (a, b) => TIPOS.indexOf(a.tipo_comida) - TIPOS.indexOf(b.tipo_comida),
    );

  const selectedPaseo = paseos.find((p) => p.id === selectedPaseoId);

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🍽️ Menú</Text>
        {selectedPaseo && (
          <Text style={styles.headerSub}>{selectedPaseo.nombre}</Text>
        )}
      </View>

      {/* TRIP SELECTOR */}
      {paseos.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tripSelector}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        >
          {paseos.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.tripChip,
                selectedPaseoId === p.id && styles.tripChipActive,
              ]}
              onPress={() => selectPaseo(p.id!)}
            >
              <Text
                style={[
                  styles.tripChipText,
                  selectedPaseoId === p.id && styles.tripChipTextActive,
                ]}
              >
                {p.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* DATE SELECTOR */}
      {fechas.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateSelector}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        >
          {fechas.map((fecha) => {
            const d = new Date(fecha + "T12:00:00");
            const label = d.toLocaleDateString("es-CO", {
              weekday: "short",
              day: "numeric",
            });
            return (
              <TouchableOpacity
                key={fecha}
                style={[
                  styles.dateChip,
                  fechaActiva === fecha && styles.dateChipActive,
                ]}
                onPress={() => setFechaActiva(fecha)}
              >
                <Text
                  style={[
                    styles.dateChipText,
                    fechaActiva === fecha && styles.dateChipTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* MEALS */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1B4F72" />
        </View>
      ) : paseos.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyText}>No tienes paseos aún</Text>
          <Text style={styles.emptySub}>
            Crea un paseo en la pestaña Mis Paseos
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {momentosDelDia.length === 0 ? (
            <View style={styles.emptyMeals}>
              <Text style={styles.emptyIcon}>🍴</Text>
              <Text style={styles.emptyText}>Sin comidas para este día</Text>
            </View>
          ) : (
            momentosDelDia.map((m) => {
              const config = TIPO_CONFIG[m.tipo_comida] ?? TIPO_CONFIG["snack"];
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.card, { borderLeftColor: config.color }]}
                  onLongPress={() => handleDeleteMomento(m.id)}
                >
                  <View style={styles.cardTop}>
                    <View
                      style={[
                        styles.tipoBadge,
                        { backgroundColor: config.bgColor },
                      ]}
                    >
                      <Text style={styles.tipoBadgeIcon}>{config.icon}</Text>
                      <Text
                        style={[styles.tipoBadgeText, { color: config.color }]}
                      >
                        {m.tipo_comida.charAt(0).toUpperCase() +
                          m.tipo_comida.slice(1)}
                      </Text>
                    </View>
                    <Text style={styles.longPressHint}>
                      mantén para eliminar
                    </Text>
                  </View>
                  <Text style={styles.recetaNombre}>
                    {m.recetas?.nombre ?? "Sin receta asignada"}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addButtonText}>
              + Agregar comida para{" "}
              {fechaActiva
                ? new Date(fechaActiva + "T12:00:00").toLocaleDateString(
                    "es-CO",
                    { weekday: "long", day: "numeric" },
                  )
                : ""}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ADD MEAL MODAL */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Agregar comida</Text>
            <TouchableOpacity onPress={handleAddMomento} disabled={saving}>
              <Text style={styles.modalSave}>
                {saving ? "Guardando..." : "Agregar"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Tipo selector */}
            <Text style={styles.fieldLabel}>Tipo de comida</Text>
            <View style={styles.tipoRow}>
              {TIPOS.map((tipo) => {
                const config = TIPO_CONFIG[tipo];
                return (
                  <TouchableOpacity
                    key={tipo}
                    style={[
                      styles.tipoBtn,
                      selectedTipo === tipo && {
                        backgroundColor: config.bgColor,
                        borderColor: config.color,
                      },
                    ]}
                    onPress={() => setSelectedTipo(tipo)}
                  >
                    <Text style={{ fontSize: 20 }}>{config.icon}</Text>
                    <Text
                      style={[
                        styles.tipoBtnText,
                        selectedTipo === tipo && { color: config.color },
                      ]}
                    >
                      {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Recipe selector */}
            <Text style={styles.fieldLabel}>Receta (opcional)</Text>
            <TouchableOpacity
              style={[
                styles.recetaOption,
                !selectedRecetaId && styles.recetaOptionActive,
              ]}
              onPress={() => setSelectedRecetaId(null)}
            >
              <Text style={styles.recetaOptionText}>Sin receta específica</Text>
            </TouchableOpacity>
            {recetas.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.recetaOption,
                  selectedRecetaId === r.id && styles.recetaOptionActive,
                ]}
                onPress={() => setSelectedRecetaId(r.id)}
              >
                <Text
                  style={[
                    styles.recetaOptionText,
                    selectedRecetaId === r.id && styles.recetaOptionTextActive,
                  ]}
                >
                  {r.nombre}
                </Text>
                <Text style={styles.recetaTipo}>{r.tipo_comida}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    paddingBottom: 16,
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },

  tripSelector: { backgroundColor: "#fff", paddingVertical: 10, maxHeight: 52 },
  tripChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  tripChipActive: { borderColor: "#1B4F72", backgroundColor: "#EFF6FF" },
  tripChipText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  tripChipTextActive: { color: "#1B4F72" },

  dateSelector: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  dateChipActive: { borderColor: "#1B4F72", backgroundColor: "#1B4F72" },
  dateChipText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  dateChipTextActive: { color: "#fff" },

  content: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tipoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tipoBadgeIcon: { fontSize: 14 },
  tipoBadgeText: { fontSize: 12, fontWeight: "700" },
  recetaNombre: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  longPressHint: { fontSize: 10, color: "#cbd5e1" },

  emptyMeals: { alignItems: "center", paddingTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  emptySub: { fontSize: 13, color: "#94a3b8", textAlign: "center" },

  addButton: {
    borderWidth: 2,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  addButtonText: { color: "#64748b", fontSize: 14, fontWeight: "600" },

  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalCancel: { fontSize: 15, color: "#64748b" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  modalSave: { fontSize: 15, color: "#1B4F72", fontWeight: "700" },
  modalContent: { padding: 20 },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 10,
    marginTop: 8,
  },
  tipoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  tipoBtn: {
    flex: 1,
    minWidth: "45%",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f8fafc",
  },
  tipoBtnText: { fontSize: 12, fontWeight: "600", color: "#64748b" },

  recetaOption: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    marginBottom: 8,
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recetaOptionActive: { borderColor: "#1B4F72", backgroundColor: "#EFF6FF" },
  recetaOptionText: { fontSize: 14, color: "#64748b", fontWeight: "500" },
  recetaOptionTextActive: { color: "#1B4F72", fontWeight: "700" },
  recetaTipo: { fontSize: 11, color: "#94a3b8" },
});
