import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useColorScheme, ColorSchemeName, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import designTokens from "@/constants/colors";

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeTokens {
  colors: typeof designTokens.light;
  radius: typeof designTokens.radius;
  spacing: typeof designTokens.spacing;
  shadow: typeof designTokens.shadow;
  typography: typeof designTokens.typography;
}

const STORAGE_KEY = "app_theme";

const lightTheme: ThemeTokens = {
  colors: designTokens.light,
  radius: designTokens.radius,
  spacing: designTokens.spacing,
  shadow: designTokens.shadow,
  typography: designTokens.typography,
};

const darkTheme: ThemeTokens = {
  colors: designTokens.dark,
  radius: designTokens.radius,
  spacing: designTokens.spacing,
  shadow: designTokens.shadow,
  typography: designTokens.typography,
};

interface ThemeContextType {
  tokens: ThemeTokens;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  tokens: lightTheme,
  isDark: false,
  themeMode: "system",
  setThemeMode: async () => {},
});

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}

export function useColors() {
  return useTheme().tokens.colors;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") {
          setThemeModeState(stored);
        }
      } catch {}
    })();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch {}
  };

  const resolvedScheme: ColorSchemeName =
    themeMode === "system" ? systemScheme : themeMode;

  const isDark = resolvedScheme === "dark";
  const tokens = isDark ? darkTheme : lightTheme;

  // Paint the PAGE itself, not just the React tree.
  //
  // Installed to a home screen with viewport-fit=cover, the app draws into
  // the safe areas but the document behind it keeps the browser default of
  // white — which showed as a white band across the bottom, under the tab
  // bar and around the home indicator. Rubber-band overscroll exposes the
  // same band at the top.
  //
  // A CSS media query cannot solve this alone: the user may choose a theme
  // that differs from the system one, so the page has to follow the RESOLVED
  // theme. theme-color moves with it so the status bar matches too.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const bg = tokens.colors.background;
    document.documentElement.style.backgroundColor = bg;
    if (document.body) document.body.style.backgroundColor = bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", bg);
  }, [tokens]);

  return (
    <ThemeContext.Provider value={{ tokens, isDark, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
