import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/stripe'

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json()

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        source: 'gestion-locative',
      },
    })

    return NextResponse.json({ customerId: customer.id })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}