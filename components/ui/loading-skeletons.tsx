"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

// Skeleton untuk StatCard
export function StatCardSkeleton() {
    return (
        <Card className="hover:shadow-md transition-shadow border-none shadow-sm h-full">
            <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="h-12 w-12 rounded-xl" />
            </CardContent>
        </Card>
    )
}

// Skeleton untuk baris tabel
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
    return (
        <tr className="border-b">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <Skeleton className="h-4 w-full max-w-[100px]" />
                </td>
            ))}
        </tr>
    )
}

// Skeleton untuk tabel lengkap
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
    return (
        <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-gray-100/50">
                    <tr>
                        {Array.from({ length: columns }).map((_, i) => (
                            <th key={i} className="px-4 py-3 text-left">
                                <Skeleton className="h-4 w-20" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {Array.from({ length: rows }).map((_, i) => (
                        <TableRowSkeleton key={i} columns={columns} />
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// Skeleton untuk Card dengan header
export function CardSkeleton() {
    return (
        <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-9 w-28" />
            </CardHeader>
            <CardContent>
                <TableSkeleton rows={5} columns={4} />
            </CardContent>
        </Card>
    )
}

// Skeleton untuk stat grid (3 cards)
export function StatsGridSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
        </div>
    )
}

// Skeleton untuk Dashboard chart area
export function ChartSkeleton() {
    return (
        <Card className="border-none shadow-sm h-full">
            <CardHeader>
                <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[300px] w-full rounded-lg" />
            </CardContent>
        </Card>
    )
}

// Skeleton untuk ringkasan cabang
export function CabangStatSkeleton() {
    return (
        <div className="border rounded-xl p-4">
            <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-5 w-24" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-5 w-24" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-5 w-24" />
                    </div>
                </div>
            </div>
        </div>
    )
}

// Skeleton untuk halaman penuh dengan layout
export function PageSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Stats Grid */}
            <StatsGridSkeleton />

            {/* Main content */}
            <CardSkeleton />
        </div>
    )
}
