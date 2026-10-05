import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ftmrpysfshftbhrpbqdq.supabase.co"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_yvAuBHe9IweO1ylryPNucA_zacZAeNL"

// Create Supabase client with optimized settings
export const supabase = supabaseUrl && supabaseKey
  ? createBrowserClient(supabaseUrl, supabaseKey, {
    global: {
      fetch: (url: RequestInfo | URL, options?: RequestInit) => fetch(url, {
        ...options,
        // Enable keepalive for connection reuse
        keepalive: true,
      }),
    },
  })
  : null

export const isSupabaseConfigured = !!supabase

