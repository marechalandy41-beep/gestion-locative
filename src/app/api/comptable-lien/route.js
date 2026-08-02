import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId manquant.' }, { status: 400 })

    const { data: existant } = await supabaseAdmin
      .from('invitations_comptable')
      .select('token')
      .eq('user_id', userId)
      .eq('actif', true)
      .maybeSingle()

    if (existant?.token) {
      return NextResponse.json({ token: existant.token })
    }

    const token = crypto.randomUUID()
    const { error } = await supabaseAdmin
      .from('invitations_comptable')
      .insert({ user_id: userId, token, actif: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ token })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId manquant.' }, { status: 400 })

    await supabaseAdmin
      .from('invitations_comptable')
      .update({ actif: false })
      .eq('user_id', userId)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}