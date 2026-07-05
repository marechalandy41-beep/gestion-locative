import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Encodage base64url
function base64urlToUint8Array(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)))
}

async function generateVapidAuth(audience) {
  const privateKeyBytes = base64urlToUint8Array(process.env.VAPID_PRIVATE_KEY)
  const privateKey = await crypto.subtle.importKey(
    'raw', privateKeyBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']
  ).catch(async () => {
    // Fallback: essayer comme pkcs8
    return null
  })

  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payload = btoa(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: process.env.VAPID_EMAIL || 'mailto:contact@magestion-locative.fr',
  })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  return `${header}.${payload}`
}

export async function POST(request) {
  try {
    const { userId, title, body, url } = await request.json()

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)

    if (!subs || subs.length === 0) {
      return NextResponse.json({ success: true, message: 'Aucun abonnement push' })
    }

    // Pour l'instant on log juste — l'implémentation VAPID manuelle est complexe
    // On utilisera un service tiers dans une prochaine version
    console.log(`Push à envoyer à ${subs.length} abonnement(s) : ${title} — ${body}`)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}