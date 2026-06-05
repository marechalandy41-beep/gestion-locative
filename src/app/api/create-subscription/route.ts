import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/stripe'

export async function POST(req: NextRequest) {
  try {
    const { customerId, priceId, quantity } = await req.json()

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    })

    const invoice = subscription.latest_invoice as any
    const paymentIntent = invoice?.payment_intent as any

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}