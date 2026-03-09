import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "../src/store/useAuthStore";

export default function RootLayout() {
  const { session, loading, initialize } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthScreen = segments[0] === "auth";
    const inTabsScreen = segments[0] === "(tabs)";

    if (!session && !inAuthScreen) {
      // Not logged in — go to login
      router.replace("/auth");
    } else if (session && inAuthScreen) {
      // Already logged in — go to main app
      router.replace("/(tabs)");
    }
  }, [session, loading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
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
        name="recipes"
        options={{
          presentation: "modal",
          headerShown: true,
          headerTitle: "Recetas",
          headerStyle: { backgroundColor: "#1B4F72" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "800" },
        }}
      />
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
    </Stack>
  );
}
