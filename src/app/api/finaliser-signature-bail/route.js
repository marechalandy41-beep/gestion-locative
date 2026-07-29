import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'
import { Resend } from 'resend'
import {
  construireNonMeuble, construireMeuble, construireCommercial,
  construireParking, construireEtudiant, construireMobilite, construireAutre,
} from '@/lib/pdfBailFinal'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

const BUILDERS = {
  'Non meublé': construireNonMeuble,
  'Meublé': construireMeuble,
  'Commercial (3-6-9)': construireCommercial,
  'Parking / Garage': construireParking,
  'Étudiant': construireEtudiant,
  'Mobilité': construireMobilite,
  'Autre': construireAutre,
}

export async function POST(request) {
  try {
    const { token, signatureLocataire, luApprouve } = await request.json()
    if (!token || !signatureLocataire) return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 })
    if (!luApprouve) return NextResponse.json({ error: 'Vous devez cocher « Lu et approuvé » avant de signer.' }, { status: 400 })

    const { data: bail, error: bailErr } = await supabase
      .from('Baux')
      .select('*, Biens(nom, adresse, type)')
      .eq('token_signature', token)
      .single()

    if (bailErr || !bail) return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 404 })
    if (bail.statut !== 'attente_signature') return NextResponse.json({ error: 'Ce bail a déjà été signé.' }, { status: 409 })

    const construire = BUILDERS[bail.type_bail]
    if (!construire) return NextResponse.json({ error: `Type de bail non pris en charge pour la signature à distance : ${bail.type_bail}` }, { status: 400 })

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const nomFichier = await construire(doc, bail, signatureLocataire)
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    const nomBailleur = bail.bailleur_type === 'morale' ? bail.bailleur_denomination : `${bail.bailleur_prenom} ${bail.bailleur_nom}`
    const nomLocataire = bail.locataire_type === 'morale' ? bail.locataire_denomination : `${bail.locataire_prenom} ${bail.locataire_nom}`

    const cheminStorage = `baux/${bail.user_id}/${Date.now()}_${nomFichier}`
    const { error: uploadErr } = await supabase.storage.from('documents').upload(cheminStorage, pdfBuffer, { contentType: 'application/pdf' })
    let bailPdfUrl = bail.bail_pdf_url || null
    if (!uploadErr) {
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(cheminStorage)
      bailPdfUrl = urlData.publicUrl
      await supabase.from('Documents').insert({
        user_id: bail.user_id, bien_id: bail.bien_id,
        nom_fichier: nomFichier, categorie: 'Bail', url: bailPdfUrl,
        storage_path: cheminStorage, annee: bail.date_debut ? new Date(bail.date_debut).getFullYear() : new Date().getFullYear(),
      })
    } else {
      console.error('Upload bail signé échoué :', uploadErr.message)
    }

    const nouveauStatut = (bail.date_debut && bail.date_debut > new Date().toISOString().split('T')[0]) ? 'a_venir' : 'actif'
    await supabase.from('Baux').update({
      signature_locataire: signatureLocataire,
      statut: nouveauStatut,
      token_signature: null,
      bail_pdf_url: bailPdfUrl,
    }).eq('id', bail.id)

    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/notifications`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: bail.user_id, type: 'bail_signe',
        message: `${nomLocataire} a signé le bail — le bail est maintenant ${nouveauStatut === 'actif' ? 'actif' : 'programmé'}.`,
        lien: `/baux/${bail.id}`,
      }),
    }).catch(() => {})

    if (bail.locataire_email) {
      try {
        await resend.emails.send({
          from: 'Ma Gestion-Locative <noreply@magestion-locative.fr>',
          to: [bail.locataire_email],
          subject: 'Votre bail signé',
          html: `<p>Bonjour ${nomLocataire},</p><p>Votre bail a bien été signé par les deux parties. Vous en trouverez une copie en pièce jointe.</p>`,
          attachments: [{ filename: nomFichier, content: pdfBuffer.toString('base64') }],
        })
      } catch (e) { console.error('Envoi copie locataire échoué :', e.message) }
    }

    return NextResponse.json({ success: true, bailId: bail.id })
  } catch (err) {
    console.error('finaliser-signature-bail error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}