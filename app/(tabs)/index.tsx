import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
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
import SkeletonBox from "../../src/components/SkeletonBox";
import WebModalWrapper from "../../src/components/WebModalWrapper";
import { ESTADO_CONFIG, NOTIFICACIONES_KEY, ONBOARDING_KEY } from "../../src/constants";
import { useTheme } from "../../src/hooks/useTheme";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/store/useAuthStore";
import { useLanguageStore } from "../../src/store/useLanguageStore";
import { useThemeStore } from "../../src/store/useThemeStore";
import { useTripStore } from "../../src/store/useTripStore";

const VERSION = "0.1.0";


const FAQ_KEYS = [
  { q: "home.faq.q1", a: "home.faq.a1" },
  { q: "home.faq.q2", a: "home.faq.a2" },
  { q: "home.faq.q3", a: "home.faq.a3" },
  { q: "home.faq.q4", a: "home.faq.a4" },
];


const initials = (name: string) =>
  name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "??";

const getSaludoKey = () => {
  const h = new Date().getHours();
  if (h < 12) return "home.greetings.morning";
  if (h < 18) return "home.greetings.afternoon";
  return "home.greetings.evening";
};

export default function HomeScreen() {
  const { persona, signOut, initialize } = useAuthStore();
  const { paseos, fetchPaseos } = useTripStore();
  const router = useRouter();
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Profile ──
  const [fullPersona, setFullPersona] = useState<any>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [restricciones, setRestricciones] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { t } = useTranslation();
  const { followSystem, setFollowSystem } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // ── UI ──
  const [notificaciones, setNotificaciones] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(NOTIFICACIONES_KEY).then((v) => {
      if (v !== null) setNotificaciones(v === "true");
    });
  }, []);
  const [faqExpanded, setFaqExpanded] = useState(false);
  const [paseosExpanded, setPaseosExpanded] = useState(false);
  const [configExpanded, setConfigExpanded] = useState(false);

  // ── Invite modal ──
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNombre, setInviteNombre] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  // ── Modals ──
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setShowErrorModal(true);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      showError(t("home.password.errors.tooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      showError(t("home.password.errors.mismatch"));
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      showError(error.message);
    } else {
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    }
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
      showError(t("home.profile.errors.noProfile"));
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
        showError(t("home.profile.errors.noCamera"));
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
        showError(t("home.profile.errors.noGallery"));
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
      showError(t("home.profile.errors.imageError"));
    }
    setUploadingPhoto(false);
  };

  const handleInvitarPorEmail = async () => {
    if (!inviteEmail.trim()) {
      showError(t("home.invite.errors.noEmail"));
      return;
    }
    setSendingInvite(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/invitar-app`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email: inviteEmail.trim(),
            nombre_invitado: inviteNombre.trim() || undefined,
            nombre_remitente: nombre || persona?.nombre,
          }),
        },
      );
      setInviteSent(true);
    } catch {
      showError(t("home.invite.errors.sendFailed"));
    }
    setSendingInvite(false);
  };

  const handleCompartirNativo = async () => {
    try {
      await Share.share({
        message: t("home.invite.shareMessage"),
        title: t("home.invite.shareTitle"),
      });
    } catch {
      /* cancelled */
    }
  };

  const handleVerOnboarding = async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    router.push("/onboarding" as any);
  };

  const paseosActivos = paseos.filter((p) => p.estado === "activo");
  const paseosPlanificacion = paseos.filter(
    (p) => p.estado === "planificacion",
  );
  const paseosRecientes = [...paseosActivos, ...paseosPlanificacion].slice(
    0,
    5,
  );

  if (!persona) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} pointerEvents="none">
          {/* Header skeleton */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <View style={{ gap: 6 }}>
              <SkeletonBox style={{ width: 160, height: 20, borderRadius: 8 }} />
              <SkeletonBox style={{ width: 100, height: 14, borderRadius: 6 }} />
            </View>
            <SkeletonBox style={{ width: 48, height: 48, borderRadius: 24 }} />
          </View>
          {/* Active trips skeleton */}
          <SkeletonBox style={{ width: 120, height: 14, borderRadius: 6, marginBottom: 4 }} />
          {[1, 2].map((i) => (
            <View key={i} style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <SkeletonBox style={{ width: 40, height: 40, borderRadius: 20 }} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonBox style={{ width: "60%", height: 14 }} />
                  <SkeletonBox style={{ width: "40%", height: 11 }} />
                </View>
                <SkeletonBox style={{ width: 60, height: 22, borderRadius: 11 }} />
              </View>
            </View>
          ))}
          {/* Quick access skeleton */}
          <SkeletonBox style={{ width: 100, height: 14, borderRadius: 6, marginTop: 8 }} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonBox key={i} style={{ width: 140, height: 64, borderRadius: 14 }} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── AUTHENTICATED ──
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["bottom", "left", "right"]}>
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. BIENVENIDA */}
        <View style={styles.welcomeSection}>
          <View>
            <Text style={styles.welcomeSaludo}>{t(getSaludoKey())} 👋</Text>
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

        {/* 2. ACCESOS RÁPIDOS */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/trips" as any)}
          >
            <Text style={styles.quickIcon}>🏕️</Text>
            <Text style={styles.quickLabel}>{t("home.quickAccess.trips")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/recipes" as any)}
          >
            <Text style={styles.quickIcon}>📖</Text>
            <Text style={styles.quickLabel}>{t("home.quickAccess.recipes")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/grocery" as any)}
          >
            <Text style={styles.quickIcon}>🛒</Text>
            <Text style={styles.quickLabel}>{t("home.quickAccess.grocery")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/expenses" as any)}
          >
            <Text style={styles.quickIcon}>💸</Text>
            <Text style={styles.quickLabel}>{t("home.quickAccess.expenses")}</Text>
          </TouchableOpacity>
        </View>

        {/* 2b. DIRECTORIO */}
        <TouchableOpacity
          style={styles.dirCard}
          onPress={() => router.push("/directorio" as any)}
        >
          <Text style={styles.dirCardIcon}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.dirCardLabel}>{t("home.quickAccess.directory")}</Text>
            <Text style={styles.dirCardSub}>{t("home.quickAccess.directorySub")}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* 3. PASEOS ACTIVOS */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.collapseHeader}
            onPress={() => setPaseosExpanded(!paseosExpanded)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.sectionTitle}>{t("home.activeTrips.title")}</Text>
              <Text style={styles.collapseHint}>
                {paseosRecientes.length === 0
                  ? t("home.activeTrips.empty")
                  : t("home.activeTrips.count", { count: paseosRecientes.length })}
              </Text>
            </View>
            <Text style={styles.collapseIcon}>
              {paseosExpanded ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>
          {paseosExpanded &&
            (paseosRecientes.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏕️</Text>
                <Text style={styles.emptyTitle}>{t("home.activeTrips.emptyTitle")}</Text>
                <Text style={styles.emptySub}>{t("home.activeTrips.emptySub")}</Text>
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

        {/* 4. RESUMEN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.summary.title")}</Text>
          <View style={styles.statsRow}>
            {[
              { val: paseos.length, label: t("home.summary.trips"), color: "#1B4F72" },
              { val: paseosActivos.length, label: t("home.summary.active"), color: "#065F46" },
              {
                val: paseosPlanificacion.length,
                label: t("home.summary.planning"),
                color: "#B45309",
              },
              {
                val: paseos.filter((p) => p.estado === "liquidado").length,
                label: t("home.summary.settled"),
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

        {/* 5. INVITAR AMIGOS */}
        <TouchableOpacity
          style={styles.inviteCard}
          onPress={() => {
            setInviteEmail("");
            setInviteNombre("");
            setInviteSent(false);
            setShowInviteModal(true);
          }}
        >
          <View style={styles.inviteLeft}>
            <Text style={styles.inviteEmoji}>🤝</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.inviteTitle}>{t("home.invite.title")}</Text>
              <Text style={styles.inviteSub}>{t("home.invite.sub")}</Text>
            </View>
          </View>
          <Text style={styles.inviteArrow}>📤</Text>
        </TouchableOpacity>

        {/* 6. CONFIGURACIÓN */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.collapseHeader}
            onPress={() => setConfigExpanded(!configExpanded)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.sectionTitle}>{t("home.config.title")}</Text>
              <Text style={styles.collapseHint}>{t("home.config.hint")}</Text>
            </View>
            <Text style={styles.collapseIcon}>
              {configExpanded ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>
          {configExpanded && (
            <>
              <TouchableOpacity
                style={[styles.settingRow, { marginTop: 8 }]}
                onPress={() => setShowProfileModal(true)}
              >
                <View style={styles.settingLeft}>
                  <Text style={styles.settingIcon}>⚙️</Text>
                  <View>
                    <Text style={styles.settingLabel}>{t("home.config.editProfile")}</Text>
                    <Text style={styles.settingSub}>
                      {nombre || persona?.nombre}
                    </Text>
                  </View>
                </View>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => {
                  setPasswordSuccess(false);
                  setNewPassword("");
                  setConfirmPassword("");
                  setShowPasswordModal(true);
                }}
              >
                <View style={styles.settingLeft}>
                  <Text style={styles.settingIcon}>🔒</Text>
                  <View>
                    <Text style={styles.settingLabel}>{t("home.config.changePassword")}</Text>
                    <Text style={styles.settingSub}>{t("home.config.changePasswordSub")}</Text>
                  </View>
                </View>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingIcon}>🔔</Text>
                  <View>
                    <Text style={styles.settingLabel}>{t("home.config.notifications")}</Text>
                    <Text style={styles.settingSub}>{t("home.config.notificationsSub")}</Text>
                  </View>
                </View>
                <Switch
                  value={notificaciones}
                  onValueChange={(v) => {
                    setNotificaciones(v);
                    AsyncStorage.setItem(NOTIFICACIONES_KEY, String(v));
                  }}
                  trackColor={{ false: "#e2e8f0", true: "#1B4F72" }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingIcon}>🌙</Text>
                  <View>
                    <Text style={styles.settingLabel}>{t("home.config.darkMode")}</Text>
                    <Text style={styles.settingSub}>{t("home.config.darkModeSub")}</Text>
                  </View>
                </View>
                <Switch
                  value={followSystem}
                  onValueChange={setFollowSystem}
                  trackColor={{ false: "#e2e8f0", true: "#1B4F72" }}
                  thumbColor="#fff"
                />
              </View>
              <TouchableOpacity style={styles.settingRow} onPress={() => setShowLanguageModal(true)}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingIcon}>🌍</Text>
                  <View>
                    <Text style={styles.settingLabel}>{t("home.config.language")}</Text>
                    <Text style={styles.settingSub}>{language === "es" ? t("home.languageModal.spanish") : t("home.languageModal.english")}</Text>
                  </View>
                </View>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.settingRow, { borderBottomWidth: 0 }]}
                onPress={handleVerOnboarding}
              >
                <View style={styles.settingLeft}>
                  <Text style={styles.settingIcon}>🎓</Text>
                  <View>
                    <Text style={styles.settingLabel}>{t("home.config.tutorial")}</Text>
                    <Text style={styles.settingSub}>{t("home.config.tutorialSub")}</Text>
                  </View>
                </View>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* 7. FAQ */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.collapseHeader}
            onPress={() => setFaqExpanded(!faqExpanded)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.sectionTitle}>{t("home.faq.title")}</Text>
              <Text style={styles.collapseHint}>{t("home.faq.hint")}</Text>
            </View>
            <Text style={styles.collapseIcon}>{faqExpanded ? "▲" : "▼"}</Text>
          </TouchableOpacity>
          {faqExpanded && FAQ_KEYS.map((item, i) => (
            <View
              key={i}
              style={[
                styles.faqItem,
                i === FAQ_KEYS.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <Text style={styles.faqQ}>{t(item.q)}</Text>
              <Text style={styles.faqA}>{t(item.a)}</Text>
            </View>
          ))}
        </View>

        {/* 8. CERRAR SESIÓN */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setShowSignOutModal(true)}
        >
          <Text style={styles.logoutText}>{t("home.logout")}</Text>
        </TouchableOpacity>
        <Text style={styles.footerText}>{t("home.footer", { version: VERSION })}</Text>
      </Animated.ScrollView>

      {/* ══ MODALS ══ */}

      {/* Invitar amigos */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <WebModalWrapper>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowInviteModal(false)}>
              <Text style={styles.modalCancel}>{t("common.close")}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t("home.invite.modalTitle")}</Text>
            <View style={{ width: 70 }} />
          </View>
          <ScrollView
            style={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            {inviteSent ? (
              <View style={styles.inviteSentBox}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>🎉</Text>
                <Text style={styles.inviteSentTitle}>{t("home.invite.sentTitle")}</Text>
                <Text style={styles.inviteSentSub}>
                  {t("home.invite.sentSub", { email: inviteEmail })}
                </Text>
                <TouchableOpacity
                  style={styles.inviteSentBtn}
                  onPress={() => {
                    setInviteEmail("");
                    setInviteNombre("");
                    setInviteSent(false);
                  }}
                >
                  <Text style={styles.inviteSentBtnText}>
                    {t("home.invite.inviteAnother")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Correo electrónico */}
                <View style={styles.inviteSection}>
                  <Text style={styles.inviteSectionTitle}>{t("home.invite.byEmail")}</Text>
                  <Text style={styles.inviteSectionSub}>{t("home.invite.byEmailSub")}</Text>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>{t("home.invite.nameLabel")}</Text>
                    <TextInput
                      style={styles.input}
                      value={inviteNombre}
                      onChangeText={setInviteNombre}
                      placeholder={t("home.invite.namePlaceholder")}
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="words"
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>{t("home.invite.emailLabel")}</Text>
                    <TextInput
                      style={styles.input}
                      value={inviteEmail}
                      onChangeText={setInviteEmail}
                      placeholder={t("home.invite.emailPlaceholder")}
                      placeholderTextColor="#94a3b8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.inviteEmailBtn,
                      sendingInvite && { backgroundColor: "#94a3b8" },
                    ]}
                    onPress={handleInvitarPorEmail}
                    disabled={sendingInvite}
                  >
                    {sendingInvite ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.inviteEmailBtnText}>
                        {t("home.invite.sendEmailBtn")}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={styles.inviteDivider}>
                  <View style={styles.inviteDividerLine} />
                  <Text style={styles.inviteDividerText}>o</Text>
                  <View style={styles.inviteDividerLine} />
                </View>

                {/* WhatsApp / SMS */}
                <View style={styles.inviteSection}>
                  <Text style={styles.inviteSectionTitle}>{t("home.invite.byWhatsapp")}</Text>
                  <Text style={styles.inviteSectionSub}>{t("home.invite.byWhatsappSub")}</Text>
                  <TouchableOpacity
                    style={styles.inviteShareBtn}
                    onPress={handleCompartirNativo}
                  >
                    <Text style={styles.inviteShareBtnText}>{t("home.invite.shareBtn")}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
        </WebModalWrapper>
      </Modal>

      {/* Perfil */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <WebModalWrapper>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProfileModal(false)}>
              <Text style={styles.modalCancel}>{t("common.cancel")}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t("home.profile.title")}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={styles.modalSave}>{saving ? "..." : t("common.save")}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
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
                  <Text style={styles.profilePhotoBtnText}>{t("home.profile.photo")}</Text>
                </View>
              )}
              <View style={styles.profilePhotoEditBadge}>
                <Text style={{ fontSize: 12 }}>📷</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t("home.profile.nameLabel")}</Text>
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder={t("home.profile.namePlaceholder")}
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t("home.profile.phoneLabel")}</Text>
              <TextInput
                style={styles.input}
                value={telefono}
                onChangeText={setTelefono}
                placeholder={t("home.profile.phonePlaceholder")}
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t("home.profile.restrictionsLabel")}</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={restricciones}
                onChangeText={setRestricciones}
                placeholder={t("home.profile.restrictionsPlaceholder")}
                placeholderTextColor="#94a3b8"
                multiline
              />
            </View>
            <View style={styles.emailReadOnly}>
              <Text style={styles.fieldLabel}>{t("home.profile.emailLabel")}</Text>
              <Text style={styles.emailValue}>{fullPersona?.email ?? ""}</Text>
              <Text style={styles.emailHint}>{t("home.profile.emailReadOnly")}</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
        </WebModalWrapper>
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
            <Text style={styles.sheetTitle}>{t("home.profile.photoTitle")}</Text>
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => pickImage("camera")}
            >
              <Text style={styles.sheetOptionText}>{t("home.profile.takePhoto")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => pickImage("gallery")}
            >
              <Text style={styles.sheetOptionText}>{t("home.profile.chooseGallery")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setShowPhotoModal(false)}
            >
              <Text style={styles.sheetCancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cambiar contraseña */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <WebModalWrapper>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
              <Text style={styles.modalCancel}>{t("common.cancel")}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t("home.password.title")}</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView
            style={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            {passwordSuccess ? (
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <Text style={{ fontSize: 56, marginBottom: 16 }}>✅</Text>
                <Text style={styles.modalTitle}>{t("home.password.successTitle")}</Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#64748b",
                    textAlign: "center",
                    marginTop: 8,
                    lineHeight: 20,
                  }}
                >
                  {t("home.password.successSub")}
                </Text>
                <TouchableOpacity
                  style={[styles.saveBtn, { marginTop: 32, width: "100%" }]}
                  onPress={() => setShowPasswordModal(false)}
                >
                  <Text style={styles.saveBtnText}>{t("common.done")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t("home.password.newLabel")}</Text>
                  <View style={styles.pwWrapper}>
                    <TextInput
                      style={styles.pwInput}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder={t("home.password.newPlaceholder")}
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showNewPw}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.pwEyeBtn}
                      onPress={() => setShowNewPw((v) => !v)}
                    >
                      <Text>{showNewPw ? "🙈" : "👁️"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t("home.password.confirmLabel")}</Text>
                  <View style={styles.pwWrapper}>
                    <TextInput
                      style={styles.pwInput}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder={t("home.password.confirmPlaceholder")}
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showConfirmPw}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.pwEyeBtn}
                      onPress={() => setShowConfirmPw((v) => !v)}
                    >
                      <Text>{showConfirmPw ? "🙈" : "👁️"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    { marginTop: 8 },
                    savingPassword && { opacity: 0.6 },
                  ]}
                  onPress={handleChangePassword}
                  disabled={savingPassword}
                >
                  <Text style={styles.saveBtnText}>
                    {savingPassword ? t("common.saving") : t("home.password.saveBtn")}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
        </WebModalWrapper>
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
            <Text style={styles.confirmTitle}>{t("home.signout.title")}</Text>
            <Text style={styles.confirmMsg}>{t("home.signout.message")}</Text>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: "#DC2626" }]}
              onPress={() => {
                setShowSignOutModal(false);
                signOut();
              }}
            >
              <Text style={styles.confirmBtnText}>{t("home.signout.confirm")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmCancel}
              onPress={() => setShowSignOutModal(false)}
            >
              <Text style={styles.confirmCancelText}>{t("home.signout.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Idioma / Language */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>🌍 {t("home.languageModal.title")}</Text>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: language === "es" ? "#1B4F72" : "#e2e8f0" }]}
              onPress={() => { setLanguage("es"); setShowLanguageModal(false); }}
            >
              <Text style={[styles.confirmBtnText, { color: language === "es" ? "#fff" : "#1B4F72" }]}>🇨🇴 {t("home.languageModal.spanish")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: language === "en" ? "#1B4F72" : "#e2e8f0", marginTop: 8 }]}
              onPress={() => { setLanguage("en"); setShowLanguageModal(false); }}
            >
              <Text style={[styles.confirmBtnText, { color: language === "en" ? "#fff" : "#1B4F72" }]}>🇺🇸 {t("home.languageModal.english")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmCancel}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={styles.confirmCancelText}>{t("common.cancel")}</Text>
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
            <Text style={styles.confirmTitle}>⚠️ {t("common.error")}</Text>
            <Text style={styles.confirmMsg}>{errorMsg}</Text>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: "#1B4F72" }]}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.confirmBtnText}>{t("common.ok")}</Text>
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

  dirCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dirCardIcon: { fontSize: 22 },
  dirCardLabel: { fontSize: 13, fontWeight: "700", color: "#1e293b" },
  dirCardSub: { fontSize: 11, color: "#94a3b8", marginTop: 2 },

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

  collapseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  collapseHint: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
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
    backgroundColor: "#1B4F72",
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
    maxWidth: 440,
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
    maxWidth: 440,
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

  // Invite modal
  inviteSection: { marginBottom: 8 },
  inviteSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  inviteSectionSub: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 16,
    lineHeight: 18,
  },
  inviteEmailBtn: {
    backgroundColor: "#1B4F72",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  inviteEmailBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  inviteShareBtn: {
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  inviteShareBtnText: { color: "#1e293b", fontSize: 15, fontWeight: "700" },
  inviteDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  inviteDividerLine: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  inviteDividerText: { fontSize: 13, color: "#94a3b8", fontWeight: "600" },
  inviteSentBox: { alignItems: "center", paddingVertical: 40 },
  inviteSentTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 12,
  },
  inviteSentSub: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  inviteSentBtn: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  inviteSentBtnText: { color: "#1B4F72", fontWeight: "700", fontSize: 15 },

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

  saveBtn: {
    backgroundColor: "#1B4F72",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  pwWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  pwInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1e293b",
  },
  pwEyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
});
