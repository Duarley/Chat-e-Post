"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { collection, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore"
import { db, auth } from "../firebase/config"
import Navbar from "../components/Navbar"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Loader2, Search } from "lucide-react"

interface User {
  uid: string
  displayName: string
  email: string
  photoURL: string | null
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
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const currentUser = auth.currentUser

  useEffect(() => {
    if (!currentUser) return

    // Fetch chat rooms where the current user is a participant
    const q = query(
      collection(db, "chatRooms"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("lastMessageTime", "desc"),
    )

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const roomsData: ChatRoom[] = []
      querySnapshot.forEach((doc) => {
        roomsData.push({ id: doc.id, ...doc.data() } as ChatRoom)
      })
      setChatRooms(roomsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [currentUser])

  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser) return

      try {
        const usersSnapshot = await getDocs(collection(db, "users"))
        const usersData: User[] = []

        usersSnapshot.forEach((doc) => {
          const userData = doc.data() as User
          if (userData.uid !== currentUser.uid) {
            usersData.push(userData)
          }
        })

        setUsers(usersData)
      } catch (error) {
        console.error("Error fetching users:", error)
      }
    }

    fetchUsers()
  }, [currentUser])

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
      return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    } else if (diffInDays < 7) {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
      }).format(date)
    } else {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(date)
    }
  }

  const filteredUsers = users.filter((user) => user.displayName.toLowerCase().includes(searchQuery.toLowerCase()))

  const getChatRoomId = (userId: string) => {
    if (!currentUser) return ""

    // Check if a chat room already exists
    const existingRoom = chatRooms.find((room) => room.participants.includes(userId) && room.participants.length === 2)

    if (existingRoom) {
      return existingRoom.id
    }

    // Create a new chat room ID
    const sortedIds = [currentUser.uid, userId].sort()
    return `${sortedIds[0]}_${sortedIds[1]}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Messages</h1>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-2">
          {searchQuery ? (
            filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <Link key={user.uid} to={`/chat/${getChatRoomId(user.uid)}`}>
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
              <div className="text-center py-8 text-muted-foreground">No users found matching "{searchQuery}"</div>
            )
          ) : chatRooms.length > 0 ? (
            chatRooms.map((room) => {
              // Find the other participant
              const otherParticipantId = room.participants.find((id) => id !== currentUser?.uid)
              const otherUser = users.find((user) => user.uid === otherParticipantId)

              if (!otherUser) return null

              return (
                <Link key={room.id} to={`/chat/${room.id}`}>
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
              No conversations yet. Search for users to start chatting!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
