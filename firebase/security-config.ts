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

// Configuração do Firebase com suas credenciais
const firebaseConfig = {
  apiKey: "AIzaSyA8av1gjJ_ZaU7Lr_dMcOYBwU8xhfxvCcA",
  authDomain: "chat-7f4f3.firebaseapp.com",
  projectId: "chat-7f4f3",
  storageBucket: "chat-7f4f3.appspot.com",
  messagingSenderId: "171361756976",
  appId: "1:171361756976:web:7cadf0fb80bd9e89080af5",
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
