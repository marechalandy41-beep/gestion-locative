import jsPDF from 'jspdf'
import { ajouterQRFooter } from './qrDocument'

interface QuittanceData {
  proprietaire: {
    nom: string
    prenom: string
    adresse: string
  }
  locataire: {
    nom: string
    prenom: string
  }
  bien: {
    adresse: string
    ville: string
    codePostal: string
  }
  loyer: {
    montant: number
    charges: number
    periode: string // ex: "juin 2026"
    datePaiement: string // ex: "05/06/2026"
  }
  signature?: string // image base64 optionnelle
}

export async function buildQuittanceDoc(data: QuittanceData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210, margin = 20
  let y = 24

  // Bandeau bleu (identique aux autres documents : attestations, mise en demeure)
  doc.setFillColor(37, 99, 235); doc.rect(0, 0, pageW, 18, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
  doc.text('QUITTANCE DE LOYER', pageW / 2, 11, { align: 'center' })
  doc.setTextColor(0, 0, 0)

  y = 30
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
  doc.text(`Période : ${data.loyer.periode}`, pageW / 2, y, { align: 'center' })
  y += 14

  // Encadré Bailleur / Locataire (deux colonnes)
  const boxY = y
  doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.3)
  doc.rect(margin, boxY, (pageW - margin * 2) / 2 - 3, 26)
  doc.rect(margin + (pageW - margin * 2) / 2 + 3, boxY, (pageW - margin * 2) / 2 - 3, 26)

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(37, 99, 235)
  doc.text('BAILLEUR', margin + 4, boxY + 7)
  doc.text('LOCATAIRE', margin + (pageW - margin * 2) / 2 + 7, boxY + 7)
  doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text(`${data.proprietaire.prenom} ${data.proprietaire.nom}`, margin + 4, boxY + 14)
  doc.text(doc.splitTextToSize(data.proprietaire.adresse || '', (pageW - margin * 2) / 2 - 10), margin + 4, boxY + 20)
  doc.text(`${data.locataire.prenom} ${data.locataire.nom}`, margin + (pageW - margin * 2) / 2 + 7, boxY + 14)

  y = boxY + 34

  // Bien loué
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(37, 99, 235)
  doc.text('BIEN LOUÉ', margin, y)
  doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  y += 6
  doc.text(data.bien.adresse || '', margin, y)
  y += 12

  // Cadre montant (fond gris clair, cohérent avec le style attestation/mise en demeure)
  doc.setFillColor(243, 244, 246); doc.rect(margin, y, pageW - margin * 2, 34, 'F')
  doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.4); doc.rect(margin, y, pageW - margin * 2, 34)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(37, 99, 235)
  doc.text('DÉTAIL DU PAIEMENT', margin + 6, y + 8)
  doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text('Loyer hors charges :', margin + 6, y + 16)
  doc.text(`${data.loyer.montant.toFixed(2)} €`, pageW - margin - 6, y + 16, { align: 'right' })
  doc.text('Charges :', margin + 6, y + 23)
  doc.text(`${data.loyer.charges.toFixed(2)} €`, pageW - margin - 6, y + 23, { align: 'right' })
  const total = data.loyer.montant + data.loyer.charges
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
  doc.text('TOTAL RÉGLÉ :', margin + 6, y + 31)
  doc.text(`${total.toFixed(2)} €`, pageW - margin - 6, y + 31, { align: 'right' })
  y += 44

  // Attestation
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(0, 0, 0)
  const attestation = `Je soussigné(e) ${data.proprietaire.prenom} ${data.proprietaire.nom}, bailleur, atteste avoir reçu de ${data.locataire.prenom} ${data.locataire.nom} la somme de ${total.toFixed(2)} € au titre du loyer et des charges du logement désigné ci-dessus pour la période de ${data.loyer.periode}, et lui en donne quittance, sous réserve de tous mes droits.`
  const lines = doc.splitTextToSize(attestation, pageW - margin * 2)
  doc.text(lines, margin, y)
  y += lines.length * 6 + 14

  // Date et signature
  doc.text(`Fait le ${data.loyer.datePaiement}`, margin, y)
  doc.text('Signature du bailleur :', pageW - margin - 55, y)
  y += 4
  if (data.signature) {
    try { doc.addImage(data.signature, 'PNG', pageW - margin - 55, y, 50, 20) } catch (e) { doc.line(pageW - margin - 55, y + 15, pageW - margin, y + 15) }
  } else {
    doc.line(pageW - margin - 55, y + 15, pageW - margin, y + 15)
  }

  await ajouterQRFooter(doc)
  return doc
}

export async function generateQuittance(data: QuittanceData): Promise<void> {
  const doc = await buildQuittanceDoc(data)
  doc.save(`quittance_${data.loyer.periode.replace(' ', '_')}_${data.locataire.nom}.pdf`)
}