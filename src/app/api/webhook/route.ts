import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getPriceIds() {
  const { data } = await supabaseAdmin
    .from('settings')
    .select('cle, valeur')
    .in('cle', ['price_id_manuel', 'price_id_auto'])

  const manuel = data?.find(s => s.cle === 'price_id_manuel')?.valeur
  const automatique = data?.find(s => s.cle === 'price_id_auto')?.valeur
  return { manuel, automatique }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const customerId = session.customer

    // Récupère le user_id depuis les metadata du client Stripe
    const customer = await stripe.customers.retrieve(customerId) as any
    const userId = customer.metadata?.user_id

    // Récupère le price_id réellement acheté pour déterminer le plan
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
    const priceId = lineItems.data[0]?.price?.id
    const { manuel: PRICE_MANUEL, automatique: PRICE_AUTOMATIQUE } = await getPriceIds()

    let plan = 'automatique' // valeur par défaut de sécurité
    if (priceId === PRICE_MANUEL) plan = 'manuel'
    else if (priceId === PRICE_AUTOMATIQUE) plan = 'automatique'

    if (userId) {
      const { error } = await supabaseAdmin
        .from('customers')
        .update({ stripe_customer_id: customerId, plan })
        .eq('user_id', userId)

      if (error) console.error('Erreur webhook update plan:', error.message)
    } else {
      console.error('Pas de user_id trouvé dans les metadata Stripe pour', customerId)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as any
    const customerId = subscription.customer

    // Récupérer le user_id
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single()

    // Passer le plan en gratuit
    await supabaseAdmin
      .from('customers')
      .update({ plan: 'gratuit' })
      .eq('stripe_customer_id', customerId)

    // Passer tous les baux actifs en suspendu
    if (customer?.user_id) {
      await supabaseAdmin
        .from('Baux')
        .update({ statut: 'suspendu' })
        .eq('user_id', customer.user_id)
        .eq('statut', 'actif')
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as any
    const customerId = subscription.customer
    const priceId = subscription.items.data[0]?.price?.id
    const { manuel: PRICE_MANUEL_U, automatique: PRICE_AUTOMATIQUE_U } = await getPriceIds()

    let plan = 'automatique'
    if (priceId === PRICE_MANUEL_U) plan = 'manuel'
    else if (priceId === PRICE_AUTOMATIQUE_U) plan = 'automatique'

    await supabaseAdmin
      .from('customers')
      .update({ plan })
      .eq('stripe_customer_id', customerId)

      // Récupérer le user_id
const { data: custData } = await supabaseAdmin
  .from('customers')
  .select('user_id')
  .eq('stripe_customer_id', customerId)
  .single()

// Restaurer les baux suspendus si retour sur plan payant
if (custData?.user_id && (plan === 'manuel' || plan === 'automatique')) {
  await supabaseAdmin
    .from('Baux')
    .update({ statut: 'actif' })
    .eq('user_id', custData.user_id)
    .eq('statut', 'suspendu')
}
  }

  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as any
    const customerId = invoice.customer
    const invoicePdfUrl = invoice.invoice_pdf

    try {
      if (invoicePdfUrl) {
        const { data: custRow } = await supabaseAdmin
          .from('customers')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        const userId = custRow?.user_id

        if (userId) {
          const pdfRes = await fetch(invoicePdfUrl)
          const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())
          const nomFichier = `Facture_${invoice.number || invoice.id}.pdf`
          const cheminStorage = `${userId}/abonnement/${nomFichier}`

          await supabaseAdmin.storage.from('documents').upload(cheminStorage, pdfBuffer, { contentType: 'application/pdf', upsert: true })
          const { data: urlData } = supabaseAdmin.storage.from('documents').getPublicUrl(cheminStorage)

          await supabaseAdmin.from('Documents').insert({
            user_id: userId,
            bien_id: null,
            nom_fichier: nomFichier,
            categorie: 'Facture abonnement',
            url: urlData.publicUrl,
            storage_path: cheminStorage,
            annee: new Date().getFullYear(),
          })

          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
          const email = userData?.user?.email

          if (email) {
            await resend.emails.send({
              from: 'Ma Gestion-Locative <noreply@magestion-locative.fr>',
              to: [email],
              subject: 'Votre facture Ma Gestion-Locative',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: #2563eb; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 22px;">Ma Gestion-Locative</h1>
                  </div>
                  <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="color: #111827;">Bonjour,</p>
                    <p style="color: #374151;">Voici votre facture d'abonnement Ma Gestion-Locative. Vous la retrouverez également à tout moment dans votre coffre-fort, rubrique "Factures d'abonnement".</p>
                    <p style="color: #6b7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                      Ce message est envoyé automatiquement par Ma Gestion-Locative. Merci de ne pas répondre directement à cet email.
                    </p>
                  </div>
                </div>
              `,
              attachments: [{ filename: nomFichier, content: pdfBuffer.toString('base64') }],
            })
          }
        }
      }
    } catch (e: any) {
      console.error('Erreur traitement facture Stripe:', e.message)
    }
  }

  return NextResponse.json({ received: true })
}