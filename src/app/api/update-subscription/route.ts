import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PRICE_MANUEL = 'price_1TkNf95LCX9emtMyBEftu67t'
const PRICE_AUTOMATIQUE = 'price_1TkNdU5LCX9emtMyGZ3X1hwy'

export async function POST(req: NextRequest) {
  try {
    const { userId, newPriceId } = await req.json()

    const { data: customerData, error } = await supabaseAdmin
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (error || !customerData?.stripe_customer_id || customerData.stripe_customer_id === 'none') {
      return NextResponse.json({ error: 'Aucun client Stripe trouvé.' }, { status: 400 })
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerData.stripe_customer_id,
      status: 'active',
    })

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ error: 'Aucun abonnement actif à modifier.' }, { status: 400 })
    }

    const subscription = subscriptions.data[0]
    const itemId = subscription.items.data[0].id

    // Modifie l'abonnement existant : remplace le prix, proratisé automatiquement
    await stripe.subscriptions.update(subscription.id, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: 'create_prorations',
    })

    // Met à jour le plan en base immédiatement
    let nouveauPlan = 'automatique'
    if (newPriceId === PRICE_MANUEL) nouveauPlan = 'manuel'
    else if (newPriceId === PRICE_AUTOMATIQUE) nouveauPlan = 'automatique'

    const { error: updateError } = await supabaseAdmin
      .from('customers')
      .update({ plan: nouveauPlan })
      .eq('user_id', userId)

    if (updateError) console.error('Erreur update plan après changement Stripe:', updateError.message)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}