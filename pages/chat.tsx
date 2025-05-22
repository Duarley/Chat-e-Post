"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import Link from "next/link"
import { collection, query, where, orderBy, onSnapshot, getDocs, getDoc, doc, setDoc } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { db, auth } from "@/firebase/config"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ArrowLeft, UserPlus } from "lucide-react"
import LoadingScreen from "@/components/LoadingScreen"

interface User {
  uid: string
  displayName: string
  email: string
  photoURL: string | null
  followers?: string[]
  following?: string[]
}

interface ChatRoom {
  id: string
  participants: string[]
  lastMessage: string
  lastMessageTime: any
  unreadCount?: number
}

export default function Chat() {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [mutualFollowers, setMutualFollowers] = useState<string[]>([])
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
        // Verificar se o usuário existe no Firestore
        const userDocRef = doc(db, "users", currentUser.uid)
        const userDoc = await getDoc(userDocRef)

        if (!userDoc.exists()) {
          // Se o usuário não existir, criar um documento para ele
          await setDoc(userDocRef, {
            uid: currentUser.uid,
            displayName: currentUser.displayName || "Usuário",
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            createdAt: new Date(),
            followers: [],
            following: [],
          })
        }

        // Buscar salas de chat onde o usuário atual é um participante
        const q = query(
          collection(db, "chatRooms"),
          where("participants", "array-contains", currentUser.uid),
          orderBy("lastMessageTime", "desc"),
        )

        const roomsUnsubscribe = onSnapshot(q, (querySnapshot) => {
          const roomsData: ChatRoom[] = []
          querySnapshot.forEach((doc) => {
            roomsData.push({ id: doc.id, ...doc.data() } as ChatRoom)
          })
          setChatRooms(roomsData)
        })

        // Buscar usuários e verificar seguidores mútuos
        const fetchUsersAndMutualFollowers = async () => {
          try {
            // Buscar dados do usuário atual
            const currentUserDoc = await getDoc(doc(db, "users", currentUser.uid))
            const currentUserData = currentUserDoc.data() as User
            const following = currentUserData?.following || []

            // Buscar todos os usuários
            const usersSnapshot = await getDocs(collection(db, "users"))
            const usersData: User[] = []
            const mutualFollowersList: string[] = []

            usersSnapshot.forEach((doc) => {
              const userData = doc.data() as User
              if (userData.uid !== currentUser.uid) {
                usersData.push(userData)

                // Verificar se é um seguidor mútuo
                if (following.includes(userData.uid) && userData.following?.includes(currentUser.uid)) {
                  mutualFollowersList.push(userData.uid)
                }
              }
            })

            setUsers(usersData)
            setMutualFollowers(mutualFollowersList)
          } catch (error) {
            console.error("Erro ao buscar usuários:", error)
          } finally {
            setLoading(false)
          }
        }

        fetchUsersAndMutualFollowers()

        return () => {
          roomsUnsubscribe()
        }
      } catch (error) {
        console.error("Erro ao configurar chat:", error)
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

  const formatTime = (timestamp: any) => {
    if (!timestamp) return ""

    const date = timestamp.toDate()
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) {
      return new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    } else if (diffInDays < 7) {
      return new Intl.DateTimeFormat("pt-BR", {
        weekday: "short",
      }).format(date)
    } else {
      return new Intl.DateTimeFormat("pt-BR", {
        month: "short",
        day: "numeric",
      }).format(date)
    }
  }

  const filteredUsers = users.filter((user) => user.displayName.toLowerCase().includes(searchQuery.toLowerCase()))

  const getChatRoomId = (userId: string) => {
    if (!user) return ""

    // Verificar se uma sala de chat já existe
    const existingRoom = chatRooms.find((room) => room.participants.includes(userId) && room.participants.length === 2)

    if (existingRoom) {
      return existingRoom.id
    }

    // Criar um novo ID de sala de chat
    const sortedIds = [user.uid, userId].sort()
    return `${sortedIds[0]}_${sortedIds[1]}`
  }

  const canChat = (userId: string) => {
    return mutualFollowers.includes(userId)
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background p-4">
        <div className="container mx-auto flex items-center">
          <Link href="/">
            <Button variant="ghost" size="icon" className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Mensagens</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
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
          {searchQuery ? (
            filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const isMutualFollower = canChat(user.uid)

                return (
                  <div key={user.uid}>
                    <Card className={`hover:bg-accent transition-colors ${!isMutualFollower ? "opacity-70" : ""}`}>
                      <CardContent className="p-4 flex items-center gap-3 justify-between">
                        <div className="flex items-center gap-3">
                          <Link href={`/profile/${user.uid}`}>
                            <Avatar>
                              <AvatarImage src={user.photoURL || undefined} alt={user.displayName} />
                              <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                            </Avatar>
                          </Link>
                          <div className="flex-1">
                            <Link href={`/profile/${user.uid}`} className="font-medium hover:underline">
                              {user.displayName}
                            </Link>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>

                        {isMutualFollower ? (
                          <Link href={`/chat/${getChatRoomId(user.uid)}`}>
                            <Button size="sm">Conversar</Button>
                          </Link>
                        ) : (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <UserPlus className="h-4 w-4 mr-1" />
                            Siga mutuamente para conversar
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário encontrado com "{searchQuery}"
              </div>
            )
          ) : chatRooms.length > 0 ? (
            chatRooms.map((room) => {
              // Encontrar o outro participante
              const otherParticipantId = room.participants.find((id) => id !== user?.uid)
              const otherUser = users.find((user) => user.uid === otherParticipantId)

              if (!otherUser) return null

              return (
                <Link key={room.id} href={`/chat/${room.id}`}>
                  <Card className="hover:bg-accent transition-colors">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={otherUser.photoURL || undefined} alt={otherUser.displayName} />
                        <AvatarFallback>{getInitials(otherUser.displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className="font-medium">{otherUser.displayName}</p>
                          {room.lastMessageTime && (
                            <span className="text-xs text-muted-foreground">{formatTime(room.lastMessageTime)}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{room.lastMessage}</p>
                      </div>
                      {room.unreadCount && room.unreadCount > 0 && (
                        <div className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {room.unreadCount}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              )
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma conversa ainda. Busque por usuários para começar a conversar!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
