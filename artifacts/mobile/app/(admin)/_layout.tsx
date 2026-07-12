import { useEffect } from "react";
import { Stack, router } from "expo-router";

/**
 * Admin portal is not available in the mobile app.
 * Redirect any attempt to access admin routes back to login.
 */
export default function AdminLayout() {
  useEffect(() => {
    router.replace("/");
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
