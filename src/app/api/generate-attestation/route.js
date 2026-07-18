import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '...'
// Types signés par un tiers (locataire, conjoint) — pas de signature auto du bailleur
const TYPES_TIERS = ['depart_locataire', 'conjoint']

// Corps de chaque type d'attestation
const corpsAttestation = {
  hebergement: (f) => [
    `Je soussigné(e) ${f.declarantNom}${f.declarantNaissance ? `, né(e) le ${fmtDate(f.declarantNaissance)}` : ''}${f.declarantLieuNaissance ? ` à ${f.declarantLieuNaissance}` : ''}, demeurant ${f.declarantAdresse},`,
    `certifie sur l'honneur héberger à mon domicile ${f.personneNom}${f.personneNaissance ? `, né(e) le ${fmtDate(f.personneNaissance)}` : ''}${f.personneLieuNaissance ? ` à ${f.personneLieuNaissance}` : ''}, depuis le ${fmtDate(f.dateDepuis)} et jusqu'à ce jour.`,
    `Fait pour servir et valoir ce que de droit.`,
  ],
  bon_paiement: (f) => [
    `Je soussigné(e) ${f.declarantNom}, demeurant ${f.declarantAdresse}, propriétaire du logement situé ${f.bienAdresse},`,
    `atteste que ${f.locataireNom} est locataire de ce logement depuis le ${fmtDate(f.dateDebut)}, moyennant un loyer mensuel de ${parseFloat(f.loyer || 0).toFixed(2)} € charges comprises.`,
    `J'atteste que le locataire s'acquitte régulièrement de son loyer et de ses charges, et qu'il est à jour de ses paiements à ce jour.`,
    `La présente attestation est établie pour servir et valoir ce que de droit.`,
  ],
  fin_bail: (f) => [
    `Je soussigné(e) ${f.declarantNom}, demeurant ${f.declarantAdresse}, propriétaire du logement situé ${f.bienAdresse},`,
    `atteste que ${f.locataireNom} a occupé ce logement en qualité de locataire du ${fmtDate(f.dateDebut)} au ${fmtDate(f.dateFin)}.`,
    `Le locataire a restitué les clés et libéré les lieux à cette date. Le bail est définitivement résilié.`,
    `La présente attestation est établie pour servir et valoir ce que de droit.`,
  ],
  depart_locataire: (f) => [
    `Je soussigné(e) ${f.declarantNom}, demeurant ${f.declarantAdresse},`,
    `locataire du logement situé ${f.bienAdresse},`,
    `atteste sur l'honneur avoir été informé(e) de la mise en vente de ce bien et m'engage à le libérer de toute occupation au plus tard le ${fmtDate(f.dateLiberation)}.`,
    `Je certifie qu'à cette date, le logement sera restitué libre de tout occupant et de tout meuble m'appartenant, et que les clés seront remises au propriétaire.`,
    `La présente attestation est établie pour servir et valoir ce que de droit, notamment auprès du notaire chargé de la vente.`,
    
  ],
  conjoint: (f) => [
    `Je soussigné(e) ${f.declarantNom}, demeurant ${f.declarantAdresse},`,
    `atteste sur l'honneur occuper le bien situé ${f.bienAdresse} en qualité de ${f.qualiteConjoint || 'conjoint(e)'} de ${f.proprietaireNom}, propriétaire dudit bien.`,
    `Je déclare ne détenir aucun droit réel de propriété sur ce bien et ne formuler aucune revendication à son égard.`,
    `Je m'engage à libérer les lieux de toute occupation au plus tard le ${fmtDate(f.dateLiberation)}, concomitamment au départ du propriétaire, afin de permettre la vente du bien libre de toute occupation.`,
    `La présente attestation est établie pour servir et valoir ce que de droit, notamment auprès du notaire chargé de la vente.`,
    
  ],
  honneur: (f) => [
    `Je soussigné(e) ${f.declarantNom}, demeurant ${f.declarantAdresse},`,
    `atteste sur l'honneur :`,
    f.contenu || '',
    `La présente attestation est établie pour servir et valoir ce que de droit.`,
    ],
}

export async function POST(request) {
  try {
    const f = await request.json()
    const { userId, type, typeLabel } = f

    if (!userId || !f.declarantNom) {
      return NextResponse.json({ error: 'Nom du déclarant requis' }, { status: 400 })
    }

    const paragraphes = (corpsAttestation[type] || corpsAttestation.honneur)(f)
    const dateJour = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

    // Signature du déclarant (depuis customers)
    const { data: customerData } = await supabase
      .from('customers')
      .select('signature')
      .eq('user_id', userId)
      .single()
    const signature = (customerData?.signature && !TYPES_TIERS.includes(type)) ? customerData.signature : null

    // --- Génération PDF ---
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = 210, margin = 20, maxW = pageW - margin * 2
    let y = 20

    doc.setFillColor(37, 99, 235); doc.rect(0, 0, pageW, 16, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
    doc.text('ATTESTATION', pageW / 2, 10.5, { align: 'center' })
    doc.setTextColor(0, 0, 0)

    y = 32
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    doc.text(typeLabel || 'Attestation', pageW / 2, y, { align: 'center' })
    y += 16

    doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
    for (const p of paragraphes) {
      if (!p) continue
      const lignes = doc.splitTextToSize(p, maxW)
      for (const ligne of lignes) {
        if (y > 250) { doc.addPage(); y = 20 }
        doc.text(ligne, margin, y); y += 6
      }
      y += 5
    }

    // Bloc lieu / date / signature
    if (y > 235) { doc.addPage(); y = 20 }
    y += 8
    doc.text(`Fait à ${f.lieu || '...'}, le ${dateJour}`, margin, y); y += 12
    doc.text(f.declarantNom, margin, y); y += 6
    doc.text('Signature :', margin, y); y += 4
    if (signature) {
      try { doc.addImage(signature, 'PNG', margin, y, 50, 20) } catch (e) { /* signature invalide */ }
    }

    doc.setFontSize(7); doc.setTextColor(150, 150, 150)
    doc.text('Document généré par Ma Gestion-Locative', pageW / 2, 290, { align: 'center' })

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    // --- Sauvegarde coffre-fort ---
    const nomFichier = `Attestation_${(typeLabel || 'attestation').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    const cheminStorage = `${userId}/${f.bienId || 'sans-bien'}/Attestation/${nomFichier}`

    const { error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(cheminStorage, pdfBuffer, { contentType: 'application/pdf', upsert: true })

    if (uploadErr) {
      return NextResponse.json({ error: 'Upload échoué : ' + uploadErr.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(cheminStorage)

    await supabase.from('Documents').insert({
      user_id: userId,
      bien_id: f.bienId || null,
      nom_fichier: nomFichier,
      categorie: 'Attestation',
      sous_categorie: typeLabel || 'Attestation',
      annee: new Date().getFullYear(),
      storage_path: cheminStorage,
      url: urlData.publicUrl,
    })

    const pdfBase64 = pdfBuffer.toString('base64')
    return NextResponse.json({ success: true, url: urlData.publicUrl, pdfBase64, nomFichier })

  } catch (err) {
    console.error('generate-attestation error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}