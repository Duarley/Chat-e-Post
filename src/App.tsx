"use client"

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Suspense, lazy, useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "./firebase/security-config"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { SecurityProvider } from "./components/SecurityProvider"
import LoadingScreen from "./components/LoadingScreen"
import ProtectedRoute from "./components/ProtectedRoute"

// Lazy load pages for better performance
const Login = lazy(() => import("./pages/Login"))
const Register = lazy(() => import("./pages/Register"))
const Home = lazy(() => import("./pages/Home"))
const Profile = lazy(() => import("./pages/Profile"))
const Chat = lazy(() => import("./pages/Chat"))
const ChatRoom = lazy(() => import("./pages/ChatRoom"))

function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Add Content Security Policy
  useEffect(() => {
    // Create meta element for CSP
    const meta = document.createElement("meta")
    meta.httpEquiv = "Content-Security-Policy"
    meta.content =
      "default-src 'self'; script-src 'self'; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com; img-src 'self' data: https://*.googleapis.com https://*.firebase.com; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-src 'self'; object-src 'none';"
    document.head.appendChild(meta)

    return () => {
      document.head.removeChild(meta)
    }
  }, [])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <SecurityProvider>
      <ThemeProvider defaultTheme="light" storageKey="social-app-theme">
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
              <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute user={user}>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/:id"
                element={
                  <ProtectedRoute user={user}>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute user={user}>
                    <Chat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat/:id"
                element={
                  <ProtectedRoute user={user}>
                    <ChatRoom />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </ThemeProvider>
    </SecurityProvider>
  )
}

export default App
