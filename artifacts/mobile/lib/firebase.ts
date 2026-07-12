import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, type Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Fallbacks are the same public web-app config the website ships in
// src/firebase/config.ts — both apps must always point at the same project.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyBLc-jwwFrCiklo8h9UCH9dIgF2ALUQCLw",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-2889504658-6ee2a.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "studio-2889504658-6ee2a",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-2889504658-6ee2a.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "374877124985",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:374877124985:web:c7e928b56b265e9a2597a8",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// On native, getAuth() defaults to in-memory persistence (login lost on every
// app restart) — initializeAuth with AsyncStorage keeps the session. On web,
// getAuth() already persists via IndexedDB.
function createAuth(): Auth {
  if (Platform.OS === "web") return getAuth(app);
  try {
    // getReactNativePersistence is only exported by the react-native build of
    // firebase/auth, so TS doesn't know about it — resolve it dynamically.
    const { getReactNativePersistence } = require("firebase/auth") as {
      getReactNativePersistence: (storage: typeof AsyncStorage) => unknown;
    };
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage) as never,
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
