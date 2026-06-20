import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/stripe'

export async function POST(req: NextRequest) {
  try {
    const { customerId, priceId } = await req.json()

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://magestion-locative.fr'}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://magestion-locative.fr'}/abonnement?cancelled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}