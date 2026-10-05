"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { SidebarProvider } from "@/components/sidebar-context"
import { Badge } from "@/components/ui/badge"
import { Loader2, User, Mail, Briefcase, MapPin, Calendar, TrendingUp, DollarSign, Award, LogOut } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState({
    eggSales: 0,
    eggRevenue: 0,
    martabakSales: 0,
    martabakRevenue: 0
  })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!loading && !user && mounted) {
      router.push("/login")
    } else if (user) {
      loadStats()
    }
  }, [user, loading, mounted, router])

  const loadStats = async () => {
    if (!user || !supabase) return
    try {
      // Get all-time stats for this user
      const [eggRes, martabakRes] = await Promise.all([
        supabase.from("egg_sales").select("total_price").eq("user_id", user.id),
        supabase.from("martabak_sales").select("total_price").eq("user_id", user.id)
      ])

      const eggRevenue = (eggRes.data || []).reduce((sum, item) => sum + item.total_price, 0)
      const martabakRevenue = (martabakRes.data || []).reduce((sum, item) => sum + item.total_price, 0)

      setStats({
        eggSales: (eggRes.data || []).length,
        eggRevenue,
        martabakSales: (martabakRes.data || []).length,
        martabakRevenue
      })
    } catch (error) {
      console.error("Error loading stats:", error)
    } finally {
      setLoadingStats(false)
    }
  }

  if (loading || !mounted || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)

  return (
    <SidebarProvider>
      <Sidebar />
      <main className="lg:ml-72 pt-4 pb-24 lg:pt-8 lg:pb-8 min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-amber-50/20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto space-y-6">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Profil Saya</h1>
              <p className="text-muted-foreground mt-1">Kelola informasi akun dan lihat performa kerja Anda</p>
            </div>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>Kembali ke Dashboard</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Profile Card */}
            <div className="md:col-span-1 space-y-6">
              <Card className="overflow-hidden border-none shadow-md">
                <div className="h-32 bg-gradient-to-r from-orange-400 to-red-500"></div>
                <div className="px-6 relative">
                  <div className="w-24 h-24 rounded-full bg-white p-1 absolute -top-12 border-4 border-white shadow-sm">
                    <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-600">
                      {initials}
                    </div>
                  </div>
                </div>
                <CardContent className="pt-14 pb-6 px-6 text-center">
                  <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Badge variant={user.role === 'admin' ? "destructive" : "default"} className="capitalize">
                      {user.role}
                    </Badge>
                    {user.cabangName && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {user.cabangName}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-6 pt-6 border-t w-full">
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                      <span className="flex items-center gap-2"><Briefcase className="w-4 h-4" /> Akses Halaman</span>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {user.accessPages.map(page => (
                        <span key={page} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 capitalize">
                          {page.replace('-', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t w-full text-left">
                    <span className="text-xs text-gray-400 block mb-2">Member sejak</span>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <Button variant="destructive" className="w-full mt-6" onClick={logout}>
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Stats & Details */}
            <div className="md:col-span-2 space-y-6">
              <Card className="border-none shadow-sm h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-orange-500" /> Ringkasan Performa
                  </CardTitle>
                  <CardDescription>Total kontribusi penjualan Anda sejauh ini</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <div className="space-y-4">
                      <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                      <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                      {/* Egg Stats */}
                      <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
                        <div className="flex items-start justify-between mb-2">
                          <div className="p-2 bg-white rounded-lg shadow-sm text-orange-600">
                            <TrendingUp className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded">Telur</span>
                        </div>
                        <p className="text-sm text-gray-600">Total Penjualan</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">Rp {stats.eggRevenue.toLocaleString('id-ID')}</h3>
                        <p className="text-xs text-gray-500 mt-1">{stats.eggSales} Transaksi sukses</p>
                      </div>

                      {/* Martabak Stats */}
                      <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-100">
                        <div className="flex items-start justify-between mb-2">
                          <div className="p-2 bg-white rounded-lg shadow-sm text-yellow-600">
                            <DollarSign className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-semibold text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Martabak</span>
                        </div>
                        <p className="text-sm text-gray-600">Total Penjualan</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">Rp {stats.martabakRevenue.toLocaleString('id-ID')}</h3>
                        <p className="text-xs text-gray-500 mt-1">{stats.martabakSales} Transaksi sukses</p>
                      </div>

                    </div>
                  )}

                  <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <h4 className="font-semibold text-blue-800 mb-1">Status Akun</h4>
                    <p className="text-sm text-blue-600">
                      Akun Anda dalam status <strong>Aktif</strong>. Anda memiliki akses sebagai <strong>{user.role}</strong> di <strong>{user.cabangName || 'Pusat'}</strong>.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </main>
    </SidebarProvider>
  )
}
