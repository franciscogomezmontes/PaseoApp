import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ONBOARDING_KEY } from "../src/constants";
import { useAuthStore } from "../src/store/useAuthStore";

export default function RootLayout() {
  const { session, loading, initialize } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    initialize();
    checkOnboarding();
  }, []);

  // Re-check AsyncStorage every time segments change —
  // catches the moment onboarding writes "true" and the layout needs to redirect
  useEffect(() => {
    checkOnboarding();
  }, [segments]);

  const checkOnboarding = async () => {
    const done = await AsyncStorage.getItem(ONBOARDING_KEY);
    setOnboardingDone(done === "true");
    setOnboardingChecked(true);
  };

  useEffect(() => {
    if (loading || !onboardingChecked) return;

    const inAuthScreen = segments[0] === "auth";
    const inOnboarding = segments[0] === "onboarding";

    if (!session) {
      if (!onboardingDone && !inOnboarding) {
        router.replace("/onboarding");
      } else if (onboardingDone && !inAuthScreen && !inOnboarding) {
        router.replace("/auth");
      }
    } else if (session && inAuthScreen) {
      router.replace("/(tabs)");
    }
  }, [session, loading, segments, onboardingChecked, onboardingDone]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="newTrip"
        options={{
          presentation: "modal",
          headerShown: true,
          headerTitle: "Nuevo Paseo",
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
          headerTitle: "Unirse a un paseo",
          headerStyle: { backgroundColor: "#1B4F72" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "800" },
        }}
      />
      <Stack.Screen name="participantDetail" options={{ headerShown: false }} />
      <Stack.Screen name="attendance" options={{ headerShown: false }} />
      <Stack.Screen name="recipeDetail" options={{ headerShown: false }} />
      <Stack.Screen name="newRecipe" options={{ headerShown: false }} />
    </Stack>
  );
}
