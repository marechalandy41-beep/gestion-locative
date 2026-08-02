import { stripe } from '@/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getOrCreateCouponPercent(percent: number): Promise<string> {
  const id = `PARRAIN_${percent}`
  try {
    await stripe.coupons.retrieve(id)
  } catch {
    await stripe.coupons.create({ id, percent_off: percent, duration: 'forever', name: `Parrainage -${percent}%` })
  }
  return id
}

async function getOrCreateCouponMoisGratuits(mois: number): Promise<string> {
  const id = `MOISGRATUIT_${mois}`
  try {
    await stripe.coupons.retrieve(id)
  } catch {
    await stripe.coupons.create({ id, percent_off: 100, duration: 'repeating', duration_in_months: mois, name: `${mois} mois offert(s)` })
  }
  return id
}

export async function resyncAbonnementUtilisateur(userId: string) {
  const { data: customerData } = await supabaseAdmin
    .from('customers')
    .select('stripe_customer_id, plan, reduction_code_promo, reduction_parrainage, mois_gratuits, geste_commercial_pct, geste_commercial_expire_le')
    .eq('user_id', userId)
    .single()

  if (!customerData?.stripe_customer_id || customerData.stripe_customer_id === 'none' || customerData.plan === 'gratuit') {
    return { success: true, skipped: true, reason: 'Pas de client Stripe / plan gratuit' }
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customerData.stripe_customer_id,
    status: 'active',
  })

  if (subscriptions.data.length === 0) {
    return { success: true, skipped: true, reason: 'Aucun abonnement actif' }
  }

  const subscription = subscriptions.data[0]
  const itemId = subscription.items.data[0].id

  const { count } = await supabaseAdmin
    .from('Baux')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('statut', 'actif')

  const quantite = Math.max(count || 0, 0)

  const reductionBase = Math.min((parseInt(customerData.reduction_code_promo) || 0) + (parseInt(customerData.reduction_parrainage) || 0), 15)

  // Geste commercial temporaire : actif tant que sa date d'expiration n'est pas dépassée
  const gestePct = parseInt(customerData.geste_commercial_pct as any) || 0
  const gesteExpire = customerData.geste_commercial_expire_le ? new Date(customerData.geste_commercial_expire_le) : null
  const gesteActif = gestePct > 0 && (!gesteExpire || gesteExpire >= new Date())

  if (gestePct > 0 && !gesteActif) {
    // Le geste commercial est expiré : on nettoie en base pour ne plus le recalculer inutilement
    await supabaseAdmin.from('customers').update({ geste_commercial_pct: 0, geste_commercial_expire_le: null }).eq('user_id', userId)
  }

  const reduction = reductionBase + (gesteActif ? gestePct : 0)
  const moisGratuits = parseInt(customerData.mois_gratuits) || 0

  let discounts: { coupon: string }[] | undefined = undefined
  if (reduction > 0) {
    discounts = [{ coupon: await getOrCreateCouponPercent(reduction) }]
  } else if (moisGratuits > 0) {
    discounts = [{ coupon: await getOrCreateCouponMoisGratuits(moisGratuits) }]
  }

  // Ne réécrit que si quelque chose a réellement changé (évite des appels Stripe inutiles)
  const quantiteActuelle = subscription.items.data[0].quantity
  const couponActuel = (subscription.discounts?.[0] as any)?.coupon?.id || (subscription.discounts?.[0] as any) || null
  const couponVoulu = discounts ? discounts[0].coupon : null

  if (quantiteActuelle === quantite && couponActuel === couponVoulu) {
    return { success: true, skipped: true, reason: 'Déjà synchronisé' }
  }

  await stripe.subscriptions.update(subscription.id, {
    items: [{ id: itemId, quantity: quantite }],
    proration_behavior: 'always_invoice',
    discounts: discounts || [],
  })

  return { success: true, quantite, reduction, moisGratuits, gesteActif }
}