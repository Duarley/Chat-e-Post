"use client"

import Link from "next/link"
import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { updateProfile } from "firebase/auth"
import { db, storage, auth } from "../../firebase/config"
import Navbar from "../../components/Navbar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Camera, Loader2, UserPlus, UserCheck, MessageSquare, MoreHorizontal, Trash2 } from "lucide-react"
import LoadingScreen from "@/components/LoadingScreen"
import BottomNav from "@/components/BottomNav"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface User {
  uid: string
  displayName: string
  email: string
  photoURL: string | null
  createdAt: any
  followers?: string[]
  following?: string[]
}

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

export default function Profile() {
  const router = useRouter()
  const { id } = router.query
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const { toast } = useToast()
  const currentUser = auth.currentUser
  const isOwnProfile = currentUser?.uid === id

  useEffect(() => {
    if (!id || !currentUser) return

    const fetchUser = async () => {
      try {
        // Verificar se o usuário existe no Firestore
        const userDoc = await getDoc(doc(db, "users", id as string))

        if (userDoc.exists()) {
          // Se o documento existir, usar os dados
          const userData = userDoc.data() as User
          setUser(userData)
          setFollowerCount(userData.followers?.length || 0)
          setFollowingCount(userData.following?.length || 0)

          // Verificar se o usuário atual está seguindo este perfil
          if (userData.followers) {
            setIsFollowing(userData.followers.includes(currentUser.uid))
          }
        } else if (id === currentUser.uid) {
          // Se for o próprio usuário e o documento não existir, criar um novo
          const newUserData = {
            uid: currentUser.uid,
            displayName: currentUser.displayName || "Usuário",
            email: currentUser.email || "",
            photoURL: currentUser.photoURL,
            createdAt: new Date(),
            followers: [],
            following: [],
          }

          await updateDoc(doc(db, "users", currentUser.uid), newUserData)
          setUser(newUserData)
        } else {
          // Se o usuário não existir e não for o próprio usuário
          console.error("Usuário não encontrado")
        }
      } catch (error) {
        console.error("Erro ao buscar usuário:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [id, currentUser])

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

      // Atualizar perfil de autenticação
      await updateProfile(currentUser, { photoURL })

      // Atualizar documento do usuário
      await updateDoc(doc(db, "users", currentUser.uid), { photoURL })

      // Atualizar estado local
      setUser((prev) => (prev ? { ...prev, photoURL } : null))

      toast({
        title: "Perfil atualizado",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar perfil",
        description: error.message,
      })
    } finally {
      setUploading(false)
    }
  }

  const handleFollow = async () => {
    if (!currentUser || !id || isOwnProfile) return

    try {
      const currentUserRef = doc(db, "users", currentUser.uid)
      const targetUserRef = doc(db, "users", id as string)

      if (isFollowing) {
        // Deixar de seguir
        await updateDoc(currentUserRef, {
          following: arrayRemove(id),
        })

        await updateDoc(targetUserRef, {
          followers: arrayRemove(currentUser.uid),
        })

        setIsFollowing(false)
        setFollowerCount((prev) => prev - 1)
      } else {
        // Seguir
        await updateDoc(currentUserRef, {
          following: arrayUnion(id),
        })

        await updateDoc(targetUserRef, {
          followers: arrayUnion(currentUser.uid),
        })

        setIsFollowing(true)
        setFollowerCount((prev) => prev + 1)
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
    if (!currentUser) return

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

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Usuário não encontrado</h1>
          <p>O usuário que você está procurando não existe ou foi excluído.</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            Voltar para a página inicial
          </Button>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Cabeçalho do perfil estilo Instagram */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
          <div className="relative">
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

          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
              <h1 className="text-xl font-bold">{user.displayName}</h1>
              {!isOwnProfile && (
                <Button variant={isFollowing ? "outline" : "default"} size="sm" onClick={handleFollow}>
                  {isFollowing ? (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Seguindo
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Seguir
                    </>
                  )}
                </Button>
              )}
              {!isOwnProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/chat/${[currentUser?.uid, user.uid].sort().join("_")}`)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Mensagem
                </Button>
              )}
            </div>

            <div className="flex justify-center md:justify-start space-x-6 mb-4">
              <div className="text-center">
                <p className="font-bold">{posts.length}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </div>
              <div className="text-center">
                <p className="font-bold">{followerCount}</p>
                <p className="text-xs text-muted-foreground">Seguidores</p>
              </div>
              <div className="text-center">
                <p className="font-bold">{followingCount}</p>
                <p className="text-xs text-muted-foreground">Seguindo</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {/* Grade de posts estilo Instagram */}
        <div className="border-t pt-4">
          <h2 className="text-xl font-bold mb-4">Posts</h2>

          {posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum post ainda.</div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post) => (
                <div key={post.id} className="relative aspect-square">
                  <Link href={`/post/${post.id}`}>
                    <div className="w-full h-full bg-muted flex items-center justify-center overflow-hidden">
                      <div className={`p-2 w-full h-full flex items-center justify-center ${post.style || ""}`}>
                        <p className="line-clamp-4 text-xs">{post.text}</p>
                      </div>
                    </div>
                  </Link>
                  {isOwnProfile && (
                    <div className="absolute top-1 right-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/50 text-white">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDeletePost(post.id)} className="text-red-500">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
