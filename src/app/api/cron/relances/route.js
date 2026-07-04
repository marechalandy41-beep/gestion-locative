import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request) {
  // Sécurité : vérifier le token Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const moisActuel = now.getMonth() + 1
  const anneeActuelle = now.getFullYear()
  const jourActuel = now.getDate()

  const moisNom = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][moisActuel - 1]

  try {
    // Récupérer tous les baux actifs avec relance auto activée
    const { data: baux, error } = await supabase
      .from('Baux')
      .select('*, Biens(nom)')
      .eq('statut', 'actif')
      .eq('relance_auto_active', true)
      .not('locataire_email', 'is', null)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let envoyes = 0
    let ignores = 0

    for (const bail of baux) {
      const joursDepuisEcheance = jourActuel - (bail.date_exigibilite || 5)

      // Envoyer uniquement si on est exactement au bon nombre de jours après l'échéance
      if (joursDepuisEcheance !== (bail.relance_auto_jours || 5)) {
        ignores++
        continue
      }

      // Vérifier qu'il n'y a pas déjà un paiement ce mois
      const { data: paiement } = await supabase
        .from('Paiements')
        .select('id')
        .eq('bail_id', bail.id)
        .eq('mois', moisActuel)
        .eq('annee', anneeActuelle)
        .single()

      if (paiement) {
        ignores++
        continue
      }

      // Vérifier qu'on n'a pas déjà envoyé une relance ce mois
      const { data: dejaEnvoyee } = await supabase
        .from('Paiements')
        .select('id')
        .eq('bail_id', bail.id)
        .eq('mois', moisActuel)
        .eq('annee', anneeActuelle)
        .eq('statut', 'relance_envoyee')
        .single()

      if (dejaEnvoyee) {
        ignores++
        continue
      }

      // Envoyer l'email de relance
      const montantTotal = (parseFloat(bail.loyer_hc) || 0) + (parseFloat(bail.charges) || 0)
      const proprietaireNom = `${bail.bailleur_prenom || ''} ${bail.bailleur_nom || ''}`.trim()

      await resend.emails.send({
        from: 'Ma Gestion-Locative <onboarding@resend.dev>',
        to: [bail.locataire_email],
        subject: `Rappel loyer — ${moisNom} ${anneeActuelle} — ${bail.Biens?.nom || ''}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f59e0b; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 22px;">Ma Gestion-Locative</h1>
            </div>
            <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #111827;">Bonjour <strong>${bail.locataire_prenom} ${bail.locataire_nom}</strong>,</p>
              <p style="color: #374151;">Votre propriétaire <strong>${proprietaireNom}</strong> vous rappelle que votre loyer du mois de <strong>${moisNom} ${anneeActuelle}</strong> n'a pas encore été reçu.</p>
              <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 8px; color: #854d0e; font-size: 14px;">Bien loué</p>
                <p style="margin: 0; font-weight: 600; color: #111827;">${bail.Biens?.nom || ''}</p>
                <p style="margin: 8px 0 0; color: #854d0e; font-size: 14px;">Montant dû</p>
                <p style="margin: 0; font-weight: 700; font-size: 24px; color: #92400e;">${montantTotal}€</p>
                <p style="margin: 8px 0 0; color: #854d0e; font-size: 14px;">Date d'échéance</p>
                <p style="margin: 0; font-weight: 600; color: #111827;">Le ${bail.date_exigibilite} de chaque mois</p>
              </div>
              <p style="color: #374151;">Merci de procéder au règlement dans les meilleurs délais.</p>
              <p style="color: #6b7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                Ce message est envoyé automatiquement par Ma Gestion-Locative. Merci de ne pas répondre directement à cet email.
              </p>
            </div>
          </div>
        `,
      })

      // Tracer la relance dans Paiements pour éviter les doublons
      await supabase.from('Paiements').insert({
        bail_id: bail.id,
        user_id: bail.user_id,
        montant: 0,
        date_paiement: new Date().toISOString().split('T')[0],
        mois: moisActuel,
        annee: anneeActuelle,
        statut: 'relance_envoyee',
        source: 'cron_auto',
        libelle_virement: `Relance automatique ${moisNom} ${anneeActuelle}`,
      })

      envoyes++
    }

// ===== RECONDUCTION TACITE =====
    const aujourd_hui = new Date()
    aujourd_hui.setHours(0, 0, 0, 0)

    const dans30jours = new Date(aujourd_hui)
    dans30jours.setDate(dans30jours.getDate() + 30)

    const dans60jours = new Date(aujourd_hui)
    dans60jours.setDate(dans60jours.getDate() + 60)

    // Récupère tous les baux actifs avec une date de fin définie + email proprio
    const { data: bauxAvecFin } = await supabase
      .from('Baux')
      .select('*, Biens(nom)')
      .eq('statut', 'actif')
      .not('date_fin', 'is', null)

    // Récupère les emails des propriétaires (via auth)
    const { data: { users: allUsers } } = await supabase.auth.admin.listUsers()
    const emailsParUserId = {}
    allUsers.forEach(u => { emailsParUserId[u.id] = u.email })

    let reconductions = 0

    for (const bail of (bauxAvecFin || [])) {
      const dateFin = new Date(bail.date_fin)
      dateFin.setHours(0, 0, 0, 0)
      const proprietaireEmail = emailsParUserId[bail.user_id]
      if (!proprietaireEmail) continue

      const dateFinFormatee = dateFin.toLocaleDateString('fr-FR')
      const payload = {
        proprietaireEmail,
        proprietaireNom: `${bail.bailleur_prenom || ''} ${bail.bailleur_nom || ''}`.trim(),
        locataireNom: `${bail.locataire_prenom || ''} ${bail.locataire_nom || ''}`.trim(),
        bienNom: bail.Biens?.nom || '',
        dateFin: dateFinFormatee,
      }

      // J-60 : envoi le jour exact où on est à 60 jours de la date de fin
      if (dateFin.getTime() === dans60jours.getTime()) {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/send-reconduction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, type: 'j60' }),
        })
        reconductions++
      }

      // J-30 : envoi le jour exact où on est à 30 jours de la date de fin
      else if (dateFin.getTime() === dans30jours.getTime()) {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/send-reconduction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, type: 'j30' }),
        })
        reconductions++
      }

      // Bail reconduit tacitement : date de fin dépassée, bail toujours actif
      else if (dateFin < aujourd_hui) {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/send-reconduction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, type: 'reconduit' }),
        })
        // Met à jour la date de fin selon le type de bail (1 an meublé, 3 ans non meublé)
        const anneesReconduction = bail.type_bail === 'Meublé' ? 1 : 3
        const nouvelleDateFin = new Date(dateFin)
        nouvelleDateFin.setFullYear(nouvelleDateFin.getFullYear() + anneesReconduction)
        await supabase.from('Baux').update({
          date_fin: nouvelleDateFin.toISOString().split('T')[0]
        }).eq('id', bail.id)
        reconductions++
      }
    }
    // ===== FIN RECONDUCTION TACITE =====

    return NextResponse.json({ success: true, envoyes, ignores, reconductions })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}