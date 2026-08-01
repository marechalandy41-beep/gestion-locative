import { ajouterQRFooter } from './qrDocument'

// Convertit une image accessible par URL publique en base64, pour l'intégrer dans le PDF (jsPDF a besoin de base64, pas d'une URL)
// Écrit pour fonctionner à la fois côté navigateur (formulaire) et côté serveur Node (route API de finalisation à distance)
async function urlVersBase64(url) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status} en récupérant ${url}`)
  const blob = await res.blob()
  const format = blob.type.includes('png') ? 'PNG' : blob.type.includes('webp') ? 'WEBP' : 'JPEG'
  const mime = format === 'PNG' ? 'image/png' : format === 'WEBP' ? 'image/webp' : 'image/jpeg'
  const arrayBuffer = await blob.arrayBuffer()
  const base64Str = typeof Buffer !== 'undefined'
    ? Buffer.from(arrayBuffer).toString('base64')
    : btoa(Array.from(new Uint8Array(arrayBuffer), b => String.fromCharCode(b)).join(''))
  return { base64: `data:${mime};base64,${base64Str}`, format }
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
        const { base64, format } = await urlVersBase64(url)
        doc.addImage(base64, format, x, y, imgW, imgH)
      } catch (e) {
        console.error('Photo annexe EDL non chargée :', url, e.message)
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

/**
 * Construit l'intégralité du PDF d'état des lieux (header, pièces, compteurs, observations,
 * signatures, annexe photos, QR footer). Utilisée à la fois par le formulaire de création
 * (signature sur place) et par la route de finalisation à distance (signature par email).
 */
export async function genererCorpsEDL(doc, edl) {
  const {
    type, date_edl, bienNom, locataireNom, pieces = [], compteurs = {}, observations,
    signatureBailleur, signatureLocataire, locataireRefuse,
  } = edl

  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, pageWidth, 35, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('ÉTAT DES LIEUX', pageWidth / 2, 15, { align: 'center' })
  doc.setFontSize(12)
  doc.text(type === 'entree' ? "D'ENTRÉE" : 'DE SORTIE', pageWidth / 2, 26, { align: 'center' })
  y = 50
  doc.setTextColor(0, 0, 0)
  doc.setFillColor(243, 244, 246)
  doc.rect(14, y - 6, pageWidth - 28, 28, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Bien :', 18, y)
  doc.setFont('helvetica', 'normal')
  doc.text(bienNom || '', 45, y)
  y += 8
  doc.setFont('helvetica', 'bold')
  doc.text('Locataire :', 18, y)
  doc.setFont('helvetica', 'normal')
  doc.text(locataireNom || '—', 45, y)
  y += 8
  doc.setFont('helvetica', 'bold')
  doc.text('Date :', 18, y)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(date_edl).toLocaleDateString('fr-FR'), 45, y)
  y += 18

  if (pieces.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(37, 99, 235)
    doc.text('ÉTAT DES PIÈCES', 14, y)
    y += 8
    pieces.forEach((piece, i) => {
      if (y > 260) { doc.addPage(); y = 20 }
      doc.setFillColor(i % 2 === 0 ? 249 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 251 : 255)
      doc.rect(14, y - 5, pageWidth - 28, piece.commentaire ? 14 : 8, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text(piece.nom, 18, y)
      doc.setFont('helvetica', 'bold')
      doc.text(piece.etat, 110, y)
      if (piece.commentaire) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(piece.commentaire, 18, y + 7)
        doc.setTextColor(0, 0, 0)
        y += 14
      } else { y += 8 }
    })
    y += 6
  }

  const compteurEntries = Object.entries(compteurs || {}).filter(([, v]) => v)
  if (compteurEntries.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(37, 99, 235)
    doc.text('RELEVÉS DE COMPTEURS', 14, y)
    y += 8
    const labels = { eau_froide: 'Eau froide (m³)', eau_chaude: 'Eau chaude (m³)', electricite: 'Électricité (kWh)', gaz: 'Gaz (m³)', chauffage: 'Chauffage' }
    compteurEntries.forEach(([key, val]) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text(`${labels[key] || key} :`, 18, y)
      doc.setFont('helvetica', 'bold')
      doc.text(String(val), 90, y)
      y += 7
    })
    y += 6
  }

  if (observations) {
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(37, 99, 235)
    doc.text('OBSERVATIONS', 14, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    const lignes = doc.splitTextToSize(observations, pageWidth - 28)
    doc.text(lignes, 14, y)
    y += lignes.length * 6 + 6
  }

  if (y > 230) { doc.addPage(); y = 20 }
  y += 15
  ajouterSignaturesEDL(doc, y, { signatureBailleur, signatureLocataire, locataireRefuse })

  await ajouterAnnexePhotosEDL(doc, pieces)
  await ajouterQRFooter(doc)
}