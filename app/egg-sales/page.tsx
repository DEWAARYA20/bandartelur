"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useEggStocks, useEggSales, useEggWaste, useMartabakSales } from "@/hooks/use-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { SidebarProvider } from "@/components/sidebar-context"
import { useToast } from "@/hooks/use-toast"
import { formatDateTimeWITA, getCurrentDateWITA, getCurrentDateTimeWITA } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Plus, X, Printer, AlertTriangle, Calendar, Filter, Archive, Egg, History, ShoppingCart } from "lucide-react"

export default function EggSalesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const { eggStocks, loadEggStocks, addEggStock, updateEggStock, deleteEggStock } = useEggStocks()
  const { eggSales, loadEggSales, addEggSale, updateEggSale, deleteEggSale } = useEggSales()
  const { eggWaste, loadEggWaste, addEggWaste, deleteEggWaste } = useEggWaste()
  const { martabakSales, loadMartabakSales } = useMartabakSales()

  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<"stok" | "penjualan" | "rusak">("stok")

  // States for Modals/Forms
  const [showAddStok, setShowAddStok] = useState(false)
  const [editingStokId, setEditingStokId] = useState<string | null>(null)

  const [showAddSales, setShowAddSales] = useState(false)
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null)

  const [showAddWaste, setShowAddWaste] = useState(false)

  // Filters
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: ""
  })

  // Forms
  const [stokForm, setStokForm] = useState({
    size: "besar" as "kecil" | "sedang" | "besar",
    rackCount: 1,
    pricePerEgg: 2000,
  })

  const [salesForm, setSalesForm] = useState({
    size: "besar" as "kecil" | "sedang" | "besar",
    quantity: 0,
    pricePerEgg: 2000,
  })

  const [wasteForm, setWasteForm] = useState({
    size: "besar" as "kecil" | "sedang" | "besar",
    quantity: 0,
    reason: "pecah"
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

  const loadData = useCallback(() => {
    if (!authLoading && user && mounted && dateFilter.startDate && dateFilter.endDate) {
      const cabangId = user.role === 'admin' ? undefined : user.cabangId
      loadEggStocks(cabangId, dateFilter.startDate, dateFilter.endDate)
      loadEggSales(cabangId, dateFilter.startDate, dateFilter.endDate)
      loadEggWaste(cabangId, dateFilter.startDate, dateFilter.endDate)
      loadMartabakSales(cabangId, dateFilter.startDate, dateFilter.endDate)
    }
  }, [authLoading, user, mounted, dateFilter, loadEggStocks, loadEggSales, loadEggWaste, loadMartabakSales])

  useEffect(() => {
    if (dateFilter.startDate && dateFilter.endDate) {
      loadData()
    } else if (!authLoading && !user && mounted) {
      router.push("/login")
    } else if (!authLoading && user && user.role !== 'admin' && !user.accessPages.includes('egg-sales')) {
      router.push("/dashboard")
      toast({ title: "Akses Ditolak", description: "Anda tidak memiliki izin akses halaman ini", variant: "destructive" })
    }
  }, [loadData, authLoading, user, mounted, router, toast])

  // Aggregation
  const stocksBySize = {
    kecil: eggStocks.filter((s) => s.size === "kecil"),
    sedang: eggStocks.filter((s) => s.size === "sedang"),
    besar: eggStocks.filter((s) => s.size === "besar"),
  }

  const salesBySize = {
    kecil: eggSales.filter((s) => s.size === "kecil"),
    sedang: eggSales.filter((s) => s.size === "sedang"),
    besar: eggSales.filter((s) => s.size === "besar"),
  }

  const totalStockEggs = eggStocks.reduce((sum, s) => sum + s.totalEggs, 0)
  const totalSoldEggs = eggSales.reduce((sum, s) => sum + s.quantity, 0)
  const totalWasteEggs = eggWaste.reduce((sum, w) => sum + w.quantity, 0)
  const totalMartabakUsage = martabakSales.reduce((sum, m) => sum + (m.eggsUsed * m.quantity), 0) // Calculate usage
  const currentStock = totalStockEggs - totalSoldEggs - totalWasteEggs - totalMartabakUsage

  // --- Handlers Stok ---

  const handleSubmitStok = async () => {
    try {
      console.log("Submitting stok...", stokForm)
      if (stokForm.rackCount <= 0 || stokForm.pricePerEgg <= 0) {
        toast({ title: "Validasi Gagal", description: "Isi data dengan benar", variant: "destructive" })
        return
      }
      if (!user) {
        console.error("User not found")
        return
      }

      const payload = {
        userId: user.id,
        size: stokForm.size,
        rackCount: stokForm.rackCount,
        eggsPerRack: 35,
        pricePerEgg: stokForm.pricePerEgg,
        totalEggs: stokForm.rackCount * 35,
        date: getCurrentDateTimeWITA(),
        cabangId: user.cabangId
      }

      console.log("Payload:", payload)
      let success = false
      if (editingStokId) {
        success = await updateEggStock(editingStokId, payload)
      } else {
        success = await addEggStock(payload)
      }

      if (success) {
        console.log("Success!")
        toast({ title: "Berhasil", description: "Data stok tersimpan" })
        setStokForm({ size: "besar", rackCount: 1, pricePerEgg: 2000 })
        setShowAddStok(false)
        setEditingStokId(null)
        loadData()
      } else {
        console.error("Failed to save data")
        toast({ title: "Gagal", description: "Gagal menyimpan data", variant: "destructive" })
      }
    } catch (e) {
      console.error("Error in handleSubmitStok:", e)
      toast({ title: "Error", description: "Terjadi kesalahan sistem", variant: "destructive" })
    }
  }

  const handleEditStokClick = (stock: any) => {
    setStokForm({
      size: stock.size,
      rackCount: stock.rackCount,
      pricePerEgg: stock.pricePerEgg
    })
    setEditingStokId(stock.id)
    setShowAddStok(true)
  }

  const handleDeleteStokClick = async (id: string) => {
    if (confirm("Yakin hapus data stok ini?")) {
      await deleteEggStock(id)
      loadData()
      toast({ title: "Terhapus", description: "Data stok dihapus" })
    }
  }

  // --- Handlers Sales ---

  const handleSubmitSales = async () => {
    if (salesForm.quantity <= 0 || salesForm.pricePerEgg <= 0) {
      toast({ title: "Validasi Gagal", description: "Isi data dengan benar", variant: "destructive" })
      return
    }
    if (!user) return

    const payload = {
      userId: user.id,
      size: salesForm.size,
      quantity: salesForm.quantity,
      pricePerEgg: salesForm.pricePerEgg,
      totalPrice: salesForm.quantity * salesForm.pricePerEgg,
      date: new Date().toISOString(),
      cabangId: user.cabangId
    }

    let success = false
    if (editingSaleId) {
      success = await updateEggSale(editingSaleId, payload)
    } else {
      success = await addEggSale(payload)
    }

    if (success) {
      toast({ title: "Berhasil", description: "Data penjualan tersimpan" })
      setSalesForm({ size: "besar", quantity: 0, pricePerEgg: 2000 })
      setShowAddSales(false)
      setEditingSaleId(null)
      loadData()
    } else {
      toast({ title: "Gagal", description: "Gagal menyimpan data", variant: "destructive" })
    }
  }

  const handleEditSaleClick = (sale: any) => {
    setSalesForm({
      size: sale.size,
      quantity: sale.quantity,
      pricePerEgg: sale.pricePerEgg
    })
    setEditingSaleId(sale.id)
    setShowAddSales(true)
  }

  const handleDeleteSaleClick = async (id: string) => {
    if (confirm("Yakin hapus data penjualan ini?")) {
      await deleteEggSale(id)
      loadData()
      toast({ title: "Terhapus", description: "Data penjualan dihapus" })
    }
  }

  // --- Handlers Waste ---

  const handleSubmitWaste = async () => {
    if (wasteForm.quantity <= 0) {
      toast({ title: "Validasi Gagal", description: "Jumlah harus > 0", variant: "destructive" })
      return
    }
    if (!user) return

    const payload = {
      cabangId: user.cabangId,
      date: getCurrentDateTimeWITA(),
      size: wasteForm.size,
      quantity: wasteForm.quantity,
      reason: wasteForm.reason
    }

    await addEggWaste(payload)
    toast({ title: "Berhasil", description: "Laporan stok rusak tersimpan" })
    setWasteForm({ size: 'besar', quantity: 0, reason: 'pecah' })
    setShowAddWaste(false)
    loadData()
  }

  const handleDeleteWasteClick = async (id: string) => {
    if (confirm("Hapus laporan ini?")) {
      await deleteEggWaste(id)
      loadData()
      toast({ title: "Terhapus", description: "Laporan dihapus" })
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
                  <h3>Bandar Telur</h3>
                  <p>${user?.cabangName || 'Pusat'}</p>
                  <p>${formatDateTimeWITA(sale.date)}</p>
              </div>
              <div class="items">
                  <div class="item">
                      <span>Telur ${sale.size} x ${sale.quantity}</span>
                      <span>Rp ${sale.totalPrice.toLocaleString('id-ID')}</span>
                  </div>
              </div>
              <div class="total">
                  Total: Rp ${sale.totalPrice.toLocaleString('id-ID')}
              </div>
              <div class="footer">
                  <p>Terima Kasih</p>
                  <p>Simpan struk ini sebagai bukti pembayaran</p>
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
      toast({ title: "Error", description: "Pop-up blocked. Please allow pop-ups.", variant: "destructive" })
    }
  }

  // Helper Components
  const StatCard = ({ title, value, subValue, icon: Icon, colorClass, gradient }: any) => {
    // Check if value is negative for special styling
    const isNegative = typeof value === 'string' && value.startsWith('-')
    const iconBgClass = colorClass?.includes('blue') ? 'bg-blue-100'
      : colorClass?.includes('orange') ? 'bg-orange-100'
        : colorClass?.includes('green') ? 'bg-green-100'
          : colorClass?.includes('red') ? 'bg-red-100'
            : 'bg-gray-100'

    return (
      <Card className={`border-0 shadow-lg card-hover h-full overflow-hidden ${gradient ? 'relative' : 'bg-white'}`}>
        {gradient && <div className={`absolute inset-0 ${gradient} opacity-95`} />}
        <CardContent className={`p-6 flex items-center justify-between relative z-10 ${gradient ? 'text-white' : ''}`}>
          <div className="space-y-1">
            <p className={`text-sm font-medium ${gradient ? 'text-white/80' : 'text-gray-500'}`}>{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className={`text-2xl font-bold ${gradient ? 'text-white' : isNegative ? 'text-red-600' : colorClass}`}>{value}</h3>
              {subValue && <span className={`text-xs ${gradient ? 'text-white/70' : 'text-gray-400'}`}>{subValue}</span>}
            </div>
          </div>
          <div className={`p-3 rounded-xl ${gradient ? 'bg-white/20' : iconBgClass}`}>
            {Icon && <Icon className={`w-6 h-6 ${gradient ? 'text-white' : isNegative ? 'text-red-600' : colorClass}`} />}
          </div>
        </CardContent>
        {gradient && <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-2xl" />}
      </Card>
    )
  }

  if (authLoading || !mounted || !user) return null

  return (
    <SidebarProvider>
      <Sidebar />
      <main className="lg:ml-72 pt-4 pb-24 lg:pt-8 lg:pb-8 min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-amber-50/20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Egg className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium text-orange-600">Manajemen Telur</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Penjualan Telur</h1>
              <p className="text-sm text-gray-500">
                Kelola stok masuk, transaksi penjualan, dan laporan kerusakan
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => { setShowAddStok(true); setEditingStokId(null); setStokForm({ size: 'besar', rackCount: 1, pricePerEgg: 2000 }) }} className="gradient-primary shadow-lg shadow-orange-500/20 btn-press">
                <Plus className="w-4 h-4 mr-2" /> Stok Masuk
              </Button>
              <Button onClick={() => { setShowAddSales(true); setEditingSaleId(null); setSalesForm({ size: 'besar', quantity: 0, pricePerEgg: 2000 }) }} variant="secondary" className="bg-white shadow-sm btn-press">
                <ShoppingCart className="w-4 h-4 mr-2" /> Jual Telur
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up delay-100">
            <StatCard
              title="Total Stok Masuk"
              value={totalStockEggs.toLocaleString('id-ID')}
              subValue="butir"
              icon={Archive}
              colorClass="text-blue-600"
              gradient="gradient-blue"
            />
            <StatCard
              title="Terjual & Dipakai"
              value={(totalSoldEggs + totalWasteEggs + totalMartabakUsage).toLocaleString('id-ID')}
              subValue={`(${totalSoldEggs} jual, ${totalMartabakUsage} martabak)`}
              icon={History}
              colorClass="text-orange-600"
            />
            <StatCard
              title="Sisa Stok Fisik"
              value={currentStock.toLocaleString('id-ID')}
              subValue="butir"
              icon={Egg}
              colorClass="text-green-600"
            />
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
            <TabsList className="w-full justify-start h-auto p-2 bg-white rounded-xl border shadow-sm overflow-x-auto flex-nowrap">
              <TabsTrigger value="stok" className="flex-1 min-w-[150px] py-2.5 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
                <Archive className="w-4 h-4 mr-2" /> Stok Masuk
              </TabsTrigger>
              <TabsTrigger value="penjualan" className="flex-1 min-w-[150px] py-2.5 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
                <ShoppingCart className="w-4 h-4 mr-2" /> Riwayat Penjualan
              </TabsTrigger>
              <TabsTrigger value="rusak" className="flex-1 min-w-[150px] py-2.5 data-[state=active]:bg-red-50 data-[state=active]:text-red-700">
                <AlertTriangle className="w-4 h-4 mr-2" /> Laporan Kerusakan
              </TabsTrigger>
            </TabsList>

            {/* Content: Stok */}
            <TabsContent value="stok" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Riwayat Stok Masuk</CardTitle>
                    <CardDescription>Pencatatan telur yang masuk dari supplier</CardDescription>
                  </div>
                  <Button onClick={() => { setShowAddStok(true); setEditingStokId(null); setStokForm({ size: 'besar', rackCount: 1, pricePerEgg: 2000 }) }} className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" /> Tambah Stok
                  </Button>
                </CardHeader>
                <CardContent>
                  {showAddStok && (
                    <div className="bg-gray-50 border rounded-xl p-6 mb-6 animate-in slide-in-from-top-2">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-lg">{editingStokId ? 'Edit Stok' : 'Tambah Stok Baru'}</h4>
                        <Button variant="ghost" size="sm" onClick={() => setShowAddStok(false)}><X className="w-4 h-4" /></Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Ukuran</label>
                          <select className="w-full p-2 border rounded-md" value={stokForm.size} onChange={e => setStokForm({ ...stokForm, size: e.target.value as any })}>
                            <option value="kecil">Kecil</option>
                            <option value="sedang">Sedang</option>
                            <option value="besar">Besar</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Jumlah Rak</label>
                          <input type="number" className="w-full p-2 border rounded-md" value={stokForm.rackCount} onChange={e => setStokForm({ ...stokForm, rackCount: Number(e.target.value) })} />
                          <p className="text-xs text-gray-500">Estimasi: {stokForm.rackCount * 35} butir</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Harga Beli/Butir</label>
                          <input type="number" className="w-full p-2 border rounded-md" value={stokForm.pricePerEgg} onChange={e => setStokForm({ ...stokForm, pricePerEgg: Number(e.target.value) })} />
                        </div>
                      </div>
                      <Button onClick={handleSubmitStok} className="w-full mt-4">Simpan Data</Button>
                    </div>
                  )}

                  <div className="space-y-8">
                    {['kecil', 'sedang', 'besar'].map(size => (
                      <div key={size} className="rounded-xl border overflow-hidden">
                        <div className="bg-gray-100/50 px-4 py-3 border-b flex justify-between items-center">
                          <h3 className="font-bold capitalize text-gray-700 flex items-center gap-2">
                            <Egg className="w-4 h-4" /> Ukuran {size}
                          </h3>
                          <Badge variant="outline">{stocksBySize[size as keyof typeof stocksBySize].length} Data</Badge>
                        </div>
                        <div className="overflow-x-auto -mx-0 sm:mx-0">
                          <div className="inline-block min-w-full align-middle">
                            <table className="w-full text-sm min-w-[600px]">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-gray-500 font-medium">Tanggal</th>
                                  <th className="px-4 py-2 text-right text-gray-500 font-medium">Jumlah (Butir)</th>
                                  <th className="px-4 py-2 text-right text-gray-500 font-medium">Rak</th>
                                  <th className="px-4 py-2 text-center text-gray-500 font-medium">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {stocksBySize[size as keyof typeof stocksBySize].map((item) => (
                                  <tr key={item.id} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-2 font-medium">
                                      {formatDateTimeWITA(item.date, item.createdAt)}
                                    </td>
                                    <td className="px-4 py-2 text-right">{item.totalEggs}</td>
                                    <td className="px-4 py-2 text-right text-gray-400">{item.rackCount}</td>
                                    <td className="px-4 py-2 text-center">
                                      <div className="flex justify-center gap-1">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => handleEditStokClick(item)}><Edit className="w-4 h-4" /></Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleDeleteStokClick(item.id)}><Trash2 className="w-4 h-4" /></Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                                {stocksBySize[size as keyof typeof stocksBySize].length === 0 && (
                                  <tr><td colSpan={4} className="p-4 text-center text-gray-400 text-xs">Belum ada data stok {size}</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content: Penjualan */}
            <TabsContent value="penjualan" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Riwayat Transaksi</CardTitle>
                    <CardDescription>Catatan penjualan harian</CardDescription>
                  </div>
                  <Button onClick={() => { setShowAddSales(true); setEditingSaleId(null); setSalesForm({ size: 'besar', quantity: 0, pricePerEgg: 2000 }) }} className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" /> Input Penjualan
                  </Button>
                </CardHeader>
                <CardContent>
                  {showAddSales && (
                    <div className="bg-gray-50 border rounded-xl p-6 mb-6 animate-in slide-in-from-top-2">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-lg">{editingSaleId ? 'Edit Penjualan' : 'Input Penjualan Baru'}</h4>
                        <Button variant="ghost" size="sm" onClick={() => setShowAddSales(false)}><X className="w-4 h-4" /></Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Ukuran</label>
                          <select className="w-full p-2 border rounded-md" value={salesForm.size} onChange={e => setSalesForm({ ...salesForm, size: e.target.value as any })}>
                            <option value="kecil">Kecil</option>
                            <option value="sedang">Sedang</option>
                            <option value="besar">Besar</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Jumlah (Butir)</label>
                          <input type="number" className="w-full p-2 border rounded-md" value={salesForm.quantity} onChange={e => setSalesForm({ ...salesForm, quantity: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Harga Jual/Butir</label>
                          <input type="number" className="w-full p-2 border rounded-md" value={salesForm.pricePerEgg} onChange={e => setSalesForm({ ...salesForm, pricePerEgg: Number(e.target.value) })} />
                        </div>
                      </div>
                      <div className="mt-4 flex justify-between items-center bg-white p-3 rounded-lg border">
                        <span className="text-sm text-gray-500">Total Transaksi</span>
                        <span className="font-bold text-lg text-green-600">Rp {(salesForm.quantity * salesForm.pricePerEgg).toLocaleString('id-ID')}</span>
                      </div>
                      <Button onClick={handleSubmitSales} className="w-full mt-4">Simpan Transaksi</Button>
                    </div>
                  )}

                  <div className="space-y-8">
                    {['kecil', 'sedang', 'besar'].map(size => (
                      <div key={size} className="rounded-xl border overflow-hidden">
                        <div className="bg-gray-100/50 px-4 py-3 border-b flex justify-between items-center">
                          <h3 className="font-bold capitalize text-gray-700 flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" /> Penjualan {size}
                          </h3>
                          <Badge variant="outline">{salesBySize[size as keyof typeof salesBySize].length} Trx</Badge>
                        </div>
                        <div className="overflow-x-auto -mx-0 sm:mx-0">
                          <div className="inline-block min-w-full align-middle">
                            <table className="w-full text-sm min-w-[600px]">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-gray-500 font-medium">Tanggal</th>
                                  <th className="px-4 py-2 text-right text-gray-500 font-medium">Qty</th>
                                  <th className="px-4 py-2 text-right text-gray-500 font-medium">Total (Rp)</th>
                                  <th className="px-4 py-2 text-center text-gray-500 font-medium">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {salesBySize[size as keyof typeof salesBySize].map((item) => (
                                  <tr key={item.id} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-2 font-medium">
                                      {formatDateTimeWITA(item.date, item.createdAt)}
                                    </td>
                                    <td className="px-4 py-2 text-right">{item.quantity}</td>
                                    <td className="px-4 py-2 text-right font-bold text-gray-900">{(item.totalPrice || 0).toLocaleString('id-ID')}</td>
                                    <td className="px-4 py-2 text-center">
                                      <div className="flex justify-center gap-1">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handlePrintReceipt(item)}><Printer className="w-4 h-4" /></Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => handleEditSaleClick(item)}><Edit className="w-4 h-4" /></Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleDeleteSaleClick(item.id)}><Trash2 className="w-4 h-4" /></Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                                {salesBySize[size as keyof typeof salesBySize].length === 0 && (
                                  <tr><td colSpan={4} className="p-4 text-center text-gray-400 text-xs">Belum ada penjualan {size}</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content: Rusak */}
            <TabsContent value="rusak" className="space-y-4">
              <Card className="border-red-100">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-red-700">Laporan Stok Rusak</CardTitle>
                    <CardDescription>Pecah, busuk, atau hilang</CardDescription>
                  </div>
                  <Button variant="destructive" onClick={() => setShowAddWaste(true)} className="w-full sm:w-auto">
                    <AlertTriangle className="w-4 h-4 mr-2" /> Lapor Kerusakan
                  </Button>
                </CardHeader>
                <CardContent>
                  {showAddWaste && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-6 mb-6 animate-in slide-in-from-top-2">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-lg text-red-800">Input Kerusakan</h4>
                        <Button variant="ghost" size="sm" onClick={() => setShowAddWaste(false)}><X className="w-4 h-4" /></Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Ukuran</label>
                          <select className="w-full p-2 border rounded-md" value={wasteForm.size} onChange={e => setWasteForm({ ...wasteForm, size: e.target.value as any })}>
                            <option value="kecil">Kecil</option>
                            <option value="sedang">Sedang</option>
                            <option value="besar">Besar</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Jumlah (Butir)</label>
                          <input type="number" className="w-full p-2 border rounded-md" value={wasteForm.quantity} onChange={e => setWasteForm({ ...wasteForm, quantity: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Alasan</label>
                          <select className="w-full p-2 border rounded-md" value={wasteForm.reason} onChange={e => setWasteForm({ ...wasteForm, reason: e.target.value })}>
                            <option value="pecah">Pecah</option>
                            <option value="busuk">Busuk</option>
                            <option value="hilang">Hilang</option>
                            <option value="lainnya">Lainnya</option>
                          </select>
                        </div>
                      </div>
                      <Button variant="destructive" onClick={handleSubmitWaste} className="w-full mt-4">Simpan Laporan</Button>
                    </div>
                  )}

                  <div className="rounded-xl border overflow-hidden">
                    <div className="overflow-x-auto -mx-0 sm:mx-0">
                      <div className="inline-block min-w-full align-middle">
                        <table className="w-full text-sm min-w-[600px]">
                          <thead className="bg-red-50/50">
                            <tr>
                              <th className="px-4 py-3 text-left font-medium text-gray-500">Tanggal</th>
                              <th className="px-4 py-3 text-left font-medium text-gray-500">Ukuran</th>
                              <th className="px-4 py-3 text-right font-medium text-gray-500">Jumlah</th>
                              <th className="px-4 py-3 text-left font-medium text-gray-500">Alasan</th>
                              <th className="px-4 py-3 text-center font-medium text-gray-500">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {eggWaste.map(item => (
                              <tr key={item.id} className="hover:bg-red-50/20">
                                <td className="px-4 py-3">{formatDateTimeWITA(item.date, item.createdAt)}</td>
                                <td className="px-4 py-3 capitalize">{item.size}</td>
                                <td className="px-4 py-3 text-right font-bold text-red-600">{item.quantity}</td>
                                <td className="px-4 py-3 capitalize">{item.reason}</td>
                                <td className="px-4 py-3 text-center">
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleDeleteWasteClick(item.id)}><Trash2 className="w-4 h-4" /></Button>
                                </td>
                              </tr>
                            ))}
                            {eggWaste.length === 0 && (
                              <tr><td colSpan={5} className="p-8 text-center text-gray-400">Tidak ada laporan kerusakan</td></tr>
                            )}
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
