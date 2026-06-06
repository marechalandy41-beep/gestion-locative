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
      success_url: 'http://localhost:3000/dashboard?success=true',
      cancel_url: 'http://localhost:3000/abonnement?cancelled=true',
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}