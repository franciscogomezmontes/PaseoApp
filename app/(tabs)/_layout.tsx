import { Tabs } from "expo-router";
import { Text } from "react-native";

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
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>,
          tabBarLabel: "Inicio",
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🗺️</Text>,
          tabBarLabel: "Mis Paseos",
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📖</Text>,
          tabBarLabel: "Recetas",
        }}
      />
      <Tabs.Screen
        name="grocery"
        options={{
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🛒</Text>,
          tabBarLabel: "Mercado",
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>💸</Text>,
          tabBarLabel: "Gastos",
        }}
      />

      <Tabs.Screen
        name="menu"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
