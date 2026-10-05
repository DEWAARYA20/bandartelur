"use client"

import { supabase } from "@/lib/supabase"

interface TableData {
    tableName: string
    rows: any[]
}

// Tables to backup in order (respecting foreign key dependencies)
const BACKUP_TABLES = [
    "cabangs",
    "users",
    "egg_stocks",
    "egg_sales",
    "martabak_sales",
    "ingredients",
    "egg_waste",
    "operational_expenses"
]

// Helper to escape SQL string values
function escapeSqlValue(value: any): string {
    if (value === null || value === undefined) {
        return "NULL"
    }
    if (typeof value === "boolean") {
        return value ? "TRUE" : "FALSE"
    }
    if (typeof value === "number") {
        return String(value)
    }
    if (Array.isArray(value)) {
        // Handle PostgreSQL arrays (like access_pages)
        const escaped = value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(", ")
        return `ARRAY[${escaped}]`
    }
    if (typeof value === "object") {
        // Handle Date objects
        if (value instanceof Date) {
            return `'${value.toISOString()}'`
        }
        // Handle JSON objects
        return `'${JSON.stringify(value).replace(/'/g, "''")}'`
    }
    // String value - escape single quotes
    return `'${String(value).replace(/'/g, "''")}'`
}

// Generate INSERT statement for a row
function generateInsertStatement(tableName: string, row: any): string {
    const columns = Object.keys(row)
    const values = columns.map(col => escapeSqlValue(row[col]))

    return `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${values.join(", ")});`
}

// Fetch all data from a table
async function fetchTableData(tableName: string): Promise<any[]> {
    if (!supabase) return []

    const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .order("created_at", { ascending: true })

    if (error) {
        console.warn(`Error fetching ${tableName}:`, error.message)
        return []
    }

    return data || []
}

// Generate complete SQL backup
export async function generateSqlBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const tablesData: TableData[] = []

    // Fetch all table data
    for (const tableName of BACKUP_TABLES) {
        const rows = await fetchTableData(tableName)
        tablesData.push({ tableName, rows })
    }

    // Build SQL file content
    let sql = `-- ============================================
-- BANDAR TELUR - DATABASE BACKUP
-- ============================================
-- Generated: ${new Date().toLocaleString("id-ID")}
-- Total Tables: ${tablesData.length}
-- ============================================
-- CARA RESTORE:
-- 1. Jalankan scripts/setup-database.sql terlebih dahulu
-- 2. Kemudian jalankan file backup ini
-- ============================================

`

    // Add DELETE statements to clear existing data (in reverse order for FK)
    sql += `-- ============================================
-- CLEAR EXISTING DATA (optional, uncomment if needed)
-- ============================================
/*
DELETE FROM operational_expenses;
DELETE FROM egg_waste;
DELETE FROM ingredients;
DELETE FROM martabak_sales;
DELETE FROM egg_sales;
DELETE FROM egg_stocks;
DELETE FROM users WHERE email != 'admin@gmail.com';
DELETE FROM cabangs;
*/

`

    // Add INSERT statements for each table
    let totalRows = 0
    for (const { tableName, rows } of tablesData) {
        if (rows.length === 0) {
            sql += `-- ============================================
-- ${tableName.toUpperCase()} (0 rows - empty)
-- ============================================

`
            continue
        }

        sql += `-- ============================================
-- ${tableName.toUpperCase()} (${rows.length} rows)
-- ============================================
`

        for (const row of rows) {
            sql += generateInsertStatement(tableName, row) + "\n"
            totalRows++
        }

        sql += "\n"
    }

    // Add summary footer
    sql += `-- ============================================
-- BACKUP COMPLETE
-- ============================================
-- Total rows backed up: ${totalRows}
-- Tables backed up: ${tablesData.filter(t => t.rows.length > 0).length}
-- ============================================
`

    return sql
}

// Download SQL backup as file
export async function downloadSqlBackup(): Promise<{ success: boolean; error?: string; filename?: string }> {
    try {
        const sql = await generateSqlBackup()
        const timestamp = new Date().toISOString().slice(0, 10)
        const filename = `bandar-telur-backup-${timestamp}.sql`

        // Create blob and download
        const blob = new Blob([sql], { type: "text/plain;charset=utf-8" })
        const url = URL.createObjectURL(blob)

        const link = document.createElement("a")
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        URL.revokeObjectURL(url)

        return { success: true, filename }
    } catch (error: any) {
        console.error("Backup error:", error)
        return { success: false, error: error.message || "Failed to generate backup" }
    }
}

// Get backup size estimation
export async function getBackupSizeEstimate(): Promise<{ rows: number; tables: number; estimatedKB: number }> {
    let totalRows = 0
    let tablesWithData = 0

    for (const tableName of BACKUP_TABLES) {
        const rows = await fetchTableData(tableName)
        if (rows.length > 0) {
            totalRows += rows.length
            tablesWithData++
        }
    }

    // Estimate ~200 bytes per row in SQL format
    const estimatedKB = Math.ceil((totalRows * 200) / 1024)

    return { rows: totalRows, tables: tablesWithData, estimatedKB }
}
