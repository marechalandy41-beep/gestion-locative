import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'
import { ajouterQRFooter } from '@/lib/qrDocument'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function formatDateFr(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      userId, bailId, bienId,
      bailleurNom, bailleurAdresse,
      locataireNom, locataireEmail, locataireAdresse,
      bienAdresse, dateDebut, dateFin,
      chargesProvisionnees, chargesReelles,
      metAJourProvision, nouvelleProvision, envoyerEmail,
    } = body

    if (!userId || !bailleurNom || !locataireNom || !dateDebut || !dateFin) {
      return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 })
    }

    const provisionne = parseFloat(chargesProvisionnees) || 0
    const reel = parseFloat(chargesReelles) || 0
    const solde = reel - provisionne

    // Récupérer la signature du bailleur (comme pour les quittances)
    const { data: customerData } = await supabase
      .from('customers')
      .select('signature')
      .eq('user_id', userId)
      .single()
    const signatureBailleur = customerData?.signature || null

    const doc = new jsPDF()
    const pageW = 210
    const marge = 20
    let y = 30

    // Bandeau bleu (identique aux quittances et attestations)
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, pageW, 18, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('RÉGULARISATION DES CHARGES LOCATIVES', pageW / 2, 11, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    doc.setFont(undefined, 'normal')

    doc.setFontSize(11)
    doc.text(`Fait le ${new Date().toLocaleDateString('fr-FR')}`, marge, y)
    y += 12

    doc.setFont(undefined, 'bold')
    doc.text('Bailleur :', marge, y)
    doc.setFont(undefined, 'normal')
    doc.text(bailleurNom || '', marge + 30, y)
    y += 6
    if (bailleurAdresse) { doc.text(bailleurAdresse, marge + 30, y); y += 6 }
    y += 4

    doc.setFont(undefined, 'bold')
    doc.text('Locataire :', marge, y)
    doc.setFont(undefined, 'normal')
    doc.text(locataireNom || '', marge + 30, y)
    y += 6
    if (locataireAdresse) { doc.text(locataireAdresse, marge + 30, y); y += 6 }
    y += 10

    doc.setFont(undefined, 'bold')
    doc.text('Objet : Régularisation annuelle des charges locatives', marge, y)
    y += 12

    doc.setFont(undefined, 'normal')
    const texte1 = `Conformément à l'article 23 de la loi n°89-462 du 6 juillet 1989, nous procédons à la régularisation des charges locatives du logement situé ${bienAdresse || ''}, pour la période du ${formatDateFr(dateDebut)} au ${formatDateFr(dateFin)}.`
    const lignes1 = doc.splitTextToSize(texte1, 170)
    doc.text(lignes1, marge, y)
    y += lignes1.length * 6 + 8

    doc.setFont(undefined, 'bold')
    doc.text('Détail du calcul :', marge, y)
    y += 8
    doc.setFont(undefined, 'normal')
    doc.text(`Charges provisionnées versées sur la période :`, marge, y)
    doc.text(`${provisionne.toFixed(2)} €`, 170, y, { align: 'right' })
    y += 7
    doc.text(`Charges réelles justifiées sur la période :`, marge, y)
    doc.text(`${reel.toFixed(2)} €`, 170, y, { align: 'right' })
    y += 7
    doc.setDrawColor(200)
    doc.line(marge, y, 190, y)
    y += 7
    doc.setFont(undefined, 'bold')
    doc.text(solde >= 0 ? 'Solde restant dû par le locataire :' : 'Trop-perçu à rembourser au locataire :', marge, y)
    doc.text(`${Math.abs(solde).toFixed(2)} €`, 170, y, { align: 'right' })
    y += 14

    doc.setFont(undefined, 'normal')
    const texte2 = solde > 0
      ? `Il en résulte un solde de ${solde.toFixed(2)} € restant à votre charge. Nous vous remercions de bien vouloir régulariser ce montant dans un délai de 30 jours à compter de la réception du présent courrier.`
      : solde < 0
        ? `Il en résulte un trop-perçu de ${Math.abs(solde).toFixed(2)} € en votre faveur. Ce montant vous sera remboursé, ou le cas échéant déduit de votre prochaine échéance de loyer.`
        : `Les charges provisionnées correspondent exactement aux charges réelles constatées : aucun solde n'est dû de part et d'autre.`
    const lignes2 = doc.splitTextToSize(texte2, 170)
    doc.text(lignes2, marge, y)
    y += lignes2.length * 6 + 10

    if (metAJourProvision && nouvelleProvision) {
      doc.setFont(undefined, 'bold')
      const texte3 = `À compter du prochain terme, la provision mensuelle pour charges est ajustée à ${parseFloat(nouvelleProvision).toFixed(2)} € afin de mieux refléter les charges réelles constatées.`
      const lignes3 = doc.splitTextToSize(texte3, 170)
      doc.text(lignes3, marge, y)
      y += lignes3.length * 6 + 10
      doc.setFont(undefined, 'normal')
    }

    doc.text('Les justificatifs de charges sont disponibles sur demande.', marge, y)
    y += 20

    doc.text('Signature du bailleur :', marge, y)
    if (signatureBailleur) {
      try { doc.addImage(signatureBailleur, 'PNG', marge, y + 4, 50, 20) } catch (e) { /* signature invalide, on ignore */ }
    }

    await ajouterQRFooter(doc)

    const nomFichier = `Regularisation_charges_${(locataireNom || 'locataire').replace(/[^a-zA-Z0-9]/g, '_')}_${dateFin}.pdf`

    // Convertir en buffer (méthode fiable, identique à la génération des quittances)
    const pdfArrayBuffer = doc.output('arraybuffer')
    const pdfBuffer = Buffer.from(pdfArrayBuffer)

    // Sauvegarde dans le coffre-fort
    const cheminStorage = `${userId}/${bienId || 'sans-bien'}/Regularisation_charges/${nomFichier}`
    const { error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(cheminStorage, pdfBuffer, { contentType: 'application/pdf', upsert: true })

    if (uploadErr) {
      console.error('Upload coffre-fort échoué :', uploadErr.message)
    } else {
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(cheminStorage)
      const { error: insertErr } = await supabase.from('Documents').insert({
        user_id: userId,
        bien_id: bienId || null,
        bail_id: bailId || null,
        nom_fichier: nomFichier,
        categorie: 'Régularisation charges',
        annee: new Date(dateFin).getFullYear(),
        storage_path: cheminStorage,
        url: urlData.publicUrl,
      })
      if (insertErr) console.error('Insertion Documents échouée :', insertErr.message)
    }

    // Mettre à jour la provision mensuelle du bail si demandé (n'affecte pas la régularisation déjà calculée)
    if (metAJourProvision && nouvelleProvision && bailId) {
      const { error: majErr } = await supabase.from('Baux').update({ charges: parseFloat(nouvelleProvision) }).eq('id', bailId)
      if (majErr) console.error('Mise à jour provision échouée :', majErr.message)
    }

    const pdfBase64 = pdfBuffer.toString('base64')

    // Envoyer le courrier par email au locataire (uniquement si demandé explicitement)
    if (envoyerEmail && locataireEmail) {
      try {
        const periodeLabel = `${formatDateFr(dateDebut)} au ${formatDateFr(dateFin)}`
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/send-regularisation-charges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locataireEmail,
            locataireNom,
            bienNom: bienAdresse || '',
            periode: periodeLabel,
            solde: Math.abs(solde).toFixed(2),
            sens: solde > 0 ? 'du' : solde < 0 ? 'trop_percu' : 'equilibre',
            pdfBase64,
            proprietaireNom: bailleurNom,
            nomFichier,
          }),
        })
      } catch (mailErr) {
        console.error('Envoi email régularisation échoué :', mailErr)
        // On ne bloque pas : le PDF est déjà généré et stocké
      }
    }

    return NextResponse.json({ pdfBase64, nomFichier })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}