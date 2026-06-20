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

    const { data: customerData, error } = await supabaseAdmin
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (error || !customerData?.stripe_customer_id || customerData.stripe_customer_id === 'none') {
      // Pas d'abonnement Stripe actif, on repasse juste en gratuit côté Supabase
      await supabaseAdmin.from('customers').update({ plan: 'gratuit' }).eq('user_id', userId)
      return NextResponse.json({ success: true })
    }

    // Cherche les abonnements actifs de ce client
    const subscriptions = await stripe.subscriptions.list({
      customer: customerData.stripe_customer_id,
      status: 'active',
    })

    // Annule chaque abonnement actif
    for (const sub of subscriptions.data) {
      await stripe.subscriptions.cancel(sub.id)
    }

    // Filet de sécurité immédiat (le webhook le fera aussi)
    await supabaseAdmin.from('customers').update({ plan: 'gratuit' }).eq('user_id', userId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}