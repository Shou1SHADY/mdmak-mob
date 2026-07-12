import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { I18nManager, Platform, NativeModules } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { en, ar, Translations } from "@/i18n";

export type Language = "en" | "ar";

const STORAGE_KEY = "app_language";
const translations: Record<Language, Translations> = { en, ar };

// Arabic is the platform default (same rule as the website — locale detection
// is disabled there too). Only an explicitly-English device switches to English.
function detectDeviceLanguage(): Language {
  if (Platform.OS === "web") {
    try {
      const navLang = (typeof navigator !== "undefined" && navigator.language) || "ar";
      return navLang.startsWith("en") ? "en" : "ar";
    } catch {
      return "ar";
    }
  }
  try {
    const locale =
      (NativeModules.I18nManager?.localeIdentifier as string) ||
      (NativeModules.SettingsManager?.settings?.AppleLocale as string) ||
      (NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] as string) ||
      "ar";
    return locale.startsWith("en") ? "en" : "ar";
  } catch {
    return "ar";
  }
}

// This app implements RTL MANUALLY (every screen flips rows/text with isRTL).
// Native forceRTL only applies after an app restart and would then mirror the
// whole layout a second time on top of the manual flips — so it must stay off.
function applyRTL(_lang: Language) {
  if (I18nManager.isRTL) {
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
  }
}

interface LanguageContextType {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => Promise<void>;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export function useT() {
  return useLanguage().t;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ar");

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "ar" || stored === "en") {
          setLanguageState(stored);
          applyRTL(stored);
        } else {
          const device = detectDeviceLanguage();
          setLanguageState(device);
          applyRTL(device);
        }
      } catch {
        const device = detectDeviceLanguage();
        setLanguageState(device);
        applyRTL(device);
      }
    })();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    applyRTL(lang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  }, []);

  const t = translations[language];
  const isRTL = language === "ar";

  return (
    <LanguageContext.Provider value={{ language, t, setLanguage, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}
