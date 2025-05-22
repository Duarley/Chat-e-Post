"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage, auth } from "../firebase/config"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { ImageIcon, Send, Loader2 } from "lucide-react"
import Link from "next/link"

interface Post {
  id: string
  text: string
  imageUrl?: string
  createdAt: any
  userId: string
  userName: string
  userPhotoURL?: string
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([])
  const [newPost, setNewPost] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const user = auth.currentUser

  useEffect(() => {
    if (!user) return

    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const postsData: Post[] = []
      querySnapshot.forEach((doc) => {
        postsData.push({ id: doc.id, ...doc.data() } as Post)
      })
      setPosts(postsData)
    })

    return () => unsubscribe()
  }, [user])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || (!newPost.trim() && !image)) return

    setLoading(true)
    try {
      let imageUrl = ""

      if (image) {
        const storageRef = ref(storage, `posts/${Date.now()}_${image.name}`)
        await uploadBytes(storageRef, image)
        imageUrl = await getDownloadURL(storageRef)
      }

      await addDoc(collection(db, "posts"), {
        text: newPost.trim(),
        imageUrl: imageUrl || null,
        createdAt: serverTimestamp(),
        userId: user.uid,
        userName: user.displayName,
        userPhotoURL: user.photoURL,
      })

      setNewPost("")
      setImage(null)

      toast({
        title: "Post created",
        description: "Your post has been published successfully.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating post",
        description: error.message,
      })
    } finally {
      setLoading(false)
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

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <Card className="mb-8">
        <CardHeader>
          <h2 className="text-xl font-bold">Create Post</h2>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <Textarea
              placeholder="What's on your mind?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="mt-4">
              <label htmlFor="image-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ImageIcon className="h-5 w-5" />
                  {image ? image.name : "Add Image"}
                </div>
                <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={loading || (!newPost.trim() && !image)}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Post
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="space-y-6">
        {posts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No posts yet. Be the first to post!</div>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Link href={`/profile/${post.userId}`}>
                    <Avatar>
                      <AvatarImage src={post.userPhotoURL || undefined} alt={post.userName} />
                      <AvatarFallback>{getInitials(post.userName)}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <Link href={`/profile/${post.userId}`} className="font-medium hover:underline">
                      {post.userName}
                    </Link>
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
  )
}
