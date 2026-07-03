import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders } from "../_shared/cors.ts"

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_VERIFY_SID = Deno.env.get('TWILIO_VERIFY_SID')

const twilioBase = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SID || ''}`
const authHeader = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID || ''}:${TWILIO_AUTH_TOKEN || ''}`)

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { action, phone, code } = await req.json()

    if (!phone) throw new Error('Phone number is required')

    // If Twilio isn't set up, mock success for development/testing
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SID) {
      if (action === 'send') {
        return new Response(JSON.stringify({ success: true, status: 'pending', mock: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else if (action === 'check') {
        // Any code works in mock mode
        return new Response(JSON.stringify({ success: true, verified: true, mock: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Normalize phone to E.164 — Malawi numbers: +265XXXXXXXXX
    let normalizedPhone = phone.trim().replace(/\s+/g, '')
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+265' + normalizedPhone.slice(1)
    } else if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+265' + normalizedPhone
    }

    if (action === 'send') {
      const res = await fetch(`${twilioBase}/Verifications`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: normalizedPhone, Channel: 'sms' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP')
      return new Response(JSON.stringify({ success: true, status: data.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else if (action === 'check') {
      if (!code) throw new Error('OTP code is required')
      const res = await fetch(`${twilioBase}/VerificationCheck`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: normalizedPhone, Code: code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to verify OTP')
      const verified = data.status === 'approved' && data.valid === true
      return new Response(JSON.stringify({ success: true, verified }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    throw new Error('Invalid action. Use "send" or "check"')

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
