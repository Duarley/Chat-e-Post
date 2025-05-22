import { Loader2 } from "lucide-react"

export default function SplashScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full bg-gradient-to-br from-blue-600 to-purple-700">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">DUARLEY DESENVOLVEDOR</h1>
        <div className="w-32 h-32 mx-auto mb-6 bg-white rounded-full flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-16 h-16 text-blue-600"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-white mx-auto" />
      </div>
    </div>
  )
}
