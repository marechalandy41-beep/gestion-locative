import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { conversationId, userId, expediteur, contenu, sujet } = await req.json()

    let convId = conversationId

    // Si pas de conversation existante, on en crée une (premier message du client)
    if (!convId) {
      const { data: newConv, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({ user_id: userId, sujet: sujet || 'Nouvelle demande', statut: 'ouvert' })
        .select()
        .single()

      if (convError) return NextResponse.json({ error: convError.message }, { status: 400 })
      convId = newConv.id
    }

    // Insère le message
    const { error: msgError } = await supabaseAdmin.from('messages').insert({
      conversation_id: convId,
      expediteur,
      contenu,
      lu_par_admin: expediteur === 'admin',
      lu_par_client: expediteur === 'client',
    })

    if (msgError) return NextResponse.json({ error: msgError.message }, { status: 400 })

    // Met à jour la dernière activité et rouvre le fil si fermé
    await supabaseAdmin
      .from('conversations')
      .update({ derniere_activite: new Date().toISOString(), statut: 'ouvert' })
      .eq('id', convId)

    return NextResponse.json({ success: true, conversationId: convId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}