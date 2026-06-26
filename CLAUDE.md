# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PaseoApp** is an Expo-based React Native mobile application (iOS, Android, web) for organizing group outings ("paseos"). It manages trip planning, shared menus, grocery lists, expense splitting, and recipe catalogs through a Supabase backend.

**Tech Stack:**
- **Frontend:** React Native 0.81.5 with Expo ~54.0.33, TypeScript 5.9, React 19.1
- **Navigation:** Expo Router 6.0.23 (file-based routing in `/app` directory)
- **State Management:** Zustand 5.0.11 (multiple focused stores per feature)
- **Backend:** Supabase (PostgreSQL + Auth)
- **Storage:** AsyncStorage (local state), Expo SecureStore (JWT tokens with chunking)
- **Maps & Media:** react-native-maps 1.20.1, expo-image, expo-image-picker, expo-document-picker
- **Build System:** EAS (Expo Application Services)

## Development Commands

```bash
# Start dev server (port 8082)
npm start

# Run on specific platform
npm run android   # Android emulator
npm run ios       # iOS simulator
npm run web       # Web browser

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Reset project (moves starter code to app-example/, creates blank app/)
npm run reset-project
```

**Debugging:**
- Expo Go app for quick testing on physical devices
- Development builds via EAS for native features (maps, etc.)
- Console logs visible in Metro bundler output

## Architecture & Data Flow

### Navigation Structure

**Root Layout** (`app/_layout.tsx`):
- Manages auth state & onboarding flow
- Routes: `/onboarding` → `/auth` → `/(tabs)` (main app)
- Uses `useSegments()` to detect route changes and enforce navigation guards

**Tab Layout** (`app/(tabs)/_layout.tsx`):
- 5 primary tabs: Home (Inicio), Trips (Mis Paseos), Recipes (Recetas), Grocery (Mercado), Expenses (Gastos)
- Menu tab exists but is hidden (`href: null`)
- Tab styling: blue theme (#1B4F72), emoji icons, 60px height

**Modal & Detail Screens:**
- `/newTrip`, `/joinTrip` → trip creation/joining (modal presentation)
- `/tripDetail`, `/participantDetail`, `/recipeDetail` → full-screen details
- `/attendance` → meal attendance tracking
- `/newRecipe`, `/adminUpload` → data creation
- `/onboarding` → first-launch carousel

### State Management (Zustand)

Only three Zustand stores exist. Grocery and expenses manage state locally with `useState` and call Supabase directly from the screen component.

**useAuthStore** (`src/store/useAuthStore.ts`):
- Manages: session, user, persona (user profile), loading, signup/signin/signout
- Listens to `supabase.auth.onAuthStateChange()` for real-time updates
- Auto-creates `personas` record if missing (links auth user to profile)
- Detects email confirmation requirement and stores pending signup info
- Module-level subscription refs prevent listener accumulation on re-renders

**useTripStore** (`src/store/useTripStore.ts`):
- Manages: paseos (trips), personas list, loading/error
- Fetches trips with organizer names joined from personas table
- Creates trips, participants, and meal attendance records
- Uses Supabase upsert for attendance conflicts

**useRecipeStore** (`src/store/useRecipeStore.ts`):
- Manages: recetas (recipes) with full nested ingredient relationships
- Fetches recipes alphabetically; supports nested selects for receta_ingredientes
- Stores keywords, diet tags (vegan, vegetarian, gluten-free, lactose-free), times

**grocery.tsx** (no store — direct Supabase):
- Reads/writes `lista_mercado` table directly from screen state
- Generates list from `receta_ingredientes` joined via `momentos_comida`
- Supports toggle comprado, add extras, delete, share as text

**expenses.tsx** (no store — direct Supabase):
- Reads from `gastos`, `participaciones`, `familias`, `momentos_comida`, `participantes_gasto`, `participantes_comida`
- Uses two-tier `Promise.all` for parallel loading
- Settlement algorithm via `src/lib/liquidacion.ts`

### Database Layer

**Supabase Client** (`src/lib/supabase.ts`):
- Initializes with EXPO_PUBLIC_SUPABASE_* env vars
- Uses `createClient<Database>` with generated types from `src/lib/database.types.ts`
- **JWT Chunking:** Splits tokens into 1800-byte chunks (SecureStore 2KB limit) and stores count metadata
- Session persistence via SecureStore with auto-refresh on app resume
- PKCE auth flow for security

**Database Types** (`src/lib/database.types.ts`):
- Generated via `supabase gen types typescript --project-id ovggbiazonqtocgyxzfy --schema public`
- Exports `Database` type + helpers `Tables<>`, `TablesInsert<>`, `TablesUpdate<>`
- Regenerate when schema changes

**Settlement Algorithm** (`src/lib/liquidacion.ts`):
- Greedy minimum-cash-flow algorithm: converts balances → minimum set of transfers
- Exports `Balance`, `Transferencia` interfaces and `calcularTransferenciasMinimas()`
- Used by both `expenses.tsx` and `tripDetail.tsx`

**Key Tables:**
- `personas`: user profiles (id, nombre, email, auth_user_id)
- `paseos`: trips (id, nombre, lugar, fecha_inicio, fecha_fin, estado, codigo_invitacion, organizer_id, foto_url, link_alojamiento, link_mapa, recomendaciones)
- `participaciones`: trip participants (id, paseo_id, persona_id, unidad_familiar, factor, familia_id, fecha_desde, fecha_hasta)
- `familias`: family groups within a trip (id, paseo_id, nombre)
- `asistencia_comidas`: meal attendance (participacion_id, fecha, tipo_comida, asiste)
- `momentos_comida`: scheduled meals (id, paseo_id, fecha, tipo_comida, receta_id, porciones)
- `participantes_comida`: per-meal attendance override (momento_id, participacion_id, activo)
- `gastos`: expenses (id, paseo_id, nombre, monto, categoria, pagado_por, created_at)
- `participantes_gasto`: per-expense participant list (gasto_id, participacion_id, activo)
- `liquidaciones_pagadas`: settled transfers (paseo_id, de_familia_id, para_familia_id)
- `lista_mercado`: shopping list items (id, paseo_id, nombre, cantidad, unidad, categoria, comprado, es_extra, ingrediente_id, recomendaciones)
- `recetas`: recipes (id, nombre, tipo_comida, porciones_base, descripcion, foto_url, es_vegano, es_vegetariano, sin_gluten, sin_lactosa, tiempo_preparacion, tiempo_coccion, creditos, utensilios, palabras_clave)
- `receta_ingredientes`: recipe-ingredient mapping (receta_id, ingrediente_id, cantidad_por_porcion)
- `ingredientes`: ingredient master data (id, nombre, unidad_base, categoria, observaciones)

### Screen Implementation Patterns

Screens follow a consistent pattern using hooks and Zustand:

```typescript
// Example: app/(tabs)/trips.tsx
export default function TripsScreen() {
  const { paseos, loading, fetchPaseos } = useTripStore();
  const { persona } = useAuthStore();

  useFocusEffect(
    useCallback(() => {
      fetchPaseos(); // Refresh on screen focus
    }, []),
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? <ActivityIndicator /> : <ScrollView>...</ScrollView>}
    </SafeAreaView>
  );
}
```

**Key Patterns:**
- `useFocusEffect()` for refetching when navigating to tab
- Modal dialogs for creation flows (TextInput + Picker chips)
- Cards/lists with emoji icons and color-coded badges (estado, tipo_comida)
- Safe area handling with react-native-safe-area-context
- Error states shown in modal dialogs

### UI Constants & Theming

- **Primary Color:** #1B4F72 (dark blue)
- **Backgrounds:** #f1f5f9 (light gray), #fff (white)
- **Status Badges:** planificacion (#FEF3C7), activo (#D1FAE5), liquidado (#DBEAFE)
- **Meal Types:** desayuno (☀️), almuerzo (🍽️), cena (🌙), snack (🥐)
- **Ingredient Units:** g, kg, ml, l, unidades, tazas, cucharadas, etc. (in `src/ingredientConstants.ts`)
- **Ingredient Categories:** Abarrotes, Carnes, Frutas/Verduras, Lácteos, Granos, Nevera, Condimentos, Bebidas, Panadería, Enlatados, Otros

### Onboarding & Persistence

- **First Launch:** Carousel (5 slides, emoji-driven) in `/onboarding`
- **AsyncStorage Keys:**
  - `paseoapp_onboarding_done`: boolean flag
  - `tooltip_*`: tracks tab tooltips (TabTooltip component dismissals)
- **Flow:** App checks onboarding flag → if false, show carousel → user marks done → redirects to auth screen

## Common Development Scenarios

### Adding a New Tab Feature

1. Create screen in `app/(tabs)/newfeature.tsx`
2. Create Zustand store in `src/store/useFeatureStore.ts`
3. Add to tab navigation in `app/(tabs)/_layout.tsx`:
   ```typescript
   <Tabs.Screen name="newfeature" options={{ tabBarLabel: "Feature", tabBarIcon: () => <Text>🎉</Text> }} />
   ```
4. Create Supabase table and RLS policies
5. Update useFocusEffect in screen to refetch on tab focus

### Adding a Modal Screen

1. Create `app/modalname.tsx` with `presentation: "modal"` in root `_layout.tsx`
2. Pass route params: `router.push({ pathname: "/modalname", params: { id: "123" } })`
3. Access params: `const { id } = useLocalSearchParams()`
4. Return to previous: `router.back()` or `router.replace("/(tabs)")`

### Connecting to Supabase

- Import `supabase` from `src/lib/supabase.ts`
- All queries return `{ data, error }` destructured
- Use `.select()`, `.insert()`, `.update()`, `.delete()`, `.upsert()` with RLS auth
- For nested relations, use dot notation: `.select("*, receta_ingredientes(*, ingredientes(*))")`

### Styling

- **StyleSheet.create()** for all styles (React Native requirement)
- **Colors:** Use hex codes; reference theme colors in comments
- **Responsive:** Use `Dimensions.get("window")` if needed; SafeAreaView handles notches
- **Shadows:** elevation (Android) + shadowColor/shadowOpacity/shadowRadius (iOS)
- **Icons:** Emoji text (`<Text>🏠</Text>`) — not a separate icon library

## Project Structure

```
PaseoApp/
├── app/                          # Expo Router file-based routes
│   ├── (tabs)/                   # Tab-based screens
│   │   ├── _layout.tsx           # Tab navigation config
│   │   ├── index.tsx             # Home (Inicio)
│   │   ├── trips.tsx             # Mis Paseos
│   │   ├── recipes.tsx           # Recetas + Ingredientes tab switcher
│   │   ├── grocery.tsx           # Mercado (shopping list)
│   │   ├── expenses.tsx          # Gastos (expense tracker)
│   │   └── menu.tsx              # Hidden (href: null)
│   ├── _layout.tsx               # Root navigation + auth flow
│   ├── onboarding.tsx            # First-launch carousel
│   ├── auth.tsx                  # Login/Signup/Reset forms
│   ├── newTrip.tsx               # Create new trip (modal)
│   ├── joinTrip.tsx              # Join existing trip (modal)
│   ├── tripDetail.tsx            # Trip details & management
│   ├── participantDetail.tsx     # Participant profile in trip
│   ├── attendance.tsx            # Meal attendance tracking
│   ├── recipeDetail.tsx          # Recipe details & scaling
│   ├── newRecipe.tsx             # Create new recipe
│   └── adminUpload.tsx           # Admin bulk data upload
├── src/
│   ├── store/                    # Zustand state stores (only 3 exist)
│   │   ├── useAuthStore.ts
│   │   ├── useTripStore.ts
│   │   └── useRecipeStore.ts
│   ├── lib/
│   │   ├── supabase.ts           # Client init + JWT chunking adapter
│   │   ├── database.types.ts     # Generated Supabase schema types
│   │   └── liquidacion.ts        # Minimum-cash-flow settlement algorithm
│   ├── components/
│   │   └── TabTooltip.tsx        # Reusable tooltip component
│   ├── constants.ts              # Onboarding & tooltip keys
│   ├── ingredientConstants.ts    # Units & categories
│   ├── screens/                  # (Legacy; most code moved to app/)
│   │   └── HomeScreen.tsx        # Minimal stub
│   ├── navigation/               # (Legacy; replaced by Expo Router)
│   └── hooks/                    # (Empty; custom hooks not yet used)
├── assets/                       # Icons, splash, adaptive icon
├── .env                          # EXPO_PUBLIC_SUPABASE_* vars
├── app.json                      # Expo config (name, icon, plugins, schema, owner)
├── eas.json                      # EAS build profiles (dev/preview/production)
├── babel.config.js               # Preset: expo, plugins: react-compiler, react-native-worklets
├── tsconfig.json                 # Strict mode, paths: @/* → ./
├── package.json                  # Dependencies & scripts
└── supabase/                     # Supabase config & edge functions
    ├── config.toml               # Local dev settings
    └── functions/
        └── invitar-participante/ # Edge function (email invite)
```

## Key Configuration Files

**app.json:**
- Slug: "PaseoApp", Scheme: "paseoapp"
- Google Maps API key embedded for Android
- Plugins: expo-router, expo-splash-screen, expo-sqlite, expo-secure-store
- Experiments: typedRoutes (true), reactCompiler (true)

**eas.json:**
- Profiles: development (dev client), preview (internal), production (auto-increment versions)
- All profiles share same Supabase env vars

**tsconfig.json:**
- Strict mode enabled
- Path alias: `@/*` → `./` (allows `import { X } from "@/src/..."`)

**babel.config.js:**
- Preset: expo with reactCompiler enabled
- Plugin: react-native-worklets (animation support)

## Known Patterns & Conventions

### Error Handling

- **Supabase queries:** Destructure `{ data, error }` and check `if (error)`
- **Modals for errors:** Show error messages in centered modal dialogs with single "Entendido" button
- **Store errors:** Most stores persist error state; call `clearError()` before retrying

### Localization

- App is in **Spanish:** all UI text, labels, placeholders, errors
- Months/dates assumed to be user-entered or ISO format (no i18n library)

### Image & Media Handling

- **Profile photos:** Stored as URLs in supabase (foto_url field)
- **Image picker:** expo-image-picker for camera/gallery selection
- **Sharing:** React Native Share.share() for trip invite codes

### Authentication & Security

- Email confirmation required before login (production config)
- JWT tokens chunked due to SecureStore size limit
- PKCE flow for mobile security
- Supabase RLS policies enforce row-level access (not visible in code; configured in Supabase dashboard)

## Testing & Validation

Currently no test files in repository. To add:
- Unit tests for Zustand stores: `jest` with `@testing-library/react-native`
- Integration tests for screens using Expo test utilities
- Lint command exists: `npm run lint` (ESLint with expo preset)

## Deployment

- **EAS Build:** `eas build --platform ios/android`
- **Version Management:** eas.json production profile auto-increments versions
- **Environment Variables:** Defined in eas.json per build profile
- **Cloud DB:** Supabase project ID in app.json extra.eas.projectId
