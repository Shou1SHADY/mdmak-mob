import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { View, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function Index() {
  const { user, loading } = useAuth();
  const colors = useColors();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/auth/login" />;

  if (user.role === "contractor") return <Redirect href="/(contractor)/dashboard" />;
  if (user.role === "supplier") return <Redirect href="/(supplier)/dashboard" />;
  if (user.role === "admin") return <Redirect href="/(admin)/dashboard" />;

  return <Redirect href="/auth/login" />;
}
