import React, { createContext, useContext, ReactNode } from "react";
import designTokens from "@/constants/colors";

export interface ThemeTokens {
  colors: typeof designTokens.light;
  radius: typeof designTokens.radius;
  spacing: typeof designTokens.spacing;
  shadow: typeof designTokens.shadow;
  typography: typeof designTokens.typography;
}

const defaultTheme: ThemeTokens = {
  colors: designTokens.light,
  radius: designTokens.radius,
  spacing: designTokens.spacing,
  shadow: designTokens.shadow,
  typography: designTokens.typography,
};

const ThemeContext = createContext<ThemeTokens>(defaultTheme);

export function useTheme(): ThemeTokens {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={defaultTheme}>
      {children}
    </ThemeContext.Provider>
  );
}
