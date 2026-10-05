"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react"
import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const success = await login(email, password)
    if (success) {
      console.log("[v0] Login successful, redirecting to dashboard")
      router.push("/dashboard")
    } else {
      setError("Email atau password salah")
      setIsLoading(false)
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen p-4 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 gradient-animated opacity-90" />

      {/* Decorative elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-orange-300/20 rounded-full blur-2xl animate-pulse" />

      {/* Login Card */}
      <Card className="w-full max-w-md relative z-10 glass shadow-2xl border-white/20 animate-scale-in">
        <CardHeader className="space-y-2 pb-6">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-lg shadow-orange-500/30 ring-4 ring-white/20">
              <Image
                src="/logo-bandar-telur.png"
                alt="Bandar Telur"
                fill
                className="object-cover"
              />
            </div>
          </div>
          <CardTitle className="text-2xl text-center font-bold text-gray-800">
            Selamat Datang!
          </CardTitle>
          <CardDescription className="text-center text-gray-500">
            Masuk ke akun Bandar Telur Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all bg-white/80"
                  placeholder="nama@email.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all bg-white/80"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2 animate-scale-in">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full py-6 text-base font-semibold gradient-primary hover:opacity-90 transition-all shadow-lg shadow-orange-500/25 btn-press"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Masuk...
                </span>
              ) : (
                "Masuk"
              )}
            </Button>

            {/* Info Text */}
            <div className="text-center pt-2">
              <p className="text-sm text-gray-500">
                Hubungi admin untuk mendapatkan akun
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="absolute bottom-4 text-white/70 text-sm">
        © 2025 Bandar Telur. All rights reserved.
      </p>
    </main>
  )
}
