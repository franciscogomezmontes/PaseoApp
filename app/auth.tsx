import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../src/store/useAuthStore";

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, signUp, error } = useAuthStore();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor completa todos los campos.");
      return;
    }
    if (mode === "signup" && !nombre) {
      Alert.alert("Error", "Por favor ingresa tu nombre.");
      return;
    }

    setLoading(true);

    if (mode === "login") {
      const ok = await signIn(email, password);
      if (ok) router.replace("/(tabs)");
      else Alert.alert("Error", error ?? "No se pudo iniciar sesión.");
    } else {
      const ok = await signUp(email, password, nombre);
      if (ok) {
        router.replace("/(tabs)");
      } else {
        Alert.alert("Error", error ?? "No se pudo crear la cuenta.");
      }
    }

    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.logoArea}>
            <Text style={styles.logoEmoji}>🌴</Text>
            <Text style={styles.logoTitle}>PaseoApp</Text>
            <Text style={styles.logoSub}>
              Planifica paseos. Divide gastos.{"\n"}Disfruta sin calcular.
            </Text>
          </View>

          <View style={styles.toggle}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                mode === "login" && styles.toggleBtnActive,
              ]}
              onPress={() => setMode("login")}
            >
              <Text
                style={[
                  styles.toggleText,
                  mode === "login" && styles.toggleTextActive,
                ]}
              >
                Iniciar sesión
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                mode === "signup" && styles.toggleBtnActive,
              ]}
              onPress={() => setMode("signup")}
            >
              <Text
                style={[
                  styles.toggleText,
                  mode === "signup" && styles.toggleTextActive,
                ]}
              >
                Crear cuenta
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {mode === "signup" && (
              <View style={styles.field}>
                <Text style={styles.label}>Nombre</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tu nombre"
                  placeholderTextColor="#94a3b8"
                  value={nombre}
                  onChangeText={setNombre}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                placeholder="correo@ejemplo.com"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitText}>
                {loading
                  ? "Cargando..."
                  : mode === "login"
                    ? "Entrar"
                    : "Crear cuenta"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  content: { padding: 24, flexGrow: 1, justifyContent: "center" },

  logoArea: { alignItems: "center", marginBottom: 40 },
  logoEmoji: { fontSize: 56, marginBottom: 12 },
  logoTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1B4F72",
    marginBottom: 8,
  },
  logoSub: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
  },

  toggle: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: "#fff" },
  toggleText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  toggleTextActive: { color: "#1B4F72" },

  form: { gap: 4 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1e293b",
  },

  submitBtn: {
    backgroundColor: "#1B4F72",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: "#94a3b8" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
