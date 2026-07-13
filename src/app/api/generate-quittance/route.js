import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'

// Client Supabase avec la clé service (accès serveur complet)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const moisLabels = {
  1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril', 5: 'Mai', 6: 'Juin',
  7: 'Juillet', 8: 'Août', 9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre'
}

export async function POST(request) {
  try {
    const { bailId, userId, mois, annee, datePaiement, montant } = await request.json()

    if (!bailId || !userId) {
      return NextResponse.json({ error: 'bailId et userId requis' }, { status: 400 })
    }

    // Récupérer le bail + le bien
    const { data: bail, error: bailErr } = await supabase
      .from('Baux')
      .select('*, Biens(nom, adresse, ville, code_postal)')
      .eq('id', bailId)
      .single()

    if (bailErr || !bail) {
      return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
    }

    // Récupérer la signature du bailleur (depuis customers)
    const { data: customerData } = await supabase
      .from('customers')
      .select('signature')
      .eq('user_id', userId)
      .single()
    const signatureBailleur = customerData?.signature || null

    // Déterminer les noms (gère les personnes morales)
    const nomBailleur = bail.bailleur_type === 'morale'
      ? (bail.bailleur_denomination || '')
      : `${bail.bailleur_prenom || ''} ${bail.bailleur_nom || ''}`.trim()
    const nomLocataire = bail.locataire_type === 'morale'
      ? (bail.locataire_denomination || '')
      : `${bail.locataire_prenom || ''} ${bail.locataire_nom || ''}`.trim()

    const moisNum = parseInt(mois)
    const periode = `${moisLabels[moisNum] || ''} ${annee}`
    const loyerHC = parseFloat(bail.loyer_hc) || 0
    const charges = parseFloat(bail.charges) || 0
    const total = montant != null ? parseFloat(montant) : (loyerHC + charges)
    const dateP = datePaiement ? new Date(datePaiement).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')

    // Générer le PDF
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = 210, margin = 20
    let y = 24

    doc.setFillColor(37, 99, 235); doc.rect(0, 0, pageW, 18, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
    doc.text('QUITTANCE DE LOYER', pageW / 2, 11, { align: 'center' })
    doc.setTextColor(0, 0, 0)

    y = 32
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
    doc.text(`Quittance pour la période de ${periode}`, margin, y); y += 12

    doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
    doc.text(`Bailleur : ${nomBailleur}`, margin, y); y += 6
    if (bail.bailleur_adresse) { doc.text(`Adresse : ${bail.bailleur_adresse}`, margin, y); y += 6 }
    y += 4
    doc.text(`Locataire : ${nomLocataire}`, margin, y); y += 6

    const adrBien = bail.Biens?.adresse || ''
    const villeBien = [bail.Biens?.code_postal, bail.Biens?.ville].filter(Boolean).join(' ')
    doc.text(`Logement loué : ${adrBien}${villeBien ? ', ' + villeBien : ''}`, margin, y); y += 12

    // Cadre montant
    doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.4)
    doc.rect(margin, y, pageW - margin * 2, 32)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
    doc.text(`Loyer hors charges : ${loyerHC.toFixed(2)} €`, margin + 6, y + 9)
    doc.text(`Provision pour charges : ${charges.toFixed(2)} €`, margin + 6, y + 17)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    doc.text(`Total réglé : ${total.toFixed(2)} €`, margin + 6, y + 26)
    y += 42

    doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
    doc.text(`Je soussigné(e) ${nomBailleur}, propriétaire du logement désigné ci-dessus,`, margin, y); y += 6
    doc.text(`déclare avoir reçu de ${nomLocataire} la somme de ${total.toFixed(2)} € au titre du`, margin, y); y += 6
    doc.text(`loyer et des charges pour la période de ${periode}, et lui en donne quittance,`, margin, y); y += 6
    doc.text(`sous réserve de tous mes droits.`, margin, y); y += 12

    doc.text(`Fait le ${dateP}`, margin, y); y += 10
    doc.text(`Signature du bailleur :`, margin, y); y += 4
    if (signatureBailleur) {
      try { doc.addImage(signatureBailleur, 'PNG', margin, y, 50, 20) } catch (e) { /* signature invalide, on ignore */ }
    }

    doc.setFontSize(7); doc.setTextColor(150, 150, 150)
    doc.text('Document généré par Ma Gestion-Locative', pageW / 2, 285, { align: 'center' })

    // Convertir en buffer
    const pdfArrayBuffer = doc.output('arraybuffer')
    const pdfBuffer = Buffer.from(pdfArrayBuffer)

    // Upload dans Supabase Storage
    const nomFichier = `Quittance_${moisLabels[moisNum]}_${annee}_${nomLocataire.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    const cheminStorage = `${userId}/${bail.bien_id}/Quittance/${nomFichier}`

    const { error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(cheminStorage, pdfBuffer, { contentType: 'application/pdf', upsert: true })

    if (uploadErr) {
      return NextResponse.json({ error: 'Upload échoué : ' + uploadErr.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(cheminStorage)

    // Créer la ligne dans Documents
    await supabase.from('Documents').insert({
      user_id: userId,
      bien_id: bail.bien_id,
      bail_id: bail.id,
      nom_fichier: nomFichier,
      categorie: 'Quittance',
      annee: parseInt(annee),
      storage_path: cheminStorage,
      url: urlData.publicUrl,
    })

    // Envoyer la quittance par email au locataire (si email renseigné)
    if (bail.locataire_email) {
      try {
        const pdfBase64 = pdfBuffer.toString('base64')
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/send-quittance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locataireEmail: bail.locataire_email,
            locataireNom: bail.locataire_type === 'morale' ? (bail.locataire_denomination || '') : (bail.locataire_nom || ''),
            locatairePrenom: bail.locataire_type === 'morale' ? '' : (bail.locataire_prenom || ''),
            bienNom: bail.Biens?.nom || bail.Biens?.adresse || '',
            periode,
            montant: total.toFixed(2),
            pdfBase64,
            proprietaireNom: nomBailleur,
          }),
        })
      } catch (mailErr) {
        console.error('Envoi email quittance échoué:', mailErr)
        // On ne bloque pas : la quittance est déjà générée et stockée
      }
    }

    return NextResponse.json({ success: true, url: urlData.publicUrl })

  } catch (err) {
    console.error('generate-quittance error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}