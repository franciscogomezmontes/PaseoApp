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
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/hooks/useTheme";
import { supabase } from "../../src/lib/supabase";

export default function ResetScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setShowErrorModal(true);
  };

  const handleReset = async () => {
    if (!email.trim()) {
      showError("Ingresa tu correo electrónico.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      setShowResetConfirm(true);
    }
  };

  if (showResetConfirm) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.confirmContent}>
          <Text style={styles.confirmEmoji}>🔑</Text>
          <Text style={[styles.confirmTitle, { color: theme.text }]}>{t("auth.reset.successTitle")}</Text>
          <Text style={[styles.confirmSub, { color: theme.textSecondary }]}>
            Te enviamos un enlace a{"\n"}
            <Text style={[styles.confirmEmail, { color: theme.primary }]}>{email}</Text>
          </Text>
          <Text style={[styles.confirmHint, { backgroundColor: theme.surface, color: theme.textSecondary }]}>
            Abre el enlace en tu correo para crear una nueva contraseña. Una vez
            cambiada, regresa aquí e inicia sesión.
          </Text>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => // @ts-ignore — expo-router types use /auth/index but runtime path is /auth
            router.replace("/auth")}
          >
            <Text style={styles.submitText}>{t("auth.reset.backToLogin")}</Text>
          </TouchableOpacity>
          <Text style={styles.confirmFooter}>
            ¿No llegó el correo? Revisa la carpeta de spam.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
          </View>

          <View style={styles.form}>
            <Text style={[styles.resetTitle, { color: theme.text }]}>{t("auth.reset.title")}</Text>
            <Text style={[styles.resetSub, { color: theme.textSecondary }]}>{t("auth.reset.sub")}</Text>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{t("auth.email")}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                placeholder={t("auth.emailPlaceholder")}
                placeholderTextColor={theme.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleReset}
              disabled={loading}
            >
              <Text style={styles.submitText}>
                {loading ? t("auth.reset.sending") : t("auth.reset.sendBtn")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.back()}
            >
              <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>← {t("auth.reset.backToLogin")}</Text>
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
          <View style={[styles.errorBox, { backgroundColor: theme.surface }]}>
            <Text style={[styles.errorTitle, { color: theme.text }]}>⚠️ Error</Text>
            <Text style={[styles.errorMsg, { color: theme.textSecondary }]}>{errorMsg}</Text>
            <TouchableOpacity
              style={styles.errorBtn}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.errorBtnText}>{t("common.ok")}</Text>
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

  resetTitle: { fontSize: 22, fontWeight: "800", color: "#1e293b", marginBottom: 8 },
  resetSub: { fontSize: 14, color: "#64748b", lineHeight: 20, marginBottom: 24 },

  submitBtn: {
    backgroundColor: "#1B4F72",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: "#94a3b8" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  secondaryBtn: { padding: 14, alignItems: "center" },
  secondaryBtnText: { fontSize: 14, color: "#64748b", fontWeight: "600" },

  confirmContent: {
    padding: 32,
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmEmoji: { fontSize: 72, marginBottom: 24 },
  confirmTitle: { fontSize: 26, fontWeight: "800", color: "#1e293b", marginBottom: 12, textAlign: "center" },
  confirmSub: { fontSize: 16, color: "#475569", textAlign: "center", lineHeight: 24, marginBottom: 20 },
  confirmEmail: { fontWeight: "700", color: "#1B4F72" },
  confirmHint: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
  },
  confirmFooter: { fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 16, lineHeight: 18 },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorBox: { backgroundColor: "#fff", borderRadius: 20, padding: 24, width: "84%", maxWidth: 440 },
  errorTitle: { fontSize: 17, fontWeight: "800", color: "#1e293b", textAlign: "center", marginBottom: 8 },
  errorMsg: { fontSize: 14, color: "#64748b", textAlign: "center", marginBottom: 20, lineHeight: 20 },
  errorBtn: { backgroundColor: "#1B4F72", borderRadius: 12, padding: 14, alignItems: "center" },
  errorBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
