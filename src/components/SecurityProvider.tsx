"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { auth } from "../firebase/security-config"
import { SessionManager, generateSessionKey } from "../utils/security"
import { onAuthStateChanged } from "firebase/auth"

interface SecurityContextType {
  isAuthenticated: boolean
  sessionKey: string | null
  loading: boolean
  refreshSession: () => void
}

const SecurityContext = createContext<SecurityContextType>({
  isAuthenticated: false,
  sessionKey: null,
  loading: true,
  refreshSession: () => {},
})

export const useSecurityContext = () => useContext(SecurityContext)

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize session manager for timeout
  useEffect(() => {
    const sessionManager = new SessionManager()
    return () => {
      // Clean up session manager
    }
  }, [])

  // Monitor authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user)

      if (user) {
        // Generate a new session key when user authenticates
        const newSessionKey = generateSessionKey()
        setSessionKey(newSessionKey)

        // Store last login time for security auditing
        localStorage.setItem("last_login", new Date().toISOString())
      } else {
        setSessionKey(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Refresh security session
  const refreshSession = () => {
    if (isAuthenticated) {
      setSessionKey(generateSessionKey())
    }
  }

  return (
    <SecurityContext.Provider value={{ isAuthenticated, sessionKey, loading, refreshSession }}>
      {children}
    </SecurityContext.Provider>
  )
}
