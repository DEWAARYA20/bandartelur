import * as XLSX from 'xlsx'

export interface ExcelColumn {
    key: string
    header: string
    width?: number
}

export interface ExcelExportOptions {
    filename: string
    sheetName?: string
    columns: ExcelColumn[]
}

/**
 * Export data ke file Excel (.xlsx)
 */
export function exportToExcel<T extends Record<string, any>>(
    data: T[],
    options: ExcelExportOptions
): void {
    const { filename, sheetName = 'Sheet1', columns } = options

    // Transform data sesuai columns
    const rows = data.map(item => {
        const row: Record<string, any> = {}
        columns.forEach(col => {
            row[col.header] = item[col.key] ?? ''
        })
        return row
    })

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows)

    // Set column widths
    const colWidths = columns.map(col => ({ wch: col.width || 15 }))
    worksheet['!cols'] = colWidths

    // Create workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0]
    const fullFilename = `${filename}_${date}.xlsx`

    // Download file
    XLSX.writeFile(workbook, fullFilename)
}

/**
 * Export ringkasan cabang ke Excel
 */
export function exportCabangSummaryToExcel(
    cabangData: Array<{
        cabangName: string
        eggSalesCount: number
        eggRevenue: number
        martabakSalesCount: number
        martabakRevenue: number
        totalCost: number
        totalRevenue: number
        profit: number
    }>,
    dateRange: { start: string; end: string }
): void {
    const columns: ExcelColumn[] = [
        { key: 'cabangName', header: 'Cabang', width: 20 },
        { key: 'eggSalesCount', header: 'Jml Penjualan Telur', width: 20 },
        { key: 'eggRevenue', header: 'Omset Telur (Rp)', width: 18 },
        { key: 'martabakSalesCount', header: 'Jml Penjualan Martabak', width: 22 },
        { key: 'martabakRevenue', header: 'Omset Martabak (Rp)', width: 20 },
        { key: 'totalCost', header: 'Total Biaya (Rp)', width: 18 },
        { key: 'totalRevenue', header: 'Total Omset (Rp)', width: 18 },
        { key: 'profit', header: 'Keuntungan (Rp)', width: 18 },
    ]

    exportToExcel(cabangData, {
        filename: `Ringkasan_Cabang_${dateRange.start}_to_${dateRange.end}`,
        sheetName: 'Ringkasan Cabang',
        columns,
    })
}

/**
 * Export data penjualan telur ke Excel
 */
export function exportEggSalesToExcel(
    data: Array<{
        date: string
        cabangName: string
        size: string
        quantity: number
        pricePerEgg: number
        totalPrice: number
    }>
): void {
    const columns: ExcelColumn[] = [
        { key: 'date', header: 'Tanggal', width: 12 },
        { key: 'cabangName', header: 'Cabang', width: 15 },
        { key: 'size', header: 'Ukuran', width: 10 },
        { key: 'quantity', header: 'Jumlah', width: 10 },
        { key: 'pricePerEgg', header: 'Harga/Butir (Rp)', width: 15 },
        { key: 'totalPrice', header: 'Total (Rp)', width: 15 },
    ]

    exportToExcel(data, {
        filename: 'Penjualan_Telur',
        sheetName: 'Penjualan Telur',
        columns,
    })
}

/**
 * Export data penjualan martabak ke Excel
 */
export function exportMartabakSalesToExcel(
    data: Array<{
        date: string
        cabangName: string
        quantity: number
        pricePerUnit: number
        totalPrice: number
        eggsUsed: number
    }>
): void {
    const columns: ExcelColumn[] = [
        { key: 'date', header: 'Tanggal', width: 12 },
        { key: 'cabangName', header: 'Cabang', width: 15 },
        { key: 'quantity', header: 'Jumlah', width: 10 },
        { key: 'pricePerUnit', header: 'Harga/Unit (Rp)', width: 15 },
        { key: 'totalPrice', header: 'Total (Rp)', width: 15 },
        { key: 'eggsUsed', header: 'Telur Digunakan', width: 15 },
    ]

    exportToExcel(data, {
        filename: 'Penjualan_Martabak',
        sheetName: 'Penjualan Martabak',
        columns,
    })
}

/**
 * Export data stok telur ke Excel
 */
export function exportEggStocksToExcel(
    data: Array<{
        date: string
        cabangName: string
        size: string
        rackCount: number
        eggsPerRack: number
        totalEggs: number
        pricePerEgg: number
    }>
): void {
    const columns: ExcelColumn[] = [
        { key: 'date', header: 'Tanggal', width: 12 },
        { key: 'cabangName', header: 'Cabang', width: 15 },
        { key: 'size', header: 'Ukuran', width: 10 },
        { key: 'rackCount', header: 'Jumlah Rak', width: 12 },
        { key: 'eggsPerRack', header: 'Telur/Rak', width: 12 },
        { key: 'totalEggs', header: 'Total Telur', width: 12 },
        { key: 'pricePerEgg', header: 'Harga/Butir (Rp)', width: 15 },
    ]

    exportToExcel(data, {
        filename: 'Stok_Telur',
        sheetName: 'Stok Telur',
        columns,
    })
}

/**
 * Export data bahan baku ke Excel
 */
export function exportIngredientsToExcel(
    data: Array<{
        date: string
        cabangName: string
        name: string
        quantity: number
        unit: string
        cost: number
    }>
): void {
    const columns: ExcelColumn[] = [
        { key: 'date', header: 'Tanggal', width: 12 },
        { key: 'cabangName', header: 'Cabang', width: 15 },
        { key: 'name', header: 'Nama Bahan', width: 20 },
        { key: 'quantity', header: 'Jumlah', width: 10 },
        { key: 'unit', header: 'Satuan', width: 10 },
        { key: 'cost', header: 'Biaya (Rp)', width: 15 },
    ]

    exportToExcel(data, {
        filename: 'Bahan_Baku',
        sheetName: 'Bahan Baku',
        columns,
    })
}
