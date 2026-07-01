import { Tabs } from "expo-router";
import { Home, Map, BookOpen, ShoppingCart, Receipt } from "lucide-react-native";
import AddTabButton from "../../src/components/AddTabButton";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          tabBarLabel: "Inicio",
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} />,
          tabBarLabel: "Mis Paseos",
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
        name="recipes"
        options={{
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
          tabBarLabel: "Recetas",
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
