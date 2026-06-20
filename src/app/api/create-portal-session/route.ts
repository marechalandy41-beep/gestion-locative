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
      return NextResponse.json({ error: 'Aucun abonnement Stripe trouvé pour cet utilisateur.' }, { status: 400 })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerData.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/compte`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}