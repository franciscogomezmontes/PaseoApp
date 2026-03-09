import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTripStore } from "../../src/store/useTripStore";

export default function TripsScreen() {
  const router = useRouter();
  const { paseos, loading, fetchPaseos } = useTripStore();

  useFocusEffect(
    useCallback(() => {
      fetchPaseos();
    }, []),
  );

  const estadoConfig = {
    planificacion: { color: "#92400E", bg: "#FEF3C7", label: "Planificación" },
    activo: { color: "#065F46", bg: "#D1FAE5", label: "Activo" },
    liquidado: { color: "#1D4ED8", bg: "#DBEAFE", label: "Liquidado" },
  } as Record<string, { color: string; bg: string; label: string }>;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🗺️ Mis Paseos</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => router.push("/joinTrip")}
          >
            <Text style={styles.joinButtonText}>🔑 Unirse</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.newButton}
            onPress={() => router.push("/newTrip")}
          >
            <Text style={styles.newButtonText}>+ Nuevo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1B4F72" />
          <Text style={styles.loadingText}>Cargando paseos...</Text>
        </View>
      ) : paseos.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🏖️</Text>
          <Text style={styles.emptyTitle}>Aún no hay paseos</Text>
          <Text style={styles.emptySub}>Crea tu primer paseo para empezar</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push("/newTrip")}
          >
            <Text style={styles.createButtonText}>+ Crear primer paseo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {paseos.map((p) => {
            const estado =
              estadoConfig[p.estado] ?? estadoConfig["planificacion"];
            return (
              <TouchableOpacity
                key={p.id}
                style={styles.card}
                onPress={() =>
                  router.push({ pathname: "/tripDetail", params: { id: p.id } })
                }
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardNombre}>{p.nombre}</Text>
                  <View
                    style={[styles.estadoBadge, { backgroundColor: estado.bg }]}
                  >
                    <Text style={[styles.estadoText, { color: estado.color }]}>
                      {estado.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardLugar}>📍 {p.lugar}</Text>
                <Text style={styles.cardFechas}>
                  📅 {p.fecha_inicio} → {p.fecha_fin}
                </Text>
                <View style={styles.codeChip}>
                  <Text style={styles.codeChipText}>
                    🔑 {p.codigo_invitacion}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  newButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  newButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  content: { padding: 16, paddingBottom: 40 },

  codeChip: {
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  codeChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1B4F72",
    letterSpacing: 1,
  },

  headerButtons: { flexDirection: "row", gap: 8 },
  joinButton: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  joinButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardNombre: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
    marginRight: 8,
  },
  estadoBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  estadoText: { fontSize: 11, fontWeight: "700" },
  cardLugar: { fontSize: 13, color: "#64748b", marginBottom: 4 },
  cardFechas: { fontSize: 13, color: "#64748b" },

  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  emptySub: { fontSize: 14, color: "#94a3b8", marginBottom: 24 },
  createButton: {
    backgroundColor: "#1B4F72",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  createButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  loadingText: { color: "#64748b", marginTop: 12, fontSize: 14 },
});
