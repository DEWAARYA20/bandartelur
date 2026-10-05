"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useCabang } from "@/hooks/use-cabang"
import { useMartabakSales, useIngredients } from "@/hooks/use-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { SidebarProvider } from "@/components/sidebar-context"
import { useToast } from "@/hooks/use-toast"
import { formatDateTimeWITA, getCurrentDateWITA, getCurrentDateTimeWITA } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Plus, X, Printer, Package, ShoppingBag, Calendar, Filter, ChefHat, Building2, Store } from "lucide-react"
import { StatsGridSkeleton, TableSkeleton } from "@/components/ui/loading-skeletons"

// Constants
const UNIT_OPTIONS = [
  "kg", "gram", "liter", "ml", "pcs", "butir", "ikat",
  "bungkus", "kaleng", "botol", "sachet", "box", "karung", "dus", "renteng"
]

export default function MartabakPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { cabangs } = useCabang()
  const { toast } = useToast()

  const { martabakSales, loading: salesLoading, loadMartabakSales, addMartabakSale, updateMartabakSale, deleteMartabakSale } = useMartabakSales()
  const { ingredients, loading: ingredientsLoading, loadIngredients, addIngredient, updateIngredient, deleteIngredient } = useIngredients()

  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<"penjualan" | "bahan">("penjualan")

  // Selection for Admin
  const [selectedCabangId, setSelectedCabangId] = useState<string>("") // Empty string means ALL for Admin

  // Filters
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: ""
  })

  // Forms
  const [showAddSales, setShowAddSales] = useState(false)
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null)
  const [salesForm, setSalesForm] = useState<{
    cupCount: number | string;
    martabakPcs: number | string;
    pricePerPcs: number | string;
    cabangId: string;
  }>({
    cupCount: "",       // Jumlah Cup - kosong untuk input manual
    martabakPcs: "",    // Jumlah Martabak Bola (Pcs) - kosong untuk input manual
    pricePerPcs: "",    // Harga Per Pcs - kosong untuk input manual
    cabangId: "",       // Add cabangId to state
  })

  const [showAddIngredient, setShowAddIngredient] = useState(false)
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null)
  const [ingredientForm, setIngredientForm] = useState({
    name: "",
    quantity: 0,
    unit: "kg",
    cost: 0,
    cabangId: "", // Add cabangId to form state
  })

  useEffect(() => {
    setMounted(true)
    // Initialize date filter with WITA timezone
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
  }, [])

  // Removed the useEffect that forced selectedCabangId to first branch for admin
  // This allows "All Cabang" (empty string) to be default for admins

  const loadData = useCallback(() => {
    if (!authLoading && user && mounted && dateFilter.startDate && dateFilter.endDate) {
      // Critical: For Admin, if selectedCabangId is empty, we must pass undefined to load ALL.
      // For User, we use their cabangId.
      const targetCabang = user.role === 'admin' ? (selectedCabangId || undefined) : user.cabangId

      loadMartabakSales(targetCabang, dateFilter.startDate, dateFilter.endDate)
      loadIngredients(targetCabang, dateFilter.startDate, dateFilter.endDate)
    }
  }, [authLoading, user, mounted, dateFilter, selectedCabangId, loadMartabakSales, loadIngredients])

  // Load Data Trigger
  useEffect(() => {
    if (dateFilter.startDate && dateFilter.endDate) {
      loadData()
    } else if (!authLoading && !user && mounted) {
      router.push("/login")
    } else if (!authLoading && user && user.role !== 'admin' && !user.accessPages.includes('martabak-sales')) {
      router.push("/dashboard")
      toast({ title: "Akses Ditolak", description: "Anda tidak memiliki izin akses halaman ini", variant: "destructive" })
    }
  }, [loadData, authLoading, user, mounted, router, toast])

  const currentCabangId = user?.role === 'admin' ? selectedCabangId : user?.cabangId

  const getCabangName = useCallback((id?: string) => {
    if (!id) return "-"
    const c = cabangs.find(c => c.id === id)
    return c ? c.name : "-"
  }, [cabangs])

  // Calculations (on filtered data)
  const totalOmset = martabakSales.reduce((sum, s) => sum + s.totalPrice, 0)
  const totalBahan = ingredients.reduce((sum, s) => sum + s.cost, 0)
  const totalProfit = totalOmset - totalBahan // Profit Kasar

  // --- Handlers Sales ---

  const handleSubmitSales = async () => {
    try {
      const formCabang = salesForm.cabangId
      const targetCabang = user?.role === 'admin' ? (formCabang || selectedCabangId) : user?.cabangId

      console.log("Submitting Martabak Bola Sale...", { salesForm, targetCabang })

      if (!targetCabang) {
        console.error("No cabang selected")
        toast({ title: "Error", description: "Pilih cabang terlebih dahulu untuk menambah data", variant: "destructive" })
        return
      }
      if (!user) return

      // Convert to numbers (form values might be strings)
      const totalMartabak = Number(salesForm.martabakPcs) || 0
      const pricePerPcs = Number(salesForm.pricePerPcs) || 0
      const eggsNeeded = Math.ceil(totalMartabak / 5)

      const payload = {
        userId: user.id,
        quantity: totalMartabak,
        pricePerUnit: pricePerPcs,
        totalPrice: totalMartabak * pricePerPcs,
        eggsUsed: eggsNeeded,
        date: getCurrentDateTimeWITA(),
        cabangId: targetCabang
      }

      console.log("Payload:", payload)
      let success = false
      if (editingSaleId) {
        success = await updateMartabakSale(editingSaleId, payload)
      } else {
        success = await addMartabakSale(payload)
      }

      if (success) {
        console.log("Success!")
        toast({ title: "Berhasil", description: "Penjualan martabak bola tersimpan" })
        setShowAddSales(false)
        setEditingSaleId(null)
        setSalesForm({ cupCount: "", martabakPcs: "", pricePerPcs: "", cabangId: "" })
        loadData()
      } else {
        console.error("Failed to save data")
        toast({ title: "Gagal", description: "Gagal menyimpan data", variant: "destructive" })
      }
    } catch (e) {
      console.error("Error in handleSubmitSales:", e)
      toast({ title: "Error", description: "Terjadi kesalahan sistem", variant: "destructive" })
    }
  }

  const handleEditSaleClick = (sale: any) => {
    // sale.quantity = total martabak pcs, derive cupCount
    const pcs = sale.quantity || 5
    setSalesForm({
      cupCount: Math.ceil(pcs / 5),
      martabakPcs: pcs,
      pricePerPcs: sale.pricePerUnit || 2000,
      cabangId: sale.cabangId || ""
    })
    setEditingSaleId(sale.id)
    setShowAddSales(true)
  }

  const handleDeleteSaleClick = async (id: string) => {
    if (confirm("Hapus data penjualan ini?")) {
      await deleteMartabakSale(id)
      loadData()
      toast({ title: "Terhapus", description: "Data penjualan dihapus" })
    }
  }

  // --- Handlers Ingredients ---

  const handleSubmitIngredient = async () => {
    // Prioritize form's cabangId (if admin selected it), otherwise fall back to global selection or user's cabang
    const formCabang = ingredientForm.cabangId
    const targetCabang = user?.role === 'admin' ? (formCabang || selectedCabangId) : user?.cabangId

    if (!targetCabang) {
      toast({ title: "Error", description: "Pilih cabang terlebih dahulu untuk menambah data", variant: "destructive" })
      return
    }
    if (!user) return

    const payload = {
      userId: user.id,
      name: ingredientForm.name,
      quantity: ingredientForm.quantity,
      unit: ingredientForm.unit,
      cost: ingredientForm.cost,
      date: getCurrentDateTimeWITA(),
      cabangId: targetCabang
    }

    let success = false
    if (editingIngredientId) {
      success = await updateIngredient(editingIngredientId, payload)
    } else {
      success = await addIngredient(payload)
    }

    if (success) {
      toast({ title: "Berhasil", description: "Belanja bahan tersimpan" })
      setShowAddIngredient(false)
      setEditingIngredientId(null)
      setIngredientForm({ name: "", quantity: 0, unit: "kg", cost: 0, cabangId: "" })
      loadData()
    } else {
      toast({ title: "Gagal", description: "Gagal menyimpan data", variant: "destructive" })
    }
  }

  const handleEditIngredientClick = (ing: any) => {
    setIngredientForm({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      cost: ing.cost,
      cabangId: ing.cabangId || ""
    })
    setEditingIngredientId(ing.id)
    setShowAddIngredient(true)
  }

  const handleDeleteIngredientClick = async (id: string) => {
    if (confirm("Hapus data belanja ini?")) {
      await deleteIngredient(id)
      loadData()
      toast({ title: "Terhapus", description: "Data belanja dihapus" })
    }
  }

  // --- Print Receipt ---
  const handlePrintReceipt = (sale: any) => {
    const receiptContent = `
        <html>
        <head>
            <title>Cetak Struk</title>
            <style>
                body { font-family: monospace; padding: 10px; width: 58mm; font-size: 12px; }
                .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
                .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .total { font-weight: bold; border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; text-align: right; }
                .footer { text-align: center; margin-top: 15px; font-size: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h3>Martabak Mini</h3>
                <p>${getCabangName(sale.cabangId)}</p>
                <p>${formatDateTimeWITA(sale.date)}</p>
            </div>
            <div class="items">
                <div class="item">
                    <span>Martabak x ${sale.quantity}</span>
                    <span>Rp ${sale.totalPrice.toLocaleString('id-ID')}</span>
                </div>
            </div>
            <div class="total">
                Total: Rp ${sale.totalPrice.toLocaleString('id-ID')}
            </div>
            <div class="footer">
                <p>Terima Kasih</p>
            </div>
            <script>window.print();</script>
        </body>
        </html>
    `
    const popup = window.open('', '_blank', 'width=400,height=600')
    if (popup) {
      popup.document.write(receiptContent)
      popup.document.close()
    } else {
      toast({ title: "Error", description: "Pop-up blocked", variant: "destructive" })
    }
  }

  // Helper UI Components
  const StatCard = ({ title, value, icon: Icon, colorClass, gradient }: any) => (
    <Card className={`border-0 shadow-lg card-hover h-full overflow-hidden ${gradient ? '' : 'bg-white'}`}>
      {gradient && <div className={`absolute inset-0 ${gradient} opacity-95`} />}
      <CardContent className={`p-6 flex items-center justify-between relative z-10 ${gradient ? 'text-white' : ''}`}>
        <div className="space-y-1">
          <p className={`text-sm font-medium ${gradient ? 'text-white/80' : 'text-gray-500'}`}>{title}</p>
          <h3 className={`text-2xl font-bold ${gradient ? 'text-white' : colorClass}`}>{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${gradient ? 'bg-white/20' : `bg-${colorClass.split('-')[1]}-100`}`}>
          {Icon && <Icon className={`w-6 h-6 ${gradient ? 'text-white' : colorClass}`} />}
        </div>
      </CardContent>
      {gradient && <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-2xl" />}
    </Card>
  )

  if (authLoading || !mounted || !user) return null

  return (
    <SidebarProvider>
      <Sidebar />
      <main className="lg:ml-72 pt-4 pb-24 lg:pt-8 lg:pb-8 min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-amber-50/20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-600">Manajemen Martabak</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Penjualan Martabak</h1>
              <p className="text-sm text-gray-500">
                {user.role === 'admin'
                  ? "Pantau penjualan dan stok bahan di semua cabang"
                  : "Kelola penjualan dan belanja bahan operasional"}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {user.role === 'admin' && (
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={selectedCabangId}
                    onChange={(e) => setSelectedCabangId(e.target.value)}
                    className="pl-10 pr-4 py-2.5 text-sm bg-white outline-none cursor-pointer hover:bg-gray-50 rounded-xl border border-gray-200 shadow-sm transition-all w-full sm:w-auto"
                  >
                    <option value="">Semua Cabang</option>
                    {cabangs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <Button onClick={() => { setShowAddSales(true); setEditingSaleId(null); setSalesForm({ cupCount: "", martabakPcs: "", pricePerPcs: "", cabangId: user?.role === 'admin' ? selectedCabangId : "" }) }} className="gradient-primary shadow-lg shadow-orange-500/20 btn-press">
                <Plus className="w-4 h-4 mr-2" /> Input Penjualan
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <Card className="border-0 shadow-lg glass animate-slide-up">
            <CardContent className="p-5 flex flex-col md:flex-row items-end gap-4">
              <div className="flex-1 w-full space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" /> Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
              <div className="flex-1 w-full space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" /> Tanggal Akhir
                </label>
                <input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
              <Button onClick={loadData} className="w-full md:w-auto bg-primary hover:bg-primary/90">
                <Filter className="h-4 w-4 mr-2" /> Terapkan Filter
              </Button>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          {(salesLoading || ingredientsLoading) ? (
            <StatsGridSkeleton />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                title="Total Omset"
                value={`Rp ${totalOmset.toLocaleString('id-ID')}`}
                icon={ShoppingBag}
                colorClass="text-blue-600"
              />
              <StatCard
                title="Total Biaya Bahan"
                value={`Rp ${totalBahan.toLocaleString('id-ID')}`}
                icon={Package}
                colorClass="text-orange-600"
              />
              <StatCard
                title="Profit Kasar"
                value={`Rp ${totalProfit.toLocaleString('id-ID')}`}
                icon={Store}
                colorClass={totalProfit >= 0 ? "text-green-600" : "text-red-600"}
              />
            </div>
          )}

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
            <TabsList className="w-full justify-start h-auto p-2 bg-white rounded-xl border shadow-sm overflow-x-auto flex-nowrap">
              <TabsTrigger value="penjualan" className="flex-1 min-w-[150px] py-2.5 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
                <ChefHat className="w-4 h-4 mr-2" /> Penjualan ({martabakSales.length})
              </TabsTrigger>
              <TabsTrigger value="bahan" className="flex-1 min-w-[150px] py-2.5 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
                <Package className="w-4 h-4 mr-2" /> Bahan Baku ({ingredients.length})
              </TabsTrigger>
            </TabsList>

            {/* Penjualan Tab */}
            <TabsContent value="penjualan" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Riwayat Transaksi</CardTitle>
                    <CardDescription>Daftar penjualan martabak bola pada periode ini</CardDescription>
                  </div>
                  <Button onClick={() => { setShowAddSales(true); setEditingSaleId(null); setSalesForm({ cupCount: "", martabakPcs: "", pricePerPcs: "", cabangId: user?.role === 'admin' ? selectedCabangId : "" }) }} className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" /> Transaksi Baru
                  </Button>
                </CardHeader>
                <CardContent>
                  {/* Add/Edit Modal - Martabak Bola Form */}
                  {showAddSales && (
                    <div className="bg-gray-50 border rounded-xl p-6 mb-6 animate-in slide-in-from-top-2">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="font-semibold text-lg">{editingSaleId ? 'Edit Penjualan' : 'Tambah Penjualan Martabak Bola'}</h4>
                        <Button variant="ghost" size="sm" onClick={() => setShowAddSales(false)}><X className="w-4 h-4" /></Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Jumlah Cup */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Jumlah Cup</label>
                          <input
                            type="number"
                            min="1"
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500/20 outline-none"
                            value={salesForm.cupCount}
                            onChange={e => {
                              const cups = Math.max(1, Number(e.target.value))
                              setSalesForm({ ...salesForm, cupCount: cups, martabakPcs: cups * 5 })
                            }}
                          />
                          <p className="text-xs text-gray-500">1 cup = 5 martabak</p>
                        </div>

                        {/* Jumlah Martabak (Pcs) */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Jumlah Martabak (Pcs)</label>
                          <input
                            type="number"
                            min="1"
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500/20 outline-none"
                            value={salesForm.martabakPcs}
                            onChange={e => {
                              const pcs = Math.max(1, Number(e.target.value))
                              setSalesForm({ ...salesForm, martabakPcs: pcs, cupCount: Math.ceil(pcs / 5) })
                            }}
                          />
                          <p className="text-xs text-gray-500">Telur dibutuhkan: {Math.ceil(Number(salesForm.martabakPcs) / 5) || 0} butir (1 telur = 5 martabak)</p>
                        </div>

                        {/* Harga Per Pcs */}
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-sm font-medium">Harga Per Pcs (Rp)</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500/20 outline-none"
                            value={salesForm.pricePerPcs}
                            onChange={e => setSalesForm({ ...salesForm, pricePerPcs: Math.max(0, Number(e.target.value)) })}
                          />
                        </div>

                        {/* Cabang (Admin only) */}
                        {user.role === 'admin' && (
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-medium">Cabang</label>
                            <select
                              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500/20 outline-none"
                              value={salesForm.cabangId}
                              onChange={e => setSalesForm({ ...salesForm, cabangId: e.target.value })}
                            >
                              <option value="">Pilih Cabang</option>
                              {cabangs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Total Calculation Display */}
                      <div className="mt-6 flex justify-between items-center bg-gray-100 p-4 rounded-lg">
                        <span className="text-sm text-gray-600">Total Penjualan</span>
                        <span className="font-bold text-2xl text-red-600">Rp {(Number(salesForm.martabakPcs) * Number(salesForm.pricePerPcs) || 0).toLocaleString('id-ID')}</span>
                      </div>

                      <Button onClick={handleSubmitSales} className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-medium">
                        Simpan Penjualan
                      </Button>
                    </div>
                  )}

                  <div className="rounded-xl border overflow-hidden">
                    <div className="overflow-x-auto -mx-0 sm:mx-0">
                      <div className="inline-block min-w-full align-middle">
                        <table className="w-full text-sm min-w-[700px]">
                          <thead className="bg-gray-100/50">
                            <tr>
                              <th className="px-4 py-3 text-left font-medium text-gray-500">Tanggal</th>
                              {user.role === 'admin' && <th className="px-4 py-3 text-left font-medium text-gray-500">Cabang</th>}
                              <th className="px-4 py-3 text-right font-medium text-gray-500">Qty</th>
                              <th className="px-4 py-3 text-right font-medium text-gray-500">Harga</th>
                              <th className="px-4 py-3 text-right font-medium text-gray-500">Total</th>
                              <th className="px-4 py-3 text-center font-medium text-gray-500">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {martabakSales.map(item => (
                              <tr key={item.id} className="hover:bg-gray-50/50">
                                <td className="px-4 py-3 font-medium text-gray-700">
                                  {formatDateTimeWITA(item.date, item.createdAt)}
                                </td>
                                {user.role === 'admin' && (
                                  <td className="px-4 py-3">
                                    <Badge variant="outline" className="font-normal">{getCabangName(item.cabangId)}</Badge>
                                  </td>
                                )}
                                <td className="px-4 py-3 text-right">{item.quantity}</td>
                                <td className="px-4 py-3 text-right text-gray-500">Rp {item.pricePerUnit.toLocaleString('id-ID')}</td>
                                <td className="px-4 py-3 text-right font-bold text-gray-900">Rp {item.totalPrice.toLocaleString('id-ID')}</td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex justify-center gap-1">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handlePrintReceipt(item)}><Printer className="w-4 h-4" /></Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => handleEditSaleClick(item)}><Edit className="w-4 h-4" /></Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleDeleteSaleClick(item.id)}><Trash2 className="w-4 h-4" /></Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bahan Tab */}
            <TabsContent value="bahan" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Stok Bahan Baku</CardTitle>
                    <CardDescription>Pencatatan belanja bahan operasional (Tepung, Minyak, dll)</CardDescription>
                  </div>
                  <Button onClick={() => { setShowAddIngredient(true); setEditingIngredientId(null); setIngredientForm({ name: "", quantity: 0, unit: "kg", cost: 0, cabangId: user?.role === 'admin' ? selectedCabangId : "" }) }} className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" /> Catat Belanja
                  </Button>
                </CardHeader>
                <CardContent>
                  {showAddIngredient && (
                    <div className="bg-gray-50 border rounded-xl p-6 mb-6 animate-in slide-in-from-top-2">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-lg">{editingIngredientId ? 'Edit Belanja' : 'Catat Belanja Baru'}</h4>
                        <Button variant="ghost" size="sm" onClick={() => setShowAddIngredient(false)}><X className="w-4 h-4" /></Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {user.role === 'admin' && (
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-medium">Cabang</label>
                            <select
                              className="w-full p-2 border rounded-md"
                              value={ingredientForm.cabangId}
                              onChange={e => setIngredientForm({ ...ingredientForm, cabangId: e.target.value })}
                            >
                              <option value="">Pilih Cabang</option>
                              {cabangs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                        )}
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-sm font-medium">Nama Bahan</label>
                          <input type="text" placeholder="Contoh: Terigu Segitiga Biru" className="w-full p-2 border rounded-md" value={ingredientForm.name} onChange={e => setIngredientForm({ ...ingredientForm, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Jumlah</label>
                          <input type="number" className="w-full p-2 border rounded-md" value={ingredientForm.quantity} onChange={e => setIngredientForm({ ...ingredientForm, quantity: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Satuan</label>
                          <select className="w-full p-2 border rounded-md" value={ingredientForm.unit} onChange={e => setIngredientForm({ ...ingredientForm, unit: e.target.value })}>
                            {UNIT_OPTIONS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-sm font-medium">Total Biaya (Rp)</label>
                          <input type="number" className="w-full p-2 border rounded-md" value={ingredientForm.cost} onChange={e => setIngredientForm({ ...ingredientForm, cost: Number(e.target.value) })} />
                        </div>
                      </div>
                      <Button onClick={handleSubmitIngredient} className="w-full mt-4">Simpan Data</Button>
                    </div>
                  )}

                  <div className="rounded-xl border overflow-hidden">
                    <div className="overflow-x-auto -mx-0 sm:mx-0">
                      <div className="inline-block min-w-full align-middle">
                        <table className="w-full text-sm min-w-[700px]">
                          <thead className="bg-gray-100/50">
                            <tr>
                              <th className="px-4 py-3 text-left font-medium text-gray-500">Tanggal</th>
                              {user.role === 'admin' && <th className="px-4 py-3 text-left font-medium text-gray-500">Cabang</th>}
                              <th className="px-4 py-3 text-left font-medium text-gray-500">Nama Bahan</th>
                              <th className="px-4 py-3 text-right font-medium text-gray-500">Jumlah</th>
                              <th className="px-4 py-3 text-right font-medium text-gray-500">Biaya</th>
                              <th className="px-4 py-3 text-center font-medium text-gray-500">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {ingredients.map(item => (
                              <tr key={item.id} className="hover:bg-gray-50/50">
                                <td className="px-4 py-3 text-gray-500">
                                  {formatDateTimeWITA(item.date, item.createdAt)}
                                </td>
                                {user.role === 'admin' && (
                                  <td className="px-4 py-3">
                                    <Badge variant="outline" className="font-normal">{getCabangName(item.cabangId)}</Badge>
                                  </td>
                                )}
                                <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                                <td className="px-4 py-3 text-right">{item.quantity} {item.unit}</td>
                                <td className="px-4 py-3 text-right font-medium text-red-600">Rp {item.cost.toLocaleString('id-ID')}</td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex justify-center gap-1">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => handleEditIngredientClick(item)}><Edit className="w-4 h-4" /></Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleDeleteIngredientClick(item.id)}><Trash2 className="w-4 h-4" /></Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </main>
    </SidebarProvider>
  )
}
