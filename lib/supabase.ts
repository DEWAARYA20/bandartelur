import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vcxzxlokpntvnwjujjxq.supabase.co"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_3tpxnuHveNxYA_CWAW30XQ_HzEot98_"

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

