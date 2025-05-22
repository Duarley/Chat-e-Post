import { Loader2 } from "lucide-react"

export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen w-full bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  )
}
