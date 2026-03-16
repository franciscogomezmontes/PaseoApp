import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
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
    id: "1",
    emoji: "🏕️",
    titulo: "Bienvenido a PaseoApp",
    descripcion:
      "La app para organizar paseos en grupo sin dramas. Menú, gastos y cuentas — todo en un solo lugar.",
    color: "#1B4F72",
    bgColor: "#EFF6FF",
  },
  {
    id: "2",
    emoji: "📅",
    titulo: "Planea el paseo",
    descripcion:
      "Crea un paseo, invita a tu grupo con un código y organiza el menú día a día eligiendo recetas del catálogo compartido.",
    color: "#065F46",
    bgColor: "#F0FDF4",
  },
  {
    id: "3",
    emoji: "🍽️",
    titulo: "El menú en tus manos",
    descripcion:
      "Asigna recetas a cada comida, controla quién come qué y calcula porciones automáticamente según los participantes.",
    color: "#6D28D9",
    bgColor: "#F5F3FF",
  },
  {
    id: "4",
    emoji: "💸",
    titulo: "Divide sin pelear",
    descripcion:
      "Registra los gastos, asigna quién pagó y PaseoApp calcula automáticamente las transferencias mínimas para cuadrar cuentas.",
    color: "#B45309",
    bgColor: "#FFFBEB",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => handleFinish();

  const handleFinish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/auth");
  };

  const currentSlide = SLIDES[currentIndex];

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

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(idx);
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View
              style={[
                styles.emojiContainer,
                { borderColor: item.color + "33" },
              ]}
            >
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <Text style={[styles.titulo, { color: item.color }]}>
              {item.titulo}
            </Text>
            <Text style={styles.descripcion}>{item.descripcion}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => {
              flatListRef.current?.scrollToIndex({ index: i });
              setCurrentIndex(i);
            }}
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

  bottomBar: { paddingHorizontal: 24, paddingBottom: 16 },
  nextBtn: { borderRadius: 16, padding: 18, alignItems: "center" },
  nextBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
});
