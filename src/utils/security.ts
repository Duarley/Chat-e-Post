// Security utilities for the application

import { AES, enc } from "crypto-js"

// Constants for security features
const TOKEN_KEY = "auth_token"
const REFRESH_INTERVAL = 15 * 60 * 1000 // 15 minutes

// Encrypt sensitive data before storing locally
export const encryptData = (data: any, secretKey: string): string => {
  return AES.encrypt(JSON.stringify(data), secretKey).toString()
}

// Decrypt data retrieved from local storage
export const decryptData = (encryptedData: string, secretKey: string): any => {
  try {
    const bytes = AES.decrypt(encryptedData, secretKey)
    const decryptedData = bytes.toString(enc.Utf8)
    return JSON.parse(decryptedData)
  } catch (error) {
    console.error("Failed to decrypt data:", error)
    return null
  }
}

// Generate a random session key
export const generateSessionKey = (): string => {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// Sanitize user input to prevent XSS attacks
export const sanitizeInput = (input: string): string => {
  return input.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
}

// Validate file types for security
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type)
}

// Validate file size to prevent DoS attacks
export const validateFileSize = (file: File, maxSizeMB: number): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxSizeBytes
}

// Security headers for fetch requests
export const securityHeaders = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; object-src 'none';",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}

// Session timeout management
export class SessionManager {
  private timeoutId: number | null = null
  private lastActivity: number = Date.now()

  constructor(private timeoutDuration: number = 30 * 60 * 1000) {
    this.resetTimeout()
    this.setupActivityListeners()
  }

  private setupActivityListeners() {
    ;["mousedown", "keypress", "scroll", "touchstart"].forEach((eventName) => {
      window.addEventListener(eventName, () => {
        this.lastActivity = Date.now()
        this.resetTimeout()
      })
    })
  }

  private resetTimeout() {
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId)
    }

    this.timeoutId = window.setTimeout(() => {
      // Check if user has been inactive
      const inactiveTime = Date.now() - this.lastActivity
      if (inactiveTime >= this.timeoutDuration) {
        this.logout()
      } else {
        this.resetTimeout()
      }
    }, this.timeoutDuration)
  }

  private logout() {
    // Clear local session data
    localStorage.removeItem(TOKEN_KEY)
    // Redirect to login page
    window.location.href = "/login"
  }
}
