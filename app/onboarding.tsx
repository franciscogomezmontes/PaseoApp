import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ONBOARDING_KEY } from "../src/constants";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    id: "0",
    emoji: "🏕️",
    titulo: "Tu paseo, sin enredos",
    descripcion:
      "Organiza salidas con amigos o familia en un solo lugar: menú, mercado y cuentas claras. Tú solo disfruta el paseo.",
    color: "#0f172a",
    bgColor: "#f8fafc",
    isHero: true,
  },
  {
    id: "1",
    emoji: "🎟️",
    titulo: "Todos a bordo, fácil",
    descripcion:
      "Crea tu paseo y comparte el código. Cada quien se une desde su celular en segundos.",
    color: "#1B4F72",
    bgColor: "#EFF6FF",
  },
  {
    id: "2",
    emoji: "🍳",
    titulo: "Qué comemos cada día",
    descripcion:
      "Asigna recetas a desayunos, almuerzos y cenas. Las porciones se ajustan solas según quién asiste a cada comida.",
    color: "#065F46",
    bgColor: "#F0FDF4",
  },
  {
    id: "3",
    emoji: "🛒",
    titulo: "La lista se hace sola",
    descripcion:
      "Del menú sale tu lista de mercado completa, sin olvidos ni compras dobles.",
    color: "#6D28D9",
    bgColor: "#F5F3FF",
  },
  {
    id: "4",
    emoji: "💸",
    titulo: "Cuentas claras, amistades largas",
    descripcion:
      "Registra los gastos del grupo y al final te decimos quién le transfiere a quién. Sin dramas.",
    color: "#B45309",
    bgColor: "#FFFBEB",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentSlide = SLIDES[currentIndex];

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => handleFinish();

  const handleFinish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    // @ts-ignore — expo-router types use /auth/index but runtime path is /auth
    router.replace("/auth");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: currentSlide.bgColor }]}
    >
      {/* Skip button */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: currentSlide.color }]}>
            Saltar
          </Text>
        </TouchableOpacity>
      </View>

      {/* Current slide */}
      <View style={styles.slide}>
        <View
          style={[
            styles.emojiContainer,
            { borderColor: currentSlide.color + "33" },
          ]}
        >
          <Text style={styles.emoji}>{currentSlide.emoji}</Text>
        </View>
        <Text
          style={[
            styles.titulo,
            { color: currentSlide.color },
            (currentSlide as any).isHero && styles.tituloHero,
          ]}
        >
          {currentSlide.titulo}
        </Text>
        <Text style={styles.descripcion}>{currentSlide.descripcion}</Text>
      </View>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setCurrentIndex(i)}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === currentIndex
                      ? currentSlide.color
                      : currentSlide.color + "33",
                  width: i === currentIndex ? 24 : 8,
                },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: currentSlide.color }]}
          onPress={handleNext}
        >
          <Text style={styles.nextBtnText}>
            {currentIndex === SLIDES.length - 1
              ? "¡Comenzar! →"
              : "Siguiente →"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  skipBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  skipText: { fontSize: 15, fontWeight: "600" },

  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    paddingBottom: 40,
  },
  emojiContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  emoji: { fontSize: 64 },
  titulo: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  descripcion: {
    fontSize: 16,
    color: "#475569",
    textAlign: "center",
    lineHeight: 26,
  },

  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingBottom: 24,
  },
  dot: { height: 8, borderRadius: 4 },
  tituloHero: { fontSize: 34, lineHeight: 42, letterSpacing: -1 },

  bottomBar: { paddingHorizontal: 24, paddingBottom: 16 },
  nextBtn: { borderRadius: 16, padding: 18, alignItems: "center" },
  nextBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
});
