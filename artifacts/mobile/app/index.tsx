import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { View, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function Index() {
  const { user, loading } = useAuth();
  const colors = useColors();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!user) return <Redirect href="/auth/login" />;

  if (user.role === "contractor") return <Redirect href="/(contractor)/dashboard" />;
  if (user.role === "supplier") return <Redirect href="/(supplier)/dashboard" />;

  // Admin role is not supported in the mobile app — send to login
  return <Redirect href="/auth/login" />;
}
