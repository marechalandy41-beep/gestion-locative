import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BRIDGE_API_URL = 'https://api.bridgeapi.io'
const BRIDGE_VERSION = '2025-01-15'
const headers_base = {
  'Content-Type': 'application/json',
  'Client-Id': process.env.BRIDGE_CLIENT_ID,
  'Client-Secret': process.env.BRIDGE_CLIENT_SECRET,
  'Bridge-Version': BRIDGE_VERSION,
}

const moisLabels = {
  1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril',
  5: 'Mai', 6: 'Juin', 7: 'Juillet', 8: 'Août',
  9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre'
}

export async function GET(request) {
  // Sécurité : vérifier le token Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Récupérer tous les utilisateurs avec plan automatique
    const { data: customers } = await supabase
      .from('customers')
      .select('user_id, bridge_access_token, bridge_account_id, bridge_last_sync')
      .eq('plan', 'automatique')
      .not('bridge_access_token', 'is', null)
      .not('bridge_account_id', 'is', null)

    if (!customers || customers.length === 0) {
      return NextResponse.json({ success: true, message: 'Aucun utilisateur Bridge à synchroniser', traites: 0 })
    }

    let totalQuittances = 0
    let totalErreurs = 0

    for (const customer of customers) {
      try {
        // Vérifier qu'on n'a pas déjà syncé il y a moins de 3 jours (max 2x/semaine)
        if (customer.bridge_last_sync) {
          const dernierSync = new Date(customer.bridge_last_sync)
          const diffJours = (Date.now() - dernierSync.getTime()) / (1000 * 60 * 60 * 24)
          if (diffJours < 3) {
            continue
          }
        }

        // Récupérer les baux actifs de cet utilisateur
        const { data: baux } = await supabase
          .from('Baux')
          .select('*, Biens(nom, adresse)')
          .eq('user_id', customer.user_id)
          .eq('statut', 'actif')

        if (!baux || baux.length === 0) continue

        // Récupérer les transactions Bridge (3 derniers mois)
        const res = await fetch(
          `${BRIDGE_API_URL}/v3/aggregation/accounts/${customer.bridge_account_id}/transactions?limit=100`,
          { headers: { ...headers_base, 'Authorization': `Bearer ${customer.bridge_access_token}` } }
        )
        const data = await res.json()
        const transactions = Array.isArray(data.resources) ? data.resources : []

        // Analyser les transactions
        const maintenant = new Date()
        const debut3Mois = new Date(maintenant.getFullYear(), maintenant.getMonth() - 2, 1)

        for (const tx of transactions) {
          if (tx.amount <= 0) continue
          const dateTx = new Date(tx.date || tx.transaction_date)
          if (dateTx < debut3Mois) continue

          for (const bail of baux) {
            const loyer = parseFloat(bail.loyer_hc) + parseFloat(bail.charges || 0)
            const tolerance = loyer * 0.02
            if (Math.abs(tx.amount - loyer) > tolerance) continue

            const moisTx = dateTx.getMonth() + 1
            const anneeTx = dateTx.getFullYear()

            // Vérifier qu'une quittance n'existe pas déjà pour ce bail ce mois
            const { data: existant } = await supabase
              .from('paiements')
              .select('id')
              .eq('bail_id', bail.id)
              .eq('mois', moisTx)
              .eq('annee', anneeTx)
              .eq('statut', 'paye')
              .single()

            if (existant) break

            // Vérifier le nom dans le libellé (payeur ou locataire)
            const libelle = (tx.label || tx.description || '').toLowerCase()
            const nomsACChercher = []
        if (bail.payeur_nom) nomsACChercher.push(bail.payeur_nom.toLowerCase())
        // Locataire société : on cherche la dénomination sociale
        if (bail.locataire_type === 'morale' && bail.locataire_denomination) {
          nomsACChercher.push(bail.locataire_denomination.toLowerCase())
        }
        // Locataire particulier (ou en complément) : nom + prénom
        if (bail.locataire_nom) nomsACChercher.push(bail.locataire_nom.toLowerCase())
        if (bail.locataire_prenom) nomsACChercher.push(bail.locataire_prenom.toLowerCase())
            const scoreNom = nomRecherche && libelle.includes(nomRecherche) ? 2 : 0

            // Confiance minimum requise : montant exact + (optionnel) nom trouvé
            // On génère la quittance si confiance haute (nom trouvé) ou montant exact sans ambiguïté
            if (scoreNom === 0) break // Sans nom dans le libellé, on ne génère pas automatiquement

            // Enregistrer le paiement
            await supabase.from('paiements').insert({
              bail_id: bail.id,
              user_id: customer.user_id,
              montant: tx.amount,
              date_paiement: tx.date || new Date().toISOString().split('T')[0],
              mois: moisTx,
              annee: anneeTx,
              statut: 'paye',
              source: 'bridge_cron',
              libelle_virement: tx.label,
            })

            // Générer et uploader la quittance via l'API existante
            await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/generate-quittance`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bailId: bail.id,
                userId: customer.user_id,
                mois: moisTx,
                annee: anneeTx,
                datePaiement: tx.date,
                montant: tx.amount,
              }),
            })

            totalQuittances++
            break
          }
        }

        // Mettre à jour la date de dernière sync
        await supabase.from('customers')
          .update({ bridge_last_sync: new Date().toISOString() })
          .eq('user_id', customer.user_id)

      } catch (err) {
        console.error(`Erreur sync Bridge user ${customer.user_id}:`, err.message)
        totalErreurs++
      }
    }

    return NextResponse.json({ success: true, totalQuittances, totalErreurs })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}