import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resyncAbonnementUtilisateur } from '@/lib/resyncAbonnement'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data: customers } = await supabaseAdmin
    .from('customers')
    .select('user_id')
    .neq('plan', 'gratuit')
    .not('stripe_customer_id', 'is', null)

  const resultats = []
  for (const c of customers || []) {
    try {
      const result = await resyncAbonnementUtilisateur(c.user_id)
      resultats.push({ userId: c.user_id, ...result })
    } catch (e: any) {
      resultats.push({ userId: c.user_id, error: e.message })
    }
  }

  return NextResponse.json({ total: resultats.length, resultats })
}