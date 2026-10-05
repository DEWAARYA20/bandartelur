"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useSalesData } from "@/hooks/use-sales-data"
import { useEggStocks, useEggWaste, useOperationalExpenses } from "@/hooks/use-data"
import { useCabang } from "@/hooks/use-cabang"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { SidebarProvider } from "@/components/sidebar-context"
import Link from "next/link"
import {
  TrendingUp,
  Wallet,
  AlertTriangle,
  Egg,
  UtensilsCrossed,
  Plus,
  ArrowRight,
  Package,
  Activity,
  Bell,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTimeWITA, getCurrentDateWITA } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { eggSales, martabakSales, ingredients } = useSalesData()
  const { eggStocks, loadEggStocks } = useEggStocks()
  const { eggWaste, loadEggWaste } = useEggWaste()
  const { expenses, loadExpenses } = useOperationalExpenses()
  const { cabangs, loadCabangs } = useCabang()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificationDateFilter, setNotificationDateFilter] = useState<string>(getCurrentDateWITA())

  useEffect(() => {
    setMounted(true)
    if (user) {
      const cabangId = user.role === 'admin' ? undefined : user.cabangId
      loadEggStocks(cabangId)
      loadEggWaste(cabangId)
      loadCabangs()
      // Load operational expenses for current month
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      loadExpenses(cabangId, firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0])
    }
  }, [user, loadEggStocks, loadEggWaste, loadCabangs, loadExpenses])

  useEffect(() => {
    if (!loading && !user && mounted) {
      router.push("/login")
    }
  }, [user, loading, mounted, router])

  // --- Calculations ---

  const PROFIT_PER_RACK = 5000
  const EGGS_PER_RACK = 30

  const currentMonthStats = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()

    const eggSalesThisMonth = eggSales.filter(s => {
      const d = new Date(s.date); return d.getMonth() === month && d.getFullYear() === year
    })
    const martabakSalesThisMonth = martabakSales.filter(s => {
      const d = new Date(s.date); return d.getMonth() === month && d.getFullYear() === year
    })

    // Omset kotor
    const eggRevenue = eggSalesThisMonth.reduce((sum, s) => sum + s.totalPrice, 0)
    const martabakRevenue = martabakSalesThisMonth.reduce((sum, s) => sum + s.totalPrice, 0)
    const revenue = eggRevenue + martabakRevenue

    // Keuntungan telur: jumlah rak × Rp 5.000
    const eggProfit = eggSalesThisMonth.reduce((sum, s) => {
      const racks = Math.floor(s.quantity / EGGS_PER_RACK)
      return sum + (racks * PROFIT_PER_RACK)
    }, 0)

    // Pengeluaran operasional
    const operational = expenses
      .filter(e => { const d = new Date(e.date); return d.getMonth() === month && d.getFullYear() === year })
      .reduce((sum, e) => sum + e.amount, 0)

    // Net profit = (keuntungan telur per rak + revenue martabak) - pengeluaran
    const totalProfit = eggProfit + martabakRevenue
    const netProfit = totalProfit - operational

    return { revenue, eggRevenue, martabakRevenue, eggProfit, operational, totalProfit, profit: netProfit, cost: operational }
  }, [eggSales, martabakSales, ingredients, expenses])

  // Chart Data (Last 7 Days)
  const chartData = useMemo(() => {
    const days = 7
    const result = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString("id-ID", { weekday: 'short' })

      const revenue =
        eggSales.filter(s => s.date.startsWith(dateStr)).reduce((sum, s) => sum + s.totalPrice, 0) +
        martabakSales.filter(s => s.date.startsWith(dateStr)).reduce((sum, s) => sum + s.totalPrice, 0)

      result.push({ name: label, value: revenue })
    }
    return result
  }, [eggSales, martabakSales])

  // Low Stock Logic
  const stockStatus = useMemo(() => {
    const totalIn = eggStocks.reduce((sum, s) => sum + s.totalEggs, 0)
    const totalOut = eggSales.reduce((sum, s) => sum + s.quantity, 0)
    const totalWaste = eggWaste.reduce((sum, w) => sum + w.quantity, 0)
    const totalMartabak = martabakSales.reduce((sum, m) => sum + (m.eggsUsed * m.quantity), 0)

    const realStock = totalIn - totalOut - totalWaste - totalMartabak
    return { realStock, isLow: realStock < 100 }
  }, [eggStocks, eggSales, eggWaste, martabakSales])

  // Cabang Map
  const cabangMap = useMemo(() => {
    const map = new Map<string, string>()
    cabangs.forEach(c => map.set(c.id, c.name))
    return map
  }, [cabangs])

  // Recent Activity Feed with Date Filter
  const recentActivities = useMemo(() => {
    const activities = [
      ...eggSales.map(s => ({ type: 'egg', date: s.date, desc: `Jual Telur ${s.size} (${s.quantity})`, amount: s.totalPrice, cabang: s.cabangId ? cabangMap.get(s.cabangId) : undefined })),
      ...martabakSales.map(m => ({ type: 'martabak', date: m.date, desc: `Jual Martabak (${m.quantity})`, amount: m.totalPrice, cabang: m.cabangId ? cabangMap.get(m.cabangId) : undefined })),
      ...expenses.map(e => ({ type: 'expense', date: e.date, desc: `Biaya Operasional: ${e.category} - ${e.description}`, amount: e.amount, cabang: e.cabangId ? cabangMap.get(e.cabangId) : undefined }))
    ]

    // Filter by selected date
    const filteredActivities = activities.filter(act => {
      const actDate = new Date(act.date)
      const filterDate = new Date(notificationDateFilter)
      return actDate.toISOString().split('T')[0] === filterDate.toISOString().split('T')[0]
    })

    // Sort by date descending and return all (no slice limit)
    return filteredActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [eggSales, martabakSales, expenses, cabangMap, notificationDateFilter])

  if (loading || !mounted || !user) return null

  return (
    <SidebarProvider>
      <Sidebar />
      <main className="lg:ml-72 pt-4 pb-24 lg:pt-8 lg:pb-8 min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-amber-50/20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 animate-fade-in">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium text-orange-600">Dashboard</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Halo, {user.name.split(' ')[0]}! 👋
              </h1>
              <p className="text-sm sm:text-base text-gray-500">
                Berikut ringkasan performa bisnis Anda hari ini.
              </p>
            </div>
            <Popover open={showNotifications} onOpenChange={setShowNotifications}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 glass px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-white/90 transition-all cursor-pointer relative shadow-sm"
                >
                  <Bell className="w-4 h-4 text-orange-500" />
                  <span>{recentActivities.length} Aktivitas</span>
                  {recentActivities.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 gradient-primary text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg">
                      {recentActivities.length > 9 ? '9+' : recentActivities.length}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 sm:w-96 p-0 shadow-xl border-0" align="end">
                <div className="p-4 border-b gradient-primary text-white rounded-t-lg">
                  <h4 className="font-semibold">Notifikasi</h4>
                  <p className="text-sm text-white/80">{recentActivities.length} aktivitas hari ini</p>
                </div>
                <div className="p-3 bg-gray-50 border-b">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={notificationDateFilter}
                      onChange={(e) => setNotificationDateFilter(e.target.value)}
                      className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 outline-none bg-white"
                    />
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {recentActivities.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Belum ada notifikasi
                    </div>
                  ) : (
                    <div className="divide-y">
                      {recentActivities.slice(0, 10).map((act, idx) => (
                        <div
                          key={idx}
                          className="p-4 hover:bg-orange-50/50 transition-colors cursor-pointer"
                          onClick={() => {
                            toast({
                              title: act.desc,
                              description: `${formatDateTimeWITA(act.date)} - Rp ${act.amount.toLocaleString('id-ID')}`,
                            })
                            setShowNotifications(false)
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 p-1.5 rounded-lg ${act.type === 'egg' ? 'bg-orange-100' :
                              act.type === 'martabak' ? 'bg-yellow-100' :
                                'bg-red-100'
                              }`}>
                              {act.type === 'egg' ? <Egg className="w-3.5 h-3.5 text-orange-600" /> :
                                act.type === 'martabak' ? <UtensilsCrossed className="w-3.5 h-3.5 text-yellow-600" /> :
                                  <Wallet className="w-3.5 h-3.5 text-red-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{act.desc}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{formatDateTimeWITA(act.date)}</p>
                            </div>
                            <span className={`text-sm font-semibold ${act.type === 'expense' ? 'text-red-600' : 'text-green-600'
                              }`}>
                              {act.type === 'expense' ? '-' : '+'}Rp {(act.amount / 1000).toFixed(0)}k
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Alerts */}
          {stockStatus.isLow && (
            <div className="mb-8 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4 animate-slide-up shadow-sm">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-red-800 text-lg">Stok Menipis!</h4>
                <p className="text-sm text-red-600 mt-1">
                  Sisa stok telur fisik saat ini hanya <span className="font-bold">{stockStatus.realStock} butir</span>. Segera lakukan restock untuk menghindari kehabisan stok.
                </p>
              </div>
              <Link href="/egg-sales?tab=stok">
                <Button className="gradient-primary shadow-lg shadow-orange-500/20">
                  Restock
                </Button>
              </Link>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Revenue Card */}
            <Card className="border-0 shadow-lg card-hover overflow-hidden animate-slide-up">
              <div className="absolute inset-0 gradient-blue opacity-95" />
              <CardContent className="p-6 relative z-10 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-blue-100 font-medium text-sm">Omset Bulan Ini</p>
                    <h3 className="text-2xl sm:text-3xl font-bold mt-1">
                      Rp {currentMonthStats.revenue.toLocaleString("id-ID")}
                    </h3>
                  </div>
                  <div className="p-3 bg-white/20 rounded-xl">
                    <ArrowUpRight className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-blue-100 bg-white/15 w-fit px-3 py-1.5 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                  <span>Pendapatan Kotor</span>
                </div>
              </CardContent>
              {/* Decorative elements */}
              <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute -right-4 top-4 w-20 h-20 bg-white/5 rounded-full" />
            </Card>

            {/* Profit Card */}
            <Card className="border-0 shadow-lg card-hover bg-white animate-slide-up delay-100">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 font-medium text-sm">Keuntungan Bersih</p>
                    <h3 className={`text-2xl sm:text-3xl font-bold mt-1 ${currentMonthStats.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      Rp {currentMonthStats.profit.toLocaleString("id-ID")}
                    </h3>
                  </div>
                  <div className={`p-3 rounded-xl ${currentMonthStats.profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Wallet className={`w-6 h-6 ${currentMonthStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                </div>
                <p className="text-sm text-gray-400 mt-4">Total Pemasukan - Semua Biaya</p>
              </CardContent>
            </Card>

            {/* Expense Card */}
            <Card className="border-0 shadow-lg card-hover bg-white animate-slide-up delay-200">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 font-medium text-sm">Total Pengeluaran</p>
                    <h3 className="text-2xl sm:text-3xl font-bold mt-1 text-red-600">
                      Rp {currentMonthStats.cost.toLocaleString("id-ID")}
                    </h3>
                  </div>
                  <div className="p-3 rounded-xl bg-red-100">
                    <ArrowDownRight className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-400 mt-4">Bahan Baku & Operasional</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Main Chart */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-lg h-full animate-slide-up delay-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-orange-500" />
                    Tren Penjualan 7 Hari Terakhir
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(value) => `${value / 1000}k`} />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.15)' }}
                          formatter={(value: number) => [`Rp ${value.toLocaleString("id-ID")}`, "Omset"]}
                        />
                        <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg h-full animate-slide-up delay-400">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                  Aksi Cepat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(user.role === 'admin' || user.accessPages.includes('egg-sales')) && (
                  <>
                    <Link href="/egg-sales?action=add" className="block">
                      <div className="group flex items-center justify-between p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-orange-100 rounded-xl text-orange-600 group-hover:bg-orange-200 transition-colors group-hover:scale-110">
                            <Egg className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 group-hover:text-orange-700">Jual Telur</span>
                            <p className="text-xs text-gray-400">Input penjualan baru</p>
                          </div>
                        </div>
                        <Plus className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-transform group-hover:rotate-90" />
                      </div>
                    </Link>

                    <Link href="/egg-sales?tab=stok" className="block">
                      <div className="group flex items-center justify-between p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600 group-hover:bg-blue-200 transition-colors group-hover:scale-110">
                            <Package className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 group-hover:text-blue-700">Update Stok</span>
                            <p className="text-xs text-gray-400">Catat stok masuk</p>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  </>
                )}

                {(user.role === 'admin' || user.accessPages.includes('martabak-sales')) && (
                  <Link href="/martabak-sales?action=add" className="block">
                    <div className="group flex items-center justify-between p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-yellow-400 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-amber-50 transition-all cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-yellow-100 rounded-xl text-yellow-600 group-hover:bg-yellow-200 transition-colors group-hover:scale-110">
                          <UtensilsCrossed className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 group-hover:text-yellow-700">Jual Martabak</span>
                          <p className="text-xs text-gray-400">Input penjualan baru</p>
                        </div>
                      </div>
                      <Plus className="w-5 h-5 text-gray-400 group-hover:text-yellow-500 transition-transform group-hover:rotate-90" />
                    </div>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="border-0 shadow-lg animate-slide-up delay-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-500" />
                Aktivitas Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">Belum ada aktivitas hari ini</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentActivities.slice(0, 6).map((act, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-white border border-gray-100 hover:shadow-md transition-all">
                      <div className={`p-2 rounded-lg ${act.type === 'egg' ? 'bg-orange-100' :
                        act.type === 'martabak' ? 'bg-yellow-100' :
                          'bg-red-100'
                        }`}>
                        {act.type === 'egg' ? <Egg className="w-4 h-4 text-orange-600" /> :
                          act.type === 'martabak' ? <UtensilsCrossed className="w-4 h-4 text-yellow-600" /> :
                            <Wallet className="w-4 h-4 text-red-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{act.desc}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-400">{formatDateTimeWITA(act.date)}</span>
                          <span className={`text-sm font-semibold ${act.type === 'expense' ? 'text-red-600' : 'text-green-600'
                            }`}>
                            {act.type === 'expense' ? '-' : '+'}Rp {(act.amount / 1000).toFixed(0)}k
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </SidebarProvider>
  )
}
