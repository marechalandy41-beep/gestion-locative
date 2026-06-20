import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()

    // Récupère le client Stripe de l'utilisateur
    const { data: customerData } = await supabaseAdmin
      .from('customers')
      .select('stripe_customer_id, plan')
      .eq('user_id', userId)
      .single()

    // Si pas de client Stripe ou plan gratuit, rien à faire
    if (!customerData?.stripe_customer_id || customerData.stripe_customer_id === 'none' || customerData.plan === 'gratuit') {
      return NextResponse.json({ success: true, skipped: true })
    }

    // Compte les baux actifs de l'utilisateur
    const { count } = await supabaseAdmin
      .from('Baux')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('statut', 'actif')

    const quantite = count || 0

    // Récupère l'abonnement actif
    const subscriptions = await stripe.subscriptions.list({
      customer: customerData.stripe_customer_id,
      status: 'active',
    })

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ success: true, skipped: true, reason: 'Aucun abonnement actif' })
    }

    const subscription = subscriptions.data[0]
    const itemId = subscription.items.data[0].id

    // Si quantité = 0, on ne descend pas à 0 chez Stripe (minimum 1 ligne, mais on pourrait aussi annuler)
    const quantiteFinale = Math.max(quantite, 0)

    await stripe.subscriptions.update(subscription.id, {
      items: [{ id: itemId, quantity: quantiteFinale }],
      proration_behavior: 'always_invoice',
    })

    return NextResponse.json({ success: true, quantite: quantiteFinale })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}