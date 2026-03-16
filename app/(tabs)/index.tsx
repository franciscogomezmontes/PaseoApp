import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ONBOARDING_KEY } from "../../src/constants";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/store/useAuthStore";
import { useTripStore } from "../../src/store/useTripStore";

const VERSION = "0.1.0";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Crea un paseo",
    desc: "Define fechas, lugar y comparte el código de invitación con tu grupo.",
  },
  {
    step: "02",
    title: "Arma el menú",
    desc: "Elige recetas del catálogo compartido para cada día del paseo.",
  },
  {
    step: "03",
    title: "Registra los gastos",
    desc: "Anota quién pagó qué. La app divide todo automáticamente.",
  },
  {
    step: "04",
    title: "Liquida con un toque",
    desc: "Calcula transferencias mínimas para cuadrar cuentas al final.",
  },
];

const TESTIMONIOS = [
  {
    nombre: "Camila R.",
    texto: "Pasamos de planillas de Excel a PaseoApp. La diferencia es brutal.",
    emoji: "🏕️",
  },
  {
    nombre: "Andrés M.",
    texto: "Por fin algo que entiende que hay niños con factor distinto.",
    emoji: "👨‍👩‍👧‍👦",
  },
  {
    nombre: "Laura P.",
    texto: "El módulo de recetas me salvó. Nunca más improvisamos en el campo.",
    emoji: "🍳",
  },
];

const FAQ = [
  {
    q: "¿Cuántas personas puede tener un paseo?",
    a: "No hay límite. Puedes tener tantos participantes como necesites, organizados por familias.",
  },
  {
    q: "¿Qué pasa si alguien no come en una comida?",
    a: "Puedes desactivarlo para ese momento específico y el costo se redistribuye automáticamente.",
  },
  {
    q: "¿Puedo usar PaseoApp sin internet?",
    a: "Necesitas conexión para sincronizar datos, pero la navegación básica funciona con caché.",
  },
  {
    q: "¿Cómo se calculan las liquidaciones?",
    a: "Usamos el algoritmo de transferencias mínimas para reducir al máximo el número de pagos.",
  },
];

const ESTADO_CONFIG: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  planificacion: { color: "#92400E", bg: "#FEF3C7", label: "Planificación" },
  activo: { color: "#065F46", bg: "#D1FAE5", label: "Activo" },
  liquidado: { color: "#1D4ED8", bg: "#DBEAFE", label: "Liquidado" },
};

const initials = (name: string) =>
  name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "??";

const getSaludo = () => {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
};

export default function HomeScreen() {
  const { persona, signOut, initialize } = useAuthStore();
  const { paseos, fetchPaseos } = useTripStore();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Profile ──
  const [fullPersona, setFullPersona] = useState<any>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [restricciones, setRestricciones] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── UI ──
  const [notificaciones, setNotificaciones] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [paseosExpanded, setPaseosExpanded] = useState(false);

  // ── Modals ──
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setShowErrorModal(true);
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    if (persona?.id) loadFullPersona();
  }, [persona]);

  useFocusEffect(
    useCallback(() => {
      fetchPaseos();
    }, []),
  );

  const loadFullPersona = async () => {
    if (!persona?.id) return;
    const { data } = await supabase
      .from("personas")
      .select("*")
      .eq("id", persona.id)
      .single();
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
      showError("No se pudo identificar tu perfil.");
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
    if (error) showError(error.message);
    else {
      setShowProfileModal(false);
      loadFullPersona();
      initialize();
    }
    setSaving(false);
  };

  const pickImage = async (source: "camera" | "gallery") => {
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
        aspect: [1, 1],
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
        showError(uploadError.message);
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
    } catch {
      showError("No se pudo procesar la imagen.");
    }
    setUploadingPhoto(false);
  };

  const handleInvitarAmigos = async () => {
    try {
      await Share.share({
        message: `🏕️ Te invito a usar *PaseoApp* — la app para organizar paseos en grupo sin dramas.\n\n✅ Menú del paseo\n✅ División de gastos automática\n✅ Liquidaciones mínimas\n\nDescárgala y organiza tu próximo paseo sin hojas de cálculo ni peleas.`,
        title: "Invitación a PaseoApp",
      });
    } catch {
      /* cancelled */
    }
  };

  const handleVerOnboarding = async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    router.push("/onboarding" as any);
  };

  // ── Derived ──
  const paseosActivos = paseos.filter((p) => p.estado === "activo");
  const paseosPlanificacion = paseos.filter(
    (p) => p.estado === "planificacion",
  );
  const paseosRecientes = [...paseosActivos, ...paseosPlanificacion].slice(
    0,
    5,
  );

  // ─────────────────────────────────────────────
  // UNAUTHENTICATED
  // ─────────────────────────────────────────────
  if (!persona) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                🏕️ Para grupos que viajan juntos
              </Text>
            </View>
            <Text style={styles.heroTitle}>
              Planea.{"\n"}Come bien.{"\n"}Cuadra cuentas.
            </Text>
            <Text style={styles.heroSub}>
              PaseoApp organiza el menú, los gastos y las deudas de tu próximo
              paseo — sin hojas de cálculo, sin peleas.
            </Text>
            <TouchableOpacity
              style={styles.heroCTA}
              onPress={() => router.push("/auth")}
            >
              <Text style={styles.heroCTAText}>Comenzar gratis →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/auth")}>
              <Text style={styles.heroSecondary}>
                ¿Ya tienes cuenta? Inicia sesión
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsStrip}>
            {[
              ["🏕️", "Paseos"],
              ["🍽️", "Recetas"],
              ["👥", "Familias"],
              ["💸", "Sin drama"],
            ].map(([icon, label], i) => (
              <View key={i} style={styles.stripItem}>
                <Text style={styles.stripIcon}>{icon}</Text>
                <Text style={styles.stripLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.howSection}>
            <Text style={styles.sectionHeading}>Cómo funciona</Text>
            {HOW_IT_WORKS.map((item, i) => (
              <View key={i} style={styles.howRow}>
                <View style={styles.howStepBadge}>
                  <Text style={styles.howStepText}>{item.step}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.howTitle}>{item.title}</Text>
                  <Text style={styles.howDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.testimoniosSection}>
            <Text style={styles.sectionHeading}>Lo que dicen</Text>
            {TESTIMONIOS.map((t, i) => (
              <View key={i} style={styles.testimonioCard}>
                <Text style={styles.testimonioEmoji}>{t.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.testimonioTexto}>"{t.texto}"</Text>
                  <Text style={styles.testimonioNombre}>— {t.nombre}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.ctaFinalSection}>
            <Text style={styles.ctaFinalTitle}>
              ¿Listo para tu próximo paseo?
            </Text>
            <TouchableOpacity
              style={styles.heroCTA}
              onPress={() => router.push("/auth")}
            >
              <Text style={styles.heroCTAText}>Crear cuenta gratis →</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>
            PaseoApp v{VERSION} · Hecho con ❤️ en Colombia
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────
  // AUTHENTICATED
  // ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. BIENVENIDA ── */}
        <View style={styles.welcomeSection}>
          <View>
            <Text style={styles.welcomeSaludo}>{getSaludo()} 👋</Text>
            <Text style={styles.welcomeNombre}>
              {nombre || persona?.nombre}
            </Text>
          </View>
          {fotoUrl ? (
            <TouchableOpacity onPress={() => setShowProfileModal(true)}>
              <Image source={{ uri: fotoUrl }} style={styles.welcomeAvatar} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.welcomeAvatarPlaceholder}
              onPress={() => setShowProfileModal(true)}
            >
              <Text style={styles.welcomeAvatarText}>
                {initials(nombre || persona?.nombre || "?")}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── 2. ACCESOS RÁPIDOS ── */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/trips" as any)}
          >
            <Text style={styles.quickIcon}>🏕️</Text>
            <Text style={styles.quickLabel}>Mis paseos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/recipes" as any)}
          >
            <Text style={styles.quickIcon}>📖</Text>
            <Text style={styles.quickLabel}>Recetas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/grocery" as any)}
          >
            <Text style={styles.quickIcon}>🛒</Text>
            <Text style={styles.quickLabel}>Mercado</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/expenses" as any)}
          >
            <Text style={styles.quickIcon}>💸</Text>
            <Text style={styles.quickLabel}>Gastos</Text>
          </TouchableOpacity>
        </View>

        {/* ── 3. PASEOS ACTIVOS (colapsable) ── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.collapseHeader}
            onPress={() => setPaseosExpanded(!paseosExpanded)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.sectionTitle}>Paseos activos</Text>
              <Text style={styles.collapseHint}>
                {paseosRecientes.length === 0
                  ? "Sin paseos activos"
                  : `${paseosRecientes.length} paseo${paseosRecientes.length !== 1 ? "s" : ""}`}
              </Text>
            </View>
            <View style={styles.collapseRight}>
              <TouchableOpacity onPress={() => router.push("/trips" as any)}>
                <Text style={styles.sectionLink}>Ver todos →</Text>
              </TouchableOpacity>
              <Text style={styles.collapseIcon}>
                {paseosExpanded ? "▲" : "▼"}
              </Text>
            </View>
          </TouchableOpacity>

          {paseosExpanded &&
            (paseosRecientes.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏕️</Text>
                <Text style={styles.emptyTitle}>Sin paseos aún</Text>
                <Text style={styles.emptySub}>
                  Ve a Mis Paseos para crear el primero
                </Text>
              </View>
            ) : (
              paseosRecientes.map((p) => {
                const cfg =
                  ESTADO_CONFIG[p.estado] ?? ESTADO_CONFIG["planificacion"];
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.paseoRow}
                    onPress={() =>
                      router.push({
                        pathname: "/tripDetail",
                        params: { id: p.id },
                      })
                    }
                  >
                    <View style={styles.paseoRowLeft}>
                      {p.foto_url ? (
                        <Image
                          source={{ uri: p.foto_url }}
                          style={styles.paseoThumb}
                        />
                      ) : (
                        <View style={styles.paseoThumbPlaceholder}>
                          <Text style={{ fontSize: 20 }}>🏕️</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.paseoNombre} numberOfLines={1}>
                          {p.nombre}
                        </Text>
                        <Text style={styles.paseoFecha}>
                          {p.lugar ?? ""} · {p.fecha_inicio} → {p.fecha_fin}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <View
                        style={[
                          styles.estadoBadge,
                          { backgroundColor: cfg.bg },
                        ]}
                      >
                        <Text style={[styles.estadoText, { color: cfg.color }]}>
                          {cfg.label}
                        </Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ))}
        </View>

        {/* ── 4. RESUMEN ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          <View style={styles.statsRow}>
            {[
              { val: paseos.length, label: "Paseos", color: "#1B4F72" },
              { val: paseosActivos.length, label: "Activos", color: "#065F46" },
              {
                val: paseosPlanificacion.length,
                label: "Planeando",
                color: "#B45309",
              },
              {
                val: paseos.filter((p) => p.estado === "liquidado").length,
                label: "Liquidados",
                color: "#6D28D9",
              },
            ].map((s, i) => (
              <View
                key={i}
                style={[styles.statBox, i > 0 && styles.statBoxBorder]}
              >
                <Text style={[styles.statVal, { color: s.color }]}>
                  {s.val}
                </Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── 5. INVITAR AMIGOS ── */}
        <TouchableOpacity
          style={styles.inviteCard}
          onPress={handleInvitarAmigos}
        >
          <View style={styles.inviteLeft}>
            <Text style={styles.inviteEmoji}>🤝</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.inviteTitle}>Invita a tus amigos</Text>
              <Text style={styles.inviteSub}>
                Comparte PaseoApp con tu grupo
              </Text>
            </View>
          </View>
          <Text style={styles.inviteArrow}>📤</Text>
        </TouchableOpacity>

        {/* ── 6. CONFIGURACIÓN ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuración</Text>

          {/* Perfil */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowProfileModal(true)}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>⚙️</Text>
              <View>
                <Text style={styles.settingLabel}>Editar perfil</Text>
                <Text style={styles.settingSub}>
                  {nombre || persona?.nombre}
                </Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          {/* Notificaciones */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🔔</Text>
              <View>
                <Text style={styles.settingLabel}>Notificaciones</Text>
                <Text style={styles.settingSub}>Gastos y cambios al menú</Text>
              </View>
            </View>
            <Switch
              value={notificaciones}
              onValueChange={setNotificaciones}
              trackColor={{ false: "#e2e8f0", true: "#1B4F72" }}
              thumbColor="#fff"
            />
          </View>

          {/* Idioma */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🌍</Text>
              <View>
                <Text style={styles.settingLabel}>Idioma</Text>
                <Text style={styles.settingSub}>Español</Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </View>

          {/* Tutorial */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomWidth: 0 }]}
            onPress={handleVerOnboarding}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🎓</Text>
              <View>
                <Text style={styles.settingLabel}>Ver tutorial</Text>
                <Text style={styles.settingSub}>
                  Volver a ver las pantallas de introducción
                </Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── 7. FAQ ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preguntas frecuentes</Text>
          {FAQ.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.faqItem,
                i === FAQ.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => setOpenFaq(openFaq === i ? null : i)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQ}>{item.q}</Text>
                <Text style={styles.faqChevron}>
                  {openFaq === i ? "↑" : "↓"}
                </Text>
              </View>
              {openFaq === i && <Text style={styles.faqA}>{item.a}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 8. CERRAR SESIÓN ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setShowSignOutModal(true)}
        >
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          PaseoApp v{VERSION} · Hecho con ❤️ en Colombia
        </Text>
      </Animated.ScrollView>

      {/* ══ MODALS ══ */}

      {/* Perfil */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProfileModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Editar perfil</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={styles.modalSave}>{saving ? "..." : "Guardar"}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Foto */}
            <TouchableOpacity
              style={styles.profilePhotoBtn}
              onPress={() => setShowPhotoModal(true)}
            >
              {uploadingPhoto ? (
                <View style={styles.profilePhotoBtnPlaceholder}>
                  <ActivityIndicator color="#1B4F72" />
                </View>
              ) : fotoUrl ? (
                <Image
                  source={{ uri: fotoUrl }}
                  style={styles.profilePhotoBtnImg}
                />
              ) : (
                <View style={styles.profilePhotoBtnPlaceholder}>
                  <Text style={{ fontSize: 32 }}>📸</Text>
                  <Text style={styles.profilePhotoBtnText}>Foto de perfil</Text>
                </View>
              )}
              <View style={styles.profilePhotoEditBadge}>
                <Text style={{ fontSize: 12 }}>📷</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Tu nombre completo"
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Teléfono</Text>
              <TextInput
                style={styles.input}
                value={telefono}
                onChangeText={setTelefono}
                placeholder="Tu número de teléfono"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Restricciones alimentarias</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={restricciones}
                onChangeText={setRestricciones}
                placeholder="Ej: vegetariano, sin gluten, alérgico a nueces..."
                placeholderTextColor="#94a3b8"
                multiline
              />
            </View>
            <View style={styles.emailReadOnly}>
              <Text style={styles.fieldLabel}>Correo electrónico</Text>
              <Text style={styles.emailValue}>{fullPersona?.email ?? ""}</Text>
              <Text style={styles.emailHint}>
                El correo no se puede cambiar
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Foto source */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheetBox}>
            <Text style={styles.sheetTitle}>Foto de perfil</Text>
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => pickImage("camera")}
            >
              <Text style={styles.sheetOptionText}>📷 Tomar foto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => pickImage("gallery")}
            >
              <Text style={styles.sheetOptionText}>🖼️ Elegir de galería</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setShowPhotoModal(false)}
            >
              <Text style={styles.sheetCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cerrar sesión */}
      <Modal
        visible={showSignOutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Cerrar sesión</Text>
            <Text style={styles.confirmMsg}>
              ¿Estás seguro de que quieres salir?
            </Text>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: "#DC2626" }]}
              onPress={() => {
                setShowSignOutModal(false);
                signOut();
              }}
            >
              <Text style={styles.confirmBtnText}>Salir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmCancel}
              onPress={() => setShowSignOutModal(false)}
            >
              <Text style={styles.confirmCancelText}>Cancelar</Text>
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
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>⚠️ Error</Text>
            <Text style={styles.confirmMsg}>{errorMsg}</Text>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: "#1B4F72" }]}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.confirmBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 20, paddingBottom: 48 },

  // ── Unauthenticated ──
  heroSection: { paddingVertical: 32, alignItems: "flex-start" },
  heroBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 20,
  },
  heroBadgeText: { fontSize: 12, fontWeight: "600", color: "#1D4ED8" },
  heroTitle: {
    fontSize: 40,
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 46,
    marginBottom: 16,
    letterSpacing: -1,
  },
  heroSub: { fontSize: 16, color: "#475569", lineHeight: 24, marginBottom: 28 },
  heroCTA: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignSelf: "stretch",
    alignItems: "center",
    marginBottom: 14,
  },
  heroCTAText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  heroSecondary: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    alignSelf: "center",
  },
  statsStrip: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  stripItem: { flex: 1, alignItems: "center", gap: 4 },
  stripIcon: { fontSize: 22 },
  stripLabel: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  howSection: { marginBottom: 32 },
  sectionHeading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  howRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  howStepBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  howStepText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  howTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  howDesc: { fontSize: 13, color: "#64748b", lineHeight: 18 },
  testimoniosSection: { marginBottom: 32 },
  testimonioCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  testimonioEmoji: { fontSize: 28, flexShrink: 0, marginTop: 2 },
  testimonioTexto: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    marginBottom: 6,
    fontStyle: "italic",
  },
  testimonioNombre: { fontSize: 12, fontWeight: "700", color: "#94a3b8" },
  ctaFinalSection: { alignItems: "stretch", marginBottom: 32 },
  ctaFinalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 16,
    textAlign: "center",
  },

  // ── Authenticated ──
  welcomeSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 4,
  },
  welcomeSaludo: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
    marginBottom: 2,
  },
  welcomeNombre: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  welcomeAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  welcomeAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1B4F72",
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeAvatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },

  quickRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  quickCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickIcon: { fontSize: 24 },
  quickLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
  },

  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  sectionLink: { fontSize: 12, color: "#1B4F72", fontWeight: "600" },

  // Collapsible paseos
  collapseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  collapseHint: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  collapseRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  collapseIcon: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },

  emptyState: { alignItems: "center", paddingVertical: 20, gap: 4 },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  emptySub: { fontSize: 12, color: "#94a3b8", textAlign: "center" },

  paseoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    marginTop: 4,
  },
  paseoRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  paseoThumb: { width: 40, height: 40, borderRadius: 10 },
  paseoThumbPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  paseoNombre: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  paseoFecha: { fontSize: 11, color: "#94a3b8" },
  estadoBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  estadoText: { fontSize: 10, fontWeight: "700" },
  chevron: { fontSize: 18, color: "#cbd5e1" },

  statsRow: { flexDirection: "row", marginTop: 10 },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 6 },
  statBoxBorder: { borderLeftWidth: 1, borderLeftColor: "#f1f5f9" },
  statVal: { fontSize: 22, fontWeight: "800", marginBottom: 2 },
  statLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "500" },

  inviteCard: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  inviteLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  inviteEmoji: { fontSize: 28 },
  inviteTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  inviteSub: { fontSize: 12, color: "rgba(255,255,255,0.6)" },
  inviteArrow: { fontSize: 22 },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  settingIcon: { fontSize: 20 },
  settingLabel: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  settingSub: { fontSize: 12, color: "#94a3b8", marginTop: 1 },
  settingArrow: { fontSize: 20, color: "#cbd5e1" },

  faqItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQ: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
    paddingRight: 8,
  },
  faqChevron: { fontSize: 14, color: "#94a3b8", fontWeight: "600" },
  faqA: { fontSize: 13, color: "#64748b", lineHeight: 19, marginTop: 8 },

  logoutBtn: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  logoutText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  footerText: { textAlign: "center", fontSize: 11, color: "#cbd5e1" },

  // Modals
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "84%",
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 8,
  },
  confirmMsg: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  confirmBtn: {
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  confirmBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  confirmCancel: { alignItems: "center", paddingVertical: 4 },
  confirmCancelText: { color: "#64748b", fontSize: 14 },

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

  // Profile modal
  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalCancel: { fontSize: 15, color: "#64748b", width: 70 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  modalSave: {
    fontSize: 15,
    color: "#1B4F72",
    fontWeight: "700",
    width: 70,
    textAlign: "right",
  },
  modalContent: { padding: 20 },

  profilePhotoBtn: {
    alignSelf: "center",
    marginBottom: 24,
    position: "relative",
  },
  profilePhotoBtnImg: { width: 96, height: 96, borderRadius: 48 },
  profilePhotoBtnPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  profilePhotoBtnText: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  profilePhotoEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1B4F72",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  field: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1e293b",
  },

  emailReadOnly: {
    marginBottom: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
  },
  emailValue: { fontSize: 15, color: "#64748b", marginBottom: 4 },
  emailHint: { fontSize: 11, color: "#94a3b8" },
});
