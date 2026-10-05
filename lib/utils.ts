import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date and time in WITA timezone (Asia/Makassar, UTC+8)
 * Used for Palu, Sulawesi Tengah
 */
export function formatDateTimeWITA(date: string | Date, createdAt?: string | Date): string {
  try {
    let dateObj: Date
    
    if (typeof date === 'string') {
      // Check if it's a date-only string (YYYY-MM-DD) or has time component
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Date-only string: use createdAt if available for accurate time, otherwise use date with default time
        if (createdAt) {
          // Use createdAt for accurate timestamp, but keep the date part from date parameter
          const createdDate = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
          if (!isNaN(createdDate.getTime())) {
            // Use the time from createdAt but ensure we're formatting in WITA
            dateObj = createdDate
          } else {
            // Fallback: create date at midnight in local time, will be converted to WITA
            const [year, month, day] = date.split('-').map(Number)
            dateObj = new Date(year, month - 1, day, 0, 0, 0)
          }
        } else {
          // No createdAt, use date with default midnight time
          // Parse as local date, Intl will convert to WITA
          const [year, month, day] = date.split('-').map(Number)
          dateObj = new Date(year, month - 1, day, 0, 0, 0)
        }
      } else {
        // Has time component (ISO string or other format), parse normally
        dateObj = new Date(date)
      }
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Tanggal tidak valid'
      }
    } else {
      dateObj = date
    }
    
    // Format: "DD MMM YYYY, HH:mm WITA"
    // Use Asia/Makassar timezone (WITA - UTC+8) for Palu, Sulawesi Tengah
    // Intl.DateTimeFormat will automatically convert the date to WITA timezone
    const formatted = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Makassar',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(dateObj)
    
    return formatted + ' WITA'
  } catch (error) {
    console.error('Error formatting date:', error, date)
    return 'Tanggal tidak valid'
  }
}

/**
 * Format date only in WITA timezone
 */
export function formatDateWITA(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(dateObj)
}

/**
 * Get current date in WITA timezone as YYYY-MM-DD string
 * Used for date input fields
 */
export function getCurrentDateWITA(): string {
  const now = new Date()
  // Get current date in WITA timezone
  const witaDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)
  
  return witaDateStr // Returns YYYY-MM-DD format
}

/**
 * Get current date and time in WITA timezone as ISO string
 * Used for database inserts
 */
export function getCurrentDateTimeWITA(): string {
  const now = new Date()
  // Convert to WITA timezone
  const witaDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Makassar" }))
  return witaDate.toISOString()
}
