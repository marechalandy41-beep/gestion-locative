import jsPDF from 'jspdf'

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

export function generateQuittance(data: QuittanceData): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // Titre
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('QUITTANCE DE LOYER', pageWidth / 2, 30, { align: 'center' })

  // Période
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Période : ${data.loyer.periode}`, pageWidth / 2, 42, { align: 'center' })

  // Ligne séparatrice
  doc.setLineWidth(0.5)
  doc.line(20, 48, pageWidth - 20, 48)

  // Propriétaire
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('BAILLEUR', 20, 60)
  doc.setFont('helvetica', 'normal')
  doc.text(`${data.proprietaire.prenom} ${data.proprietaire.nom}`, 20, 68)
  doc.text(data.proprietaire.adresse, 20, 75)

  // Locataire
  doc.setFont('helvetica', 'bold')
  doc.text('LOCATAIRE', 110, 60)
  doc.setFont('helvetica', 'normal')
  doc.text(`${data.locataire.prenom} ${data.locataire.nom}`, 110, 68)

  // Bien loué
  doc.setFont('helvetica', 'bold')
  doc.text('BIEN LOUÉ', 20, 95)
  doc.setFont('helvetica', 'normal')
  doc.text(data.bien.adresse, 20, 103)

  // Ligne séparatrice
  doc.line(20, 120, pageWidth - 20, 120)

  // Détails paiement
  doc.setFont('helvetica', 'bold')
  doc.text('DÉTAIL DU PAIEMENT', 20, 132)
  doc.setFont('helvetica', 'normal')
  doc.text(`Loyer hors charges :`, 20, 142)
  doc.text(`${data.loyer.montant.toFixed(2)} €`, pageWidth - 20, 142, { align: 'right' })
  doc.text(`Charges :`, 20, 150)
  doc.text(`${data.loyer.charges.toFixed(2)} €`, pageWidth - 20, 150, { align: 'right' })

  // Total
  doc.setLineWidth(0.3)
  doc.line(20, 157, pageWidth - 20, 157)
  doc.setFont('helvetica', 'bold')
  const total = data.loyer.montant + data.loyer.charges
  doc.text('TOTAL RÉGLÉ :', 20, 165)
  doc.text(`${total.toFixed(2)} €`, pageWidth - 20, 165, { align: 'right' })

  // Attestation
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const attestation = `Je soussigné(e) ${data.proprietaire.prenom} ${data.proprietaire.nom}, bailleur, atteste avoir reçu de ${data.locataire.prenom} ${data.locataire.nom} la somme de ${total.toFixed(2)} € au titre du loyer et des charges du logement désigné ci-dessus pour la période de ${data.loyer.periode}.`
  const lines = doc.splitTextToSize(attestation, pageWidth - 40)
  doc.text(lines, 20, 185)

  // Date et signature
  doc.text(`Fait le ${data.loyer.datePaiement}`, 20, 220)
  doc.text('Signature du bailleur :', pageWidth - 80, 220)
  if (data.signature) {
    try { doc.addImage(data.signature, 'PNG', pageWidth - 80, 224, 50, 20) } catch (e) { doc.line(pageWidth - 80, 235, pageWidth - 20, 235) }
  } else {
    doc.line(pageWidth - 80, 235, pageWidth - 20, 235)
  }

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text('Document généré par Ma Gestion-Locative.fr', pageWidth / 2, 280, { align: 'center' })

  // Téléchargement
  doc.save(`quittance_${data.loyer.periode.replace(' ', '_')}_${data.locataire.nom}.pdf`)
}