"use client"

import Link from "next/link"
import { useRouter } from "next/router"
import { Home, Search, PlusSquare } from "lucide-react"
import { auth } from "@/firebase/config"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function BottomNav() {
  const router = useRouter()
  const currentUser = auth.currentUser

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t py-2 px-4 z-50">
      <div className="container mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <Link href="/">
            <div
              className={`flex flex-col items-center ${router.pathname === "/" ? "text-primary" : "text-muted-foreground"}`}
            >
              <Home className="h-6 w-6" />
            </div>
          </Link>

          <Link href="/search">
            <div
              className={`flex flex-col items-center ${router.pathname === "/search" ? "text-primary" : "text-muted-foreground"}`}
            >
              <Search className="h-6 w-6" />
            </div>
          </Link>

          <Link href="/create">
            <div
              className={`flex flex-col items-center ${router.pathname === "/create" ? "text-primary" : "text-muted-foreground"}`}
            >
              <PlusSquare className="h-6 w-6" />
            </div>
          </Link>

          {currentUser && (
            <Link href={`/profile/${currentUser.uid}`}>
              <div
                className={`flex flex-col items-center ${router.pathname.startsWith("/profile") && router.query.id === currentUser.uid ? "text-primary" : "text-muted-foreground"}`}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || "Usuário"} />
                  <AvatarFallback>
                    {currentUser.displayName ? getInitials(currentUser.displayName) : "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
