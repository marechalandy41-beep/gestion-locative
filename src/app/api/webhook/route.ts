import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getPriceIds() {
  const { data } = await supabaseAdmin
    .from('settings')
    .select('cle, valeur')
    .in('cle', ['price_id_manuel', 'price_id_auto'])

  const manuel = data?.find(s => s.cle === 'price_id_manuel')?.valeur
  const automatique = data?.find(s => s.cle === 'price_id_auto')?.valeur
  return { manuel, automatique }
}

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
    const { manuel: PRICE_MANUEL, automatique: PRICE_AUTOMATIQUE } = await getPriceIds()

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

    // Récupérer le user_id
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single()

    // Passer le plan en gratuit
    await supabaseAdmin
      .from('customers')
      .update({ plan: 'gratuit' })
      .eq('stripe_customer_id', customerId)

    // Passer tous les baux actifs en suspendu
    if (customer?.user_id) {
      await supabaseAdmin
        .from('Baux')
        .update({ statut: 'suspendu' })
        .eq('user_id', customer.user_id)
        .eq('statut', 'actif')
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as any
    const customerId = subscription.customer
    const priceId = subscription.items.data[0]?.price?.id
    const { manuel: PRICE_MANUEL_U, automatique: PRICE_AUTOMATIQUE_U } = await getPriceIds()

    let plan = 'automatique'
    if (priceId === PRICE_MANUEL_U) plan = 'manuel'
    else if (priceId === PRICE_AUTOMATIQUE_U) plan = 'automatique'

    await supabaseAdmin
      .from('customers')
      .update({ plan })
      .eq('stripe_customer_id', customerId)

      // Récupérer le user_id
const { data: custData } = await supabaseAdmin
  .from('customers')
  .select('user_id')
  .eq('stripe_customer_id', customerId)
  .single()

// Restaurer les baux suspendus si retour sur plan payant
if (custData?.user_id && (plan === 'manuel' || plan === 'automatique')) {
  await supabaseAdmin
    .from('Baux')
    .update({ statut: 'actif' })
    .eq('user_id', custData.user_id)
    .eq('statut', 'suspendu')
}
  }

  return NextResponse.json({ received: true })
}