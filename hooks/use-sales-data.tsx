"use client"

import { useState, useEffect } from "react"
import { useAuth } from "./use-auth"
import { supabase } from "@/lib/supabase"

export interface EggStock {
  id: string
  userId: string
  date: string
  size: "kecil" | "sedang" | "besar"
  rackCount: number
  eggsPerRack: number
  pricePerEgg: number
  totalEggs: number
  cabangId?: string
}

export interface EggSale {
  id: string
  userId: string
  date: string
  size: "kecil" | "sedang" | "besar"
  quantity: number
  pricePerEgg: number
  totalPrice: number
  cabangId?: string
}

export interface MartabakSale {
  id: string
  userId: string
  date: string
  quantity: number
  pricePerUnit: number
  totalPrice: number
  eggsUsed: number
  cabangId?: string
}

export interface Ingredient {
  id: string
  userId: string
  name: string
  quantity: number
  unit: string
  cost: number
  date: string
  cabangId?: string
}

export function useSalesData() {
  const { user } = useAuth()
  const [eggStocks, setEggStocks] = useState<EggStock[]>([])
  const [eggSales, setEggSales] = useState<EggSale[]>([])
  const [martabakSales, setMartabakSales] = useState<MartabakSale[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])

  useEffect(() => {
    if (user) {
      loadData()
    } else {
      setEggStocks([])
      setEggSales([])
      setMartabakSales([])
      setIngredients([])
    }
  }, [user])

  const loadData = async () => {
    if (!user || !supabase) return

    try {
      // Build queries based on user role (parallel execution)
      const cabangFilter = user.role === "karyawan" && user.cabangId
        ? { cabang_id: user.cabangId }
        : null

      // Execute all queries in parallel for 4x faster loading
      const [stocksResult, salesResult, martabakResult, ingredientsResult] = await Promise.all([
        // Egg stocks query
        cabangFilter
          ? supabase.from("egg_stocks").select("*").eq("cabang_id", cabangFilter.cabang_id).order("date", { ascending: false }).limit(100)
          : supabase.from("egg_stocks").select("*").order("date", { ascending: false }).limit(100),

        // Egg sales query
        cabangFilter
          ? supabase.from("egg_sales").select("*").eq("cabang_id", cabangFilter.cabang_id).order("date", { ascending: false }).limit(100)
          : supabase.from("egg_sales").select("*").order("date", { ascending: false }).limit(100),

        // Martabak sales query
        cabangFilter
          ? supabase.from("martabak_sales").select("*").eq("cabang_id", cabangFilter.cabang_id).order("date", { ascending: false }).limit(100)
          : supabase.from("martabak_sales").select("*").order("date", { ascending: false }).limit(100),

        // Ingredients query
        cabangFilter
          ? supabase.from("ingredients").select("*").eq("cabang_id", cabangFilter.cabang_id).order("date", { ascending: false }).limit(100)
          : supabase.from("ingredients").select("*").order("date", { ascending: false }).limit(100),
      ])

      // Process egg stocks
      if (!stocksResult.error && stocksResult.data) {
        setEggStocks(
          stocksResult.data.map((s) => ({
            id: s.id,
            userId: s.user_id,
            date: s.date,
            size: s.size,
            rackCount: s.rack_count,
            eggsPerRack: s.eggs_per_rack,
            pricePerEgg: parseFloat(s.price_per_egg),
            totalEggs: s.total_eggs,
          })),
        )
      }

      // Process egg sales
      if (!salesResult.error && salesResult.data) {
        setEggSales(
          salesResult.data.map((s) => ({
            id: s.id,
            userId: s.user_id,
            date: s.date,
            size: s.size,
            quantity: s.quantity,
            pricePerEgg: parseFloat(s.price_per_egg),
            totalPrice: parseFloat(s.total_price),
            cabangId: s.cabang_id,
          })),
        )
      }

      // Process martabak sales
      if (!martabakResult.error && martabakResult.data) {
        setMartabakSales(
          martabakResult.data.map((m) => ({
            id: m.id,
            userId: m.user_id,
            date: m.date,
            quantity: m.quantity,
            pricePerUnit: parseFloat(m.price_per_unit),
            totalPrice: parseFloat(m.total_price),
            eggsUsed: m.eggs_used,
            cabangId: m.cabang_id,
          })),
        )
      }

      // Process ingredients
      if (!ingredientsResult.error && ingredientsResult.data) {
        setIngredients(
          ingredientsResult.data.map((i) => ({
            id: i.id,
            userId: i.user_id,
            name: i.name,
            quantity: parseFloat(i.quantity),
            unit: i.unit,
            cost: parseFloat(i.cost),
            date: i.date,
            cabangId: i.cabang_id,
          })),
        )
      }
    } catch (error) {
      console.error("[v0] Error loading data:", error)
    }
  }

  const addEggStock = async (data: Omit<EggStock, "id" | "userId">) => {
    if (!user || !supabase) return

    try {
      const insertData: any = {
        user_id: user.id,
        cabang_id: user.cabangId || null,
        date: data.date,
        size: data.size,
        rack_count: data.rackCount,
        eggs_per_rack: data.eggsPerRack,
        price_per_egg: data.pricePerEgg,
        total_eggs: data.totalEggs,
      }

      const { data: newStock, error } = await supabase
        .from("egg_stocks")
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error("[v0] Error adding egg stock:", error)
        return
      }

      if (newStock) {
        setEggStocks([
          {
            id: newStock.id,
            userId: newStock.user_id,
            date: newStock.date,
            size: newStock.size,
            rackCount: newStock.rack_count,
            eggsPerRack: newStock.eggs_per_rack,
            pricePerEgg: parseFloat(newStock.price_per_egg),
            totalEggs: newStock.total_eggs,
          },
          ...eggStocks,
        ])
      }
    } catch (error) {
      console.error("[v0] Error adding egg stock:", error)
    }
  }

  const addEggSale = async (data: Omit<EggSale, "id" | "userId">) => {
    if (!user || !supabase) return

    try {
      const insertData: any = {
        user_id: user.id,
        cabang_id: user.cabangId || null,
        date: data.date,
        size: data.size,
        quantity: data.quantity,
        price_per_egg: data.pricePerEgg,
        total_price: data.totalPrice,
      }

      const { data: newSale, error } = await supabase
        .from("egg_sales")
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error("[v0] Error adding egg sale:", error)
        return
      }

      if (newSale) {
        setEggSales([
          {
            id: newSale.id,
            userId: newSale.user_id,
            date: newSale.date,
            size: newSale.size,
            quantity: newSale.quantity,
            pricePerEgg: parseFloat(newSale.price_per_egg),
            totalPrice: parseFloat(newSale.total_price),
          },
          ...eggSales,
        ])
      }
    } catch (error) {
      console.error("[v0] Error adding egg sale:", error)
    }
  }

  const addMartabakSale = async (data: Omit<MartabakSale, "id" | "userId">) => {
    if (!user || !supabase) return

    try {
      const insertData: any = {
        user_id: user.id,
        cabang_id: data.cabangId || user.cabangId || null,
        date: data.date,
        quantity: data.quantity,
        price_per_unit: data.pricePerUnit,
        total_price: data.totalPrice,
        eggs_used: data.eggsUsed,
      }

      const { data: newSale, error } = await supabase
        .from("martabak_sales")
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error("[v0] Error adding martabak sale:", error)
        return
      }

      if (newSale) {
        setMartabakSales([
          {
            id: newSale.id,
            userId: newSale.user_id,
            date: newSale.date,
            quantity: newSale.quantity,
            pricePerUnit: parseFloat(newSale.price_per_unit),
            totalPrice: parseFloat(newSale.total_price),
            eggsUsed: newSale.eggs_used,
            cabangId: newSale.cabang_id,
          },
          ...martabakSales,
        ])
      }
    } catch (error) {
      console.error("[v0] Error adding martabak sale:", error)
    }
  }

  const addIngredient = async (data: Omit<Ingredient, "id" | "userId">) => {
    if (!user || !supabase) return

    try {
      const insertData: any = {
        user_id: user.id,
        cabang_id: data.cabangId || user.cabangId || null,
        name: data.name,
        quantity: data.quantity,
        unit: data.unit,
        cost: data.cost,
        date: data.date,
      }

      const { data: newIngredient, error } = await supabase
        .from("ingredients")
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error("[v0] Error adding ingredient:", error)
        return
      }

      if (newIngredient) {
        setIngredients([
          {
            id: newIngredient.id,
            userId: newIngredient.user_id,
            name: newIngredient.name,
            quantity: parseFloat(newIngredient.quantity),
            unit: newIngredient.unit,
            cost: parseFloat(newIngredient.cost),
            date: newIngredient.date,
            cabangId: newIngredient.cabang_id,
          },
          ...ingredients,
        ])
      }
    } catch (error) {
      console.error("[v0] Error adding ingredient:", error)
    }
  }

  return {
    eggStocks,
    eggSales,
    martabakSales,
    ingredients,
    addEggStock,
    addEggSale,
    addMartabakSale,
    addIngredient,
    loadData,
  }
}
