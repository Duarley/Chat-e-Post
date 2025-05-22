"use client"

import type React from "react"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { signInWithEmailAndPassword, signInWithPopup, browserSessionPersistence, setPersistence } from "firebase/auth"
import { auth, googleProvider } from "../firebase/security-config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Mail, Lock, LogIn, Loader2, Shield } from "lucide-react"
import { sanitizeInput } from "../utils/security"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  // Check if account is locked
  const checkLockStatus = () => {
    const lockUntil = localStorage.getItem("account_lock_until")
    if (lockUntil) {
      const lockTime = Number.parseInt(lockUntil, 10)
      if (Date.now() < lockTime) {
        const minutesLeft = Math.ceil((lockTime - Date.now()) / (60 * 1000))
        setIsLocked(true)
        toast({
          variant: "destructive",
          title: "Account temporarily locked",
          description: `Too many failed attempts. Try again in ${minutesLeft} minutes.`,
        })
        return true
      } else {
        localStorage.removeItem("account_lock_until")
        setLoginAttempts(0)
        setIsLocked(false)
      }
    }
    return false
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check if account is locked
    if (checkLockStatus()) return

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email.trim())

    setLoading(true)

    try {
      // Use session persistence for better security
      await setPersistence(auth, browserSessionPersistence)

      await signInWithEmailAndPassword(auth, sanitizedEmail, password)

      // Reset login attempts on success
      setLoginAttempts(0)
      localStorage.removeItem("login_attempts")

      // Log successful login for security auditing
      console.log(`Successful login: ${sanitizedEmail} at ${new Date().toISOString()}`)

      navigate("/")
    } catch (error: any) {
      console.error(`Failed login attempt: ${sanitizedEmail} at ${new Date().toISOString()}`)

      // Increment login attempts
      const newAttempts = loginAttempts + 1
      setLoginAttempts(newAttempts)

      // Lock account after 5 failed attempts
      if (newAttempts >= 5) {
        const lockUntil = Date.now() + 30 * 60 * 1000 // Lock for 30 minutes
        localStorage.setItem("account_lock_until", lockUntil.toString())
        setIsLocked(true)

        toast({
          variant: "destructive",
          title: "Account temporarily locked",
          description: "Too many failed attempts. Try again in 30 minutes.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: "Invalid email or password. Please try again.",
        })
      }
    } finally {
      setLoading(false)
      setPassword("") // Clear password field for security
    }
  }

  const handleGoogleLogin = async () => {
    // Check if account is locked
    if (checkLockStatus()) return

    setLoading(true)

    try {
      // Use session persistence for better security
      await setPersistence(auth, browserSessionPersistence)

      await signInWithPopup(auth, googleProvider)

      // Reset login attempts on success
      setLoginAttempts(0)
      localStorage.removeItem("login_attempts")

      navigate("/")
    } catch (error: any) {
      console.error(`Failed Google login attempt at ${new Date().toISOString()}`)

      toast({
        variant: "destructive",
        title: "Google login failed",
        description: "Could not sign in with Google. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Secure Login</CardTitle>
          <CardDescription className="text-center">Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLocked || loading}
                  autoComplete="username"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLocked || loading}
                  autoComplete="current-password"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLocked || loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              Login
            </Button>
          </form>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isLocked || loading}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            Google
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Register
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
