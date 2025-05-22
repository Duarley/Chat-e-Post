"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
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
  setDoc,
  limit,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage, auth } from "../../firebase/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Send, Paperclip, Mic, StopCircle, Loader2, File, ImageIcon, AlertTriangle } from "lucide-react"
import { sanitizeInput, validateFileType, validateFileSize } from "../../utils/security"
import LoadingScreen from "@/components/LoadingScreen"
import Navbar from "@/components/Navbar"
import BottomNav from "@/components/BottomNav"

interface User {
  uid: string
  displayName: string
  photoURL: string | null
  followers?: string[]
  following?: string[]
}

interface Message {
  id: string
  text?: string
  fileUrl?: string
  fileType?: string
  fileName?: string
  senderId: string
  createdAt: any
}

// Tamanho máximo permitido de arquivo em MB
const MAX_FILE_SIZE_MB = 5
// Tipos de arquivo permitidos
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "application/pdf",
]

export default function ChatRoom() {
  const router = useRouter()
  const { id } = router.query
  const [otherUser, setOtherUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [canChat, setCanChat] = useState(false)
  const { toast } = useToast()
  const currentUser = auth.currentUser
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!currentUser || !id) return

    const fetchChatRoom = async () => {
      try {
        // Verificar se a sala de chat existe
        const roomDoc = await getDoc(doc(db, "chatRooms", id as string))

        if (!roomDoc.exists()) {
          // Extrair IDs de usuário do ID da sala de chat
          const [user1Id, user2Id] = (id as string).split("_")

          // Verificar se o usuário atual é um dos participantes
          if (user1Id !== currentUser.uid && user2Id !== currentUser.uid) {
            router.push("/chat")
            return
          }

          // Obter o ID do outro usuário
          const otherUserId = user1Id === currentUser.uid ? user2Id : user1Id

          // Buscar dados do outro usuário
          const otherUserDoc = await getDoc(doc(db, "users", otherUserId))

          if (!otherUserDoc.exists()) {
            router.push("/chat")
            return
          }

          const otherUserData = otherUserDoc.data() as User
          setOtherUser(otherUserData)

          // Verificar se ambos se seguem mutuamente
          const currentUserDoc = await getDoc(doc(db, "users", currentUser.uid))
          const currentUserData = currentUserDoc.data() as User

          const isFollowingOther = currentUserData.following?.includes(otherUserId) || false
          const isFollowedByOther = otherUserData.following?.includes(currentUser.uid) || false

          const isMutualFollow = isFollowingOther && isFollowedByOther
          setCanChat(isMutualFollow)

          if (!isMutualFollow) {
            setLoading(false)
            return
          }

          // Criar a sala de chat
          await setDoc(doc(db, "chatRooms", id as string), {
            participants: [currentUser.uid, otherUserId],
            createdAt: serverTimestamp(),
            lastMessage: "",
            lastMessageTime: serverTimestamp(),
          })
        } else {
          // Obter o outro participante
          const participants = roomDoc.data().participants
          const otherUserId = participants.find((uid: string) => uid !== currentUser.uid)

          // Buscar dados do outro usuário
          const otherUserDoc = await getDoc(doc(db, "users", otherUserId))

          if (otherUserDoc.exists()) {
            const otherUserData = otherUserDoc.data() as User
            setOtherUser(otherUserData)

            // Verificar se ambos se seguem mutuamente
            const currentUserDoc = await getDoc(doc(db, "users", currentUser.uid))
            const currentUserData = currentUserDoc.data() as User

            const isFollowingOther = currentUserData.following?.includes(otherUserId) || false
            const isFollowedByOther = otherUserData.following?.includes(currentUser.uid) || false

            const isMutualFollow = isFollowingOther && isFollowedByOther
            setCanChat(isMutualFollow)
          }
        }

        setLoading(false)
      } catch (error) {
        console.error("Erro ao configurar sala de chat:", error)
        router.push("/chat")
      }
    }

    fetchChatRoom()
  }, [currentUser, id, router])

  useEffect(() => {
    if (!id || !canChat) return

    // Limitar a 100 mensagens para desempenho
    const q = query(collection(db, "chatRooms", id as string, "messages"), orderBy("createdAt", "desc"), limit(100))

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData: Message[] = []
      querySnapshot.forEach((doc) => {
        messagesData.push({ id: doc.id, ...doc.data() } as Message)
      })
      // Inverter para mostrar em ordem cronológica
      setMessages(messagesData.reverse())

      // Rolar para o final quando novas mensagens chegarem
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    })

    return () => unsubscribe()
  }, [id, canChat])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser || !id || !canChat || (!newMessage.trim() && !file && !audioURL)) return

    setSending(true)
    try {
      let fileUrl = ""
      let fileType = ""
      let fileName = ""

      // Lidar com upload de arquivo
      if (file) {
        // Validar tipo e tamanho do arquivo
        if (!validateFileType(file, ALLOWED_FILE_TYPES)) {
          setFileError("Tipo de arquivo não permitido")
          setSending(false)
          return
        }

        if (!validateFileSize(file, MAX_FILE_SIZE_MB)) {
          setFileError(`Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE_MB}MB`)
          setSending(false)
          return
        }

        // Gerar um nome de arquivo seguro
        const secureFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
        const storageRef = ref(storage, `chats/${id}/${secureFileName}`)
        await uploadBytes(storageRef, file)
        fileUrl = await getDownloadURL(storageRef)
        fileType = file.type
        fileName = file.name
      }

      // Lidar com upload de áudio
      if (audioURL && !file) {
        const response = await fetch(audioURL)
        const audioBlob = await response.blob()
        const storageRef = ref(storage, `chats/${id}/audio_${Date.now()}.webm`)
        await uploadBytes(storageRef, audioBlob)
        fileUrl = await getDownloadURL(storageRef)
        fileType = "audio/webm"
        fileName = "Mensagem de voz"
      }

      // Sanitizar texto da mensagem
      const sanitizedMessage = newMessage.trim() ? sanitizeInput(newMessage.trim()) : null

      // Adicionar mensagem à sala de chat
      await addDoc(collection(db, "chatRooms", id as string, "messages"), {
        text: sanitizedMessage,
        fileUrl: fileUrl || null,
        fileType: fileType || null,
        fileName: fileName || null,
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
      })

      // Atualizar sala de chat com última mensagem
      await updateDoc(doc(db, "chatRooms", id as string), {
        lastMessage: sanitizedMessage || fileName || "Enviou um arquivo",
        lastMessageTime: serverTimestamp(),
      })

      setNewMessage("")
      setFile(null)
      setFileError(null)
      setAudioURL(null)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar mensagem",
        description: "Falha ao enviar mensagem. Por favor, tente novamente.",
      })
      console.error("Erro ao enviar mensagem:", error)
    } finally {
      setSending(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]

      // Validar tipo de arquivo
      if (!validateFileType(selectedFile, ALLOWED_FILE_TYPES)) {
        setFileError(
          `Tipo de arquivo não permitido. Tipos permitidos: ${ALLOWED_FILE_TYPES.map((type) => type.split("/")[1]).join(", ")}`,
        )
        return
      }

      // Validar tamanho do arquivo
      if (!validateFileSize(selectedFile, MAX_FILE_SIZE_MB)) {
        setFileError(`Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE_MB}MB`)
        return
      }

      setFile(selectedFile)
      setFileError(null)
      // Limpar áudio se um arquivo for selecionado
      setAudioURL(null)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })

        // Validar tamanho do áudio
        if (audioBlob.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          setFileError(`Áudio muito grande. Tamanho máximo: ${MAX_FILE_SIZE_MB}MB`)
          return
        }

        const url = URL.createObjectURL(audioBlob)
        setAudioURL(url)

        // Parar todas as faixas
        stream.getTracks().forEach((track) => track.stop())

        // Limpar temporizador de gravação
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }

      // Iniciar gravação
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Iniciar temporizador
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      // Limpar arquivo se estiver gravando
      setFile(null)
      setFileError(null)
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error)
      toast({
        variant: "destructive",
        title: "Erro de gravação",
        description: "Não foi possível acessar o microfone. Verifique as permissões.",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setAudioURL(null)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return ""
    const date = timestamp.toDate()
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return <ImageIcon className="h-5 w-5" />
    } else if (fileType.startsWith("audio/")) {
      return <Mic className="h-5 w-5" />
    } else {
      return <File className="h-5 w-5" />
    }
  }

  if (loading) {
    return <LoadingScreen />
  }

  if (!canChat) {
    return (
      <div className="min-h-screen bg-background pb-16">
        <Navbar />
        <div className="border-b bg-background p-3 flex items-center">
          <Button variant="ghost" size="icon" asChild className="mr-2">
            <Link href="/chat">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          {otherUser && (
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={otherUser.photoURL || undefined} alt={otherUser.displayName} />
                <AvatarFallback>{getInitials(otherUser.displayName)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{otherUser.displayName}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] p-4 text-center">
          <h2 className="text-xl font-bold mb-2">Não é possível iniciar uma conversa</h2>
          <p className="text-muted-foreground mb-4">
            Você só pode conversar com usuários que seguem você e que você segue de volta.
          </p>
          <Link href={`/profile/${otherUser?.uid}`}>
            <Button>Ver perfil</Button>
          </Link>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">
      <Navbar />
      <div className="border-b bg-background p-3 flex items-center">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href="/chat">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        {otherUser && (
          <Link href={`/profile/${otherUser.uid}`} className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={otherUser.photoURL || undefined} alt={otherUser.displayName} />
              <AvatarFallback>{getInitials(otherUser.displayName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{otherUser.displayName}</p>
            </div>
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma mensagem ainda. Comece a conversa!</div>
          ) : (
            messages.map((message) => {
              const isSentByMe = message.senderId === currentUser?.uid

              return (
                <div key={message.id} className={`flex ${isSentByMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      isSentByMe ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {message.text && <p className="whitespace-pre-line mb-1">{message.text}</p>}

                    {message.fileUrl && message.fileType?.startsWith("image/") && (
                      <img
                        src={message.fileUrl || "/placeholder.svg"}
                        alt="Imagem"
                        className="rounded-md max-w-full max-h-[300px] object-contain mb-1"
                      />
                    )}

                    {message.fileUrl && message.fileType?.startsWith("audio/") && (
                      <audio controls className="max-w-full mb-1" controlsList="nodownload">
                        <source src={message.fileUrl} type={message.fileType} />
                        Seu navegador não suporta o elemento de áudio.
                      </audio>
                    )}

                    {message.fileUrl &&
                      !message.fileType?.startsWith("image/") &&
                      !message.fileType?.startsWith("audio/") && (
                        <a
                          href={message.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm underline mb-1"
                        >
                          {getFileIcon(message.fileType || "")}
                          {message.fileName || "Baixar arquivo"}
                        </a>
                      )}

                    <div className={`text-xs ${isSentByMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {formatMessageTime(message.createdAt)}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t bg-background p-3">
        <div className="max-w-2xl mx-auto">
          {file && (
            <div className="mb-2 p-2 bg-muted rounded-md flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {file.type.startsWith("image/") ? <ImageIcon className="h-4 w-4" /> : <File className="h-4 w-4" />}
                <span className="truncate max-w-[200px]">{file.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="h-6 w-6 p-0">
                &times;
              </Button>
            </div>
          )}

          {fileError && (
            <div className="mb-2 p-2 bg-destructive/10 text-destructive rounded-md flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <span className="text-sm">{fileError}</span>
              <Button variant="ghost" size="sm" onClick={() => setFileError(null)} className="h-6 w-6 p-0 ml-auto">
                &times;
              </Button>
            </div>
          )}

          {audioURL && !file && (
            <div className="mb-2 p-2 bg-muted rounded-md flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Mic className="h-4 w-4" />
                <span>Mensagem de voz</span>
                <audio controls className="h-8" controlsList="nodownload">
                  <source src={audioURL} type="audio/webm" />
                </audio>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setAudioURL(null)} className="h-6 w-6 p-0">
                &times;
              </Button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            {isRecording ? (
              <div className="flex-1 flex items-center gap-2 bg-muted rounded-md p-2">
                <div className="animate-pulse">
                  <Mic className="h-5 w-5 text-destructive" />
                </div>
                <span className="text-sm">Gravando... {formatTime(recordingTime)}</span>
                <div className="flex-1" />
                <Button type="button" variant="ghost" size="icon" onClick={stopRecording} className="h-8 w-8">
                  <StopCircle className="h-5 w-5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={cancelRecording} className="h-8 w-8">
                  &times;
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    placeholder="Digite uma mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                    className="pr-10"
                    maxLength={2000} // Limitar comprimento da mensagem
                  />
                  <label htmlFor="file-upload" className="absolute right-2 top-2 cursor-pointer">
                    <Paperclip className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                    <input
                      id="file-upload"
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={sending}
                      accept={ALLOWED_FILE_TYPES.join(",")}
                    />
                  </label>
                </div>

                <Button type="button" variant="ghost" size="icon" onClick={startRecording} disabled={sending}>
                  <Mic className="h-5 w-5" />
                </Button>

                <Button type="submit" disabled={sending || (!newMessage.trim() && !file && !audioURL)}>
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </>
            )}
          </form>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
