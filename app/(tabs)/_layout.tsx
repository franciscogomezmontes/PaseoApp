import { Tabs } from "expo-router";
import { Map, BookOpen, ShoppingCart, Receipt } from "lucide-react-native";
import { Platform, useColorScheme } from "react-native";
import { useTranslation } from "react-i18next";
import AddTabButton from "../../src/components/AddTabButton";
import TopBar from "../../src/components/TopBar";
import { lightTheme, darkTheme } from "../../src/theme";

export default function TabLayout() {
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? darkTheme : lightTheme;
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: () => <TopBar />,
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.tabBarBg,
          borderTopColor: theme.tabBarBorder,
          paddingBottom: Platform.OS === "web" ? 10 : 8,
          paddingTop: 4,
          height: Platform.OS === "web" ? 72 : 60,
          overflow: "visible",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginBottom: Platform.OS === "web" ? 2 : 0,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="tripDetail" options={{ href: null, headerShown: false }} />
      <Tabs.Screen
        name="trips"
        options={{
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} />,
          tabBarLabel: t("tabs.trips"),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
          tabBarLabel: t("tabs.recipes"),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          tabBarLabel: "",
          tabBarButton: (props) => <AddTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="grocery"
        options={{
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
          tabBarLabel: t("tabs.grocery"),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          tabBarIcon: ({ color, size }) => <Receipt color={color} size={size} />,
          tabBarLabel: t("tabs.expenses"),
        }}
      />
    </Tabs>
  );
}
