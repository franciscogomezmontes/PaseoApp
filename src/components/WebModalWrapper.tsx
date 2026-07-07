import { Platform, StyleSheet, View } from "react-native";

export default function WebModalWrapper({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== "web") return <>{children}</>;
  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#1B4F72", alignItems: "center" }]}>
      <View style={{ flex: 1, width: 520, maxWidth: "100%" as any }}>
        {children}
      </View>
    </View>
  );
}
