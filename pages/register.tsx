"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/router"
import { createUserWithEmailAndPassword, updateProfile, browserSessionPersistence, setPersistence } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { auth, db } from "@/firebase/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Mail, Lock, User, UserPlus, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { sanitizeInput } from "@/utils/security"

export default function Register() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [passwordFeedback, setPasswordFeedback] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Verificar força da senha
  const checkPasswordStrength = (password: string) => {
    let strength = 0
    let feedback = ""

    if (password.length >= 8) strength += 1
    if (password.match(/[A-Z]/)) strength += 1
    if (password.match(/[0-9]/)) strength += 1
    if (password.match(/[^A-Za-z0-9]/)) strength += 1

    if (strength === 0) feedback = "Senha muito fraca"
    else if (strength === 1) feedback = "Senha fraca"
    else if (strength === 2) feedback = "Senha moderada"
    else if (strength === 3) feedback = "Senha forte"
    else feedback = "Senha muito forte"

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

    // Validar entradas
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Senhas não coincidem",
        description: "Por favor, certifique-se de que suas senhas coincidem.",
      })
      return
    }

    if (passwordStrength < 3) {
      toast({
        variant: "destructive",
        title: "Senha muito fraca",
        description:
          "Por favor, use uma senha mais forte com pelo menos 8 caracteres, incluindo maiúsculas, números e caracteres especiais.",
      })
      return
    }

    // Sanitizar entradas
    const sanitizedName = sanitizeInput(name.trim())
    const sanitizedEmail = sanitizeInput(email.trim())

    setLoading(true)

    try {
      // Usar persistência de sessão para melhor segurança
      await setPersistence(auth, browserSessionPersistence)

      // Criar usuário com email e senha
      const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password)
      const user = userCredential.user

      // Atualizar perfil com nome de exibição
      await updateProfile(user, {
        displayName: sanitizedName,
      })

      // Criar documento de usuário no Firestore com medidas de segurança
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: sanitizedName,
        email: sanitizedEmail,
        photoURL: user.photoURL || null,
        createdAt: new Date(),
        lastLogin: new Date(),
        accountType: "email",
        securityLevel: "standard",
        followers: [],
        following: [],
      })

      router.push("/")
    } catch (error: any) {
      let errorMessage = "Falha no registro. Por favor, tente novamente."

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Este email já está registrado. Por favor, use um email diferente ou tente fazer login."
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Endereço de email inválido. Por favor, verifique e tente novamente."
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Senha muito fraca. Por favor, use uma senha mais forte."
      }

      toast({
        variant: "destructive",
        title: "Falha no registro",
        description: errorMessage,
      })
    } finally {
      setLoading(false)
      setPassword("") // Limpar campo de senha por segurança
      setConfirmPassword("") // Limpar campo de confirmação de senha por segurança
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Criar uma conta</CardTitle>
          <CardDescription className="text-center">Digite suas informações para criar uma conta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Nome"
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
                  placeholder="Senha"
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
                  placeholder="Confirmar Senha"
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
                  Senhas não coincidem
                </div>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Registrar
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
