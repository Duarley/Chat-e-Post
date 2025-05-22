// Security enhancements for Firebase configuration

import { initializeApp } from "firebase/app"
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
} from "firebase/auth"
import {
  CACHE_SIZE_UNLIMITED,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore"
import { getStorage } from "firebase/storage"

// Load Firebase config from environment variables only
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Initialize Firebase with enhanced security
const app = initializeApp(firebaseConfig)

// Configure Firestore with security settings
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  }),
})

// Configure Auth with enhanced security
const auth = getAuth(app)

// Use session persistence instead of local persistence for better security
// This will require users to re-authenticate when they close the browser
setPersistence(auth, browserSessionPersistence)

// Configure Storage
const storage = getStorage(app)
const googleProvider = new GoogleAuthProvider()

// Add additional security scopes to Google provider
googleProvider.addScope("email")
googleProvider.addScope("profile")
googleProvider.setCustomParameters({
  prompt: "select_account",
})

// Export configured services
export { app, auth, db, storage, googleProvider }

// Security monitoring function
export const monitorAuthState = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      // Log authentication events for security monitoring
      console.log(`User authenticated: ${user.uid} at ${new Date().toISOString()}`)
    } else {
      console.log(`User signed out at ${new Date().toISOString()}`)
    }
    callback(user)
  })
}
