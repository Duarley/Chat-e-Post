import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
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

// Inicializar Firebase
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app
