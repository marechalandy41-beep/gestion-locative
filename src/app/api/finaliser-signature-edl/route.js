import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'
import { Resend } from 'resend'
import { genererCorpsEDL } from '@/lib/pdfEdlExtras'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const { token, signatureLocataire, locataireRefuse } = await request.json()
    if (!token) return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 })
    if (!locataireRefuse && !signatureLocataire) return NextResponse.json({ error: 'Signature manquante.' }, { status: 400 })

    const { data: edl, error: edlErr } = await supabase
      .from('EtatsDesLieux')
      .select('*, bail:bail_id(locataire_prenom, locataire_nom, locataire_email), Biens:bien_id(id, nom, adresse)')
      .eq('token_signature', token)
      .single()

    if (edlErr || !edl) return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 404 })
    if (edl.statut !== 'attente_signature') return NextResponse.json({ error: 'Cet état des lieux a déjà été signé.' }, { status: 409 })

    const bienNom = edl.Biens?.nom || edl.Biens?.adresse || ''
    const locataireNom = edl.bail ? `${edl.bail.locataire_prenom || ''} ${edl.bail.locataire_nom || ''}` : '—'
    const locataireEmail = edl.bail?.locataire_email

    const doc = new jsPDF()
    await genererCorpsEDL(doc, {
      type: edl.type,
      date_edl: edl.date_edl,
      bienNom,
      locataireNom,
      pieces: edl.pieces,
      compteurs: edl.compteurs,
      observations: edl.observations,
      signatureBailleur: edl.signature_bailleur,
      signatureLocataire: locataireRefuse ? null : signatureLocataire,
      locataireRefuse,
    })

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    const nomFichier = `EDL_${edl.type}_${bienNom || 'bien'}_${edl.date_edl}.pdf`
    const bienId = edl.Biens?.id || edl.bien_id
    const cheminStorage = `${edl.user_id}/${bienId}/Etat des lieux/${nomFichier}`

    const { error: uploadErr } = await supabase.storage.from('documents').upload(cheminStorage, pdfBuffer, { contentType: 'application/pdf', upsert: true })
    if (uploadErr) console.error('Upload EDL signé échoué :', uploadErr.message)

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(cheminStorage)

    await supabase.from('Documents').insert({
      user_id: edl.user_id,
      bien_id: bienId,
      nom_fichier: nomFichier,
      categorie: edl.type === 'entree' ? 'État des lieux entrée' : 'État des lieux sortie',
      url: urlData.publicUrl,
      storage_path: cheminStorage,
      annee: new Date(edl.date_edl).getFullYear(),
    })

    await supabase.from('EtatsDesLieux').update({
      signature_locataire: locataireRefuse ? null : signatureLocataire,
      locataire_refuse_signature: !!locataireRefuse,
      statut: 'finalise',
      token_signature: null,
      pdf_url: urlData.publicUrl,
    }).eq('id', edl.id)

    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/notifications`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: edl.user_id, type: 'edl_signe',
        message: locataireRefuse
          ? `${locataireNom} a refusé de signer l'état des lieux ${edl.type === 'entree' ? "d'entrée" : 'de sortie'}.`
          : `${locataireNom} a signé l'état des lieux ${edl.type === 'entree' ? "d'entrée" : 'de sortie'}.`,
        lien: `/etats-des-lieux/${edl.id}`,
      }),
    }).catch(() => {})

    if (locataireEmail && !locataireRefuse) {
      try {
        await resend.emails.send({
          from: 'Ma Gestion-Locative <noreply@magestion-locative.fr>',
          to: [locataireEmail],
          subject: 'Votre état des lieux signé',
          html: `<p>Bonjour ${locataireNom},</p><p>L'état des lieux a bien été signé par les deux parties. Vous en trouverez une copie en pièce jointe.</p>`,
          attachments: [{ filename: nomFichier, content: pdfBuffer.toString('base64') }],
        })
      } catch (e) { console.error('Envoi copie locataire échoué :', e.message) }
    }

    return NextResponse.json({ success: true, edlId: edl.id })
  } catch (err) {
    console.error('finaliser-signature-edl error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}