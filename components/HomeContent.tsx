"use client"
import Link from "next/link"
import { useState, useEffect } from "react"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  deleteDoc,
} from "firebase/firestore"
import { db, auth } from "../firebase/config"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Heart, MessageSquare, Share, MoreHorizontal, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

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

export default function HomeContent() {
  const [posts, setPosts] = useState<Post[]>([])
  const [followingStatus, setFollowingStatus] = useState<{ [key: string]: boolean }>({})
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

  useEffect(() => {
    if (!user) return

    // Verificar status de seguindo para cada usuário dos posts
    const checkFollowingStatus = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists() && userDoc.data().following) {
        const following = userDoc.data().following as string[]
        const status: { [key: string]: boolean } = {}

        posts.forEach((post) => {
          if (post.userId !== user.uid) {
            status[post.userId] = following.includes(post.userId)
          }
        })

        setFollowingStatus(status)
      }
    }

    if (posts.length > 0) {
      checkFollowingStatus()
    }
  }, [posts, user])

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return

    try {
      const postRef = doc(db, "posts", postId)

      if (isLiked) {
        // Remover like
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid),
        })
      } else {
        // Adicionar like
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid),
        })
      }
    } catch (error) {
      console.error("Erro ao curtir post:", error)
    }
  }

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    if (!user || userId === user.uid) return

    try {
      const currentUserRef = doc(db, "users", user.uid)
      const targetUserRef = doc(db, "users", userId)

      if (isFollowing) {
        // Deixar de seguir
        await updateDoc(currentUserRef, {
          following: arrayRemove(userId),
        })

        await updateDoc(targetUserRef, {
          followers: arrayRemove(user.uid),
        })

        setFollowingStatus({ ...followingStatus, [userId]: false })
      } else {
        // Seguir
        await updateDoc(currentUserRef, {
          following: arrayUnion(userId),
        })

        await updateDoc(targetUserRef, {
          followers: arrayUnion(user.uid),
        })

        setFollowingStatus({ ...followingStatus, [userId]: true })
      }

      toast({
        title: isFollowing ? "Deixou de seguir" : "Seguindo",
        description: isFollowing ? "Você deixou de seguir este usuário" : "Você está seguindo este usuário agora",
      })
    } catch (error) {
      console.error("Erro ao seguir/deixar de seguir:", error)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!user) return

    try {
      await deleteDoc(doc(db, "posts", postId))

      toast({
        title: "Post excluído",
        description: "Seu post foi excluído com sucesso.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir post",
        description: error.message,
      })
    }
  }

  const handleSharePost = (postId: string) => {
    const postUrl = `${window.location.origin}/post/${postId}`

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

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="space-y-6">
        {posts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhum post ainda. Seja o primeiro a postar!</div>
        ) : (
          posts.map((post) => {
            const isLiked = post.likes?.includes(user?.uid || "") || false
            const isOwnPost = post.userId === user?.uid
            const isFollowing = followingStatus[post.userId] || false

            return (
              <Card key={post.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
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

                    <div className="flex items-center gap-2">
                      {!isOwnPost && (
                        <Button
                          variant={isFollowing ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleFollow(post.userId, isFollowing)}
                        >
                          {isFollowing ? "Seguindo" : "Seguir"}
                        </Button>
                      )}

                      {isOwnPost && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDeletePost(post.id)} className="text-red-500">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className={post.style || ""}>
                    {post.text && <p className="whitespace-pre-line mb-4">{post.text}</p>}
                  </div>

                  <div className="flex items-center gap-4 mt-4">
                    <button
                      className={`flex items-center gap-1 text-sm ${isLiked ? "text-red-500" : "text-muted-foreground"}`}
                      onClick={() => handleLike(post.id, isLiked)}
                    >
                      <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
                      {post.likes?.length || 0}
                    </button>

                    <Link href={`/post/${post.id}`}>
                      <button className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MessageSquare className="h-5 w-5" />
                        {post.comments || 0}
                      </button>
                    </Link>

                    <button
                      className="flex items-center gap-1 text-sm text-muted-foreground"
                      onClick={() => handleSharePost(post.id)}
                    >
                      <Share className="h-5 w-5" />
                      Compartilhar
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
