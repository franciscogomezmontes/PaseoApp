import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";

const UF_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

const initials = (name: string) =>
  name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "??";

export default function ParticipantDetailScreen() {
  const router = useRouter();
  const { personaId } = useLocalSearchParams<{ personaId: string }>();

  const [persona, setPersona] = useState<any>(null);
  const [participaciones, setParticipaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [restricciones, setRestricciones] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadData();
  }, [personaId]);

  const loadData = async () => {
    setLoading(true);
    const { data: personaData } = await supabase
      .from("personas")
      .select("*")
      .eq("id", personaId)
      .single();

    if (personaData) {
      setPersona(personaData);
      setNombre(personaData.nombre ?? "");
      setTelefono(personaData.telefono ?? "");
      setRestricciones(personaData.restricciones_alimentarias ?? "");
      setFotoUrl(personaData.foto_url ?? "");
    }

    const { data: partData } = await supabase
      .from("participaciones")
      .select("*, paseos(nombre, lugar, fecha_inicio, fecha_fin)")
      .eq("persona_id", personaId)
      .order("created_at", { ascending: false });

    setParticipaciones(partData ?? []);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    console.log("Saving persona:", personaId, {
      nombre,
      telefono,
      restricciones,
      fotoUrl,
    });

    const { data, error } = await supabase
      .from("personas")
      .update({
        nombre,
        telefono,
        restricciones_alimentarias: restricciones,
        foto_url: fotoUrl,
      })
      .eq("id", personaId)
      .select();

    console.log("Save result:", JSON.stringify(data), JSON.stringify(error));

    if (error) {
      Alert.alert("Error", "No se pudo guardar: " + error.message);
    } else {
      setEditing(false);
      loadData();
    }
    setSaving(false);
  };

  const handlePhotoOptions = () => {
    Alert.alert("Foto de perfil", "¿Cómo quieres agregar la foto?", [
      { text: "📷 Tomar foto", onPress: () => pickImage("camera") },
      { text: "🖼️ Elegir de galería", onPress: () => pickImage("gallery") },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const pickImage = async (source: "camera" | "gallery") => {
    let result;

    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso requerido", "Necesitamos acceso a tu cámara.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
    } else {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería.");
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
    }

    if (result.canceled) return;

    setUploadingPhoto(true);
    try {
      const uri = result.assets[0].uri;
      const fileName = `${personaId}.jpg`;

      // Convert to blob
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
        Alert.alert(
          "Error",
          "No se pudo subir la foto: " + uploadError.message,
        );
        setUploadingPhoto(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl + "?t=" + Date.now();
      setFotoUrl(publicUrl);

      // Save immediately
      await supabase
        .from("personas")
        .update({ foto_url: publicUrl })
        .eq("id", personaId);
    } catch (e: any) {
      Alert.alert("Error", "No se pudo procesar la imagen.");
    }
    setUploadingPhoto(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#1B4F72" />
      </SafeAreaView>
    );
  }

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
          {editing ? (
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.editText}>
                {saving ? "Guardando..." : "Guardar"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.editText}>Editar</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* PROFILE CARD */}
          <View style={styles.profileCard}>
            <TouchableOpacity
              onPress={handlePhotoOptions}
              style={styles.avatarContainer}
            >
              {fotoUrl ? (
                <Image source={{ uri: fotoUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>
                    {initials(persona?.nombre)}
                  </Text>
                </View>
              )}
              {uploadingPhoto ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : (
                <View style={styles.avatarOverlay}>
                  <Text style={styles.avatarOverlayText}>
                    {editing ? "📷" : ""}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {editing ? (
              <TextInput
                style={styles.nameInput}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Nombre"
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
            ) : (
              <Text style={styles.profileName}>{persona?.nombre}</Text>
            )}
            <Text style={styles.profileEmail}>
              {persona?.email ?? "Sin email"}
            </Text>
            {!editing && (
              <Text style={styles.photoHint}>Toca la foto para cambiarla</Text>
            )}
          </View>

          {/* DETAILS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Información</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>📱 Teléfono</Text>
              {editing ? (
                <TextInput
                  style={styles.detailInput}
                  value={telefono}
                  onChangeText={setTelefono}
                  placeholder="Ej: +57 300 000 0000"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.detailValue}>
                  {persona?.telefono || "No registrado"}
                </Text>
              )}
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                🚫 Restricciones alimentarias
              </Text>
              {editing ? (
                <TextInput
                  style={[styles.detailInput, { height: 80 }]}
                  value={restricciones}
                  onChangeText={setRestricciones}
                  placeholder="Ej: vegetariano, sin gluten..."
                  placeholderTextColor="#94a3b8"
                  multiline
                />
              ) : (
                <Text style={styles.detailValue}>
                  {persona?.restricciones_alimentarias || "Ninguna"}
                </Text>
              )}
            </View>
          </View>

          {/* TRIPS HISTORY */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              🗺️ Paseos ({participaciones.length})
            </Text>
            {participaciones.length === 0 ? (
              <Text style={styles.emptyText}>
                Aún no ha participado en ningún paseo
              </Text>
            ) : (
              participaciones.map((p) => {
                const color =
                  UF_COLORS[(p.unidad_familiar - 1) % UF_COLORS.length];
                return (
                  <View key={p.id} style={styles.tripRow}>
                    <View
                      style={[styles.tripDot, { backgroundColor: color }]}
                    />
                    <View style={styles.tripInfo}>
                      <Text style={styles.tripNombre}>{p.paseos?.nombre}</Text>
                      <Text style={styles.tripSub}>
                        📍 {p.paseos?.lugar} · {p.paseos?.fecha_inicio}
                      </Text>
                      <Text style={styles.tripSub}>
                        Familia {p.unidad_familiar} · Factor {p.factor}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* SAVE BUTTON (visible when editing) */}
          {editing && (
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? "Guardando..." : "✓ Guardar cambios"}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    backgroundColor: "#1B4F72",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backText: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  editText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  content: { padding: 16, paddingBottom: 40 },

  profileCard: {
    backgroundColor: "#1B4F72",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  avatarContainer: { marginBottom: 12, position: "relative" },
  avatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLargeText: { color: "#fff", fontSize: 32, fontWeight: "800" },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOverlayText: { fontSize: 14 },
  profileName: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  profileEmail: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    marginBottom: 4,
  },
  photoHint: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
  nameInput: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    borderBottomWidth: 2,
    borderBottomColor: "rgba(255,255,255,0.5)",
    paddingBottom: 4,
    marginBottom: 4,
    minWidth: 200,
    textAlign: "center",
  },

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
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 14,
  },

  detailRow: { marginBottom: 16 },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    marginBottom: 6,
  },
  detailValue: { fontSize: 15, color: "#1e293b", fontWeight: "500" },
  detailInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1e293b",
  },

  tripRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  tripDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  tripInfo: { flex: 1 },
  tripNombre: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  tripSub: { fontSize: 12, color: "#64748b", marginBottom: 1 },

  emptyText: { fontSize: 13, color: "#94a3b8", fontStyle: "italic" },

  saveButton: {
    backgroundColor: "#1B4F72",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: { backgroundColor: "#94a3b8" },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
