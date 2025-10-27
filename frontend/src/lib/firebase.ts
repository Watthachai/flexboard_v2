// Import the functions you need from the SDKs you need
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  connectAuthEmulator,
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// 🎯 Firestore Database ID Configuration
const firestoreDbId = process.env.NEXT_PUBLIC_FIRESTORE_DB_ID || "(default)";

console.log("🔥 Firebase Configuration:");
console.log("📦 Project ID:", firebaseConfig.projectId);
console.log("🗄️  Firestore Database ID:", firestoreDbId);

// Initialize Firebase (prevent multiple initializations)
let app: FirebaseApp;
let analytics: Analytics | null = null;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log("🔥 Firebase initialized successfully!");
  console.log("📦 Project ID:", firebaseConfig.projectId);
} else {
  app = getApps()[0];
  console.log("🔥 Firebase already initialized");
}

// Initialize Analytics only in browser environment
if (typeof window !== "undefined" && firebaseConfig.measurementId) {
  analytics = getAnalytics(app);
  console.log("📊 Firebase Analytics enabled");
}

// Initialize other Firebase services
const auth = getAuth(app);

// 🎯 Initialize Firestore with specific Database ID
const db = getFirestore(app, firestoreDbId);
console.log("✅ Firestore initialized with database:", firestoreDbId);

const storage = getStorage(app);

// 🔧 Connect to Firebase Emulators in development
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";

  if (useEmulator) {
    try {
      connectAuthEmulator(auth, "http://localhost:9099", {
        disableWarnings: true,
      });
      connectFirestoreEmulator(db, "localhost", 8080);
      connectStorageEmulator(storage, "localhost", 9199);
      console.log("🔧 Connected to Firebase Emulators");
    } catch (error) {
      console.warn(
        "⚠️ Emulator connection failed (may already be connected):",
        error
      );
    }
  }
}

console.log("✅ Firebase services ready:");
console.log("  - Authentication:", auth ? "✓" : "✗");
console.log("  - Firestore:", db ? "✓" : "✗");
console.log("  - Storage:", storage ? "✓" : "✗");

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export { app, analytics, auth, db, storage, googleProvider };
