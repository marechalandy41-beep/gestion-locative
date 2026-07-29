import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'
import { ajouterQRFooter } from '@/lib/qrDocument'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      userId, bailId,
      ancienLoyer, nouveauLoyer,
      trimestreReference, indiceReference,
      trimestreNouveau, indiceNouveau,
      dateEffet,
    } = body

    if (!userId || !bailId || !ancienLoyer || !nouveauLoyer) {
      return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 })
    }

    const { data: bail, error: bailErr } = await supabase
      .from('Baux')
      .select('*, Biens(adresse, ville, code_postal, nom)')
      .eq('id', bailId)
      .eq('user_id', userId)
      .single()
    if (bailErr || !bail) return NextResponse.json({ error: 'Bail introuvable.' }, { status: 404 })

    const { data: customerData } = await supabase.from('customers').select('signature').eq('user_id', userId).single()
    const signatureBailleur = customerData?.signature || null

    // 1. Mettre à jour le loyer du bail
    await supabase.from('Baux').update({ loyer_hc: parseFloat(nouveauLoyer) }).eq('id', bailId)

    // 2. Historiser la révision
    await supabase.from('revisions_loyer').insert({
      user_id: userId,
      bail_id: bailId,
      date_revision: dateEffet || new Date().toISOString().split('T')[0],
      ancien_loyer: parseFloat(ancienLoyer),
      nouveau_loyer: parseFloat(nouveauLoyer),
      trimestre_reference: trimestreReference,
      indice_reference: parseFloat(indiceReference),
      trimestre_nouveau: trimestreNouveau,
      indice_nouveau: parseFloat(indiceNouveau),
    })

    // 3. Générer le courrier d'information au locataire
    const nomBailleur = (bail.bailleur_denomination && bail.bailleur_denomination.trim())
      ? bail.bailleur_denomination.trim()
      : `${bail.bailleur_prenom || ''} ${bail.bailleur_nom || ''}`.trim()
    const nomLocataire = (bail.locataire_denomination && bail.locataire_denomination.trim())
      ? bail.locataire_denomination.trim()
      : `${bail.locataire_prenom || ''} ${bail.locataire_nom || ''}`.trim()
    const adresseBien = bail.Biens?.adresse || [bail.Biens?.code_postal, bail.Biens?.ville].filter(Boolean).join(' ') || ''

    const variation = ((parseFloat(nouveauLoyer) - parseFloat(ancienLoyer)) / parseFloat(ancienLoyer)) * 100

    const doc = new jsPDF()
    const pageW = 210
    const marge = 20
    let y = 30

    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, pageW, 18, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('RÉVISION ANNUELLE DU LOYER', pageW / 2, 11, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    doc.setFont(undefined, 'normal')

    doc.setFontSize(11)
    doc.text(`Fait le ${new Date().toLocaleDateString('fr-FR')}`, marge, y)
    y += 12

    doc.setFont(undefined, 'bold')
    doc.text('Bailleur :', marge, y)
    doc.setFont(undefined, 'normal')
    doc.text(nomBailleur, marge + 30, y)
    y += 10

    doc.setFont(undefined, 'bold')
    doc.text('Locataire :', marge, y)
    doc.setFont(undefined, 'normal')
    doc.text(nomLocataire, marge + 30, y)
    y += 14

    doc.setFont(undefined, 'normal')
    const texte1 = `Conformément à la clause de révision prévue au bail et à l'article 17-1 de la loi n°89-462 du 6 juillet 1989, nous procédons à la révision annuelle du loyer du logement situé ${adresseBien}, sur la base de l'indice de référence des loyers (IRL) publié par l'INSEE.`
    const lignes1 = doc.splitTextToSize(texte1, 170)
    doc.text(lignes1, marge, y)
    y += lignes1.length * 6 + 10

    doc.setFont(undefined, 'bold')
    doc.text('Détail du calcul :', marge, y)
    y += 8
    doc.setFont(undefined, 'normal')
    doc.text(`IRL de référence (${trimestreReference}) :`, marge, y)
    doc.text(`${parseFloat(indiceReference).toFixed(2)}`, 170, y, { align: 'right' })
    y += 7
    doc.text(`Nouvel IRL (${trimestreNouveau}) :`, marge, y)
    doc.text(`${parseFloat(indiceNouveau).toFixed(2)}`, 170, y, { align: 'right' })
    y += 7
    doc.text(`Loyer hors charges actuel :`, marge, y)
    doc.text(`${parseFloat(ancienLoyer).toFixed(2)} €`, 170, y, { align: 'right' })
    y += 7
    doc.setDrawColor(200)
    doc.line(marge, y, 190, y)
    y += 7
    doc.setFont(undefined, 'bold')
    doc.text('Nouveau loyer hors charges :', marge, y)
    doc.text(`${parseFloat(nouveauLoyer).toFixed(2)} €`, 170, y, { align: 'right' })
    y += 14

    doc.setFont(undefined, 'normal')
    const texte2 = `Le loyer hors charges passe ainsi de ${parseFloat(ancienLoyer).toFixed(2)} € à ${parseFloat(nouveauLoyer).toFixed(2)} € (soit une variation de ${variation >= 0 ? '+' : ''}${variation.toFixed(2)} %), à compter du ${dateEffet ? new Date(dateEffet).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}. Les charges locatives ne sont pas concernées par cette révision.`
    const lignes2 = doc.splitTextToSize(texte2, 170)
    doc.text(lignes2, marge, y)
    y += lignes2.length * 6 + 16

    doc.text('Signature du bailleur :', marge, y)
    if (signatureBailleur) {
      try { doc.addImage(signatureBailleur, 'PNG', marge, y + 4, 50, 20) } catch (e) { /* signature invalide, on ignore */ }
    }

    await ajouterQRFooter(doc)

    const nomFichier = `Revision_loyer_${(nomLocataire || 'locataire').replace(/[^a-zA-Z0-9]/g, '_')}_${(dateEffet || new Date().toISOString().split('T')[0])}.pdf`
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    const cheminStorage = `${userId}/${bail.bien_id}/Revision_loyer/${nomFichier}`
    const { error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(cheminStorage, pdfBuffer, { contentType: 'application/pdf', upsert: true })

    if (!uploadErr) {
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(cheminStorage)
      await supabase.from('Documents').insert({
        user_id: userId,
        bien_id: bail.bien_id,
        bail_id: bailId,
        nom_fichier: nomFichier,
        categorie: 'Révision de loyer',
        annee: new Date(dateEffet || Date.now()).getFullYear(),
        storage_path: cheminStorage,
        url: urlData.publicUrl,
      })
    } else {
      console.error('Upload coffre-fort échoué :', uploadErr.message)
    }

    return NextResponse.json({ success: true, pdfBase64: pdfBuffer.toString('base64'), nomFichier })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}