import { NextResponse } from 'next/server'
import jsPDF from 'jspdf'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '...'

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
    const { type, typeLabel } = f

    if (!f.declarantNom) {
      return NextResponse.json({ error: 'Nom du déclarant requis' }, { status: 400 })
    }

    const paragraphes = (corpsAttestation[type] || corpsAttestation.honneur)(f)
    const dateJour = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

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

    if (y > 235) { doc.addPage(); y = 20 }
    y += 8
    doc.text(`Fait à ${f.lieu || '...'}, le ${dateJour}`, margin, y); y += 12
    doc.text(f.declarantNom, margin, y); y += 6
    doc.text('Signature :', margin, y)

    doc.setFontSize(7); doc.setTextColor(150, 150, 150)
    doc.text('Document généré gratuitement sur Ma Gestion-Locative — magestion-locative.fr', pageW / 2, 290, { align: 'center' })

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    const pdfBase64 = pdfBuffer.toString('base64')
    const nomFichier = `Attestation_${(typeLabel || 'attestation').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`

    return NextResponse.json({ success: true, pdfBase64, nomFichier })

  } catch (err) {
    console.error('generate-attestation-public error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}