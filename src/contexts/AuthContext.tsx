import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  User,
} from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { auth, db, googleProvider } from "../firebase";
import { LRUser } from "../types";

// All partner Gmail addresses — role assigned automatically on sign-in
const PARTNER_GMAIL_MAP: Record<string, { role: LRUser["role"]; partnerId: string }> = {
  "nsachdeva23121981@gmail.com": { role: "admin",   partnerId: "nitin"   },
  "mthejashree89@gmail.com":   { role: "partner", partnerId: "Teju" },
  "domesticconnexions@gmail.com":{ role: "partner", partnerId: "siva"    },
  "seethalakshmitd@gmail.com":   { role: "partner", partnerId: "Lakshmi"  },
  "srushtisnimbalkar@gmail.com":    { role: "marketing", partnerId: "Shrushti"   },
};

interface AuthContextType {
  user:             LRUser | null;
  fbUser:           User   | null;
  loading:          boolean;
  signInWithGoogle: () => Promise<void>;
  signOut:          () => Promise<void>;
  isAdmin:          boolean;
  isPartner:        boolean;
  isCustomer:       boolean;
  isMarketing:      boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [fbUser,  setFbUser]  = useState<User | null>(null);
  const [user,    setUser]    = useState<LRUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Build a clean user object — never contains undefined (Firebase rejects undefined)
  const buildUser = (firebaseUser: User, partnerInfo?: { role: LRUser["role"]; partnerId: string }): any => {
    const u: any = {
      uid:       firebaseUser.uid,
      email:     firebaseUser.email || "",
      name:      firebaseUser.displayName || "Guest",
      role:      partnerInfo?.role || "customer",
      createdAt: Date.now(),
    };
    if (firebaseUser.photoURL)  u.photoURL  = firebaseUser.photoURL;
    if (partnerInfo?.partnerId) u.partnerId = partnerInfo.partnerId;
    if (!partnerInfo)           u.tier      = "primary";
    return u;
  };

  useEffect(() => {
    // Handle redirect result silently — onAuthStateChanged does the real work
    getRedirectResult(auth).catch(() => {});

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setFbUser(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setFbUser(firebaseUser);

      const email       = firebaseUser.email || "";
      const partnerInfo = PARTNER_GMAIL_MAP[email];

      try {
        const userRef = ref(db, `/users/${firebaseUser.uid}`);
        const snap    = await get(userRef);

        if (snap.exists()) {
          const existing = snap.val() as LRUser;
          // Auto-fix role if Gmail map has a different/correct role
          if (partnerInfo && existing.role !== partnerInfo.role) {
            const updated = {
              ...existing,
              role:      partnerInfo.role,
              partnerId: partnerInfo.partnerId,
            };
            await set(userRef, updated);
            setUser(updated);
          } else {
            setUser(existing);
          }
        } else {
          // First sign-in — create user entry
          const newUser = buildUser(firebaseUser, partnerInfo);
          await set(userRef, newUser);
          setUser(newUser);
        }
      } catch (err) {
        // Firebase read/write failed — use Gmail map as fallback
        // This ensures admin is NEVER locked out even if DB has issues
        console.warn("Firebase read failed, using Gmail map fallback:", err);
        setUser(buildUser(firebaseUser, partnerInfo));
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    try {
      // Popup is faster and works on most desktop browsers
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      // If popup is blocked, fall back to redirect
      if (
        err.code === "auth/popup-blocked" ||
        err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/cancelled-popup-request"
      ) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        throw err;
      }
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setUser(null);
    setFbUser(null);
  };

  const isAdmin    = user?.role === "admin";
  const isPartner  = user?.role === "partner" || user?.role === "admin";
  const isCustomer = user?.role === "customer";
  const isMarketing = user?.role === "marketing";

  return (
    <AuthContext.Provider value={{ user, fbUser, loading, signInWithGoogle, signOut, isAdmin, isPartner, isCustomer, isMarketing }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
