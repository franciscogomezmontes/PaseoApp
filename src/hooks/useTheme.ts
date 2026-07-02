import { useColorScheme } from "react-native";
import { lightTheme, darkTheme } from "../theme";
import { useThemeStore } from "../store/useThemeStore";

export function useTheme() {
  const scheme = useColorScheme();
  const { followSystem } = useThemeStore();
  const isDark = followSystem && scheme === "dark";
  return isDark ? darkTheme : lightTheme;
}
