"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import Link from "next/link"
import { collection, getDocs } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { db, auth } from "@/firebase/config"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import LoadingScreen from "@/components/LoadingScreen"
import Navbar from "@/components/Navbar"
import BottomNav from "@/components/BottomNav"

interface User {
  uid: string
  displayName: string
  email: string
  photoURL: string | null
  followers?: string[]
  following?: string[]
}

export default function SearchPage() {
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login")
        return
      }

      setUser(currentUser)

      try {
        // Buscar todos os usuários
        const usersSnapshot = await getDocs(collection(db, "users"))
        const usersData: User[] = []

        usersSnapshot.forEach((doc) => {
          const userData = doc.data() as User
          // Excluir o usuário atual da lista
          if (userData.uid !== currentUser.uid) {
            usersData.push(userData)
          }
        })

        setUsers(usersData)
      } catch (error) {
        console.error("Erro ao buscar usuários:", error)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
  }

  const filteredUsers = users.filter(
    (user) =>
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Buscar</h1>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar usuários..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-2">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <Link key={user.uid} href={`/profile/${user.uid}`}>
                <Card className="hover:bg-accent transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName} />
                      <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? `Nenhum usuário encontrado com "${searchQuery}"` : "Comece a digitar para buscar usuários"}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
