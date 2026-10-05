"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

// =============================================
// INTERFACES
// =============================================

export interface EggStock {
    id: string
    userId: string
    cabangId?: string
    cabangName?: string
    date: string
    size: "kecil" | "sedang" | "besar"
    rackCount: number
    eggsPerRack: number
    pricePerEgg: number
    totalEggs: number
    createdAt: string
}

export interface EggSale {
    id: string
    userId: string
    cabangId?: string
    cabangName?: string
    date: string
    size: "kecil" | "sedang" | "besar"
    quantity: number
    pricePerEgg: number
    totalPrice: number
    createdAt: string
}

export interface EggWaste {
    id: string
    cabangId?: string
    cabangName?: string
    date: string
    size: "kecil" | "sedang" | "besar"
    quantity: number
    reason: string
    createdAt: string
}

export interface MartabakSale {
    id: string
    userId: string
    cabangId?: string
    cabangName?: string
    date: string
    quantity: number
    pricePerUnit: number
    totalPrice: number
    eggsUsed: number
    createdAt: string
}

export interface Ingredient {
    id: string
    userId: string
    cabangId?: string
    cabangName?: string
    name: string
    quantity: number
    unit: string
    cost: number
    date: string
    createdAt: string
}

// =============================================
// useEggStocks Hook
// =============================================

export function useEggStocks() {
    const [eggStocks, setEggStocks] = useState<EggStock[]>([])
    const [loading, setLoading] = useState(true)

    const loadEggStocks = useCallback(async (cabangId?: string, startDate?: string, endDate?: string) => {
        if (!supabase) {
            setLoading(false)
            return
        }

        try {
            let query = supabase
                .from("egg_stocks")
                .select("*, cabang:cabang_id(name)")
                .order("date", { ascending: false })

            if (cabangId) {
                query = query.eq("cabang_id", cabangId)
            }
            if (startDate) {
                // Convert date string to ISO format for timestamp comparison
                const startISO = startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`
                query = query.gte("date", startISO)
            }
            if (endDate) {
                // Convert date string to ISO format, set to end of day
                const endISO = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`
                query = query.lte("date", endISO)
            }
            // Add limit for performance
            const { data, error } = await query.limit(200)

            if (error) {
                console.error("[v0] Error loading egg stocks:", error)
                setEggStocks([])
            } else {
                setEggStocks(
                    data?.map((item) => ({
                        id: item.id,
                        userId: item.user_id,
                        cabangId: item.cabang_id || undefined,
                        cabangName: (item.cabang as any)?.name || undefined,
                        date: item.date,
                        size: item.size,
                        rackCount: item.rack_count,
                        eggsPerRack: item.eggs_per_rack,
                        pricePerEgg: parseFloat(item.price_per_egg),
                        totalEggs: item.total_eggs,
                        createdAt: item.created_at,
                    })) || []
                )
            }
        } catch (error) {
            console.error("[v0] Error loading egg stocks:", error)
            setEggStocks([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadEggStocks()
    }, [loadEggStocks])

    const addEggStock = useCallback(async (data: Omit<EggStock, "id" | "createdAt" | "cabangName">) => {
        if (!supabase) return false

        try {
            const { data: newStock, error } = await supabase.from("egg_stocks").insert({
                user_id: data.userId,
                cabang_id: data.cabangId || null,
                date: data.date,
                size: data.size,
                rack_count: data.rackCount,
                eggs_per_rack: data.eggsPerRack,
                price_per_egg: data.pricePerEgg,
                total_eggs: data.totalEggs,
            }).select("*, cabang:cabang_id(name)").single()

            if (error) {
                console.error("[v0] Error adding egg stock:", error)
                return false
            }

            // Optimistic update: add to state directly without refetching
            if (newStock) {
                setEggStocks(prev => [{
                    id: newStock.id,
                    userId: newStock.user_id,
                    cabangId: newStock.cabang_id || undefined,
                    cabangName: (newStock.cabang as any)?.name || undefined,
                    date: newStock.date,
                    size: newStock.size,
                    rackCount: newStock.rack_count,
                    eggsPerRack: newStock.eggs_per_rack,
                    pricePerEgg: parseFloat(newStock.price_per_egg),
                    totalEggs: newStock.total_eggs,
                    createdAt: newStock.created_at,
                }, ...prev])
            }
            return true
        } catch (error) {
            console.error("[v0] Error adding egg stock:", error)
            return false
        }
    }, [])

    const updateEggStock = useCallback(async (id: string, data: Partial<EggStock>) => {
        if (!supabase) return false

        try {
            const updateData: any = {}
            if (data.date) updateData.date = data.date
            if (data.size) updateData.size = data.size
            if (data.rackCount !== undefined) updateData.rack_count = data.rackCount
            if (data.eggsPerRack !== undefined) updateData.eggs_per_rack = data.eggsPerRack
            if (data.pricePerEgg !== undefined) updateData.price_per_egg = data.pricePerEgg
            if (data.totalEggs !== undefined) updateData.total_eggs = data.totalEggs
            if (data.cabangId !== undefined) updateData.cabang_id = data.cabangId || null

            const { error } = await supabase.from("egg_stocks").update(updateData).eq("id", id)

            if (error) {
                console.error("[v0] Error updating egg stock:", error)
                return false
            }

            // Optimistic update local state
            setEggStocks(prev => prev.map(item =>
                item.id === id ? { ...item, ...data } : item
            ))
            return true
        } catch (error) {
            console.error("[v0] Error updating egg stock:", error)
            return false
        }
    }, [])

    const deleteEggStock = useCallback(async (id: string) => {
        if (!supabase) return false

        try {
            const { error } = await supabase.from("egg_stocks").delete().eq("id", id)

            if (error) {
                console.error("[v0] Error deleting egg stock:", error)
                return false
            }

            // Optimistic update: remove from state directly
            setEggStocks(prev => prev.filter(item => item.id !== id))
            return true
        } catch (error) {
            console.error("[v0] Error deleting egg stock:", error)
            return false
        }
    }, [])

    return { eggStocks, loading, loadEggStocks, addEggStock, updateEggStock, deleteEggStock }
}

// =============================================
// useEggSales Hook
// =============================================

export function useEggSales() {
    const [eggSales, setEggSales] = useState<EggSale[]>([])
    const [loading, setLoading] = useState(true)

    const loadEggSales = useCallback(async (cabangId?: string, startDate?: string, endDate?: string) => {
        if (!supabase) {
            setLoading(false)
            return
        }

        try {
            let query = supabase
                .from("egg_sales")
                .select("*, cabang:cabang_id(name)")
                .order("date", { ascending: false })

            if (cabangId) {
                query = query.eq("cabang_id", cabangId)
            }
            if (startDate) {
                // Convert date string to ISO format for timestamp comparison
                const startISO = startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`
                query = query.gte("date", startISO)
            }
            if (endDate) {
                // Convert date string to ISO format, set to end of day
                const endISO = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`
                query = query.lte("date", endISO)
            }

            // Add limit for performance
            const { data, error } = await query.limit(200)

            if (error) {
                console.error("[v0] Error loading egg sales:", error)
                setEggSales([])
            } else {
                setEggSales(
                    data?.map((item) => ({
                        id: item.id,
                        userId: item.user_id,
                        cabangId: item.cabang_id || undefined,
                        cabangName: (item.cabang as any)?.name || undefined,
                        date: item.date,
                        size: item.size,
                        quantity: item.quantity,
                        pricePerEgg: parseFloat(item.price_per_egg),
                        totalPrice: parseFloat(item.total_price),
                        createdAt: item.created_at,
                    })) || []
                )
            }
        } catch (error) {
            console.error("[v0] Error loading egg sales:", error)
            setEggSales([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadEggSales()
    }, [loadEggSales])

    const addEggSale = useCallback(async (data: Omit<EggSale, "id" | "createdAt" | "cabangName">) => {
        if (!supabase) return false

        try {
            const { error } = await supabase.from("egg_sales").insert({
                user_id: data.userId,
                cabang_id: data.cabangId || null,
                date: data.date,
                size: data.size,
                quantity: data.quantity,
                price_per_egg: data.pricePerEgg,
                total_price: data.totalPrice,
            })

            if (error) {
                console.error("[v0] Error adding egg sale:", error)
                return false
            }

            await loadEggSales()
            return true
        } catch (error) {
            console.error("[v0] Error adding egg sale:", error)
            return false
        }
    }, [loadEggSales])

    const updateEggSale = useCallback(async (id: string, data: Partial<EggSale>) => {
        if (!supabase) return false

        try {
            const updateData: any = {}
            if (data.date) updateData.date = data.date
            if (data.size) updateData.size = data.size
            if (data.quantity !== undefined) updateData.quantity = data.quantity
            if (data.pricePerEgg !== undefined) updateData.price_per_egg = data.pricePerEgg
            if (data.totalPrice !== undefined) updateData.total_price = data.totalPrice
            if (data.cabangId !== undefined) updateData.cabang_id = data.cabangId || null

            const { error } = await supabase.from("egg_sales").update(updateData).eq("id", id)

            if (error) {
                console.error("[v0] Error updating egg sale:", error)
                return false
            }

            await loadEggSales()
            return true
        } catch (error) {
            console.error("[v0] Error updating egg sale:", error)
            return false
        }
    }, [loadEggSales])

    const deleteEggSale = useCallback(async (id: string) => {
        if (!supabase) return false

        try {
            const { error } = await supabase.from("egg_sales").delete().eq("id", id)

            if (error) {
                console.error("[v0] Error deleting egg sale:", error)
                return false
            }

            await loadEggSales()
            return true
        } catch (error) {
            console.error("[v0] Error deleting egg sale:", error)
            return false
        }
    }, [loadEggSales])

    return { eggSales, loading, loadEggSales, addEggSale, updateEggSale, deleteEggSale }
}

// =============================================
// useEggWaste Hook
// =============================================

export function useEggWaste() {
    const [eggWaste, setEggWaste] = useState<EggWaste[]>([])
    const [loading, setLoading] = useState(true)

    const loadEggWaste = useCallback(async (cabangId?: string, startDate?: string, endDate?: string) => {
        if (!supabase) {
            setLoading(false)
            return
        }

        try {
            let query = supabase
                .from("egg_waste")
                .select("*, cabang:cabang_id(name)")
                .order("date", { ascending: false })

            if (cabangId) {
                query = query.eq("cabang_id", cabangId)
            }
            if (startDate) {
                // Convert date string to ISO format for timestamp comparison
                const startISO = startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`
                query = query.gte("date", startISO)
            }
            if (endDate) {
                // Convert date string to ISO format, set to end of day
                const endISO = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`
                query = query.lte("date", endISO)
            }

            const { data, error } = await query

            if (error) {
                console.error("[v0] Error loading egg waste:", error)
                setEggWaste([])
            } else {
                setEggWaste(
                    data?.map((item) => ({
                        id: item.id,
                        cabangId: item.cabang_id || undefined,
                        cabangName: (item.cabang as any)?.name || undefined,
                        date: item.date,
                        size: item.size,
                        quantity: item.quantity,
                        reason: item.reason,
                        createdAt: item.created_at,
                    })) || []
                )
            }
        } catch (error) {
            console.error("[v0] Error loading egg waste:", error)
            setEggWaste([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadEggWaste()
    }, [loadEggWaste])

    const addEggWaste = useCallback(async (data: Omit<EggWaste, "id" | "createdAt" | "cabangName">) => {
        if (!supabase) return false

        try {
            const { error } = await supabase.from("egg_waste").insert({
                cabang_id: data.cabangId || null,
                date: data.date,
                size: data.size,
                quantity: data.quantity,
                reason: data.reason,
            })

            if (error) {
                console.error("[v0] Error adding egg waste:", error)
                return false
            }

            await loadEggWaste()
            return true
        } catch (error) {
            console.error("[v0] Error adding egg waste:", error)
            return false
        }
    }, [loadEggWaste])

    const deleteEggWaste = useCallback(async (id: string) => {
        if (!supabase) return false

        try {
            const { error } = await supabase.from("egg_waste").delete().eq("id", id)

            if (error) {
                console.error("[v0] Error deleting egg waste:", error)
                return false
            }

            await loadEggWaste()
            return true
        } catch (error) {
            console.error("[v0] Error deleting egg waste:", error)
            return false
        }
    }, [loadEggWaste])

    return { eggWaste, loading, loadEggWaste, addEggWaste, deleteEggWaste }
}


// =============================================
// useMartabakSales Hook
// =============================================

export function useMartabakSales() {
    const [martabakSales, setMartabakSales] = useState<MartabakSale[]>([])
    const [loading, setLoading] = useState(true)

    const loadMartabakSales = useCallback(async (cabangId?: string, startDate?: string, endDate?: string) => {
        if (!supabase) {
            setLoading(false)
            return
        }

        try {
            let query = supabase
                .from("martabak_sales")
                .select("*, cabang:cabang_id(name)")
                .order("date", { ascending: false })

            if (cabangId) {
                query = query.eq("cabang_id", cabangId)
            }
            if (startDate) {
                // Convert date string to ISO format for timestamp comparison
                const startISO = startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`
                query = query.gte("date", startISO)
            }
            if (endDate) {
                // Convert date string to ISO format, set to end of day
                const endISO = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`
                query = query.lte("date", endISO)
            }

            const { data, error } = await query

            if (error) {
                console.error("[v0] Error loading martabak sales:", error)
                setMartabakSales([])
            } else {
                setMartabakSales(
                    data?.map((item) => ({
                        id: item.id,
                        userId: item.user_id,
                        cabangId: item.cabang_id || undefined,
                        cabangName: (item.cabang as any)?.name || undefined,
                        date: item.date,
                        quantity: item.quantity,
                        pricePerUnit: parseFloat(item.price_per_unit),
                        totalPrice: parseFloat(item.total_price),
                        eggsUsed: item.eggs_used,
                        createdAt: item.created_at,
                    })) || []
                )
            }
        } catch (error) {
            console.error("[v0] Error loading martabak sales:", error)
            setMartabakSales([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadMartabakSales()
    }, [loadMartabakSales])

    const addMartabakSale = useCallback(async (data: Omit<MartabakSale, "id" | "createdAt" | "cabangName">) => {
        if (!supabase) return false

        try {
            const { error } = await supabase.from("martabak_sales").insert({
                user_id: data.userId,
                cabang_id: data.cabangId || null,
                date: data.date,
                quantity: data.quantity,
                price_per_unit: data.pricePerUnit,
                total_price: data.totalPrice,
                eggs_used: data.eggsUsed,
            })

            if (error) {
                console.error("[v0] Error adding martabak sale:", error)
                return false
            }

            await loadMartabakSales()
            return true
        } catch (error) {
            console.error("[v0] Error adding martabak sale:", error)
            return false
        }
    }, [loadMartabakSales])

    const updateMartabakSale = useCallback(async (id: string, data: Partial<MartabakSale>) => {
        if (!supabase) return false

        try {
            const updateData: any = {}
            if (data.date) updateData.date = data.date
            if (data.quantity !== undefined) updateData.quantity = data.quantity
            if (data.pricePerUnit !== undefined) updateData.price_per_unit = data.pricePerUnit
            if (data.totalPrice !== undefined) updateData.total_price = data.totalPrice
            if (data.eggsUsed !== undefined) updateData.eggs_used = data.eggsUsed
            if (data.cabangId !== undefined) updateData.cabang_id = data.cabangId || null

            const { error } = await supabase.from("martabak_sales").update(updateData).eq("id", id)

            if (error) {
                console.error("[v0] Error updating martabak sale:", {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                })
                return false
            }

            await loadMartabakSales()
            return true
        } catch (error: any) {
            console.error("[v0] Error updating martabak sale (exception):", {
                message: error?.message,
                stack: error?.stack
            })
            return false
        }
    }, [loadMartabakSales])

    const deleteMartabakSale = useCallback(async (id: string) => {
        if (!supabase) return false

        try {
            const { error } = await supabase.from("martabak_sales").delete().eq("id", id)

            if (error) {
                console.error("[v0] Error deleting martabak sale:", error)
                return false
            }

            await loadMartabakSales()
            return true
        } catch (error) {
            console.error("[v0] Error deleting martabak sale:", error)
            return false
        }
    }, [loadMartabakSales])

    return { martabakSales, loading, loadMartabakSales, addMartabakSale, updateMartabakSale, deleteMartabakSale }
}

// =============================================
// useIngredients Hook
// =============================================

export function useIngredients() {
    const [ingredients, setIngredients] = useState<Ingredient[]>([])
    const [loading, setLoading] = useState(true)

    const loadIngredients = useCallback(async (cabangId?: string, startDate?: string, endDate?: string) => {
        if (!supabase) {
            setLoading(false)
            return
        }

        setLoading(true)

        try {
            // Fetch ingredients without join to avoid error if FK missing
            let query = supabase
                .from("ingredients")
                .select("*")
                .order("date", { ascending: false })

            if (cabangId) {
                query = query.eq("cabang_id", cabangId)
            }
            if (startDate) {
                // Convert date string to ISO format for timestamp comparison
                const startISO = startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`
                query = query.gte("date", startISO)
            }
            if (endDate) {
                // Convert date string to ISO format, set to end of day
                const endISO = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`
                query = query.lte("date", endISO)
            }

            const { data: ingredientsData, error: ingError } = await query

            if (ingError) {
                console.error("[v0] Error loading ingredients:", ingError)
                setIngredients([])
            } else {
                // Fetch cabangs manually for mapping logic
                const { data: cabangsData } = await supabase.from("cabang").select("id, name")
                const cabangsMap = new Map(cabangsData?.map(c => [c.id, c.name]) || [])

                setIngredients(
                    ingredientsData?.map((item) => ({
                        id: item.id,
                        userId: item.user_id,
                        cabangId: item.cabang_id || undefined,
                        cabangName: item.cabang_id ? cabangsMap.get(item.cabang_id) : undefined,
                        name: item.name,
                        quantity: parseFloat(item.quantity),
                        unit: item.unit,
                        cost: parseFloat(item.cost),
                        date: item.date,
                        createdAt: item.created_at,
                    })) || []
                )
            }
        } catch (error) {
            console.error("[v0] Error loading ingredients:", error)
            setIngredients([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadIngredients()
    }, [loadIngredients])

    const addIngredient = useCallback(async (data: Omit<Ingredient, "id" | "createdAt" | "cabangName">) => {
        if (!supabase) return false

        try {
            const { error } = await supabase.from("ingredients").insert({
                user_id: data.userId,
                cabang_id: data.cabangId || null,
                name: data.name,
                quantity: data.quantity,
                unit: data.unit,
                cost: data.cost,
                date: data.date,
            })

            if (error) {
                console.error("[v0] Error adding ingredient:", error)
                return false
            }

            await loadIngredients()
            return true
        } catch (error) {
            console.error("[v0] Error adding ingredient:", error)
            return false
        }
    }, [loadIngredients])

    const updateIngredient = useCallback(async (id: string, data: Partial<Ingredient>) => {
        if (!supabase) return false

        try {
            const updateData: any = {}
            if (data.name) updateData.name = data.name
            if (data.quantity !== undefined) updateData.quantity = data.quantity
            if (data.unit) updateData.unit = data.unit
            if (data.cost !== undefined) updateData.cost = data.cost
            if (data.date) updateData.date = data.date
            if (data.cabangId !== undefined) updateData.cabang_id = data.cabangId || null

            const { error } = await supabase.from("ingredients").update(updateData).eq("id", id)

            if (error) {
                console.error("[v0] Error updating ingredient:", error)
                return false
            }

            await loadIngredients()
            return true
        } catch (error) {
            console.error("[v0] Error updating ingredient:", error)
            return false
        }
    }, [loadIngredients])

    const deleteIngredient = useCallback(async (id: string) => {
        if (!supabase) return false

        try {
            const { error } = await supabase.from("ingredients").delete().eq("id", id)

            if (error) {
                console.error("[v0] Error deleting ingredient:", error)
                return false
            }

            await loadIngredients()
            return true
        } catch (error) {
            console.error("[v0] Error deleting ingredient:", error)
            return false
        }
    }, [loadIngredients])

    return { ingredients, loading, loadIngredients, addIngredient, updateIngredient, deleteIngredient }
}

// =============================================
// useOperationalExpenses Hook
// =============================================

export interface OperationalExpense {
    id: string
    userId: string
    cabangId?: string
    cabangName?: string
    date: string
    category: "Listrik" | "Gaji" | "Sewa" | "Bahan Bakar" | "Lainnya"
    amount: number
    description: string
    createdAt: string
}

export function useOperationalExpenses() {
    const [expenses, setExpenses] = useState<OperationalExpense[]>([])
    const [loading, setLoading] = useState(true)
    const [lastFilters, setLastFilters] = useState<{ cabangId?: string, startDate?: string, endDate?: string }>({})

    const loadExpenses = useCallback(async (cabangId?: string, startDate?: string, endDate?: string) => {
        if (!supabase) {
            setLoading(false)
            return
        }

        try {
            let query = supabase
                .from("operational_expenses")
                .select("*, cabang:cabang_id(name)")
                .order("date", { ascending: false })

            if (cabangId) {
                query = query.eq("cabang_id", cabangId)
            }
            if (startDate) {
                // Convert date string to ISO format for timestamp comparison
                const startISO = startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`
                query = query.gte("date", startISO)
            }
            if (endDate) {
                // Convert date string to ISO format, set to end of day
                const endISO = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`
                query = query.lte("date", endISO)
            }

            const { data, error } = await query

            if (error) {
                console.error("[v0] Error loading expenses:", error)
                setExpenses([])
            } else {
                setExpenses(
                    data?.map((item) => ({
                        id: item.id,
                        userId: item.user_id,
                        cabangId: item.cabang_id || undefined,
                        cabangName: (item.cabang as any)?.name || undefined,
                        date: item.date,
                        category: item.category,
                        amount: parseFloat(item.amount),
                        description: item.description,
                        createdAt: item.created_at,
                    })) || []
                )
                // Store last used filters
                setLastFilters({ cabangId, startDate, endDate })
            }
        } catch (error) {
            console.error("[v0] Error loading expenses:", error)
            setExpenses([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadExpenses()
    }, [loadExpenses])

    const addExpense = useCallback(async (data: Omit<OperationalExpense, "id" | "createdAt" | "cabangName">) => {
        if (!supabase) return false

        try {
            const { error } = await supabase.from("operational_expenses").insert({
                user_id: data.userId,
                cabang_id: data.cabangId || null,
                date: data.date,
                category: data.category,
                amount: data.amount,
                description: data.description,
            })

            if (error) {
                console.error("[v0] Error adding expense:", error)
                return false
            }

            // Reload with last used filters
            await loadExpenses(lastFilters.cabangId, lastFilters.startDate, lastFilters.endDate)
            return true
        } catch (error) {
            console.error("[v0] Error adding expense:", error)
            return false
        }
    }, [loadExpenses])

    const deleteExpense = useCallback(async (id: string) => {
        if (!supabase) return false

        try {
            const { error } = await supabase.from("operational_expenses").delete().eq("id", id)

            if (error) {
                console.error("[v0] Error deleting expense:", error)
                return false
            }

            // Reload with last used filters
            await loadExpenses(lastFilters.cabangId, lastFilters.startDate, lastFilters.endDate)
            return true
        } catch (error) {
            console.error("[v0] Error deleting expense:", error)
            return false
        }
    }, [loadExpenses, lastFilters])

    const updateExpense = useCallback(async (id: string, data: Partial<OperationalExpense>) => {
        if (!supabase) return false

        try {
            const updateData: any = {}
            if (data.date) updateData.date = data.date
            if (data.category) updateData.category = data.category
            if (data.amount !== undefined) updateData.amount = data.amount
            if (data.description !== undefined) updateData.description = data.description
            if (data.cabangId !== undefined) updateData.cabang_id = data.cabangId || null

            const { error } = await supabase.from("operational_expenses").update(updateData).eq("id", id)

            if (error) {
                console.error("[v0] Error updating expense:", error)
                return false
            }

            // Reload with last used filters
            await loadExpenses(lastFilters.cabangId, lastFilters.startDate, lastFilters.endDate)
            return true
        } catch (error) {
            console.error("[v0] Error updating expense:", error)
            return false
        }
    }, [loadExpenses, lastFilters])

    return { expenses, loading, loadExpenses, addExpense, updateExpense, deleteExpense }
}

// =============================================
// Load Cabang Stats (untuk ringkasan)
// =============================================

export interface CabangStats {
    cabangId: string
    cabangName: string
    eggSalesCount: number
    eggRevenue: number
    martabakSalesCount: number
    martabakRevenue: number
    totalCost: number
    operationalCost: number // Added operationalCost
    totalRevenue: number
    profit: number
    netProfit: number // Added netProfit
}

export async function loadCabangStats(
    startDate?: string,
    endDate?: string
): Promise<CabangStats[]> {
    if (!supabase) return []

    try {
        // Get all cabangs
        const { data: cabangs, error: cabangError } = await supabase
            .from("cabang")
            .select("id, name")
            .order("name")

        if (cabangError || !cabangs) {
            console.error("[v0] Error loading cabangs for stats:", cabangError)
            return []
        }

        const stats: CabangStats[] = []

        for (const cabang of cabangs) {
            // Build queries with date filter
            let eggSalesQuery = supabase
                .from("egg_sales")
                .select("total_price")
                .eq("cabang_id", cabang.id)

            let martabakSalesQuery = supabase
                .from("martabak_sales")
                .select("total_price")
                .eq("cabang_id", cabang.id)

            let ingredientsQuery = supabase
                .from("ingredients")
                .select("cost")
                .eq("cabang_id", cabang.id)

            let expensesQuery = supabase
                .from("operational_expenses")
                .select("amount")
                .eq("cabang_id", cabang.id)

            if (startDate) {
                // Convert date string to ISO format for timestamp comparison
                const startISO = startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`
                eggSalesQuery = eggSalesQuery.gte("date", startISO)
                martabakSalesQuery = martabakSalesQuery.gte("date", startISO)
                ingredientsQuery = ingredientsQuery.gte("date", startISO)
                expensesQuery = expensesQuery.gte("date", startISO)
            }

            if (endDate) {
                // Convert date string to ISO format, set to end of day
                const endISO = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`
                eggSalesQuery = eggSalesQuery.lte("date", endISO)
                martabakSalesQuery = martabakSalesQuery.lte("date", endISO)
                ingredientsQuery = ingredientsQuery.lte("date", endISO)
                expensesQuery = expensesQuery.lte("date", endISO)
            }

            const [eggSalesResult, martabakSalesResult, ingredientsResult, expensesResult] = await Promise.all([
                eggSalesQuery,
                martabakSalesQuery,
                ingredientsQuery,
                expensesQuery
            ])

            const eggSales = eggSalesResult.data || []
            const martabakSales = martabakSalesResult.data || []
            const ingredients = ingredientsResult.data || []
            const expenses = expensesResult.data || []

            const eggRevenue = eggSales.reduce((sum, s) => sum + parseFloat(s.total_price || 0), 0)
            const martabakRevenue = martabakSales.reduce((sum, m) => sum + parseFloat(m.total_price || 0), 0)
            const totalCost = ingredients.reduce((sum, i) => sum + parseFloat(i.cost || 0), 0)
            const operationalCost = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)

            const totalRevenue = eggRevenue + martabakRevenue
            const grossProfit = totalRevenue - totalCost
            const netProfit = grossProfit - operationalCost

            stats.push({
                cabangId: cabang.id,
                cabangName: cabang.name,
                eggSalesCount: eggSales.length,
                eggRevenue,
                martabakSalesCount: martabakSales.length,
                martabakRevenue,
                totalCost,
                operationalCost,
                totalRevenue,
                profit: grossProfit,
                netProfit
            })
        }

        return stats
    } catch (error) {
        console.error("[v0] Error loading cabang stats:", error)
        return []
    }
}
