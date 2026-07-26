import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Récupère ou crée un coupon Stripe réutilisable pour un pourcentage donné
async function getOrCreateCouponPercent(percent: number): Promise<string> {
  const id = `PARRAIN_${percent}`
  try {
    await stripe.coupons.retrieve(id)
  } catch {
    await stripe.coupons.create({ id, percent_off: percent, duration: 'forever', name: `Parrainage -${percent}%` })
  }
  return id
}

// Coupon 100% sur N mois (mois gratuits)
async function getOrCreateCouponMoisGratuits(mois: number): Promise<string> {
  const id = `MOISGRATUIT_${mois}`
  try {
    await stripe.coupons.retrieve(id)
  } catch {
    await stripe.coupons.create({ id, percent_off: 100, duration: 'repeating', duration_in_months: mois, name: `${mois} mois offert(s)` })
  }
  return id
}

export async function POST(req: NextRequest) {
  try {
    const { customerId, priceId } = await req.json()

    // Vérifier si ce plan est temporairement bloqué (back-office)
    const { data: settingsData } = await supabaseAdmin.from('settings').select('cle, valeur')
    const settingsMap: Record<string, string> = {}
    settingsData?.forEach(s => { settingsMap[s.cle] = s.valeur })
    const priceIdManuel = settingsMap['price_id_manuel']
    const priceIdAuto = settingsMap['price_id_auto']
    if (priceId === priceIdManuel && settingsMap['plan_manuel_bloque'] === 'true') {
      return NextResponse.json({ error: "Le plan Manuel n'est pas disponible pour le moment." }, { status: 403 })
    }
    if (priceId === priceIdAuto && settingsMap['plan_auto_bloque'] === 'true') {
      return NextResponse.json({ error: "Le plan Automatique n'est pas disponible pour le moment." }, { status: 403 })
    }

    // Récupérer la réduction / mois gratuits liés à ce client
    const { data: client } = await supabaseAdmin
      .from('customers')
      .select('reduction, mois_gratuits')
      .eq('stripe_customer_id', customerId)
      .single()

    const reduction = parseInt(client?.reduction) || 0
    const moisGratuits = parseInt(client?.mois_gratuits) || 0

    // Construire la remise éventuelle (une seule remise possible sur une session Checkout)
    let discounts: { coupon: string }[] | undefined = undefined
    if (reduction > 0) {
      discounts = [{ coupon: await getOrCreateCouponPercent(reduction) }]
    } else if (moisGratuits > 0) {
      discounts = [{ coupon: await getOrCreateCouponMoisGratuits(moisGratuits) }]
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      ...(discounts ? { discounts } : {}),
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://magestion-locative.fr'}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://magestion-locative.fr'}/abonnement?cancelled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}