"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/hooks/use-auth"
import {
  LayoutDashboard,
  Egg,
  UtensilsCrossed,
  Wallet,
  Settings,
  LogOut,
  UserCircle,
  ChevronRight,
  User,
} from "lucide-react"

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const allMenuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, key: "dashboard" },
    { href: "/egg-sales", label: "Penjualan Telur", icon: Egg, key: "egg-sales" },
    { href: "/martabak-sales", label: "Penjualan Martabak", icon: UtensilsCrossed, key: "martabak-sales" },
    { href: "/financial", label: "Laporan Keuangan", icon: Wallet, key: "financial" },
    { href: "/admin", label: "Admin Panel", icon: Settings, key: "admin" },
  ]

  // Filter menu items based on user's access pages
  const menuItems = allMenuItems.filter((item) => {
    if (item.key === "admin") return user?.role === "admin"
    if (user?.role === "admin") return true
    const userAccessPages = user?.accessPages || ["dashboard"]
    return userAccessPages.includes(item.key)
  })

  // Mobile bottom nav items - show all menu items (no slicing)

  // Get first letter of name for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Consistent avatar color
  const getAvatarColor = (name: string) => {
    const uniqueVal = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const colors = [
      "bg-gradient-to-br from-orange-400 to-orange-600",
      "bg-gradient-to-br from-blue-400 to-blue-600",
      "bg-gradient-to-br from-green-400 to-green-600",
      "bg-gradient-to-br from-purple-400 to-purple-600",
      "bg-gradient-to-br from-pink-400 to-pink-600",
    ]
    return colors[uniqueVal % colors.length]
  }

  const MenuContent = () => (
    <nav className="px-3 py-2 space-y-1">
      {menuItems.map((item, index) => {
        const isActive = pathname === item.href
        const IconComponent = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className="block"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div
              className={`group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30"
                : "text-gray-700 hover:bg-orange-50 hover:text-orange-700"
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? "bg-white/20" : "bg-gray-100 group-hover:bg-orange-100"}`}>
                  <IconComponent
                    className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-gray-600 group-hover:text-orange-600"
                      }`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
                <span className={`text-sm font-medium ${isActive ? "text-white font-semibold" : ""}`}>{item.label}</span>
              </div>

              {isActive && (
                <ChevronRight className="w-4 h-4 text-white/80" />
              )}
            </div>
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Desktop Sidebar - Only visible on large screens */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-gray-200 overflow-y-auto z-40 flex-col shadow-sm">
        {/* Header with Logo */}
        <div className="p-5 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative w-11 h-11 overflow-hidden rounded-xl shadow-md shadow-orange-500/10 ring-2 ring-orange-100 group-hover:ring-orange-200 transition-all group-hover:scale-105">
              <Image
                src="/logo-bandar-telur.png"
                alt="Bandar Telur"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">Bandar Telur</span>
              <p className="text-[10px] text-gray-400 font-medium -mt-0.5">Management System</p>
            </div>
          </Link>
        </div>

        {/* User Profile Section - Clickable to go to profile */}
        <Link href="/profile" className="block px-4 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100">
            <div className="relative">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-lg ${getAvatarColor(user?.name || "User")}`}
              >
                {user?.name ? getInitials(user.name) : <UserCircle className="w-6 h-6" />}
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role === 'admin' ? 'Administrator' : 'Karyawan'}
                {user?.cabangName ? ` • ${user.cabangName}` : ''}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </Link>

        {/* Menu */}
        <div className="flex-1 py-3">
          <MenuContent />
        </div>

        {/* Footer with Logout */}
        <div className="p-4 bg-gradient-to-t from-gray-50 to-transparent border-t border-gray-100">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all group"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Keluar dari Akun</span>
          </button>

          <div className="flex items-center gap-3 p-3 mt-3 rounded-xl bg-white border border-gray-100 shadow-sm">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping opacity-75" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700">Sistem Terhubung</p>
              <p className="text-[10px] text-gray-400">Real-time sync aktif</p>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-3">
            v1.2.0 © 2025 Bandar Telur
          </p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation - Only visible on mobile/tablet */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-around px-1 py-1.5 safe-area-pb">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            const IconComponent = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 max-w-[72px]"
              >
                <div className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-all ${isActive
                  ? "bg-gradient-to-t from-orange-100 to-orange-50"
                  : "hover:bg-gray-50"
                  }`}>
                  <div className={`p-2 rounded-xl transition-all ${isActive
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30"
                    : "bg-gray-100"
                    }`}>
                    <IconComponent
                      className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-500"}`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                  <span className={`text-[10px] font-medium truncate max-w-[60px] ${isActive ? "text-orange-600 font-semibold" : "text-gray-500"
                    }`}>
                    {item.label.split(' ')[0]}
                  </span>
                </div>
              </Link>
            )
          })}

          {/* Profile button on mobile */}
          <Link href="/profile" className="flex-1 max-w-[72px]">
            <div className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-all ${pathname === "/profile"
              ? "bg-gradient-to-t from-orange-100 to-orange-50"
              : "hover:bg-gray-50"
              }`}>
              <div className={`p-2 rounded-xl transition-all ${pathname === "/profile"
                ? "bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30"
                : "bg-gray-100"
                }`}>
                <User
                  className={`w-5 h-5 ${pathname === "/profile" ? "text-white" : "text-gray-500"}`}
                  strokeWidth={pathname === "/profile" ? 2.5 : 2}
                />
              </div>
              <span className={`text-[10px] font-medium ${pathname === "/profile" ? "text-orange-600 font-semibold" : "text-gray-500"
                }`}>
                Profil
              </span>
            </div>
          </Link>
        </div>
      </nav>
    </>
  )
}
