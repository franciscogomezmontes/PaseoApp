import { Paths, File as FSFile } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Print from "expo-print";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MapView, Marker } from "../../src/lib/maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { ESTADO_CONFIG, GASTO_CATEGORIAS, TIPO_CONFIG } from "../../src/constants";
import WebModalWrapper from "../../src/components/WebModalWrapper";
import { useTheme } from "../../src/hooks/useTheme";
import { calcularTransferenciasMinimas } from "../../src/lib/liquidacion";
import { supabase } from "../../src/lib/supabase";
import { useRecipeStore } from "../../src/store/useRecipeStore";
import { useTripStore } from "../../src/store/useTripStore";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const UF_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
];

const TIPOS_COMIDA = [
  "desayuno",
  "medias nueves",
  "almuerzo",
  "onces",
  "cena",
  "snack",
];
const ESTADOS = ["planificacion", "activo", "liquidado"];

const initials = (name: string) =>
  name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "??";

const extractCoordsFromLink = (
  link: string,
): { lat: number; lng: number } | null => {
  if (!link) return null;
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /\?q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /place\/(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const p of patterns) {
    const m = link.match(p);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  }
  return null;
};

const formatCOP = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function TripDetailScreen() {
  const { id: _rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(_rawId) ? _rawId[0] : (_rawId ?? "");
  const router = useRouter();
  const theme = useTheme();
  const {
    personas,
    fetchPersonas,
    crearPersona,
    agregarParticipacion,
    fetchPaseos,
  } = useTripStore();
  const { recetas, fetchRecetas } = useRecipeStore();
  const { t } = useTranslation();

  // ── Core data ──
  const [activeTab, setActiveTab] = useState<
    "resumen" | "gente" | "menu" | "gastos" | "info"
  >("resumen");
  const [paseo, setPaseo] = useState<any>(null);
  const [participaciones, setParticipaciones] = useState<any[]>([]);
  const [familiasList, setFamiliasList] = useState<any[]>([]);
  const [momentos, setMomentos] = useState<any[]>([]);
  const [fechas, setFechas] = useState<string[]>([]);
  const [fechaActiva, setFechaActiva] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [organizadorNombre, setOrganizadorNombre] = useState("");

  // ── Info edit ──
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
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // ── Familia edit modal ──
  const [showEditFamiliaModal, setShowEditFamiliaModal] = useState(false);
  const [editingFamilia, setEditingFamilia] = useState<any>(null);
  const [editFamiliaNombre, setEditFamiliaNombre] = useState("");
  const [uploadingFamiliaPhoto, setUploadingFamiliaPhoto] = useState(false);

  // ── Add participant ──
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPersonaNombre, setNewPersonaNombre] = useState("");
  const [selectedFamiliaId, setSelectedFamiliaId] = useState<string | null>(
    null,
  );
  const [creatingNewFamilia, setCreatingNewFamilia] = useState(false);
  const [newFamiliaNombre, setNewFamiliaNombre] = useState("");
  const [factorInput, setFactorInput] = useState("1.0");
  const [savingParticipant, setSavingParticipant] = useState(false);
  const [enviarInvitacion, setEnviarInvitacion] = useState(false);
  const [emailInvitacion, setEmailInvitacion] = useState("");
  const [guardarEnDirectorio, setGuardarEnDirectorio] = useState(false);
  const [directorio, setDirectorio] = useState<any[]>([]);
  const [directorioSearch, setDirectorioSearch] = useState("");
  const [loadingDirectorio, setLoadingDirectorio] = useState(false);
  const [enviandoInvitacion, setEnviandoInvitacion] = useState(false);
  const [showDirectorioModal, setShowDirectorioModal] = useState(false);
  const [miPersona, setMiPersona] = useState<any>(null);
  const [miPersonaId, setMiPersonaId] = useState<string | null>(null);
  const [miPersonaNombre, setMiPersonaNombre] = useState<string>("");
  const [addingSelf, setAddingSelf] = useState(false);
  const [showDirOptionsModal, setShowDirOptionsModal] = useState(false);
  const [dirOptionsTarget, setDirOptionsTarget] = useState<any>(null);
  const [showDirDeleteModal, setShowDirDeleteModal] = useState(false);
  const [showDirEditModal, setShowDirEditModal] = useState(false);
  const [dirEditNombre, setDirEditNombre] = useState("");
  const [dirEditEmail, setDirEditEmail] = useState("");
  const [dirEditFamilia, setDirEditFamilia] = useState("");

  // ── Participant options / edit ──
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [optionsParticipante, setOptionsParticipante] = useState<any>(null);
  const [showFactorModal, setShowFactorModal] = useState(false);
  const [factorParticipante, setFactorParticipante] = useState<any>(null);
  const [factorEditInput, setFactorEditInput] = useState("1.0");
  const [showMoveFamiliaModal, setShowMoveFamiliaModal] = useState(false);
  const [movingParticipante, setMovingParticipante] = useState<any>(null);
  const [showDeletePartModal, setShowDeletePartModal] = useState(false);
  const [deletePartTarget, setDeletePartTarget] = useState<any>(null);
  const [nuevaFechaTodoPaseo, setNuevaFechaTodoPaseo] = useState(true);
  const [nuevoFechaDesde, setNuevoFechaDesde] = useState("");
  const [nuevoFechaHasta, setNuevoFechaHasta] = useState("");
  const [showFechasModal, setShowFechasModal] = useState(false);
  const [fechasParticipante, setFechasParticipante] = useState<any>(null);
  const [fechaDesdeInput, setFechaDesdeInput] = useState("");
  const [fechaHastaInput, setFechaHastaInput] = useState("");
  const [savingFechas, setSavingFechas] = useState(false);

  // ── Meal ──
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState("almuerzo");
  const [selectedRecetaId, setSelectedRecetaId] = useState<string | null>(null);
  const [savingMeal, setSavingMeal] = useState(false);
  const [showMealOptionsModal, setShowMealOptionsModal] = useState(false);
  // Meal modal search/filters
  const [mealSearch, setMealSearch] = useState("");
  const [mealFilterKeyword, setMealFilterKeyword] = useState<string | null>(
    null,
  );
  const [mealFilterCategoria, setMealFilterCategoria] = useState<string | null>(
    null,
  );
  const [mealFilterDieta, setMealFilterDieta] = useState<string | null>(null);
  const [mealOptionsTarget, setMealOptionsTarget] = useState<any>(null);
  const [showEditMealModal, setShowEditMealModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<any>(null);
  const [editMealTipo, setEditMealTipo] = useState("almuerzo");
  const [showDeleteMealModal, setShowDeleteMealModal] = useState(false);
  const [deleteMealId, setDeleteMealId] = useState<string | null>(null);

  // ── Meal detail / participantes por comida ──
  const [showMealDetailModal, setShowMealDetailModal] = useState(false);
  const [mealDetailTarget, setMealDetailTarget] = useState<any>(null);
  // participacionId → activo
  const [participantesComida, setParticipantesComida] = useState<
    Record<string, boolean>
  >({});
  const [loadingParticipantes, setLoadingParticipantes] = useState(false);
  const savingToggleRef = useRef<Record<string, boolean>>({});

  // ── Misc modals ──
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [showDeleteTripModal, setShowDeleteTripModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ── Gastos ──
  const [gastos, setGastos] = useState<any[]>([]);
  const [gastosTab, setGastosTab] = useState<
    "gastos" | "balances" | "liquidar"
  >("gastos");
  const [showAddGastoModal, setShowAddGastoModal] = useState(false);
  const [gastoNombre, setGastoNombre] = useState("");
  const [gastoMonto, setGastoMonto] = useState("");
  const [gastoCategoria, setGastoCategoria] = useState("comida");
  const [gastoPagadoPor, setGastoPagadoPor] = useState<string | null>(null);
  const [savingGasto, setSavingGasto] = useState(false);
  const [showDeleteGastoModal, setShowDeleteGastoModal] = useState(false);
  const [deleteGastoTarget, setDeleteGastoTarget] = useState<any>(null);
  const [showGastoOptionsModal, setShowGastoOptionsModal] = useState(false);
  const [gastoOptionsTarget, setGastoOptionsTarget] = useState<any>(null);
  const [editingGasto, setEditingGasto] = useState<any>(null); // null = creating, object = editing
  const [exportando, setExportando] = useState(false);
  const [liquidacionesPagadas, setLiquidacionesPagadas] = useState<
    Record<string, boolean>
  >({}); // key: `${deFamId}_${paraFamId}`
  const [savingLiquidacion, setSavingLiquidacion] = useState(false);
  const [participantesComidaMap, setParticipantesComidaMap] = useState<
    Record<string, Record<string, boolean>>
  >({});
  // gastoId → { participacionId → activo }
  const [gastosPartMap, setGastosPartMap] = useState<
    Record<string, Record<string, boolean>>
  >({});
  // participacionId → activo, for the gasto being created
  const [gastoParticipantes, setGastoParticipantes] = useState<
    Record<string, boolean>
  >({});

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  const showError = (msg: string) => {
    setErrorMessage(msg);
    setShowErrorModal(true);
  };

  const familiaForPart = (p: any) =>
    familiasList.find((f) => f.id === p.familia_id) ?? null;

  const colorForFamilia = (familiaId: string | null) => {
    const idx = familiasList.findIndex((f) => f.id === familiaId);
    return UF_COLORS[idx >= 0 ? idx % UF_COLORS.length : 0];
  };

  const daysInRange = (start: string, end: string): number => {
    const s = new Date(start + "T12:00:00");
    const e = new Date(end + "T12:00:00");
    return Math.max(0, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
  };

  // ─────────────────────────────────────────────
  // Data loading
  // ─────────────────────────────────────────────
  useEffect(() => {
    fetchPersonas();
    fetchRecetas();
    loadTripData();
    loadGastos();
  }, [id]);
  useEffect(() => {
    if (activeTab === "gastos") {
      loadGastos();
      loadParticipantesComidaMap(momentos);
      loadLiquidacionesPagadas();
    }
  }, [activeTab]);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsOrganizer(paseoData.organizer_id === user?.id);
      // Load my own persona for self-add
      if (user?.id) {
        const { data: mePers } = await supabase
          .from("personas")
          .select("id, nombre")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (mePers) {
          setMiPersonaId(mePers.id);
          setMiPersonaNombre(mePers.nombre);
        }
      }
      // Load organizer name
      if (paseoData.organizer_id) {
        const { data: orgData } = await supabase
          .from("personas")
          .select("nombre")
          .eq("auth_user_id", paseoData.organizer_id)
          .maybeSingle();
        setOrganizadorNombre(orgData?.nombre ?? "");
      }
      const dates: string[] = [];
      const start = new Date(paseoData.fecha_inicio + "T12:00:00");
      const end = new Date(paseoData.fecha_fin + "T12:00:00");
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1))
        dates.push(d.toISOString().split("T")[0]);
      setFechas(dates);
      setFechaActiva(dates[0] ?? null);
    }
    const { data: famData } = await supabase
      .from("familias")
      .select("*")
      .eq("paseo_id", id)
      .order("numero");
    setFamiliasList(famData ?? []);

    const { data: partData } = await supabase
      .from("participaciones")
      .select("*, personas(nombre, auth_user_id, foto_url)")
      .eq("paseo_id", id)
      .order("familia_id");
    setParticipaciones(partData ?? []);

    const { data: momentosData } = await supabase
      .from("momentos_comida")
      .select("*, recetas(id, nombre, porciones_base, descripcion, instrucciones, tiempo_preparacion, tiempo_coccion, utensilios, receta_ingredientes(cantidad_por_porcion, ingredientes(nombre, unidad_base)))")
      .eq("paseo_id", id)
      .order("fecha")
      .order("tipo_comida");
    setMomentos(momentosData ?? []);
    await loadParticipantesComidaMap(momentosData ?? []);
    setLoading(false);
  };

  const loadGastos = async () => {
    const { data } = await supabase
      .from("gastos")
      .select("*, personas(nombre)")
      .eq("paseo_id", id)
      .order("created_at", { ascending: false });
    const gastosList = data ?? [];
    setGastos(gastosList);

    // Load participantes_gasto for all non-comida gastos
    const nonComidaIds = gastosList
      .filter((g: any) => g.categoria !== "comida")
      .map((g: any) => g.id);
    if (nonComidaIds.length > 0) {
      const { data: partData } = await supabase
        .from("participantes_gasto")
        .select("gasto_id, participacion_id, activo")
        .in("gasto_id", nonComidaIds);
      const map: Record<string, Record<string, boolean>> = {};
      (partData ?? []).forEach((r: any) => {
        if (!map[r.gasto_id]) map[r.gasto_id] = {};
        map[r.gasto_id][r.participacion_id] = r.activo;
      });
      setGastosPartMap(map);
    } else {
      setGastosPartMap({});
    }
  };

  const loadParticipantesComidaMap = async (momentosList: any[]) => {
    if (momentosList.length === 0) {
      setParticipantesComidaMap({});
      return;
    }
    const { data } = await supabase
      .from("participantes_comida")
      .select("momento_id, participacion_id, activo")
      .in(
        "momento_id",
        momentosList.map((m: any) => m.id),
      );
    const map: Record<string, Record<string, boolean>> = {};
    (data ?? []).forEach((r: any) => {
      if (!map[r.momento_id]) map[r.momento_id] = {};
      map[r.momento_id][r.participacion_id] = r.activo;
    });
    setParticipantesComidaMap(map);
  };

  // ─────────────────────────────────────────────
  // Meal detail / participantes por comida
  // ─────────────────────────────────────────────
  const openMealDetail = async (meal: any) => {
    setMealDetailTarget(meal);
    setShowMealDetailModal(true);
    setLoadingParticipantes(true);

    // Load existing records
    const { data: existing } = await supabase
      .from("participantes_comida")
      .select("*")
      .eq("momento_id", meal.id);

    const existingMap: Record<string, boolean> = {};
    (existing ?? []).forEach((r: any) => {
      existingMap[r.participacion_id] = r.activo;
    });

    // For participants not yet in the table, default to true (insert on first toggle)
    const map: Record<string, boolean> = {};
    participaciones.forEach((p) => {
      map[p.id] = existingMap[p.id] !== undefined ? existingMap[p.id] : true;
    });
    setParticipantesComida(map);
    setLoadingParticipantes(false);
  };

  const toggleParticipante = async (
    participacionId: string,
    currentValue: boolean,
  ) => {
    if (savingToggleRef.current[participacionId]) return;
    savingToggleRef.current[participacionId] = true;
    const newValue = !currentValue;
    setParticipantesComida((prev) => ({
      ...prev,
      [participacionId]: newValue,
    }));

    const { data: existing } = await supabase
      .from("participantes_comida")
      .select("id")
      .eq("momento_id", mealDetailTarget.id)
      .eq("participacion_id", participacionId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("participantes_comida")
        .update({ activo: newValue })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("participantes_comida")
        .insert({
          momento_id: mealDetailTarget.id,
          participacion_id: participacionId,
          activo: newValue,
        });
    }

    // Update porciones on momentos_comida based on active participants
    const updatedMap = { ...participantesComida, [participacionId]: newValue };
    const activePorciones = participaciones
      .filter((p) => updatedMap[p.id] !== false)
      .reduce((sum, p) => sum + (p.factor ?? 1), 0);
    const porcionesRedondeadas = parseFloat(
      (Math.round(activePorciones * 10) / 10).toFixed(1),
    );
    await supabase
      .from("momentos_comida")
      .update({ porciones: porcionesRedondeadas })
      .eq("id", mealDetailTarget.id);

    savingToggleRef.current[participacionId] = false;
  };

  // ─────────────────────────────────────────────
  // Familia handlers
  // ─────────────────────────────────────────────
  const openEditFamilia = (familia: any) => {
    setEditingFamilia(familia);
    setEditFamiliaNombre(familia.nombre);
    setShowEditFamiliaModal(true);
  };

  const saveEditFamilia = async () => {
    if (!editingFamilia || !editFamiliaNombre.trim()) return;
    const { error } = await supabase
      .from("familias")
      .update({ nombre: editFamiliaNombre.trim() })
      .eq("id", editingFamilia.id);
    if (error) showError(error.message);
    else {
      setShowEditFamiliaModal(false);
      loadTripData();
    }
  };

  const pickFamiliaPhoto = async () => {
    if (!editingFamilia) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    setUploadingFamiliaPhoto(true);
    try {
      const uri = result.assets[0].uri;
      const fileName = `familia_${editingFamilia.id}.jpg`;
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
        setUploadingFamiliaPhoto(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl + "?t=" + Date.now();
      await supabase
        .from("familias")
        .update({ foto_url: publicUrl })
        .eq("id", editingFamilia.id);
      setEditingFamilia((prev: any) => ({ ...prev, foto_url: publicUrl }));
      loadTripData();
    } catch (e) {
      showError(t("tripDetail.errors.imageError"));
    }
    setUploadingFamiliaPhoto(false);
  };

  // ─────────────────────────────────────────────
  // Participant handlers
  // ─────────────────────────────────────────────
  const loadDirectorio = async () => {
    setLoadingDirectorio(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setLoadingDirectorio(false);
      return;
    }
    const { data } = await supabase
      .from("directorio")
      .select("*")
      .eq("owner_id", session.user.id)
      .order("nombre");
    setDirectorio(data ?? []);
    setLoadingDirectorio(false);
  };

  const handleAddParticipant = async () => {
    if (!newPersonaNombre.trim()) {
      showError(t("tripDetail.errors.noName"));
      return;
    }

    setSavingParticipant(true);

    // If adding self, use existing persona instead of creating a new one
    let personaId: string;
    if (addingSelf && miPersonaId) {
      personaId = miPersonaId;
    } else {
      const nueva = await crearPersona(newPersonaNombre.trim());
      if (!nueva) {
        showError(t("tripDetail.errors.noPersona"));
        setSavingParticipant(false);
        return;
      }
      personaId = nueva.id;
    }

    // Resolver familia
    let familiaId = selectedFamiliaId;
    if (creatingNewFamilia && newFamiliaNombre.trim()) {
      const nextNumero =
        (familiasList.length > 0
          ? Math.max(...familiasList.map((f) => f.numero))
          : 0) + 1;
      const { data: newFam, error: famErr } = await supabase
        .from("familias")
        .insert({
          paseo_id: id,
          nombre: newFamiliaNombre.trim(),
          numero: nextNumero,
        })
        .select()
        .single();
      if (famErr || !newFam) {
        showError(t("tripDetail.errors.noFamilia"));
        setSavingParticipant(false);
        return;
      }
      familiaId = newFam.id;
    }
    if (!familiaId) {
      showError(t("tripDetail.errors.selectFamilia"));
      setSavingParticipant(false);
      return;
    }

    const parsedFactor = Math.min(1, Math.max(0, parseFloat(factorInput) || 1));
    const famObj =
      familiasList.find((f) => f.id === familiaId) ??
      (creatingNewFamilia
        ? {
            numero:
              (familiasList.length > 0
                ? Math.max(...familiasList.map((f) => f.numero))
                : 0) + 1,
          }
        : { numero: 1 });

    const { data: newPart, error } = await supabase
      .from("participaciones")
      .insert({
        paseo_id: id,
        persona_id: personaId,
        familia_id: familiaId,
        unidad_familiar: famObj.numero,
        factor: parsedFactor,
        puso: 0,
        fecha_desde: nuevaFechaTodoPaseo ? null : (nuevoFechaDesde.trim() || null),
        fecha_hasta: nuevaFechaTodoPaseo ? null : (nuevoFechaHasta.trim() || null),
      })
      .select()
      .single();
    if (error) {
      showError(error.message);
      setSavingParticipant(false);
      return;
    }
    // If custom dates, mark as inactive on meals outside the date range
    if (!nuevaFechaTodoPaseo && newPart && momentos.length > 0) {
      const desde = nuevoFechaDesde.trim();
      const hasta = nuevoFechaHasta.trim();
      const absentRows = momentos
        .filter((m) => m.fecha < desde || m.fecha > hasta)
        .map((m) => ({
          momento_id: m.id,
          participacion_id: newPart.id,
          activo: false,
        }));
      if (absentRows.length > 0)
        await supabase.from("participantes_comida").insert(absentRows);
    }

    // Guardar en directorio si se solicitó
    if (guardarEnDirectorio) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("directorio").insert({
          owner_id: session.user.id,
          nombre: newPersonaNombre.trim(),
          email: enviarInvitacion ? emailInvitacion.trim() : null,
          familia_nombre: creatingNewFamilia
            ? newFamiliaNombre.trim()
            : (familiasList.find((f) => f.id === familiaId)?.nombre ?? null),
        });
      }
    }

    // Enviar invitación por correo si se solicitó
    if (enviarInvitacion && emailInvitacion.trim()) {
      setEnviandoInvitacion(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const organizadorNombre =
          (
            await supabase
              .from("personas")
              .select("nombre")
              .eq("auth_user_id", session?.user?.id ?? "")
              .single()
          )?.data?.nombre ?? "El organizador";
        await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/invitar-participante`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              email: emailInvitacion.trim(),
              nombre_invitado: newPersonaNombre.trim(),
              nombre_paseo: paseo?.nombre ?? "",
              codigo_invitacion: paseo?.codigo_invitacion ?? "",
              nombre_organizador: organizadorNombre,
            }),
          },
        );
      } catch {
        /* no bloquear el flujo si el email falla */
      }
      setEnviandoInvitacion(false);
    }

    // Reset
    setAddingSelf(false);
    setNewPersonaNombre("");
    setSelectedFamiliaId(null);
    setCreatingNewFamilia(false);
    setNewFamiliaNombre("");
    setFactorInput("1.0");
    setEnviarInvitacion(false);
    setEmailInvitacion("");
    setGuardarEnDirectorio(false);
    setNuevaFechaTodoPaseo(true);
    setNuevoFechaDesde("");
    setNuevoFechaHasta("");
    setDirectorioSearch("");
    setShowAddModal(false);
    setSavingParticipant(false);
    loadTripData();
  };

  const handleParticipanteOptions = (m: any) => {
    setOptionsParticipante(m);
    setShowOptionsModal(true);
  };

  const handleChangeFactor = (m: any) => {
    setFactorParticipante(m);
    setFactorEditInput(String(m.factor ?? 1));
    setShowFactorModal(true);
  };

  const applyFactor = async () => {
    if (!factorParticipante) return;
    const v = Math.min(1, Math.max(0, parseFloat(factorEditInput) || 1));
    setShowFactorModal(false);
    const { error } = await supabase
      .from("participaciones")
      .update({ factor: v })
      .eq("id", factorParticipante.id);
    if (error) showError(error.message);
    else loadTripData();
  };

  const handleMoveToFamilia = (m: any) => {
    setMovingParticipante(m);
    setShowMoveFamiliaModal(true);
  };

  const applyMoveFamilia = async (familiaId: string) => {
    if (!movingParticipante) return;
    setShowMoveFamiliaModal(false);
    const famObj = familiasList.find((f) => f.id === familiaId);
    const { error } = await supabase
      .from("participaciones")
      .update({ familia_id: familiaId, unidad_familiar: famObj?.numero ?? 1 })
      .eq("id", movingParticipante.id);
    if (error) showError(error.message);
    else loadTripData();
  };

  const handleDeleteParticipante = (m: any) => {
    setDeletePartTarget(m);
    setShowDeletePartModal(true);
  };

  const formatDateInput = (raw: string): string => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
  };

  const handleEditFechas = (part: any) => {
    setFechasParticipante(part);
    setFechaDesdeInput(part.fecha_desde ?? paseo?.fecha_inicio ?? "");
    setFechaHastaInput(part.fecha_hasta ?? paseo?.fecha_fin ?? "");
    setShowFechasModal(true);
  };

  const saveFechas = async () => {
    if (!fechasParticipante || !paseo) return;
    const desde = fechaDesdeInput.trim();
    const hasta = fechaHastaInput.trim();
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(desde) || !dateRegex.test(hasta)) {
      showError(t("tripDetail.errors.dateFormat"));
      return;
    }
    if (desde < paseo.fecha_inicio || hasta > paseo.fecha_fin) {
      showError(
        t("tripDetail.errors.dateRange", { inicio: paseo.fecha_inicio, fin: paseo.fecha_fin }),
      );
      return;
    }
    if (desde > hasta) {
      showError(t("tripDetail.errors.dateOrder"));
      return;
    }
    setSavingFechas(true);
    const { error } = await supabase
      .from("participaciones")
      .update({ fecha_desde: desde, fecha_hasta: hasta })
      .eq("id", fechasParticipante.id);
    if (error) {
      showError(error.message);
      setSavingFechas(false);
      return;
    }
    // Mark participant as inactive on meals outside their date range
    for (const momento of momentos) {
      if (momento.fecha < desde || momento.fecha > hasta) {
        const { data: existing } = await supabase
          .from("participantes_comida")
          .select("id")
          .eq("momento_id", momento.id)
          .eq("participacion_id", fechasParticipante.id)
          .maybeSingle();
        if (existing) {
          await supabase
            .from("participantes_comida")
            .update({ activo: false })
            .eq("id", existing.id);
        } else {
          await supabase.from("participantes_comida").insert({
            momento_id: momento.id,
            participacion_id: fechasParticipante.id,
            activo: false,
          });
        }
      }
    }
    // Reload comida records and recalculate porciones
    const { data: pcFresh } = await supabase
      .from("participantes_comida")
      .select("momento_id, participacion_id, activo")
      .in(
        "momento_id",
        momentos.map((m) => m.id),
      );
    const updatedComidaMap: Record<string, Record<string, boolean>> = {};
    (pcFresh ?? []).forEach((r: any) => {
      if (!updatedComidaMap[r.momento_id]) updatedComidaMap[r.momento_id] = {};
      updatedComidaMap[r.momento_id][r.participacion_id] = r.activo;
    });
    await Promise.all(
      momentos.map((momento) => {
        const registros = updatedComidaMap[momento.id] ?? {};
        const activePorciones = participaciones
          .filter((p) => registros[p.id] !== false)
          .reduce((sum, p) => sum + (p.factor ?? 1), 0);
        const porciones =
          parseFloat((Math.round(activePorciones * 10) / 10).toFixed(1)) || 1;
        return supabase
          .from("momentos_comida")
          .update({ porciones })
          .eq("id", momento.id);
      }),
    );
    setSavingFechas(false);
    setShowFechasModal(false);
    loadTripData();
  };
  const confirmDeleteParticipante = async () => {
    if (!deletePartTarget) return;
    setShowDeletePartModal(false);
    // Clean up meal attendance records for this participant
    await supabase
      .from("participantes_comida")
      .delete()
      .eq("participacion_id", deletePartTarget.id);
    // Delete the participation
    const { error } = await supabase
      .from("participaciones")
      .delete()
      .eq("id", deletePartTarget.id);
    if (error) { showError(error.message); return; }
    // Recalculate porciones for all momentos using remaining participants
    const remainingParts = participaciones.filter(
      (p) => p.id !== deletePartTarget.id,
    );
    if (momentos.length > 0) {
      // Fetch all attendance rows in one query instead of N queries
      const momentoIds = momentos.map((m) => m.id);
      const { data: allPc } = await supabase
        .from("participantes_comida")
        .select("momento_id, participacion_id, activo")
        .in("momento_id", momentoIds);
      const pcByMomento: Record<string, Record<string, boolean>> = {};
      (allPc ?? []).forEach((r: any) => {
        if (!pcByMomento[r.momento_id]) pcByMomento[r.momento_id] = {};
        pcByMomento[r.momento_id][r.participacion_id] = r.activo;
      });

      // Run all porciones updates in parallel (replaces N serial round-trips)
      await Promise.all(
        momentos.map((momento) => {
          const existingMap = pcByMomento[momento.id] ?? {};
          const activePorciones = remainingParts
            .filter((p) => existingMap[p.id] !== false)
            .reduce((sum: number, p: any) => sum + (p.factor ?? 1), 0);
          const porciones =
            parseFloat((Math.round(activePorciones * 10) / 10).toFixed(1)) || 1;
          return supabase
            .from("momentos_comida")
            .update({ porciones })
            .eq("id", momento.id);
        }),
      );
    }
    loadTripData();
  };

  // ─────────────────────────────────────────────
  // Meal handlers
  // ─────────────────────────────────────────────
  const handleMealOptions = (m: any) => {
    setMealOptionsTarget(m);
    setShowMealOptionsModal(true);
  };

  const isPartPresentOnDate = (p: any, fecha: string): boolean => {
    const desde = p.fecha_desde ?? paseo?.fecha_inicio ?? "";
    const hasta = p.fecha_hasta ?? paseo?.fecha_fin ?? "";
    return desde <= fecha && fecha <= hasta;
  };

  const handleAddMeal = async () => {
    if (!fechaActiva) return;
    setSavingMeal(true);
    const currentFecha = fechaActiva;
    // Only count participants present on this specific date
    const totalFactor = participaciones
      .filter((p) => isPartPresentOnDate(p, currentFecha))
      .reduce((sum, p) => sum + (p.factor ?? 1), 0);
    const porciones =
      parseFloat((Math.round(totalFactor * 10) / 10).toFixed(1)) || 1;
    const { data: newMeal, error } = await supabase
      .from("momentos_comida")
      .insert({
        paseo_id: id,
        fecha: currentFecha,
        tipo_comida: selectedTipo,
        receta_id: selectedRecetaId,
        porciones,
      })
      .select()
      .single();
    if (error) { showError(error.message); setSavingMeal(false); return; }
    // Mark participants absent on this date as inactive
    const absentRows = participaciones
      .filter((p) => !isPartPresentOnDate(p, currentFecha))
      .map((p) => ({
        momento_id: newMeal.id,
        participacion_id: p.id,
        activo: false,
      }));
    if (absentRows.length > 0)
      await supabase.from("participantes_comida").insert(absentRows);
    setShowAddMealModal(false);
    setSelectedRecetaId(null);
    await loadTripData();
    setFechaActiva(currentFecha);
    setSavingMeal(false);
  };

  const handleSaveEditMeal = async () => {
    if (!editingMeal) return;
    const { error } = await supabase
      .from("momentos_comida")
      .update({ tipo_comida: editMealTipo })
      .eq("id", editingMeal.id);
    if (error) showError(error.message);
    else {
      setShowEditMealModal(false);
      const cf = fechaActiva;
      await loadTripData();
      setFechaActiva(cf);
    }
  };

  const handleDeleteMeal = (mealId: string) => {
    setDeleteMealId(mealId);
    setShowDeleteMealModal(true);
  };
  const confirmDeleteMeal = async () => {
    if (!deleteMealId) return;
    setShowDeleteMealModal(false);
    const { error } = await supabase
      .from("momentos_comida")
      .delete()
      .eq("id", deleteMealId);
    if (error) showError(error.message);
    else loadTripData();
  };

  // ─────────────────────────────────────────────
  // Info / trip handlers
  // ─────────────────────────────────────────────
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
    if (error) showError(error.message);
    else {
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
    if (error) showError(error.message);
    else {
      setShowEstadoModal(false);
      setPaseo((prev: any) => ({ ...prev, estado }));
      loadTripData();
    }
  };

  const handleDeleteTrip = async () => {
    setShowDeleteTripModal(false);
    const { error } = await supabase.from("paseos").delete().eq("id", id);
    if (error) {
      showError(t("tripDetail.errors.deleteTripFailed", { msg: error.message }));
      return;
    }
    await fetchPaseos();
    router.replace("/(tabs)/trips");
  };

  const pickTripPhoto = async (source: "camera" | "gallery") => {
    setShowPhotoModal(false);
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
        showError(uploadError.message);
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
      showError(t("tripDetail.errors.imageError"));
    }
    setUploadingPhoto(false);
  };

  // ─────────────────────────────────────────────
  // Gastos handlers & calculations
  // ─────────────────────────────────────────────
  // Init all participants as active for the gasto being created
  const initGastoParticipantes = () => {
    const map: Record<string, boolean> = {};
    participaciones.forEach((p) => {
      map[p.id] = true;
    });
    setGastoParticipantes(map);
  };

  // Derived: for the add-gasto modal, treat missing keys as true
  const gastoPartActivoForModal = (participacionId: string) =>
    gastoParticipantes[participacionId] !== false;

  const confirmDeleteGasto = async () => {
    if (!deleteGastoTarget) return;
    setShowDeleteGastoModal(false);
    const { error } = await supabase
      .from("gastos")
      .delete()
      .eq("id", deleteGastoTarget.id);
    if (error) showError(error.message);
    else loadGastos();
  };

  const openEditGasto = async (g: any) => {
    setEditingGasto(g);
    setGastoNombre(g.nombre);
    setGastoMonto(String(g.monto));
    setGastoCategoria(g.categoria ?? "comida");
    setGastoPagadoPor(g.pagado_por);
    // Load existing participantes for this gasto
    if (g.categoria !== "comida") {
      const existing = gastosPartMap[g.id] ?? {};
      const map: Record<string, boolean> = {};
      participaciones.forEach((p) => {
        map[p.id] = existing[p.id] !== undefined ? existing[p.id] : true;
      });
      setGastoParticipantes(map);
    } else {
      setGastoParticipantes({});
    }
    setShowAddGastoModal(true);
  };

  const handleSaveGasto = async () => {
    const monto = parseFloat(gastoMonto.replace(/\./g, "").replace(",", "."));
    if (!gastoNombre.trim()) {
      showError(t("tripDetail.gastos.errors.noNombre"));
      return;
    }
    if (isNaN(monto) || monto <= 0) {
      showError(t("tripDetail.gastos.errors.noMonto"));
      return;
    }
    if (!gastoPagadoPor) {
      showError(t("tripDetail.gastos.errors.noPagador"));
      return;
    }
    setSavingGasto(true);

    if (editingGasto) {
      // UPDATE
      const { error } = await supabase
        .from("gastos")
        .update({
          nombre: gastoNombre.trim(),
          monto,
          categoria: gastoCategoria,
          pagado_por: gastoPagadoPor,
        })
        .eq("id", editingGasto.id);
      if (error) {
        showError(error.message);
        setSavingGasto(false);
        return;
      }

      // Update participantes_gasto if non-comida
      if (gastoCategoria !== "comida") {
        await supabase
          .from("participantes_gasto")
          .delete()
          .eq("gasto_id", editingGasto.id);
        const rows = participaciones.map((p) => ({
          gasto_id: editingGasto.id,
          participacion_id: p.id,
          activo:
            gastoParticipantes[p.id] !== undefined
              ? gastoParticipantes[p.id]
              : true,
        }));
        await supabase.from("participantes_gasto").insert(rows);
      }
    } else {
      // INSERT
      const { data: newGasto, error } = await supabase
        .from("gastos")
        .insert({
          paseo_id: id,
          nombre: gastoNombre.trim(),
          monto,
          categoria: gastoCategoria,
          pagado_por: gastoPagadoPor,
        })
        .select()
        .single();
      if (error) {
        showError(error.message);
        setSavingGasto(false);
        return;
      }

      if (gastoCategoria !== "comida" && newGasto) {
        const rows = participaciones.map((p) => ({
          gasto_id: newGasto.id,
          participacion_id: p.id,
          activo:
            gastoParticipantes[p.id] !== undefined
              ? gastoParticipantes[p.id]
              : true,
        }));
        await supabase.from("participantes_gasto").insert(rows);
      }
    }

    setGastoNombre("");
    setGastoMonto("");
    setGastoCategoria("comida");
    setGastoPagadoPor(null);
    setGastoParticipantes({});
    setEditingGasto(null);
    setShowAddGastoModal(false);
    loadGastos();
    setSavingGasto(false);
  };

  // ─────────────────────────────────────────────
  // Gastos calculations — by category
  // ─────────────────────────────────────────────


  // For a given familia and category, calculate how much they owe
  const leCorrespondePorCategoria = (
    familiaId: string,
    categoria: string,
    usaMomentos: boolean,
  ): number => {
    const miembros =
      familiaId === "__sin_familia__"
        ? participaciones.filter((p) => !p.familia_id)
        : participaciones.filter((p) => p.familia_id === familiaId);

    const gastosCat = gastos.filter((g) => g.categoria === categoria);
    if (gastosCat.length === 0) return 0;

    if (usaMomentos && momentos.length > 0) {
      // COMIDA: split proportional to porciones (weight of each meal), then by active factor
      const totalCat = gastosCat.reduce((sum, g) => sum + g.monto, 0);
      const totalPorciones = momentos.reduce((s, m) => s + (m.porciones ?? 1), 0) || 1;
      let total = 0;
      momentos.forEach((m) => {
        const costoMomento = totalCat * ((m.porciones ?? 1) / totalPorciones);
        const registros = participantesComidaMap[m.id] ?? {};
        const factorActivoFamilia = miembros.reduce((sum, p) => {
          const activo = registros[p.id] !== undefined ? registros[p.id] : true;
          return sum + (activo ? (p.factor ?? 1) : 0);
        }, 0);
        const factorActivoTotal = participaciones.reduce((sum, p) => {
          const activo =
            (participantesComidaMap[m.id] ?? {})[p.id] !== undefined
              ? (participantesComidaMap[m.id] ?? {})[p.id]
              : true;
          return sum + (activo ? (p.factor ?? 1) : 0);
        }, 0);
        if (factorActivoTotal > 0)
          total += costoMomento * (factorActivoFamilia / factorActivoTotal);
      });
      return total;
    }

    // NON-COMIDA: each gasto has its own participant list, prorated by days present
    const totalTripDays = paseo
      ? daysInRange(paseo.fecha_inicio, paseo.fecha_fin)
      : 1;
    let total = 0;
    gastosCat.forEach((g) => {
      const registros = gastosPartMap[g.id] ?? {};
      const allActive = Object.keys(registros).length === 0;

      const weightOf = (p: any) => {
        const activo = allActive
          ? true
          : registros[p.id] !== undefined
            ? registros[p.id]
            : true;
        if (!activo) return 0;
        const daysP = paseo
          ? daysInRange(
              p.fecha_desde ?? paseo.fecha_inicio,
              p.fecha_hasta ?? paseo.fecha_fin,
            )
          : totalTripDays;
        return (p.factor ?? 1) * (daysP / totalTripDays);
      };

      const weightedFamilia = miembros.reduce((sum, p) => sum + weightOf(p), 0);
      const weightedTotal = participaciones.reduce(
        (sum, p) => sum + weightOf(p),
        0,
      );
      if (weightedTotal > 0)
        total += g.monto * (weightedFamilia / weightedTotal);
    });
    return total;
  };

  // Returns per-familia balance data grouped by category
  const calcularBalancesPorCategoria = () => {
    const personaToFamiliaId: Record<string, string> = {};
    participaciones.forEach((p) => {
      personaToFamiliaId[p.persona_id] = p.familia_id ?? "__sin_familia__";
    });

    // Build familia list
    const famIds: { id: string; nombre: string; factorTotal: number }[] = [];
    familiasList.forEach((fam) => {
      const miembros = participaciones.filter((p) => p.familia_id === fam.id);
      if (miembros.length === 0) return;
      famIds.push({
        id: fam.id,
        nombre: fam.nombre,
        factorTotal: miembros.reduce((s, p) => s + (p.factor ?? 1), 0),
      });
    });
    const sinFam = participaciones.filter((p) => !p.familia_id);
    if (sinFam.length > 0)
      famIds.push({
        id: "__sin_familia__",
        nombre: t("tripDetail.gastos.sinFamilia"),
        factorTotal: sinFam.reduce((s, p) => s + (p.factor ?? 1), 0),
      });

    // puso por familia
    const pusoMap: Record<string, number> = {};
    famIds.forEach((f) => {
      pusoMap[f.id] = 0;
    });
    gastos.forEach((g) => {
      const fId = personaToFamiliaId[g.pagado_por];
      if (fId && pusoMap[fId] !== undefined) pusoMap[fId] += g.monto;
    });

    // leCorresponde total (sum across categories)
    const leCorrespondeMap: Record<string, number> = {};
    famIds.forEach((f) => {
      leCorrespondeMap[f.id] = GASTO_CATEGORIAS.reduce((sum, cat) => {
        const hasCat = gastos.some((g) => g.categoria === cat.key);
        return (
          sum +
          (hasCat
            ? leCorrespondePorCategoria(f.id, cat.key, cat.usaMomentos)
            : 0)
        );
      }, 0);
    });

    return famIds.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      factorTotal: f.factorTotal,
      puso: pusoMap[f.id] ?? 0,
      leCorresponde: leCorrespondeMap[f.id] ?? 0,
      balance: (pusoMap[f.id] ?? 0) - (leCorrespondeMap[f.id] ?? 0),
      porCategoria: GASTO_CATEGORIAS.map((cat) => ({
        key: cat.key,
        label: cat.label,
        leCorresponde: leCorrespondePorCategoria(
          f.id,
          cat.key,
          cat.usaMomentos,
        ),
        total: gastos
          .filter((g) => g.categoria === cat.key)
          .reduce((s, g) => s + g.monto, 0),
      })).filter((c) => c.total > 0),
    }));
  };

  const calcularLiquidaciones = () =>
    calcularTransferenciasMinimas(calcularBalancesPorCategoria());

  // ─────────────────────────────────────────────
  // Balance por persona
  // ─────────────────────────────────────────────
  const calcularBalancesPorPersona = () => {
    return participaciones.map((p) => {
      const famId = p.familia_id ?? "__sin_familia__";

      // Calculate each person's share directly per gasto — respecting their individual participation
      const acumuladoPorCat: Record<string, number> = {};

      GASTO_CATEGORIAS.forEach((cat) => {
        const gastosCat = gastos.filter((g) => g.categoria === cat.key);
        if (gastosCat.length === 0) return;

        if (cat.usaMomentos && momentos.length > 0) {
          // COMIDA: proportional by porciones, then weighted by active factor per moment
          const totalCat = gastosCat.reduce((s, g) => s + g.monto, 0);
          const totalPorciones = momentos.reduce((s, m) => s + (m.porciones ?? 1), 0) || 1;
          let total = 0;
          momentos.forEach((m) => {
            const costoMomento = totalCat * ((m.porciones ?? 1) / totalPorciones);
            const registros = participantesComidaMap[m.id] ?? {};
            const personaActiva =
              registros[p.id] !== undefined ? registros[p.id] : true;
            if (!personaActiva) return;
            const factorPersona = p.factor ?? 1;
            const factorActivoTotal = participaciones.reduce((s, q) => {
              const activo =
                (participantesComidaMap[m.id] ?? {})[q.id] !== undefined
                  ? (participantesComidaMap[m.id] ?? {})[q.id]
                  : true;
              return s + (activo ? (q.factor ?? 1) : 0);
            }, 0);
            if (factorActivoTotal > 0)
              total += costoMomento * (factorPersona / factorActivoTotal);
          });
          acumuladoPorCat[cat.key] = total;
        } else {
          // NON-COMIDA: per gasto, check if this person is active in that specific gasto
          let total = 0;
          gastosCat.forEach((g) => {
            const registros = gastosPartMap[g.id] ?? {};
            const allActive = Object.keys(registros).length === 0;
            const personaActiva = allActive
              ? true
              : registros[p.id] !== undefined
                ? registros[p.id]
                : true;
            if (!personaActiva) return;
            const factorPersona = p.factor ?? 1;
            const factorActivoTotal = participaciones.reduce((s, q) => {
              const activo = allActive
                ? true
                : registros[q.id] !== undefined
                  ? registros[q.id]
                  : true;
              return s + (activo ? (q.factor ?? 1) : 0);
            }, 0);
            if (factorActivoTotal > 0)
              total += g.monto * (factorPersona / factorActivoTotal);
          });
          acumuladoPorCat[cat.key] = total;
        }
      });

      const leCorrespondePorCat = GASTO_CATEGORIAS.map((cat) => ({
        key: cat.key,
        label: cat.label,
        leCorresponde: acumuladoPorCat[cat.key] ?? 0,
        total: gastos
          .filter((g) => g.categoria === cat.key)
          .reduce((s, g) => s + g.monto, 0),
      })).filter((c) => c.total > 0 && c.leCorresponde > 0);

      const leCorrespondeTotal = Object.values(acumuladoPorCat).reduce(
        (s, v) => s + v,
        0,
      );

      const puso = gastos
        .filter((g) => g.pagado_por === p.persona_id)
        .reduce((s, g) => s + g.monto, 0);

      return {
        id: p.id,
        persona_id: p.persona_id,
        nombre: p.personas?.nombre ?? "",
        foto_url: p.personas?.foto_url ?? null,
        familia_id: famId,
        factor: p.factor ?? 1,
        puso,
        leCorresponde: leCorrespondeTotal,
        balance: puso - leCorrespondeTotal,
        porCategoria: leCorrespondePorCat,
      };
    });
  };

  // ─────────────────────────────────────────────
  // Export
  // ─────────────────────────────────────────────

  const generarTextoResumen = () => {
    const bxf = calcularBalancesPorCategoria();
    const bxp = calcularBalancesPorPersona();
    const liq = calcularLiquidaciones();
    const lines: string[] = [];

    lines.push(`PASEO: ${paseo?.nombre ?? ""}`);
    lines.push(
      `${paseo?.lugar ?? ""} · ${paseo?.fecha_inicio} → ${paseo?.fecha_fin}`,
    );
    lines.push(`Total gastos: ${formatCOP(totalGastado)}`);
    lines.push("");

    // Balance por familia
    lines.push(`═══ ${t("tripDetail.gastos.balancePorFamilia").toUpperCase()} ═══`);
    bxf.forEach((b) => {
      const signo = b.balance >= 0 ? "+" : "";
      lines.push(`${b.nombre} (${t("tripDetail.gastos.factor", { factor: b.factorTotal.toFixed(1) })})`);
      lines.push(
        `  ${t("tripDetail.gastos.puso")}: ${formatCOP(b.puso)}  |  ${t("tripDetail.gastos.leCorresponde")}: ${formatCOP(b.leCorresponde)}  |  Balance: ${signo}${formatCOP(b.balance)}`,
      );
      b.porCategoria.forEach((cat) => {
        lines.push(`    ${cat.label}: ${formatCOP(cat.leCorresponde)}`);
      });
    });
    lines.push("");

    // Resumen por persona
    lines.push(`═══ ${t("tripDetail.gastos.resumenPorPersona").toUpperCase()} ═══`);
    familiasList.forEach((fam) => {
      const miembros = bxp.filter((p) => p.familia_id === fam.id);
      if (miembros.length === 0) return;
      lines.push(`▸ ${fam.nombre}`);
      miembros.forEach((p) => {
        const signo = p.balance >= 0 ? "+" : "";
        lines.push(`  ${p.nombre} (${t("tripDetail.gastos.factor", { factor: p.factor })})`);
        lines.push(
          `    ${t("tripDetail.gastos.puso")}: ${formatCOP(p.puso)}  |  ${t("tripDetail.gastos.leCorresponde")}: ${formatCOP(p.leCorresponde)}  |  Balance: ${signo}${formatCOP(p.balance)}`,
        );
        p.porCategoria.forEach((cat) => {
          lines.push(`      ${cat.label}: ${formatCOP(cat.leCorresponde)}`);
        });
      });
    });
    lines.push("");

    // Liquidaciones
    lines.push(`═══ ${t("tripDetail.gastos.liquidacionesTitle").toUpperCase()} ═══`);
    if (liq.length === 0) {
      lines.push(t("tripDetail.gastos.todoCuadrado") + " " + t("tripDetail.gastos.sinDeudas"));
    } else {
      liq.forEach((liqItem) => {
        lines.push(`${liqItem.de} → ${liqItem.para}: ${formatCOP(liqItem.monto)}`);
      });
    }

    return lines.join("\n");
  };

  const generarHTML = () => {
    const bxf = calcularBalancesPorCategoria();
    const bxp = calcularBalancesPorPersona();
    const liq = calcularLiquidaciones();

    const familiasHTML = bxf
      .map((b) => {
        const isPos = b.balance >= 0;
        const color = isPos ? "#16a34a" : "#DC2626";
        const catRows = b.porCategoria
          .map(
            (cat) =>
              `<tr><td style="padding:4px 8px;color:#64748b;font-size:12px">${cat.label}</td><td style="padding:4px 8px;text-align:right;font-size:12px">${formatCOP(cat.leCorresponde)}</td></tr>`,
          )
          .join("");
        return `
        <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div>
              <div style="font-weight:700;font-size:15px;color:#1e293b">${b.nombre}</div>
              <div style="font-size:11px;color:#94a3b8">Factor ${b.factorTotal.toFixed(1)}</div>
            </div>
            <div style="font-weight:800;font-size:16px;color:${color}">${isPos ? "+" : ""}${formatCOP(b.balance)}</div>
          </div>
          <div style="display:flex;gap:12px;margin-bottom:8px;background:#f8fafc;border-radius:8px;padding:10px">
            <div style="flex:1;text-align:center"><div style="font-size:10px;color:#94a3b8;font-weight:600">PUSO</div><div style="font-weight:700;font-size:13px">${formatCOP(b.puso)}</div></div>
            <div style="width:1px;background:#e2e8f0"></div>
            <div style="flex:1;text-align:center"><div style="font-size:10px;color:#94a3b8;font-weight:600">LE CORRESPONDE</div><div style="font-weight:700;font-size:13px">${formatCOP(b.leCorresponde)}</div></div>
          </div>
          ${catRows ? `<table style="width:100%;border-collapse:collapse">${catRows}</table>` : ""}
        </div>`;
      })
      .join("");

    const personasHTML = familiasList
      .map((fam, fidx) => {
        const color = UF_COLORS[fidx % UF_COLORS.length];
        const miembros = bxp.filter((p) => p.familia_id === fam.id);
        if (miembros.length === 0) return "";
        const miembrosHTML = miembros
          .map((p) => {
            const isPos = p.balance >= 0;
            const pColor = isPos ? "#16a34a" : "#DC2626";
            const catRows = p.porCategoria
              .map(
                (cat) =>
                  `<tr><td style="padding:3px 8px;color:#64748b;font-size:11px">${cat.label}</td><td style="padding:3px 8px;text-align:right;font-size:11px">${formatCOP(cat.leCorresponde)}</td></tr>`,
              )
              .join("");
            return `
          <div style="background:#fff;border-radius:10px;padding:12px;margin-bottom:8px;border:1px solid #f1f5f9">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <div>
                <div style="font-weight:700;font-size:14px;color:#1e293b">${p.nombre}</div>
                <div style="font-size:11px;color:#94a3b8">Factor ${p.factor}</div>
              </div>
              <div style="font-weight:800;font-size:14px;color:${pColor}">${isPos ? "+" : ""}${formatCOP(p.balance)}</div>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:6px;background:#f8fafc;border-radius:6px;padding:8px;font-size:12px">
              <div style="flex:1;text-align:center"><div style="font-size:9px;color:#94a3b8;font-weight:600">PUSO</div><div style="font-weight:700">${formatCOP(p.puso)}</div></div>
              <div style="width:1px;background:#e2e8f0"></div>
              <div style="flex:1;text-align:center"><div style="font-size:9px;color:#94a3b8;font-weight:600">LE CORRESPONDE</div><div style="font-weight:700">${formatCOP(p.leCorresponde)}</div></div>
            </div>
            ${catRows ? `<table style="width:100%;border-collapse:collapse">${catRows}</table>` : ""}
          </div>`;
          })
          .join("");
        return `
        <div style="border-left:4px solid ${color};padding-left:12px;margin-bottom:20px">
          <div style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">${fam.nombre}</div>
          ${miembrosHTML}
        </div>`;
      })
      .join("");

    const liquidacionesHTML =
      liq.length === 0
        ? `<div style="text-align:center;padding:24px;color:#16a34a;font-weight:700">✅ ¡Todo cuadrado! No hay deudas pendientes.</div>`
        : liq
            .map(
              (t) => `
          <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-weight:700;color:#DC2626">${t.de}</span>
              <span style="color:#94a3b8;font-size:18px">→</span>
              <span style="font-weight:700;color:#16a34a">${t.para}</span>
            </div>
            <span style="font-weight:800;font-size:16px;color:#1B4F72">${formatCOP(t.monto)}</span>
          </div>`,
            )
            .join("");

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f1f5f9;margin:0;padding:20px;color:#1e293b}
      h2{font-size:22px;font-weight:800;margin:0 0 4px}
      h3{font-size:16px;font-weight:700;margin:24px 0 12px;color:#1B4F72;border-bottom:2px solid #1B4F72;padding-bottom:6px}
      .sub{font-size:13px;color:#64748b;margin-bottom:4px}.total{font-size:14px;font-weight:700;color:#1B4F72;margin-bottom:20px}</style>
      </head><body>
      <h2>${paseo?.nombre ?? "Paseo"}</h2>
      <div class="sub">${paseo?.lugar ?? ""} · ${paseo?.fecha_inicio} → ${paseo?.fecha_fin}</div>
      <div class="total">Total gastos: ${formatCOP(totalGastado)}</div>
      <h3>Balance por familia</h3>${familiasHTML}
      <h3>Resumen por persona</h3>${personasHTML}
      <h3>Liquidaciones</h3>${liquidacionesHTML}
      </body></html>`;
  };

  const loadLiquidacionesPagadas = async () => {
    const { data } = await supabase
      .from("liquidaciones_pagadas")
      .select("*")
      .eq("paseo_id", id);
    const map: Record<string, boolean> = {};
    (data ?? []).forEach((r: any) => {
      map[`${r.de_familia_id}_${r.para_familia_id}`] = r.pagado;
    });
    setLiquidacionesPagadas(map);
  };

  const toggleLiquidacionPagada = async (liq: {
    deFamId: string;
    paraFamId: string;
    monto: number;
  }) => {
    const key = `${liq.deFamId}_${liq.paraFamId}`;
    const currentVal = liquidacionesPagadas[key] ?? false;
    const newVal = !currentVal;
    setSavingLiquidacion(true);
    setLiquidacionesPagadas((prev) => ({ ...prev, [key]: newVal }));
    await supabase.from("liquidaciones_pagadas").upsert(
      {
        paseo_id: id,
        de_familia_id: liq.deFamId,
        para_familia_id: liq.paraFamId,
        monto: liq.monto,
        pagado: newVal,
      },
      { onConflict: "paseo_id,de_familia_id,para_familia_id" },
    );
    setSavingLiquidacion(false);
  };

  const handleMarcarLiquidado = async () => {
    const { error } = await supabase
      .from("paseos")
      .update({ estado: "liquidado" })
      .eq("id", id);
    if (error) showError(error.message);
    else loadTripData();
  };

  const compartirInvitacion = async () => {
    try {
      const { Share } = await import("react-native");
      await Share.share({
        message: t("trips.shareMessage", {
          name: paseo?.nombre ?? "",
          place: paseo?.lugar ?? "",
          start: paseo?.fecha_inicio ?? "",
          end: paseo?.fecha_fin ?? "",
          code: paseo?.codigo_invitacion ?? "",
        }),
        title: t("trips.shareTitle", { name: paseo?.nombre ?? "" }),
      });
    } catch {
      /* user cancelled */
    }
  };

  const compartirTexto = async () => {
    const texto = generarTextoResumen();
    const { Share } = await import("react-native");
    await Share.share({
      message: texto,
      title: `Liquidación — ${paseo?.nombre}`,
    });
  };

  const generarHTMLMenu = () => {
    const MEAL_ICONS: Record<string, string> = {
      desayuno: "☀️",
      "medias nueves": "🥐",
      almuerzo: "🍽️",
      onces: "☕",
      cena: "🌙",
      snack: "🥤",
    };
    const MEAL_COLORS: Record<string, string> = {
      desayuno: "#F59E0B",
      "medias nueves": "#F97316",
      almuerzo: "#3B82F6",
      onces: "#8B5CF6",
      cena: "#1B4F72",
      snack: "#10B981",
    };

    // ── Part 1: daily schedule ──
    const diasHTML = fechas
      .map((fecha) => {
        const comidas = momentos
          .filter((m) => m.fecha === fecha)
          .sort((a, b) => TIPOS_COMIDA.indexOf(a.tipo_comida) - TIPOS_COMIDA.indexOf(b.tipo_comida));
        if (comidas.length === 0) return "";
        const d = new Date(fecha + "T12:00:00");
        const labelDia = d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
        const comidasHTML = comidas
          .map((m) => {
            const icon = MEAL_ICONS[m.tipo_comida] ?? "🍴";
            const color = MEAL_COLORS[m.tipo_comida] ?? "#1B4F72";
            const nombre = m.recetas?.nombre ?? "Sin receta";
            const porciones = m.porciones ?? participaciones.length;
            const tipo = m.tipo_comida.charAt(0).toUpperCase() + m.tipo_comida.slice(1);
            return `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9">
              <div style="width:36px;height:36px;border-radius:10px;background:${color}22;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${icon}</div>
              <div style="flex:1">
                <div style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.5px">${tipo}</div>
                <div style="font-size:14px;font-weight:600;color:#1e293b;margin-top:1px">${nombre}</div>
              </div>
              <div style="font-size:11px;color:#94a3b8;text-align:right;flex-shrink:0">${porciones} porciones</div>
            </div>`;
          })
          .join("");
        return `
        <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
          <div style="font-size:15px;font-weight:700;color:#1B4F72;margin-bottom:4px;text-transform:capitalize">${labelDia}</div>
          <div>${comidasHTML}</div>
        </div>`;
      })
      .join("");

    // ── Part 2: recipe detail pages (deduplicated by recipe id) ──
    const seenIds = new Set<string>();
    const recetasHTML = momentos
      .filter((m) => m.recetas?.id && !seenIds.has(m.recetas.id) && seenIds.add(m.recetas.id))
      .map((m) => {
        const r = m.recetas;
        const porciones = m.porciones ?? participaciones.length;
        const base = r.porciones_base ?? 1;
        const factor = porciones / base;
        const icon = MEAL_ICONS[m.tipo_comida] ?? "🍴";
        const color = MEAL_COLORS[m.tipo_comida] ?? "#1B4F72";

        // Scaled ingredients table
        const ings = (r.receta_ingredientes ?? []) as any[];
        const ingsHTML = ings.length > 0
          ? `<table style="width:100%;border-collapse:collapse;margin-top:8px">
              <thead>
                <tr style="border-bottom:2px solid #e2e8f0">
                  <th style="text-align:left;padding:6px 4px;font-size:11px;color:#64748b;font-weight:700">INGREDIENTE</th>
                  <th style="text-align:right;padding:6px 4px;font-size:11px;color:#64748b;font-weight:700">CANTIDAD</th>
                  <th style="text-align:left;padding:6px 4px;font-size:11px;color:#64748b;font-weight:700">UNIDAD</th>
                </tr>
              </thead>
              <tbody>
                ${ings.map((ri) => {
                  const total = Math.round(ri.cantidad_por_porcion * base * factor * 100) / 100;
                  return `<tr style="border-bottom:1px solid #f1f5f9">
                    <td style="padding:7px 4px;font-size:13px;color:#1e293b">${ri.ingredientes?.nombre ?? ""}</td>
                    <td style="padding:7px 4px;font-size:13px;font-weight:700;color:#1B4F72;text-align:right">${total}</td>
                    <td style="padding:7px 4px;font-size:13px;color:#64748b">${ri.ingredientes?.unidad_base ?? ""}</td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>`
          : "";

        // Preparation steps
        const pasos = r.instrucciones ? (r.instrucciones as string).split("\n").filter(Boolean) : [];
        const pasosHTML = pasos.length > 0
          ? pasos.map((paso: string, i: number) => `
              <div style="display:flex;gap:12px;margin-bottom:12px">
                <div style="width:26px;height:26px;border-radius:13px;background:#1B4F72;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${i + 1}</div>
                <div style="flex:1;font-size:13px;color:#374151;line-height:1.6;padding-top:4px">${paso}</div>
              </div>`).join("")
          : `<p style="font-size:13px;color:#94a3b8;font-style:italic">Sin instrucciones registradas.</p>`;

        // Time + utensilios chips
        const tiempoPre = r.tiempo_preparacion ?? 0;
        const tiempoCoc = r.tiempo_coccion ?? 0;
        const totalMin = tiempoPre + tiempoCoc;
        const metaChips = [
          totalMin > 0 ? `<span style="background:#EFF6FF;color:#1B4F72;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700">⏱ ${totalMin} min</span>` : "",
          `<span style="background:#F0FDF4;color:#16a34a;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700">🍽 ${porciones} porciones</span>`,
        ].filter(Boolean).join(" ");

        const utensHTML = r.utensilios && (r.utensilios as string[]).length > 0
          ? `<div style="margin-top:16px">
              <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Utensilios</div>
              <div>${(r.utensilios as string[]).map((u) => `<span style="background:#f1f5f9;color:#475569;padding:3px 8px;border-radius:12px;font-size:12px;margin-right:6px;margin-bottom:4px;display:inline-block">${u}</span>`).join("")}</div>
            </div>`
          : "";

        return `
        <div style="page-break-before:always;padding-top:8px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
            <span style="font-size:22px">${icon}</span>
            <div>
              <div style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.5px">${m.tipo_comida.charAt(0).toUpperCase() + m.tipo_comida.slice(1)}</div>
              <div style="font-size:20px;font-weight:800;color:#1e293b">${r.nombre}</div>
            </div>
          </div>
          ${r.descripcion ? `<p style="font-size:13px;color:#64748b;margin:4px 0 12px">${r.descripcion}</p>` : ""}
          <div style="margin-bottom:16px">${metaChips}</div>

          <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
            <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">🛒 Ingredientes</div>
            ${ingsHTML || '<p style="font-size:13px;color:#94a3b8;font-style:italic">Sin ingredientes registrados.</p>'}
          </div>

          <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
            <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">📋 Preparación</div>
            ${pasosHTML}
          </div>
          ${utensHTML}
        </div>`;
      })
      .join("");

    return `<!DOCTYPE html>
    <html><head><meta charset="utf-8">
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:24px;background:#f8fafc;color:#1e293b}
      @media print{body{background:#fff;padding:12px}}
    </style>
    </head><body>
    <div style="max-width:640px;margin:0 auto">
      <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #1B4F72">
        <div style="font-size:26px;font-weight:800;color:#1B4F72">${paseo?.nombre ?? "Paseo"}</div>
        <div style="font-size:13px;color:#94a3b8;margin-top:4px">Menú del Paseo</div>
      </div>
      ${diasHTML || '<div style="text-align:center;padding:32px;color:#94a3b8">Sin comidas programadas</div>'}
      ${recetasHTML}
    </div>
    </body></html>`;
  };

  const compartirMenuPDF = async () => {
    setExportando(true);
    try {
      const html = generarHTMLMenu();
      if (Platform.OS === "web") {
        const w = window.open("", "_blank");
        if (w) { w.document.write(html); w.document.close(); }
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        const safeName = (paseo?.nombre ?? "Paseo").replace(/[^a-zA-Z0-9_\- ]/g, "");
        const dest = new FSFile(Paths.cache, `Menu - ${safeName}.pdf`);
        new FSFile(uri).copy(dest);
        await Sharing.shareAsync(dest.uri, {
          mimeType: "application/pdf",
          dialogTitle: `Menú — ${paseo?.nombre}`,
        });
      }
    } catch (e) {
      showError(t("tripDetail.errors.noPdfError"));
    }
    setExportando(false);
  };

  const compartirPDF = async () => {
    setExportando(true);
    try {
      const html = generarHTML();
      if (Platform.OS === "web") {
        const w = window.open("", "_blank");
        if (w) { w.document.write(html); w.document.close(); }
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        const safeName = (paseo?.nombre ?? "Paseo").replace(/[^a-zA-Z0-9_\- ]/g, "");
        const dest = new FSFile(Paths.cache, `Gastos - ${safeName}.pdf`);
        new FSFile(uri).copy(dest);
        await Sharing.shareAsync(dest.uri, {
          mimeType: "application/pdf",
          dialogTitle: `Gastos — ${paseo?.nombre}`,
        });
      }
    } catch (e) {
      showError(t("tripDetail.errors.noPdfError"));
    }
    setExportando(false);
  };

  // ─────────────────────────────────────────────
  // Derived data
  // ─────────────────────────────────────────────
  // Derived data
  // ─────────────────────────────────────────────
  const momentosDelDia = momentos
    .filter((m) => m.fecha === fechaActiva)
    .sort(
      (a, b) =>
        TIPOS_COMIDA.indexOf(a.tipo_comida) -
        TIPOS_COMIDA.indexOf(b.tipo_comida),
    );

  const estadoConfig =
    ESTADO_CONFIG[paseo?.estado] ?? ESTADO_CONFIG["planificacion"];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const balancesPorFamilia = useMemo(() => calcularBalancesPorCategoria(), [gastos, participaciones, momentos, participantesComidaMap, gastosPartMap, paseo, familiasList]);
  const liquidaciones = useMemo(() => calcularTransferenciasMinimas(balancesPorFamilia), [balancesPorFamilia]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const balancesPorPersona = useMemo(() => calcularBalancesPorPersona(), [gastos, participaciones, momentos, participantesComidaMap, gastosPartMap]);
  const totalGastado = gastos.reduce((sum, g) => sum + g.monto, 0);

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#1B4F72" />
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* HEADER */}
        <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>{t("tripDetail.back")}</Text>
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.tabsScroll, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
          contentContainerStyle={styles.tabs}
        >
          {(["resumen", "gente", "menu", "gastos", "info"] as const).map((tabKey) => (
            <TouchableOpacity
              key={tabKey}
              style={[styles.tab, activeTab === tabKey && [styles.tabActive, { borderBottomColor: theme.tabActive }]]}
              onPress={() => setActiveTab(tabKey)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: theme.tabInactive },
                  activeTab === tabKey && [styles.tabTextActive, { color: theme.tabActive }],
                ]}
              >
                {t(`tripDetail.tabs.${tabKey}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Estado banner — planificacion / liquidado */}
        {paseo?.estado === "planificacion" && (
          <View style={styles.estadoBanner}>
            <Text style={styles.estadoBannerText}>
              {t("tripDetail.planificacionBanner")}
            </Text>
          </View>
        )}
        {paseo?.estado === "liquidado" && (
          <View style={[styles.estadoBanner, styles.estadoBannerLiquidado]}>
            <Text style={[styles.estadoBannerText, styles.estadoBannerLiquidadoText]}>
              {t("tripDetail.liquidadoBanner")}
            </Text>
          </View>
        )}

        {/* ══════════════════════════════════════
            RESUMEN TAB
        ══════════════════════════════════════ */}
        {activeTab === "resumen" && (
          <ScrollView style={styles.flex1} contentContainerStyle={styles.content}>
            {/* Photo banner */}
            <TouchableOpacity
              style={styles.tripPhotoContainer}
              onPress={() => setShowPhotoModal(true)}
              disabled={!isOrganizer}
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
                  <Text style={styles.tripPhotoText}>{t("tripDetail.addPhotoHint")}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.statNumber, { color: theme.primary }]}>{participaciones.length}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t("tripDetail.stats.attendees")}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.statNumber, { color: theme.primary }]}>{momentos.length}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t("tripDetail.stats.meals")}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.statNumber, { color: theme.primary }]}>{familiasList.length}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t("tripDetail.stats.families")}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.statNumber, { color: theme.primary }]}>{formatCOP(totalGastado)}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t("tripDetail.stats.spent")}</Text>
              </View>
            </View>

            {/* Quick info */}
            <View style={[styles.section, { backgroundColor: theme.surface }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>{t("tripDetail.info.lugar")}</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{paseo?.lugar}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>{t("tripDetail.info.fechas")}</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {paseo?.fecha_inicio} → {paseo?.fecha_fin}
                </Text>
              </View>
              {organizadorNombre ? (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>{t("tripDetail.info.organizador")}</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{organizadorNombre}</Text>
                </View>
              ) : null}
              {fechas.length > 0 && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>{t("tripDetail.info.duracion")}</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{t("tripDetail.info.dia", { count: fechas.length })}</Text>
                </View>
              )}
            </View>

            {/* Invite card */}
            <View style={styles.inviteCard}>
              <Text style={styles.inviteLabel}>{t("tripDetail.invite.label")}</Text>
              <Text style={styles.inviteCode}>{paseo?.codigo_invitacion}</Text>
              <TouchableOpacity
                style={styles.inviteShareBtn}
                onPress={compartirInvitacion}
              >
                <Text style={styles.inviteShareBtnText}>{t("tripDetail.invite.shareBtn")}</Text>
              </TouchableOpacity>
            </View>

            {/* Próximas comidas */}
            {momentos.length > 0 && (() => {
              const today = new Date().toISOString().split("T")[0];
              const proximas = momentos
                .filter((m) => m.fecha >= today)
                .slice(0, 3);
              if (proximas.length === 0) return null;
              return (
                <View style={[styles.section, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("tripDetail.proximasComidas")}</Text>
                  {proximas.map((m) => {
                    const cfg = TIPO_CONFIG[m.tipo_comida] ?? TIPO_CONFIG["almuerzo"];
                    return (
                      <View key={m.id} style={[styles.proximaRow, { borderBottomColor: theme.borderLight }]}>
                        <Text style={styles.proximaEmoji}>{cfg.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.proximaLabel, { color: theme.text }]}>
                            {m.tipo_comida} · {m.fecha}
                          </Text>
                          {m.recetas?.nombre && (
                            <Text style={[styles.proximaReceta, { color: theme.textSecondary }]}>{m.recetas.nombre}</Text>
                          )}
                        </View>
                        <Text style={[styles.proximaPorciones, { color: theme.textTertiary }]}>{m.porciones}p</Text>
                      </View>
                    );
                  })}
                </View>
              );
            })()}

            {/* Delete trip */}
            {isOrganizer && (
              <TouchableOpacity
                style={styles.deleteTripBtn}
                onPress={() => setShowDeleteTripModal(true)}
              >
                <Text style={styles.deleteTripText}>{t("tripDetail.deleteTripBtn")}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {/* ══════════════════════════════════════
            INFO TAB
        ══════════════════════════════════════ */}
        {activeTab === "info" && (
          <ScrollView style={styles.flex1} contentContainerStyle={styles.content}>
            <TouchableOpacity
              style={styles.tripPhotoContainer}
              onPress={() => setShowPhotoModal(true)}
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
                    {t("tripDetail.addTripPhotoHint")}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={[styles.section, { backgroundColor: theme.surface }]}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("tripDetail.info.titulo")}</Text>
                {editing ? (
                  <View style={styles.editActions}>
                    <TouchableOpacity onPress={() => setEditing(false)}>
                      <Text style={styles.cancelText}>{t("common.cancel")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={handleSaveInfo}
                      disabled={saving}
                    >
                      <Text style={styles.saveBtnText}>
                        {saving ? "..." : t("common.save")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => setEditing(true)}>
                    <Text style={styles.editText}>{t("tripDetail.info.editar")}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {editing ? (
                <>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>{t("tripDetail.info.nombre")}</Text>
                    <TextInput
                      style={styles.input}
                      value={editNombre}
                      onChangeText={setEditNombre}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>{t("tripDetail.info.lugar_label")}</Text>
                    <TextInput
                      style={styles.input}
                      value={editLugar}
                      onChangeText={setEditLugar}
                    />
                  </View>
                  <View style={styles.row}>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>{t("tripDetail.info.fechaInicio")}</Text>
                      <TextInput
                        style={styles.input}
                        value={editFechaInicio}
                        onChangeText={(v) => setEditFechaInicio(formatDateInput(v))}
                        placeholder="AAAA-MM-DD"
                        keyboardType="number-pad"
                        maxLength={10}
                      />
                    </View>
                    <View style={{ width: 8 }} />
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>{t("tripDetail.info.fechaFin")}</Text>
                      <TextInput
                        style={styles.input}
                        value={editFechaFin}
                        onChangeText={(v) => setEditFechaFin(formatDateInput(v))}
                        placeholder="AAAA-MM-DD"
                        keyboardType="number-pad"
                        maxLength={10}
                      />
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>{t("tripDetail.info.linkAlojamiento")}</Text>
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
                      {t("tripDetail.info.recomendaciones")}
                    </Text>
                    <TextInput
                      style={[styles.input, { height: 80 }]}
                      value={editRecomendaciones}
                      onChangeText={setEditRecomendaciones}
                      multiline
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>{t("tripDetail.info.linkMapa")}</Text>
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
                    <Text style={styles.infoLabel}>{t("tripDetail.info.lugar")}</Text>
                    <Text style={styles.infoValue}>{paseo?.lugar}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t("tripDetail.info.fechas")}</Text>
                    <Text style={styles.infoValue}>
                      {paseo?.fecha_inicio} → {paseo?.fecha_fin}
                    </Text>
                  </View>
                  {paseo?.link_alojamiento && (
                    <TouchableOpacity
                      style={styles.infoRow}
                      onPress={() => Linking.openURL(paseo.link_alojamiento)}
                    >
                      <Text style={styles.infoLabel}>{t("tripDetail.info.alojamiento")}</Text>
                      <Text style={[styles.infoValue, styles.link]}>
                        {t("tripDetail.info.verEnlace")}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {paseo?.recomendaciones && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{t("tripDetail.info.llegada")}</Text>
                      <Text style={styles.infoValue}>
                        {paseo.recomendaciones}
                      </Text>
                    </View>
                  )}
                  {organizadorNombre ? (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{t("tripDetail.info.organizador")}</Text>
                      <Text style={styles.infoValue}>{organizadorNombre}</Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>
            <View style={styles.inviteCard}>
              <Text style={styles.inviteLabel}>{t("tripDetail.invite.label")}</Text>
              <Text style={styles.inviteCode}>{paseo?.codigo_invitacion}</Text>
              <Text style={styles.inviteHint}>
                {t("tripDetail.invite.hint")}
              </Text>
              <TouchableOpacity
                style={styles.inviteShareBtn}
                onPress={compartirInvitacion}
              >
                <Text style={styles.inviteShareBtnText}>
                  {t("tripDetail.invite.shareBtn")}
                </Text>
              </TouchableOpacity>
            </View>
            {paseo?.link_mapa &&
              (() => {
                const coords = extractCoordsFromLink(paseo.link_mapa);
                return (
                  <View style={[styles.section, { backgroundColor: theme.surface }]}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("tripDetail.info.ubicacion")}</Text>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(paseo.link_mapa)}
                      >
                        <Text style={styles.editText}>{t("tripDetail.info.abrirEnMaps")}</Text>
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
                          <Text style={styles.mapLinkTitle}>{t("tripDetail.info.verUbicacion")}</Text>
                          <Text style={styles.mapLinkSub}>
                            {t("tripDetail.info.tocaParaAbrir")}
                          </Text>
                        </View>
                        <Text style={styles.mapLinkArrow}>→</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}
            {isOrganizer && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => setShowDeleteTripModal(true)}
              >
                <Text style={styles.deleteButtonText}>{t("tripDetail.deleteTripBtn")}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {/* ══════════════════════════════════════
            PARTICIPANTES TAB
        ══════════════════════════════════════ */}
        {activeTab === "gente" && (
          <ScrollView style={styles.flex1} contentContainerStyle={styles.content}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {t("tripDetail.gente.title", { count: participaciones.length })}
              </Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => {
                  setShowAddModal(true);
                  loadDirectorio();
                }}
              >
                <Text style={styles.addBtnText}>{t("tripDetail.gente.addBtn")}</Text>
              </TouchableOpacity>
            </View>

            {familiasList.length === 0 && participaciones.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyText}>{t("tripDetail.gente.empty")}</Text>
                <Text style={styles.emptySub}>
                  {t("tripDetail.gente.emptySub")}
                </Text>
              </View>
            ) : (
              familiasList.map((fam, fidx) => {
                const miembros = participaciones.filter(
                  (p) => p.familia_id === fam.id,
                );
                if (miembros.length === 0) return null;
                const color = UF_COLORS[fidx % UF_COLORS.length];
                return (
                  <View key={fam.id} style={[styles.familiaCard, { backgroundColor: theme.surface }]}>
                    {/* Familia header */}
                    <TouchableOpacity
                      style={[styles.familiaHeader, { borderBottomColor: theme.borderLight }]}
                      onPress={() => openEditFamilia(fam)}
                    >
                      {fam.foto_url ? (
                        <Image
                          source={{ uri: fam.foto_url }}
                          style={[styles.familiaAvatar, { borderColor: color }]}
                        />
                      ) : (
                        <View
                          style={[
                            styles.familiaAvatarPlaceholder,
                            { backgroundColor: color },
                          ]}
                        >
                          <Text style={styles.familiaAvatarText}>
                            {fam.nombre.slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.familiaTitulo, { color: theme.text }]}>{fam.nombre}</Text>
                        <Text style={[styles.familiaCount, { color: theme.textTertiary }]}>
                          {t("tripDetail.gente.personaCount", { count: miembros.length })} {t("tripDetail.gente.tocaEditar")}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 18, color: theme.border }}>›</Text>
                    </TouchableOpacity>
                    {/* Members */}
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
                          <Text style={[styles.participanteNombre, { color: theme.text }]}>
                            {m.personas.nombre}
                          </Text>
                          <Text style={[styles.participanteSub, { color: theme.textSecondary }]}>
                            {t("tripDetail.gente.factor", { factor: m.factor ?? 1 })}
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

        {/* ══════════════════════════════════════
            MENU TAB
        ══════════════════════════════════════ */}
        {activeTab === "menu" && (
          <View style={styles.flex1}>
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
            <ScrollView style={styles.flex1} contentContainerStyle={styles.content}>
              {momentosDelDia.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🍴</Text>
                  <Text style={styles.emptyText}>
                    {t("tripDetail.menu.sinComidas")}
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
                      onPress={() => openMealDetail(m)}
                      onLongPress={() => handleMealOptions(m)}
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
                          {t("tripDetail.menu.tapAndHold")}
                        </Text>
                      </View>
                      <Text style={styles.mealNombre}>
                        {m.recetas?.nombre ?? t("tripDetail.menu.sinReceta")}
                      </Text>
                      <Text style={styles.mealPorciones}>
                        {t("tripDetail.menu.porciones", { count: m.porciones ?? participaciones.length })}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
              <TouchableOpacity
                style={styles.addMealButton}
                onPress={() => setShowAddMealModal(true)}
              >
                <Text style={styles.addMealButtonText}>{t("tripDetail.menu.addMealBtn")}</Text>
              </TouchableOpacity>
              {momentos.length > 0 && (
                <TouchableOpacity
                  style={[styles.exportButton, { opacity: exportando ? 0.6 : 1 }]}
                  onPress={compartirMenuPDF}
                  disabled={exportando}
                >
                  <Text style={styles.exportButtonText}>
                    {exportando ? "⏳ Generando..." : "📄 Exportar menú"}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}

        {/* ══════════════════════════════════════
            GASTOS TAB
        ══════════════════════════════════════ */}
        {activeTab === "gastos" && (
          <View style={styles.flex1}>
            <View style={styles.gastosSubTabs}>
              {(["gastos", "balances", "liquidar"] as const).map((subTab) => (
                <TouchableOpacity
                  key={subTab}
                  style={[
                    styles.gastosSubTab,
                    gastosTab === subTab && styles.gastosSubTabActive,
                  ]}
                  onPress={() => setGastosTab(subTab)}
                >
                  <Text
                    style={[
                      styles.gastosSubTabText,
                      gastosTab === subTab && styles.gastosSubTabTextActive,
                    ]}
                  >
                    {subTab === "gastos"
                      ? t("tripDetail.gastos.tabGastos")
                      : subTab === "balances"
                        ? t("tripDetail.gastos.tabBalances")
                        : t("tripDetail.gastos.tabLiquidar")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {gastosTab === "gastos" && (
              <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>{t("tripDetail.gastos.title")}</Text>
                    <Text style={styles.gastosTotalLabel}>
                      {t("tripDetail.gastos.total", { amount: formatCOP(totalGastado) })}
                    </Text>
                  </View>
                  {paseo?.estado !== "liquidado" && (
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => setShowAddGastoModal(true)}
                    >
                      <Text style={styles.addBtnText}>{t("tripDetail.gastos.addBtn")}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {gastos.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🧾</Text>
                    <Text style={styles.emptyText}>{t("tripDetail.gastos.sinGastos")}</Text>
                    <Text style={styles.emptySub}>
                      {t("tripDetail.gastos.sinGastosSub")}
                    </Text>
                  </View>
                ) : (
                  gastos.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      style={styles.gastoCard}
                      onLongPress={() => {
                        setGastoOptionsTarget(g);
                        setShowGastoOptionsModal(true);
                      }}
                    >
                      <View style={styles.gastoCardLeft}>
                        <Text style={styles.gastoNombre}>{g.nombre}</Text>
                        <Text style={styles.gastoPagadoPorText}>
                          {t("tripDetail.gastos.pagadoPor", { name: g.personas?.nombre ?? "—" })}
                        </Text>
                        <Text style={styles.gastoCategoriaLabel}>
                          {GASTO_CATEGORIAS.find(
                            (c) => c.key === (g.categoria ?? "otros"),
                          )?.label ?? "📦 Otros"}
                        </Text>
                      </View>
                      <View style={styles.gastoCardRight}>
                        <Text style={styles.gastoMonto}>
                          {formatCOP(g.monto)}
                        </Text>
                        <Text style={styles.gastoHint}>
                          {t("tripDetail.gastos.mantenerOpciones")}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}

            {gastosTab === "balances" && (
              <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>
                  {t("tripDetail.gastos.balancePorFamilia")}
                </Text>
                <Text style={[styles.gastosSubHint, { marginBottom: 16 }]}>
                  {momentos.length !== 1
                    ? t("tripDetail.gastos.totalYComidasPlural", { total: formatCOP(totalGastado), count: momentos.length })
                    : t("tripDetail.gastos.totalYComidas", { total: formatCOP(totalGastado), count: momentos.length })}
                </Text>
                {balancesPorFamilia.map((b) => {
                  const isPos = b.balance >= 0;
                  return (
                    <View key={b.id} style={styles.balanceCard}>
                      <View style={styles.balanceCardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.balanceNombre}>{b.nombre}</Text>
                          <Text style={styles.balanceMiembros}>
                            {t("tripDetail.gastos.factor", { factor: b.factorTotal.toFixed(1) })}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.balanceSaldo,
                            { color: isPos ? "#16a34a" : "#DC2626" },
                          ]}
                        >
                          {isPos ? "+" : ""}
                          {formatCOP(b.balance)}
                        </Text>
                      </View>
                      <View style={styles.balanceRow}>
                        <View style={styles.balanceItem}>
                          <Text style={styles.balanceItemLabel}>{t("tripDetail.gastos.puso")}</Text>
                          <Text style={styles.balanceItemValue}>
                            {formatCOP(b.puso)}
                          </Text>
                        </View>
                        <View style={styles.balanceDivider} />
                        <View style={styles.balanceItem}>
                          <Text style={styles.balanceItemLabel}>
                            {t("tripDetail.gastos.leCorresponde")}
                          </Text>
                          <Text style={styles.balanceItemValue}>
                            {formatCOP(b.leCorresponde)}
                          </Text>
                        </View>
                      </View>
                      {b.porCategoria.map((cat) => (
                        <View key={cat.key} style={styles.balanceCatRow}>
                          <Text style={styles.balanceCatLabel}>
                            {cat.label}
                          </Text>
                          <Text style={styles.balanceCatValue}>
                            {formatCOP(cat.leCorresponde)}
                          </Text>
                        </View>
                      ))}
                      <View style={styles.balanceBarBg}>
                        <View
                          style={[
                            styles.balanceBarFill,
                            {
                              width: `${Math.min(100, (b.puso / (totalGastado || 1)) * 100)}%`,
                              backgroundColor: isPos ? "#16a34a" : "#DC2626",
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}

                {/* ── Resumen por persona ── */}
                {participaciones.length > 0 && (
                  <>
                    <Text
                      style={[
                        styles.sectionTitle,
                        { marginTop: 24, marginBottom: 4 },
                      ]}
                    >
                      {t("tripDetail.gastos.resumenPorPersona")}
                    </Text>
                    <Text style={[styles.gastosSubHint, { marginBottom: 16 }]}>
                      {t("tripDetail.gastos.resumenPorPersonaSub")}
                    </Text>
                    {familiasList.map((fam, fidx) => {
                      const miembros = balancesPorPersona.filter(
                        (p) => p.familia_id === fam.id,
                      );
                      if (miembros.length === 0) return null;
                      const color = UF_COLORS[fidx % UF_COLORS.length];
                      return (
                        <View
                          key={fam.id}
                          style={[
                            styles.personaBalanceGroup,
                            { borderLeftColor: color },
                          ]}
                        >
                          <Text
                            style={[
                              styles.personaBalanceGroupNombre,
                              { color },
                            ]}
                          >
                            {fam.nombre}
                          </Text>
                          {miembros.map((p) => {
                            const isPos = p.balance >= 0;
                            return (
                              <View
                                key={p.id}
                                style={styles.personaBalanceCard}
                              >
                                <View style={styles.personaBalanceTop}>
                                  {p.foto_url ? (
                                    <Image
                                      source={{ uri: p.foto_url }}
                                      style={[
                                        styles.personaBalanceAvatar,
                                        { borderColor: color },
                                      ]}
                                    />
                                  ) : (
                                    <View
                                      style={[
                                        styles.avatar,
                                        {
                                          backgroundColor: color,
                                          width: 36,
                                          height: 36,
                                          borderRadius: 18,
                                        },
                                      ]}
                                    >
                                      <Text style={styles.avatarText}>
                                        {initials(p.nombre)}
                                      </Text>
                                    </View>
                                  )}
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.personaBalanceNombre}>
                                      {p.nombre}
                                    </Text>
                                    <Text style={styles.personaBalanceFactor}>
                                      {t("tripDetail.gastos.factor", { factor: p.factor })}
                                    </Text>
                                  </View>
                                  <Text
                                    style={[
                                      styles.balanceSaldo,
                                      {
                                        color: isPos ? "#16a34a" : "#DC2626",
                                        fontSize: 14,
                                      },
                                    ]}
                                  >
                                    {isPos ? "+" : ""}
                                    {formatCOP(p.balance)}
                                  </Text>
                                </View>
                                <View style={styles.balanceRow}>
                                  <View style={styles.balanceItem}>
                                    <Text style={styles.balanceItemLabel}>
                                      {t("tripDetail.gastos.puso")}
                                    </Text>
                                    <Text style={styles.balanceItemValue}>
                                      {formatCOP(p.puso)}
                                    </Text>
                                  </View>
                                  <View style={styles.balanceDivider} />
                                  <View style={styles.balanceItem}>
                                    <Text style={styles.balanceItemLabel}>
                                      {t("tripDetail.gastos.leCorresponde")}
                                    </Text>
                                    <Text style={styles.balanceItemValue}>
                                      {formatCOP(p.leCorresponde)}
                                    </Text>
                                  </View>
                                </View>
                                {p.porCategoria.map((cat) => (
                                  <View
                                    key={cat.key}
                                    style={styles.balanceCatRow}
                                  >
                                    <Text style={styles.balanceCatLabel}>
                                      {cat.label}
                                    </Text>
                                    <Text style={styles.balanceCatValue}>
                                      {formatCOP(cat.leCorresponde)}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            );
                          })}
                        </View>
                      );
                    })}
                  </>
                )}
              </ScrollView>
            )}

            {gastosTab === "liquidar" && (
              <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={[styles.sectionTitle, { marginBottom: 2 }]}>
                      {t("tripDetail.gastos.liquidacionesTitle")}
                    </Text>
                    <Text style={styles.gastosSubHint}>
                      {t("tripDetail.gastos.liquidacionesSub")}
                    </Text>
                  </View>
                </View>

                {/* Export buttons */}
                {gastos.length > 0 && (
                  <View style={styles.exportRow}>
                    <TouchableOpacity
                      style={styles.exportBtn}
                      onPress={compartirTexto}
                    >
                      <Text style={styles.exportBtnText}>
                        {t("tripDetail.gastos.exportWhatsapp")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.exportBtn, styles.exportBtnPDF]}
                      onPress={compartirPDF}
                      disabled={exportando}
                    >
                      {exportando ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={[styles.exportBtnText, { color: "#fff" }]}>
                          {t("tripDetail.gastos.exportPDF")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {liquidaciones.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>
                      {gastos.length === 0 ? "🧾" : "✅"}
                    </Text>
                    <Text style={styles.emptyText}>
                      {gastos.length === 0
                        ? t("tripDetail.gastos.sinGastosTodavia")
                        : t("tripDetail.gastos.todoCuadrado")}
                    </Text>
                    <Text style={styles.emptySub}>
                      {gastos.length === 0
                        ? t("tripDetail.gastos.sinGastosRegistra")
                        : t("tripDetail.gastos.sinDeudas")}
                    </Text>
                  </View>
                ) : (
                  <>
                    {liquidaciones.map((t, i) => {
                      const key = `${t.deFamId}_${t.paraFamId}`;
                      const pagada = liquidacionesPagadas[key] ?? false;
                      return (
                        <TouchableOpacity
                          key={i}
                          style={[
                            styles.liquidacionCard,
                            pagada && styles.liquidacionCardPagada,
                          ]}
                          onPress={() => toggleLiquidacionPagada(t)}
                          disabled={savingLiquidacion}
                        >
                          <View
                            style={[
                              styles.liqCheckbox,
                              pagada && styles.liqCheckboxPagada,
                            ]}
                          >
                            {pagada && (
                              <Text style={styles.liqCheckmark}>✓</Text>
                            )}
                          </View>
                          <View style={styles.liquidacionLeft}>
                            <Text
                              style={[
                                styles.liquidacionDe,
                                pagada && styles.liquidacionTextPagada,
                              ]}
                            >
                              {t.de}
                            </Text>
                            <Text
                              style={[
                                styles.liquidacionArrow,
                                pagada && styles.liquidacionTextPagada,
                              ]}
                            >
                              →
                            </Text>
                            <Text
                              style={[
                                styles.liquidacionPara,
                                pagada && styles.liquidacionTextPagada,
                              ]}
                            >
                              {t.para}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.liquidacionMonto,
                              pagada && styles.liquidacionTextPagada,
                            ]}
                          >
                            {formatCOP(t.monto)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    {/* Marcar paseo como liquidado cuando todo está pagado */}
                    {liquidaciones.every(
                      (t) =>
                        liquidacionesPagadas[`${t.deFamId}_${t.paraFamId}`],
                    ) &&
                      paseo?.estado !== "liquidado" && (
                        <View style={styles.liquidadoPrompt}>
                          <Text style={styles.liquidadoPromptText}>
                            {t("tripDetail.gastos.todosPagosRealizados")}
                          </Text>
                          <TouchableOpacity
                            style={styles.liquidadoBtn}
                            onPress={handleMarcarLiquidado}
                          >
                            <Text style={styles.liquidadoBtnText}>
                              {t("tripDetail.gastos.marcarLiquidado")}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                    {paseo?.estado === "liquidado" && (
                      <View
                        style={[
                          styles.liquidadoPrompt,
                          { backgroundColor: "#DBEAFE" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.liquidadoPromptText,
                            { color: "#1D4ED8" },
                          ]}
                        >
                          {t("tripDetail.gastos.estaLiquidado")}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════
            MODALS
        ══════════════════════════════════════ */}

        {/* Error */}
        <Modal
          visible={showErrorModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowErrorModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>⚠️ {t("common.error")}</Text>
              <Text style={styles.confirmMessage}>{errorMessage}</Text>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: "#1B4F72" }]}
                onPress={() => setShowErrorModal(false)}
              >
                <Text style={styles.confirmBtnText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Photo source */}
        <Modal
          visible={showPhotoModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowPhotoModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.estadoModalBox}>
              <Text style={styles.estadoModalTitle}>{t("tripDetail.photo.title")}</Text>
              <TouchableOpacity
                style={[styles.estadoOption, { backgroundColor: "#EFF6FF" }]}
                onPress={() => pickTripPhoto("camera")}
              >
                <Text style={[styles.estadoOptionText, { color: "#1B4F72" }]}>
                  {t("tripDetail.photo.takePhoto")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.estadoOption, { backgroundColor: "#EFF6FF" }]}
                onPress={() => pickTripPhoto("gallery")}
              >
                <Text style={[styles.estadoOptionText, { color: "#1B4F72" }]}>
                  {t("tripDetail.photo.chooseGallery")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.estadoCancel}
                onPress={() => setShowPhotoModal(false)}
              >
                <Text style={styles.estadoCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Delete trip */}
        <Modal
          visible={showDeleteTripModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowDeleteTripModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>{t("tripDetail.deleteTrip.title")}</Text>
              <Text style={styles.confirmMessage}>
                {t("tripDetail.deleteTrip.message", { name: paseo?.nombre ?? "" })}
              </Text>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: "#DC2626" }]}
                onPress={handleDeleteTrip}
              >
                <Text style={styles.confirmBtnText}>{t("tripDetail.deleteTrip.btn")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.estadoCancel}
                onPress={() => setShowDeleteTripModal(false)}
              >
                <Text style={styles.estadoCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Estado */}
        <Modal
          visible={showEstadoModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowEstadoModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.estadoModalBox}>
              <Text style={styles.estadoModalTitle}>
                {t("tripDetail.changeEstado")}
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
                style={styles.estadoCancel}
                onPress={() => setShowEstadoModal(false)}
              >
                <Text style={styles.estadoCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Edit familia modal */}
        <Modal
          visible={showEditFamiliaModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowEditFamiliaModal(false)}
        >
          <WebModalWrapper>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditFamiliaModal(false)}>
                <Text style={styles.modalCancel}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t("tripDetail.gente.editFamiliaTitle")}</Text>
              <TouchableOpacity onPress={saveEditFamilia}>
                <Text style={styles.modalSave}>{t("common.save")}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {/* Familia photo */}
              <TouchableOpacity
                style={styles.familiaPhotoBtn}
                onPress={pickFamiliaPhoto}
              >
                {uploadingFamiliaPhoto ? (
                  <View style={styles.familiaPhotoBtnPlaceholder}>
                    <ActivityIndicator color="#1B4F72" />
                  </View>
                ) : editingFamilia?.foto_url ? (
                  <Image
                    source={{ uri: editingFamilia.foto_url }}
                    style={styles.familiaPhotoBtnImg}
                  />
                ) : (
                  <View style={styles.familiaPhotoBtnPlaceholder}>
                    <Text style={{ fontSize: 32 }}>📸</Text>
                    <Text style={styles.familiaPhotoBtnText}>
                      {t("tripDetail.gente.familiaFoto")}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t("tripDetail.gente.editFamiliaNombreLabel")}</Text>
                <TextInput
                  style={styles.input}
                  value={editFamiliaNombre}
                  onChangeText={setEditFamiliaNombre}
                  placeholder={t("tripDetail.gente.editFamiliaNombrePlaceholder")}
                />
              </View>
            </ScrollView>
          </SafeAreaView>
          </WebModalWrapper>
        </Modal>

        {/* Participant options */}
        <Modal
          visible={showOptionsModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowOptionsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.estadoModalBox}>
              <Text style={styles.estadoModalTitle}>
                {optionsParticipante?.personas?.nombre}
              </Text>
              <Text
                style={[
                  styles.familiaModalSub,
                  { textAlign: "center", marginBottom: 12 },
                ]}
              >
                {familiasList.find(
                  (f) => f.id === optionsParticipante?.familia_id,
                )?.nombre ?? ""}{" "}
                · {t("tripDetail.gente.factor", { factor: optionsParticipante?.factor ?? 1 })}
              </Text>
              <TouchableOpacity
                style={[styles.estadoOption, { backgroundColor: "#EFF6FF" }]}
                onPress={() => {
                  setShowOptionsModal(false);
                  router.push({
                    pathname: "/participantDetail",
                    params: { personaId: optionsParticipante?.persona_id },
                  });
                }}
              >
                <Text style={[styles.estadoOptionText, { color: "#1B4F72" }]}>
                  {t("tripDetail.gente.optionsVerPerfil")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.estadoOption, { backgroundColor: "#EFF6FF" }]}
                onPress={() => {
                  setShowOptionsModal(false);
                  if (optionsParticipante)
                    handleChangeFactor(optionsParticipante);
                }}
              >
                <Text style={[styles.estadoOptionText, { color: "#1B4F72" }]}>
                  {t("tripDetail.gente.optionsCambiarFactor")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.estadoOption, { backgroundColor: "#EFF6FF" }]}
                onPress={() => {
                  setShowOptionsModal(false);
                  if (optionsParticipante)
                    handleMoveToFamilia(optionsParticipante);
                }}
              >
                <Text style={[styles.estadoOptionText, { color: "#1B4F72" }]}>
                  {t("tripDetail.gente.optionsMoverFamilia")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.estadoOption, { backgroundColor: "#EFF6FF" }]}
                onPress={() => {
                  setShowOptionsModal(false);
                  if (optionsParticipante)
                    handleEditFechas(optionsParticipante);
                }}
              >
                <Text style={[styles.estadoOptionText, { color: "#1B4F72" }]}>
                  {t("tripDetail.gente.optionsFechasAsistencia")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.estadoOption, { backgroundColor: "#FEE2E2" }]}
                onPress={() => {
                  setShowOptionsModal(false);
                  if (optionsParticipante)
                    handleDeleteParticipante(optionsParticipante);
                }}
              >
                <Text style={[styles.estadoOptionText, { color: "#DC2626" }]}>
                  {t("tripDetail.gente.optionsEliminar")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.estadoCancel}
                onPress={() => setShowOptionsModal(false)}
              >
                <Text style={styles.estadoCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Factor modal */}
        <Modal
          visible={showFactorModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowFactorModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.familiaModalBox}>
              <Text style={styles.familiaModalTitle}>
                {t("tripDetail.gente.factorModalTitle")}
              </Text>
              <Text style={styles.familiaModalSub}>
                {factorParticipante?.personas?.nombre}
              </Text>
              <Text
                style={[
                  styles.fieldHint,
                  { textAlign: "center", marginBottom: 12 },
                ]}
              >
                {t("tripDetail.gente.factorModalHint")}
              </Text>
              <TextInput
                style={styles.familiaInput}
                value={factorEditInput}
                onChangeText={setFactorEditInput}
                keyboardType="decimal-pad"
                autoFocus
              />
              <View style={styles.familiaModalButtons}>
                <TouchableOpacity
                  style={styles.familiaModalCancel}
                  onPress={() => setShowFactorModal(false)}
                >
                  <Text style={styles.familiaModalCancelText}>{t("common.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.familiaModalSave}
                  onPress={applyFactor}
                >
                  <Text style={styles.familiaModalSaveText}>{t("common.save")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Fechas de asistencia modal */}
        <Modal
          visible={showFechasModal}
          animationType="fade"
          transparent
          onRequestClose={() => !savingFechas && setShowFechasModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.familiaModalBox}>
              <Text style={styles.familiaModalTitle}>
                {t("tripDetail.gente.fechasModalTitle")}
              </Text>
              <Text style={styles.familiaModalSub}>
                {fechasParticipante?.personas?.nombre}
              </Text>
              <Text
                style={[
                  styles.fieldHint,
                  { textAlign: "center", marginBottom: 16 },
                ]}
              >
                {t("tripDetail.gente.fechasModalRango", { inicio: paseo?.fecha_inicio, fin: paseo?.fecha_fin })}
              </Text>
              <Text style={styles.fieldLabel}>{t("tripDetail.gente.fechasModalLlegada")}</Text>
              <TextInput
                style={[
                  styles.familiaInput,
                  { fontSize: 15, fontWeight: "600", width: "100%" },
                ]}
                value={fechaDesdeInput}
                onChangeText={(v) => setFechaDesdeInput(formatDateInput(v))}
                placeholder="YYYY-MM-DD"
                keyboardType="number-pad"
                maxLength={10}
              />
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
                {t("tripDetail.gente.fechasModalSalida")}
              </Text>
              <TextInput
                style={[
                  styles.familiaInput,
                  { fontSize: 15, fontWeight: "600", width: "100%" },
                ]}
                value={fechaHastaInput}
                onChangeText={(v) => setFechaHastaInput(formatDateInput(v))}
                placeholder="YYYY-MM-DD"
                keyboardType="number-pad"
                maxLength={10}
              />
              <View style={styles.familiaModalButtons}>
                <TouchableOpacity
                  style={styles.familiaModalCancel}
                  onPress={() => setShowFechasModal(false)}
                  disabled={savingFechas}
                >
                  <Text style={styles.familiaModalCancelText}>{t("common.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.familiaModalSave,
                    savingFechas && { opacity: 0.6 },
                  ]}
                  onPress={saveFechas}
                  disabled={savingFechas}
                >
                  <Text style={styles.familiaModalSaveText}>
                    {savingFechas ? t("common.saving") : t("common.save")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Move to familia modal */}
        <Modal
          visible={showMoveFamiliaModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowMoveFamiliaModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.estadoModalBox}>
              <Text style={styles.estadoModalTitle}>{t("tripDetail.gente.moveFamiliaTitle")}</Text>
              {familiasList.map((fam, fidx) => (
                <TouchableOpacity
                  key={fam.id}
                  style={[
                    styles.estadoOption,
                    {
                      backgroundColor:
                        UF_COLORS[fidx % UF_COLORS.length] + "22",
                    },
                  ]}
                  onPress={() => applyMoveFamilia(fam.id)}
                >
                  <Text
                    style={[
                      styles.estadoOptionText,
                      { color: UF_COLORS[fidx % UF_COLORS.length] },
                    ]}
                  >
                    {fam.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.estadoCancel}
                onPress={() => setShowMoveFamiliaModal(false)}
              >
                <Text style={styles.estadoCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Delete participant */}
        <Modal
          visible={showDeletePartModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowDeletePartModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>{t("tripDetail.gente.deletePartTitle")}</Text>
              <Text style={styles.confirmMessage}>
                {t("tripDetail.gente.deletePartMessage", { name: deletePartTarget?.personas?.nombre })}
              </Text>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: "#DC2626" }]}
                onPress={confirmDeleteParticipante}
              >
                <Text style={styles.confirmBtnText}>{t("common.delete")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.estadoCancel}
                onPress={() => setShowDeletePartModal(false)}
              >
                <Text style={styles.estadoCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
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
          <WebModalWrapper>
          <SafeAreaView style={styles.modalContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
            >
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Text style={styles.modalCancel}>{t("common.cancel")}</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{t("tripDetail.gente.addModalTitle")}</Text>
                <TouchableOpacity
                  onPress={handleAddParticipant}
                  disabled={savingParticipant || enviandoInvitacion}
                >
                  <Text style={styles.modalSave}>
                    {savingParticipant ? "..." : t("tripDetail.gente.addModalBtn")}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.modalContent}
                contentContainerStyle={{ paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* ── Persona — búsqueda en directorio inline ── */}
                <Text style={styles.modalSectionLabel}>{t("tripDetail.gente.addPersonaLabel")}</Text>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    {t("tripDetail.gente.addSearchLabel")}
                  </Text>
                  <View style={styles.nombreRow}>
                    <View style={[styles.searchBar, { flex: 1 }]}>
                      <Text style={styles.searchIcon}>🔍</Text>
                      <TextInput
                        style={styles.searchInput}
                        placeholder={t("tripDetail.gente.addSearchPlaceholder")}
                        placeholderTextColor="#94a3b8"
                        value={newPersonaNombre}
                        onChangeText={(text) => {
                          setNewPersonaNombre(text);
                          setAddingSelf(false);
                          if (text.length >= 1 && directorio.length === 0)
                            loadDirectorio();
                        }}
                        autoCapitalize="words"
                      />
                      {newPersonaNombre.length > 0 && (
                        <TouchableOpacity
                          onPress={() => {
                            setNewPersonaNombre("");
                            setAddingSelf(false);
                          }}
                        >
                          <Text
                            style={{
                              color: "#94a3b8",
                              fontSize: 16,
                              paddingHorizontal: 8,
                            }}
                          >
                            ✕
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.directorioBtn}
                      onPress={() => {
                        loadDirectorio();
                        setShowDirectorioModal(true);
                      }}
                    >
                      <Text style={styles.directorioBtnText}>📋</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Resultados inline */}
                  {newPersonaNombre.length >= 1 &&
                    !addingSelf &&
                    (() => {
                      const q = newPersonaNombre.toLowerCase();
                      const meMatch =
                        miPersonaId &&
                        !participaciones.find(
                          (p: any) => p.persona_id === miPersonaId,
                        ) &&
                        miPersonaNombre.toLowerCase().includes(q);
                      const dirResults = directorio.filter((d: any) =>
                        d.nombre.toLowerCase().includes(q),
                      );
                      if (!meMatch && dirResults.length === 0) return null;
                      return (
                        <View style={styles.searchResults}>
                          {meMatch && (
                            <TouchableOpacity
                              style={[
                                styles.searchResultItem,
                                { backgroundColor: "#EFF6FF" },
                              ]}
                              onPress={() => {
                                setNewPersonaNombre(miPersonaNombre);
                                setAddingSelf(true);
                              }}
                            >
                              <View
                                style={[
                                  styles.directorioAvatar,
                                  { width: 30, height: 30, borderRadius: 15 },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.directorioAvatarText,
                                    { fontSize: 11 },
                                  ]}
                                >
                                  {initials(miPersonaNombre)}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={[
                                    styles.searchResultText,
                                    { color: "#1B4F72" },
                                  ]}
                                >
                                  {miPersonaNombre}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 10,
                                    color: "#1B4F72",
                                    fontWeight: "700",
                                  }}
                                >
                                  {t("tripDetail.gente.miCuenta")}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          )}
                          {dirResults.map((d: any) => (
                            <TouchableOpacity
                              key={d.id}
                              style={styles.searchResultItem}
                              onPress={() => {
                                setNewPersonaNombre(d.nombre);
                                setAddingSelf(false);
                                if (d.email) {
                                  setEnviarInvitacion(true);
                                  setEmailInvitacion(d.email);
                                }
                                if (d.familia_nombre) {
                                  const fam = familiasList.find(
                                    (f: any) => f.nombre === d.familia_nombre,
                                  );
                                  if (fam) setSelectedFamiliaId(fam.id);
                                }
                              }}
                            >
                              <View
                                style={[
                                  styles.directorioAvatar,
                                  {
                                    width: 30,
                                    height: 30,
                                    borderRadius: 15,
                                    backgroundColor: "#64748b",
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.directorioAvatarText,
                                    { fontSize: 11 },
                                  ]}
                                >
                                  {initials(d.nombre)}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.searchResultText}>
                                  {d.nombre}
                                </Text>
                                {d.email && (
                                  <Text
                                    style={{ fontSize: 11, color: "#94a3b8" }}
                                  >
                                    {d.email}
                                  </Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      );
                    })()}

                  {/* Nuevo contacto hint */}
                  {newPersonaNombre.trim().length >= 2 &&
                    !addingSelf &&
                    (() => {
                      const q = newPersonaNombre.trim().toLowerCase();
                      const exists =
                        miPersonaNombre.toLowerCase() === q ||
                        directorio.some(
                          (d: any) => d.nombre.toLowerCase() === q,
                        );
                      if (exists) return null;
                      return (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 8,
                            padding: 10,
                            backgroundColor: "#F0FDF4",
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: "#BBF7D0",
                          }}
                        >
                          <Text style={{ fontSize: 14 }}>✨</Text>
                          <Text
                            style={{
                              flex: 1,
                              fontSize: 12,
                              color: "#065F46",
                              fontWeight: "600",
                            }}
                          >
                            {t("tripDetail.gente.seAgregara", { nombre: newPersonaNombre.trim() })}
                          </Text>
                        </View>
                      );
                    })()}
                </View>

                {/* ── Invitación por correo ── */}
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabel}>
                      {t("tripDetail.gente.inviteEmailLabel")}
                    </Text>
                    <Text style={styles.switchSub}>
                      {t("tripDetail.gente.inviteEmailSub")}
                    </Text>
                  </View>
                  <Switch
                    value={enviarInvitacion}
                    onValueChange={(v) => {
                      setEnviarInvitacion(v);
                      if (v) setGuardarEnDirectorio(true);
                    }}
                    trackColor={{ false: "#e2e8f0", true: "#1B4F72" }}
                    thumbColor="#fff"
                  />
                </View>
                {enviarInvitacion && (
                  <View style={[styles.field, { marginTop: 8 }]}>
                    <Text style={styles.fieldLabel}>{t("tripDetail.gente.emailLabel")}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="correo@ejemplo.com"
                      placeholderTextColor="#94a3b8"
                      value={emailInvitacion}
                      onChangeText={setEmailInvitacion}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                )}

                {/* ── Guardar en directorio ── */}
                <View style={[styles.switchRow, { marginBottom: 20 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabel}>
                      {t("tripDetail.gente.saveDirectoryLabel")}
                    </Text>
                    <Text style={styles.switchSub}>
                      {t("tripDetail.gente.saveDirectorySub")}
                    </Text>
                  </View>
                  <Switch
                    value={guardarEnDirectorio}
                    onValueChange={setGuardarEnDirectorio}
                    trackColor={{ false: "#e2e8f0", true: "#1B4F72" }}
                    thumbColor="#fff"
                  />
                </View>

                {/* ── Familia ── */}
                <Text style={[styles.modalSectionLabel, { marginTop: 4 }]}>
                  {t("tripDetail.gente.familiaLabel")}
                </Text>
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      !creatingNewFamilia && styles.toggleBtnActive,
                    ]}
                    onPress={() => setCreatingNewFamilia(false)}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        !creatingNewFamilia && styles.toggleTextActive,
                      ]}
                    >
                      {t("tripDetail.gente.familiaExistente")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      creatingNewFamilia && styles.toggleBtnActive,
                    ]}
                    onPress={() => setCreatingNewFamilia(true)}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        creatingNewFamilia && styles.toggleTextActive,
                      ]}
                    >
                      {t("tripDetail.gente.familiaNueva")}
                    </Text>
                  </TouchableOpacity>
                </View>
                {creatingNewFamilia ? (
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>
                      {t("tripDetail.gente.familiaNombreLabel")}
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder={t("tripDetail.gente.familiaNombrePlaceholder")}
                      placeholderTextColor="#94a3b8"
                      value={newFamiliaNombre}
                      onChangeText={setNewFamiliaNombre}
                    />
                  </View>
                ) : (
                  <View style={styles.field}>
                    {familiasList.length === 0 ? (
                      <Text style={styles.noPersonas}>
                        {t("tripDetail.gente.noFamilias")}
                      </Text>
                    ) : (
                      familiasList.map((fam, fidx) => (
                        <TouchableOpacity
                          key={fam.id}
                          style={[
                            styles.personaOption,
                            selectedFamiliaId === fam.id &&
                              styles.personaOptionActive,
                          ]}
                          onPress={() => setSelectedFamiliaId(fam.id)}
                        >
                          <View
                            style={[
                              styles.searchResultDot,
                              {
                                backgroundColor:
                                  UF_COLORS[fidx % UF_COLORS.length],
                              },
                            ]}
                          />
                          <Text
                            style={[
                              styles.personaOptionText,
                              selectedFamiliaId === fam.id &&
                                styles.personaOptionTextActive,
                            ]}
                          >
                            {fam.nombre}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}

                {/* ── Factor ── */}
                <Text style={[styles.modalSectionLabel, { marginTop: 8 }]}>
                  {t("tripDetail.gente.factorLabel")}
                </Text>
                <Text style={[styles.fieldHint, { marginBottom: 8 }]}>
                  {t("tripDetail.gente.factorHint")}
                </Text>
                <View style={styles.factorSliderRow}>
                  {["0.25", "0.5", "0.75", "1.0"].map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[
                        styles.factorPresetBtn,
                        factorInput === f && styles.factorPresetBtnActive,
                      ]}
                      onPress={() => setFactorInput(f)}
                    >
                      <Text
                        style={[
                          styles.factorPresetText,
                          factorInput === f && styles.factorPresetTextActive,
                        ]}
                      >
                        {f}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[
                    styles.input,
                    {
                      textAlign: "center",
                      fontSize: 20,
                      fontWeight: "700",
                      marginTop: 8,
                    },
                  ]}
                  value={factorInput}
                  onChangeText={setFactorInput}
                  keyboardType="decimal-pad"
                  placeholder="1.0"
                  placeholderTextColor="#94a3b8"
                />

                {/* ── Fechas de asistencia ── */}
                <Text style={[styles.modalSectionLabel, { marginTop: 16 }]}>
                  {t("tripDetail.gente.fechasLabel")}
                </Text>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabel}>
                      {t("tripDetail.gente.fechasTodoPaseo")}
                    </Text>
                    <Text style={styles.switchSub}>
                      {paseo?.fecha_inicio} → {paseo?.fecha_fin}
                    </Text>
                  </View>
                  <Switch
                    value={nuevaFechaTodoPaseo}
                    onValueChange={(v) => {
                      setNuevaFechaTodoPaseo(v);
                      if (v) {
                        setNuevoFechaDesde("");
                        setNuevoFechaHasta("");
                      } else {
                        setNuevoFechaDesde(paseo?.fecha_inicio ?? "");
                        setNuevoFechaHasta(paseo?.fecha_fin ?? "");
                      }
                    }}
                    trackColor={{ false: "#e2e8f0", true: "#1B4F72" }}
                    thumbColor="#fff"
                  />
                </View>
                {!nuevaFechaTodoPaseo && (
                  <View style={{ marginTop: 8, marginBottom: 12 }}>
                    <Text style={styles.fieldLabel}>{t("tripDetail.gente.fechaLlegada")}</Text>
                    <TextInput
                      style={styles.input}
                      value={nuevoFechaDesde}
                      onChangeText={(v) => setNuevoFechaDesde(formatDateInput(v))}
                      placeholder="YYYY-MM-DD"
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                    <Text style={[styles.fieldLabel, { marginTop: 10 }]}>
                      {t("tripDetail.gente.fechaSalida")}
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={nuevoFechaHasta}
                      onChangeText={(v) => setNuevoFechaHasta(formatDateInput(v))}
                      placeholder="YYYY-MM-DD"
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                  </View>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
          </WebModalWrapper>
        </Modal>

        {/* Meal detail / participantes por comida */}
        <Modal
          visible={showMealDetailModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowMealDetailModal(false)}
        >
          <WebModalWrapper>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowMealDetailModal(false)}>
                <Text style={styles.modalCancel}>{t("common.close")}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {mealDetailTarget?.recetas?.nombre ?? "Comida"}
              </Text>
              <View style={{ width: 60 }} />
            </View>
            <ScrollView style={styles.modalContent}>
              {/* Meal info */}
              {mealDetailTarget &&
                (() => {
                  const config =
                    TIPO_CONFIG[mealDetailTarget.tipo_comida] ??
                    TIPO_CONFIG["snack"];
                  return (
                    <View
                      style={[
                        styles.mealDetailHeader,
                        { backgroundColor: config.bgColor },
                      ]}
                    >
                      <Text style={{ fontSize: 28 }}>{config.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.mealDetailTipo,
                            { color: config.color },
                          ]}
                        >
                          {mealDetailTarget.tipo_comida
                            .charAt(0)
                            .toUpperCase() +
                            mealDetailTarget.tipo_comida.slice(1)}
                        </Text>
                        <Text style={styles.mealDetailFecha}>
                          {mealDetailTarget.fecha}
                        </Text>
                      </View>
                      <View style={styles.mealDetailPorciones}>
                        <Text style={styles.mealDetailPorcionesNum}>
                          {mealDetailTarget.porciones ?? participaciones.length}
                        </Text>
                        <Text style={styles.mealDetailPorcionesSub}>
                          {t("tripDetail.menu.porciones", { count: mealDetailTarget?.porciones ?? participaciones.length })}
                        </Text>
                      </View>
                    </View>
                  );
                })()}

              <Text
                style={[
                  styles.modalSectionLabel,
                  { marginTop: 20, marginBottom: 8 },
                ]}
              >
                {t("tripDetail.menu.mealDetailParticipantes")}
              </Text>
              <Text style={[styles.fieldHint, { marginBottom: 12 }]}>
                {t("tripDetail.menu.mealDetailHint")}
              </Text>

              {loadingParticipantes ? (
                <ActivityIndicator color="#1B4F72" style={{ marginTop: 20 }} />
              ) : participaciones.length === 0 ? (
                <Text style={styles.noPersonas}>
                  {t("tripDetail.menu.noParticipantes")}
                </Text>
              ) : (
                familiasList.map((fam, fidx) => {
                  const miembros = participaciones.filter(
                    (p) => p.familia_id === fam.id,
                  );
                  if (miembros.length === 0) return null;
                  const color = UF_COLORS[fidx % UF_COLORS.length];
                  return (
                    <View
                      key={fam.id}
                      style={[
                        styles.mealPartFamilia,
                        { borderLeftColor: color },
                      ]}
                    >
                      <Text style={[styles.mealPartFamiliaNombre, { color }]}>
                        {fam.nombre}
                      </Text>
                      {miembros.map((m) => {
                        const activo = participantesComida[m.id] !== false;
                        return (
                          <View key={m.id} style={styles.mealPartRow}>
                            <View style={styles.mealPartInfo}>
                              {m.personas.foto_url ? (
                                <Image
                                  source={{ uri: m.personas.foto_url }}
                                  style={[
                                    styles.mealPartAvatar,
                                    {
                                      borderColor: color,
                                      opacity: activo ? 1 : 0.35,
                                    },
                                  ]}
                                />
                              ) : (
                                <View
                                  style={[
                                    styles.avatar,
                                    {
                                      backgroundColor: activo
                                        ? color
                                        : "#e2e8f0",
                                      width: 32,
                                      height: 32,
                                      borderRadius: 16,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.avatarText,
                                      { fontSize: 11 },
                                    ]}
                                  >
                                    {initials(m.personas.nombre)}
                                  </Text>
                                </View>
                              )}
                              <View>
                                <Text
                                  style={[
                                    styles.mealPartNombre,
                                    { color: activo ? "#1e293b" : "#94a3b8" },
                                  ]}
                                >
                                  {m.personas.nombre}
                                </Text>
                                <Text style={styles.mealPartFactor}>
                                  {t("tripDetail.gente.factor", { factor: m.factor ?? 1 })}
                                </Text>
                              </View>
                            </View>
                            <Switch
                              value={activo}
                              onValueChange={() =>
                                toggleParticipante(m.id, activo)
                              }
                              trackColor={{
                                false: "#e2e8f0",
                                true: color + "66",
                              }}
                              thumbColor={activo ? color : "#94a3b8"}
                            />
                          </View>
                        );
                      })}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </SafeAreaView>
          </WebModalWrapper>
        </Modal>

        {/* Meal options */}
        <Modal
          visible={showMealOptionsModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowMealOptionsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.estadoModalBox}>
              <Text style={styles.estadoModalTitle}>
                {mealOptionsTarget?.recetas?.nombre ?? "Comida"}
              </Text>
              <TouchableOpacity
                style={[styles.estadoOption, { backgroundColor: "#EFF6FF" }]}
                onPress={() => {
                  setShowMealOptionsModal(false);
                  setEditingMeal(mealOptionsTarget);
                  setEditMealTipo(mealOptionsTarget?.tipo_comida ?? "almuerzo");
                  setShowEditMealModal(true);
                }}
              >
                <Text style={[styles.estadoOptionText, { color: "#1B4F72" }]}>
                  {t("tripDetail.menu.mealOptionsEditar")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.estadoOption, { backgroundColor: "#FEE2E2" }]}
                onPress={() => {
                  setShowMealOptionsModal(false);
                  if (mealOptionsTarget) handleDeleteMeal(mealOptionsTarget.id);
                }}
              >
                <Text style={[styles.estadoOptionText, { color: "#DC2626" }]}>
                  {t("tripDetail.menu.mealOptionsEliminar")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.estadoCancel}
                onPress={() => setShowMealOptionsModal(false)}
              >
                <Text style={styles.estadoCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Delete meal */}
        <Modal
          visible={showDeleteMealModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowDeleteMealModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>{t("tripDetail.menu.deleteMealTitle")}</Text>
              <Text style={styles.confirmMessage}>
                {t("tripDetail.menu.deleteMealMessage")}
              </Text>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: "#DC2626" }]}
                onPress={confirmDeleteMeal}
              >
                <Text style={styles.confirmBtnText}>{t("common.delete")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.estadoCancel}
                onPress={() => setShowDeleteMealModal(false)}
              >
                <Text style={styles.estadoCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Edit meal tipo */}
        <Modal
          visible={showEditMealModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowEditMealModal(false)}
        >
          <WebModalWrapper>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditMealModal(false)}>
                <Text style={styles.modalCancel}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t("tripDetail.menu.editMealTitle")}</Text>
              <TouchableOpacity onPress={handleSaveEditMeal}>
                <Text style={styles.modalSave}>{t("common.save")}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.fieldLabel}>{t("tripDetail.menu.momentoDelDia")}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              >
                {TIPOS_COMIDA.map((tipo) => {
                  const config = TIPO_CONFIG[tipo] ?? TIPO_CONFIG["snack"];
                  const isActive = editMealTipo === tipo;
                  return (
                    <TouchableOpacity
                      key={tipo}
                      style={[
                        styles.tipoChip,
                        isActive && {
                          backgroundColor: config.bgColor,
                          borderColor: config.color,
                        },
                      ]}
                      onPress={() => setEditMealTipo(tipo)}
                    >
                      <Text style={{ fontSize: 16 }}>{config.icon}</Text>
                      <Text
                        style={[
                          styles.tipoChipText,
                          isActive && { color: config.color },
                        ]}
                      >
                        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </ScrollView>
          </SafeAreaView>
          </WebModalWrapper>
        </Modal>

        {/* Add meal */}
        <Modal
          visible={showAddMealModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setShowAddMealModal(false);
            setMealSearch("");
            setMealFilterKeyword(null);
            setMealFilterCategoria(null);
            setMealFilterDieta(null);
          }}
        >
          <WebModalWrapper>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowAddMealModal(false);
                  setMealSearch("");
                  setMealFilterKeyword(null);
                  setMealFilterCategoria(null);
                  setMealFilterDieta(null);
                }}
              >
                <Text style={styles.modalCancel}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t("tripDetail.menu.addMealTitle")}</Text>
              <TouchableOpacity onPress={handleAddMeal} disabled={savingMeal}>
                <Text style={styles.modalSave}>
                  {savingMeal ? "..." : t("tripDetail.menu.addMealBtn")}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* ── Momento del día ── */}
              <Text style={styles.fieldLabel}>{t("tripDetail.menu.momentoDelDia")}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 20 }}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              >
                {TIPOS_COMIDA.map((tipo) => {
                  const config = TIPO_CONFIG[tipo] ?? TIPO_CONFIG["snack"];
                  const isActive = selectedTipo === tipo;
                  return (
                    <TouchableOpacity
                      key={tipo}
                      style={[
                        styles.tipoChip,
                        isActive && {
                          backgroundColor: config.bgColor,
                          borderColor: config.color,
                        },
                      ]}
                      onPress={() => setSelectedTipo(tipo)}
                    >
                      <Text style={{ fontSize: 16 }}>{config.icon}</Text>
                      <Text
                        style={[
                          styles.tipoChipText,
                          isActive && { color: config.color },
                        ]}
                      >
                        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* ── Buscar receta ── */}
              <Text style={styles.fieldLabel}>{t("tripDetail.menu.recetaLabel")}</Text>
              <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder={t("tripDetail.menu.recetaSearchPlaceholder")}
                  placeholderTextColor="#94a3b8"
                  value={mealSearch}
                  onChangeText={setMealSearch}
                />
                {mealSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setMealSearch("")}>
                    <Text
                      style={{
                        color: "#94a3b8",
                        fontSize: 16,
                        paddingHorizontal: 8,
                      }}
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* ── Filtro por categoría ── */}
              {(() => {
                const cats = Array.from(
                  new Set(recetas.map((r) => r.categoria).filter(Boolean)),
                ) as string[];
                if (cats.length === 0) return null;
                return (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.fieldLabel, { marginBottom: 6 }]}>
                      {t("tripDetail.menu.categoriaLabel")}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                    >
                      <TouchableOpacity
                        style={[
                          styles.filterChip,
                          !mealFilterCategoria && styles.filterChipActive,
                        ]}
                        onPress={() => setMealFilterCategoria(null)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            !mealFilterCategoria && styles.filterChipTextActive,
                          ]}
                        >
                          {t("tripDetail.menu.categoriaAll")}
                        </Text>
                      </TouchableOpacity>
                      {cats.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.filterChip,
                            mealFilterCategoria === cat &&
                              styles.filterChipActive,
                          ]}
                          onPress={() =>
                            setMealFilterCategoria(
                              mealFilterCategoria === cat ? null : cat,
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              mealFilterCategoria === cat &&
                                styles.filterChipTextActive,
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                );
              })()}

              {/* ── Filtro por palabra clave ── */}
              {(() => {
                const allKws = Array.from(
                  new Set(recetas.flatMap((r) => r.palabras_clave ?? [])),
                );
                if (allKws.length === 0) return null;
                return (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.fieldLabel, { marginBottom: 6 }]}>
                      {t("tripDetail.menu.palabrasClaveLabel")}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                    >
                      {allKws.map((kw) => (
                        <TouchableOpacity
                          key={kw}
                          style={[
                            styles.filterChip,
                            styles.filterChipKw,
                            mealFilterKeyword === kw &&
                              styles.filterChipKwActive,
                          ]}
                          onPress={() =>
                            setMealFilterKeyword(
                              mealFilterKeyword === kw ? null : kw,
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              mealFilterKeyword === kw &&
                                styles.filterChipKwTextActive,
                            ]}
                          >
                            {kw}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                );
              })()}

              {/* ── Filtro dietario ── */}
              {(() => {
                const dietaOpts = [
                  { key: "es_vegano", label: "🌱 Vegano" },
                  { key: "es_vegetariano", label: "🥗 Vegetariano" },
                  { key: "sin_gluten", label: "🌾 Sin gluten" },
                  { key: "sin_lactosa", label: "🥛 Sin lactosa" },
                ];
                return (
                  <View style={{ marginTop: 12, marginBottom: 16 }}>
                    <Text style={[styles.fieldLabel, { marginBottom: 6 }]}>
                      {t("tripDetail.menu.dietaLabel")}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                    >
                      {dietaOpts.map((d) => (
                        <TouchableOpacity
                          key={d.key}
                          style={[
                            styles.filterChip,
                            styles.filterChipDieta,
                            mealFilterDieta === d.key &&
                              styles.filterChipDietaActive,
                          ]}
                          onPress={() =>
                            setMealFilterDieta(
                              mealFilterDieta === d.key ? null : d.key,
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              mealFilterDieta === d.key &&
                                styles.filterChipDietaTextActive,
                            ]}
                          >
                            {d.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                );
              })()}

              {/* ── Lista de recetas filtrada ── */}
              {(() => {
                const q = mealSearch.toLowerCase();
                const filtered = recetas.filter((r) => {
                  const matchSearch =
                    !q ||
                    r.nombre.toLowerCase().includes(q) ||
                    (r.palabras_clave ?? []).some((kw) =>
                      kw.toLowerCase().includes(q),
                    );
                  const matchKw =
                    !mealFilterKeyword ||
                    (r.palabras_clave ?? []).includes(mealFilterKeyword);
                  const matchCat =
                    !mealFilterCategoria || r.categoria === mealFilterCategoria;
                  const matchDieta =
                    !mealFilterDieta || (r as any)[mealFilterDieta] === true;
                  return matchSearch && matchKw && matchCat && matchDieta;
                });

                return (
                  <>
                    {/* "Sin receta" option */}
                    <TouchableOpacity
                      style={[
                        styles.recetaCard,
                        !selectedRecetaId && styles.recetaCardActive,
                      ]}
                      onPress={() => setSelectedRecetaId(null)}
                    >
                      <View style={styles.recetaCardLeft}>
                        <Text style={{ fontSize: 24 }}>🍴</Text>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.recetaCardNombre,
                              !selectedRecetaId && { color: "#1B4F72" },
                            ]}
                          >
                            {t("tripDetail.menu.sinRecetaEspecifica")}
                          </Text>
                          <Text style={styles.recetaCardSub}>
                            {t("tripDetail.menu.soloRegistrar")}
                          </Text>
                        </View>
                      </View>
                      {!selectedRecetaId && (
                        <Text style={styles.recetaCardCheck}>✓</Text>
                      )}
                    </TouchableOpacity>

                    {filtered.length === 0 && mealSearch.length > 0 && (
                      <View style={styles.emptySearch}>
                        <Text style={styles.emptySearchIcon}>🔍</Text>
                        <Text style={styles.emptySearchText}>
                          {t("tripDetail.menu.sinResultados", { query: mealSearch })}
                        </Text>
                      </View>
                    )}

                    {filtered.map((r) => {
                      const isSelected = selectedRecetaId === r.id;
                      const tipoConf = TIPO_CONFIG[r.tipo_comida] ?? {
                        icon: "🍴",
                        color: "#475569",
                        bgColor: "#f1f5f9",
                      };
                      const tiempoTotal =
                        (r.tiempo_preparacion ?? 0) + (r.tiempo_coccion ?? 0);
                      return (
                        <TouchableOpacity
                          key={r.id}
                          style={[
                            styles.recetaCard,
                            isSelected && styles.recetaCardActive,
                          ]}
                          onPress={() => setSelectedRecetaId(r.id)}
                        >
                          <View style={styles.recetaCardLeft}>
                            <Text style={{ fontSize: 22 }}>
                              {tipoConf.icon}
                            </Text>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.recetaCardNombre,
                                  isSelected && { color: "#1B4F72" },
                                ]}
                              >
                                {r.nombre}
                              </Text>
                              {r.descripcion ? (
                                <Text
                                  style={styles.recetaCardSub}
                                  numberOfLines={1}
                                >
                                  {r.descripcion}
                                </Text>
                              ) : null}
                              <View style={styles.recetaCardMeta}>
                                {tiempoTotal > 0 && (
                                  <View style={styles.recetaMetaChip}>
                                    <Text style={styles.recetaMetaChipText}>
                                      ⏱ {tiempoTotal}min
                                    </Text>
                                  </View>
                                )}
                                {r.es_vegano && (
                                  <View
                                    style={[
                                      styles.recetaMetaChip,
                                      { backgroundColor: "#D1FAE5" },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.recetaMetaChipText,
                                        { color: "#065F46" },
                                      ]}
                                    >
                                      🌱
                                    </Text>
                                  </View>
                                )}
                                {r.es_vegetariano && !r.es_vegano && (
                                  <View
                                    style={[
                                      styles.recetaMetaChip,
                                      { backgroundColor: "#D1FAE5" },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.recetaMetaChipText,
                                        { color: "#065F46" },
                                      ]}
                                    >
                                      🥗
                                    </Text>
                                  </View>
                                )}
                                {r.sin_gluten && (
                                  <View
                                    style={[
                                      styles.recetaMetaChip,
                                      { backgroundColor: "#FEF9C3" },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.recetaMetaChipText,
                                        { color: "#854D0E" },
                                      ]}
                                    >
                                      🌾
                                    </Text>
                                  </View>
                                )}
                                {r.categoria ? (
                                  <View style={styles.recetaMetaChip}>
                                    <Text style={styles.recetaMetaChipText}>
                                      {r.categoria}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                              {(r.palabras_clave ?? []).length > 0 && (
                                <View style={styles.recetaCardKws}>
                                  {(r.palabras_clave as string[])
                                    .slice(0, 3)
                                    .map((kw) => (
                                      <View key={kw} style={styles.recetaKwTag}>
                                        <Text style={styles.recetaKwTagText}>
                                          {kw}
                                        </Text>
                                      </View>
                                    ))}
                                </View>
                              )}
                            </View>
                          </View>
                          {isSelected && (
                            <Text style={styles.recetaCardCheck}>✓</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </>
                );
              })()}
            </ScrollView>
          </SafeAreaView>
          </WebModalWrapper>
        </Modal>

        {/* Add gasto */}
        <Modal
          visible={showAddGastoModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setShowAddGastoModal(false);
            setEditingGasto(null);
            setGastoNombre("");
            setGastoMonto("");
            setGastoCategoria("comida");
            setGastoPagadoPor(null);
            setGastoParticipantes({});
          }}
          onShow={() => {
            if (!editingGasto) initGastoParticipantes();
          }}
        >
          <WebModalWrapper>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddGastoModal(false)}>
                <Text style={styles.modalCancel}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingGasto ? t("tripDetail.gastos.editGastoTitle") : t("tripDetail.gastos.addGastoTitle")}
              </Text>
              <TouchableOpacity
                onPress={handleSaveGasto}
                disabled={savingGasto}
              >
                <Text style={styles.modalSave}>
                  {savingGasto ? "..." : t("common.save")}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t("tripDetail.gastos.gastoNombreLabel")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("tripDetail.gastos.gastoNombrePlaceholder")}
                  placeholderTextColor="#94a3b8"
                  value={gastoNombre}
                  onChangeText={setGastoNombre}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t("tripDetail.gastos.gastoMontoLabel")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("tripDetail.gastos.gastoMontoPlaceholder")}
                  placeholderTextColor="#94a3b8"
                  value={gastoMonto}
                  onChangeText={setGastoMonto}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t("tripDetail.gastos.gastoCategoriaLabel")}</Text>
                <View style={styles.categoriasGrid}>
                  {GASTO_CATEGORIAS.map((cat) => (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.categoriaBtn,
                        gastoCategoria === cat.key && styles.categoriaBtnActive,
                      ]}
                      onPress={() => {
                        setGastoCategoria(cat.key);
                      }}
                    >
                      <Text
                        style={[
                          styles.categoriaBtnText,
                          gastoCategoria === cat.key &&
                            styles.categoriaBtnTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Participantes del gasto (solo para categorías distintas a comida) */}
              {gastoCategoria !== "comida" && participaciones.length > 0 && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    {t("tripDetail.gastos.quienParticipa")}
                  </Text>
                  <Text style={[styles.fieldHint, { marginBottom: 10 }]}>
                    {t("tripDetail.gastos.desactivaHint")}
                  </Text>
                  {familiasList.map((fam, fidx) => {
                    const miembros = participaciones.filter(
                      (p) => p.familia_id === fam.id,
                    );
                    if (miembros.length === 0) return null;
                    const color = UF_COLORS[fidx % UF_COLORS.length];
                    return (
                      <View
                        key={fam.id}
                        style={[
                          styles.gastoPartFamilia,
                          { borderLeftColor: color },
                        ]}
                      >
                        <Text
                          style={[styles.gastoPartFamiliaNombre, { color }]}
                        >
                          {fam.nombre}
                        </Text>
                        {miembros.map((p) => {
                          const activo = gastoPartActivoForModal(p.id);
                          return (
                            <View key={p.id} style={styles.gastoPartRow}>
                              <Text
                                style={[
                                  styles.gastoPartNombre,
                                  { color: activo ? "#1e293b" : "#94a3b8" },
                                ]}
                              >
                                {p.personas.nombre}
                                <Text style={styles.gastoPartFactor}>
                                  {" "}
                                  · {t("tripDetail.gente.factor", { factor: p.factor ?? 1 })}
                                </Text>
                              </Text>
                              <Switch
                                value={activo}
                                onValueChange={(v) =>
                                  setGastoParticipantes((prev) => ({
                                    ...prev,
                                    [p.id]: v,
                                  }))
                                }
                                trackColor={{
                                  false: "#e2e8f0",
                                  true: color + "66",
                                }}
                                thumbColor={activo ? color : "#94a3b8"}
                              />
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t("tripDetail.gastos.quienPago")}</Text>
                {participaciones.length === 0 ? (
                  <Text style={styles.noPersonas}>
                    {t("tripDetail.gastos.noParticipantes")}
                  </Text>
                ) : (
                  participaciones.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.personaOption,
                        gastoPagadoPor === p.persona_id &&
                          styles.personaOptionActive,
                      ]}
                      onPress={() => setGastoPagadoPor(p.persona_id)}
                    >
                      <Text
                        style={[
                          styles.personaOptionText,
                          gastoPagadoPor === p.persona_id &&
                            styles.personaOptionTextActive,
                        ]}
                      >
                        {p.personas.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
          </WebModalWrapper>
        </Modal>

        {/* Gasto options */}
        <Modal
          visible={showGastoOptionsModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowGastoOptionsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.estadoModalBox}>
              <Text style={styles.estadoModalTitle}>
                {gastoOptionsTarget?.nombre}
              </Text>
              <Text
                style={[
                  styles.gastoCategoriaLabel,
                  { textAlign: "center", marginBottom: 12, fontSize: 13 },
                ]}
              >
                {GASTO_CATEGORIAS.find(
                  (c) => c.key === (gastoOptionsTarget?.categoria ?? "otros"),
                )?.label ?? "📦 Otros"}{" "}
                · {formatCOP(gastoOptionsTarget?.monto ?? 0)}
              </Text>
              <TouchableOpacity
                style={[styles.estadoOption, { backgroundColor: "#EFF6FF" }]}
                onPress={() => {
                  setShowGastoOptionsModal(false);
                  openEditGasto(gastoOptionsTarget);
                }}
              >
                <Text style={[styles.estadoOptionText, { color: "#1B4F72" }]}>
                  {t("tripDetail.gastos.optionsEditar")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.estadoOption, { backgroundColor: "#FEE2E2" }]}
                onPress={() => {
                  setShowGastoOptionsModal(false);
                  setDeleteGastoTarget(gastoOptionsTarget);
                  setShowDeleteGastoModal(true);
                }}
              >
                <Text style={[styles.estadoOptionText, { color: "#DC2626" }]}>
                  {t("tripDetail.gastos.optionsEliminar")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.estadoCancel}
                onPress={() => setShowGastoOptionsModal(false)}
              >
                <Text style={styles.estadoCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Directorio modal */}
        <Modal
          visible={showDirectorioModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setShowDirectorioModal(false);
            setDirectorioSearch("");
          }}
        >
          <WebModalWrapper>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowDirectorioModal(false);
                  setDirectorioSearch("");
                }}
              >
                <Text style={styles.modalCancel}>{t("common.close")}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t("tripDetail.gastos.directorioTitle")}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDirectorioModal(false);
                  setDirEditNombre("");
                  setDirEditEmail("");
                  setDirEditFamilia("");
                  setDirOptionsTarget(null);
                  setShowDirEditModal(true);
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: "#1B4F72",
                    fontWeight: "700",
                    width: 70,
                    textAlign: "right",
                  }}
                >
                  {t("tripDetail.gastos.directorioNuevo")}
                </Text>
              </TouchableOpacity>
            </View>
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#f1f5f9",
              }}
            >
              <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder={t("tripDetail.gastos.directorioBuscar")}
                  placeholderTextColor="#94a3b8"
                  value={directorioSearch}
                  onChangeText={setDirectorioSearch}
                />
                {directorioSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setDirectorioSearch("")}>
                    <Text
                      style={{
                        color: "#94a3b8",
                        fontSize: 16,
                        paddingHorizontal: 8,
                      }}
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
              {/* Mi perfil primero */}
              {miPersonaId &&
                !participaciones.find(
                  (p: any) => p.persona_id === miPersonaId,
                ) && (
                  <View>
                    <Text
                      style={[
                        styles.modalSectionLabel,
                        {
                          paddingHorizontal: 20,
                          paddingTop: 16,
                          paddingBottom: 4,
                        },
                      ]}
                    >
                      {t("tripDetail.gastos.directorioYo")}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.directorioItem,
                        { paddingHorizontal: 20, backgroundColor: "#EFF6FF" },
                      ]}
                      onPress={() => {
                        setNewPersonaNombre(miPersonaNombre);
                        setAddingSelf(true);
                        setShowDirectorioModal(false);
                        setDirectorioSearch("");
                      }}
                    >
                      <View
                        style={[
                          styles.directorioAvatar,
                          { backgroundColor: "#1B4F72" },
                        ]}
                      >
                        <Text style={styles.directorioAvatarText}>
                          {initials(miPersonaNombre)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.directorioNombre}>
                          {miPersonaNombre}
                        </Text>
                        <Text style={styles.directorioSub}>{t("tripDetail.gastos.directorioMiCuenta")}</Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: "#1B4F72",
                          borderRadius: 12,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: "700",
                          }}
                        >
                          {t("tripDetail.gastos.directorioAgregar")}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <View
                      style={[
                        styles.directorioSeparador,
                        { marginHorizontal: 20 },
                      ]}
                    />
                  </View>
                )}
              {/* Contactos del directorio */}
              {loadingDirectorio ? (
                <ActivityIndicator color="#1B4F72" style={{ marginTop: 24 }} />
              ) : (
                (() => {
                  const filtered = directorio.filter((d: any) =>
                    d.nombre
                      .toLowerCase()
                      .includes(directorioSearch.toLowerCase()),
                  );
                  if (
                    filtered.length === 0 &&
                    directorio.length === 0 &&
                    !miPersonaId
                  )
                    return (
                      <View style={[styles.emptyState, { paddingTop: 40 }]}>
                        <Text style={styles.emptyIcon}>📋</Text>
                        <Text style={styles.emptyText}>{t("tripDetail.gastos.directorioVacio")}</Text>
                        <Text style={styles.emptySub}>
                          {t("tripDetail.gastos.directorioVacioSub")}
                        </Text>
                      </View>
                    );
                  const grouped: Record<string, any[]> = {};
                  filtered.forEach((d: any) => {
                    const letter = d.nombre[0].toUpperCase();
                    if (!grouped[letter]) grouped[letter] = [];
                    grouped[letter].push(d);
                  });
                  return (
                    <>
                      {filtered.length > 0 && (
                        <Text
                          style={[
                            styles.modalSectionLabel,
                            {
                              paddingHorizontal: 20,
                              paddingTop: 16,
                              paddingBottom: 4,
                            },
                          ]}
                        >
                          {t("tripDetail.gastos.directorioMisContactos")}
                        </Text>
                      )}
                      {Object.keys(grouped)
                        .sort()
                        .map((letter) => (
                          <View key={letter}>
                            <Text style={styles.directorioLetra}>{letter}</Text>
                            {grouped[letter].map((d: any) => (
                              <TouchableOpacity
                                key={d.id}
                                style={[
                                  styles.directorioItem,
                                  { paddingHorizontal: 20 },
                                ]}
                                onPress={() => {
                                  setNewPersonaNombre(d.nombre);
                                  if (d.email) {
                                    setEnviarInvitacion(true);
                                    setEmailInvitacion(d.email);
                                  }
                                  if (d.familia_nombre) {
                                    const fam = familiasList.find(
                                      (f: any) => f.nombre === d.familia_nombre,
                                    );
                                    if (fam) setSelectedFamiliaId(fam.id);
                                  }
                                  setShowDirectorioModal(false);
                                  setDirectorioSearch("");
                                }}
                                onLongPress={() => {
                                  setDirOptionsTarget(d);
                                  setShowDirOptionsModal(true);
                                }}
                              >
                                <View style={styles.directorioAvatar}>
                                  <Text style={styles.directorioAvatarText}>
                                    {initials(d.nombre)}
                                  </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.directorioNombre}>
                                    {d.nombre}
                                  </Text>
                                  {d.familia_nombre ? (
                                    <Text style={styles.directorioSub}>
                                      {d.familia_nombre}
                                      {d.email ? ` · ${d.email}` : ""}
                                    </Text>
                                  ) : d.email ? (
                                    <Text style={styles.directorioSub}>
                                      {d.email}
                                    </Text>
                                  ) : null}
                                </View>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: "#1B4F72",
                                    fontWeight: "600",
                                  }}
                                >
                                  {t("tripDetail.gastos.directorioUsar")}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        ))}
                    </>
                  );
                })()
              )}
            </ScrollView>
          </SafeAreaView>
          </WebModalWrapper>
        </Modal>

        {/* Directorio: options modal */}
        <Modal
          visible={showDirOptionsModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowDirOptionsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.estadoModalBox}>
              <Text style={styles.estadoModalTitle}>
                {dirOptionsTarget?.nombre}
              </Text>
              {dirOptionsTarget?.email && (
                <Text
                  style={[
                    styles.familiaModalSub,
                    { textAlign: "center", marginBottom: 12 },
                  ]}
                >
                  {dirOptionsTarget.email}
                </Text>
              )}
              <TouchableOpacity
                style={[styles.estadoOption, { backgroundColor: "#EFF6FF" }]}
                onPress={() => {
                  setShowDirOptionsModal(false);
                  setDirEditNombre(dirOptionsTarget?.nombre ?? "");
                  setDirEditEmail(dirOptionsTarget?.email ?? "");
                  setDirEditFamilia(dirOptionsTarget?.familia_nombre ?? "");
                  setShowDirEditModal(true);
                }}
              >
                <Text style={[styles.estadoOptionText, { color: "#1B4F72" }]}>
                  {t("tripDetail.gastos.dirOptionsEditar")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.estadoOption, { backgroundColor: "#FEE2E2" }]}
                onPress={() => {
                  setShowDirOptionsModal(false);
                  setShowDirDeleteModal(true);
                }}
              >
                <Text style={[styles.estadoOptionText, { color: "#DC2626" }]}>
                  {t("tripDetail.gastos.dirOptionsEliminar")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.estadoCancel}
                onPress={() => setShowDirOptionsModal(false)}
              >
                <Text style={styles.estadoCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Directorio: delete confirm */}
        <Modal
          visible={showDirDeleteModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowDirDeleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>{t("tripDetail.gastos.dirDeleteTitle")}</Text>
              <Text style={styles.confirmMessage}>
                {t("tripDetail.gastos.dirDeleteMessage", { name: dirOptionsTarget?.nombre })}
              </Text>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: "#DC2626" }]}
                onPress={async () => {
                  setShowDirDeleteModal(false);
                  await supabase
                    .from("directorio")
                    .delete()
                    .eq("id", dirOptionsTarget?.id);
                  await loadDirectorio();
                }}
              >
                <Text style={styles.confirmBtnText}>{t("common.delete")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.estadoCancel}
                onPress={() => setShowDirDeleteModal(false)}
              >
                <Text style={styles.estadoCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Directorio: edit modal */}
        <Modal
          visible={showDirEditModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowDirEditModal(false)}
        >
          <WebModalWrapper>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDirEditModal(false)}>
                <Text style={styles.modalCancel}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {dirOptionsTarget?.id ? t("tripDetail.gastos.dirEditTitle") : t("tripDetail.gastos.dirNewTitle")}
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  if (!dirEditNombre.trim()) return;
                  const {
                    data: { session },
                  } = await supabase.auth.getSession();
                  if (!session) return;
                  if (dirOptionsTarget?.id) {
                    await supabase
                      .from("directorio")
                      .update({
                        nombre: dirEditNombre.trim(),
                        email: dirEditEmail.trim() || null,
                        familia_nombre: dirEditFamilia.trim() || null,
                      })
                      .eq("id", dirOptionsTarget.id);
                  } else {
                    await supabase.from("directorio").insert({
                      owner_id: session.user.id,
                      nombre: dirEditNombre.trim(),
                      email: dirEditEmail.trim() || null,
                      familia_nombre: dirEditFamilia.trim() || null,
                    });
                  }
                  setShowDirEditModal(false);
                  await loadDirectorio();
                }}
              >
                <Text style={styles.modalSave}>{t("common.save")}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t("tripDetail.gastos.dirNombreLabel")}</Text>
                <TextInput
                  style={styles.input}
                  value={dirEditNombre}
                  onChangeText={setDirEditNombre}
                  placeholder={t("tripDetail.gastos.dirNombrePlaceholder")}
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t("tripDetail.gastos.dirEmailLabel")}</Text>
                <TextInput
                  style={styles.input}
                  value={dirEditEmail}
                  onChangeText={setDirEditEmail}
                  placeholder={t("tripDetail.gastos.dirEmailPlaceholder")}
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t("tripDetail.gastos.dirFamiliaLabel")}</Text>
                <TextInput
                  style={styles.input}
                  value={dirEditFamilia}
                  onChangeText={setDirEditFamilia}
                  placeholder={t("tripDetail.gastos.dirFamiliaPlaceholder")}
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="words"
                />
              </View>
            </ScrollView>
          </SafeAreaView>
          </WebModalWrapper>
        </Modal>

        {/* Delete gasto */}
        <Modal
          visible={showDeleteGastoModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowDeleteGastoModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>Eliminar gasto</Text>
              <Text style={styles.confirmMessage}>
                ¿Eliminar "{deleteGastoTarget?.nombre}"?
              </Text>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: "#DC2626" }]}
                onPress={confirmDeleteGasto}
              >
                <Text style={styles.confirmBtnText}>Eliminar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.estadoCancel}
                onPress={() => setShowDeleteGastoModal(false)}
              >
                <Text style={styles.estadoCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  fieldHint: { fontSize: 11, color: "#94a3b8" },
  mealPorciones: { fontSize: 12, color: "#64748b", marginTop: 3 },

  // Header
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

  // Tabs
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 4,
  },
  tab: { paddingVertical: 12, paddingHorizontal: 18, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#1B4F72" },
  tabText: { fontSize: 11, fontWeight: "600", color: "#94a3b8" },
  tabTextActive: { color: "#1B4F72" },

  flex1: { flex: 1 },
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
  },
  mapLinkIcon: { fontSize: 32 },
  mapLinkInfo: { flex: 1 },
  mapLinkTitle: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  mapLinkSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  mapLinkArrow: { fontSize: 20, color: "#1B4F72", fontWeight: "700" },

  // Trip photo
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

  // Section
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
  inviteHint: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    marginBottom: 14,
  },
  inviteShareBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  inviteShareBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

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

  // Estado banners
  estadoBanner: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  estadoBannerLiquidado: {
    backgroundColor: "#DBEAFE",
    borderBottomColor: "#BFDBFE",
  },
  estadoBannerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#92400E",
    textAlign: "center",
  },
  estadoBannerLiquidadoText: {
    color: "#1D4ED8",
  },

  // Familia card
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
    gap: 12,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  familiaAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2 },
  familiaAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  familiaAvatarText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  familiaTitulo: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  familiaCount: { fontSize: 11, color: "#94a3b8", marginTop: 1 },

  participanteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f8fafc",
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

  // Date selector
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

  // Meal card
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
  exportButton: {
    backgroundColor: "#1B4F72",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  exportButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Meal detail modal content
  mealDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 16,
  },
  mealDetailTipo: { fontSize: 15, fontWeight: "700" },
  mealDetailFecha: { fontSize: 12, color: "#64748b", marginTop: 2 },
  mealDetailPorciones: { alignItems: "center" },
  mealDetailPorcionesNum: { fontSize: 28, fontWeight: "800", color: "#1B4F72" },
  mealDetailPorcionesSub: { fontSize: 10, color: "#64748b" },
  mealPartFamilia: { borderLeftWidth: 3, paddingLeft: 12, marginBottom: 16 },
  mealPartFamiliaNombre: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mealPartRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  mealPartInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  mealPartAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2 },
  mealPartNombre: { fontSize: 14, fontWeight: "600" },
  mealPartFactor: { fontSize: 11, color: "#94a3b8" },

  // Gastos
  gastosSubTabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  gastosSubTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  gastosSubTabActive: { borderBottomColor: "#1B4F72" },
  gastosSubTabText: { fontSize: 12, fontWeight: "600", color: "#94a3b8" },
  gastosSubTabTextActive: { color: "#1B4F72" },
  gastosTotalLabel: { fontSize: 12, color: "#64748b", marginTop: 2 },
  gastosSubHint: { fontSize: 12, color: "#94a3b8" },
  gastoCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  gastoCardLeft: { flex: 1 },
  gastoNombre: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  gastoPagadoPorText: { fontSize: 12, color: "#64748b", marginTop: 3 },
  gastoCardRight: { alignItems: "flex-end" },
  gastoMonto: { fontSize: 16, fontWeight: "800", color: "#1B4F72" },
  gastoHint: { fontSize: 10, color: "#cbd5e1", marginTop: 2 },
  balanceCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  balanceCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  balanceNombre: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  balanceMiembros: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  balanceSaldo: { fontSize: 16, fontWeight: "800" },
  balanceRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  balanceItem: { flex: 1, alignItems: "center" },
  balanceItemLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "600",
    marginBottom: 2,
  },
  balanceItemValue: { fontSize: 13, fontWeight: "700", color: "#1e293b" },
  balanceDivider: { width: 1, height: 28, backgroundColor: "#e2e8f0" },
  balanceBarBg: {
    height: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 3,
    overflow: "hidden",
  },
  balanceBarFill: { height: 6, borderRadius: 3 },
  liquidacionCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  liquidacionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  liquidacionDe: { fontSize: 14, fontWeight: "700", color: "#DC2626" },
  liquidacionArrow: { fontSize: 16, color: "#94a3b8" },
  liquidacionPara: { fontSize: 14, fontWeight: "700", color: "#16a34a" },
  liquidacionMonto: { fontSize: 16, fontWeight: "800", color: "#1B4F72" },

  // Categoria
  categoriasGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoriaBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  categoriaBtnActive: { borderColor: "#1B4F72", backgroundColor: "#EFF6FF" },
  categoriaBtnText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  categoriaBtnTextActive: { color: "#1B4F72" },
  gastoCategoriaLabel: { fontSize: 11, color: "#94a3b8", marginTop: 3 },
  gastoPartFamilia: { borderLeftWidth: 3, paddingLeft: 12, marginBottom: 14 },
  gastoPartFamiliaNombre: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  gastoPartRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  gastoPartNombre: { fontSize: 14, fontWeight: "600", flex: 1 },
  gastoPartFactor: { fontSize: 12, fontWeight: "400", color: "#94a3b8" },
  balanceCatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  balanceCatLabel: { fontSize: 12, color: "#64748b" },
  balanceCatValue: { fontSize: 12, fontWeight: "600", color: "#1e293b" },

  // Resumen por persona
  personaBalanceGroup: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginBottom: 20,
  },
  personaBalanceGroupNombre: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  personaBalanceCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  personaBalanceTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  personaBalanceAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
  },
  personaBalanceNombre: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  personaBalanceFactor: { fontSize: 11, color: "#94a3b8", marginTop: 1 },

  // Export
  // Liquidaciones pagadas
  liquidacionCardPagada: { opacity: 0.55, backgroundColor: "#f0fdf4" },
  liquidacionTextPagada: {
    textDecorationLine: "line-through",
    color: "#94a3b8",
  },
  liqCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexShrink: 0,
  },
  liqCheckboxPagada: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  liqCheckmark: { color: "#fff", fontSize: 13, fontWeight: "800" },
  liquidadoPrompt: {
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    alignItems: "center",
    gap: 12,
  },
  liquidadoPromptText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#16a34a",
    textAlign: "center",
  },
  liquidadoBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  liquidadoBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  exportRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  exportBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#1B4F72",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  exportBtnPDF: { backgroundColor: "#1B4F72", borderColor: "#1B4F72" },
  exportBtnText: { fontSize: 13, fontWeight: "700", color: "#1B4F72" },

  // Modal shared
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
    maxWidth: 440,
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
  confirmBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    maxWidth: 440,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  confirmMessage: {
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
  familiaModalBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    maxWidth: 440,
    alignItems: "center",
  },
  familiaModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 4,
  },
  familiaModalSub: { fontSize: 14, color: "#64748b", marginBottom: 8 },
  familiaInput: {
    borderWidth: 2,
    borderColor: "#1B4F72",
    borderRadius: 12,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    width: 120,
    paddingVertical: 10,
    color: "#1e293b",
    marginBottom: 20,
  },
  familiaModalButtons: { flexDirection: "row", gap: 12, width: "100%" },
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
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Familia photo in edit modal
  familiaPhotoBtn: { alignSelf: "center", marginBottom: 20 },
  familiaPhotoBtnImg: { width: 96, height: 96, borderRadius: 48 },
  familiaPhotoBtnPlaceholder: {
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
  familiaPhotoBtnText: { fontSize: 12, color: "#94a3b8", marginTop: 4 },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 10,
  },
  searchIcon: { fontSize: 14, marginRight: 4 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: "#1e293b" },
  searchResults: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  searchResultItemActive: { backgroundColor: "#EFF6FF" },
  searchResultDot: { width: 8, height: 8, borderRadius: 4 },
  searchResultText: { fontSize: 14, color: "#475569", fontWeight: "500" },
  searchResultTextActive: { color: "#1B4F72", fontWeight: "700" },
  selectedPersonaBadge: {
    marginTop: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 10,
  },
  selectedPersonaText: { color: "#1B4F72", fontWeight: "700", fontSize: 13 },
  noPersonas: { fontSize: 13, color: "#94a3b8", fontStyle: "italic" },

  // Toggles / options
  toggleRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
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
  personaOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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

  // Factor presets
  factorSliderRow: { flexDirection: "row", gap: 8 },
  factorPresetBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  factorPresetBtnActive: { borderColor: "#1B4F72", backgroundColor: "#EFF6FF" },
  factorPresetText: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  factorPresetTextActive: { color: "#1B4F72" },

  // Meal modal
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

  // New meal modal styles
  tipoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  tipoChipText: { fontSize: 13, fontWeight: "600", color: "#64748b" },

  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  filterChipActive: { borderColor: "#1B4F72", backgroundColor: "#EFF6FF" },
  filterChipText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  filterChipTextActive: { color: "#1B4F72" },
  filterChipKw: { borderColor: "#BFDBFE", backgroundColor: "#EFF6FF" },
  filterChipKwActive: { borderColor: "#1D4ED8", backgroundColor: "#DBEAFE" },
  filterChipKwTextActive: { color: "#1D4ED8" },
  filterChipDieta: { borderColor: "#BBF7D0", backgroundColor: "#F0FDF4" },
  filterChipDietaActive: { borderColor: "#16a34a", backgroundColor: "#DCFCE7" },
  filterChipDietaTextActive: { color: "#15803D" },

  recetaCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 8,
  },
  recetaCardActive: { borderColor: "#1B4F72", backgroundColor: "#EFF6FF" },
  recetaCardLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
  },
  recetaCardNombre: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  recetaCardSub: { fontSize: 12, color: "#64748b", marginBottom: 4 },
  recetaCardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  recetaMetaChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  recetaMetaChipText: { fontSize: 11, color: "#475569", fontWeight: "600" },
  recetaCardKws: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  recetaKwTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#DBEAFE",
  },
  recetaKwTagText: { fontSize: 10, color: "#1D4ED8", fontWeight: "600" },
  recetaCardCheck: {
    fontSize: 18,
    color: "#1B4F72",
    fontWeight: "800",
    marginLeft: 8,
  },

  emptySearch: { alignItems: "center", paddingVertical: 24 },
  emptySearchIcon: { fontSize: 32, marginBottom: 8 },
  emptySearchText: { fontSize: 14, color: "#64748b" },

  // Directorio
  directorioItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  directorioAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1B4F72",
    alignItems: "center",
    justifyContent: "center",
  },
  directorioAvatarText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  directorioNombre: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  directorioSub: { fontSize: 11, color: "#94a3b8", marginTop: 1 },
  // Directorio modal
  nombreRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  directorioBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#1B4F72",
    alignItems: "center",
    justifyContent: "center",
  },
  directorioBtnText: { fontSize: 20 },

  // Directorio modal
  directorioLetra: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  directorioGroupLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    letterSpacing: 1,
  },
  directorioModalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  yoBadge: {
    backgroundColor: "#1B4F72",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  yoBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  directorioSeparador: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginTop: 16,
    marginBottom: 4,
  },

  // Switch rows
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: 4,
  },
  switchLabel: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  switchSub: { fontSize: 11, color: "#94a3b8", marginTop: 2 },

  // Tab scroll
  tabsScroll: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", maxHeight: 44 },

  // Resumen tab
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statNumber: { fontSize: 14, fontWeight: "800", color: "#1B4F72", marginBottom: 2 },
  statLabel: { fontSize: 11, color: "#64748b", fontWeight: "600" },

  proximaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  proximaEmoji: { fontSize: 22 },
  proximaLabel: { fontSize: 13, fontWeight: "700", color: "#1e293b" },
  proximaReceta: { fontSize: 12, color: "#64748b", marginTop: 1 },
  proximaPorciones: { fontSize: 12, color: "#94a3b8", fontWeight: "600" },

  deleteTripBtn: {
    marginTop: 8,
    marginBottom: 16,
    padding: 14,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fff5f5",
  },
  deleteTripText: { color: "#dc2626", fontSize: 14, fontWeight: "700" },
});
