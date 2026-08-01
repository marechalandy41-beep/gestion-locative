import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'
import {
  construireNonMeuble, construireMeuble, construireCommercial,
  construireParking, construireEtudiant, construireMobilite, construireAutre,
} from '@/lib/pdfBailFinal'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BUILDERS = {
  'Non meublé': construireNonMeuble,
  'Meublé': construireMeuble,
  'Commercial (3-6-9)': construireCommercial,
  'Parking / Garage': construireParking,
  'Étudiant': construireEtudiant,
  'Mobilité': construireMobilite,
  'Autre': construireAutre,
}

export async function GET(request) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 })

    const { data: bail, error } = await supabase
      .from('Baux')
      .select('*, Biens(nom, adresse, type)')
      .eq('token_signature', token)
      .single()

    if (error || !bail) return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 404 })
    if (bail.statut !== 'attente_signature') return NextResponse.json({ error: 'Ce bail a déjà été signé.' }, { status: 409 })

    const construire = BUILDERS[bail.type_bail]
    if (!construire) return NextResponse.json({ error: `Type de bail non pris en charge : ${bail.type_bail}` }, { status: 400 })

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    await construire(doc, bail, null) // pas de signature locataire : c'est un aperçu avant signature
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="apercu-bail.pdf"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('apercu-bail error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}