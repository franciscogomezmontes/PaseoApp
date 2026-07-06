import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import "../src/i18n";
import { ONBOARDING_KEY } from "../src/constants";
import { useAuthStore } from "../src/store/useAuthStore";
import { useLanguageStore } from "../src/store/useLanguageStore";
import { useThemeStore } from "../src/store/useThemeStore";

const PENDING_JOIN_KEY = "paseoapp_pending_join_code";

export default function RootLayout() {
  const { t } = useTranslation();
  const { session, loading, initialize } = useAuthStore();
  const { hydrate } = useThemeStore();
  const { hydrate: hydrateLanguage } = useLanguageStore();
  const router = useRouter();
  const segments = useSegments();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  // Tracks a join code received from a deep link before auth is ready
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null);
  // Prevent navigating to joinTrip twice on the same URL
  const handledUrlRef = useRef<string | null>(null);

  const url = Linking.useURL();

  useEffect(() => {
    initialize();
    hydrate();
    hydrateLanguage();
    checkOnboarding();
  }, []);

  // Re-check only while onboarding hasn't been confirmed yet —
  // catches the moment onboarding writes "true" without running on every tab switch
  useEffect(() => {
    if (!onboardingDone) checkOnboarding();
  }, [segments, onboardingDone]);

  const checkOnboarding = async () => {
    const done = await AsyncStorage.getItem(ONBOARDING_KEY);
    setOnboardingDone(done === "true");
    setOnboardingChecked(true);
  };

  // ── Deep link handler ──────────────────────────────────────────────
  useEffect(() => {
    if (!url || url === handledUrlRef.current) return;
    const parsed = Linking.parse(url);
    if (parsed.path === "join" && parsed.queryParams?.code) {
      handledUrlRef.current = url;
      setPendingJoinCode(parsed.queryParams.code as string);
    }
  }, [url]);

  // Route the pending code once auth state is known
  useEffect(() => {
    if (loading || !pendingJoinCode) return;
    if (session) {
      const code = pendingJoinCode;
      setPendingJoinCode(null);
      router.push({ pathname: "/joinTrip", params: { code } });
    } else {
      // Store for after the user logs in
      AsyncStorage.setItem(PENDING_JOIN_KEY, pendingJoinCode);
      setPendingJoinCode(null);
    }
  }, [session, loading, pendingJoinCode]);

  // After login, check for a code that was saved while unauthenticated
  useEffect(() => {
    if (!session || loading) return;
    AsyncStorage.getItem(PENDING_JOIN_KEY).then((code) => {
      if (code) {
        AsyncStorage.removeItem(PENDING_JOIN_KEY);
        router.push({ pathname: "/joinTrip", params: { code } });
      }
    });
  }, [session]);

  // ── Auth guard ─────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !onboardingChecked) return;

    const inAuthScreen = segments[0] === "auth";
    const inOnboarding = segments[0] === "onboarding";

    if (!session) {
      if (!onboardingDone && !inOnboarding) {
        router.replace("/onboarding");
      } else if (onboardingDone && !inAuthScreen && !inOnboarding) {
        // @ts-ignore — expo-router types use /auth/index but runtime path is /auth
        router.replace("/auth");
      }
    } else if (session && inAuthScreen) {
      router.replace("/(tabs)");
    }
  }, [session, loading, segments, onboardingChecked, onboardingDone]);

  const isWeb = Platform.OS === "web";

  return (
    <>
      <View style={isWeb ? { flex: 1, backgroundColor: "#1B4F72", alignItems: "center" } : { flex: 1 }}>
        <View style={isWeb ? { flex: 1, width: 520, maxWidth: "100%", overflow: "hidden" as const } : { flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="newTrip"
              options={{
                presentation: "modal",
                headerShown: true,
                headerTitle: t("newTrip.title"),
                headerStyle: { backgroundColor: "#1B4F72" },
                headerTintColor: "#fff",
                headerTitleStyle: { fontWeight: "800" },
              }}
            />
            <Stack.Screen name="tripDetail" options={{ headerShown: false }} />
            <Stack.Screen
              name="joinTrip"
              options={{
                presentation: "modal",
                headerShown: true,
                headerTitle: t("joinTrip.title"),
                headerStyle: { backgroundColor: "#1B4F72" },
                headerTintColor: "#fff",
                headerTitleStyle: { fontWeight: "800" },
              }}
            />
            <Stack.Screen name="participantDetail" options={{ headerShown: false }} />
            <Stack.Screen name="attendance" options={{ headerShown: false }} />
            <Stack.Screen name="recipeDetail" options={{ headerShown: false }} />
            <Stack.Screen name="newRecipe" options={{ headerShown: false }} />
            <Stack.Screen name="adminUpload" options={{ headerShown: false }} />
            <Stack.Screen name="directorio" options={{ headerShown: false }} />
          </Stack>
        </View>
      </View>
      <Toast />
    </>
  );
}
