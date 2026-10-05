"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useSalesData } from "@/hooks/use-sales-data"
import { useCabang } from "@/hooks/use-cabang"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { SidebarProvider } from "@/components/sidebar-context"
import { useToast } from "@/hooks/use-toast"
import { formatDateTimeWITA, getCurrentDateWITA, getCurrentDateTimeWITA } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useOperationalExpenses } from "@/hooks/use-data"
import Link from "next/link"
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Download,
  Calendar,
  TrendingUp,
  Wallet,
  Filter,
  PieChart as PieChartIcon,
  Plus,
  Edit,
  Trash2
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"
import { exportToExcel } from "@/lib/excel-export"

// Helper types
interface Transaction {
  id: string
  date: string
  type: "income" | "expense"
  category: "telur" | "martabak" | "bahan"
  description: string
  amount: number
  cabangId?: string
  cabangName?: string
}

export default function FinancialPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { eggSales, martabakSales, ingredients } = useSalesData()
  const { expenses, loadExpenses, addExpense, updateExpense, deleteExpense } = useOperationalExpenses()
  const { cabangs, loadCabangs } = useCabang()
  const { toast } = useToast()

  const [mounted, setMounted] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    setMounted(true)
    loadCabangs()

    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Convert to WITA timezone for date inputs
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

    setStartDate(firstDayWITA)
    setEndDate(lastDayWITA)
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      loadExpenses(undefined, startDate, endDate)
    }
  }, [loadExpenses, startDate, endDate])

  useEffect(() => {
    if (!loading && !user && mounted) router.push("/login")
  }, [user, loading, mounted, router])

  const cabangMap = useMemo(() => {
    const map = new Map<string, string>()
    cabangs.forEach(c => map.set(c.id, c.name))
    return map
  }, [cabangs])

  const filteredTransactions = useMemo(() => {
    if (!startDate || !endDate) return []
    const start = new Date(startDate); start.setHours(0, 0, 0, 0)
    const end = new Date(endDate); end.setHours(23, 59, 59, 999)

    const allTx: Transaction[] = []

    eggSales.forEach(s => {
      const d = new Date(s.date)
      if (d >= start && d <= end) {
        allTx.push({
          id: s.id, date: s.date, type: "income", category: "telur",
          description: `Penjualan Telur (${s.size}) - ${s.quantity} butir`,
          amount: s.totalPrice, cabangId: s.cabangId, cabangName: s.cabangId ? cabangMap.get(s.cabangId) : "-"
        })
      }
    })

    martabakSales.forEach(s => {
      const d = new Date(s.date)
      if (d >= start && d <= end) {
        allTx.push({
          id: s.id, date: s.date, type: "income", category: "martabak",
          description: `Penjualan Martabak - ${s.quantity} porsi`,
          amount: s.totalPrice, cabangId: s.cabangId, cabangName: s.cabangId ? cabangMap.get(s.cabangId) : "-"
        })
      }
    })

    ingredients.forEach(i => {
      const d = new Date(i.date)
      if (d >= start && d <= end) {
        allTx.push({
          id: i.id, date: i.date, type: "expense", category: "bahan",
          description: `Beli Bahan: ${i.name} (${i.quantity} ${i.unit})`,
          amount: i.cost, cabangId: i.cabangId, cabangName: i.cabangId ? cabangMap.get(i.cabangId) : "-"
        })
      }
    })

    return allTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [eggSales, martabakSales, ingredients, startDate, endDate, cabangMap])

  // New: Operational Expenses Calculation - Filter by date range
  const totalOperational = useMemo(() => {
    if (!startDate || !endDate) return 0

    const start = new Date(startDate); start.setHours(0, 0, 0, 0)
    const end = new Date(endDate); end.setHours(23, 59, 59, 999)

    return expenses
      .filter(e => {
        const expenseDate = new Date(e.date)
        return expenseDate >= start && expenseDate <= end
      })
      .reduce((sum, e) => sum + e.amount, 0)
  }, [expenses, startDate, endDate])

  // ============================================================
  // NET PROFIT BARU:
  // Keuntungan Telur  = jumlah_rak_terjual × Rp 5.000
  //                     (1 rak = 30 butir)
  // Keuntungan Martabak = total revenue martabak (full)
  // Net Profit = Keuntungan Telur + Revenue Martabak - Pengeluaran Operasional
  // ============================================================
  const PROFIT_PER_RACK = 5000
  const EGGS_PER_RACK = 30

  const stats = useMemo(() => {
    let grossIncome = 0   // omset kotor (telur + martabak)
    let eggGross = 0      // omset kotor telur
    let martabakRevenue = 0 // revenue martabak = langsung keuntungan
    let eggProfit = 0     // keuntungan bersih dari telur (rak × 5000)
    let expense = 0       // bahan baku

    // Hitung dari filtered transactions
    filteredTransactions.forEach(t => {
      if (t.type === "income" && t.category === "telur") {
        eggGross += t.amount
        grossIncome += t.amount
      }
      if (t.type === "income" && t.category === "martabak") {
        martabakRevenue += t.amount
        grossIncome += t.amount
      }
      if (t.type === "expense") expense += t.amount
    })

    // Hitung keuntungan telur dari jumlah rak yang terjual dalam periode filter
    if (startDate && endDate) {
      const start = new Date(startDate); start.setHours(0, 0, 0, 0)
      const end = new Date(endDate); end.setHours(23, 59, 59, 999)
      eggSales.forEach(s => {
        const d = new Date(s.date)
        if (d >= start && d <= end) {
          const racks = Math.floor(s.quantity / EGGS_PER_RACK)
          eggProfit += racks * PROFIT_PER_RACK
        }
      })
    }

    const totalProfit = eggProfit + martabakRevenue   // keuntungan kotor sebelum pengeluaran
    const netProfit = totalProfit - totalOperational  // net bersih
    const income = grossIncome                         // total pemasukan (omset)
    const margin = grossIncome > 0 ? (netProfit / grossIncome) * 100 : 0
    return { income, expense, eggGross, eggProfit, martabakRevenue, totalProfit, netProfit, margin }
  }, [filteredTransactions, totalOperational, eggSales, startDate, endDate])

  const chartData = useMemo(() => {
    const dailyMap = new Map<string, { date: string, income: number, expense: number }>()
    filteredTransactions.forEach(t => {
      const dateStr = formatDateTimeWITA(t.date).split(',')[0] // Get date part only
      if (!dailyMap.has(dateStr)) dailyMap.set(dateStr, { date: dateStr, income: 0, expense: 0 })
      const day = dailyMap.get(dateStr)!
      if (t.type === "income") day.income += t.amount
      else day.expense += t.amount
    })
    return Array.from(dailyMap.values()).reverse()
  }, [filteredTransactions])

  const pieData = useMemo(() => {
    let egg = 0; let martabak = 0
    filteredTransactions.filter(t => t.type === "income").forEach(t => {
      if (t.category === "telur") egg += t.amount
      if (t.category === "martabak") martabak += t.amount
    })
    return [
      { name: "Telur", value: egg },
      { name: "Martabak", value: martabak }
    ]
  }, [filteredTransactions])

  const handleExport = () => {
    try {
      const dataToExport = filteredTransactions.map(t => ({
        Tanggal: formatDateTimeWITA(t.date),
        Cabang: t.cabangName || "-",
        Tipe: t.type === "income" ? "Pemasukan" : "Pengeluaran",
        Kategori: t.category,
        Keterangan: t.description,
        Jumlah: t.amount
      }))

      exportToExcel(dataToExport, {
        filename: "Laporan_Keuangan",
        sheetName: "Arus Kas",
        columns: [
          { key: "Tanggal", header: "Tanggal", width: 20 },
          { key: "Cabang", header: "Cabang", width: 15 },
          { key: "Tipe", header: "Tipe", width: 12 },
          { key: "Kategori", header: "Kategori", width: 15 },
          { key: "Keterangan", header: "Keterangan", width: 30 },
          { key: "Jumlah", header: "Jumlah (Rp)", width: 15 },
        ]
      })
      toast({ title: "Berhasil", description: "Laporan berhasil diunduh" })
    } catch (e) {
      toast({ title: "Gagal", description: "Gagal mengunduh laporan", variant: "destructive" })
    }
  }

  if (loading || !mounted || !user) return null
  const COLORS = ["#EA7317", "#FFB84D", "#ef4444"]

  return (
    <SidebarProvider>
      <Sidebar />
      <main className="lg:ml-72 pt-4 pb-24 lg:pt-8 lg:pb-8 min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-amber-50/20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-600">Laporan Keuangan</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Laporan Keuangan</h1>
              <p className="text-sm text-gray-500">Analisis arus kas dan profitabilitas</p>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="w-full justify-start h-auto p-2 bg-white rounded-xl border-0 shadow-lg overflow-x-auto flex-nowrap animate-slide-up">
              <TabsTrigger value="overview" className="flex-1 min-w-[180px] py-2.5 data-[state=active]:bg-green-50 data-[state=active]:text-green-700">Ringkasan Keuangan</TabsTrigger>
              <TabsTrigger value="expenses" className="flex-1 min-w-[150px] py-2.5 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">Biaya Operasional</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">

              {/* Filter Card */}
              <Card className="border-0 shadow-lg glass animate-slide-up delay-100">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-end gap-4">
                    <div className="w-full md:w-1/3">
                      <label className="text-sm font-medium mb-1.5 block text-gray-700">Tanggal Mulai</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                    </div>
                    <div className="w-full md:w-1/3">
                      <label className="text-sm font-medium mb-1.5 block text-gray-700">Tanggal Akhir</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                    </div>
                    <div className="w-full md:w-auto pb-1">
                      <Badge variant="secondary" className="px-3 py-2 text-sm font-normal">
                        <Filter className="h-3 w-3 mr-2" /> {filteredTransactions.length} Transaksi Ditemukan
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up delay-200">
                <Card className="shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Omset Kotor</p>
                        <h3 className="text-2xl font-bold mt-2 text-blue-700">Rp {stats.income.toLocaleString("id-ID")}</h3>
                        <p className="text-xs text-gray-500 mt-1">Telur + Martabak</p>
                      </div>
                      <div className="p-2 bg-blue-50 rounded-lg"><ArrowUpRight className="h-5 w-5 text-blue-600" /></div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm hover:shadow-md transition-all border-l-4 border-l-orange-500">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Pengeluaran</p>
                        <h3 className="text-2xl font-bold mt-2 text-orange-700">Rp {totalOperational.toLocaleString("id-ID")}</h3>
                        <p className="text-xs text-gray-500 mt-1">Biaya Operasional</p>
                      </div>
                      <div className="p-2 bg-orange-50 rounded-lg"><ArrowDownRight className="h-5 w-5 text-orange-600" /></div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm hover:shadow-md transition-all border-l-4 border-l-yellow-500">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Keuntungan Kotor</p>
                        <h3 className="text-2xl font-bold mt-2 text-yellow-700">Rp {stats.totalProfit.toLocaleString("id-ID")}</h3>
                        <p className="text-xs text-gray-500 mt-1">Telur Rp {stats.eggProfit.toLocaleString("id-ID")} + Martabak Rp {stats.martabakRevenue.toLocaleString("id-ID")}</p>
                      </div>
                      <div className="p-2 bg-yellow-50 rounded-lg"><TrendingUp className="h-5 w-5 text-yellow-600" /></div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm hover:shadow-md transition-all border-l-4 border-l-green-600">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Net Profit (Bersih)</p>
                        <h3 className={`text-2xl font-bold mt-2 ${stats.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          Rp {stats.netProfit.toLocaleString("id-ID")}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Margin {stats.margin.toFixed(1)}%</p>
                      </div>
                      <div className={`p-2 rounded-lg ${stats.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                        <Wallet className={`h-5 w-5 ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Tren Arus Kas</CardTitle>
                    <CardDescription>Pergerakan pemasukan dan pengeluaran harian</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp ${value / 1000}k`} />
                          <Tooltip formatter={(value: number) => [`Rp ${value.toLocaleString("id-ID")}`, ""]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                          <Legend />
                          <Bar dataKey="income" name="Pemasukan" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expense" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2"><PieChartIcon className="w-4 h-4" /> Sumber Pemasukan</CardTitle>
                    <CardDescription>Proporsi omset Telur vs Martabak</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString("id-ID")}`} />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Table */}
              <Card className="shadow-sm overflow-hidden border-none">
                <CardHeader className="bg-white border-b px-6 py-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Rincian Transaksi</CardTitle>
                    <CardDescription>Log lengkap semua aktivitas keuangan</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto -mx-0 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <table className="w-full text-sm min-w-[900px]">
                        <thead className="bg-gray-50/50">
                          <tr>
                            <th className="px-6 py-3 text-left font-medium text-gray-500">Tanggal Waktu</th>
                            <th className="px-6 py-3 text-left font-medium text-gray-500">Tipe</th>
                            {user.role === 'admin' && <th className="px-6 py-3 text-left font-medium text-gray-500">Cabang</th>}
                            <th className="px-6 py-3 text-left font-medium text-gray-500">Kategori</th>
                            <th className="px-6 py-3 text-left font-medium text-gray-500">Keterangan</th>
                            <th className="px-6 py-3 text-right font-medium text-gray-500">Jumlah</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {filteredTransactions.length === 0 ? (
                            <tr><td colSpan={user.role === 'admin' ? 6 : 5} className="px-6 py-8 text-center text-muted-foreground">Tidak ada data pada periode ini</td></tr>
                          ) : (
                            filteredTransactions.map((t) => (
                              <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-3 text-gray-600">{formatDateTimeWITA(t.date)}</td>
                                <td className="px-6 py-3">
                                  <Badge variant={t.type === 'income' ? 'default' : 'destructive'} className={t.type === 'income' ? 'bg-green-100 text-green-800 hover:bg-green-200 border-none' : 'bg-red-100 text-red-800 hover:bg-red-200 border-none'}>
                                    {t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                                  </Badge>
                                </td>
                                {user.role === 'admin' && <td className="px-6 py-3 text-gray-900 font-medium group-hover:text-blue-600 transition-colors">{t.cabangName}</td>}
                                <td className="px-6 py-3 capitalize text-gray-600">{t.category}</td>
                                <td className="px-6 py-3 text-gray-600 max-w-xs truncate">{t.description}</td>
                                <td className={`px-6 py-3 text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                  {t.type === 'income' ? '+' : '-'} Rp {t.amount.toLocaleString("id-ID")}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expenses">
              <OperationalExpensesTab
                onAdd={addExpense}
                onUpdate={updateExpense}
                onDelete={deleteExpense}
                expenses={expenses}
                user={user}
                toast={toast}
                onSuccess={() => {
                  // Reload expenses with current date filter after add/delete
                  if (startDate && endDate) {
                    loadExpenses(undefined, startDate, endDate)
                  }
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </SidebarProvider>
  )
}

function OperationalExpensesTab({ onAdd, onUpdate, onDelete, expenses, user, toast, onSuccess }: any) {
  const [form, setForm] = useState<{
    date: string;
    category: string;
    amount: number | string;
    description: string;
  }>({
    date: getCurrentDateWITA(),
    category: "Listrik",
    amount: "",
    description: "",
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Error", description: "User tidak ditemukan. Silakan login ulang.", variant: "destructive" })
      return
    }
    const amount = Number(form.amount) || 0
    if (amount <= 0) {
      toast({ title: "Validasi Gagal", description: "Jumlah harus > 0", variant: "destructive" })
      return
    }

    // Convert date string to ISO string for database
    const dateISO = form.date ? new Date(form.date + 'T00:00:00').toISOString() : getCurrentDateTimeWITA()

    let success = false
    if (editingId) {
      success = await onUpdate(editingId, {
        date: dateISO,
        category: form.category,
        amount: amount,
        description: form.description,
      })
    } else {
      success = await onAdd({
        userId: user.id,
        cabangId: user.cabangId || undefined,
        date: dateISO,
        category: form.category,
        amount: amount,
        description: form.description,
      })
    }

    if (success) {
      // Show notification based on role
      const message = editingId ? "Pengeluaran berhasil diperbarui" : "Pengeluaran berhasil ditambahkan"
      const notificationMessage = user.role === 'admin'
        ? `${message} - ${form.category}: Rp ${amount.toLocaleString('id-ID')}`
        : message

      toast({
        title: "Berhasil",
        description: notificationMessage
      })

      setForm({
        date: getCurrentDateWITA(),
        category: "Listrik",
        amount: "",
        description: ""
      })
      setEditingId(null)
      setShowForm(false)

      // Call onSuccess callback to reload expenses with date filter
      if (onSuccess) {
        onSuccess()
      }
    } else {
      toast({ title: "Gagal", description: "Gagal menyimpan pengeluaran", variant: "destructive" })
    }
  }

  const handleEdit = (expense: any) => {
    setForm({
      date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : getCurrentDateWITA(),
      category: expense.category,
      amount: expense.amount,
      description: expense.description || "",
    })
    setEditingId(expense.id)
    setShowForm(true)
  }

  const handleCancel = () => {
    setForm({
      date: getCurrentDateWITA(),
      category: "Listrik",
      amount: "",
      description: ""
    })
    setEditingId(null)
    setShowForm(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Yakin hapus pengeluaran ini?")) {
      const success = await onDelete(id)
      if (success) {
        toast({ title: "Berhasil", description: "Pengeluaran berhasil dihapus" })
        if (onSuccess) {
          onSuccess()
        }
      } else {
        toast({ title: "Gagal", description: "Gagal menghapus pengeluaran", variant: "destructive" })
      }
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Input Biaya Operasional</CardTitle>
            <CardDescription>Catat pengeluaran rutin (Listrik, Gaji, dll)</CardDescription>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Tambah Pengeluaran
            </Button>
          )}
        </CardHeader>
        {showForm && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Tanggal</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Kategori</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  {["Listrik", "Gaji", "Sewa", "Bahan Bakar", "Lainnya"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Jumlah (Rp)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={form.amount || ""}
                  onChange={e => setForm({ ...form, amount: e.target.value === "" ? "" : e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Keterangan</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSubmit} className="w-full sm:w-auto">
                {editingId ? "Update" : "Simpan"} Pengeluaran
              </Button>
              <Button variant="ghost" onClick={handleCancel} className="w-full sm:w-auto">
                Batal
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="border-none shadow-sm bg-white">
        <CardHeader>
          <CardTitle>Riwayat Pengeluaran</CardTitle>
          <CardDescription>Daftar semua pengeluaran operasional</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto -mx-0 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Tanggal Waktu</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Kategori</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Keterangan</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-500">Jumlah</th>
                    <th className="px-6 py-3 text-center font-medium text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                        Tidak ada data pengeluaran
                      </td>
                    </tr>
                  ) : (
                    expenses.map((e: any) => (
                      <tr key={e.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-3 text-gray-600">{formatDateTimeWITA(e.date)}</td>
                        <td className="px-6 py-3">
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {e.category}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-gray-600">{e.description || "-"}</td>
                        <td className="px-6 py-3 text-right font-medium text-red-600">
                          Rp {e.amount.toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                              onClick={() => handleEdit(e)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(e.id)}
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
