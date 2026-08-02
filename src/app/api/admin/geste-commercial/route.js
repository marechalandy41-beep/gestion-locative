import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resyncAbonnementUtilisateur } from '@/lib/resyncAbonnement'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { userId, pourcentage, mois } = await request.json()

    if (!userId || !pourcentage || !mois) {
      return NextResponse.json({ error: 'Paramètres manquants (userId, pourcentage, mois).' }, { status: 400 })
    }
    if (pourcentage < 1 || pourcentage > 100) {
      return NextResponse.json({ error: 'Le pourcentage doit être entre 1 et 100.' }, { status: 400 })
    }

    const expireLe = new Date()
    expireLe.setMonth(expireLe.getMonth() + parseInt(mois))

    const { error } = await supabaseAdmin
      .from('customers')
      .update({
        geste_commercial_pct: parseInt(pourcentage),
        geste_commercial_expire_le: expireLe.toISOString().split('T')[0],
      })
      .eq('user_id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Applique immédiatement le nouveau tarif sur l'abonnement Stripe actif (sans attendre le cron du lendemain)
    const resultat = await resyncAbonnementUtilisateur(userId)

    return NextResponse.json({ success: true, expire_le: expireLe.toISOString().split('T')[0], resync: resultat })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}