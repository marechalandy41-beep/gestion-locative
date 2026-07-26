import QRCode from 'qrcode'
import jsPDF from 'jspdf'

const SITE_URL = 'https://www.magestion-locative.fr'

/**
 * Ajoute un QR code + texte en bas de la page courante d'un document jsPDF.
 * À appeler juste avant de sauvegarder/exporter le PDF.
 */
export async function ajouterQRFooter(doc: jsPDF, urlCible: string = SITE_URL, position?: { x?: number, y?: number }): Promise<void> {
  try {
    const qrDataUrl = await QRCode.toDataURL(urlCible, { margin: 0, width: 120 })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const taille = 16 // mm
    const x = position?.x ?? (pageWidth - taille - 14)
    const y = position?.y ?? (pageHeight - taille - 12)

    doc.addImage(qrDataUrl, 'PNG', x, y, taille, taille)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text('Généré avec Ma Gestion-Locative', x + taille / 2, y + taille + 4, { align: 'center' })
  } catch (e) {
    console.error('Erreur génération QR code:', e)
  }
}