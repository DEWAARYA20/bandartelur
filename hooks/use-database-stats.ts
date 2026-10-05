"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export interface TableStats {
    name: string
    displayName: string
    count: number
    estimatedSizeBytes: number
    avgRowSizeBytes: number
    indexSizeBytes: number
}

export interface DatabaseStats {
    // Table stats
    tables: TableStats[]
    totalRows: number
    totalDataSizeBytes: number
    totalIndexSizeBytes: number
    totalSizeBytes: number

    // Supabase limits
    freeTierLimits: {
        databaseMB: number
        storageMB: number
        bandwidthGB: number
        apiRequestsPerDay: number
    }

    // Usage percentages
    usagePercent: number

    // Status
    loading: boolean
    error: string | null
    lastUpdated: Date | null

    // Metadata
    tablesFound: number
    tablesMissing: string[]
}

// More accurate bytes per row estimation based on column types
// PostgreSQL uses approximately:
// - UUID: 16 bytes
// - TEXT (avg 50 chars): 54 bytes (4 + length)
// - TIMESTAMP WITH TIME ZONE: 8 bytes
// - INTEGER: 4 bytes
// - DECIMAL(10,2): 8 bytes
// - TEXT[] (array): 40+ bytes
// Plus ~23 bytes row overhead per tuple

const TABLE_SCHEMA: Record<string, { avgRowBytes: number; indexBytes: number; columns: string }> = {
    users: {
        avgRowBytes: 350, // UUID(16) + email(100) + password(50) + name(80) + role(20) + cabang_id(16) + access_pages(60) + timestamps(16) + overhead(23)
        indexBytes: 80,   // email index + role index + cabang_id index
        columns: "id, email, password_hash, full_name, role, cabang_id, access_pages, created_at, updated_at"
    },
    cabangs: {
        avgRowBytes: 180, // UUID(16) + name(50) + description(80) + timestamps(16) + overhead(23)
        indexBytes: 40,   // name index
        columns: "id, name, description, created_at, updated_at"
    },
    cabang: {
        avgRowBytes: 180,
        indexBytes: 40,
        columns: "id, name, description, created_at, updated_at"
    },
    egg_sales: {
        avgRowBytes: 140, // UUID(16) + user_id(16) + cabang_id(16) + date(4) + size(10) + quantity(4) + price(8) + total(8) + timestamps(16) + overhead(23)
        indexBytes: 60,   // user_id + cabang_id + date indexes
        columns: "id, user_id, cabang_id, date, size, quantity, price_per_egg, total_price, created_at, updated_at"
    },
    martabak_sales: {
        avgRowBytes: 140,
        indexBytes: 60,
        columns: "id, user_id, cabang_id, date, quantity, price_per_unit, total_price, eggs_used, created_at, updated_at"
    },
    egg_stocks: {
        avgRowBytes: 150,
        indexBytes: 60,
        columns: "id, user_id, cabang_id, date, size, rack_count, eggs_per_rack, price_per_egg, total_eggs, created_at, updated_at"
    },
    ingredients: {
        avgRowBytes: 200, // UUID(16) + user_id(16) + cabang_id(16) + name(60) + quantity(8) + unit(20) + cost(8) + date(4) + timestamps(16) + overhead(23)
        indexBytes: 60,
        columns: "id, user_id, cabang_id, name, quantity, unit, cost, date, created_at, updated_at"
    },
    egg_waste: {
        avgRowBytes: 120,
        indexBytes: 40,
        columns: "id, cabang_id, date, size, quantity, reason, created_at"
    },
    operational_expenses: {
        avgRowBytes: 180,
        indexBytes: 60,
        columns: "id, user_id, cabang_id, date, category, amount, description, created_at"
    }
}

// Display names in Indonesian
const TABLE_DISPLAY_NAMES: Record<string, string> = {
    users: "Pengguna",
    cabangs: "Cabang",
    cabang: "Cabang (Legacy)",
    egg_sales: "Penjualan Telur",
    martabak_sales: "Penjualan Martabak",
    egg_stocks: "Stok Telur",
    ingredients: "Bahan Baku",
    egg_waste: "Kerusakan Telur",
    operational_expenses: "Biaya Operasional"
}

export function useDatabaseStats() {
    const [stats, setStats] = useState<DatabaseStats>({
        tables: [],
        totalRows: 0,
        totalDataSizeBytes: 0,
        totalIndexSizeBytes: 0,
        totalSizeBytes: 0,
        freeTierLimits: {
            databaseMB: 500,      // 500 MB database
            storageMB: 1024,      // 1 GB file storage
            bandwidthGB: 2,       // 2 GB bandwidth per month
            apiRequestsPerDay: 500000 // 500k API requests per day
        },
        usagePercent: 0,
        loading: true,
        error: null,
        lastUpdated: null,
        tablesFound: 0,
        tablesMissing: []
    })

    const fetchStats = useCallback(async () => {
        if (!supabase) {
            setStats(prev => ({ ...prev, loading: false, error: "Supabase not initialized" }))
            return
        }

        setStats(prev => ({ ...prev, loading: true, error: null }))

        try {
            const tableNames = Object.keys(TABLE_SCHEMA)
            const tableStats: TableStats[] = []
            let totalRows = 0
            let totalDataSizeBytes = 0
            let totalIndexSizeBytes = 0
            const tablesMissing: string[] = []

            // Fetch count for each table
            for (const tableName of tableNames) {
                try {
                    const { count, error } = await supabase
                        .from(tableName)
                        .select("*", { count: "exact", head: true })

                    if (error) {
                        // Table might not exist
                        if (error.message.includes("does not exist") || error.code === "42P01") {
                            tablesMissing.push(tableName)
                        } else {
                            console.warn(`Error counting ${tableName}:`, error.message)
                        }
                        continue
                    }

                    const rowCount = count || 0
                    const schema = TABLE_SCHEMA[tableName]
                    const dataSizeBytes = rowCount * schema.avgRowBytes
                    const indexSizeBytes = rowCount * schema.indexBytes

                    tableStats.push({
                        name: tableName,
                        displayName: TABLE_DISPLAY_NAMES[tableName] || tableName,
                        count: rowCount,
                        estimatedSizeBytes: dataSizeBytes + indexSizeBytes,
                        avgRowSizeBytes: schema.avgRowBytes,
                        indexSizeBytes: indexSizeBytes
                    })

                    totalRows += rowCount
                    totalDataSizeBytes += dataSizeBytes
                    totalIndexSizeBytes += indexSizeBytes
                } catch (err) {
                    tablesMissing.push(tableName)
                }
            }

            // Sort tables by size (largest first)
            tableStats.sort((a, b) => b.estimatedSizeBytes - a.estimatedSizeBytes)

            const totalSizeBytes = totalDataSizeBytes + totalIndexSizeBytes
            const freeTierLimitBytes = 500 * 1024 * 1024 // 500 MB
            const usagePercent = (totalSizeBytes / freeTierLimitBytes) * 100

            setStats({
                tables: tableStats,
                totalRows,
                totalDataSizeBytes,
                totalIndexSizeBytes,
                totalSizeBytes,
                freeTierLimits: {
                    databaseMB: 500,
                    storageMB: 1024,
                    bandwidthGB: 2,
                    apiRequestsPerDay: 500000
                },
                usagePercent: Math.min(usagePercent, 100),
                loading: false,
                error: null,
                lastUpdated: new Date(),
                tablesFound: tableStats.length,
                tablesMissing
            })
        } catch (error: any) {
            setStats(prev => ({
                ...prev,
                loading: false,
                error: error.message || "Failed to fetch database stats"
            }))
        }
    }, [])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    return { ...stats, refresh: fetchStats }
}

// Helper function to format bytes
export function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B"

    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

// Helper function to get status color based on percentage
export function getUsageStatusColor(percent: number): { bg: string; text: string; bar: string } {
    if (percent >= 90) {
        return { bg: "bg-red-50", text: "text-red-600", bar: "bg-gradient-to-r from-red-500 to-red-600" }
    } else if (percent >= 75) {
        return { bg: "bg-orange-50", text: "text-orange-600", bar: "bg-gradient-to-r from-orange-500 to-orange-600" }
    } else if (percent >= 50) {
        return { bg: "bg-yellow-50", text: "text-yellow-600", bar: "bg-gradient-to-r from-yellow-500 to-yellow-600" }
    } else {
        return { bg: "bg-green-50", text: "text-green-600", bar: "bg-gradient-to-r from-green-500 to-green-600" }
    }
}
