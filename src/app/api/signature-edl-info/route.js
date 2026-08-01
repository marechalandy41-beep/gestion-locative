import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 })

    const { data: edl, error } = await supabase
      .from('EtatsDesLieux')
      .select('*, bail:bail_id(locataire_prenom, locataire_nom, bailleur_prenom, bailleur_nom, bailleur_type, bailleur_denomination), Biens:bien_id(nom, adresse, ville, code_postal)')
      .eq('token_signature', token)
      .single()

    if (error || !edl) return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 404 })
    if (edl.statut !== 'attente_signature') return NextResponse.json({ error: 'Cet état des lieux a déjà été signé ou n\'est plus en attente de signature.' }, { status: 409 })

    const nomBailleur = edl.bail
      ? (edl.bail.bailleur_type === 'morale' ? edl.bail.bailleur_denomination : `${edl.bail.bailleur_prenom || ''} ${edl.bail.bailleur_nom || ''}`)
      : 'Le propriétaire'

    return NextResponse.json({
      edl: {
        type: edl.type,
        date_edl: edl.date_edl,
        bien_nom: edl.Biens?.nom,
        bien_adresse: edl.Biens?.adresse || [edl.Biens?.code_postal, edl.Biens?.ville].filter(Boolean).join(' '),
        locataire_nom: edl.bail ? `${edl.bail.locataire_prenom || ''} ${edl.bail.locataire_nom || ''}` : '',
        bailleur_nom: nomBailleur,
        pieces: edl.pieces,
        nb_pieces: Array.isArray(edl.pieces) ? edl.pieces.length : 0,
        compteurs: edl.compteurs,
        observations: edl.observations,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}