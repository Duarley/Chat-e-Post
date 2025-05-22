"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/firebase/config"
import LoadingScreen from "@/components/LoadingScreen"
import Navbar from "@/components/Navbar"
import HomeContent from "@/components/HomeContent"
import BottomNav from "@/components/BottomNav"

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)

      if (!currentUser) {
        router.push("/login")
      }
    })

    return () => unsubscribe()
  }, [router])

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return null // Redirecionará no useEffect
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <Navbar />
      <HomeContent />
      <BottomNav />
    </div>
  )
}
