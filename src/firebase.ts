import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "AIzaSyDfyP4YO-effehhGBOyf66K45h9ZgB_Mx4",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "living-root.firebaseapp.com",
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL       || "https://living-root-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "living-root",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "living-root.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID|| "1036433941276",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "1:1036433941276:web:180fcd19c61230385490d9",
};

const app      = initializeApp(firebaseConfig);
export const auth     = getAuth(app);
export const db       = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export default app;
