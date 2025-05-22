"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
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
import { db, storage, auth } from "../firebase/security-config"
import Navbar from "../components/Navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Send, Paperclip, Mic, StopCircle, Loader2, File, ImageIcon, AlertTriangle } from "lucide-react"
import { Link } from "react-router-dom"
import { sanitizeInput, validateFileType, validateFileSize } from "../utils/security"

interface User {
  uid: string
  displayName: string
  photoURL: string | null
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

// Maximum allowed file size in MB
const MAX_FILE_SIZE_MB = 5
// Allowed file types
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
  const { id } = useParams<{ id: string }>()
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
  const { toast } = useToast()
  const navigate = useNavigate()
  const currentUser = auth.currentUser
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!currentUser || !id) return

    const fetchChatRoom = async () => {
      try {
        // Check if chat room exists
        const roomDoc = await getDoc(doc(db, "chatRooms", id))

        if (!roomDoc.exists()) {
          // Extract user IDs from the chat room ID
          const [user1Id, user2Id] = id.split("_")

          // Verify that current user is one of the participants
          if (user1Id !== currentUser.uid && user2Id !== currentUser.uid) {
            navigate("/chat")
            return
          }

          // Get the other user ID
          const otherUserId = user1Id === currentUser.uid ? user2Id : user1Id

          // Fetch other user data
          const otherUserDoc = await getDoc(doc(db, "users", otherUserId))

          if (!otherUserDoc.exists()) {
            navigate("/chat")
            return
          }

          setOtherUser(otherUserDoc.data() as User)

          // Create the chat room
          await setDoc(doc(db, "chatRooms", id), {
            participants: [currentUser.uid, otherUserId],
            createdAt: serverTimestamp(),
            lastMessage: "",
            lastMessageTime: serverTimestamp(),
          })
        } else {
          // Get the other participant
          const participants = roomDoc.data().participants
          const otherUserId = participants.find((uid: string) => uid !== currentUser.uid)

          // Fetch other user data
          const otherUserDoc = await getDoc(doc(db, "users", otherUserId))

          if (otherUserDoc.exists()) {
            setOtherUser(otherUserDoc.data() as User)
          }
        }

        setLoading(false)
      } catch (error) {
        console.error("Error setting up chat room:", error)
        navigate("/chat")
      }
    }

    fetchChatRoom()
  }, [currentUser, id, navigate])

  useEffect(() => {
    if (!id) return

    // Limit to last 100 messages for performance
    const q = query(collection(db, "chatRooms", id, "messages"), orderBy("createdAt", "desc"), limit(100))

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData: Message[] = []
      querySnapshot.forEach((doc) => {
        messagesData.push({ id: doc.id, ...doc.data() } as Message)
      })
      // Reverse to show in chronological order
      setMessages(messagesData.reverse())

      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    })

    return () => unsubscribe()
  }, [id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser || !id || (!newMessage.trim() && !file && !audioURL)) return

    setSending(true)
    try {
      let fileUrl = ""
      let fileType = ""
      let fileName = ""

      // Handle file upload
      if (file) {
        // Validate file type and size
        if (!validateFileType(file, ALLOWED_FILE_TYPES)) {
          setFileError("File type not allowed")
          setSending(false)
          return
        }

        if (!validateFileSize(file, MAX_FILE_SIZE_MB)) {
          setFileError(`File too large. Maximum size: ${MAX_FILE_SIZE_MB}MB`)
          setSending(false)
          return
        }

        // Generate a secure filename
        const secureFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
        const storageRef = ref(storage, `chats/${id}/${secureFileName}`)
        await uploadBytes(storageRef, file)
        fileUrl = await getDownloadURL(storageRef)
        fileType = file.type
        fileName = file.name
      }

      // Handle audio upload
      if (audioURL && !file) {
        const response = await fetch(audioURL)
        const audioBlob = await response.blob()
        const storageRef = ref(storage, `chats/${id}/audio_${Date.now()}.webm`)
        await uploadBytes(storageRef, audioBlob)
        fileUrl = await getDownloadURL(storageRef)
        fileType = "audio/webm"
        fileName = "Voice message"
      }

      // Sanitize message text
      const sanitizedMessage = newMessage.trim() ? sanitizeInput(newMessage.trim()) : null

      // Add message to the chat room
      await addDoc(collection(db, "chatRooms", id, "messages"), {
        text: sanitizedMessage,
        fileUrl: fileUrl || null,
        fileType: fileType || null,
        fileName: fileName || null,
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
      })

      // Update chat room with last message
      await updateDoc(doc(db, "chatRooms", id), {
        lastMessage: sanitizedMessage || fileName || "Sent a file",
        lastMessageTime: serverTimestamp(),
      })

      setNewMessage("")
      setFile(null)
      setFileError(null)
      setAudioURL(null)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error sending message",
        description: "Failed to send message. Please try again.",
      })
      console.error("Error sending message:", error)
    } finally {
      setSending(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]

      // Validate file type
      if (!validateFileType(selectedFile, ALLOWED_FILE_TYPES)) {
        setFileError(
          `File type not allowed. Allowed types: ${ALLOWED_FILE_TYPES.map((type) => type.split("/")[1]).join(", ")}`,
        )
        return
      }

      // Validate file size
      if (!validateFileSize(selectedFile, MAX_FILE_SIZE_MB)) {
        setFileError(`File too large. Maximum size: ${MAX_FILE_SIZE_MB}MB`)
        return
      }

      setFile(selectedFile)
      setFileError(null)
      // Clear audio if a file is selected
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

        // Validate audio size
        if (audioBlob.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          setFileError(`Audio too large. Maximum size: ${MAX_FILE_SIZE_MB}MB`)
          return
        }

        const url = URL.createObjectURL(audioBlob)
        setAudioURL(url)

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())

        // Clear recording timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }

      // Start recording
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      // Clear file if recording
      setFile(null)
      setFileError(null)
    } catch (error) {
      console.error("Error starting recording:", error)
      toast({
        variant: "destructive",
        title: "Recording error",
        description: "Could not access microphone. Please check permissions.",
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
    return new Intl.DateTimeFormat("en-US", {
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
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="border-b bg-background p-3 flex items-center">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link to="/chat">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        {otherUser && (
          <Link to={`/profile/${otherUser.uid}`} className="flex items-center gap-3">
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
            <div className="text-center py-8 text-muted-foreground">No messages yet. Start the conversation!</div>
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
                        alt="Image"
                        className="rounded-md max-w-full max-h-[300px] object-contain mb-1"
                      />
                    )}

                    {message.fileUrl && message.fileType?.startsWith("audio/") && (
                      <audio controls className="max-w-full mb-1" controlsList="nodownload">
                        <source src={message.fileUrl} type={message.fileType} />
                        Your browser does not support the audio element.
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
                          {message.fileName || "Download file"}
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
                <span>Voice message</span>
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
                <span className="text-sm">Recording... {formatTime(recordingTime)}</span>
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
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                    className="pr-10"
                    maxLength={2000} // Limit message length
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
    </div>
  )
}
