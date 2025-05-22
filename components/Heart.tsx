import { Heart } from "lucide-react"

export default function HeartIcon({ filled = false, className = "" }) {
  return <Heart className={`h-5 w-5 ${filled ? "fill-current" : ""} ${className}`} />
}
