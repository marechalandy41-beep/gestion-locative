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

    const { data: bail, error } = await supabase
      .from('Baux')
      .select('*, Biens(nom, adresse, ville, code_postal)')
      .eq('token_signature', token)
      .single()

    if (error || !bail) return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 404 })
    if (bail.statut !== 'attente_signature') return NextResponse.json({ error: 'Ce bail a déjà été signé ou n\'est plus en attente de signature.' }, { status: 409 })

    // On ne renvoie que ce qui est nécessaire à l'affichage, pas la signature du bailleur en clair côté liste
    return NextResponse.json({
      bail: {
        id: bail.id,
        type_bail: bail.type_bail,
        bailleur_nom: bail.bailleur_type === 'morale' ? bail.bailleur_denomination : `${bail.bailleur_prenom} ${bail.bailleur_nom}`,
        locataire_nom: bail.locataire_type === 'morale' ? bail.locataire_denomination : `${bail.locataire_prenom} ${bail.locataire_nom}`,
        bien_adresse: bail.Biens?.adresse || [bail.Biens?.code_postal, bail.Biens?.ville].filter(Boolean).join(' '),
        bien_nom: bail.Biens?.nom,
        loyer_hc: bail.loyer_hc,
        charges: bail.charges,
        depot_garantie: bail.depot_garantie,
        date_debut: bail.date_debut,
        date_fin: bail.date_fin,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}