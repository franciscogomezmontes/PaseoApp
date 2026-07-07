import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WebModalWrapper from "../src/components/WebModalWrapper";
import { CATEGORIAS_ING, UNIDADES } from "../src/ingredientConstants";
import { useTheme } from "../src/hooks/useTheme";
import { supabase } from "../src/lib/supabase";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
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
  { key: "es_vegano", tKey: "recipes.tags.vegan" },
  { key: "es_vegetariano", tKey: "recipes.tags.vegetarian" },
  { key: "es_picante", tKey: "recipes.tags.spicy" },
  { key: "contiene_nueces", tKey: "recipes.tags.nuts" },
  { key: "sin_gluten", tKey: "recipes.tags.glutenFree" },
  { key: "sin_lactosa", tKey: "recipes.tags.lactoseFree" },
];

const UTENSILIOS_PREDEFINIDOS = [
  "Horno",
  "Big Green Egg",
  "Parrilla",
  "Estufa",
  "Sartén",
  "Olla",
  "Olla a presión",
  "Olla arrocera",
  "Licuadora",
  "Batidora",
  "Procesador de alimentos",
  "Mixer de mano",
  "Rodillo",
  "Moldes para horno",
  "Refractaria",
  "Tabla de cortar",
  "Cuchillo de chef",
  "Pelador",
  "Rallador",
  "Colador / Cernidor",
  "Manga pastelera",
];

interface IngredienteRow {
  ingrediente_id: string;
  nombre: string;
  cantidad: string;
  unidad: string;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function NewRecipeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const savingRef = useRef(0);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Basic info
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [porciones, setPorciones] = useState("4");
  const [tipoComida, setTipoComida] = useState("almuerzo");
  const [categoria, setCategoria] = useState("Plato fuerte");
  const [instrucciones, setInstrucciones] = useState("");
  const [esPublica, setEsPublica] = useState(true);

  // New fields
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [tiempoPrep, setTiempoPrep] = useState("");
  const [tiempoCoccion, setTiempoCoccion] = useState("");
  const [creditos, setCreditos] = useState("");
  const [utensilios, setUtensilios] = useState<string[]>([]);
  const [palabrasClave, setPalabrasClave] = useState<string[]>([]);
  const [nuevaPalabra, setNuevaPalabra] = useState("");
  const [uploadingFoto, setUploadingFoto] = useState(false);

  // Tags
  const [tags, setTags] = useState<Record<string, boolean>>({
    es_vegano: false,
    es_vegetariano: false,
    es_picante: false,
    contiene_nueces: false,
    sin_gluten: false,
    sin_lactosa: false,
  });

  // Ingredientes
  const [ingredientes, setIngredientes] = useState<IngredienteRow[]>([]);
  const [catalogoIngredientes, setCatalogoIngredientes] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [showCatalogo, setShowCatalogo] = useState(false);

  // Modals
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateIngModal, setShowCreateIngModal] = useState(false);
  const [newIngNombre, setNewIngNombre] = useState("");
  const [newIngUnidad, setNewIngUnidad] = useState("g");
  const [newIngCategoria, setNewIngCategoria] = useState("Otros");
  const [newIngRecomendaciones, setNewIngRecomendaciones] = useState("");

  const { t } = useTranslation();

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setShowErrorModal(true);
  };

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
      .eq("id", id!)
      .single();
    if (receta) {
      setNombre(receta.nombre ?? "");
      setDescripcion(receta.descripcion ?? "");
      setPorciones(String(receta.porciones_base ?? 4));
      setTipoComida(receta.tipo_comida ?? "almuerzo");
      setCategoria(receta.categoria ?? "Plato fuerte");
      setInstrucciones(receta.instrucciones ?? "");
      setEsPublica(receta.es_publica ?? true);
      setFotoUrl(receta.foto_url ?? null);
      setTiempoPrep(
        receta.tiempo_preparacion ? String(receta.tiempo_preparacion) : "",
      );
      setTiempoCoccion(
        receta.tiempo_coccion ? String(receta.tiempo_coccion) : "",
      );
      setCreditos(receta.creditos ?? "");
      setUtensilios(receta.utensilios ?? []);
      setPalabrasClave(receta.palabras_clave ?? []);
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
      .eq("receta_id", id!);
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

  // ─── Photo upload ───
  const handlePickFoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setUploadingFoto(true);
    try {
      const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
      const fileName = `receta_${Date.now()}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("recetas")
        .upload(fileName, arrayBuffer, {
          contentType: `image/${ext}`,
          upsert: true,
        });
      if (uploadError) {
        showError(uploadError.message);
        return;
      }
      const { data: urlData } = supabase.storage
        .from("recetas")
        .getPublicUrl(fileName);
      setFotoUrl(urlData.publicUrl);
    } catch (e: any) {
      showError(e.message ?? "Error subiendo foto");
    } finally {
      setUploadingFoto(false);
    }
  };

  // ─── Utensilios ───
  const toggleUtensilio = (u: string) =>
    setUtensilios((prev) =>
      prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u],
    );

  // ─── Palabras clave ───
  const agregarPalabra = () => {
    const trimmed = nuevaPalabra.trim().toLowerCase();
    if (!trimmed || palabrasClave.includes(trimmed)) {
      setNuevaPalabra("");
      return;
    }
    setPalabrasClave((prev) => [...prev, trimmed]);
    setNuevaPalabra("");
  };
  const quitarPalabra = (p: string) =>
    setPalabrasClave((prev) => prev.filter((x) => x !== p));

  // ─── Ingredientes ───
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

  const openCreateIng = () => {
    setNewIngNombre(busqueda);
    setNewIngUnidad("g");
    setNewIngCategoria("Otros");
    setNewIngRecomendaciones("");
    setShowCreateIngModal(true);
  };

  const handleCreateIngrediente = async () => {
    if (!newIngNombre.trim()) return;
    const { data: existing } = await supabase
      .from("ingredientes")
      .select("*")
      .ilike("nombre", newIngNombre.trim())
      .maybeSingle();
    const ing =
      existing ??
      (await (async () => {
        const { data, error } = await supabase
          .from("ingredientes")
          .insert({
            nombre: newIngNombre.trim(),
            unidad_base: newIngUnidad,
            categoria: newIngCategoria,
            recomendaciones: newIngRecomendaciones.trim() || null,
          })
          .select()
          .single();
        if (error) {
          showError(error.message);
          return null;
        }
        return data;
      })());
    if (!ing) return;
    setShowCreateIngModal(false);
    await loadCatalogo();
    handleAddIngrediente(ing);
  };

  const handleRemoveIngrediente = (ingId: string) =>
    setIngredientes((prev) => prev.filter((i) => i.ingrediente_id !== ingId));
  const handleCantidadChange = (ingId: string, cantidad: string) =>
    setIngredientes((prev) =>
      prev.map((i) => (i.ingrediente_id === ingId ? { ...i, cantidad } : i)),
    );

  // ─── Save ───
  const saveIngredientes = async (recetaId: string) => {
    const seen = new Set<string>();
    const deduped = ingredientes.filter((ing) => {
      if (seen.has(ing.ingrediente_id)) return false;
      seen.add(ing.ingrediente_id);
      return true;
    });
    const rows = deduped.map((i) => ({
      receta_id: recetaId,
      ingrediente_id: i.ingrediente_id,
      cantidad_por_porcion: parseFloat(i.cantidad) / (parseInt(porciones) || 4),
    }));
    await supabase
      .from("receta_ingredientes")
      .delete()
      .eq("receta_id", recetaId);
    if (rows.length === 0) return true;
    const { error } = await supabase
      .from("receta_ingredientes")
      .upsert(rows, { onConflict: "receta_id,ingrediente_id" });
    if (error) {
      showError(t("newRecipe.errors.saveIngredients", { msg: error.message }));
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    const now = Date.now();
    if (now - savingRef.current < 2000) return;
    savingRef.current = now;
    if (!nombre.trim()) {
      showError(t("newRecipe.errors.nameRequired"));
      return;
    }
    if (ingredientes.some((i) => !i.cantidad)) {
      showError(t("newRecipe.errors.completeAmounts"));
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
      foto_url: fotoUrl,
      tiempo_preparacion: tiempoPrep ? parseInt(tiempoPrep) : null,
      tiempo_coccion: tiempoCoccion ? parseInt(tiempoCoccion) : null,
      creditos: creditos.trim() || null,
      utensilios: utensilios.length > 0 ? utensilios : null,
      palabras_clave: palabrasClave.length > 0 ? palabrasClave : null,
      ...tags,
    };

    let recetaId = id;
    if (isEditing) {
      const { error } = await supabase
        .from("recetas")
        .update(recetaPayload)
        .eq("id", id);
      if (error) {
        showError(error.message);
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
        showError(error.message);
        setSaving(false);
        return;
      }
      recetaId = data.id;
    }

    const ok = await saveIngredientes(recetaId!);
    if (!ok) {
      setSaving(false);
      return;
    }
    setSaving(false);
    setSuccessMsg(
      isEditing
        ? t("newRecipe.successMsgUpdated", { name: nombre })
        : t("newRecipe.successMsgCreated", { name: nombre }),
    );
    setShowSuccessModal(true);
  };

  const handleDelete = async () => {
    setShowDeleteModal(false);
    await supabase.from("recetas").delete().eq("id", id!);
    router.back();
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>{t("newTrip.back")}</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>
              {isEditing ? t("newRecipe.editTitle") : t("newRecipe.title")}
            </Text>
            {isEditing && (
              <TouchableOpacity onPress={() => setShowDeleteModal(true)}>
                <Text style={styles.deleteText}>{t("newRecipe.deleteBtn")}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── FOTO ── */}
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("newRecipe.photoTitle")}</Text>
            {fotoUrl ? (
              <View style={styles.fotoContainer}>
                <Image
                  source={{ uri: fotoUrl }}
                  style={styles.fotoPreview}
                  resizeMode="cover"
                />
                <View style={styles.fotoActions}>
                  <TouchableOpacity
                    style={styles.fotoBtn}
                    onPress={handlePickFoto}
                    disabled={uploadingFoto}
                  >
                    <Text style={styles.fotoBtnText}>
                      {uploadingFoto ? t("newRecipe.uploading") : t("newRecipe.changePhoto")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.fotoBtn, styles.fotoBtnDanger]}
                    onPress={() => setFotoUrl(null)}
                  >
                    <Text style={[styles.fotoBtnText, { color: "#ef4444" }]}>
                      {t("newRecipe.removePhoto")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.fotoPlaceholder}
                onPress={handlePickFoto}
                disabled={uploadingFoto}
              >
                {uploadingFoto ? (
                  <ActivityIndicator color="#1B4F72" />
                ) : (
                  <>
                    <Text style={styles.fotoPlaceholderIcon}>🍽️</Text>
                    <Text style={styles.fotoPlaceholderText}>{t("newRecipe.addPhotoHint")}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* ── INFORMACIÓN BÁSICA ── */}
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("newRecipe.basicInfoTitle")}</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t("newRecipe.nameLabel")}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                value={nombre}
                onChangeText={setNombre}
                placeholder={t("newRecipe.namePlaceholder")}
                placeholderTextColor={theme.inputPlaceholder}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t("newRecipe.descLabel")}</Text>
              <TextInput
                style={[styles.input, { height: 70, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder={t("newRecipe.descPlaceholder")}
                placeholderTextColor={theme.inputPlaceholder}
                multiline
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t("newRecipe.creditsLabel")}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                value={creditos}
                onChangeText={setCreditos}
                placeholder={t("newRecipe.creditsPlaceholder")}
                placeholderTextColor={theme.inputPlaceholder}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t("newRecipe.servingsBaseLabel")}</Text>
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
                <Text style={styles.fieldLabel}>{t("newRecipe.publicLabel")}</Text>
                <Switch
                  value={esPublica}
                  onValueChange={setEsPublica}
                  trackColor={{ false: "#e2e8f0", true: "#1B4F72" }}
                  thumbColor="#fff"
                />
              </View>
              <Text style={styles.fieldHint}>{t("newRecipe.publicHint")}</Text>
            </View>
          </View>

          {/* ── TIEMPOS ── */}
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("newRecipe.timesTitle")}</Text>
            <View style={styles.tiemposRow}>
              <View style={styles.tiempoField}>
                <Text style={styles.fieldLabel}>{t("newRecipe.prepTimeMinLabel")}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                  value={tiempoPrep}
                  onChangeText={setTiempoPrep}
                  placeholder="0"
                  placeholderTextColor={theme.inputPlaceholder}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.tiempoField}>
                <Text style={styles.fieldLabel}>{t("newRecipe.cookTimeMinLabel")}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                  value={tiempoCoccion}
                  onChangeText={setTiempoCoccion}
                  placeholder="0"
                  placeholderTextColor={theme.inputPlaceholder}
                  keyboardType="numeric"
                />
              </View>
            </View>
            {(tiempoPrep || tiempoCoccion) && (
              <Text style={styles.tiempoTotal}>
                {t("newRecipe.totalTime", { n: parseInt(tiempoPrep || "0") + parseInt(tiempoCoccion || "0") })}
              </Text>
            )}
          </View>

          {/* ── CLASIFICACIÓN ── */}
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("newRecipe.classificationTitle")}</Text>
            <Text style={styles.fieldLabel}>{t("newRecipe.mealTimeLabel")}</Text>
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
              {t("newRecipe.categoryLabel")}
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

          {/* ── ETIQUETAS DIETÉTICAS ── */}
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("newRecipe.dietTitle")}</Text>
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
                    {t(tag.tKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── PALABRAS CLAVE ── */}
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("newRecipe.keywordsTitle")}</Text>
            <Text style={styles.fieldHint}>{t("newRecipe.keywordsHint")}</Text>
            <View style={styles.kwInputRow}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                value={nuevaPalabra}
                onChangeText={setNuevaPalabra}
                placeholder={t("newRecipe.keywordsInputPlaceholder")}
                placeholderTextColor={theme.inputPlaceholder}
                onSubmitEditing={agregarPalabra}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.kwAddBtn}
                onPress={agregarPalabra}
              >
                <Text style={styles.kwAddBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            {palabrasClave.length > 0 && (
              <View style={[styles.chipRow, { marginTop: 10 }]}>
                {palabrasClave.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={styles.kwTag}
                    onPress={() => quitarPalabra(p)}
                  >
                    <Text style={styles.kwTagText}>{p} ✕</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* ── UTENSILIOS ── */}
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("newRecipe.utensilsTitle")}</Text>
            <Text style={styles.fieldHint}>{t("newRecipe.utensilsHint")}</Text>
            <View style={[styles.chipRow, { marginTop: 10 }]}>
              {UTENSILIOS_PREDEFINIDOS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.chip,
                    utensilios.includes(u) && styles.chipActive,
                  ]}
                  onPress={() => toggleUtensilio(u)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      utensilios.includes(u) && styles.chipTextActive,
                    ]}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── INGREDIENTES ── */}
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("newRecipe.ingredientsTitle")}</Text>
            <TextInput
              style={styles.input}
              value={busqueda}
              onChangeText={(val) => {
                setBusqueda(val);
                setShowCatalogo(true);
              }}
              onFocus={() => setShowCatalogo(true)}
              placeholder={t("newRecipe.searchIngredientPlaceholder")}
              placeholderTextColor={theme.inputPlaceholder}
            />
            {showCatalogo && busqueda.length > 0 && (
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
                {filteredCatalogo.length === 0 && (
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      { backgroundColor: "#EFF6FF" },
                    ]}
                    onPress={openCreateIng}
                  >
                    <Text style={[styles.dropdownText, { color: "#1B4F72" }]}>
                      {t("newRecipe.createIngredient", { name: busqueda })}
                    </Text>
                    <Text style={styles.dropdownUnit}>{t("newRecipe.createIngredientNew")}</Text>
                  </TouchableOpacity>
                )}
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
                  placeholderTextColor={theme.inputPlaceholder}
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
              <Text style={styles.emptyHint}>{t("newRecipe.ingredientsEmptyHint")}</Text>
            )}
          </View>

          {/* ── PREPARACIÓN ── */}
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("newRecipe.preparationTitle")}</Text>
            <Text style={styles.fieldHint}>{t("newRecipe.preparationHint")}</Text>
            <TextInput
              style={[styles.input, { height: 160, marginTop: 8, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
              value={instrucciones}
              onChangeText={setInstrucciones}
              placeholder={t("newRecipe.preparationPlaceholder")}
              placeholderTextColor={theme.inputPlaceholder}
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditing ? t("newRecipe.saveBtnEdit") : t("newRecipe.saveBtnNew")}
              </Text>
            )}
          </Pressable>
        </View>

        {/* ══ MODALS ══ */}

        {/* Error */}
        <Modal
          visible={showErrorModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowErrorModal(false)}
        >
          <View style={styles.overlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>⚠️ {t("common.error")}</Text>
              <Text style={styles.modalMsg}>{errorMsg}</Text>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#1B4F72" }]}
                onPress={() => setShowErrorModal(false)}
              >
                <Text style={styles.modalBtnText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Success */}
        <Modal
          visible={showSuccessModal}
          animationType="fade"
          transparent
          onRequestClose={() => {
            setShowSuccessModal(false);
            router.back();
          }}
        >
          <View style={styles.overlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>
                {isEditing ? t("newRecipe.successUpdated") : t("newRecipe.successCreated")}
              </Text>
              <Text style={styles.modalMsg}>{successMsg}</Text>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#16a34a" }]}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.back();
                }}
              >
                <Text style={styles.modalBtnText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Delete confirm */}
        <Modal
          visible={showDeleteModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.overlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>{t("newRecipe.deleteTitle")}</Text>
              <Text style={styles.modalMsg}>{t("newRecipe.deleteMsg", { name: nombre })}</Text>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#DC2626" }]}
                onPress={handleDelete}
              >
                <Text style={styles.modalBtnText}>{t("common.delete")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: "#e2e8f0", marginTop: 8 },
                ]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: "#1e293b" }]}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Crear ingrediente */}
        <Modal
          visible={showCreateIngModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCreateIngModal(false)}
        >
          <WebModalWrapper>
          <SafeAreaView style={{ flex: 1, backgroundColor: theme.surface }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreateIngModal(false)}>
                <Text style={styles.modalCancel}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>{t("newRecipe.createIngTitle")}</Text>
              <TouchableOpacity onPress={handleCreateIngrediente}>
                <Text style={styles.modalSave}>{t("newRecipe.createIngBtn")}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t("newRecipe.nameLabel")}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                  value={newIngNombre}
                  onChangeText={setNewIngNombre}
                  placeholder={t("newRecipe.createIngNamePlaceholder")}
                  placeholderTextColor={theme.inputPlaceholder}
                  autoFocus
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t("newRecipe.createIngUnitLabel")}</Text>
                <View style={styles.chipRow}>
                  {UNIDADES.map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[
                        styles.chip,
                        newIngUnidad === u && styles.chipActive,
                      ]}
                      onPress={() => setNewIngUnidad(u)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          newIngUnidad === u && styles.chipTextActive,
                        ]}
                      >
                        {u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t("newRecipe.createIngCategoryLabel")}</Text>
                <View style={styles.chipRow}>
                  {CATEGORIAS_ING.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.chip,
                        newIngCategoria === cat && styles.chipActive,
                      ]}
                      onPress={() => setNewIngCategoria(cat)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          newIngCategoria === cat && styles.chipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t("newRecipe.createIngNotesLabel")}</Text>
                <Text style={[styles.fieldHint, { marginBottom: 6 }]}>
                  {t("newRecipe.createIngNotesHint")}
                </Text>
                <TextInput
                  style={[styles.input, { height: 80, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                  value={newIngRecomendaciones}
                  onChangeText={setNewIngRecomendaciones}
                  placeholder={t("newRecipe.createIngNotesPlaceholder")}
                  placeholderTextColor={theme.inputPlaceholder}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>
          </SafeAreaView>
          </WebModalWrapper>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
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

  // Photo
  fotoContainer: { gap: 10 },
  fotoPreview: { width: "100%", height: 200, borderRadius: 12 },
  fotoActions: { flexDirection: "row", gap: 10 },
  fotoBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  fotoBtnDanger: { borderColor: "#fca5a5" },
  fotoBtnText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  fotoPlaceholder: {
    height: 140,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  fotoPlaceholderIcon: { fontSize: 36 },
  fotoPlaceholderText: { fontSize: 13, color: "#94a3b8", fontWeight: "600" },

  // Tiempos
  tiemposRow: { flexDirection: "row", gap: 12 },
  tiempoField: { flex: 1 },
  tiempoTotal: {
    fontSize: 13,
    color: "#1B4F72",
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center",
  },

  // Scaler
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

  // Chips
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

  // Keywords
  kwInputRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 8,
  },
  kwAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1B4F72",
    alignItems: "center",
    justifyContent: "center",
  },
  kwAddBtnText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "300",
    lineHeight: 28,
  },
  kwTag: {
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#93C5FD",
  },
  kwTagText: { fontSize: 12, color: "#1B4F72", fontWeight: "600" },

  // Ingredientes
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

  // Footer
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

  // Modals
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMsg: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 20,
    textAlign: "center",
  },
  modalBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalCancel: { fontSize: 15, color: "#64748b" },
  modalHeaderTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  modalSave: { fontSize: 15, color: "#1B4F72", fontWeight: "700" },
});
