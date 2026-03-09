import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/store/useAuthStore";
import { useTripStore } from "../../src/store/useTripStore";

const VERSION = "0.1.0";

const WHATS_NEW = [
  {
    icon: "🗺️",
    title: "Mis Paseos",
    desc: "Crea y gestiona tus paseos con código de invitación.",
  },
  {
    icon: "📖",
    title: "Recetas desde la nube",
    desc: "Catálogo de recetas compartido, sincronizado en tiempo real.",
  },
  {
    icon: "👥",
    title: "Participantes por familia",
    desc: "Agrupa personas por unidad familiar con factor de consumo.",
  },
  {
    icon: "🔐",
    title: "Cuentas de usuario",
    desc: "Acceso seguro con email y contraseña.",
  },
];

const initials = (name: string) =>
  name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "??";

export default function HomeScreen() {
  const { persona, signOut, initialize } = useAuthStore();
  const { paseos, fetchPaseos } = useTripStore();

  const [notificaciones, setNotificaciones] = useState(true);
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [restricciones, setRestricciones] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fullPersona, setFullPersona] = useState<any>(null);

  useEffect(() => {
    loadFullPersona();
  }, [persona]);

  useFocusEffect(
    useCallback(() => {
      fetchPaseos();
    }, []),
  );

  const loadFullPersona = async () => {
    if (!persona?.id) {
      console.log("No persona id in auth store:", JSON.stringify(persona));
      return;
    }
    console.log("Loading full persona for id:", persona.id);
    const { data, error } = await supabase
      .from("personas")
      .select("*")
      .eq("id", persona.id)
      .single();
    console.log(
      "Full persona result:",
      JSON.stringify(data),
      JSON.stringify(error),
    );
    if (data) {
      setFullPersona(data);
      setNombre(data.nombre ?? "");
      setTelefono(data.telefono ?? "");
      setRestricciones(data.restricciones_alimentarias ?? "");
      setFotoUrl(data.foto_url ?? "");
    }
  };

  const handleSave = async () => {
    if (!fullPersona?.id) {
      Alert.alert(
        "Error",
        "No se pudo identificar tu perfil. Intenta cerrar sesión y volver a entrar.",
      );
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("personas")
      .update({
        nombre,
        telefono,
        restricciones_alimentarias: restricciones,
        foto_url: fotoUrl,
      })
      .eq("id", fullPersona.id);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setEditing(false);
      loadFullPersona();
      initialize();
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
      const fileName = `${persona!.id}.jpg`;
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
      setFotoUrl(publicUrl);
      await supabase
        .from("personas")
        .update({ foto_url: publicUrl })
        .eq("id", persona!.id);
    } catch (e) {
      Alert.alert("Error", "No se pudo procesar la imagen.");
    }
    setUploadingPhoto(false);
  };

  const handleSignOut = () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: signOut },
    ]);
  };

  const totalPaseos = paseos.length;
  const activos = paseos.filter((p) => p.estado === "activo").length;
  const planificacion = paseos.filter(
    (p) => p.estado === "planificacion",
  ).length;
  const cerrados = paseos.filter((p) => p.estado === "liquidado").length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ── PROFILE CARD ── */}
        <View style={styles.profileCard}>
          <View style={styles.profileCardTop}>
            <TouchableOpacity
              onPress={handlePhotoOptions}
              style={styles.avatarContainer}
            >
              {uploadingPhoto ? (
                <View style={styles.avatarLarge}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : fotoUrl ? (
                <Image source={{ uri: fotoUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarText}>{initials(nombre)}</Text>
                </View>
              )}
              <View style={styles.avatarCameraIcon}>
                <Text style={{ fontSize: 12 }}>📷</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.profileInfo}>
              {editing ? (
                <TextInput
                  style={styles.nameInput}
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="Tu nombre"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                />
              ) : (
                <Text style={styles.profileName}>
                  {nombre || persona?.nombre}
                </Text>
              )}
              <Text style={styles.profileEmail}>
                {fullPersona?.email ?? ""}
              </Text>
              {fullPersona?.telefono ? (
                <Text style={styles.profilePhone}>
                  📱 {fullPersona.telefono}
                </Text>
              ) : null}
            </View>
          </View>

          {editing && (
            <View style={styles.editFields}>
              <TextInput
                style={styles.editInput}
                value={telefono}
                onChangeText={setTelefono}
                placeholder="Teléfono"
                placeholderTextColor="rgba(255,255,255,0.5)"
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.editInput}
                value={restricciones}
                onChangeText={setRestricciones}
                placeholder="Restricciones alimentarias"
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
            </View>
          )}

          <View style={styles.profileActions}>
            {editing ? (
              <>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.saveBtnText}>
                    {saving ? "Guardando..." : "✓ Guardar"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setEditing(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => setEditing(true)}
              >
                <Text style={styles.editBtnText}>✏️ Editar perfil</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── MY TRIPS SUMMARY ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Mis Paseos</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{totalPaseos}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View
              style={[
                styles.statBox,
                { borderLeftWidth: 1, borderColor: "#e2e8f0" },
              ]}
            >
              <Text style={[styles.statVal, { color: "#16a34a" }]}>
                {activos}
              </Text>
              <Text style={styles.statLabel}>Activos</Text>
            </View>
            <View
              style={[
                styles.statBox,
                { borderLeftWidth: 1, borderColor: "#e2e8f0" },
              ]}
            >
              <Text style={[styles.statVal, { color: "#B45309" }]}>
                {planificacion}
              </Text>
              <Text style={styles.statLabel}>Planeando</Text>
            </View>
            <View
              style={[
                styles.statBox,
                { borderLeftWidth: 1, borderColor: "#e2e8f0" },
              ]}
            >
              <Text style={[styles.statVal, { color: "#6D28D9" }]}>
                {cerrados}
              </Text>
              <Text style={styles.statLabel}>Cerrados</Text>
            </View>
          </View>
        </View>

        {/* ── SETTINGS ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Configuración</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🔔</Text>
              <View>
                <Text style={styles.settingLabel}>Notificaciones</Text>
                <Text style={styles.settingSub}>
                  Avisos de gastos y cambios al menú
                </Text>
              </View>
            </View>
            <Switch
              value={notificaciones}
              onValueChange={setNotificaciones}
              trackColor={{ false: "#e2e8f0", true: "#1B4F72" }}
              thumbColor="#fff"
            />
          </View>
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🌍</Text>
              <View>
                <Text style={styles.settingLabel}>Idioma</Text>
                <Text style={styles.settingSub}>Español</Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🔒</Text>
              <View>
                <Text style={styles.settingLabel}>Cambiar contraseña</Text>
                <Text style={styles.settingSub}>Actualiza tu contraseña</Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── SUBSCRIPTION ── */}
        <View style={styles.subscriptionCard}>
          <View>
            <Text style={styles.subscriptionBadge}>GRATIS</Text>
            <Text style={styles.subscriptionTitle}>Plan Gratuito</Text>
            <Text style={styles.subscriptionSub}>Hasta 3 paseos activos</Text>
          </View>
          <TouchableOpacity style={styles.upgradeButton}>
            <Text style={styles.upgradeButtonText}>✨ Pro</Text>
          </TouchableOpacity>
        </View>

        {/* ── WHAT'S NEW ── */}
        <View style={styles.section}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Text style={styles.sectionTitle}>🚀 Novedades</Text>
            <Text style={{ fontSize: 12, color: "#94a3b8" }}>v{VERSION}</Text>
          </View>
          {WHATS_NEW.map((item, i) => (
            <View key={i} style={styles.newFeatureRow}>
              <Text style={styles.newFeatureIcon}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.newFeatureTitle}>{item.title}</Text>
                <Text style={styles.newFeatureDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── LOGOUT ── */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutText}>🚪 Cerrar sesión</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          PaseoApp v{VERSION} · Hecho con ❤️ en Colombia
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  content: { padding: 16, paddingBottom: 40 },

  profileCard: {
    backgroundColor: "#1B4F72",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  profileCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  avatarContainer: { position: "relative" },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: { color: "#fff", fontSize: 24, fontWeight: "800" },
  avatarCameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { flex: 1 },
  profileName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 2,
  },
  profileEmail: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginBottom: 2,
  },
  profilePhone: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  nameInput: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    borderBottomWidth: 2,
    borderBottomColor: "rgba(255,255,255,0.4)",
    paddingBottom: 2,
    marginBottom: 4,
  },
  editFields: { gap: 8, marginBottom: 16 },
  editInput: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
  },
  profileActions: { flexDirection: "row", gap: 8 },
  editBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  editBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  saveBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  saveBtnText: { color: "#1B4F72", fontWeight: "800", fontSize: 13 },
  cancelBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    fontSize: 13,
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

  statsRow: { flexDirection: "row" },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 8 },
  statVal: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1B4F72",
    marginBottom: 2,
  },
  statLabel: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  settingIcon: { fontSize: 22 },
  settingLabel: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  settingSub: { fontSize: 12, color: "#94a3b8", marginTop: 1 },
  settingArrow: { fontSize: 22, color: "#cbd5e1" },

  subscriptionCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subscriptionBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 1,
    marginBottom: 2,
  },
  subscriptionTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  subscriptionSub: { fontSize: 12, color: "#64748b" },
  upgradeButton: {
    backgroundColor: "#F59E0B",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  upgradeButtonText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  newFeatureRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  newFeatureIcon: { fontSize: 22, marginTop: 1 },
  newFeatureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  newFeatureDesc: { fontSize: 12, color: "#64748b", lineHeight: 18 },

  logoutButton: {
    backgroundColor: "#dc2626",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  footerText: { textAlign: "center", fontSize: 11, color: "#cbd5e1" },
});
