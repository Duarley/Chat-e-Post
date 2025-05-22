"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import Link from "next/link"
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore"
import { db, auth } from "../../firebase/config"
import Navbar from "../../components/Navbar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Heart, MessageSquare, Share, ArrowLeft, Send, Loader2 } from "lucide-react"
import LoadingScreen from "@/components/LoadingScreen"

interface Post {
  id: string
  text: string
  imageUrl?: string
  createdAt: any
  userId: string
  userName: string
  userPhotoURL?: string
  likes?: string[]
  comments?: number
  style?: any
}

interface Comment {
  id: string
  text: string
  userId: string
  userName: string
  userPhotoURL?: string
  createdAt: any
  likes?: string[]
}

export default function PostPage() {
  const router = useRouter()
  const { id } = router.query
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const { toast } = useToast()
  const currentUser = auth.currentUser

  useEffect(() => {
    if (!id) return

    // Buscar o post
    const fetchPost = async () => {
      try {
        const postDoc = await getDoc(doc(db, "posts", id as string))
        if (postDoc.exists()) {
          setPost({ id: postDoc.id, ...postDoc.data() } as Post)
        } else {
          toast({
            variant: "destructive",
            title: "Post não encontrado",
            description: "O post que você está procurando não existe ou foi excluído.",
          })
          router.push("/")
        }
      } catch (error) {
        console.error("Erro ao buscar post:", error)
      }
    }

    fetchPost()

    // Buscar comentários
    const q = query(collection(db, "posts", id as string, "comments"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const commentsData: Comment[] = []
      querySnapshot.forEach((doc) => {
        commentsData.push({ id: doc.id, ...doc.data() } as Comment)
      })
      setComments(commentsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [id, router, toast])

  const handleLike = async () => {
    if (!currentUser || !post) return

    try {
      const postRef = doc(db, "posts", post.id)
      const isLiked = post.likes?.includes(currentUser.uid) || false

      if (isLiked) {
        // Remover like
        await updateDoc(postRef, {
          likes: arrayRemove(currentUser.uid),
        })
        setPost((prev) => {
          if (!prev) return null
          const newLikes = prev.likes?.filter((uid) => uid !== currentUser.uid) || []
          return { ...prev, likes: newLikes }
        })
      } else {
        // Adicionar like
        await updateDoc(postRef, {
          likes: arrayUnion(currentUser.uid),
        })
        setPost((prev) => {
          if (!prev) return null
          const newLikes = [...(prev.likes || []), currentUser.uid]
          return { ...prev, likes: newLikes }
        })
      }
    } catch (error) {
      console.error("Erro ao curtir post:", error)
    }
  }

  const handleCommentLike = async (commentId: string, isLiked: boolean) => {
    if (!currentUser || !post) return

    try {
      const commentRef = doc(db, "posts", post.id, "comments", commentId)

      if (isLiked) {
        // Remover like
        await updateDoc(commentRef, {
          likes: arrayRemove(currentUser.uid),
        })
      } else {
        // Adicionar like
        await updateDoc(commentRef, {
          likes: arrayUnion(currentUser.uid),
        })
      }
    } catch (error) {
      console.error("Erro ao curtir comentário:", error)
    }
  }

  const handleSharePost = () => {
    if (!post) return

    const postUrl = `${window.location.origin}/post/${post.id}`

    if (navigator.share) {
      navigator
        .share({
          title: "Compartilhar post",
          text: "Confira este post!",
          url: postUrl,
        })
        .catch((error) => console.log("Erro ao compartilhar", error))
    } else {
      // Fallback para navegadores que não suportam a API Web Share
      navigator.clipboard.writeText(postUrl)
      toast({
        title: "Link copiado",
        description: "O link do post foi copiado para a área de transferência.",
      })
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !post || !newComment.trim()) return

    setSending(true)
    try {
      // Adicionar comentário
      await addDoc(collection(db, "posts", post.id, "comments"), {
        text: newComment.trim(),
        userId: currentUser.uid,
        userName: currentUser.displayName,
        userPhotoURL: currentUser.photoURL,
        createdAt: serverTimestamp(),
        likes: [],
      })

      // Incrementar contador de comentários no post
      await updateDoc(doc(db, "posts", post.id), {
        comments: increment(1),
      })

      setNewComment("")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao comentar",
        description: error.message,
      })
    } finally {
      setSending(false)
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
    return new Intl.DateTimeFormat("pt-BR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  if (loading) {
    return <LoadingScreen />
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Post não encontrado</h1>
          <p>O post que você está procurando não existe ou foi excluído.</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            Voltar para a página inicial
          </Button>
        </div>
      </div>
    )
  }

  const isLiked = post.likes?.includes(currentUser?.uid || "") || false

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => router.back()} className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>

        <Card className="mb-6">
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
            <div className={post.style || ""}>
              {post.text && <p className="whitespace-pre-line mb-4">{post.text}</p>}
              {post.imageUrl && (
                <img
                  src={post.imageUrl || "/placeholder.svg"}
                  alt="Post"
                  className="rounded-md w-full object-cover max-h-[500px]"
                />
              )}
            </div>

            <div className="flex items-center gap-4 mt-4">
              <button
                className={`flex items-center gap-1 text-sm ${isLiked ? "text-red-500" : "text-muted-foreground"}`}
                onClick={handleLike}
              >
                <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
                {post.likes?.length || 0}
              </button>

              <button className="flex items-center gap-1 text-sm text-muted-foreground">
                <MessageSquare className="h-5 w-5" />
                {comments.length}
              </button>

              <button className="flex items-center gap-1 text-sm text-muted-foreground" onClick={handleSharePost}>
                <Share className="h-5 w-5" />
                Compartilhar
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6">
          <h2 className="text-lg font-bold mb-4">Comentários</h2>
          <form onSubmit={handleSubmitComment} className="flex gap-2 mb-6">
            <Input
              type="text"
              placeholder="Adicione um comentário..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={sending || !newComment.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>

          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Nenhum comentário ainda. Seja o primeiro a comentar!
              </div>
            ) : (
              comments.map((comment) => {
                const isCommentLiked = comment.likes?.includes(currentUser?.uid || "") || false

                return (
                  <div key={comment.id} className="flex gap-3">
                    <Link href={`/profile/${comment.userId}`}>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.userPhotoURL || undefined} alt={comment.userName} />
                        <AvatarFallback>{getInitials(comment.userName)}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <Link href={`/profile/${comment.userId}`} className="font-medium hover:underline">
                            {comment.userName}
                          </Link>
                          <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="mt-1">{comment.text}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-1 ml-2">
                        <button
                          className={`flex items-center gap-1 text-xs ${
                            isCommentLiked ? "text-red-500" : "text-muted-foreground"
                          }`}
                          onClick={() => handleCommentLike(comment.id, isCommentLiked)}
                        >
                          <Heart className={`h-3 w-3 ${isCommentLiked ? "fill-current" : ""}`} />
                          {comment.likes?.length || 0}
                        </button>
                        <button className="text-xs text-muted-foreground">Responder</button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
