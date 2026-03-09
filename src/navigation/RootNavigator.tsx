import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { Text } from "react-native";

import ExpensesScreen from "../screens/ExpensesScreen";
import GroceryScreen from "../screens/GroceryScreen";
import HomeScreen from "../screens/HomeScreen";
import MenuScreen from "../screens/MenuScreen";

const Tab = createBottomTabNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
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
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>,
            tabBarLabel: "Resumen",
          }}
        />
        <Tab.Screen
          name="Menu"
          component={MenuScreen}
          options={{
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>🍽️</Text>,
            tabBarLabel: "Menú",
          }}
        />
        <Tab.Screen
          name="Grocery"
          component={GroceryScreen}
          options={{
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>🛒</Text>,
            tabBarLabel: "Mercado",
          }}
        />
        <Tab.Screen
          name="Expenses"
          component={ExpensesScreen}
          options={{
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>💸</Text>,
            tabBarLabel: "Gastos",
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
