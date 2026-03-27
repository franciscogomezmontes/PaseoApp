// ─────────────────────────────────────────────────────────────────────────────
// Ingredientes — constantes compartidas
//
// Estas listas son la fuente única de verdad para unidades y categorías de
// ingredientes. Se usan en:
//   - app/(tabs)/recipes.tsx  (tab de ingredientes)
//   - app/newRecipe.tsx       (modal "Nuevo ingrediente" dentro de una receta)
//
// Futuro: cuando se agregue el toggle de sistema de unidades, agregar aquí
// las listas UNIDADES_IMPERIAL y una función getUnidades(sistema) que retorne
// la lista correcta según el sistema activo.
// ─────────────────────────────────────────────────────────────────────────────

export const UNIDADES_METRICO = [
  "g",
  "kg",
  "ml",
  "l",
  "unidades",
  "tazas",
  "cucharadas",
  "cucharadítas",
  "cubos",
  "partes",
  "tajadas",
  "dientes",
  "rama",
  "atados",
  "paquetes",
];

// Alias para uso actual — reemplazar por getUnidades(sistemaActivo) cuando
// se implemente el toggle
export const UNIDADES = UNIDADES_METRICO;

export const CATEGORIAS_ING = [
  "Abarrotes",
  "Carnes y proteínas",
  "Frutas y verduras",
  "Lácteos y huevos",
  "Granos y cereales",
  "Nevera",
  "Condimentos",
  "Bebidas",
  "Panadería",
  "Enlatados",
  "Otros",
];
