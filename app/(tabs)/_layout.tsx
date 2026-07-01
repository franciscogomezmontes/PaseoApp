import { Tabs } from "expo-router";
import { Map, BookOpen, ShoppingCart, Receipt } from "lucide-react-native";
import AddTabButton from "../../src/components/AddTabButton";
import TopBar from "../../src/components/TopBar";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: () => <TopBar />,
        tabBarActiveTintColor: "#1B4F72",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e2e8f0",
          paddingBottom: 8,
          paddingTop: 4,
          height: 60,
        },
      }}
    >
      {/* Inicio — oculto del tab bar, accesible desde la foto en el top bar */}
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} />,
          tabBarLabel: "Mis Paseos",
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
          tabBarLabel: "Recetas",
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
          tabBarLabel: "Mercado",
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          tabBarIcon: ({ color, size }) => <Receipt color={color} size={size} />,
          tabBarLabel: "Gastos",
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{ href: null }}
      />
    </Tabs>
  );
}
