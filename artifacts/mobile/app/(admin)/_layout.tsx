import { Redirect } from "expo-router";

export default function AdminLayout() {
  return <Redirect href="/auth/login" />;
}
