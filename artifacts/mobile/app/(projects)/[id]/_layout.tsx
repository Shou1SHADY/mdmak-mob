import React from "react";
import { Stack } from "expo-router";

/**
 * One project, and the screens that hang off it.
 *
 * A Stack nested inside the module's tab — so the module bar stays where it is
 * while you move between the project's bill, its claims, its requests and its
 * team, and the back arrow walks you out the way you came in. Each screen draws
 * its own `ScreenHeader`, so the navigator draws none.
 */
export default function ProjectLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
