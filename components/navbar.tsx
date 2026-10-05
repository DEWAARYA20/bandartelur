"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { LogOut, Menu, UserCircle, ChevronDown } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useSidebar } from "./sidebar-context"
import { Button } from "./ui/button"

export function Navbar() {
  const router = useRouter()
  const { user } = useAuth()
  const { setOpen } = useSidebar()

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

  return (
    <div className="fixed top-0 left-0 right-0 h-16 glass shadow-sm z-50">
      <div className="h-full px-4 md:px-6 flex items-center justify-between max-w-[1920px] mx-auto">
        {/* Left Section: Mobile Menu + Logo */}
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden p-2.5 text-gray-600 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-all active:scale-95"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/dashboard" className="flex items-center gap-2 md:gap-3 group">
            <div className="relative w-9 h-9 md:w-10 md:h-10 overflow-hidden rounded-xl shadow-md shadow-orange-500/10 ring-2 ring-orange-100 group-hover:ring-orange-200 transition-all group-hover:scale-105">
              <Image
                src="/logo-bandar-telur.png"
                alt="Bandar Telur"
                fill
                className="object-cover"
              />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold text-gradient">Bandar Telur</span>
              <p className="text-[10px] text-gray-400 font-medium -mt-0.5">Management System</p>
            </div>
          </Link>
        </div>

        {/* Right Section: User Profile */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* User Info */}
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-gray-50/50 border border-gray-100">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900 leading-none">{user?.name}</p>
              <p className="text-[10px] text-gray-500 font-medium capitalize mt-0.5">
                {user?.role} {user?.cabangName ? `• ${user.cabangName}` : ''}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>

          {/* Avatar */}
          <Link href="/profile" className="group relative">
            <div
              className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-lg ring-2 ring-white group-hover:ring-orange-200 transition-all group-hover:scale-105 ${getAvatarColor(user?.name || "User")}`}
            >
              {user?.name ? getInitials(user.name) : <UserCircle className="w-6 h-6" />}
            </div>
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          </Link>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-200 mx-1 hidden md:block" />

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              localStorage.clear()
              router.push("/login")
            }}
            className="text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
