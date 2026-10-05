"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "karyawan"
  cabangId?: string
  cabangName?: string
  accessPages: string[]
  createdAt: string
}

// Available pages for access control - matches sidebar menu items
export const AVAILABLE_PAGES = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "egg-sales", label: "Penjualan Telur", href: "/egg-sales" },
  { key: "martabak-sales", label: "Penjualan Martabak", href: "/martabak-sales" },
  { key: "financial", label: "Laporan Keuangan", href: "/financial" },
  { key: "admin", label: "Admin Panel", href: "/admin" },
] as const

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const storedUser = localStorage.getItem("auth_user")
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          // Verify user still exists in database
          if (supabase) {
            const { data, error } = await supabase
              .from("users")
              .select("id, email, full_name, role, cabang_id, cabang:cabang_id(name), access_pages, created_at")
              .eq("id", parsedUser.id)
              .single()

            if (data && !error) {
              setUser({
                id: data.id,
                name: data.full_name,
                email: data.email,
                role: data.role as "admin" | "karyawan",
                cabangId: data.cabang_id || undefined,
                cabangName: (data.cabang as any)?.name || undefined,
                accessPages: data.access_pages || ["dashboard"],
                createdAt: data.created_at,
              })
            } else {
              localStorage.removeItem("auth_user")
            }
          } else {
            setUser(parsedUser)
          }
        } catch (error) {
          console.error("[v0] Failed to parse user data:", error)
          localStorage.removeItem("auth_user")
        }
      }
    } catch (error) {
      console.error("[v0] Error loading user:", error)
    } finally {
      setLoading(false)
    }
  }

  const login = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      console.error("[v0] Supabase not configured")
      return false
    }

    try {
      // Get user from database with cabang info
      const { data: userData, error } = await supabase
        .from("users")
        .select("id, email, full_name, role, cabang_id, cabang:cabang_id(name), access_pages, created_at, password_hash")
        .eq("email", email)
        .single()

      if (error || !userData) {
        return false
      }

      // Verify password (plain text comparison)
      if (password !== userData.password_hash) {
        return false
      }

      // Set user in state and localStorage
      const userWithoutPassword = {
        id: userData.id,
        name: userData.full_name,
        email: userData.email,
        role: userData.role as "admin" | "karyawan",
        cabangId: userData.cabang_id || undefined,
        cabangName: (userData.cabang as any)?.name || undefined,
        accessPages: userData.access_pages || ["dashboard"],
        createdAt: userData.created_at,
      }

      localStorage.setItem("auth_user", JSON.stringify(userWithoutPassword))
      setUser(userWithoutPassword)
      return true
    } catch (error) {
      console.error("[v0] Login error:", error)
      return false
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("auth_user")
    setUser(null)
    router.push("/login")
  }, [router])

  const register = useCallback(
    async (name: string, email: string, password: string, role: "admin" | "karyawan", cabangId?: string, accessPages?: string[]) => {
      if (!supabase) {
        console.error("[v0] Supabase not configured")
        return false
      }

      try {
        // Check if user already exists
        const { data: existingUser, error: checkError } = await supabase
          .from("users")
          .select("id")
          .eq("email", email)
          .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error("[v0] Error checking existing user:", checkError)
        }

        if (existingUser) {
          console.error("[v0] User already exists with email:", email)
          return false
        }

        // Validasi: Karyawan wajib punya cabang_id
        if (role === "karyawan" && !cabangId) {
          console.error("[v0] Registration error: Karyawan wajib punya cabang")
          return false
        }

        // Insert new user (password stored as plain text)
        // Admin tidak perlu cabang_id, karyawan wajib punya cabang_id
        const insertData: any = {
          email,
          password_hash: password, // Store password as plain text
          full_name: name,
          role,
        }

        if (role === "karyawan" && cabangId) {
          insertData.cabang_id = cabangId
          insertData.access_pages = accessPages || ["dashboard"]
        }

        const { data: newUser, error } = await supabase
          .from("users")
          .insert(insertData)
          .select("id, email, full_name, role, cabang_id, created_at")
          .single()

        if (error) {
          console.error("[v0] Registration error:", error)
          console.error("[v0] Error code:", error.code)
          console.error("[v0] Error message:", error.message)
          console.error("[v0] Error details:", error.details)
          console.error("[v0] Error hint:", error.hint)
          console.error("[v0] Insert data:", JSON.stringify(insertData, null, 2))
          return false
        }

        if (!newUser) {
          console.error("[v0] Registration error: No user returned")
          return false
        }

        return true
      } catch (error) {
        console.error("[v0] Registration error (catch):", error)
        if (error instanceof Error) {
          console.error("[v0] Error message:", error.message)
          console.error("[v0] Error stack:", error.stack)
        }
        return false
      }
    },
    [],
  )

  return { user, loading, login, logout, register }
}
