"use client"

import type { AppProps } from "next/app"
import { useState, useEffect } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import SplashScreen from "@/components/SplashScreen"
import "@/styles/globals.css"

export default function App({ Component, pageProps }: AppProps) {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    // Mostrar splash screen por 3 segundos
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  if (showSplash) {
    return <SplashScreen />
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="social-app-theme">
      <Component {...pageProps} />
      <Toaster />
    </ThemeProvider>
  )
}
