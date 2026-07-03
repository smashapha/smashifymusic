import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getCorsHeaders } from "../_shared/cors.ts"

const AT_USERNAME = Deno.env.get("AT_USERNAME")
const AT_API_KEY = Deno.env.get("AT_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"))
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify User Authorization
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace("Bearer ", "")
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase credentials missing on server")
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized access" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { to, message } = await req.json()

    if (!to || !message) throw new Error("Missing recipient or message")

    // Africa's Talking API
    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': AT_API_KEY!,
      },
      body: new URLSearchParams({
        username: AT_USERNAME!,
        to,
        message,
      }),
    })

    const result = await response.json()

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
