"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, AVAILABLE_PAGES } from "@/hooks/use-auth"
import { useCabang } from "@/hooks/use-cabang"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { SidebarProvider } from "@/components/sidebar-context"
import { useToast } from "@/hooks/use-toast"
import { formatDateTimeWITA, getCurrentDateWITA, getCurrentDateTimeWITA } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Eye, EyeOff, Plus, Edit, Trash2, Building2, Download, Calendar, Egg, ChefHat, Package, Users, Activity, DollarSign, X, Database, RefreshCw, HardDrive, BadgeCheck } from "lucide-react"
import { useEggStocks, useEggSales, useMartabakSales, useIngredients, loadCabangStats, type CabangStats } from "@/hooks/use-data"
import { exportCabangSummaryToExcel, exportEggSalesToExcel, exportMartabakSalesToExcel, exportEggStocksToExcel, exportIngredientsToExcel } from "@/lib/excel-export"
import { StatsGridSkeleton, TableSkeleton, CabangStatSkeleton } from "@/components/ui/loading-skeletons"
import { useDatabaseStats, formatBytes, getUsageStatusColor } from "@/hooks/use-database-stats"
import { downloadSqlBackup } from "@/lib/sql-backup"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "karyawan"
  cabangId?: string
  cabangName?: string
  accessPages?: string[]
  createdAt: string
}

// Comprehensive Unit List
const UNIT_OPTIONS = [
  "kg", "gram", "liter", "ml", "pcs", "butir", "ikat",
  "bungkus", "kaleng", "botol", "sachet", "box", "karung", "dus", "renteng"
]

export default function AdminPage() {
  const router = useRouter()
  const { user, loading, register } = useAuth()
  const { cabangs, loading: cabangsLoading, addCabang, updateCabang, deleteCabang } = useCabang()
  const { toast } = useToast()

  // CRUD Hooks
  const { eggStocks, loading: eggStocksLoading, loadEggStocks, addEggStock, updateEggStock, deleteEggStock } = useEggStocks()
  const { eggSales, loading: eggSalesLoading, loadEggSales, addEggSale, updateEggSale, deleteEggSale } = useEggSales()
  const { martabakSales, loading: martabakSalesLoading, loadMartabakSales, addMartabakSale, updateMartabakSale, deleteMartabakSale } = useMartabakSales()
  const { ingredients, loading: ingredientsLoading, loadIngredients, addIngredient, updateIngredient, deleteIngredient } = useIngredients()
  const dbStats = useDatabaseStats()
  const [isBackingUp, setIsBackingUp] = useState(false)

  const handleBackup = async () => {
    setIsBackingUp(true)
    try {
      const result = await downloadSqlBackup()
      if (result.success) {
        toast({
          title: "Backup Berhasil",
          description: `File ${result.filename} telah diunduh.`,
          variant: "default",
          className: "bg-green-500 text-white border-none"
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast({
        title: "Backup Gagal",
        description: error.message || "Terjadi kesalahan saat membuat backup.",
        variant: "destructive"
      })
    } finally {
      setIsBackingUp(false)
    }
  }

  const [mounted, setMounted] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"users" | "cabang" | "ringkasan" | "egg_stocks" | "egg_sales" | "martabak_sales" | "ingredients">("users")

  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    cabangId: "",
    accessPages: ["dashboard"] as string[],
  })
  const [showPassword, setShowPassword] = useState(false)
  const [userStats, setUserStats] = useState<Record<string, any>>({})

  // Cabang CRUD states
  const [showAddCabang, setShowAddCabang] = useState(false)
  const [editingCabang, setEditingCabang] = useState<string | null>(null)
  const [cabangForm, setCabangForm] = useState({ name: "", description: "" })

  // Edit Ingredient State
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null)
  const [showEditIngredientModal, setShowEditIngredientModal] = useState(false)
  const [editIngredientForm, setEditIngredientForm] = useState({
    name: "",
    quantity: 0,
    unit: "kg",
    cost: 0,
    date: "",
    cabangId: "",
  })

  // Egg Stock CRUD State
  const [showAddEggStock, setShowAddEggStock] = useState(false)
  const [editingEggStockId, setEditingEggStockId] = useState<string | null>(null)
  const [eggStockForm, setEggStockForm] = useState({ size: "besar", rackCount: 1, pricePerEgg: 2000, date: getCurrentDateWITA(), cabangId: "" })

  // Egg Sale CRUD State
  const [showAddEggSale, setShowAddEggSale] = useState(false)
  const [editingEggSaleId, setEditingEggSaleId] = useState<string | null>(null)
  const [eggSaleForm, setEggSaleForm] = useState({ size: "besar", quantity: 0, pricePerEgg: 2000, date: getCurrentDateWITA(), cabangId: "" })

  // Martabak Sale CRUD State
  const [showAddMartabakSale, setShowAddMartabakSale] = useState(false)
  const [editingMartabakSaleId, setEditingMartabakSaleId] = useState<string | null>(null)
  const [martabakSaleForm, setMartabakSaleForm] = useState({ cupCount: 1, martabakPcs: 5, pricePerPcs: 2000, date: getCurrentDateWITA(), cabangId: "" })

  // Ringkasan Cabang states
  const [cabangStats, setCabangStats] = useState<CabangStats[]>([])
  const [cabangStatsLoading, setCabangStatsLoading] = useState(false)
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: "",
  })
  const [dateFilterInitialized, setDateFilterInitialized] = useState(false)

  // CRUD form states (User Edit)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [crudForm, setCrudForm] = useState<Record<string, any>>({})

  // Modal Detail for Ringkasan
  const [selectedCabangDetail, setSelectedCabangDetail] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize date filter with current month range in WITA timezone
  useEffect(() => {
    if (mounted && !dateFilterInitialized) {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const firstDayWITA = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Makassar',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(firstDay)

      const lastDayWITA = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Makassar',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(lastDay)

      setDateFilter({
        startDate: firstDayWITA,
        endDate: lastDayWITA
      })
      setDateFilterInitialized(true)
    }
  }, [mounted, dateFilterInitialized])

  useEffect(() => {
    if (!loading && !user && mounted) {
      router.push("/login")
    } else if (!loading && user && user.role !== "admin" && mounted) {
      router.push("/dashboard")
    } else if (!loading && user && user.role === "admin" && mounted && dateFilterInitialized) {
      loadUsers()
      // Load initial data for all tabs - convert to ISO format
      if (dateFilter.startDate && dateFilter.endDate) {
        const startISO = dateFilter.startDate.includes('T') ? dateFilter.startDate : `${dateFilter.startDate}T00:00:00.000Z`
        const endISO = dateFilter.endDate.includes('T') ? dateFilter.endDate : `${dateFilter.endDate}T23:59:59.999Z`
        loadEggStocks(undefined, startISO, endISO)
        loadEggSales(undefined, startISO, endISO)
        loadMartabakSales(undefined, startISO, endISO)
        loadIngredients(undefined, startISO, endISO)
      }
    }
  }, [user, loading, mounted, router, dateFilterInitialized, dateFilter.startDate, dateFilter.endDate])

  // Auto-load ringkasan when tab changes to ringkasan
  useEffect(() => {
    if (activeTab === "ringkasan" && user && user.role === "admin" && mounted && dateFilter.startDate && dateFilter.endDate) {
      // Small delay to ensure component is ready
      const timer = setTimeout(() => {
        handleLoadCabangStats()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [activeTab])

  // Reload ringkasan when date filter changes
  useEffect(() => {
    if (activeTab === "ringkasan" && user && user.role === "admin" && mounted && dateFilter.startDate && dateFilter.endDate) {
      // Convert to ISO format for query
      const startISO = dateFilter.startDate.includes('T') ? dateFilter.startDate : `${dateFilter.startDate}T00:00:00.000Z`
      const endISO = dateFilter.endDate.includes('T') ? dateFilter.endDate : `${dateFilter.endDate}T23:59:59.999Z`
      loadCabangStats(startISO.split('T')[0], endISO.split('T')[0]).then(stats => {
        setCabangStats(stats)
        toast({ description: `Data ringkasan diperbarui - ${stats.length} cabang` })
      }).catch(error => {
        console.error("Error loading cabang stats:", error)
        toast({ title: "Error", description: "Gagal memuat ringkasan", variant: "destructive" })
      })
    }
  }, [dateFilter.startDate, dateFilter.endDate])

  // Reload data when date filter changes (for non-ringkasan tabs)
  useEffect(() => {
    if (user && user.role === "admin" && mounted && dateFilter.startDate && dateFilter.endDate && activeTab !== "ringkasan") {
      // Convert date to ISO format for proper query
      const startISO = dateFilter.startDate.includes('T') ? dateFilter.startDate : `${dateFilter.startDate}T00:00:00.000Z`
      const endISO = dateFilter.endDate.includes('T') ? dateFilter.endDate : `${dateFilter.endDate}T23:59:59.999Z`

      if (activeTab === "egg_stocks") loadEggStocks(undefined, startISO, endISO)
      if (activeTab === "egg_sales") loadEggSales(undefined, startISO, endISO)
      if (activeTab === "martabak_sales") loadMartabakSales(undefined, startISO, endISO)
      if (activeTab === "ingredients") loadIngredients(undefined, startISO, endISO)
    }
  }, [dateFilter.startDate, dateFilter.endDate, activeTab, user, mounted, loadEggStocks, loadEggSales, loadMartabakSales, loadIngredients])

  const loadUsers = async () => {
    if (!supabase) return

    setUsersLoading(true)
    try {
      const { data: usersData, error } = await supabase
        .from("users")
        .select("id, email, full_name, role, cabang_id, access_pages, created_at")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading users:", error)
        toast({ title: "Error", description: "Gagal memuat data pengguna", variant: "destructive" })
        return
      }

      if (usersData) {
        // Get cabang names for users
        const usersWithCabang = await Promise.all(
          usersData.map(async (u) => {
            let cabangName = undefined
            if (u.cabang_id && supabase) {
              const { data: cabangData } = await supabase.from("cabang").select("name").eq("id", u.cabang_id).single()
              cabangName = cabangData?.name
            }
            return {
              id: u.id,
              name: u.full_name,
              email: u.email,
              role: u.role as "admin" | "karyawan",
              cabangId: u.cabang_id || undefined,
              cabangName,
              accessPages: u.access_pages || ["dashboard"],
              createdAt: u.created_at,
            }
          }),
        )

        setUsers(usersWithCabang)
        loadUserStats(usersWithCabang.map((u) => ({ id: u.id, cabangId: u.cabangId })))
      }
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setUsersLoading(false)
    }
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.password) {
      toast({ title: "Validasi Gagal", description: "Semua field wajib diisi", variant: "destructive" })
      return
    }

    if (formData.password.length < 6) {
      toast({ title: "Validasi Gagal", description: "Password minimal 6 karakter", variant: "destructive" })
      return
    }

    if (!formData.cabangId) {
      toast({ title: "Validasi Gagal", description: "Pilih cabang untuk karyawan", variant: "destructive" })
      return
    }

    const success = await register(formData.name, formData.email, formData.password, "karyawan", formData.cabangId, formData.accessPages)

    if (success) {
      toast({ title: "Berhasil", description: "Karyawan berhasil ditambahkan" })
      setFormData({ name: "", email: "", password: "", cabangId: "", accessPages: ["dashboard"] })
      setShowAddEmployee(false)
      loadUsers()
    } else {
      toast({ title: "Gagal", description: "Email sudah terdaftar", variant: "destructive" })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pengguna ini?")) return
    if (!supabase) return

    try {
      const { error } = await supabase.from("users").delete().eq("id", userId)
      if (error) throw error
      toast({ title: "Berhasil", description: "Pengguna dihapus" })
      loadUsers()
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({ title: "Gagal", description: "Gagal menghapus pengguna", variant: "destructive" })
    }
  }

  const handleUpdateUser = async (userId: string, updateData: { name?: string; cabangId?: string; accessPages?: string[] }) => {
    if (!supabase) return false

    try {
      const dbUpdate: Record<string, any> = {}
      if (updateData.name) dbUpdate.full_name = updateData.name
      if (updateData.cabangId !== undefined) dbUpdate.cabang_id = updateData.cabangId || null
      if (updateData.accessPages) dbUpdate.access_pages = updateData.accessPages

      const { error } = await supabase.from("users").update(dbUpdate).eq("id", userId)

      if (error) throw error

      toast({ title: "Berhasil", description: "Data pengguna diperbarui" })
      loadUsers()
      resetCrudForm()
      return true
    } catch (error) {
      console.error("Error updating user:", error)
      toast({ title: "Gagal", description: "Gagal mengupdate pengguna", variant: "destructive" })
      return false
    }
  }

  const loadUserStats = async (usersData: Array<{ id: string, cabangId?: string }>) => {
    if (!supabase) return
    try {
      const stats: Record<string, any> = {}

      // For each user, calculate stats based on their cabang (not user_id)
      // This matches dashboard logic where stats are per-cabang
      for (const userData of usersData) {
        const userId = userData.id
        const cabangId = userData.cabangId

        if (!cabangId) {
          stats[userId] = { eggRevenue: 0, martabakRevenue: 0, totalCost: 0, operational: 0, totalRevenue: 0, profit: 0 }
          continue
        }

        // Get current month range
        const now = new Date()
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        const startDate = firstDay.toISOString().split('T')[0]
        const endDate = lastDay.toISOString().split('T')[0]

        // Query all sales and costs by cabang_id (matching dashboard approach)
        const [eggSalesResult, martabakSalesResult, ingredientsResult, operationalResult] = await Promise.all([
          supabase.from("egg_sales")
            .select("total_price, date")
            .eq("cabang_id", cabangId)
            .gte("date", startDate)
            .lte("date", endDate + "T23:59:59"),
          supabase.from("martabak_sales")
            .select("total_price, date")
            .eq("cabang_id", cabangId)
            .gte("date", startDate)
            .lte("date", endDate + "T23:59:59"),
          supabase.from("ingredients")
            .select("cost, date")
            .eq("cabang_id", cabangId)
            .gte("date", startDate)
            .lte("date", endDate + "T23:59:59"),
          supabase.from("operational_expenses")
            .select("amount, date")
            .eq("cabang_id", cabangId)
            .gte("date", startDate)
            .lte("date", endDate + "T23:59:59"),
        ])

        const eggRevenue = (eggSalesResult.data || []).reduce((sum: number, s: any) => sum + parseFloat(s.total_price || 0), 0)
        const martabakRevenue = (martabakSalesResult.data || []).reduce((sum: number, m: any) => sum + parseFloat(m.total_price || 0), 0)
        const ingredientsCost = (ingredientsResult.data || []).reduce((sum: number, i: any) => sum + parseFloat(i.cost || 0), 0)
        const operationalCost = (operationalResult.data || []).reduce((sum: number, o: any) => sum + parseFloat(o.amount || 0), 0)

        const totalRevenue = eggRevenue + martabakRevenue
        const totalCost = ingredientsCost + operationalCost

        stats[userId] = {
          eggRevenue,
          martabakRevenue,
          totalCost,
          operational: operationalCost,
          totalRevenue,
          profit: totalRevenue - totalCost,
        }
      }
      setUserStats(stats)
    } catch (error) {
      console.error("Error loading user stats:", error)
    }
  }

  const getUserStats = (userId: string) => {
    return userStats[userId] || { totalRevenue: 0, totalCost: 0, profit: 0 }
  }

  const handleLoadCabangStats = async () => {
    if (!dateFilter.startDate || !dateFilter.endDate) {
      toast({ title: "Error", description: "Pilih tanggal terlebih dahulu", variant: "destructive" })
      return
    }
    setCabangStatsLoading(true)
    try {
      // Use date string directly (YYYY-MM-DD format) for loadCabangStats
      // The function will convert internally if needed
      const stats = await loadCabangStats(dateFilter.startDate, dateFilter.endDate)
      setCabangStats(stats)
      if (stats.length > 0) {
        toast({ description: `Data ringkasan diperbarui - ${stats.length} cabang` })
      } else {
        toast({ description: "Tidak ada data untuk periode ini", variant: "default" })
      }
    } catch (error) {
      console.error("Error loading cabang stats:", error)
      toast({ title: "Error", description: "Gagal memuat ringkasan", variant: "destructive" })
    } finally {
      setCabangStatsLoading(false)
    }
  }

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingIngredientId) return

    const updateData: any = {
      name: editIngredientForm.name,
      quantity: editIngredientForm.quantity,
      unit: editIngredientForm.unit,
      cost: editIngredientForm.cost,
      date: new Date(editIngredientForm.date).toISOString(),
    }
    if (editIngredientForm.cabangId) {
      updateData.cabangId = editIngredientForm.cabangId
    }

    const success = await updateIngredient(editingIngredientId, updateData)
    if (success) {
      setShowEditIngredientModal(false)
      setEditingIngredientId(null)
      toast({ title: "Berhasil", description: "Bahan baku diperbarui" })
    } else {
      toast({ title: "Gagal", description: "Gagal memperbarui bahan baku", variant: "destructive" })
    }
  }

  const resetCrudForm = () => {
    setShowAddForm(false)
    setEditingId(null)
    setCrudForm({})
  }

  if (loading || !mounted || !user || user.role !== "admin") return null

  // UI Components helpers
  const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</h3>
        </div>
        <div className={`p-3 rounded-xl bg-opacity-10 ${colorClass.replace('text-', 'bg-').replace('700', '500').replace('600', '500')}`}>
          {Icon && <Icon className={`w-6 h-6 ${colorClass}`} />}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <SidebarProvider>
      <Sidebar />
      <main className="lg:ml-72 pt-4 pb-24 lg:pt-8 lg:pb-8 min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-amber-50/20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-6">

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Admin Panel</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">Pusat kendali dan manajemen sistem</p>
            </div>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">Kembali ke Dashboard</Button>
            </Link>
          </div>

          <Tabs value={activeTab} onValueChange={(val: any) => {
            setActiveTab(val)
            // Load data when switching tabs - convert to ISO format
            if (val === "ringkasan" && dateFilter.startDate && dateFilter.endDate) {
              handleLoadCabangStats()
            } else if (val === "egg_stocks" && dateFilter.startDate && dateFilter.endDate) {
              const startISO = dateFilter.startDate.includes('T') ? dateFilter.startDate : `${dateFilter.startDate}T00:00:00.000Z`
              const endISO = dateFilter.endDate.includes('T') ? dateFilter.endDate : `${dateFilter.endDate}T23:59:59.999Z`
              loadEggStocks(undefined, startISO, endISO)
            } else if (val === "egg_sales" && dateFilter.startDate && dateFilter.endDate) {
              const startISO = dateFilter.startDate.includes('T') ? dateFilter.startDate : `${dateFilter.startDate}T00:00:00.000Z`
              const endISO = dateFilter.endDate.includes('T') ? dateFilter.endDate : `${dateFilter.endDate}T23:59:59.999Z`
              loadEggSales(undefined, startISO, endISO)
            } else if (val === "martabak_sales" && dateFilter.startDate && dateFilter.endDate) {
              const startISO = dateFilter.startDate.includes('T') ? dateFilter.startDate : `${dateFilter.startDate}T00:00:00.000Z`
              const endISO = dateFilter.endDate.includes('T') ? dateFilter.endDate : `${dateFilter.endDate}T23:59:59.999Z`
              loadMartabakSales(undefined, startISO, endISO)
            } else if (val === "ingredients" && dateFilter.startDate && dateFilter.endDate) {
              const startISO = dateFilter.startDate.includes('T') ? dateFilter.startDate : `${dateFilter.startDate}T00:00:00.000Z`
              const endISO = dateFilter.endDate.includes('T') ? dateFilter.endDate : `${dateFilter.endDate}T23:59:59.999Z`
              loadIngredients(undefined, startISO, endISO)
            }
          }}>
            <TabsList className="w-full justify-start h-auto p-2 bg-white rounded-xl border shadow-sm overflow-x-auto flex-nowrap mb-6">
              {[
                { id: "users", label: "Pengguna", icon: Users, shortLabel: "User" },
                { id: "cabang", label: "Cabang", icon: Building2, shortLabel: "Cabang" },
                { id: "ringkasan", label: "Ringkasan", icon: Activity, shortLabel: "Ringkas" },
                { id: "egg_stocks", label: "Stok Telur", icon: Package, shortLabel: "Stok" },
                { id: "egg_sales", label: "Jual Telur", icon: Egg, shortLabel: "Jual" },
                { id: "martabak_sales", label: "Martabak", icon: ChefHat, shortLabel: "Martabak" },
                { id: "ingredients", label: "Bahan", icon: Package, shortLabel: "Bahan" },
                { id: "database", label: "Database", icon: Database, shortLabel: "DB" },
              ].map(tab => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex-shrink-0 min-w-[90px] sm:min-w-[120px] py-2.5 px-2 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
                  <tab.icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* --- Users Tab --- */}
            <TabsContent value="users" className="space-y-6">
              {usersLoading ? (
                <>
                  <StatsGridSkeleton />
                  <TableSkeleton rows={5} columns={4} />
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard title="Total Pengguna" value={users.length} icon={Users} colorClass="text-blue-600" />
                    <StatCard title="Total Admin" value={users.filter(u => u.role === 'admin').length} icon={Eye} colorClass="text-purple-600" />
                    <StatCard title="Total Karyawan" value={users.filter(u => u.role === 'karyawan').length} icon={Users} colorClass="text-green-600" />
                  </div>

                  <Card className="border-none shadow-md">
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle>Daftar Karyawan</CardTitle>
                        <CardDescription>Kelola akses dan data karyawan</CardDescription>
                      </div>
                      <Button onClick={() => setShowAddEmployee(!showAddEmployee)} variant={showAddEmployee ? "secondary" : "default"} className="w-full sm:w-auto">
                        {showAddEmployee ? "Tutup Form" : "Tambah Karyawan"}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {showAddEmployee && (
                        <div className="bg-gray-50 p-6 rounded-xl mb-6 border animate-in slide-in-from-top-2">
                          <h3 className="font-semibold mb-4">Form Karyawan Baru</h3>
                          <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Nama Lengkap</label>
                              <input type="text" className="w-full p-2 border rounded-md" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Nama karyawan" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Email</label>
                              <input type="email" className="w-full p-2 border rounded-md" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="email@contoh.com" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Password</label>
                              <input type="password" className="w-full p-2 border rounded-md" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Minimal 6 karakter" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Penempatan Cabang</label>
                              <select className="w-full p-2 border rounded-md" value={formData.cabangId} onChange={e => setFormData({ ...formData, cabangId: e.target.value })}>
                                <option value="">Pilih Cabang</option>
                                {cabangs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                              <label className="text-sm font-medium">Akses Halaman</label>
                              <div className="flex flex-wrap gap-2">
                                {AVAILABLE_PAGES.filter(p => p.key !== "admin").map(page => (
                                  <label key={page.key} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-white bg-gray-50">
                                    <input type="checkbox"
                                      checked={formData.accessPages.includes(page.key)}
                                      onChange={(e) => {
                                        if (e.target.checked) setFormData({ ...formData, accessPages: [...formData.accessPages, page.key] })
                                        else setFormData({ ...formData, accessPages: formData.accessPages.filter(p => p !== page.key) })
                                      }}
                                    />
                                    <span className="text-sm">{page.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="md:col-span-2">
                              <Button type="submit" className="w-full">Simpan Karyawan</Button>
                            </div>
                          </form>
                        </div>
                      )}

                      <div className="rounded-xl border overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm min-w-[800px]">
                            <thead className="bg-gray-100/50">
                              <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Karyawan</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Cabang</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Omset</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Pengeluaran</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Keuntungan Bersih</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {users.filter(u => u.role === 'karyawan').map(user => {
                                const stats = getUserStats(user.id)
                                return (
                                  <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-4 py-4">
                                      <div className="font-medium text-gray-900">{user.name}</div>
                                      <div className="text-gray-500 text-xs">{user.email}</div>
                                    </td>
                                    <td className="px-4 py-4">
                                      <Badge variant="outline">{user.cabangName || 'Belum Ditentukan'}</Badge>
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="text-blue-600 font-medium">Rp {stats.totalRevenue.toLocaleString('id-ID')}</div>
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="text-red-500 font-medium">Rp {stats.totalCost.toLocaleString('id-ID')}</div>
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className={`font-medium ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {stats.profit >= 0 ? '+' : ''}Rp {stats.profit.toLocaleString('id-ID')}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="outline" onClick={() => {
                                          setEditingId(user.id)
                                          setCrudForm({ name: user.name, email: user.email, cabangId: user.cabangId || "", accessPages: user.accessPages || [] })
                                          setShowAddForm(true)
                                        }}><Edit className="w-4 h-4" /></Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id)}><Trash2 className="w-4 h-4" /></Button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* --- Cabang Tab --- */}
            <TabsContent value="cabang" className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
                <h3 className="font-semibold text-lg">Manajemen Cabang</h3>
                <Button onClick={() => { setShowAddCabang(true); setEditingCabang(null); setCabangForm({ name: "", description: "" }) }}>
                  <Plus className="w-4 h-4 mr-2" /> Tambah Cabang
                </Button>
              </div>

              {showAddCabang && (
                <Card className="border-orange-200 bg-orange-50/50">
                  <CardHeader><CardTitle>{editingCabang ? 'Edit Cabang' : 'Cabang Baru'}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex gap-4 items-end">
                      <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">Nama Cabang</label>
                        <input type="text" className="w-full p-2 border rounded-md bg-white" value={cabangForm.name} onChange={e => setCabangForm({ ...cabangForm, name: e.target.value })} placeholder="Contoh: Pusat" />
                      </div>
                      <div className="flex-[2] space-y-2">
                        <label className="text-sm font-medium">Deskripsi</label>
                        <input type="text" className="w-full p-2 border rounded-md bg-white" value={cabangForm.description} onChange={e => setCabangForm({ ...cabangForm, description: e.target.value })} placeholder="Keterangan lokasi..." />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={async () => {
                          const success = editingCabang ? await updateCabang(editingCabang, cabangForm.name, cabangForm.description) : await addCabang(cabangForm.name, cabangForm.description)
                          if (success) {
                            toast({ title: "Berhasil", description: "Data cabang disimpan" })
                            setShowAddCabang(false)
                          } else {
                            toast({ title: "Gagal", description: "Gagal menyimpan data", variant: "destructive" })
                          }
                        }}>Simpan</Button>
                        <Button variant="ghost" onClick={() => setShowAddCabang(false)}>Batal</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cabangs.map(c => (
                  <Card key={c.id} className="hover:shadow-md transition-all group">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                            setEditingCabang(c.id); setCabangForm({ name: c.name, description: c.description || "" }); setShowAddCabang(true)
                          }}><Edit className="w-4 h-4 text-gray-500" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-red-600" onClick={async () => {
                            if (confirm("Hapus cabang ini?")) {
                              await deleteCabang(c.id); toast({ description: "Cabang dihapus" })
                            }
                          }}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{c.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{c.description || "Tidak ada deskripsi"}</p>
                      <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                        <span className="text-gray-500">Karyawan</span>
                        <span className="font-semibold">{users.filter(u => u.cabangId === c.id).length} Orang</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* --- Ringkasan Tab --- */}
            <TabsContent value="ringkasan" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Laporan Performa Cabang</CardTitle>
                    <CardDescription>Analisis pendapatan dan profitabilitas per lokasi</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-gray-50 p-2 rounded-lg border w-full sm:w-auto">
                    <Calendar className="w-4 h-4 text-gray-500 hidden sm:block" />
                    <input
                      type="date"
                      value={dateFilter.startDate}
                      onChange={e => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                      className="bg-white text-sm outline-none px-2 py-1.5 rounded border w-full sm:w-32"
                    />
                    <span className="text-gray-400 text-center hidden sm:block">-</span>
                    <input
                      type="date"
                      value={dateFilter.endDate}
                      onChange={e => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                      className="bg-white text-sm outline-none px-2 py-1.5 rounded border w-full sm:w-32"
                    />
                    <Button size="sm" onClick={handleLoadCabangStats} className="w-full sm:w-auto" disabled={cabangStatsLoading}>
                      {cabangStatsLoading ? "Loading..." : "Filter"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportCabangSummaryToExcel(cabangStats, { start: dateFilter.startDate, end: dateFilter.endDate })} disabled={cabangStats.length === 0} className="w-full sm:w-auto">
                      <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {cabangStatsLoading ? (
                    <div className="space-y-4">
                      <CabangStatSkeleton />
                      <CabangStatSkeleton />
                      <CabangStatSkeleton />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cabangStats.length === 0 ? <div className="text-center py-10 text-gray-500">Tidak ada data untuk periode ini</div> : cabangStats.map(stat => (
                        <div key={stat.cabangId} className="border rounded-xl p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedCabangDetail(selectedCabangDetail === stat.cabangId ? null : stat.cabangId)}>
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold flex-shrink-0">
                                {stat.cabangName.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-gray-900 truncate">{stat.cabangName}</h4>
                                <p className="text-xs text-gray-500">{stat.eggSalesCount + stat.martabakSalesCount} Transaksi</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-8 flex-1 sm:justify-end">
                              <div className="text-center sm:text-left">
                                <p className="text-xs text-gray-500 uppercase">Omset</p>
                                <p className="font-bold text-gray-900 text-sm sm:text-base">Rp {stat.totalRevenue.toLocaleString('id-ID')}</p>
                              </div>
                              <div className="text-center sm:text-left">
                                <p className="text-xs text-gray-500 uppercase">Biaya</p>
                                <p className="font-medium text-red-600 text-sm sm:text-base">Rp {stat.totalCost.toLocaleString('id-ID')}</p>
                              </div>
                              <div className="text-center sm:text-left">
                                <p className="text-xs text-gray-500 uppercase">Profit</p>
                                <p className={`font-bold text-sm sm:text-base ${stat.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>Rp {stat.netProfit.toLocaleString('id-ID')}</p>
                              </div>
                            </div>
                          </div>
                          {selectedCabangDetail === stat.cabangId && (
                            <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-in slide-in-from-top-1">
                              <div className="bg-white p-3 border rounded text-xs space-y-1">
                                <strong className="block text-gray-600 mb-2">Penjualan Telur</strong>
                                <div className="flex justify-between"><span>Transaksi:</span> <span>{stat.eggSalesCount}</span></div>
                                <div className="flex justify-between"><span>Pendapatan:</span> <span>Rp {stat.eggRevenue.toLocaleString('id-ID')}</span></div>
                              </div>
                              <div className="bg-white p-3 border rounded text-xs space-y-1">
                                <strong className="block text-gray-600 mb-2">Penjualan Martabak</strong>
                                <div className="flex justify-between"><span>Transaksi:</span> <span>{stat.martabakSalesCount}</span></div>
                                <div className="flex justify-between"><span>Pendapatan:</span> <span>Rp {stat.martabakRevenue.toLocaleString('id-ID')}</span></div>
                              </div>
                              <div className="bg-red-50 p-3 border border-red-100 rounded text-xs space-y-1">
                                <strong className="block text-red-700 mb-2">Total Pengeluaran</strong>
                                <div className="flex justify-between"><span>Bahan Baku:</span> <span>Rp {stat.totalCost.toLocaleString('id-ID')}</span></div>
                                <div className="flex justify-between"><span>Operasional:</span> <span>Rp {stat.operationalCost.toLocaleString('id-ID')}</span></div>
                                <div className="flex justify-between font-semibold mt-1 pt-1 border-t border-red-200"><span>Total:</span> <span>Rp {(stat.totalCost + stat.operationalCost).toLocaleString('id-ID')}</span></div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- Other Data Tables --- */}
            {['egg_stocks', 'egg_sales', 'martabak_sales', 'ingredients'].map(tabKey => {
              if (activeTab !== tabKey) return null
              const isStock = tabKey === 'egg_stocks'
              const isEgg = tabKey === 'egg_sales'
              const isMartabak = tabKey === 'martabak_sales'
              const isIng = tabKey === 'ingredients'

              const data = isStock ? eggStocks : isEgg ? eggSales : isMartabak ? martabakSales : ingredients
              const handleDelete = isStock ? deleteEggStock : isEgg ? deleteEggSale : isMartabak ? deleteMartabakSale : deleteIngredient

              return (
                <TabsContent key={tabKey} value={tabKey}>
                  <Card>
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle>Data {isStock ? 'Stok Telur' : isEgg ? 'Penjualan Telur' : isMartabak ? 'Penjualan Martabak' : 'Bahan Baku'}</CardTitle>
                        <CardDescription>Total {data.length} baris data</CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <Button variant="outline" size="sm" onClick={() => {
                          if (isStock) exportEggStocksToExcel(data as any)
                          else if (isEgg) exportEggSalesToExcel(data as any)
                          else if (isMartabak) exportMartabakSalesToExcel(data as any)
                          else exportIngredientsToExcel(data as any)
                        }} className="w-full sm:w-auto">
                          <Download className="w-4 h-4 mr-2" /> Export Excel
                        </Button>
                        <Button size="sm" onClick={() => {
                          if (isStock) { setShowAddEggStock(true); setEditingEggStockId(null); }
                          if (isEgg) { setShowAddEggSale(true); setEditingEggSaleId(null); }
                          if (isMartabak) { setShowAddMartabakSale(true); setEditingMartabakSaleId(null); }
                          if (isIng) { setShowEditIngredientModal(true); setEditingIngredientId(null); }
                        }} className="w-full sm:w-auto">
                          <Plus className="w-4 h-4 mr-2" /> Tambah Data
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto -mx-0 sm:mx-0">
                        <div className="inline-block min-w-full align-middle">
                          <table className="w-full text-sm min-w-[800px]">
                            <thead className="bg-gray-100/50">
                              <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Tanggal</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Cabang</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Detail Info</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Nilai (Rp)</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-500">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {data.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                                    {formatDateTimeWITA(item.date, item.createdAt)}
                                  </td>
                                  <td className="px-4 py-3 font-medium">{item.cabangName || '-'}</td>
                                  <td className="px-4 py-3">
                                    {isStock && <span className="capitalize">{item.size}, {item.totalEggs} butir</span>}
                                    {isEgg && <span className="capitalize">{item.size}, {item.quantity} butir</span>}
                                    {isMartabak && <span>{item.quantity} Porsi ({item.eggsUsed} telur)</span>}
                                    {isIng && <span>{item.name} ({item.quantity} {item.unit})</span>}
                                  </td>
                                  <td className={`px-4 py-3 text-right font-medium ${isIng ? 'text-red-600' : 'text-green-600'}`}>
                                    Rp {(item.totalPrice || item.cost || (item.totalEggs * item.pricePerEgg) || 0).toLocaleString('id-ID')}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="flex justify-center gap-1">
                                      {isIng && (
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                                          setEditingIngredientId(item.id)
                                          setEditIngredientForm({
                                            name: item.name, quantity: item.quantity, unit: item.unit, cost: item.cost,
                                            date: item.date.split('T')[0], cabangId: item.cabangId || ""
                                          })
                                          setShowEditIngredientModal(true)
                                        }}><Edit className="w-3 h-3" /></Button>
                                      )}
                                      {isStock && (
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                                          setEditingEggStockId(item.id)
                                          setEggStockForm({ size: item.size, rackCount: item.rackCount, pricePerEgg: item.pricePerEgg, date: item.date.split('T')[0], cabangId: item.cabangId || "" })
                                          setShowAddEggStock(true)
                                        }}><Edit className="w-3 h-3" /></Button>
                                      )}
                                      {isEgg && (
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                                          setEditingEggSaleId(item.id)
                                          setEggSaleForm({ size: item.size, quantity: item.quantity, pricePerEgg: item.pricePerEgg, date: item.date.split('T')[0], cabangId: item.cabangId || "" })
                                          setShowAddEggSale(true)
                                        }}><Edit className="w-3 h-3" /></Button>
                                      )}
                                      {isMartabak && (
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                                          const pcs = item.quantity || 5
                                          setEditingMartabakSaleId(item.id)
                                          setMartabakSaleForm({ cupCount: Math.ceil(pcs / 5), martabakPcs: pcs, pricePerPcs: item.pricePerUnit || 2000, date: item.date.split('T')[0], cabangId: item.cabangId || "" })
                                          setShowAddMartabakSale(true)
                                        }}><Edit className="w-3 h-3" /></Button>
                                      )}
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={async () => {
                                        if (confirm("Hapus data ini?")) {
                                          await handleDelete(item.id)
                                          toast({ description: "Data dihapus" })
                                        }
                                      }}><Trash2 className="w-3 h-3" /></Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )
            })}

            {/* --- Database Usage Tab --- */}
            <TabsContent value="database" className="space-y-6">
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <Database className="w-5 h-5 text-orange-500" />
                        <span className="hidden sm:inline">Penggunaan Database Supabase</span>
                        <span className="sm:hidden">Database Usage</span>
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-1">Estimasi penggunaan storage berdasarkan struktur kolom PostgreSQL</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={handleBackup} disabled={isBackingUp || dbStats.loading} className="flex-1 sm:flex-none">
                        <Download className={`w-4 h-4 mr-1 sm:mr-2 ${isBackingUp ? 'animate-bounce' : ''}`} />
                        <span className="hidden sm:inline">{isBackingUp ? 'Backing up...' : 'Backup SQL'}</span>
                        <span className="sm:hidden">{isBackingUp ? '...' : 'Backup'}</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => dbStats.refresh()} disabled={dbStats.loading} className="flex-1 sm:flex-none">
                        <RefreshCw className={`w-4 h-4 mr-1 sm:mr-2 ${dbStats.loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-blue-100">
                            <HardDrive className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Total Records</p>
                            <p className="text-2xl font-bold text-gray-900">{(dbStats?.totalRows || 0).toLocaleString('id-ID')}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-orange-100">
                            <Database className="w-6 h-6 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Data Size</p>
                            <p className="text-2xl font-bold text-gray-900">{formatBytes(dbStats?.totalDataSizeBytes || 0)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-purple-100">
                            <Activity className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Index Size</p>
                            <p className="text-2xl font-bold text-gray-900">{formatBytes(dbStats?.totalIndexSizeBytes || 0)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-green-100">
                            <BadgeCheck className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Free Tier</p>
                            <p className="text-2xl font-bold text-gray-900">{dbStats?.freeTierLimits?.databaseMB || 500} MB</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Usage Progress Bar */}
                  <Card className={`border shadow-sm ${getUsageStatusColor(dbStats?.usagePercent || 0).bg}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Penggunaan Database</span>
                        <span className={`text-sm font-bold ${getUsageStatusColor(dbStats?.usagePercent || 0).text}`}>
                          {(dbStats?.usagePercent || 0).toFixed(4)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getUsageStatusColor(dbStats?.usagePercent || 0).bar}`}
                          style={{ width: `${Math.max(Math.min(dbStats?.usagePercent || 0, 100), 0.5)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2">
                        <p className="text-xs text-gray-500">{formatBytes(dbStats?.totalSizeBytes || 0)} used</p>
                        <p className="text-xs text-gray-500">{dbStats?.freeTierLimits?.databaseMB || 500} MB limit</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Missing Tables Warning */}
                  {(dbStats?.tablesMissing?.length || 0) > 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <p className="text-sm text-yellow-800">
                        <strong>⚠️ Tabel tidak ditemukan:</strong> {dbStats.tablesMissing?.join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Detailed Table Stats */}
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>Detail per Tabel</span>
                        <span className="text-sm font-normal text-gray-500">{dbStats?.tablesFound || 0} tabel ditemukan</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dbStats?.loading ? (
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
                          <span className="ml-2 text-gray-500">Memuat data dari Supabase...</span>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Tabel</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Records</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Avg/Row</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Total Size</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(dbStats?.tables || []).map((table, idx) => (
                                <tr key={table.name} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${table.count > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                                      <span className="font-medium text-gray-800">{table.displayName}</span>
                                      <span className="text-xs text-gray-400">({table.name})</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono text-gray-700">{(table?.count || 0).toLocaleString('id-ID')}</td>
                                  <td className="py-3 px-4 text-right font-mono text-gray-500 text-sm">{table?.avgRowSizeBytes || 0} B</td>
                                  <td className="py-3 px-4 text-right font-mono text-gray-700">{formatBytes(table?.estimatedSizeBytes || 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-gray-300 bg-orange-50">
                                <td className="py-3 px-4 font-bold text-gray-800">Total</td>
                                <td className="py-3 px-4 text-right font-bold font-mono text-gray-800">{(dbStats?.totalRows || 0).toLocaleString('id-ID')}</td>
                                <td className="py-3 px-4 text-right font-mono text-gray-500">-</td>
                                <td className="py-3 px-4 text-right font-bold font-mono text-orange-600">{formatBytes(dbStats?.totalSizeBytes || 0)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Supabase Free Tier Info */}
                  <Card className="border shadow-sm bg-gradient-to-r from-gray-50 to-gray-100">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Supabase Free Tier Limits</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Database</p>
                          <p className="font-bold text-gray-800">{dbStats?.freeTierLimits?.databaseMB || 500} MB</p>
                        </div>
                        <div>
                          <p className="text-gray-500">File Storage</p>
                          <p className="font-bold text-gray-800">{dbStats?.freeTierLimits?.storageMB ? (dbStats.freeTierLimits.storageMB / 1024).toFixed(0) : 1} GB</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Bandwidth</p>
                          <p className="font-bold text-gray-800">{dbStats?.freeTierLimits?.bandwidthGB || 2} GB/mo</p>
                        </div>
                        <div>
                          <p className="text-gray-500">API Requests</p>
                          <p className="font-bold text-gray-800">{((dbStats?.freeTierLimits?.apiRequestsPerDay || 500000) / 1000).toFixed(0)}K/day</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Notes */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-800">
                      <strong>📊 Catatan:</strong> Estimasi dihitung berdasarkan ukuran kolom PostgreSQL (UUID=16B, TEXT~54B, TIMESTAMP=8B, INTEGER=4B, DECIMAL=8B) + overhead 23B per baris + ukuran index.
                      Untuk data akurat 100%, cek <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-blue-600">Supabase Dashboard</a> → Project → Settings → Usage.
                    </p>
                  </div>

                  {dbStats?.lastUpdated && (
                    <p className="text-xs text-gray-400 text-center">
                      Terakhir diperbarui: {dbStats.lastUpdated.toLocaleString('id-ID')} |
                      Metode: Column-based estimation
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Edit User Modal */}
          {showAddForm && editingId && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle>Edit Karyawan</CardTitle>
                  <Button variant="ghost" size="sm" onClick={resetCrudForm}><X className="w-4 h-4" /></Button>
                </CardHeader>
                <CardContent className="pt-4">
                  <form onSubmit={async (e) => {
                    e.preventDefault()
                    await handleUpdateUser(editingId, {
                      name: crudForm.name,
                      cabangId: crudForm.cabangId,
                      accessPages: crudForm.accessPages
                    })
                    setShowAddForm(false)
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nama</label>
                      <input type="text" className="w-full p-2 border rounded-md" value={crudForm.name} onChange={e => setCrudForm({ ...crudForm, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cabang</label>
                      <select className="w-full p-2 border rounded-md" value={crudForm.cabangId} onChange={e => setCrudForm({ ...crudForm, cabangId: e.target.value })}>
                        <option value="">Pilih Cabang</option>
                        {cabangs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Akses</label>
                      <div className="p-2 border rounded-md max-h-32 overflow-y-auto space-y-1">
                        {AVAILABLE_PAGES.filter(p => p.key !== 'admin').map(p => (
                          <label key={p.key} className="flex items-center gap-2">
                            <input type="checkbox" checked={(crudForm.accessPages || []).includes(p.key)}
                              onChange={e => {
                                const current = crudForm.accessPages || []
                                if (e.target.checked) setCrudForm({ ...crudForm, accessPages: [...current, p.key] })
                                else setCrudForm({ ...crudForm, accessPages: current.filter((x: any) => x !== p.key) })
                              }}
                            />
                            <span className="text-sm">{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <Button type="submit" className="w-full">Simpan Perubahan</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Edit Ingredient Modal */}
          {showEditIngredientModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle>Edit Bahan Baku</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowEditIngredientModal(false)}><X className="w-4 h-4" /></Button>
                </CardHeader>
                <CardContent className="pt-4">
                  <form onSubmit={handleSaveIngredient} className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-500 uppercase font-bold">Tanggal</label>
                      <input type="date" className="w-full p-2 border rounded-md" value={editIngredientForm.date} onChange={e => setEditIngredientForm({ ...editIngredientForm, date: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase font-bold">Cabang</label>
                      <select className="w-full p-2 border rounded-md" value={editIngredientForm.cabangId} onChange={e => setEditIngredientForm({ ...editIngredientForm, cabangId: e.target.value })}>
                        <option value="">Pilih Cabang</option>
                        {cabangs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase font-bold">Nama Bahan</label>
                      <input type="text" className="w-full p-2 border rounded-md" placeholder="Nama Bahan" value={editIngredientForm.name} onChange={e => setEditIngredientForm({ ...editIngredientForm, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Jml</label>
                        <input type="number" className="w-full p-2 border rounded-md" placeholder="Qty" value={editIngredientForm.quantity} onChange={e => setEditIngredientForm({ ...editIngredientForm, quantity: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Satuan</label>
                        <select className="w-full p-2 border rounded-md" value={editIngredientForm.unit} onChange={e => setEditIngredientForm({ ...editIngredientForm, unit: e.target.value })}>
                          {UNIT_OPTIONS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase font-bold">Total Biaya (Rp)</label>
                      <input type="number" className="w-full p-2 border rounded-md" placeholder="Biaya (Rp)" value={editIngredientForm.cost} onChange={e => setEditIngredientForm({ ...editIngredientForm, cost: Number(e.target.value) })} />
                    </div>
                    <Button type="submit" className="w-full">Simpan</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Egg Stock Modal */}
          {showAddEggStock && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle>{editingEggStockId ? 'Edit Stok Telur' : 'Input Stok Masuk'}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddEggStock(false)}><X className="w-4 h-4" /></Button>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tanggal</label>
                        <input type="date" className="w-full p-2 border rounded-md" value={eggStockForm.date} onChange={e => setEggStockForm({ ...eggStockForm, date: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Ukuran</label>
                        <select className="w-full p-2 border rounded-md" value={eggStockForm.size} onChange={e => setEggStockForm({ ...eggStockForm, size: e.target.value })}>
                          <option value="kecil">Kecil</option>
                          <option value="sedang">Sedang</option>
                          <option value="besar">Besar</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Jumlah Rak</label>
                        <input type="number" className="w-full p-2 border rounded-md" value={eggStockForm.rackCount} onChange={e => setEggStockForm({ ...eggStockForm, rackCount: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Harga/Butir</label>
                        <input type="number" className="w-full p-2 border rounded-md" value={eggStockForm.pricePerEgg} onChange={e => setEggStockForm({ ...eggStockForm, pricePerEgg: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cabang</label>
                      <select className="w-full p-2 border rounded-md" value={eggStockForm.cabangId} onChange={e => setEggStockForm({ ...eggStockForm, cabangId: e.target.value })}>
                        <option value="">Pilih Cabang</option>
                        {cabangs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <Button className="w-full" onClick={async () => {
                      if (!eggStockForm.cabangId) { toast({ title: "Error", description: "Pilih cabang!", variant: "destructive" }); return }
                      const payload = {
                        size: eggStockForm.size as "besar" | "kecil" | "sedang", rackCount: eggStockForm.rackCount, eggsPerRack: 35, pricePerEgg: eggStockForm.pricePerEgg,
                        totalEggs: eggStockForm.rackCount * 35, date: eggStockForm.date ? new Date(eggStockForm.date).toISOString() : getCurrentDateTimeWITA(), cabangId: eggStockForm.cabangId, userId: user?.id || ""
                      }
                      const success = editingEggStockId ? await updateEggStock(editingEggStockId, payload) : await addEggStock(payload)
                      if (success) { toast({ title: "Berhasil" }); setShowAddEggStock(false); loadEggStocks(dateFilter.startDate, dateFilter.endDate); }
                    }}>Simpan</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Egg Sale Modal */}
          {showAddEggSale && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle>{editingEggSaleId ? 'Edit Jual Telur' : 'Input Penjualan Telur'}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddEggSale(false)}><X className="w-4 h-4" /></Button>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tanggal</label>
                        <input type="date" className="w-full p-2 border rounded-md" value={eggSaleForm.date} onChange={e => setEggSaleForm({ ...eggSaleForm, date: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Ukuran</label>
                        <select className="w-full p-2 border rounded-md" value={eggSaleForm.size} onChange={e => setEggSaleForm({ ...eggSaleForm, size: e.target.value })}>
                          <option value="kecil">Kecil</option>
                          <option value="sedang">Sedang</option>
                          <option value="besar">Besar</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Jumlah Butir</label>
                        <input type="number" className="w-full p-2 border rounded-md" value={eggSaleForm.quantity} onChange={e => setEggSaleForm({ ...eggSaleForm, quantity: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Harga/Butir</label>
                        <input type="number" className="w-full p-2 border rounded-md" value={eggSaleForm.pricePerEgg} onChange={e => setEggSaleForm({ ...eggSaleForm, pricePerEgg: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cabang</label>
                      <select className="w-full p-2 border rounded-md" value={eggSaleForm.cabangId} onChange={e => setEggSaleForm({ ...eggSaleForm, cabangId: e.target.value })}>
                        <option value="">Pilih Cabang</option>
                        {cabangs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <Button className="w-full" onClick={async () => {
                      if (!eggSaleForm.cabangId) { toast({ title: "Error", description: "Pilih cabang!", variant: "destructive" }); return }
                      const payload = {
                        size: eggSaleForm.size as "besar" | "kecil" | "sedang", quantity: eggSaleForm.quantity, pricePerEgg: eggSaleForm.pricePerEgg,
                        totalPrice: eggSaleForm.quantity * eggSaleForm.pricePerEgg, date: eggSaleForm.date ? new Date(eggSaleForm.date).toISOString() : getCurrentDateTimeWITA(), cabangId: eggSaleForm.cabangId, userId: user?.id || ""
                      }
                      const success = editingEggSaleId ? await updateEggSale(editingEggSaleId, payload) : await addEggSale(payload)
                      if (success) {
                        toast({ title: "Berhasil" });
                        setShowAddEggSale(false);
                        const startISO = dateFilter.startDate.includes('T') ? dateFilter.startDate : `${dateFilter.startDate}T00:00:00.000Z`
                        const endISO = dateFilter.endDate.includes('T') ? dateFilter.endDate : `${dateFilter.endDate}T23:59:59.999Z`
                        loadEggSales(undefined, startISO, endISO);
                      }
                    }}>Simpan</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Martabak Sale Modal */}
          {showAddMartabakSale && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle>{editingMartabakSaleId ? 'Edit' : 'Tambah'} Penjualan Martabak Bola</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddMartabakSale(false)}><X className="w-4 h-4" /></Button>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tanggal</label>
                      <input type="date" className="w-full p-2 border rounded-md" value={martabakSaleForm.date} onChange={e => setMartabakSaleForm({ ...martabakSaleForm, date: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Jumlah Cup</label>
                        <input type="number" min="1" className="w-full p-2 border rounded-md" value={martabakSaleForm.cupCount} onChange={e => {
                          const cups = Math.max(1, Number(e.target.value))
                          setMartabakSaleForm({ ...martabakSaleForm, cupCount: cups, martabakPcs: cups * 5 })
                        }} />
                        <p className="text-xs text-gray-500">1 cup = 5 martabak</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Jumlah Martabak (Pcs)</label>
                        <input type="number" min="1" className="w-full p-2 border rounded-md" value={martabakSaleForm.martabakPcs} onChange={e => {
                          const pcs = Math.max(1, Number(e.target.value))
                          setMartabakSaleForm({ ...martabakSaleForm, martabakPcs: pcs, cupCount: Math.ceil(pcs / 5) })
                        }} />
                        <p className="text-xs text-gray-500">Telur: {Math.ceil(martabakSaleForm.martabakPcs / 5)} butir</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Harga Per Pcs (Rp)</label>
                      <input type="number" min="0" className="w-full p-2 border rounded-md" value={martabakSaleForm.pricePerPcs} onChange={e => setMartabakSaleForm({ ...martabakSaleForm, pricePerPcs: Math.max(0, Number(e.target.value)) })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cabang</label>
                      <select className="w-full p-2 border rounded-md" value={martabakSaleForm.cabangId} onChange={e => setMartabakSaleForm({ ...martabakSaleForm, cabangId: e.target.value })}>
                        <option value="">Pilih Cabang</option>
                        {cabangs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="bg-gray-100 p-3 rounded-lg flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total</span>
                      <span className="font-bold text-lg text-red-600">Rp {(martabakSaleForm.martabakPcs * martabakSaleForm.pricePerPcs).toLocaleString('id-ID')}</span>
                    </div>
                    <Button className="w-full bg-red-500 hover:bg-red-600" onClick={async () => {
                      if (!martabakSaleForm.cabangId) { toast({ title: "Error", description: "Pilih cabang!", variant: "destructive" }); return }
                      const payload = {
                        quantity: martabakSaleForm.martabakPcs,
                        pricePerUnit: martabakSaleForm.pricePerPcs,
                        eggsUsed: Math.ceil(martabakSaleForm.martabakPcs / 5),
                        totalPrice: martabakSaleForm.martabakPcs * martabakSaleForm.pricePerPcs,
                        date: martabakSaleForm.date ? new Date(martabakSaleForm.date).toISOString() : getCurrentDateTimeWITA(),
                        cabangId: martabakSaleForm.cabangId,
                        userId: user?.id || ""
                      }
                      const success = editingMartabakSaleId ? await updateMartabakSale(editingMartabakSaleId, payload) : await addMartabakSale(payload)
                      if (success) {
                        toast({ title: "Berhasil" });
                        setShowAddMartabakSale(false);
                        setMartabakSaleForm({ cupCount: 1, martabakPcs: 5, pricePerPcs: 2000, date: getCurrentDateWITA(), cabangId: "" })
                        const startISO = dateFilter.startDate.includes('T') ? dateFilter.startDate : `${dateFilter.startDate}T00:00:00.000Z`
                        const endISO = dateFilter.endDate.includes('T') ? dateFilter.endDate : `${dateFilter.endDate}T23:59:59.999Z`
                        loadMartabakSales(undefined, startISO, endISO);
                      }
                    }}>Simpan</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </main>
    </SidebarProvider>
  )
}
