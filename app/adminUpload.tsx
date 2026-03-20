import * as DocumentPicker from "expo-document-picker";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";

const ADMIN_USER_ID = "cd18f625-ad7c-4498-b0bc-c136fef70dc2";

// ─── CSV parser ──────────────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    // Handle quoted fields
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += line[i];
      }
    }
    values.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

// ─── Transform CSV row → Supabase row ────────────────────────
function transformReceta(row: Record<string, string>) {
  const bool = (v: string) => v?.toLowerCase() === "true";
  const num = (v: string) => (v ? parseInt(v) || null : null);
  const arr = (v: string) =>
    v
      ? v
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  return {
    nombre: row.nombre?.trim(),
    tipo_comida: row.tipo_comida?.trim() || "almuerzo",
    porciones_base: parseInt(row.porciones_base) || 1,
    descripcion: row.descripcion?.trim() || null,
    instrucciones: row.instrucciones?.trim() || null,
    es_vegano: bool(row.es_vegano),
    es_vegetariano: bool(row.es_vegetariano),
    es_picante: bool(row.es_picante),
    contiene_nueces: bool(row.contiene_nueces),
    sin_gluten: bool(row.sin_gluten),
    sin_lactosa: bool(row.sin_lactosa),
    categoria: row.categoria?.trim() || null,
    tiempo_preparacion: num(row.tiempo_preparacion),
    tiempo_coccion: num(row.tiempo_coccion),
    creditos: row.creditos?.trim() || null,
    palabras_clave: row.palabras_clave ? arr(row.palabras_clave) : [],
    utensilios: row.utensilios ? arr(row.utensilios) : [],
    es_publica: true,
  };
}

function transformIngrediente(row: Record<string, string>) {
  return {
    nombre: row.nombre?.trim(),
    unidad_base: row.unidad_base?.trim() || "g",
    categoria: row.categoria?.trim() || "otros",
    observaciones: row.observaciones?.trim() || null,
    recomendaciones: row.recomendaciones?.trim() || null,
  };
}

// ─── Component ───────────────────────────────────────────────
export default function AdminUploadScreen() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"recetas" | "ingredientes">("recetas");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{
    ok: number;
    errors: string[];
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setIsAdmin(user?.id === ADMIN_USER_ID);
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "text/plain", "*/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setFileName(asset.name);
      setRows([]);
      setResults(null);
      setLoading(true);
      const response = await fetch(asset.uri);
      const text = await response.text();
      const parsed = parseCSV(text);
      setRows(parsed);
      setLoading(false);
      setShowPreview(true);
    } catch (e) {
      setLoading(false);
      Alert.alert("Error", "No se pudo leer el archivo.");
    }
  };

  const handleUpload = async () => {
    if (rows.length === 0) return;
    setUploading(true);
    setResults(null);

    let ok = 0;
    const errors: string[] = [];
    const BATCH = 50;

    const transform =
      tab === "recetas" ? transformReceta : transformIngrediente;
    const table = tab === "recetas" ? "recetas" : "ingredientes";

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH).map(transform);
      // Filter invalid rows
      const valid = batch.filter((r) => r.nombre && r.nombre.length > 0);
      if (valid.length === 0) continue;

      const { error } = await supabase.from(table).insert(valid);
      if (error) {
        errors.push(`Filas ${i + 1}–${i + valid.length}: ${error.message}`);
      } else {
        ok += valid.length;
      }
    }

    setUploading(false);
    setResults({ ok, errors });
    setShowPreview(false);
  };

  if (isAdmin === null) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#1B4F72" />
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.noAccessIcon}>🔒</Text>
        <Text style={styles.noAccessTitle}>Acceso restringido</Text>
        <Text style={styles.noAccessSub}>
          Esta pantalla es solo para administradores.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>⚙️ Admin — Carga masiva</Text>
          <Text style={styles.headerSub}>
            Solo visible para administradores
          </Text>
        </View>

        {/* Tab selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "recetas" && styles.tabBtnActive]}
            onPress={() => {
              setTab("recetas");
              setRows([]);
              setResults(null);
              setFileName("");
            }}
          >
            <Text
              style={[
                styles.tabBtnText,
                tab === "recetas" && styles.tabBtnTextActive,
              ]}
            >
              🍽️ Recetas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              tab === "ingredientes" && styles.tabBtnActive,
            ]}
            onPress={() => {
              setTab("ingredientes");
              setRows([]);
              setResults(null);
              setFileName("");
            }}
          >
            <Text
              style={[
                styles.tabBtnText,
                tab === "ingredientes" && styles.tabBtnTextActive,
              ]}
            >
              🥕 Ingredientes
            </Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>
            📋 Formato esperado del CSV
          </Text>
          {tab === "recetas" ? (
            <>
              <Text style={styles.instructionsText}>
                Columnas requeridas:{" "}
                <Text style={styles.mono}>
                  nombre, tipo_comida, porciones_base
                </Text>
              </Text>
              <Text style={styles.instructionsText}>
                Columnas opcionales:{" "}
                <Text style={styles.mono}>
                  descripcion, instrucciones, es_vegano, es_vegetariano,
                  es_picante, contiene_nueces, sin_gluten, sin_lactosa,
                  categoria, tiempo_preparacion, tiempo_coccion, creditos,
                  palabras_clave, utensilios
                </Text>
              </Text>
              <Text style={styles.instructionsText}>
                • Booleanos: <Text style={styles.mono}>true</Text> o{" "}
                <Text style={styles.mono}>false</Text>
              </Text>
              <Text style={styles.instructionsText}>
                • Arrays (palabras_clave, utensilios): separados por{" "}
                <Text style={styles.mono}>;</Text>
              </Text>
              <Text style={styles.instructionsText}>
                • tipo_comida:{" "}
                <Text style={styles.mono}>
                  desayuno, almuerzo, cena, onces, snack, medias nueves
                </Text>
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.instructionsText}>
                Columnas requeridas:{" "}
                <Text style={styles.mono}>nombre, unidad_base, categoria</Text>
              </Text>
              <Text style={styles.instructionsText}>
                Columnas opcionales:{" "}
                <Text style={styles.mono}>observaciones, recomendaciones</Text>
              </Text>
              <Text style={styles.instructionsText}>
                • unidad_base:{" "}
                <Text style={styles.mono}>
                  g, kg, ml, l, unidad, manojo, taza, cdta, cda
                </Text>
              </Text>
            </>
          )}
        </View>

        {/* Upload button */}
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={pickFile}
          disabled={loading || uploading}
        >
          <Text style={styles.uploadBtnText}>
            {loading ? "Leyendo archivo..." : `📂 Seleccionar CSV de ${tab}`}
          </Text>
        </TouchableOpacity>

        {fileName ? (
          <Text style={styles.fileNameText}>
            📄 {fileName} · {rows.length} filas
          </Text>
        ) : null}

        {/* Results */}
        {results && (
          <View
            style={[
              styles.resultsCard,
              {
                borderColor: results.errors.length > 0 ? "#F59E0B" : "#16a34a",
              },
            ]}
          >
            <Text style={styles.resultsTitle}>
              {results.errors.length === 0
                ? "✅ Carga completada"
                : "⚠️ Carga con errores"}
            </Text>
            <Text style={styles.resultsOk}>
              ✓ {results.ok} {tab} insertados correctamente
            </Text>
            {results.errors.map((e, i) => (
              <Text key={i} style={styles.resultsError}>
                ✕ {e}
              </Text>
            ))}
          </View>
        )}

        {/* Preview modal */}
        <Modal
          visible={showPreview}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPreview(false)}>
                <Text style={styles.modalCancel}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                Vista previa — {rows.length} filas
              </Text>
              <TouchableOpacity onPress={handleUpload} disabled={uploading}>
                <Text
                  style={[styles.modalSave, uploading && { color: "#94a3b8" }]}
                >
                  {uploading ? "..." : "Subir"}
                </Text>
              </TouchableOpacity>
            </View>

            {uploading && (
              <View style={styles.uploadingBanner}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.uploadingText}>
                  Insertando en Supabase...
                </Text>
              </View>
            )}

            <ScrollView style={{ flex: 1 }} horizontal>
              <ScrollView>
                {/* Table header */}
                {rows.length > 0 && (
                  <View style={styles.tableHeader}>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableHeaderCell,
                        { width: 40 },
                      ]}
                    >
                      #
                    </Text>
                    {Object.keys(rows[0]).map((col) => (
                      <Text
                        key={col}
                        style={[styles.tableCell, styles.tableHeaderCell]}
                      >
                        {col}
                      </Text>
                    ))}
                  </View>
                )}
                {/* Table rows */}
                {rows.slice(0, 50).map((row, i) => (
                  <View
                    key={i}
                    style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}
                  >
                    <Text
                      style={[
                        styles.tableCell,
                        { width: 40, color: "#94a3b8" },
                      ]}
                    >
                      {i + 1}
                    </Text>
                    {Object.values(row).map((val, j) => (
                      <Text key={j} style={styles.tableCell} numberOfLines={2}>
                        {val}
                      </Text>
                    ))}
                  </View>
                ))}
                {rows.length > 50 && (
                  <Text style={styles.moreRows}>
                    ... y {rows.length - 50} filas más
                  </Text>
                )}
              </ScrollView>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Text style={styles.modalFooterText}>
                Se insertarán {rows.length} {tab} en Supabase. Las filas sin
                nombre serán ignoradas.
              </Text>
              <TouchableOpacity
                style={[
                  styles.confirmUploadBtn,
                  uploading && { backgroundColor: "#94a3b8" },
                ]}
                onPress={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmUploadBtnText}>
                    ⬆️ Confirmar e insertar {rows.length} filas
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  content: { padding: 20, paddingBottom: 48 },

  header: {
    backgroundColor: "#1B4F72",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.6)" },

  tabRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  tabBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  tabBtnActive: { borderColor: "#1B4F72", backgroundColor: "#EFF6FF" },
  tabBtnText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  tabBtnTextActive: { color: "#1B4F72" },

  instructionsCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#1B4F72",
  },
  instructionsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 12,
    color: "#475569",
    marginBottom: 6,
    lineHeight: 18,
  },
  mono: {
    fontFamily: "monospace",
    backgroundColor: "#f1f5f9",
    color: "#1B4F72",
  },

  uploadBtn: {
    backgroundColor: "#1B4F72",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  uploadBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  fileNameText: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 16,
  },

  resultsCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    marginTop: 8,
  },
  resultsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 10,
  },
  resultsOk: {
    fontSize: 13,
    color: "#16a34a",
    fontWeight: "600",
    marginBottom: 6,
  },
  resultsError: { fontSize: 12, color: "#DC2626", marginBottom: 4 },

  noAccessIcon: { fontSize: 48, marginBottom: 12 },
  noAccessTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 8,
  },
  noAccessSub: { fontSize: 14, color: "#64748b", textAlign: "center" },

  // Modal
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
  modalTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  modalSave: {
    fontSize: 15,
    color: "#1B4F72",
    fontWeight: "700",
    width: 70,
    textAlign: "right",
  },

  uploadingBanner: {
    backgroundColor: "#1B4F72",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 10,
  },
  uploadingText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1B4F72",
    paddingVertical: 8,
  },
  tableHeaderCell: { color: "#fff", fontWeight: "700" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tableRowAlt: { backgroundColor: "#f8fafc" },
  tableCell: {
    width: 140,
    paddingHorizontal: 8,
    fontSize: 11,
    color: "#1e293b",
  },
  moreRows: {
    padding: 16,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 12,
  },

  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: 12,
  },
  modalFooterText: { fontSize: 12, color: "#64748b", textAlign: "center" },
  confirmUploadBtn: {
    backgroundColor: "#1B4F72",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  confirmUploadBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
