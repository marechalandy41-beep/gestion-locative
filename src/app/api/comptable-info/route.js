import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    const annee = parseInt(request.nextUrl.searchParams.get('annee')) || new Date().getFullYear()
    if (!token) return NextResponse.json({ error: 'Token manquant.' }, { status: 400 })

    const { data: invitation, error: invErr } = await supabaseAdmin
      .from('invitations_comptable')
      .select('user_id, actif')
      .eq('token', token)
      .single()

    if (invErr || !invitation || !invitation.actif) {
      return NextResponse.json({ error: 'Lien invalide ou révoqué.' }, { status: 404 })
    }

    const userId = invitation.user_id

    const { data: biens } = await supabaseAdmin
      .from('Biens')
      .select('id, nom, adresse')
      .eq('user_id', userId)

    const { data: bauxFiscal } = await supabaseAdmin
      .from('Baux')
      .select('id, bien_id')
      .eq('user_id', userId)

    const { data: paiementsFiscal } = await supabaseAdmin
      .from('paiements')
      .select('montant, bail_id, statut')
      .eq('user_id', userId)
      .eq('annee', annee)
      .in('statut', ['valide', 'paye'])
      .gt('montant', 0)

    const { data: chargesFiscal } = await supabaseAdmin
      .from('charges_fiscales')
      .select('*')
      .eq('user_id', userId)
      .eq('annee', annee)

    const { data: documents } = await supabaseAdmin
      .from('Documents')
      .select('id, nom_fichier, categorie, url, annee, bien_id, Biens(nom)')
      .eq('user_id', userId)
      .eq('annee', annee)
      .in('categorie', ['Quittance', 'Facture abonnement', 'Régularisation charges'])
      .eq('archive', false)
      .order('created_at', { ascending: false })

    const totalLoyersPercus = (paiementsFiscal || []).reduce((a, p) => a + (parseFloat(p.montant) || 0), 0)
    const totalChargesDeductibles = (chargesFiscal || []).reduce((a, c) =>
      a + (parseFloat(c.taxe_fonciere) || 0)
        + (parseFloat(c.assurance) || 0)
        + (parseFloat(c.travaux) || 0)
        + (parseFloat(c.frais_gestion) || 0)
        + (parseFloat(c.interets_emprunt) || 0)
        + (parseFloat(c.autres) || 0), 0)
    const revenuNet = totalLoyersPercus - totalChargesDeductibles

    const detailParBien = (biens || []).map(bien => {
      const bauxDuBien = (bauxFiscal || []).filter(b => b.bien_id === bien.id).map(b => b.id)
      const loyersBien = (paiementsFiscal || [])
        .filter(p => bauxDuBien.includes(p.bail_id))
        .reduce((a, p) => a + (parseFloat(p.montant) || 0), 0)
      const c = (chargesFiscal || []).find(ch => ch.bien_id === bien.id)
      const chargesBien = c
        ? (parseFloat(c.taxe_fonciere) || 0) + (parseFloat(c.assurance) || 0) + (parseFloat(c.travaux) || 0)
          + (parseFloat(c.frais_gestion) || 0) + (parseFloat(c.interets_emprunt) || 0) + (parseFloat(c.autres) || 0)
        : 0
      return { nom: bien.nom, adresse: bien.adresse, loyers: loyersBien, charges: chargesBien }
    })

    return NextResponse.json({
      annee,
      totalLoyersPercus,
      totalChargesDeductibles,
      revenuNet,
      detailParBien,
      documents: documents || [],
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}