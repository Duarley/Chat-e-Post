"use client"

import type React from "react"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { createUserWithEmailAndPassword, updateProfile, browserSessionPersistence, setPersistence } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { auth, db } from "../firebase/security-config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Mail, Lock, User, UserPlus, Loader2, Shield, AlertCircle } from "lucide-react"
import { sanitizeInput } from "../utils/security"

export default function Register() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [passwordFeedback, setPasswordFeedback] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  // Check password strength
  const checkPasswordStrength = (password: string) => {
    let strength = 0
    let feedback = ""

    if (password.length >= 8) strength += 1
    if (password.match(/[A-Z]/)) strength += 1
    if (password.match(/[0-9]/)) strength += 1
    if (password.match(/[^A-Za-z0-9]/)) strength += 1

    if (strength === 0) feedback = "Password is too weak"
    else if (strength === 1) feedback = "Password is weak"
    else if (strength === 2) feedback = "Password is moderate"
    else if (strength === 3) feedback = "Password is strong"
    else feedback = "Password is very strong"

    setPasswordStrength(strength)
    setPasswordFeedback(feedback)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value
    setPassword(newPassword)
    checkPasswordStrength(newPassword)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate inputs
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
      })
      return
    }

    if (passwordStrength < 3) {
      toast({
        variant: "destructive",
        title: "Password too weak",
        description:
          "Please use a stronger password with at least 8 characters, including uppercase, numbers, and special characters.",
      })
      return
    }

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name.trim())
    const sanitizedEmail = sanitizeInput(email.trim())

    setLoading(true)

    try {
      // Use session persistence for better security
      await setPersistence(auth, browserSessionPersistence)

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password)
      const user = userCredential.user

      // Update profile with display name
      await updateProfile(user, {
        displayName: sanitizedName,
      })

      // Create user document in Firestore with security measures
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: sanitizedName,
        email: sanitizedEmail,
        photoURL: user.photoURL || null,
        createdAt: new Date(),
        lastLogin: new Date(),
        accountType: "email",
        securityLevel: "standard",
      })

      // Log successful registration for security auditing
      console.log(`New user registered: ${sanitizedEmail} at ${new Date().toISOString()}`)

      navigate("/")
    } catch (error: any) {
      console.error(`Registration failed: ${sanitizedEmail} at ${new Date().toISOString()}`)

      let errorMessage = "Registration failed. Please try again."

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Please use a different email or try logging in."
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address. Please check and try again."
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password."
      }

      toast({
        variant: "destructive",
        title: "Registration failed",
        description: errorMessage,
      })
    } finally {
      setLoading(false)
      setPassword("") // Clear password field for security
      setConfirmPassword("") // Clear confirm password field for security
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Create a secure account</CardTitle>
          <CardDescription className="text-center">Enter your information to create an account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  required
                  maxLength={50}
                />
              </div>
            </div>
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
                  onChange={handlePasswordChange}
                  className="pl-10"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              {password && (
                <div className="mt-1">
                  <div className="flex gap-1 mb-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full ${
                          i < passwordStrength
                            ? passwordStrength === 1
                              ? "bg-red-500"
                              : passwordStrength === 2
                                ? "bg-yellow-500"
                                : passwordStrength === 3
                                  ? "bg-green-500"
                                  : "bg-green-600"
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p
                    className={`text-xs ${
                      passwordStrength <= 1
                        ? "text-red-500"
                        : passwordStrength === 2
                          ? "text-yellow-500"
                          : "text-green-500"
                    }`}
                  >
                    {passwordFeedback}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-10 ${confirmPassword && password !== confirmPassword ? "border-red-500" : ""}`}
                  required
                  autoComplete="new-password"
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <div className="flex items-center text-red-500 text-xs mt-1">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Passwords don't match
                </div>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Register
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
