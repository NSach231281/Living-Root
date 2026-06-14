import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  User,
} from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { auth, db, googleProvider } from "../firebase";
import { LRUser } from "../types";

// Known partners — these get "partner" role automatically on first login
// Nitin gets "admin"
const PARTNER_EMAILS: Record<string, { role: LRUser["role"]; partnerId: string }> = {
  "nitin.sach@gmail.com":   { role: "admin",   partnerId: "nitin"   },
  "shruthi.kapoor@gmail.com": { role: "partner",  partnerId: "shruthi" },
  "domesticconnexions@gmail.com":    { role: "partner",  partnerId: "siva"    },
  "anushasreekar@gmail.com":  { role: "partner",  partnerId: "anusha"  },
};

// ── IMPORTANT: Add each partner's actual Gmail address below too ──────────────
// e.g. if Nitin uses nitinXXX@gmail.com to sign in with Google, add it here
const PARTNER_GMAIL_MAP: Record<string, { role: LRUser["role"]; partnerId: string }> = {
  "nitin.sach@gmail.com": { role: "admin",   partnerId: "nitin"   },
  "shruthi.kapoor@gmail.com":  { role: "partner", partnerId: "shruthi" },
  "domesticconnexions@gmail.com":  { role: "partner", partnerId: "siva"    },
  "anushasreekar@gmail.com":{ role: "partner", partnerId: "anusha"  },
};

interface AuthContextType {
  user:       LRUser | null;
  fbUser:     User | null;
  loading:    boolean;
  signInWithGoogle: () => Promise<void>;
  signOut:    () => Promise<void>;
  isAdmin:    boolean;
  isPartner:  boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [fbUser, setFbUser]   = useState<User | null>(null);
  const [user, setUser]       = useState<LRUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setFbUser(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setFbUser(firebaseUser);

      // Load or create user profile in Firebase
      const userRef = ref(db, `/users/${firebaseUser.uid}`);
      const snap    = await get(userRef);

      if (snap.exists()) {
        setUser(snap.val() as LRUser);
      } else {
        // First login — determine role
        const email = firebaseUser.email || "";
        const partnerInfo =
          PARTNER_EMAILS[email] || PARTNER_GMAIL_MAP[email];

        const newUser: LRUser = {
          uid:       firebaseUser.uid,
          email,
          name:      firebaseUser.displayName || "Guest",
          photoURL:  firebaseUser.photoURL    || undefined,
          role:      partnerInfo?.role         || "customer",
          partnerId: partnerInfo?.partnerId    || undefined,
          tier:      partnerInfo ? undefined   : "primary",
          createdAt: Date.now(),
        };

        await set(userRef, newUser);
        setUser(newUser);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setUser(null);
    setFbUser(null);
  };

  const isAdmin   = user?.role === "admin";
  const isPartner = user?.role === "partner" || user?.role === "admin";
  const isCustomer = user?.role === "customer";

  return (
    <AuthContext.Provider value={{ user, fbUser, loading, signInWithGoogle, signOut, isAdmin, isPartner, isCustomer }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
