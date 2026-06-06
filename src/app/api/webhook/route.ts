import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    const customerEmail = session.customer_email || session.customer_details?.email

    await supabaseAdmin
      .from('customers')
      .upsert({
        stripe_customer_id: customerId,
        plan: 'auto',
      }, { onConflict: 'stripe_customer_id' })
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as any
    const customerId = subscription.customer

    await supabaseAdmin
      .from('customers')
      .update({ plan: 'gratuit' })
      .eq('stripe_customer_id', customerId)
  }

  return NextResponse.json({ received: true })
}