import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../store/useAuthStore";
import { useTheme } from "../hooks/useTheme";

export default function TopBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { persona } = useAuthStore();
  const theme = useTheme();

  const initial = persona?.nombre?.charAt(0)?.toUpperCase() ?? "?";
  const photoUrl = (persona as { foto_url?: string } | null)?.foto_url;

  return (
    <View style={[styles.bar, { paddingTop: insets.top, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <Text style={[styles.logo, { color: theme.primary }]}>🌴 PaseoApp</Text>
      <TouchableOpacity
        style={styles.avatarBtn}
        onPress={() => router.push("/(tabs)" as Parameters<typeof router.push>[0])}
        activeOpacity={0.8}
        accessibilityLabel="Ir a inicio"
      >
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: "hidden",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
