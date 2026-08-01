// Convertit une image accessible par URL publique en base64, pour l'intégrer dans le PDF (jsPDF a besoin de base64, pas d'une URL)
async function urlVersBase64(url) {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Ajoute une annexe photos à la fin du PDF : une page (ou plus) par pièce ayant des photos,
 * avec le nom de la pièce et les photos associées en grille.
 */
export async function ajouterAnnexePhotosEDL(doc, pieces) {
  const piecesAvecPhotos = (pieces || []).filter(p => Array.isArray(p.photos) && p.photos.length > 0)
  if (piecesAvecPhotos.length === 0) return

  doc.addPage()
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, pageWidth, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('ANNEXE — PHOTOS', pageWidth / 2, 13, { align: 'center' })

  let y = 32
  doc.setTextColor(0, 0, 0)

  const imgW = 55, imgH = 55, gap = 6

  for (const piece of piecesAvecPhotos) {
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(37, 99, 235)
    doc.text(piece.nom, 14, y)
    y += 8
    doc.setTextColor(0, 0, 0)

    let x = 14
    for (const url of piece.photos) {
      if (x + imgW > pageWidth - 14) { x = 14; y += imgH + gap }
      if (y + imgH > 280) { doc.addPage(); y = 20; x = 14 }
      try {
        const base64 = await urlVersBase64(url)
        doc.addImage(base64, 'JPEG', x, y, imgW, imgH)
      } catch (e) {
        // photo inaccessible, on l'ignore silencieusement plutôt que de bloquer tout le PDF
      }
      x += imgW + gap
    }
    y += imgH + 16
  }
}

/**
 * Ajoute le bloc signatures (propriétaire + locataire, ou mention de refus) à la position courante.
 * Retourne le doc pour chaînage éventuel.
 */
export function ajouterSignaturesEDL(doc, y, { signatureBailleur, signatureLocataire, locataireRefuse }) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(37, 99, 235)
  doc.text('SIGNATURES', 14, y)
  y += 10
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Le propriétaire', 14, y)
  doc.text('Le locataire', 120, y)
  y += 4

  if (signatureBailleur) {
    try { doc.addImage(signatureBailleur, 'PNG', 14, y, 55, 22) } catch (e) { /* signature invalide, ignorée */ }
  }

  if (locataireRefuse) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(220, 38, 38)
    doc.text('Le locataire refuse de signer', 120, y + 12)
    doc.setTextColor(0, 0, 0)
  } else if (signatureLocataire) {
    try { doc.addImage(signatureLocataire, 'PNG', 120, y, 55, 22) } catch (e) { /* signature invalide, ignorée */ }
  }

  return y + 26
}