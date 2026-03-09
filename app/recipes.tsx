import { useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRecipeStore } from "../src/store/useRecipeStore";

const TIPO_CONFIG: Record<
  string,
  { icon: string; color: string; bgColor: string }
> = {
  desayuno: { icon: "☀️", color: "#B45309", bgColor: "#FEF3C7" },
  almuerzo: { icon: "🍽️", color: "#1D4ED8", bgColor: "#DBEAFE" },
  cena: { icon: "🌙", color: "#6D28D9", bgColor: "#EDE9FE" },
  snack: { icon: "🥐", color: "#065F46", bgColor: "#D1FAE5" },
};

const ORDEN_TIPOS = ["desayuno", "almuerzo", "cena", "snack"];

export default function RecipesScreen() {
  const { recetas, loading, error, fetchRecetas } = useRecipeStore();

  useEffect(() => {
    fetchRecetas();
  }, []);

  // Group recipes by meal type
  const grouped = ORDEN_TIPOS.reduce(
    (acc, tipo) => {
      const filtered = recetas.filter((r) => r.tipo_comida === tipo);
      if (filtered.length > 0) acc[tipo] = filtered;
      return acc;
    },
    {} as Record<string, typeof recetas>,
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#1B4F72" />
        <Text style={styles.loadingText}>Cargando recetas...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>Error conectando a Supabase</Text>
        <Text style={styles.errorSub}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchRecetas}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📖 Recetas</Text>
        <Text style={styles.headerSub}>
          {recetas.length} recetas disponibles
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {Object.entries(grouped).map(([tipo, lista]) => {
          const config = TIPO_CONFIG[tipo];
          return (
            <View key={tipo}>
              {/* Meal type header */}
              <View style={styles.tipoHeader}>
                <Text style={styles.tipoIcon}>{config.icon}</Text>
                <Text style={styles.tipoLabel}>
                  {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                </Text>
                <View style={styles.tipoDivider} />
              </View>

              {/* Recipe cards */}
              {lista.map((receta) => (
                <TouchableOpacity
                  key={receta.id}
                  style={[styles.card, { borderLeftColor: config.color }]}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.recetaNombre}>{receta.nombre}</Text>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: config.bgColor },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: config.color }]}>
                        {receta.porciones_base} por persona
                      </Text>
                    </View>
                  </View>
                  {receta.descripcion && (
                    <Text style={styles.descripcion} numberOfLines={2}>
                      {receta.descripcion}
                    </Text>
                  )}
                  <Text style={styles.verDetalle}>Ver ingredientes →</Text>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}

        {/* Add recipe button */}
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Agregar nueva receta</Text>
        </TouchableOpacity>
      </ScrollView>
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

  // Header
  header: {
    backgroundColor: "#1B4F72",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },

  // Content
  content: { padding: 16, paddingBottom: 40 },

  // Tipo section
  tipoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  tipoIcon: { fontSize: 18 },
  tipoLabel: { fontSize: 14, fontWeight: "700", color: "#475569" },
  tipoDivider: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },

  // Recipe card
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
    alignItems: "flex-start",
    marginBottom: 6,
  },
  recetaNombre: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
    marginRight: 8,
  },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  descripcion: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
    marginBottom: 8,
  },
  verDetalle: { fontSize: 12, color: "#3B82F6", fontWeight: "600" },

  // Add button
  addButton: {
    borderWidth: 2,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  addButtonText: { color: "#64748b", fontSize: 14, fontWeight: "600" },

  // Loading / error
  loadingText: { color: "#64748b", marginTop: 12, fontSize: 14 },
  errorIcon: { fontSize: 40, marginBottom: 12 },
  errorText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#dc2626",
    marginBottom: 4,
  },
  errorSub: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#1B4F72",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { color: "#fff", fontWeight: "700" },
});
