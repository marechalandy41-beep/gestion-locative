import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '../../../stripe'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    // 1. Authentification : on vérifie le token, on ne fait JAMAIS confiance à un userId envoyé tel quel
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !authData?.user) return NextResponse.json({ error: 'Session invalide.' }, { status: 401 })
    const userId = authData.user.id

    // 2. Résilier l'abonnement Stripe immédiatement (s'il existe)
    const { data: customerData } = await supabaseAdmin
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (customerData?.stripe_customer_id && customerData.stripe_customer_id !== 'none') {
      try {
        const subscriptions = await stripe.subscriptions.list({ customer: customerData.stripe_customer_id, status: 'all' })
        for (const sub of subscriptions.data) {
          if (['active', 'trialing', 'past_due', 'unpaid'].includes(sub.status)) {
            await stripe.subscriptions.cancel(sub.id)
          }
        }
      } catch (e) {
        console.error('Erreur résiliation Stripe (on continue quand même) :', e.message)
      }
    }

    // 3. Clôturer tous les baux en cours et libérer les lots associés
    const { data: baux } = await supabaseAdmin.from('Baux').select('id').eq('user_id', userId)
    const bauxIds = (baux || []).map(b => b.id)
    if (bauxIds.length > 0) {
      await supabaseAdmin.from('Baux').update({ statut: 'termine' }).eq('user_id', userId).neq('statut', 'termine')
      await supabaseAdmin.from('lots').update({ statut: 'vacant', bail_id: null }).in('bail_id', bauxIds)
    }

    // 4. Supprimer les conversations / messages
    const { data: convs } = await supabaseAdmin.from('conversations').select('id').eq('user_id', userId)
    const convIds = (convs || []).map(c => c.id)
    if (convIds.length > 0) {
      await supabaseAdmin.from('messages').delete().in('conversation_id', convIds)
      await supabaseAdmin.from('conversations').delete().eq('user_id', userId)
    }

    // 4bis. Supprimer les données annexes liées aux baux (messagerie locataire, invitations portail)
    if (bauxIds.length > 0) {
      await supabaseAdmin.from('messages_locataires').delete().in('bail_id', bauxIds)
      await supabaseAdmin.from('invitations').delete().in('bail_id', bauxIds)
    }
    await supabaseAdmin.from('invitations').delete().eq('user_id', userId)

    // 4ter. Parrainage (l'utilisateur peut être parrain ET/OU filleul) et notifications push
    await supabaseAdmin.from('parrainages').delete().eq('parrain_id', userId)
    await supabaseAdmin.from('parrainages').delete().eq('filleul_id', userId)
    await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', userId)

    // 5. Supprimer les fichiers du coffre-fort (best-effort, ne bloque pas la suppression si ça échoue)
    try {
      const { data: dossiers } = await supabaseAdmin.storage.from('documents').list(userId, { limit: 1000 })
      async function purgerDossier(prefix) {
        const { data: items } = await supabaseAdmin.storage.from('documents').list(prefix, { limit: 1000 })
        if (!items) return
        const fichiers = items.filter(i => i.id).map(i => `${prefix}/${i.name}`)
        const sousDossiers = items.filter(i => !i.id).map(i => `${prefix}/${i.name}`)
        if (fichiers.length > 0) await supabaseAdmin.storage.from('documents').remove(fichiers)
        for (const sd of sousDossiers) await purgerDossier(sd)
      }
      if (dossiers) await purgerDossier(userId)
    } catch (e) {
      console.error('Erreur suppression coffre-fort (on continue quand même) :', e.message)
    }

    // 6. Supprimer les données restantes liées à l'utilisateur
    await supabaseAdmin.from('Documents').delete().eq('user_id', userId)
    await supabaseAdmin.from('EtatsDesLieux').delete().eq('user_id', userId)
    await supabaseAdmin.from('paiements').delete().eq('user_id', userId)
    await supabaseAdmin.from('charges_fiscales').delete().eq('user_id', userId)
    await supabaseAdmin.from('notifications').delete().eq('user_id', userId)
    await supabaseAdmin.from('lots').delete().eq('user_id', userId)
    await supabaseAdmin.from('Baux').delete().eq('user_id', userId)
    await supabaseAdmin.from('Biens').delete().eq('user_id', userId)
    await supabaseAdmin.from('customers').delete().eq('user_id', userId)

    // 7. Supprimer le compte d'authentification (dernière étape, irréversible)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteAuthError) throw deleteAuthError

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}