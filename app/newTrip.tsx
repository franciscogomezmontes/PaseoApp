import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { useAuthStore } from "../src/store/useAuthStore";
import { useTripStore } from "../src/store/useTripStore";

export default function NewTripScreen() {
  const router = useRouter();
  const { crearPaseo } = useTripStore();

  // ── Campos obligatorios ──
  const [nombre, setNombre] = useState("");
  const [lugar, setLugar] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // ── Campos opcionales ──
  const [linkAlojamiento, setLinkAlojamiento] = useState("");
  const [recomendaciones, setRecomendaciones] = useState("");
  const [linkMapa, setLinkMapa] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");

  // ── UI state ──
  const [showOpcionales, setShowOpcionales] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [createdPaseo, setCreatedPaseo] = useState<any>(null);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setShowErrorModal(true);
  };

  const isValid =
    nombre.trim() && lugar.trim() && fechaInicio.trim() && fechaFin.trim();

  // ─────────────────────────────────────────────
  // Foto
  // ─────────────────────────────────────────────
  const pickPhoto = async (source: "camera" | "gallery") => {
    setShowPhotoModal(false);
    let result;
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showError("Necesitamos acceso a tu cámara.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });
    } else {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showError("Necesitamos acceso a tu galería.");
        return;
      }
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
      const tmpName = `trip_tmp_${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(tmpName, arrayBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });
      if (uploadError) {
        showError(uploadError.message);
        setUploadingPhoto(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(tmpName);
      setFotoUrl(urlData.publicUrl + "?t=" + Date.now());
    } catch {
      showError("No se pudo procesar la imagen.");
    }
    setUploadingPhoto(false);
  };

  // ─────────────────────────────────────────────
  // Crear paseo
  // ─────────────────────────────────────────────
  const handleCreate = async () => {
    if (!isValid) return;

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(fechaInicio) || !dateRegex.test(fechaFin)) {
      showError("Las fechas deben tener el formato AAAA-MM-DD.");
      return;
    }
    if (fechaInicio > fechaFin) {
      showError("La fecha de inicio no puede ser posterior a la fecha de fin.");
      return;
    }

    setSaving(true);
    const { user } = useAuthStore.getState();
    const paseo = await crearPaseo({
      nombre: nombre.trim(),
      lugar: lugar.trim(),
      fecha_inicio: fechaInicio.trim(),
      fecha_fin: fechaFin.trim(),
      estado: "planificacion",
      organizer_id: user?.id,
      link_alojamiento: linkAlojamiento.trim() || null,
      recomendaciones: recomendaciones.trim() || null,
      link_mapa: linkMapa.trim() || null,
      foto_url: fotoUrl || null,
    });
    setSaving(false);

    if (!paseo) {
      showError("No se pudo crear el paseo. Revisa tu conexión.");
      return;
    }

    // Rename temp photo to final name using paseo id
    if (fotoUrl && paseo.id) {
      try {
        const finalName = `trip_${paseo.id}.jpg`;
        const tmpName = fotoUrl.split("/").pop()?.split("?")[0] ?? "";
        if (tmpName && tmpName !== finalName) {
          await supabase.storage.from("avatars").copy(tmpName, finalName);
          const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(finalName);
          await supabase
            .from("paseos")
            .update({ foto_url: urlData.publicUrl })
            .eq("id", paseo.id);
          await supabase.storage.from("avatars").remove([tmpName]);
        }
      } catch {
        /* non-critical, photo already uploaded */
      }
    }

    setCreatedPaseo(paseo);
    setShowSuccessModal(true);
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.headerBack}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nuevo paseo</Text>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={!isValid || saving}
          >
            <Text
              style={[
                styles.headerSave,
                (!isValid || saving) && styles.headerSaveDisabled,
              ]}
            >
              {saving ? "..." : "Crear"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Foto del paseo ── */}
          <TouchableOpacity
            style={styles.photoArea}
            onPress={() => setShowPhotoModal(true)}
          >
            {uploadingPhoto ? (
              <View style={styles.photoPlaceholder}>
                <ActivityIndicator color="#fff" size="large" />
              </View>
            ) : fotoUrl ? (
              <View>
                <Image source={{ uri: fotoUrl }} style={styles.photoPreview} />
                <View style={styles.photoEditBadge}>
                  <Text style={styles.photoEditText}>📷 Cambiar foto</Text>
                </View>
              </View>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoIcon}>📸</Text>
                <Text style={styles.photoHint}>
                  Toca para agregar una foto{"\n"}del lugar (opcional)
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ── Campos obligatorios ── */}
          <Text style={styles.sectionLabel}>Información básica</Text>

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

          <View style={styles.dateRow}>
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

          {/* ── Campos opcionales (colapsables) ── */}
          <TouchableOpacity
            style={styles.opcionalesToggle}
            onPress={() => setShowOpcionales(!showOpcionales)}
          >
            <View>
              <Text style={styles.opcionalesToggleTitle}>
                {showOpcionales ? "▾" : "▸"} Información adicional
              </Text>
              <Text style={styles.opcionalesToggleSub}>
                Alojamiento, ubicación, recomendaciones
              </Text>
            </View>
            <Text style={styles.opcionalesToggleHint}>
              {showOpcionales ? "Ocultar" : "Opcional"}
            </Text>
          </TouchableOpacity>

          {showOpcionales && (
            <View style={styles.opcionalesContent}>
              <View style={styles.field}>
                <Text style={styles.label}>🏠 Link de alojamiento</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://airbnb.com/..."
                  placeholderTextColor="#94a3b8"
                  value={linkAlojamiento}
                  onChangeText={setLinkAlojamiento}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>🗺️ Link de ubicación</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://maps.google.com/..."
                  placeholderTextColor="#94a3b8"
                  value={linkMapa}
                  onChangeText={setLinkMapa}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>💡 Recomendaciones de llegada</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="Ej: Tomar la vía principal, la casa es la segunda a la derecha..."
                  placeholderTextColor="#94a3b8"
                  value={recomendaciones}
                  onChangeText={setRecomendaciones}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          )}

          {/* ── Info box ── */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              🔑 Se generará un código de invitación automáticamente para
              compartir con tu grupo.
            </Text>
          </View>

          {/* ── Botón crear ── */}
          <TouchableOpacity
            style={[
              styles.createButton,
              (!isValid || saving) && styles.createButtonDisabled,
            ]}
            onPress={handleCreate}
            disabled={!isValid || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>✓ Crear paseo</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── MODALS ── */}

      {/* Foto source */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheetBox}>
            <Text style={styles.sheetTitle}>Foto del paseo</Text>
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => pickPhoto("camera")}
            >
              <Text style={styles.sheetOptionText}>📷 Tomar foto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => pickPhoto("gallery")}
            >
              <Text style={styles.sheetOptionText}>🖼️ Elegir de galería</Text>
            </TouchableOpacity>
            {fotoUrl ? (
              <TouchableOpacity
                style={[styles.sheetOption, { backgroundColor: "#FEE2E2" }]}
                onPress={() => {
                  setFotoUrl("");
                  setShowPhotoModal(false);
                }}
              >
                <Text style={[styles.sheetOptionText, { color: "#DC2626" }]}>
                  🗑️ Quitar foto
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setShowPhotoModal(false)}
            >
              <Text style={styles.sheetCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Éxito */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.overlay}>
          <View style={styles.successBox}>
            <Text style={styles.successEmoji}>🎉</Text>
            <Text style={styles.successTitle}>¡Paseo creado!</Text>
            <Text style={styles.successMsg}>
              {createdPaseo?.nombre} está listo.{"\n"}
              Código de invitación:{" "}
              <Text style={styles.successCode}>
                {createdPaseo?.codigo_invitacion}
              </Text>
            </Text>
            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace({
                  pathname: "/tripDetail",
                  params: { id: createdPaseo?.id },
                });
              }}
            >
              <Text style={styles.successBtnText}>Ir al paseo →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.successSecondary}
              onPress={() => {
                setShowSuccessModal(false);
                router.back();
              }}
            >
              <Text style={styles.successSecondaryText}>
                Volver a mis paseos
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>⚠️ Error</Text>
            <Text style={styles.errorMsg}>{errorMsg}</Text>
            <TouchableOpacity
              style={styles.errorBtn}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.errorBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },

  // Header
  header: {
    backgroundColor: "#1B4F72",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerBack: { color: "rgba(255,255,255,0.8)", fontSize: 14, width: 70 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  headerSave: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    width: 70,
    textAlign: "right",
  },
  headerSaveDisabled: { color: "rgba(255,255,255,0.35)" },

  content: { padding: 20, paddingBottom: 48 },

  // Photo
  photoArea: { marginBottom: 24, borderRadius: 16, overflow: "hidden" },
  photoPlaceholder: {
    height: 180,
    backgroundColor: "#1B4F72",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  photoPreview: { width: "100%", height: 180, borderRadius: 16 },
  photoEditBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  photoEditText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  photoIcon: { fontSize: 36 },
  photoHint: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },

  // Fields
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6 },
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
  inputMultiline: { height: 90, textAlignVertical: "top", paddingTop: 12 },
  dateRow: { flexDirection: "row" },

  // Opcionales toggle
  opcionalesToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 2,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  opcionalesToggleTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  opcionalesToggleSub: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  opcionalesToggleHint: { fontSize: 12, color: "#1B4F72", fontWeight: "600" },
  opcionalesContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
  },

  // Info box
  infoBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },
  infoText: { fontSize: 13, color: "#1D4ED8", lineHeight: 20 },

  // Create button
  createButton: {
    backgroundColor: "#1B4F72",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  createButtonDisabled: { backgroundColor: "#94a3b8" },
  createButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  // Modals
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },

  sheetBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "84%",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 16,
  },
  sheetOption: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  sheetOptionText: { fontSize: 15, fontWeight: "700", color: "#1B4F72" },
  sheetCancel: { alignItems: "center", marginTop: 4 },
  sheetCancelText: { color: "#64748b", fontSize: 14 },

  successBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    width: "84%",
    alignItems: "center",
  },
  successEmoji: { fontSize: 52, marginBottom: 12 },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 8,
  },
  successMsg: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  successCode: { fontWeight: "800", color: "#1B4F72", letterSpacing: 2 },
  successBtn: {
    backgroundColor: "#1B4F72",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 10,
    width: "100%",
    alignItems: "center",
  },
  successBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  successSecondary: { padding: 10 },
  successSecondaryText: { color: "#64748b", fontSize: 14 },

  errorBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "84%",
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 8,
  },
  errorMsg: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  errorBtn: {
    backgroundColor: "#1B4F72",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  errorBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
