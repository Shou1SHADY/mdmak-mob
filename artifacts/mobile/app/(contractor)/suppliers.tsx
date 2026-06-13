import { useEffect } from "react";
import { router } from "expo-router";

export default function SuppliersRedirect() {
  useEffect(() => {
    router.replace("/(contractor)/dashboard");
  }, []);
  return null;
}
