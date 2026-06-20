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

    // Vérifie si un client Stripe existe déjà pour cet utilisateur
    const { data: existing } = await supabaseAdmin
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (existing?.stripe_customer_id && existing.stripe_customer_id !== 'none' && existing.stripe_customer_id !== 'test') {
      // Vérifie que ce client existe vraiment côté Stripe (pas supprimé)
      try {
        const customer = await stripe.customers.retrieve(existing.stripe_customer_id)
        if (!(customer as any).deleted) {
          return NextResponse.json({ customerId: existing.stripe_customer_id })
        }
      } catch {
        // Le client n'existe plus côté Stripe, on en recrée un en dessous
      }
    }

    // Aucun client valide trouvé, on en crée un nouveau
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { source: 'gestion-locative', user_id: userId },
    })

    await supabaseAdmin
      .from('customers')
      .upsert({ user_id: userId, stripe_customer_id: customer.id }, { onConflict: 'user_id' })

    return NextResponse.json({ customerId: customer.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}