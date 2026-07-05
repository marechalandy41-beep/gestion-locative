import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { userId, subscription } = await request.json()
    if (!userId || !subscription) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }
    await supabase.from('push_subscriptions').upsert(
      { user_id: userId, subscription },
      { onConflict: 'user_id' }
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}