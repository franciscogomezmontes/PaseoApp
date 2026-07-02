import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/hooks/useTheme";
import { useAuthStore } from "../../src/store/useAuthStore";

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { signIn, error, clearError } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setShowErrorModal(true);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      showError("Por favor completa todos los campos.");
      return;
    }
    clearError();
    setLoading(true);
    const ok = await signIn(email.trim(), password);
    setLoading(false);
    if (ok) {
      router.replace("/(tabs)");
    } else {
      showError(
        error === "Email not confirmed"
          ? "Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada."
          : (error ?? "No se pudo iniciar sesión. Verifica tus datos."),
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoArea}>
            <Text style={styles.logoEmoji}>🌴</Text>
            <Text style={styles.logoTitle}>PaseoApp</Text>
            <Text style={styles.logoSub}>
              Planifica paseos. Divide gastos.{"\n"}Disfruta sin calcular.
            </Text>
          </View>

          <View style={[styles.toggle, { backgroundColor: theme.border }]}>
            <View style={[styles.toggleBtn, styles.toggleBtnActive, { backgroundColor: theme.surface }]}>
              <Text style={[styles.toggleText, styles.toggleTextActive, { color: theme.primary }]}>
                Iniciar sesión
              </Text>
            </View>
            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={() => {
                clearError();
                router.replace("/auth/signup");
              }}
            >
              <Text style={[styles.toggleText, { color: theme.textSecondary }]}>Crear cuenta</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Correo electrónico</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={theme.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Contraseña</Text>
              <View style={[styles.passwordWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <TextInput
                  style={[styles.passwordInput, { color: theme.text }]}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={theme.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>
                    {showPassword ? "🙈" : "👁️"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => {
                clearError();
                router.push("/auth/reset");
              }}
            >
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitText}>
                {loading ? "Cargando..." : "Entrar"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>⚠️ Error</Text>
            <Text style={styles.errorMsg}>{errorMsg}</Text>
            <TouchableOpacity
              style={styles.errorBtn}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.errorBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  content: { padding: 24, flexGrow: 1, justifyContent: "center" },

  logoArea: { alignItems: "center", marginBottom: 40 },
  logoEmoji: { fontSize: 56, marginBottom: 12 },
  logoTitle: { fontSize: 32, fontWeight: "800", color: "#1B4F72", marginBottom: 8 },
  logoSub: { fontSize: 15, color: "#64748b", textAlign: "center", lineHeight: 22 },

  toggle: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
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

  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#1e293b" },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  eyeIcon: { fontSize: 18 },

  forgotBtn: { alignSelf: "flex-end", paddingVertical: 6, paddingLeft: 8, marginBottom: 4 },
  forgotText: { fontSize: 13, color: "#1B4F72", fontWeight: "600" },

  submitBtn: {
    backgroundColor: "#1B4F72",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: "#94a3b8" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorBox: { backgroundColor: "#fff", borderRadius: 20, padding: 24, width: "84%" },
  errorTitle: { fontSize: 17, fontWeight: "800", color: "#1e293b", textAlign: "center", marginBottom: 8 },
  errorMsg: { fontSize: 14, color: "#64748b", textAlign: "center", marginBottom: 20, lineHeight: 20 },
  errorBtn: { backgroundColor: "#1B4F72", borderRadius: 12, padding: 14, alignItems: "center" },
  errorBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
