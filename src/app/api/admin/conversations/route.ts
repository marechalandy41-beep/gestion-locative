import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .order('derniere_activite', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Récupère les emails des utilisateurs concernés
    const userIds = [...new Set(conversations.map(c => c.user_id).filter(Boolean))]
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const usersMap: Record<string, string> = {}
    users.forEach((u: any) => { usersMap[u.id] = u.email || '' })

    // Récupère les conversations ayant des messages client non lus par l'admin
    const { data: nonLus } = await supabaseAdmin
      .from('messages')
      .select('conversation_id')
      .eq('expediteur', 'client')
      .eq('lu_par_admin', false)

    const idsNonLus = new Set((nonLus || []).map(m => m.conversation_id))

    const conversationsAvecEmail = conversations.map(c => ({
      ...c,
      user_email: usersMap[c.user_id] || 'Inconnu',
      a_non_lu: idsNonLus.has(c.id),
    }))

    return NextResponse.json({ conversations: conversationsAvecEmail })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, statut } = await req.json()
    const { error } = await supabaseAdmin.from('conversations').update({ statut }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}