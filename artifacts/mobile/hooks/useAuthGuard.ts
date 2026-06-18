import { useEffect } from "react";
import { router } from "expo-router";
import { useAuth, UserRole } from "@/context/AuthContext";

/**
 * Redirects to login if unauthenticated, or to root if wrong role.
 * Returns { user, loading } so the screen can render a spinner while auth resolves.
 */
export function useAuthGuard(requiredRole?: UserRole) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    if (requiredRole && user.role !== requiredRole) {
      router.replace("/");
    }
  }, [user, loading, requiredRole]);

  return { user, loading };
}
