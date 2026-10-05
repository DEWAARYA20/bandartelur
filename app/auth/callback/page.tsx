"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      if (!isSupabaseConfigured || !supabase) {
        router.push("/login")
        return
      }

      try {
        // Get the session after redirect from email confirmation
        const {
          data: { session },
        } = await supabase.auth.getSession()

        console.log("[v0] Auth callback - session:", session?.user?.email)

        if (session) {
          router.push("/dashboard")
        } else {
          router.push("/login")
        }
      } catch (error) {
        console.error("[v0] Auth callback error:", error)
        router.push("/login")
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Mengkonfirmasi email...</h1>
        <p className="text-gray-600">Tunggu sebentar...</p>
      </div>
    </div>
  )
}
