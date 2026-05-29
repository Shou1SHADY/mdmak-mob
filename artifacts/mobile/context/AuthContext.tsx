import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type UserRole = "contractor" | "supplier" | "admin";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  organizationId: string;
  phone?: string;
  city?: string;
  emailVerified: boolean;
}

export interface Organization {
  id: string;
  type: "contractor" | "supplier";
  name: string;
  crNumber?: string;
  city?: string;
  specializations?: string[];
  serviceAreas?: string[];
  verified?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  organization: Organization | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    orgName: string,
    city: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUserData(firebaseUser: FirebaseUser) {
    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
    if (!userDoc.exists()) return null;
    const data = userDoc.data();
    const appUser: AppUser = {
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? "",
      displayName: data.displayName ?? "",
      role: data.role as UserRole,
      organizationId: data.organizationId ?? "",
      phone: data.phone,
      city: data.city,
      emailVerified: firebaseUser.emailVerified,
    };
    setUser(appUser);

    if (data.organizationId) {
      const orgDoc = await getDoc(doc(db, "organizations", data.organizationId));
      if (orgDoc.exists()) {
        setOrganization({ id: orgDoc.id, ...orgDoc.data() } as Organization);
      }
    }
    return appUser;
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await loadUserData(firebaseUser);
      } else {
        setUser(null);
        setOrganization(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await loadUserData(cred.user);
  }

  async function register(
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    orgName: string,
    city: string
  ) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);

    const orgRef = await addDoc(collection(db, "organizations"), {
      type: role === "admin" ? "contractor" : role,
      name: orgName,
      city,
      verified: false,
      createdAt: serverTimestamp(),
    });

    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      displayName,
      role,
      organizationId: orgRef.id,
      city,
      createdAt: serverTimestamp(),
    });

    await loadUserData(cred.user);
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
    setOrganization(null);
  }

  async function refreshUser() {
    if (auth.currentUser) {
      await loadUserData(auth.currentUser);
    }
  }

  return (
    <AuthContext.Provider value={{ user, organization, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
