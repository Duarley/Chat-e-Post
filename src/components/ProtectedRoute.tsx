"use client"

import type React from "react"
import { Navigate } from "react-router-dom"
import { useEffect } from "react"

interface ProtectedRouteProps {
  user: any
  children: React.ReactNode
}

export default function ProtectedRoute({ user, children }: ProtectedRouteProps) {
  // Check for session tampering
  useEffect(() => {
    if (user) {
      // Get the last authentication time
      const lastAuthTime = user.metadata?.lastSignInTime

      if (lastAuthTime) {
        const lastAuth = new Date(lastAuthTime).getTime()
        const now = new Date().getTime()

        // If last auth time is in the future or too far in the past (7 days), force logout
        if (lastAuth > now || now - lastAuth > 7 * 24 * 60 * 60 * 1000) {
          console.error("Session tampering detected")
          // Force logout
          window.location.href = "/login"
        }
      }
    }
  }, [user])

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
