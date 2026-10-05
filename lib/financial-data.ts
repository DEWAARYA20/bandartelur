import { supabase } from "./supabase"

export async function getFinancialData(userId: string, month: number, year: number) {
  if (!supabase) {
    return {
      revenueEggs: 0,
      revenueMartabak: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      profit: 0,
      profitMargin: 0,
    }
  }

  try {
    // Calculate date range for the month
    const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`
    const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0]

    // Get egg sales for the month
    const { data: eggSales } = await supabase
      .from("egg_sales")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)

    // Get martabak sales for the month
    const { data: martabakSales } = await supabase
      .from("martabak_sales")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)

    // Get ingredients for the month
    const { data: ingredients } = await supabase
      .from("ingredients")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)

    let revenueEggs = 0
    let revenueMartabak = 0
    let totalExpenses = 0

    if (eggSales) {
      revenueEggs = eggSales.reduce((sum, sale) => sum + parseFloat(sale.total_price || 0), 0)
    }

    if (martabakSales) {
      revenueMartabak = martabakSales.reduce((sum, sale) => sum + parseFloat(sale.total_price || 0), 0)
    }

    if (ingredients) {
      totalExpenses = ingredients.reduce((sum, ing) => sum + parseFloat(ing.cost || 0), 0)
    }

    const totalRevenue = revenueEggs + revenueMartabak
    const profit = totalRevenue - totalExpenses

    return {
      revenueEggs,
      revenueMartabak,
      totalRevenue,
      totalExpenses,
      profit,
      profitMargin: totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0,
    }
  } catch (error) {
    console.error("[v0] Error fetching financial data:", error)
    return {
      revenueEggs: 0,
      revenueMartabak: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      profit: 0,
      profitMargin: 0,
    }
  }
}

export async function getAllUsersFinancial(month: number, year: number) {
  if (!supabase) {
    return []
  }

  try {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, cabang_id, cabang:cabang_id(name)")
      .eq("role", "karyawan")

    if (!users) return []

    const financialData = await Promise.all(
      users.map(async (user) => {
        const data = await getFinancialData(user.id, month, year)
        return {
          userId: user.id,
          name: user.full_name,
          cabang: (user.cabang as any)?.name || null,
          ...data,
        }
      }),
    )

    return financialData
  } catch (error) {
    console.error("[v0] Error fetching all users financial:", error)
    return []
  }
}
