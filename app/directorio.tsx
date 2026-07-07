import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WebModalWrapper from "../src/components/WebModalWrapper";
import { useTheme } from "../src/hooks/useTheme";
import { supabase } from "../src/lib/supabase";

const initials = (name: string) =>
  name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "??";

const AVATAR_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#14B8A6",
];

const avatarColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

export default function DirectorioScreen() {
  const router = useRouter();
  const { new: openNewParam } = useLocalSearchParams<{ new?: string }>();
  const theme = useTheme();
  const { t } = useTranslation();

  const [contactos, setContactos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editFamilia, setEditFamilia] = useState("");
  const [saving, setSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [optionsTarget, setOptionsTarget] = useState<any>(null);

  useEffect(() => {
    loadContactos();
  }, []);

  useEffect(() => {
    if (openNewParam === "1") {
      openNew();
      router.setParams({ new: undefined });
    }
  }, [openNewParam]);

  const loadContactos = async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("directorio")
      .select("*")
      .eq("owner_id", session.user.id)
      .order("nombre");
    setContactos(data ?? []);
    setLoading(false);
  };

  const openNew = () => {
    setEditTarget(null);
    setEditNombre("");
    setEditEmail("");
    setEditFamilia("");
    setShowEditModal(true);
  };

  const openEdit = (contacto: any) => {
    setShowOptionsModal(false);
    setEditTarget(contacto);
    setEditNombre(contacto.nombre ?? "");
    setEditEmail(contacto.email ?? "");
    setEditFamilia(contacto.familia_nombre ?? "");
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!editNombre.trim()) return;
    setSaving(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    if (editTarget?.id) {
      await supabase
        .from("directorio")
        .update({
          nombre: editNombre.trim(),
          email: editEmail.trim() || null,
          familia_nombre: editFamilia.trim() || null,
        })
        .eq("id", editTarget.id);
    } else {
      await supabase.from("directorio").insert({
        owner_id: session.user.id,
        nombre: editNombre.trim(),
        email: editEmail.trim() || null,
        familia_nombre: editFamilia.trim() || null,
      });
    }
    setSaving(false);
    setShowEditModal(false);
    await loadContactos();
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    await supabase.from("directorio").delete().eq("id", deleteTarget.id);
    setShowDeleteModal(false);
    setDeleteTarget(null);
    await loadContactos();
  };

  const filtered = contactos.filter((c) =>
    c.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.familia_nombre?.toLowerCase().includes(search.toLowerCase())
  );

  // Group alphabetically
  const grouped: Record<string, any[]> = {};
  filtered.forEach((c) => {
    const letter = (c.nombre?.[0] ?? "#").toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(c);
  });
  const letters = Object.keys(grouped).sort();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>{t("common.back")}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("directorio.title")}</Text>
        <TouchableOpacity onPress={openNew}>
          <Text style={styles.addBtn}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: theme.surface }]}>
        <TextInput
          style={[styles.searchInput, { color: theme.text, borderColor: theme.border }]}
          value={search}
          onChangeText={setSearch}
          placeholder={t("directorio.searchPlaceholder")}
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1B4F72" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>{t("directorio.empty")}</Text>
          <Text style={styles.emptySub}>{t("directorio.emptySub")}</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={openNew}>
            <Text style={styles.emptyBtnText}>{t("directorio.newContact")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {letters.map((letter) => (
            <View key={letter}>
              <Text style={styles.letterHeader}>{letter}</Text>
              {grouped[letter].map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.row, { backgroundColor: theme.surface }]}
                  onPress={() => {
                    setOptionsTarget(c);
                    setShowOptionsModal(true);
                  }}
                >
                  <View style={[styles.avatar, { backgroundColor: avatarColor(c.nombre) }]}>
                    <Text style={styles.avatarText}>{initials(c.nombre)}</Text>
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowName, { color: theme.text }]}>{c.nombre}</Text>
                    {(c.email || c.familia_nombre) && (
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {[c.email, c.familia_nombre].filter(Boolean).join(" · ")}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.rowChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Options modal */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.optionsBox}>
            <Text style={styles.optionsName}>{optionsTarget?.nombre}</Text>
            <TouchableOpacity
              style={styles.optionBtn}
              onPress={() => openEdit(optionsTarget)}
            >
              <Text style={styles.optionBtnText}>{t("tripDetail.gastos.dirOptionsEditar")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionBtn, styles.optionBtnDanger]}
              onPress={() => {
                setShowOptionsModal(false);
                setDeleteTarget(optionsTarget);
                setShowDeleteModal(true);
              }}
            >
              <Text style={[styles.optionBtnText, { color: "#DC2626" }]}>
                {t("tripDetail.gastos.dirOptionsEliminar")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionCancel}
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={styles.optionCancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.optionsBox}>
            <Text style={styles.optionsName}>{t("tripDetail.gastos.dirDeleteTitle")}</Text>
            <Text style={styles.deleteMsg}>
              {t("tripDetail.gastos.dirDeleteMessage", { name: deleteTarget?.nombre })}
            </Text>
            <TouchableOpacity
              style={[styles.optionBtn, { backgroundColor: "#DC2626" }]}
              onPress={handleDelete}
            >
              <Text style={[styles.optionBtnText, { color: "#fff" }]}>{t("common.delete")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionCancel}
              onPress={() => setShowDeleteModal(false)}
            >
              <Text style={styles.optionCancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit / New modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <WebModalWrapper>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancel}>{t("common.cancel")}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editTarget?.id ? t("directorio.editTitle") : t("directorio.newTitle")}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSave, saving && { opacity: 0.4 }]}>
                {saving ? "..." : t("common.save")}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t("directorio.nombreLabel")}</Text>
              <TextInput
                style={styles.input}
                value={editNombre}
                onChangeText={setEditNombre}
                placeholder={t("directorio.nombrePlaceholder")}
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
                autoFocus
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t("directorio.emailLabel")}</Text>
              <TextInput
                style={styles.input}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder={t("directorio.emailPlaceholder")}
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t("directorio.familiaLabel")}</Text>
              <TextInput
                style={styles.input}
                value={editFamilia}
                onChangeText={setEditFamilia}
                placeholder={t("directorio.familiaPlaceholder")}
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
        </WebModalWrapper>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  backText: { fontSize: 15, color: "#fff", fontWeight: "600", minWidth: 40 },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#fff" },
  addBtn: { fontSize: 26, color: "#fff", fontWeight: "300", minWidth: 40, textAlign: "right" },

  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  searchInput: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },

  list: { paddingBottom: 32 },
  letterHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: "600" },
  rowSub: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  rowChevron: { fontSize: 20, color: "#cbd5e1" },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#1e293b", textAlign: "center" },
  emptySub: { fontSize: 13, color: "#94a3b8", textAlign: "center", lineHeight: 18 },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: "#1B4F72",
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  optionsBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "84%",
    maxWidth: 440,
  },
  optionsName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 16,
  },
  deleteMsg: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  optionBtn: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  optionBtnDanger: { backgroundColor: "#FEF2F2" },
  optionBtnText: { fontSize: 15, fontWeight: "700", color: "#1B4F72" },
  optionCancel: { alignItems: "center", paddingTop: 8 },
  optionCancelText: { fontSize: 14, color: "#64748b" },

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
  modalSave: { fontSize: 15, color: "#1B4F72", fontWeight: "700", width: 70, textAlign: "right" },
  modalContent: { padding: 20 },

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
});
