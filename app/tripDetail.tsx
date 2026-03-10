import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import { useAuthStore } from "../src/store/useAuthStore";
import { useRecipeStore } from "../src/store/useRecipeStore";
import { Participacion, useTripStore } from "../src/store/useTripStore";

const UF_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
const TIPOS_COMIDA = ["desayuno", "almuerzo", "cena", "snack"];
const TIPO_CONFIG: Record<
  string,
  { icon: string; color: string; bgColor: string }
> = {
  desayuno: { icon: "☀️", color: "#B45309", bgColor: "#FEF3C7" },
  almuerzo: { icon: "🍽️", color: "#1D4ED8", bgColor: "#DBEAFE" },
  cena: { icon: "🌙", color: "#6D28D9", bgColor: "#EDE9FE" },
  snack: { icon: "🥐", color: "#065F46", bgColor: "#D1FAE5" },
};

const ESTADOS = ["planificacion", "activo", "liquidado"];
const ESTADO_CONFIG: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  planificacion: { color: "#92400E", bg: "#FEF3C7", label: "📋 Planificación" },
  activo: { color: "#065F46", bg: "#D1FAE5", label: "✅ Activo" },
  liquidado: { color: "#1D4ED8", bg: "#DBEAFE", label: "💸 Liquidado" },
};

const initials = (name: string) =>
  name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "??";

interface ParticipacionConPersona extends Participacion {
  personas: { nombre: string; auth_user_id?: string; foto_url?: string };
}

const extractCoordsFromLink = (
  link: string,
): { lat: number; lng: number } | null => {
  if (!link) return null;
  // Match patterns like @4.1234,-74.1234 or ll=4.1234,-74.1234 or ?q=4.1234,-74.1234
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /\?q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /place\/(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const pattern of patterns) {
    const match = link.match(pattern);
    if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  return null;
};

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { personas, fetchPersonas, crearPersona, agregarParticipacion } =
    useTripStore();
  const { persona: authPersona } = useAuthStore();
  const { recetas, fetchRecetas } = useRecipeStore();

  const [activeTab, setActiveTab] = useState<
    "info" | "participantes" | "menu" | "gastos"
  >("info");
  const [paseo, setPaseo] = useState<any>(null);
  const [participaciones, setParticipaciones] = useState<
    ParticipacionConPersona[]
  >([]);
  const [momentos, setMomentos] = useState<any[]>([]);
  const [fechas, setFechas] = useState<string[]>([]);
  const [fechaActiva, setFechaActiva] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editNombre, setEditNombre] = useState("");
  const [editLugar, setEditLugar] = useState("");
  const [editFechaInicio, setEditFechaInicio] = useState("");
  const [editFechaFin, setEditFechaFin] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editRecomendaciones, setEditRecomendaciones] = useState("");
  const [editLinkMapa, setEditLinkMapa] = useState("");
  const [editFotoUrl, setEditFotoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Add participant state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(
    null,
  );
  const [newPersonaNombre, setNewPersonaNombre] = useState("");
  const [unidadFamiliar, setUnidadFamiliar] = useState("1");
  const [factor, setFactor] = useState("1");
  const [addingNew, setAddingNew] = useState(false);
  const [savingParticipant, setSavingParticipant] = useState(false);

  // Edit familia state
  const [showFamiliaModal, setShowFamiliaModal] = useState(false);
  const [editingParticipante, setEditingParticipante] =
    useState<ParticipacionConPersona | null>(null);
  const [nuevaFamilia, setNuevaFamilia] = useState("");

  // Add meal state
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState("almuerzo");
  const [selectedRecetaId, setSelectedRecetaId] = useState<string | null>(null);
  const [savingMeal, setSavingMeal] = useState(false);

  // Estado modal
  const [showEstadoModal, setShowEstadoModal] = useState(false);

  useEffect(() => {
    fetchPersonas();
    fetchRecetas();
    loadTripData();
  }, [id]);

  const loadTripData = async () => {
    setLoading(true);

    const { data: paseoData } = await supabase
      .from("paseos")
      .select("*")
      .eq("id", id)
      .single();

    if (paseoData) {
      setPaseo(paseoData);
      setEditNombre(paseoData.nombre ?? "");
      setEditLugar(paseoData.lugar ?? "");
      setEditFechaInicio(paseoData.fecha_inicio ?? "");
      setEditFechaFin(paseoData.fecha_fin ?? "");
      setEditLink(paseoData.link_alojamiento ?? "");
      setEditRecomendaciones(paseoData.recomendaciones ?? "");
      setEditLinkMapa(paseoData.link_mapa ?? "");
      setEditFotoUrl(paseoData.foto_url ?? "");

      // Check if current user is organizer
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsOrganizer(paseoData.organizer_id === user?.id);

      // Generate dates
      const dates: string[] = [];
      const start = new Date(paseoData.fecha_inicio + "T12:00:00");
      const end = new Date(paseoData.fecha_fin + "T12:00:00");
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split("T")[0]);
      }
      setFechas(dates);
      setFechaActiva(dates[0] ?? null);
    }

    const { data: partData } = await supabase
      .from("participaciones")
      .select("*, personas(nombre, auth_user_id, foto_url)")
      .eq("paseo_id", id)
      .order("unidad_familiar");
    setParticipaciones(partData ?? []);

    const { data: momentosData } = await supabase
      .from("momentos_comida")
      .select("*, recetas(nombre)")
      .eq("paseo_id", id)
      .order("fecha")
      .order("tipo_comida");
    setMomentos(momentosData ?? []);

    setLoading(false);
  };

  const handleSaveInfo = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("paseos")
      .update({
        nombre: editNombre,
        lugar: editLugar,
        fecha_inicio: editFechaInicio,
        fecha_fin: editFechaFin,
        link_alojamiento: editLink,
        recomendaciones: editRecomendaciones,
        link_mapa: editLinkMapa,
        foto_url: editFotoUrl,
      })
      .eq("id", id);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setEditing(false);
      loadTripData();
    }
    setSaving(false);
  };

  const handleChangeEstado = async (estado: string) => {
    const { error } = await supabase
      .from("paseos")
      .update({ estado })
      .eq("id", id);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setShowEstadoModal(false);
      setPaseo((prev: any) => ({ ...prev, estado }));
      loadTripData();
    }
  };

  const handleDeleteTrip = () => {
    Alert.alert(
      "Eliminar paseo",
      `¿Eliminar "${paseo?.nombre}"? Esta acción no se puede deshacer.`,
      [
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await supabase.from("paseos").delete().eq("id", id);
            router.replace("/(tabs)/trips");
          },
        },
        { text: "Cancelar", style: "cancel" },
      ],
    );
  };

  const handlePickTripPhoto = async () => {
    Alert.alert("Foto del paseo", "¿Cómo quieres agregar la foto?", [
      { text: "📷 Tomar foto", onPress: () => pickTripPhoto("camera") },
      { text: "🖼️ Elegir de galería", onPress: () => pickTripPhoto("gallery") },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const pickTripPhoto = async (source: "camera" | "gallery") => {
    let result;
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") return;
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });
    } else {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return;
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });
    }
    if (result.canceled) return;
    setUploadingPhoto(true);
    try {
      const uri = result.assets[0].uri;
      const fileName = `trip_${id}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, arrayBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });
      if (uploadError) {
        Alert.alert("Error", uploadError.message);
        setUploadingPhoto(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl + "?t=" + Date.now();
      setEditFotoUrl(publicUrl);
      await supabase
        .from("paseos")
        .update({ foto_url: publicUrl })
        .eq("id", id);
      loadTripData();
    } catch (e) {
      Alert.alert("Error", "No se pudo procesar la imagen.");
    }
    setUploadingPhoto(false);
  };

  const handleAddParticipant = async () => {
    setSavingParticipant(true);
    let personaId = selectedPersonaId;
    if (addingNew && newPersonaNombre.trim()) {
      const nueva = await crearPersona(newPersonaNombre.trim());
      if (!nueva) {
        Alert.alert("Error", "No se pudo crear la persona.");
        setSavingParticipant(false);
        return;
      }
      personaId = nueva.id;
    }
    if (!personaId) {
      Alert.alert("Error", "Selecciona o crea una persona.");
      setSavingParticipant(false);
      return;
    }
    await agregarParticipacion({
      paseo_id: id,
      persona_id: personaId,
      unidad_familiar: parseInt(unidadFamiliar) || 1,
      factor: parseFloat(factor) || 1.0,
      puso: 0,
    });
    setSelectedPersonaId(null);
    setNewPersonaNombre("");
    setUnidadFamiliar("1");
    setFactor("1");
    setAddingNew(false);
    setShowAddModal(false);
    setSavingParticipant(false);
    loadTripData();
  };

  const handleParticipanteOptions = (m: ParticipacionConPersona) => {
    Alert.alert(m.personas.nombre, "¿Qué quieres hacer?", [
      {
        text: "Ver asistencia",
        onPress: () =>
          router.push({
            pathname: "/attendance",
            params: {
              participacionId: m.id,
              nombre: m.personas.nombre,
              paseoId: id,
            },
          }),
      },
      {
        text: "Ver perfil",
        onPress: () =>
          router.push({
            pathname: "/participantDetail",
            params: { personaId: m.persona_id },
          }),
      },
      {
        text: "Cambiar familia",
        onPress: () => {
          setEditingParticipante(m);
          setNuevaFamilia(String(m.unidad_familiar));
          setShowFamiliaModal(true);
        },
      },
      { text: "Cambiar factor", onPress: () => handleChangeFactor(m) },
      {
        text: "Eliminar del paseo",
        style: "destructive",
        onPress: () => handleDeleteParticipante(m),
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const saveFamilia = async () => {
    if (!editingParticipante) return;
    const newUF = parseInt(nuevaFamilia);
    if (isNaN(newUF) || newUF < 1) {
      Alert.alert("Error", "Ingresa un número válido.");
      return;
    }
    await supabase
      .from("participaciones")
      .update({ unidad_familiar: newUF })
      .eq("id", editingParticipante.id);
    setShowFamiliaModal(false);
    loadTripData();
  };

  const handleChangeFactor = (m: ParticipacionConPersona) => {
    Alert.alert("Cambiar factor", `Factor actual: ${m.factor}`, [
      {
        text: "1.0 — Adulto",
        onPress: async () => {
          await supabase
            .from("participaciones")
            .update({ factor: 1.0 })
            .eq("id", m.id);
          loadTripData();
        },
      },
      {
        text: "0.5 — Menor",
        onPress: async () => {
          await supabase
            .from("participaciones")
            .update({ factor: 0.5 })
            .eq("id", m.id);
          loadTripData();
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const handleDeleteParticipante = (m: ParticipacionConPersona) => {
    Alert.alert("Eliminar", `¿Eliminar a ${m.personas.nombre} del paseo?`, [
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await supabase.from("participaciones").delete().eq("id", m.id);
          loadTripData();
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const handleAddMeal = async () => {
    if (!fechaActiva) return;
    setSavingMeal(true);

    const numParticipantes = participaciones.length;
    console.log("Participantes en el paseo:", numParticipantes);

    const { error } = await supabase.from("momentos_comida").insert({
      paseo_id: id,
      fecha: fechaActiva,
      tipo_comida: selectedTipo,
      receta_id: selectedRecetaId,
      porciones: numParticipantes > 0 ? numParticipantes : 1,
    });
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setShowAddMealModal(false);
      setSelectedRecetaId(null);
      loadTripData();
    }
    setSavingMeal(false);
  };

  const handleDeleteMeal = (mealId: string) => {
    Alert.alert("Eliminar comida", "¿Eliminar esta comida del menú?", [
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await supabase.from("momentos_comida").delete().eq("id", mealId);
          loadTripData();
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const familias = [...new Set(participaciones.map((p) => p.unidad_familiar))];
  const momentosDelDia = momentos
    .filter((m) => m.fecha === fechaActiva)
    .sort(
      (a, b) =>
        TIPOS_COMIDA.indexOf(a.tipo_comida) -
        TIPOS_COMIDA.indexOf(b.tipo_comida),
    );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#1B4F72" />
      </SafeAreaView>
    );
  }

  const estadoConfig =
    ESTADO_CONFIG[paseo?.estado] ?? ESTADO_CONFIG["planificacion"];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {paseo?.nombre}
            </Text>
            <TouchableOpacity
              style={[styles.estadoBadge, { backgroundColor: estadoConfig.bg }]}
              onPress={() => isOrganizer && setShowEstadoModal(true)}
            >
              <Text style={[styles.estadoText, { color: estadoConfig.color }]}>
                {estadoConfig.label}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* TABS */}
        <View style={styles.tabs}>
          {(["info", "participantes", "menu", "gastos"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab === "info"
                  ? "📋 Info"
                  : tab === "participantes"
                    ? "👥 Asistentes"
                    : tab === "menu"
                      ? "🍽️ Menú"
                      : "💸 Gastos"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── INFO TAB ── */}
        {activeTab === "info" && (
          <ScrollView contentContainerStyle={styles.content}>
            {/* Trip photo */}
            <TouchableOpacity
              style={styles.tripPhotoContainer}
              onPress={handlePickTripPhoto}
            >
              {uploadingPhoto ? (
                <View style={styles.tripPhotoPlaceholder}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : editFotoUrl ? (
                <Image source={{ uri: editFotoUrl }} style={styles.tripPhoto} />
              ) : (
                <View style={styles.tripPhotoPlaceholder}>
                  <Text style={styles.tripPhotoIcon}>📸</Text>
                  <Text style={styles.tripPhotoText}>
                    Toca para agregar foto del paseo
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Basic info */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>📋 Información</Text>
                {editing ? (
                  <View style={styles.editActions}>
                    <TouchableOpacity onPress={() => setEditing(false)}>
                      <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={handleSaveInfo}
                      disabled={saving}
                    >
                      <Text style={styles.saveBtnText}>
                        {saving ? "..." : "Guardar"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => setEditing(true)}>
                    <Text style={styles.editText}>✏️ Editar</Text>
                  </TouchableOpacity>
                )}
              </View>

              {editing ? (
                <>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Nombre</Text>
                    <TextInput
                      style={styles.input}
                      value={editNombre}
                      onChangeText={setEditNombre}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Lugar</Text>
                    <TextInput
                      style={styles.input}
                      value={editLugar}
                      onChangeText={setEditLugar}
                    />
                  </View>
                  <View style={styles.row}>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Fecha inicio</Text>
                      <TextInput
                        style={styles.input}
                        value={editFechaInicio}
                        onChangeText={setEditFechaInicio}
                        placeholder="AAAA-MM-DD"
                      />
                    </View>
                    <View style={{ width: 8 }} />
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Fecha fin</Text>
                      <TextInput
                        style={styles.input}
                        value={editFechaFin}
                        onChangeText={setEditFechaFin}
                        placeholder="AAAA-MM-DD"
                      />
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Link de alojamiento</Text>
                    <TextInput
                      style={styles.input}
                      value={editLink}
                      onChangeText={setEditLink}
                      placeholder="https://airbnb.com/..."
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>
                      Recomendaciones de llegada
                    </Text>
                    <TextInput
                      style={[styles.input, { height: 80 }]}
                      value={editRecomendaciones}
                      onChangeText={setEditRecomendaciones}
                      multiline
                      placeholder="Ej: Llegar antes de las 3pm..."
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>
                      Link de ubicación (Google Maps, Waze, etc.)
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={editLinkMapa}
                      onChangeText={setEditLinkMapa}
                      placeholder="https://maps.google.com/..."
                      autoCapitalize="none"
                    />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>📍 Lugar</Text>
                    <Text style={styles.infoValue}>{paseo?.lugar}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>📅 Fechas</Text>
                    <Text style={styles.infoValue}>
                      {paseo?.fecha_inicio} → {paseo?.fecha_fin}
                    </Text>
                  </View>
                  {paseo?.link_alojamiento && (
                    <TouchableOpacity
                      style={styles.infoRow}
                      onPress={() => Linking.openURL(paseo.link_alojamiento)}
                    >
                      <Text style={styles.infoLabel}>🏠 Alojamiento</Text>
                      <Text style={[styles.infoValue, styles.link]}>
                        Ver enlace →
                      </Text>
                    </TouchableOpacity>
                  )}
                  {paseo?.recomendaciones && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>💡 Llegada</Text>
                      <Text style={styles.infoValue}>
                        {paseo.recomendaciones}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Invite code */}
            <View style={styles.inviteCard}>
              <Text style={styles.inviteLabel}>🔑 Código de invitación</Text>
              <Text style={styles.inviteCode}>{paseo?.codigo_invitacion}</Text>
              <Text style={styles.inviteHint}>
                Comparte este código para que otros se unan
              </Text>
            </View>

            {/* Map */}
            {paseo?.link_mapa &&
              (() => {
                const coords = extractCoordsFromLink(paseo.link_mapa);
                return (
                  <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>🗺️ Ubicación</Text>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(paseo.link_mapa)}
                      >
                        <Text style={styles.editText}>Abrir en Maps →</Text>
                      </TouchableOpacity>
                    </View>
                    {coords ? (
                      <MapView
                        style={styles.map}
                        initialRegion={{
                          latitude: coords.lat,
                          longitude: coords.lng,
                          latitudeDelta: 0.005,
                          longitudeDelta: 0.005,
                        }}
                      >
                        <Marker
                          coordinate={{
                            latitude: coords.lat,
                            longitude: coords.lng,
                          }}
                          title={paseo.nombre}
                          description={paseo.lugar}
                        />
                      </MapView>
                    ) : (
                      <TouchableOpacity
                        style={styles.mapLinkCard}
                        onPress={() => Linking.openURL(paseo.link_mapa)}
                      >
                        <Text style={styles.mapLinkIcon}>🗺️</Text>
                        <View style={styles.mapLinkInfo}>
                          <Text style={styles.mapLinkTitle}>Ver ubicación</Text>
                          <Text style={styles.mapLinkSub}>
                            Toca para abrir en Maps
                          </Text>
                        </View>
                        <Text style={styles.mapLinkArrow}>→</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}

            {/* Delete button (organizer only) */}
            {isOrganizer && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteTrip}
              >
                <Text style={styles.deleteButtonText}>🗑️ Eliminar paseo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {/* ── PARTICIPANTES TAB ── */}
        {activeTab === "participantes" && (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                👥 {participaciones.length} participante
                {participaciones.length !== 1 ? "s" : ""}
              </Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.addBtnText}>+ Agregar</Text>
              </TouchableOpacity>
            </View>

            {participaciones.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyText}>Aún no hay participantes</Text>
              </View>
            ) : (
              familias.map((uf) => {
                const miembros = participaciones.filter(
                  (p) => p.unidad_familiar === uf,
                );
                const color = UF_COLORS[(uf - 1) % UF_COLORS.length];
                return (
                  <View key={uf} style={styles.familiaCard}>
                    <View style={styles.familiaHeader}>
                      <View style={[styles.dot, { backgroundColor: color }]} />
                      <Text style={styles.familiaTitulo}>Familia {uf}</Text>
                      <Text style={styles.familiaCount}>
                        {miembros.length} persona
                        {miembros.length !== 1 ? "s" : ""}
                      </Text>
                    </View>
                    {miembros.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={styles.participanteRow}
                        onPress={() => handleParticipanteOptions(m)}
                      >
                        <View>
                          {m.personas.foto_url ? (
                            <Image
                              source={{ uri: m.personas.foto_url }}
                              style={[
                                styles.avatarImage,
                                { borderColor: color },
                              ]}
                            />
                          ) : (
                            <View
                              style={[
                                styles.avatar,
                                { backgroundColor: color },
                              ]}
                            >
                              <Text style={styles.avatarText}>
                                {initials(m.personas.nombre)}
                              </Text>
                            </View>
                          )}
                          {m.personas.auth_user_id && (
                            <View style={styles.accountBadge}>
                              <Text style={{ fontSize: 8, color: "#fff" }}>
                                ✓
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.participanteInfo}>
                          <Text style={styles.participanteNombre}>
                            {m.personas.nombre}
                          </Text>
                          <Text style={styles.participanteSub}>
                            {m.factor === 1 ? "Adulto" : "Menor"} · Factor{" "}
                            {m.factor}
                          </Text>
                        </View>
                        <Text style={styles.chevron}>›</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* ── MENU TAB ── */}
        {activeTab === "menu" && (
          <>
            {/* Date selector */}
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

            <ScrollView contentContainerStyle={styles.content}>
              {momentosDelDia.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🍴</Text>
                  <Text style={styles.emptyText}>
                    Sin comidas para este día
                  </Text>
                </View>
              ) : (
                momentosDelDia.map((m) => {
                  const config =
                    TIPO_CONFIG[m.tipo_comida] ?? TIPO_CONFIG["snack"];
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.mealCard,
                        { borderLeftColor: config.color },
                      ]}
                      onLongPress={() => handleDeleteMeal(m.id)}
                    >
                      <View style={styles.mealCardTop}>
                        <View
                          style={[
                            styles.tipoBadge,
                            { backgroundColor: config.bgColor },
                          ]}
                        >
                          <Text>{config.icon}</Text>
                          <Text
                            style={[
                              styles.tipoBadgeText,
                              { color: config.color },
                            ]}
                          >
                            {m.tipo_comida.charAt(0).toUpperCase() +
                              m.tipo_comida.slice(1)}
                          </Text>
                        </View>
                        <Text style={styles.longPressHint}>
                          mantén para eliminar
                        </Text>
                      </View>
                      <Text style={styles.mealNombre}>
                        {m.recetas?.nombre ?? "Sin receta"}
                      </Text>
                      {m.porciones && (
                        <Text style={styles.mealPorciones}>
                          👥 {m.porciones} porciones
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
              <TouchableOpacity
                style={styles.addMealButton}
                onPress={() => setShowAddMealModal(true)}
              >
                <Text style={styles.addMealButtonText}>+ Agregar comida</Text>
              </TouchableOpacity>
            </ScrollView>
          </>
        )}

        {/* ── GASTOS TAB ── */}
        {activeTab === "gastos" && (
          <View style={styles.centered}>
            <Text style={styles.emptyIcon}>💸</Text>
            <Text style={styles.emptyText}>Gastos próximamente</Text>
            <Text style={styles.emptySub}>
              Aquí podrás registrar y liquidar gastos del paseo
            </Text>
          </View>
        )}

        {/* ── MODALS ── */}

        {/* Estado modal */}
        <Modal
          visible={showEstadoModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowEstadoModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.estadoModalBox}>
              <Text style={styles.estadoModalTitle}>
                Cambiar estado del paseo
              </Text>
              {ESTADOS.map((estado) => {
                const config = ESTADO_CONFIG[estado];
                return (
                  <TouchableOpacity
                    key={estado}
                    style={[
                      styles.estadoOption,
                      { backgroundColor: config.bg },
                    ]}
                    onPress={() => handleChangeEstado(estado)}
                  >
                    <Text
                      style={[styles.estadoOptionText, { color: config.color }]}
                    >
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => setShowEstadoModal(false)}
                style={styles.estadoCancel}
              >
                <Text style={styles.estadoCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Familia modal */}
        <Modal
          visible={showFamiliaModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowFamiliaModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.familiaModalBox}>
              <Text style={styles.familiaModalTitle}>Cambiar familia</Text>
              <Text style={styles.familiaModalSub}>
                {editingParticipante?.personas.nombre}
              </Text>
              <TextInput
                style={styles.familiaInput}
                value={nuevaFamilia}
                onChangeText={setNuevaFamilia}
                keyboardType="numeric"
                autoFocus
              />
              <View style={styles.familiaModalButtons}>
                <TouchableOpacity
                  style={styles.familiaModalCancel}
                  onPress={() => setShowFamiliaModal(false)}
                >
                  <Text style={styles.familiaModalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.familiaModalSave}
                  onPress={saveFamilia}
                >
                  <Text style={styles.familiaModalSaveText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add participant modal */}
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
              <Text style={styles.modalTitle}>Agregar participante</Text>
              <TouchableOpacity
                onPress={handleAddParticipant}
                disabled={savingParticipant}
              >
                <Text style={styles.modalSave}>
                  {savingParticipant ? "..." : "Guardar"}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    !addingNew && styles.toggleBtnActive,
                  ]}
                  onPress={() => setAddingNew(false)}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      !addingNew && styles.toggleTextActive,
                    ]}
                  >
                    Existente
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    addingNew && styles.toggleBtnActive,
                  ]}
                  onPress={() => setAddingNew(true)}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      addingNew && styles.toggleTextActive,
                    ]}
                  >
                    Nueva persona
                  </Text>
                </TouchableOpacity>
              </View>
              {addingNew ? (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Nombre *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Francisco"
                    placeholderTextColor="#94a3b8"
                    value={newPersonaNombre}
                    onChangeText={setNewPersonaNombre}
                  />
                </View>
              ) : (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Seleccionar persona</Text>
                  {personas.length === 0 ? (
                    <Text style={styles.noPersonas}>
                      No hay personas. Usa "Nueva persona".
                    </Text>
                  ) : (
                    personas.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.personaOption,
                          selectedPersonaId === p.id &&
                            styles.personaOptionActive,
                        ]}
                        onPress={() => setSelectedPersonaId(p.id)}
                      >
                        <Text
                          style={[
                            styles.personaOptionText,
                            selectedPersonaId === p.id &&
                              styles.personaOptionTextActive,
                          ]}
                        >
                          {p.nombre}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Unidad familiar</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor="#94a3b8"
                  value={unidadFamiliar}
                  onChangeText={setUnidadFamiliar}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Factor</Text>
                <View style={styles.factorRow}>
                  {["0.5", "1"].map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[
                        styles.factorBtn,
                        factor === f && styles.factorBtnActive,
                      ]}
                      onPress={() => setFactor(f)}
                    >
                      <Text
                        style={[
                          styles.factorBtnText,
                          factor === f && styles.factorBtnTextActive,
                        ]}
                      >
                        {f === "1" ? "1.0 — Adulto" : "0.5 — Menor"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Add meal modal */}
        <Modal
          visible={showAddMealModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAddMealModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddMealModal(false)}>
                <Text style={styles.modalCancel}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Agregar comida</Text>
              <TouchableOpacity onPress={handleAddMeal} disabled={savingMeal}>
                <Text style={styles.modalSave}>
                  {savingMeal ? "..." : "Agregar"}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.fieldLabel}>Tipo de comida</Text>
              <View style={styles.tipoRow}>
                {TIPOS_COMIDA.map((tipo) => {
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
              <Text style={styles.fieldLabel}>Receta (opcional)</Text>
              <TouchableOpacity
                style={[
                  styles.recetaOption,
                  !selectedRecetaId && styles.recetaOptionActive,
                ]}
                onPress={() => setSelectedRecetaId(null)}
              >
                <Text style={styles.recetaOptionText}>
                  Sin receta específica
                </Text>
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
                      selectedRecetaId === r.id &&
                        styles.recetaOptionTextActive,
                    ]}
                  >
                    {r.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },

  mealPorciones: { fontSize: 12, color: "#64748b", marginTop: 3 },

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
    paddingBottom: 12,
  },
  backText: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginBottom: 8 },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800", flex: 1 },
  estadoBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  estadoText: { fontSize: 11, fontWeight: "700" },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#1B4F72" },
  tabText: { fontSize: 11, fontWeight: "600", color: "#94a3b8" },
  tabTextActive: { color: "#1B4F72" },

  content: { padding: 16, paddingBottom: 40 },

  map: { width: "100%", height: 200, borderRadius: 12, marginTop: 8 },

  mapLinkCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mapLinkIcon: { fontSize: 32 },
  mapLinkInfo: { flex: 1 },
  mapLinkTitle: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  mapLinkSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  mapLinkArrow: { fontSize: 20, color: "#1B4F72", fontWeight: "700" },

  tripPhotoContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  tripPhoto: { width: "100%", height: 200 },
  tripPhotoPlaceholder: {
    width: "100%",
    height: 160,
    backgroundColor: "#1B4F72",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  tripPhotoIcon: { fontSize: 40, marginBottom: 8 },
  tripPhotoText: { color: "rgba(255,255,255,0.7)", fontSize: 13 },

  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  editActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  editText: { fontSize: 13, color: "#1B4F72", fontWeight: "600" },
  cancelText: { fontSize: 13, color: "#64748b" },
  saveBtn: {
    backgroundColor: "#1B4F72",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  infoRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  infoLabel: { fontSize: 13, color: "#94a3b8", fontWeight: "600", width: 90 },
  infoValue: { fontSize: 13, color: "#1e293b", flex: 1, fontWeight: "500" },
  link: { color: "#1B4F72", fontWeight: "700" },

  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1e293b",
  },
  row: { flexDirection: "row" },

  inviteCard: {
    backgroundColor: "#1B4F72",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  inviteLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  inviteCode: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 4,
    marginBottom: 6,
  },
  inviteHint: { color: "rgba(255,255,255,0.5)", fontSize: 11 },

  map: { width: "100%", height: 200, borderRadius: 12, marginTop: 8 },

  deleteButton: {
    backgroundColor: "#fee2e2",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  deleteButtonText: { color: "#dc2626", fontSize: 15, fontWeight: "700" },

  addBtn: {
    backgroundColor: "#1B4F72",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  familiaCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  familiaHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  familiaTitulo: { flex: 1, fontWeight: "700", fontSize: 14, color: "#1e293b" },
  familiaCount: { fontSize: 12, color: "#94a3b8" },

  participanteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 36, height: 36, borderRadius: 18, borderWidth: 2 },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  accountBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#16a34a",
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  participanteInfo: { flex: 1 },
  participanteNombre: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  participanteSub: { fontSize: 11, color: "#94a3b8", marginTop: 1 },
  chevron: { fontSize: 20, color: "#cbd5e1" },

  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  emptySub: { fontSize: 13, color: "#94a3b8", textAlign: "center" },

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

  mealCard: {
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
  mealCardTop: {
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
  tipoBadgeText: { fontSize: 12, fontWeight: "700" },
  mealNombre: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  longPressHint: { fontSize: 10, color: "#cbd5e1" },

  addMealButton: {
    borderWidth: 2,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  addMealButtonText: { color: "#64748b", fontSize: 14, fontWeight: "600" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  estadoModalBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "85%",
  },
  estadoModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 16,
    textAlign: "center",
  },
  estadoOption: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    alignItems: "center",
  },
  estadoOptionText: { fontSize: 15, fontWeight: "700" },
  estadoCancel: { alignItems: "center", marginTop: 8 },
  estadoCancelText: { color: "#64748b", fontSize: 14 },

  familiaModalBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "80%",
    alignItems: "center",
  },
  familiaModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 4,
  },
  familiaModalSub: { fontSize: 14, color: "#64748b", marginBottom: 16 },
  familiaInput: {
    borderWidth: 2,
    borderColor: "#1B4F72",
    borderRadius: 12,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    width: 100,
    paddingVertical: 10,
    color: "#1e293b",
    marginBottom: 20,
  },
  familiaModalButtons: { flexDirection: "row", gap: 12 },
  familiaModalCancel: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  familiaModalCancelText: { color: "#64748b", fontWeight: "600" },
  familiaModalSave: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#1B4F72",
    alignItems: "center",
  },
  familiaModalSaveText: { color: "#fff", fontWeight: "700" },

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

  toggleRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  toggleBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  toggleBtnActive: { borderColor: "#1B4F72", backgroundColor: "#EFF6FF" },
  toggleText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  toggleTextActive: { color: "#1B4F72" },

  noPersonas: { fontSize: 13, color: "#94a3b8", fontStyle: "italic" },
  personaOption: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    marginBottom: 8,
    backgroundColor: "#f8fafc",
  },
  personaOptionActive: { borderColor: "#1B4F72", backgroundColor: "#EFF6FF" },
  personaOptionText: { fontSize: 14, color: "#64748b", fontWeight: "500" },
  personaOptionTextActive: { color: "#1B4F72", fontWeight: "700" },

  factorRow: { flexDirection: "row", gap: 10 },
  factorBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  factorBtnActive: { borderColor: "#1B4F72", backgroundColor: "#EFF6FF" },
  factorBtnText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  factorBtnTextActive: { color: "#1B4F72" },

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
  },
  recetaOptionActive: { borderColor: "#1B4F72", backgroundColor: "#EFF6FF" },
  recetaOptionText: { fontSize: 14, color: "#64748b", fontWeight: "500" },
  recetaOptionTextActive: { color: "#1B4F72", fontWeight: "700" },
});
