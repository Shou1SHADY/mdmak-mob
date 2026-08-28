import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  User as FirebaseUser,
} from "firebase/auth";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri, AuthRequest, ResponseType } from "expo-auth-session";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  collection,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { isPreview, PREVIEW_USER } from "@/lib/preview";

/* eslint-disable no-console */
const devLog = (...args: any[]) => { if (__DEV__) console.log(...args); };
const devWarn = (...args: any[]) => { if (__DEV__) console.warn(...args); };
const devError = (...args: any[]) => { if (__DEV__) console.error(...args); };

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_SCOPES = ["openid", "profile", "email"];

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
};

export type UserRole = "Contractor" | "Supplier" | "Admin";

// Mirrors the website's UserRole/OrganizationRole pair. "member" accounts are
// created by the website's team invite flow; the mobile app never creates one,
// but it must read the role so it can honour the same permission gates.
export type OrganizationRole = "owner" | "member";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  organizationId: string;
  organizationRole: OrganizationRole;
  /** teamGroups doc id backing this member's permissions; null for owners. */
  defaultGroupId: string | null;
  orgName: string;
  phone?: string;
  city?: string;
  emailVerified: boolean;
  profileCompleted: boolean;
}

export interface LegalDoc {
  url?: string;
  expiryDate?: string;
  uploadedAt?: string;
}

export interface Organization {
  id: string;
  type: "contractor" | "supplier";
  name: string;
  crNumber?: string;
  taxNumber?: string;
  phone?: string;
  city?: string;
  location?: string;
  website?: string;
  description?: string;
  specializations?: string[];
  serviceAreas?: string[];
  verified?: boolean;
  documents?: Record<string, LegalDoc>;
}

interface AuthContextType {
  user: AppUser | null;
  organization: Organization | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AppUser>;
  register: (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    orgName: string,
    city: string
  ) => Promise<AppUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  signInWithGoogle: () => Promise<AppUser>;
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

  const googleClientId = process.env.EXPO_PUBLIC_FIREBASE_CLIENT_ID;

  async function loadUserData(firebaseUser: FirebaseUser) {
    devLog("[Auth] loadUserData called for uid:", firebaseUser.uid);
    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
    if (!userDoc.exists()) {
      devLog("[Auth] No Firestore user doc found");
      return null;
    }
    const data = userDoc.data();
    devLog("[Auth] User doc fields:", Object.keys(data).join(", "));

    // A solo/primary organization is keyed by the owner's own uid — the same
    // convention the website uses. Backfilling anything else here would make the
    // website read the account as a secondary company (see isSecondaryOrg).
    let orgId = data.organizationId || data.orgId || "";
    if (!orgId) {
      devLog("[Auth] No organizationId found, defaulting to uid");
      orgId = firebaseUser.uid;
      try {
        await setDoc(doc(db, "users", firebaseUser.uid), { organizationId: orgId }, { merge: true });
        devLog("[Auth] Saved organizationId:", orgId);
      } catch (e) {
        devWarn("[Auth] Failed to save organizationId:", e);
      }
    }

    const organizationRole: OrganizationRole =
      data.organizationRole === "member" ? "member" : "owner";

    // Company identity resolution, mirroring the website's useResolvedProfile:
    //  - primary/solo company (orgId === uid) -> identity is on users/{uid}
    //  - team member (organizationRole === "member") -> identity is the owner's
    //    users/{orgId} doc, which the member cannot read; keep their own name and
    //    fetch nothing, the org name comes from the owner doc when readable
    //  - secondary company added on the website -> identity lives on
    //    organizations/{orgId} and must NOT fall back to the primary company
    const secondary = orgId !== firebaseUser.uid && organizationRole !== "member";
    let identity: Record<string, any> = data;
    if (secondary) {
      try {
        const orgDoc = await getDoc(doc(db, "organizations", orgId));
        // Deliberately NOT merged with `data`: an unset field on the secondary
        // company must read as blank, never as the primary company's value.
        identity = orgDoc.exists() ? (orgDoc.data() as Record<string, any>) : {};
      } catch (e) {
        devWarn("[Auth] Failed to read secondary org identity:", e);
        identity = {};
      }
    }

    const appUser: AppUser = {
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? "",
      displayName: identity.name ?? data.name ?? data.displayName ?? "",
      role: data.role as UserRole,
      organizationId: orgId,
      organizationRole,
      defaultGroupId: data.defaultGroupId ?? null,
      orgName: identity.companyName ?? identity.orgName ?? "",
      phone: identity.phone,
      city: identity.city,
      emailVerified: firebaseUser.emailVerified,
      profileCompleted: identity.profileCompleted ?? data.profileCompleted ?? true,
    };
    setUser(appUser);
    devLog("[Auth] User state set, orgId:", appUser.organizationId, "role:", appUser.role, "orgRole:", organizationRole);

    setOrganization({
      id: orgId,
      type: data.role === "Supplier" ? "supplier" : "contractor",
      name: identity.companyName ?? identity.orgName ?? "",
      crNumber: identity.crNumber,
      taxNumber: identity.taxNumber,
      phone: identity.phone,
      city: identity.city,
      location: identity.location,
      website: identity.website,
      description: identity.description,
      specializations: identity.specializations ?? [],
      serviceAreas: identity.serviceAreas ?? identity.coverageCities ?? [],
      verified: identity.verified ?? identity.isVerified ?? false,
      documents: identity.documents ?? identity.legalDocuments ?? {},
    });
    return appUser;
  }

  useEffect(() => {
    // Design-preview: adopt a fixture owner and never contact Firebase. Web
    // only, off unless sessionStorage says otherwise (see lib/preview.ts).
    if (isPreview()) {
      setUser(PREVIEW_USER);
      setOrganization({
        id: PREVIEW_USER.organizationId,
        type: "contractor",
        name: PREVIEW_USER.orgName,
        phone: PREVIEW_USER.phone,
        city: PREVIEW_USER.city,
        specializations: [],
        serviceAreas: [],
        verified: true,
        documents: {},
      });
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      devLog("[Auth] onAuthStateChanged:", firebaseUser?.uid ?? "signed out");
      try {
        if (firebaseUser) {
          await loadUserData(firebaseUser);
        } else {
          setUser(null);
          setOrganization(null);
        }
      } catch (e) {
        devLog("[Auth] onAuthStateChanged error:", e);
        setUser(null);
        setOrganization(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  async function login(email: string, password: string): Promise<AppUser> {
    devLog("[Auth] login called for:", email);
    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      throw e;
    }
    devLog("[Auth] Firebase sign-in succeeded, uid:", cred.user.uid);
    // Update lastLoginAt
    updateDoc(doc(db, "users", cred.user.uid), { lastLoginAt: serverTimestamp() }).catch(() => {});
    let appUser;
    try {
      appUser = await loadUserData(cred.user);
    } catch (e: any) {
      devLog("[Auth] Firestore read failed:", e.code, e.message);
      await signOut(auth);
      if (e.code === "permission-denied") {
        throw new Error("Firestore permission denied. Please check Firestore security rules.");
      }
      throw e;
    }
    if (!appUser) {
      devLog("[Auth] No user profile, signing out");
      await signOut(auth);
      throw new Error("User profile not found. Please re-register.");
    }
    return appUser;
  }

  async function register(
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    orgName: string,
    city: string
  ): Promise<AppUser> {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    devLog("[Auth] Firebase sign-up succeeded, uid:", cred.user.uid);
    await sendEmailVerification(cred.user);

    // The website keys a solo/primary organization by the owner's own uid
    // (see its API route that creates users, and useResolvedProfile). A generated
    // id here would make the site treat the account as a SECONDARY company and
    // look for its identity in organizations/{id} — a doc that does not exist —
    // so the whole company profile would read as blank on the website.
    const organizationId = cred.user.uid;

    try {
      await setDoc(doc(db, "users", cred.user.uid), {
        email,
        name: displayName,
        role,
        organizationId,
        organizationRole: "owner",
        companyName: orgName,
        city,
        providers: ["password"] as string[],
        profileCompleted: true,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
    } catch (e: any) {
      devLog("[Auth] Firestore write failed:", e.code, e.message);
      if (e.code === "permission-denied") {
        throw new Error("Firestore permission denied. Please check Firestore security rules.");
      }
      throw e;
    }

    const appUser = await loadUserData(cred.user);
    if (!appUser) {
      await signOut(auth);
      throw new Error("Registration succeeded but profile setup failed. Please try again.");
    }
    return appUser;
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

  async function findUserByEmail(email: string) {
    const emailLower = email.toLowerCase();
    const snap = await getDocs(query(collection(db, "users"), where("email", "==", emailLower)));
    if (!snap.empty) return snap;
    if (email !== emailLower) {
      const snapOrig = await getDocs(query(collection(db, "users"), where("email", "==", email)));
      if (!snapOrig.empty) return snapOrig;
    }
    return snap; // empty
  }

  async function signInWithGoogle(): Promise<AppUser> {
    devLog("[Auth] signInWithGoogle called");

    if (Platform.OS === "web") {
      const provider = new GoogleAuthProvider();
      provider.addScope("profile");
      provider.addScope("email");

      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (e: any) {
        if (e.code === "auth/account-exists-with-different-credential") {
          throw Object.assign(
            new Error("An account already exists with this email. Please sign in with your password first to link Google Sign-In."),
            { code: "auth/account-exists-with-different-credential" }
          );
        }
        throw e;
      }

      const fbUser = result.user;
      devLog("[Auth] Google sign-in succeeded, uid:", fbUser.uid);

      let appUser = await loadUserData(fbUser);

      if (!appUser) {
        devLog("[Auth] New Google user, checking for existing account by email");

        // Check for existing account with this email (password provider)
        const emailSnapshot = await findUserByEmail(fbUser.email ?? "");

        if (!emailSnapshot.empty) {
          await signOut(auth);
          throw Object.assign(
            new Error("An account already exists with this email. Please sign in with your password first to link Google Sign-In."),
            { code: "auth/account-exists-with-different-credential" }
          );
        }

        devLog("[Auth] Truly new Google user, creating profile");
        const organizationId = fbUser.uid;
        const displayName = fbUser.displayName || fbUser.email?.split("@")[0] || "User";

        await setDoc(doc(db, "users", fbUser.uid), {
          email: fbUser.email?.toLowerCase(),
          name: displayName,
          role: "Contractor" as UserRole,
          organizationId,
          organizationRole: "owner",
          companyName: displayName,
          city: "",
          providers: ["google.com"] as string[],
          profileCompleted: false,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        });

        appUser = await loadUserData(fbUser);
      } else {
        // Existing user — update lastLoginAt
        updateDoc(doc(db, "users", fbUser.uid), { lastLoginAt: serverTimestamp() }).catch(() => {});
      }

      if (!appUser) {
        await signOut(auth);
        throw new Error("Failed to set up user profile.");
      }

      return appUser;
    }

    if (!googleClientId) {
      throw new Error(
        "Google sign-in is not configured. Set EXPO_PUBLIC_FIREBASE_CLIENT_ID in your .env file."
      );
    }

    const redirectUri = makeRedirectUri();
    const authRequest = new AuthRequest({
      clientId: googleClientId,
      redirectUri,
      scopes: GOOGLE_SCOPES,
      responseType: ResponseType.IdToken,
    });

    const result = await authRequest.promptAsync(GOOGLE_DISCOVERY);
    if (result.type !== "success") {
      throw new Error(result.type === "cancel" ? "User cancelled Google sign-in." : "Google sign-in failed.");
    }

    const idToken = result.params.id_token;
    if (!idToken) {
      throw new Error("No ID token received from Google.");
    }

    const credential = GoogleAuthProvider.credential(idToken);
    try {
      await signInWithCredential(auth, credential);
    } catch (e: any) {
      if (e.code === "auth/account-exists-with-different-credential") {
        throw Object.assign(
          new Error("An account already exists with this email. Please sign in with your password first to link Google Sign-In."),
          { code: "auth/account-exists-with-different-credential" }
        );
      }
      throw e;
    }

    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (auth.currentUser) {
          clearInterval(check);
          resolve();
        }
      }, 200);
      setTimeout(() => {
        clearInterval(check);
        resolve();
      }, 15000);
    });

    if (!auth.currentUser) {
      throw new Error("Google sign-in completed but authentication failed.");
    }

    const fbUser = auth.currentUser;
    let appUser = await loadUserData(fbUser);

    if (!appUser) {
      // Check for existing account with this email (password provider)
      const emailSnapshot = await findUserByEmail(fbUser.email ?? "");

      if (!emailSnapshot.empty) {
        await signOut(auth);
        throw Object.assign(
          new Error("An account already exists with this email. Please sign in with your password first to link Google Sign-In."),
          { code: "auth/account-exists-with-different-credential" }
        );
      }

      const organizationId = fbUser.uid;
      const displayName = fbUser.displayName || fbUser.email?.split("@")[0] || "User";

      await setDoc(doc(db, "users", fbUser.uid), {
        email: fbUser.email?.toLowerCase(),
        name: displayName,
        role: "Contractor" as UserRole,
        organizationId,
        organizationRole: "owner",
        companyName: displayName,
        city: "",
        providers: ["google.com"],
        profileCompleted: false,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });

      appUser = await loadUserData(fbUser);
    } else {
      // Existing user — update lastLoginAt
      updateDoc(doc(db, "users", fbUser.uid), { lastLoginAt: serverTimestamp() }).catch(() => {});
    }

    if (!appUser) {
      await signOut(auth);
      throw new Error("Failed to set up user profile.");
    }

    return appUser;
  }

  return (
    <AuthContext.Provider value={{ user, organization, loading, login, register, logout, refreshUser, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}
