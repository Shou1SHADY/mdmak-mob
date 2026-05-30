import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { I18nManager, Platform, NativeModules } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { en, ar, Translations } from "@/i18n";

export type Language = "en" | "ar";

const STORAGE_KEY = "app_language";
const translations: Record<Language, Translations> = { en, ar };

function detectDeviceLanguage(): Language {
  if (Platform.OS === "web") {
    try {
      const navLang = (typeof navigator !== "undefined" && navigator.language) || "en";
      return navLang.startsWith("ar") ? "ar" : "en";
    } catch {
      return "en";
    }
  }
  try {
    const locale =
      (NativeModules.I18nManager?.localeIdentifier as string) ||
      (NativeModules.SettingsManager?.settings?.AppleLocale as string) ||
      (NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] as string) ||
      "en";
    return locale.startsWith("ar") ? "ar" : "en";
  } catch {
    return "en";
  }
}

function applyRTL(lang: Language) {
  const isRTL = lang === "ar";
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
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
  const [language, setLanguageState] = useState<Language>("en");

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
