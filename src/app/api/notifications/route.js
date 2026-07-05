import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { user_id, type, message, lien } = await request.json()
    if (!user_id || !type || !message) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }
    const { error } = await supabase.from('notifications').insert({
      user_id, type, message, lien: lien || null, lu: false,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}