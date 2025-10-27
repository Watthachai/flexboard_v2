"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Firebase
    if (!getApps().length) {
      initializeApp(firebaseConfig);
    }

    const auth = getAuth();

    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        localStorage.setItem("userEmail", currentUser.email || "");
        localStorage.setItem("isAuthenticated", "true");
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const auth = getAuth();
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      localStorage.setItem("userEmail", result.user.email || "");
      localStorage.setItem("isAuthenticated", "true");
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
      throw err;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      const auth = getAuth();
      await signOut(auth);
      setUser(null);
      localStorage.removeItem("userEmail");
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("tenantId");
      localStorage.removeItem("inviteCode");
      localStorage.removeItem("dashboardConfig");
    } catch (err: any) {
      setError(err.message || "Failed to sign out");
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, error, signInWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
