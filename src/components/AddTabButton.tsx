import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Plus, MapPin, BookOpen, Receipt } from "lucide-react-native";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { showInfo } from "@/src/lib/toast";

export default function AddTabButton({ style }: BottomTabBarButtonProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function go(path: string) {
    setOpen(false);
    setTimeout(() => router.push(path as Parameters<typeof router.push>[0]), 150);
  }

  function goGasto() {
    setOpen(false);
    setTimeout(() => {
      showInfo("Selecciona un paseo para agregar un gasto");
      router.push("/(tabs)/trips");
    }, 150);
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.wrapper, style]}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        accessibilityLabel="Crear nuevo"
      >
        <View style={styles.circle}>
          <Plus color="#fff" size={28} strokeWidth={2.5} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                <View style={styles.handle} />

                <TouchableOpacity style={styles.option} onPress={() => go("/newTrip")}>
                  <View style={[styles.optionIcon, { backgroundColor: "#DBEAFE" }]}>
                    <MapPin color="#1B4F72" size={22} />
                  </View>
                  <View>
                    <Text style={styles.optionTitle}>Nuevo Paseo</Text>
                    <Text style={styles.optionSub}>Planifica una nueva salida</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.option} onPress={() => go("/newRecipe")}>
                  <View style={[styles.optionIcon, { backgroundColor: "#D1FAE5" }]}>
                    <BookOpen color="#065F46" size={22} />
                  </View>
                  <View>
                    <Text style={styles.optionTitle}>Nueva Receta</Text>
                    <Text style={styles.optionSub}>Agrega una receta al catálogo</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.option} onPress={goGasto}>
                  <View style={[styles.optionIcon, { backgroundColor: "#FEF3C7" }]}>
                    <Receipt color="#92400E" size={22} />
                  </View>
                  <View>
                    <Text style={styles.optionTitle}>Nuevo Gasto</Text>
                    <Text style={styles.optionSub}>Registra un gasto en tu paseo</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancel} onPress={() => setOpen(false)}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1B4F72",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: -18 }],
    elevation: 8,
    shadowColor: "#1B4F72",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#cbd5e1",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  optionSub: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  cancel: {
    alignItems: "center",
    paddingTop: 20,
  },
  cancelText: {
    fontSize: 15,
    color: "#94a3b8",
    fontWeight: "600",
  },
});
