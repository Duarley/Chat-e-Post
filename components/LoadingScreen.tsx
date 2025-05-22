import { Loader2 } from "lucide-react"

export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg font-medium text-muted-foreground">Carregando...</p>
    </div>
  )
}
