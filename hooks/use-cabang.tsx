"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export interface Cabang {
  id: string
  name: string
  description?: string
  createdAt: string
}

export function useCabang() {
  const [cabangs, setCabangs] = useState<Cabang[]>([])
  const [loading, setLoading] = useState(true)

  const loadCabangs = useCallback(async () => {
    if (!supabase) {
      console.warn("[v0] Supabase not configured, cannot load cabangs")
      setLoading(false)
      setCabangs([])
      return
    }

    try {
      const { data, error } = await supabase
        .from("cabangs")
        .select("*")
        .order("name", { ascending: true })

      if (error) {
        console.error("[v0] Error loading cabangs:", error)
        console.error("[v0] Error code:", error.code)
        console.error("[v0] Error message:", error.message)
        console.error("[v0] Error details:", error.details)
        console.error("[v0] Error hint:", error.hint)
        setCabangs([])
      } else {
        setCabangs(
          data?.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description || undefined,
            createdAt: c.created_at,
          })) || [],
        )
      }
    } catch (error) {
      console.error("[v0] Error loading cabangs (catch):", error)
      if (error instanceof Error) {
        console.error("[v0] Error message:", error.message)
        console.error("[v0] Error stack:", error.stack)
      }
      setCabangs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCabangs()
  }, [loadCabangs])

  const addCabang = useCallback(async (name: string, description?: string) => {
    if (!supabase) return false

    try {
      const { data, error } = await supabase
        .from("cabangs")
        .insert({
          name,
          description: description || null,
        })
        .select()
        .single()

      if (error) {
        console.error("[v0] Error adding cabang:", error)
        console.error("[v0] Error code:", error.code)
        console.error("[v0] Error message:", error.message)
        console.error("[v0] Error details:", error.details)
        return false
      }

      await loadCabangs()
      return true
    } catch (error) {
      console.error("[v0] Error adding cabang (catch):", error)
      if (error instanceof Error) {
        console.error("[v0] Error message:", error.message)
      }
      return false
    }
  }, [loadCabangs])

  const updateCabang = useCallback(async (id: string, name: string, description?: string) => {
    if (!supabase) return false

    try {
      const { error } = await supabase
        .from("cabangs")
        .update({
          name,
          description: description || null,
        })
        .eq("id", id)

      if (error) {
        console.error("[v0] Error updating cabang:", error)
        console.error("[v0] Error code:", error.code)
        console.error("[v0] Error message:", error.message)
        console.error("[v0] Error details:", error.details)
        return false
      }

      await loadCabangs()
      return true
    } catch (error) {
      console.error("[v0] Error updating cabang (catch):", error)
      if (error instanceof Error) {
        console.error("[v0] Error message:", error.message)
      }
      return false
    }
  }, [loadCabangs])

  const deleteCabang = useCallback(async (id: string) => {
    if (!supabase) return false

    try {
      const { error } = await supabase.from("cabangs").delete().eq("id", id)

      if (error) {
        console.error("[v0] Error deleting cabang:", error)
        console.error("[v0] Error code:", error.code)
        console.error("[v0] Error message:", error.message)
        console.error("[v0] Error details:", error.details)
        return false
      }

      await loadCabangs()
      return true
    } catch (error) {
      console.error("[v0] Error deleting cabang (catch):", error)
      if (error instanceof Error) {
        console.error("[v0] Error message:", error.message)
      }
      return false
    }
  }, [loadCabangs])

  return {
    cabangs,
    loading,
    loadCabangs,
    addCabang,
    updateCabang,
    deleteCabang,
  }
}

