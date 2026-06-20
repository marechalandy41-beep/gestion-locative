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
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const customerId = session.customer

    // Récupère le user_id depuis les metadata du client Stripe
    const customer = await stripe.customers.retrieve(customerId) as any
    const userId = customer.metadata?.user_id

    // Récupère le price_id réellement acheté pour déterminer le plan
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
    const priceId = lineItems.data[0]?.price?.id

    let plan = 'automatique' // valeur par défaut de sécurité
    if (priceId === PRICE_MANUEL) plan = 'manuel'
    else if (priceId === PRICE_AUTOMATIQUE) plan = 'automatique'

    if (userId) {
      const { error } = await supabaseAdmin
        .from('customers')
        .update({ stripe_customer_id: customerId, plan })
        .eq('user_id', userId)

      if (error) console.error('Erreur webhook update plan:', error.message)
    } else {
      console.error('Pas de user_id trouvé dans les metadata Stripe pour', customerId)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as any
    const customerId = subscription.customer

    await supabaseAdmin
      .from('customers')
      .update({ plan: 'gratuit' })
      .eq('stripe_customer_id', customerId)
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as any
    const customerId = subscription.customer
    const priceId = subscription.items.data[0]?.price?.id

    let plan = 'automatique'
    if (priceId === PRICE_MANUEL) plan = 'manuel'
    else if (priceId === PRICE_AUTOMATIQUE) plan = 'automatique'

    await supabaseAdmin
      .from('customers')
      .update({ plan })
      .eq('stripe_customer_id', customerId)
  }

  return NextResponse.json({ received: true })
}