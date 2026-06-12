import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useColorScheme, ColorSchemeName } from "react-native";
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

  return (
    <ThemeContext.Provider value={{ tokens, isDark, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
