"use client"

import { useState, useEffect } from "react"
import { encryptData, decryptData } from "../utils/security"
import { useSecurityContext } from "../components/SecurityProvider"

export function useSecureStorage<T>(key: string, initialValue: T) {
  const { sessionKey } = useSecurityContext()
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!sessionKey) return initialValue

    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        return decryptData(item, sessionKey) as T
      }
      return initialValue
    } catch (error) {
      console.error("Error reading from localStorage:", error)
      return initialValue
    }
  })

  // Update stored value when sessionKey changes
  useEffect(() => {
    if (sessionKey) {
      try {
        const item = window.localStorage.getItem(key)
        if (item) {
          // Try to decrypt with new session key
          const decrypted = decryptData(item, sessionKey) as T
          setStoredValue(decrypted)
        }
      } catch (error) {
        console.error("Error updating secure storage with new session key:", error)
      }
    }
  }, [sessionKey, key])

  // Set function to update stored value
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      if (!sessionKey) return

      // Allow value to be a function for previous state
      const valueToStore = value instanceof Function ? value(storedValue) : value

      // Save state
      setStoredValue(valueToStore)

      // Save to localStorage with encryption
      window.localStorage.setItem(key, encryptData(valueToStore, sessionKey))
    } catch (error) {
      console.error("Error saving to localStorage:", error)
    }
  }

  return [storedValue, setValue] as const
}
