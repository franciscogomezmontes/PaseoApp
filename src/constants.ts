export const ONBOARDING_KEY = "paseoapp_onboarding_done";
export const NOTIFICACIONES_KEY = "paseoapp_notificaciones_enabled";

export const TOOLTIP_KEYS = {
  trips:    "tooltip_trips_seen",
  recipes:  "tooltip_recipes_seen",
  grocery:  "tooltip_grocery_seen",
  expenses: "tooltip_expenses_seen",
};

export const ESTADO_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  planificacion: { color: "#92400E", bg: "#FEF3C7", label: "📋 Planificación" },
  activo:        { color: "#065F46", bg: "#D1FAE5", label: "✅ Activo" },
  liquidado:     { color: "#1D4ED8", bg: "#DBEAFE", label: "💸 Liquidado" },
};

export const TIPO_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
  desayuno:        { icon: "☀️",  color: "#B45309", bgColor: "#FEF3C7" },
  "medias nueves": { icon: "🥪",  color: "#92400E", bgColor: "#FEF3C7" },
  almuerzo:        { icon: "🍽️", color: "#1D4ED8", bgColor: "#DBEAFE" },
  onces:           { icon: "🍵",  color: "#065F46", bgColor: "#D1FAE5" },
  cena:            { icon: "🌙",  color: "#6D28D9", bgColor: "#EDE9FE" },
  snack:           { icon: "🥐",  color: "#065F46", bgColor: "#D1FAE5" },
};

export const GASTO_CATEGORIAS = [
  { key: "comida",       label: "🍽️ Comida",          usaMomentos: true  },
  { key: "alojamiento",  label: "🏠 Alojamiento",      usaMomentos: false },
  { key: "transporte",   label: "🚗 Transporte",       usaMomentos: false },
  { key: "alcohol",      label: "🍺 Alcohol y Entret.", usaMomentos: false },
  { key: "otros",        label: "📦 Otros",             usaMomentos: false },
];
