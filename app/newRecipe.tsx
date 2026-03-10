import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";

const TIPOS_COMIDA = [
  "desayuno",
  "medias nueves",
  "almuerzo",
  "onces",
  "cena",
  "snack",
];

const CATEGORIAS = [
  "Plato fuerte",
  "Entrada",
  "Aperitivo",
  "Sopa",
  "Ensalada",
  "Postre",
  "Cóctel",
  "Bebida con alcohol",
  "Bebida sin alcohol",
  "Salsa / Aderezo",
  "Picadas",
  "Agua",
];

const TAGS = [
  { key: "es_vegano", label: "🌱 Vegano" },
  { key: "es_vegetariano", label: "🥦 Vegetariano" },
  { key: "es_picante", label: "🌶️ Picante" },
  { key: "contiene_nueces", label: "🥜 Nueces" },
  { key: "sin_gluten", label: "🌾 Sin gluten" },
  { key: "sin_lactosa", label: "🥛 Sin lactosa" },
];

interface IngredienteRow {
  ingrediente_id: string;
  nombre: string;
  cantidad: string;
  unidad: string;
}

export default function NewRecipeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [porciones, setPorciones] = useState("4");
  const [tipoComida, setTipoComida] = useState("almuerzo");
  const [categoria, setCategoria] = useState("Plato fuerte");
  const [instrucciones, setInstrucciones] = useState("");
  const [esPublica, setEsPublica] = useState(true);
  const [tags, setTags] = useState<Record<string, boolean>>({
    es_vegano: false,
    es_vegetariano: false,
    es_picante: false,
    contiene_nueces: false,
    sin_gluten: false,
    sin_lactosa: false,
  });
  const [ingredientes, setIngredientes] = useState<IngredienteRow[]>([]);
  const [catalogoIngredientes, setCatalogoIngredientes] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [showCatalogo, setShowCatalogo] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCatalogo();
    if (isEditing) loadReceta();
  }, [id]);

  const loadCatalogo = async () => {
    const { data } = await supabase
      .from("ingredientes")
      .select("*")
      .order("nombre");
    setCatalogoIngredientes(data ?? []);
  };

  const loadReceta = async () => {
    setLoading(true);

    const { data: receta } = await supabase
      .from("recetas")
      .select("*")
      .eq("id", id)
      .single();

    if (receta) {
      setNombre(receta.nombre ?? "");
      setDescripcion(receta.descripcion ?? "");
      setPorciones(String(receta.porciones_base ?? 4));
      setTipoComida(receta.tipo_comida ?? "almuerzo");
      setCategoria(receta.categoria ?? "Plato fuerte");
      setInstrucciones(receta.instrucciones ?? "");
      setEsPublica(receta.es_publica ?? true);
      setTags({
        es_vegano: receta.es_vegano ?? false,
        es_vegetariano: receta.es_vegetariano ?? false,
        es_picante: receta.es_picante ?? false,
        contiene_nueces: receta.contiene_nueces ?? false,
        sin_gluten: receta.sin_gluten ?? false,
        sin_lactosa: receta.sin_lactosa ?? false,
      });
    }

    const { data: ingData } = await supabase
      .from("receta_ingredientes")
      .select("*, ingredientes(nombre, unidad_base)")
      .eq("receta_id", id);

    if (ingData) {
      setIngredientes(
        ingData.map((i: any) => ({
          ingrediente_id: i.ingrediente_id,
          nombre: i.ingredientes?.nombre ?? "",
          cantidad: String(
            Math.round(
              i.cantidad_por_porcion * (receta?.porciones_base ?? 4) * 100,
            ) / 100,
          ),
          unidad: i.ingredientes?.unidad_base ?? "",
        })),
      );
    }

    setLoading(false);
  };

  const filteredCatalogo = catalogoIngredientes.filter(
    (i) =>
      i.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
      !ingredientes.find((ing) => ing.ingrediente_id === i.id),
  );

  const handleAddIngrediente = (ing: any) => {
    setIngredientes((prev) => [
      ...prev,
      {
        ingrediente_id: ing.id,
        nombre: ing.nombre,
        cantidad: "",
        unidad: ing.unidad_base,
      },
    ]);
    setBusqueda("");
    setShowCatalogo(false);
  };

  const handleRemoveIngrediente = (id: string) => {
    setIngredientes((prev) => prev.filter((i) => i.ingrediente_id !== id));
  };

  const handleCantidadChange = (id: string, cantidad: string) => {
    setIngredientes((prev) =>
      prev.map((i) => (i.ingrediente_id === id ? { ...i, cantidad } : i)),
    );
  };

  const handleSave = async () => {
    if (!nombre.trim()) {
      Alert.alert("Error", "El nombre es obligatorio.");
      return;
    }
    if (ingredientes.some((i) => !i.cantidad)) {
      Alert.alert("Error", "Completa la cantidad de todos los ingredientes.");
      return;
    }

    setSaving(true);

    const recetaPayload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      porciones_base: parseInt(porciones) || 4,
      tipo_comida: tipoComida,
      categoria,
      instrucciones: instrucciones.trim(),
      es_publica: esPublica,
      ...tags,
    };

    let recetaId = id;

    if (isEditing) {
      const { error } = await supabase
        .from("recetas")
        .update(recetaPayload)
        .eq("id", id);
      if (error) {
        Alert.alert("Error", error.message);
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("recetas")
        .insert(recetaPayload)
        .select()
        .single();
      if (error) {
        Alert.alert("Error", error.message);
        setSaving(false);
        return;
      }
      recetaId = data.id;
    }

    // Delete existing ingredients if editing, then re-insert
    if (isEditing) {
      await supabase
        .from("receta_ingredientes")
        .delete()
        .eq("receta_id", recetaId);
    }

    if (ingredientes.length > 0) {
      const rows = ingredientes.map((i) => ({
        receta_id: recetaId,
        ingrediente_id: i.ingrediente_id,
        cantidad_por_porcion:
          parseFloat(i.cantidad) / (parseInt(porciones) || 4),
      }));
      const { error } = await supabase.from("receta_ingredientes").insert(rows);
      if (error) {
        Alert.alert("Error guardando ingredientes", error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    Alert.alert(
      isEditing ? "✓ Receta actualizada" : "✓ Receta creada",
      `"${nombre}" fue ${isEditing ? "actualizada" : "agregada"} al catálogo.`,
      [{ text: "OK", onPress: () => router.back() }],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Eliminar receta",
      `¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`,
      [
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await supabase.from("recetas").delete().eq("id", id);
            router.back();
            router.back();
          },
        },
        { text: "Cancelar", style: "cancel" },
      ],
    );
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>
              {isEditing ? "✏️ Editar receta" : "Nueva receta"}
            </Text>
            {isEditing && (
              <TouchableOpacity onPress={handleDelete}>
                <Text style={styles.deleteText}>🗑️ Eliminar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Información básica</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej: Arroz con pollo"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Descripción</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Breve descripción..."
                placeholderTextColor="#94a3b8"
                multiline
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Porciones base</Text>
              <View style={styles.scalerRow}>
                <TouchableOpacity
                  style={styles.scalerBtn}
                  onPress={() =>
                    setPorciones((p) => String(Math.max(1, parseInt(p) - 1)))
                  }
                >
                  <Text style={styles.scalerBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.scalerNumber}>{porciones}</Text>
                <TouchableOpacity
                  style={styles.scalerBtn}
                  onPress={() => setPorciones((p) => String(parseInt(p) + 1))}
                >
                  <Text style={styles.scalerBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.field}>
              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Receta pública</Text>
                <Switch
                  value={esPublica}
                  onValueChange={setEsPublica}
                  trackColor={{ false: "#e2e8f0", true: "#1B4F72" }}
                  thumbColor="#fff"
                />
              </View>
              <Text style={styles.fieldHint}>
                Las recetas públicas son visibles para todos los usuarios
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🍽️ Clasificación</Text>
            <Text style={styles.fieldLabel}>Momento del día</Text>
            <View style={styles.chipRow}>
              {TIPOS_COMIDA.map((tipo) => (
                <TouchableOpacity
                  key={tipo}
                  style={[
                    styles.chip,
                    tipoComida === tipo && styles.chipActive,
                  ]}
                  onPress={() => setTipoComida(tipo)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      tipoComida === tipo && styles.chipTextActive,
                    ]}
                  >
                    {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
              Categoría
            </Text>
            <View style={styles.chipRow}>
              {CATEGORIAS.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, categoria === cat && styles.chipActive]}
                  onPress={() => setCategoria(cat)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      categoria === cat && styles.chipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏷️ Etiquetas dietéticas</Text>
            <View style={styles.tagsGrid}>
              {TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag.key}
                  style={[
                    styles.tagChip,
                    tags[tag.key] && styles.tagChipActive,
                  ]}
                  onPress={() =>
                    setTags((prev) => ({ ...prev, [tag.key]: !prev[tag.key] }))
                  }
                >
                  <Text
                    style={[
                      styles.tagChipText,
                      tags[tag.key] && styles.tagChipTextActive,
                    ]}
                  >
                    {tag.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛒 Ingredientes</Text>
            <TextInput
              style={styles.input}
              value={busqueda}
              onChangeText={(t) => {
                setBusqueda(t);
                setShowCatalogo(true);
              }}
              onFocus={() => setShowCatalogo(true)}
              placeholder="Buscar ingrediente..."
              placeholderTextColor="#94a3b8"
            />
            {showCatalogo &&
              busqueda.length > 0 &&
              filteredCatalogo.length > 0 && (
                <View style={styles.dropdown}>
                  {filteredCatalogo.slice(0, 6).map((ing) => (
                    <TouchableOpacity
                      key={ing.id}
                      style={styles.dropdownItem}
                      onPress={() => handleAddIngrediente(ing)}
                    >
                      <Text style={styles.dropdownText}>{ing.nombre}</Text>
                      <Text style={styles.dropdownUnit}>{ing.unidad_base}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            {ingredientes.map((ing) => (
              <View key={ing.ingrediente_id} style={styles.ingredienteRow}>
                <Text style={styles.ingredienteNombre} numberOfLines={1}>
                  {ing.nombre}
                </Text>
                <TextInput
                  style={styles.cantidadInput}
                  value={ing.cantidad}
                  onChangeText={(v) =>
                    handleCantidadChange(ing.ingrediente_id, v)
                  }
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                />
                <Text style={styles.ingredienteUnidad}>{ing.unidad}</Text>
                <TouchableOpacity
                  onPress={() => handleRemoveIngrediente(ing.ingrediente_id)}
                >
                  <Text style={styles.removeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {ingredientes.length === 0 && (
              <Text style={styles.emptyHint}>
                Busca y agrega ingredientes arriba
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Preparación</Text>
            <Text style={styles.fieldHint}>
              Escribe cada paso en una línea separada
            </Text>
            <TextInput
              style={[styles.input, { height: 160, marginTop: 8 }]}
              value={instrucciones}
              onChangeText={setInstrucciones}
              placeholder={
                "Paso 1: Picar las cebollas\nPaso 2: Sofreír en aceite"
              }
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditing ? "✓ Guardar cambios" : "✓ Guardar receta"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
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
    paddingBottom: 20,
  },
  backText: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginBottom: 8 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  deleteText: { color: "#fca5a5", fontSize: 14, fontWeight: "600" },
  content: { padding: 16, paddingBottom: 100 },
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
  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  fieldHint: { fontSize: 11, color: "#94a3b8", marginTop: 4 },
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
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scalerRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  scalerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1B4F72",
    alignItems: "center",
    justifyContent: "center",
  },
  scalerBtnText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "300",
    lineHeight: 26,
  },
  scalerNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1B4F72",
    minWidth: 40,
    textAlign: "center",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  chipActive: { borderColor: "#1B4F72", backgroundColor: "#EFF6FF" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  chipTextActive: { color: "#1B4F72" },
  tagsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  tagChipActive: { borderColor: "#1B4F72", backgroundColor: "#1B4F72" },
  tagChipText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  tagChipTextActive: { color: "#fff" },
  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    marginTop: 4,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dropdownText: { fontSize: 14, color: "#1e293b", fontWeight: "500" },
  dropdownUnit: { fontSize: 12, color: "#94a3b8" },
  ingredienteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  ingredienteNombre: {
    flex: 1,
    fontSize: 13,
    color: "#1e293b",
    fontWeight: "500",
  },
  cantidadInput: {
    width: 60,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: "#1e293b",
    textAlign: "center",
  },
  ingredienteUnidad: { fontSize: 12, color: "#64748b", width: 40 },
  removeBtn: { fontSize: 16, color: "#ef4444", paddingHorizontal: 4 },
  emptyHint: {
    fontSize: 13,
    color: "#94a3b8",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  saveButton: {
    backgroundColor: "#1B4F72",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  saveButtonDisabled: { backgroundColor: "#94a3b8" },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
