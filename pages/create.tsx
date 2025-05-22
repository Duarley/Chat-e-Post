"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { db, auth } from "@/firebase/config"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  Send,
  Loader2,
  Type,
  PaintBucket,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  X,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import LoadingScreen from "@/components/LoadingScreen"
import Navbar from "@/components/Navbar"
import BottomNav from "@/components/BottomNav"

export default function CreatePage() {
  const [newPost, setNewPost] = useState("")
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [postStyle, setPostStyle] = useState({
    fontSize: "text-base",
    fontWeight: "font-normal",
    textAlign: "text-left",
    textColor: "text-foreground",
    bgColor: "bg-transparent",
    fontStyle: "",
    textDecoration: "",
  })
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login")
        return
      }
      setInitialLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = auth.currentUser
    if (!user || !newPost.trim()) return

    setLoading(true)
    try {
      // Criar classe de estilo combinada
      const styleClasses = `${postStyle.fontSize} ${postStyle.fontWeight} ${postStyle.textAlign} ${postStyle.textColor} ${postStyle.bgColor} ${postStyle.fontStyle} ${postStyle.textDecoration}`

      await addDoc(collection(db, "posts"), {
        text: newPost.trim(),
        createdAt: serverTimestamp(),
        userId: user.uid,
        userName: user.displayName,
        userPhotoURL: user.photoURL,
        likes: [],
        comments: 0,
        style: styleClasses,
      })

      setNewPost("")
      // Resetar estilo para o padrão
      setPostStyle({
        fontSize: "text-base",
        fontWeight: "font-normal",
        textAlign: "text-left",
        textColor: "text-foreground",
        bgColor: "bg-transparent",
        fontStyle: "",
        textDecoration: "",
      })

      toast({
        title: "Post criado",
        description: "Seu post foi publicado com sucesso.",
      })

      // Redirecionar para a página inicial
      router.push("/")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar post",
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const resetPostStyle = () => {
    setPostStyle({
      fontSize: "text-base",
      fontWeight: "font-normal",
      textAlign: "text-left",
      textColor: "text-foreground",
      bgColor: "bg-transparent",
      fontStyle: "",
      textDecoration: "",
    })
  }

  if (initialLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-xl font-bold">Criar Post</h2>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent>
              <div className={`${postStyle.bgColor} p-2 rounded-md mb-2`}>
                <Textarea
                  placeholder="O que está pensando?"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className={`min-h-[100px] ${postStyle.fontSize} ${postStyle.fontWeight} ${postStyle.textAlign} ${postStyle.textColor} ${postStyle.fontStyle} ${postStyle.textDecoration} bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0`}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-4">
                {/* Tamanho da fonte */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Type className="h-4 w-4 mr-1" />
                      Tamanho
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setPostStyle({ ...postStyle, fontSize: "text-xs" })}>
                      Muito pequeno
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPostStyle({ ...postStyle, fontSize: "text-sm" })}>
                      Pequeno
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPostStyle({ ...postStyle, fontSize: "text-base" })}>
                      Normal
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPostStyle({ ...postStyle, fontSize: "text-lg" })}>
                      Grande
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPostStyle({ ...postStyle, fontSize: "text-xl" })}>
                      Muito grande
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPostStyle({ ...postStyle, fontSize: "text-2xl" })}>
                      Enorme
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Cor do texto */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <PaintBucket className="h-4 w-4 mr-1" />
                      Cor
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setPostStyle({ ...postStyle, textColor: "text-foreground" })}>
                      <div className="w-4 h-4 rounded-full bg-foreground mr-2"></div>
                      Padrão
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPostStyle({ ...postStyle, textColor: "text-red-500" })}>
                      <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
                      Vermelho
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPostStyle({ ...postStyle, textColor: "text-blue-500" })}>
                      <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
                      Azul
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPostStyle({ ...postStyle, textColor: "text-green-500" })}>
                      <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                      Verde
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPostStyle({ ...postStyle, textColor: "text-yellow-500" })}>
                      <div className="w-4 h-4 rounded-full bg-yellow-500 mr-2"></div>
                      Amarelo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPostStyle({ ...postStyle, textColor: "text-purple-500" })}>
                      <div className="w-4 h-4 rounded-full bg-purple-500 mr-2"></div>
                      Roxo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Cor de fundo */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <div className="h-4 w-4 border border-gray-300 mr-1"></div>
                      Fundo
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setPostStyle({ ...postStyle, bgColor: "bg-transparent" })}>
                      <div className="w-4 h-4 rounded-full border border-gray-300 mr-2"></div>
                      Transparente
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPostStyle({ ...postStyle, bgColor: "bg-gray-100" })}>
                      <div className="w-4 h-4 rounded-full bg-gray-100 mr-2"></div>
                      Cinza claro
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPostStyle({ ...postStyle, bgColor: "bg-red-100" })}>
                      <div className="w-4 h-4 rounded-full bg-red-100 mr-2"></div>
                      Vermelho claro
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPostStyle({ ...postStyle, bgColor: "bg-blue-100" })}>
                      <div className="w-4 h-4 rounded-full bg-blue-100 mr-2"></div>
                      Azul claro
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPostStyle({ ...postStyle, bgColor: "bg-green-100" })}>
                      <div className="w-4 h-4 rounded-full bg-green-100 mr-2"></div>
                      Verde claro
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPostStyle({ ...postStyle, bgColor: "bg-yellow-100" })}>
                      <div className="w-4 h-4 rounded-full bg-yellow-100 mr-2"></div>
                      Amarelo claro
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Alinhamento */}
                <div className="flex border rounded-md">
                  <Button
                    type="button"
                    variant={postStyle.textAlign === "text-left" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setPostStyle({ ...postStyle, textAlign: "text-left" })}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={postStyle.textAlign === "text-center" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setPostStyle({ ...postStyle, textAlign: "text-center" })}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={postStyle.textAlign === "text-right" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setPostStyle({ ...postStyle, textAlign: "text-right" })}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Formatação */}
                <div className="flex border rounded-md">
                  <Button
                    type="button"
                    variant={postStyle.fontWeight === "font-bold" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none"
                    onClick={() =>
                      setPostStyle({
                        ...postStyle,
                        fontWeight: postStyle.fontWeight === "font-bold" ? "font-normal" : "font-bold",
                      })
                    }
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={postStyle.fontStyle === "italic" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none"
                    onClick={() =>
                      setPostStyle({
                        ...postStyle,
                        fontStyle: postStyle.fontStyle === "italic" ? "" : "italic",
                      })
                    }
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={postStyle.textDecoration === "underline" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none"
                    onClick={() =>
                      setPostStyle({
                        ...postStyle,
                        textDecoration: postStyle.textDecoration === "underline" ? "" : "underline",
                      })
                    }
                  >
                    <Underline className="h-4 w-4" />
                  </Button>
                </div>

                {/* Resetar estilo */}
                <Button type="button" variant="outline" size="sm" onClick={resetPostStyle}>
                  <X className="h-4 w-4 mr-1" />
                  Resetar
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={loading || !newPost.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Publicar
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
      <BottomNav />
    </div>
  )
}
