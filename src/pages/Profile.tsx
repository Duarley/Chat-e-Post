"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { updateProfile } from "firebase/auth"
import { db, storage, auth } from "../firebase/config"
import Navbar from "../components/Navbar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { Camera, Loader2 } from "lucide-react"

interface User {
  uid: string
  displayName: string
  email: string
  photoURL: string | null
  createdAt: any
}

interface Post {
  id: string
  text: string
  imageUrl?: string
  createdAt: any
  userId: string
  userName: string
  userPhotoURL?: string
}

export default function Profile() {
  const { id } = useParams<{ id: string }>()
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()
  const currentUser = auth.currentUser
  const isOwnProfile = currentUser?.uid === id

  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return

      try {
        const userDoc = await getDoc(doc(db, "users", id))
        if (userDoc.exists()) {
          setUser(userDoc.data() as User)
        }
      } catch (error) {
        console.error("Error fetching user:", error)
      }
    }

    fetchUser()
  }, [id])

  useEffect(() => {
    if (!id) return

    const q = query(collection(db, "posts"), where("userId", "==", id), orderBy("createdAt", "desc"))

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const postsData: Post[] = []
      querySnapshot.forEach((doc) => {
        postsData.push({ id: doc.id, ...doc.data() } as Post)
      })
      setPosts(postsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [id])

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser || !isOwnProfile || !e.target.files || !e.target.files[0]) return

    const file = e.target.files[0]
    setUploading(true)

    try {
      const storageRef = ref(storage, `profilePictures/${currentUser.uid}`)
      await uploadBytes(storageRef, file)
      const photoURL = await getDownloadURL(storageRef)

      // Update auth profile
      await updateProfile(currentUser, { photoURL })

      // Update user document
      await updateDoc(doc(db, "users", currentUser.uid), { photoURL })

      // Update local state
      setUser((prev) => (prev ? { ...prev, photoURL } : null))

      toast({
        title: "Profile updated",
        description: "Your profile picture has been updated successfully.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating profile",
        description: error.message,
      })
    } finally {
      setUploading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return ""
    const date = timestamp.toDate()
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
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

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">User not found</h1>
          <p>The user you're looking for doesn't exist or has been deleted.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName} />
                  <AvatarFallback className="text-2xl">{getInitials(user.displayName)}</AvatarFallback>
                </Avatar>

                {isOwnProfile && (
                  <label
                    htmlFor="profile-picture"
                    className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    <input
                      id="profile-picture"
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>

              <h1 className="text-2xl font-bold">{user.displayName}</h1>
              <p className="text-muted-foreground mb-2">{user.email}</p>
              <p className="text-sm text-muted-foreground">
                Joined {user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : "recently"}
              </p>
            </div>
          </CardContent>
        </Card>

        <h2 className="text-xl font-bold mb-4">Posts</h2>

        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No posts yet.</div>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={post.userPhotoURL || undefined} alt={post.userName} />
                      <AvatarFallback>{getInitials(post.userName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{post.userName}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  {post.text && <p className="whitespace-pre-line mb-4">{post.text}</p>}
                  {post.imageUrl && (
                    <img
                      src={post.imageUrl || "/placeholder.svg"}
                      alt="Post"
                      className="rounded-md w-full object-cover max-h-[500px]"
                    />
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
