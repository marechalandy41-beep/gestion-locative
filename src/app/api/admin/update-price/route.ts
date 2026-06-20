import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// IDs produits Stripe (le produit reste le même, seul le Price change)
const PRODUCT_MANUEL = 'prod_UjrNEmHJV4r8wO'
const PRODUCT_AUTOMATIQUE = 'prod_UeJMxD0Uu8Twge'

export async function POST(req: NextRequest) {
  try {
    const { plan, nouveauPrix } = await req.json()
    // plan = 'manuel' ou 'automatique'
    // nouveauPrix = montant en euros, ex: 5

    if (!['manuel', 'automatique'].includes(plan)) {
      return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 })
    }

    const montantEnCentimes = Math.round(parseFloat(nouveauPrix) * 100)
    if (isNaN(montantEnCentimes) || montantEnCentimes <= 0) {
      return NextResponse.json({ error: 'Montant invalide.' }, { status: 400 })
    }

    const productId = plan === 'manuel' ? PRODUCT_MANUEL : PRODUCT_AUTOMATIQUE

    // Crée le nouveau Price sur Stripe
    const newPrice = await stripe.prices.create({
      product: productId,
      unit_amount: montantEnCentimes,
      currency: 'eur',
      recurring: { interval: 'month' },
    })

    // Met aussi ce nouveau prix par défaut sur le produit (cosmétique, pour le dashboard Stripe)
    await stripe.products.update(productId, { default_price: newPrice.id })

    // Met à jour settings : le price_id ET le texte affiché
    const cleSettingPrix = plan === 'manuel' ? 'prix_manuel' : 'prix_auto'
    const cleSettingPriceId = plan === 'manuel' ? 'price_id_manuel' : 'price_id_auto'

    await supabaseAdmin.from('settings').upsert(
      { cle: cleSettingPrix, valeur: nouveauPrix.toString() },
      { onConflict: 'cle' }
    )
    await supabaseAdmin.from('settings').upsert(
      { cle: cleSettingPriceId, valeur: newPrice.id },
      { onConflict: 'cle' }
    )

    return NextResponse.json({ success: true, newPriceId: newPrice.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}