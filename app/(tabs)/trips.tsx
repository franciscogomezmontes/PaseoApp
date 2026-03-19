import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TabTooltip from "../../src/components/TabTooltip";
import { TOOLTIP_KEYS } from "../../src/constants";
import { useAuthStore } from "../../src/store/useAuthStore";
import { useTripStore } from "../../src/store/useTripStore";

export default function TripsScreen() {
  const router = useRouter();
  const { paseos, loading, fetchPaseos } = useTripStore();
  const { persona } = useAuthStore();

  const handleCompartir = async (p: any) => {
    try {
      await Share.share({
        message: `🏕️ Te invito al paseo *${p.nombre}* en PaseoApp!

📍 ${p.lugar}
📅 ${p.fecha_inicio} → ${p.fecha_fin}

🔑 Código de invitación: *${p.codigo_invitacion}*

Descarga PaseoApp, crea tu cuenta y úsalo para unirte.`,
        title: `Invitación — ${p.nombre}`,
      });
    } catch {
      /* user cancelled */
    }
  };

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

      <TabTooltip
        storageKey={TOOLTIP_KEYS.trips}
        emoji="🗺️"
        titulo="Mis Paseos"
        descripcion="Aquí están todos tus paseos. Crea uno nuevo con '+ Nuevo' o únete a uno existente con el código de invitación."
        color="#1B4F72"
        bgColor="#EFF6FF"
      />
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
            const esOrganizador = p.organizer_id === persona?.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={styles.card}
                onPress={() =>
                  router.push({ pathname: "/tripDetail", params: { id: p.id } })
                }
              >
                <View style={styles.cardTop}>
                  {/* Foto avatar */}
                  {p.foto_url ? (
                    <Image
                      source={{ uri: p.foto_url }}
                      style={styles.cardAvatar}
                    />
                  ) : (
                    <View style={styles.cardAvatarPlaceholder}>
                      <Text style={{ fontSize: 18 }}>🏕️</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardNombre}>{p.nombre}</Text>
                    <Text style={styles.cardLugar}>📍 {p.lugar}</Text>
                  </View>
                  <View
                    style={[styles.estadoBadge, { backgroundColor: estado.bg }]}
                  >
                    <Text style={[styles.estadoText, { color: estado.color }]}>
                      {estado.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardFechas}>
                  📅 {p.fecha_inicio} → {p.fecha_fin}
                </Text>
                <View style={styles.cardFooter}>
                  <View style={styles.codeChip}>
                    <Text style={styles.codeChipText}>
                      🔑 {p.codigo_invitacion}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.compartirBtn}
                    onPress={() => handleCompartir(p)}
                  >
                    <Text style={styles.compartirBtnText}>📤 Compartir</Text>
                  </TouchableOpacity>
                </View>
                {p.organizador_nombre ? (
                  <Text style={styles.organizadorText}>
                    {esOrganizador
                      ? "👑 Organizador: Tú"
                      : `👤 Organizador: ${p.organizador_nombre}`}
                  </Text>
                ) : null}
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
  headerButtons: { flexDirection: "row", gap: 8 },
  newButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  newButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  joinButton: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  joinButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  content: { padding: 16, paddingBottom: 40 },

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
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  cardAvatar: { width: 44, height: 44, borderRadius: 22, flexShrink: 0 },
  cardAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardNombre: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  estadoBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  estadoText: { fontSize: 11, fontWeight: "700" },
  cardLugar: { fontSize: 12, color: "#94a3b8", marginTop: 1 },
  cardFechas: { fontSize: 13, color: "#64748b", marginBottom: 10 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  codeChip: {
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  codeChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1B4F72",
    letterSpacing: 1,
  },
  organizadorText: { fontSize: 12, color: "#94a3b8", marginTop: 6 },
  compartirBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#1B4F72",
    alignSelf: "flex-start",
  },
  compartirBtnText: { fontSize: 12, fontWeight: "700", color: "#1B4F72" },

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
