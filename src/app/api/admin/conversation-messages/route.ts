import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const conversationId = req.nextUrl.searchParams.get('conversationId')
    if (!conversationId) return NextResponse.json({ error: 'conversationId manquant' }, { status: 400 })

    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Marque les messages client comme lus par l'admin
    await supabaseAdmin
      .from('messages')
      .update({ lu_par_admin: true })
      .eq('conversation_id', conversationId)
      .eq('expediteur', 'client')

    return NextResponse.json({ messages })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}