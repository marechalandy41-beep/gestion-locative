import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Token manquant.' }, { status: 400 })

    const { data: invitation, error: invErr } = await supabaseAdmin
      .from('invitations')
      .select('bail_id')
      .eq('token', token)
      .single()

    if (invErr || !invitation) return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 404 })

    const { data: signalements } = await supabaseAdmin
      .from('signalements_locataires')
      .select('id, titre, description, photo_url, statut, created_at')
      .eq('bail_id', invitation.bail_id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ signalements: signalements || [] })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}