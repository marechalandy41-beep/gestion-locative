import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email, name, userId } = await req.json()

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { source: 'gestion-locative', user_id: userId },
    })

    // Lien immédiat user_id <-> stripe_customer_id
    await supabaseAdmin
      .from('customers')
      .upsert({ user_id: userId, stripe_customer_id: customer.id }, { onConflict: 'user_id' })

    return NextResponse.json({ customerId: customer.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}