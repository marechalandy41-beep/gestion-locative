import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const paragraphesMotif = {
  impaye: (f) => [
    `Malgré nos relances, nous constatons que le loyer et les charges au titre du bail vous liant en qualité de locataire du logement situé ${f.bienAdresse || ''} n'ont pas été réglés pour la ou les périodes suivantes : ${f.moisImpayes || 'non précisé'}.`,
    `Le montant total dû à ce jour s'élève à ${parseFloat(f.montantDu || 0).toFixed(2)} €.`,
    `Nous vous mettons en demeure de régulariser cette situation dans un délai de ${f.delaiJours || 8} jours à compter de la réception de la présente, faute de quoi nous nous réservons le droit d'engager toute action, y compris la résiliation du bail par mise en œuvre de la clause résolutoire prévue à l'article 24 de la loi n° 89-462 du 6 juillet 1989, ainsi que toute procédure judiciaire de recouvrement.`,
  ],
  troubles: (f) => [
    `Nous avons été informés, et constatons, des troubles de voisinage suivants imputables à votre occupation du logement situé ${f.bienAdresse || ''} :`,
    f.description || '',
    `Ces agissements constituent un manquement à vos obligations de locataire, notamment à l'obligation d'user paisiblement des locaux loués prévue à l'article 7 de la loi n° 89-462 du 6 juillet 1989.`,
    `Nous vous mettons en demeure de faire cesser ces troubles dans un délai de ${f.delaiJours || 8} jours à compter de la réception de la présente, faute de quoi nous nous réservons le droit d'engager toute action à votre encontre, y compris la résiliation du bail.`,
  ],
  degradations: (f) => [
    `Nous avons constaté les dégradations suivantes dans le logement situé ${f.bienAdresse || ''} dont vous avez la jouissance :`,
    f.description || '',
    `Ces dégradations constituent un manquement à votre obligation de répondre des dégradations survenues pendant la durée du bail, prévue à l'article 7 de la loi n° 89-462 du 6 juillet 1989 et à l'article 1732 du Code civil.`,
    `Nous vous mettons en demeure de procéder à la remise en état ou de nous indemniser du préjudice subi dans un délai de ${f.delaiJours || 8} jours à compter de la réception de la présente, faute de quoi nous nous réservons le droit d'engager toute action à votre encontre.`,
  ],
  autre: (f) => [
    `Nous portons à votre connaissance le manquement suivant à vos obligations contractuelles concernant le logement situé ${f.bienAdresse || ''} :`,
    f.description || '',
    `Nous vous mettons en demeure d'y remédier dans un délai de ${f.delaiJours || 8} jours à compter de la réception de la présente, faute de quoi nous nous réservons le droit d'engager toute action à votre encontre.`,
  ],
}

export async function POST(request) {
  try {
    const f = await request.json()
    const { userId, motif, motifLabel } = f

    if (!userId || !f.bailleurNom || !f.locataireNom) {
      return NextResponse.json({ error: 'Informations bailleur/locataire requises' }, { status: 400 })
    }

    const paragraphes = (paragraphesMotif[motif] || paragraphesMotif.autre)(f)
    const dateJour = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

    // Récupérer la signature du bailleur (depuis customers)
    const { data: customerData } = await supabase
      .from('customers')
      .select('signature')
      .eq('user_id', userId)
      .single()
    const signatureBailleur = customerData?.signature || null

    // --- Génération PDF ---
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = 210, margin = 20, maxW = pageW - margin * 2
    let y = 20

    doc.setFillColor(220, 38, 38); doc.rect(0, 0, pageW, 16, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
    doc.text('MISE EN DEMEURE', pageW / 2, 10.5, { align: 'center' })
    doc.setTextColor(0, 0, 0)

    y = 28
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
    doc.text(f.bailleurNom, margin, y); y += 5
    if (f.bailleurAdresse) { doc.text(f.bailleurAdresse, margin, y); y += 5 }
    y += 8

    doc.text(`Destinataire : ${f.locataireNom}`, pageW - margin, y - (f.bailleurAdresse ? 13 : 8), { align: 'right' })
    if (f.locataireAdresse) doc.text(f.locataireAdresse, pageW - margin, y - (f.bailleurAdresse ? 8 : 3), { align: 'right' })

    doc.text(`Fait le ${dateJour}`, pageW - margin, y, { align: 'right' }); y += 14

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    doc.text(`Objet : Mise en demeure — ${motifLabel || ''}`, margin, y); y += 6
    doc.setFontSize(9); doc.setFont('helvetica', 'italic')
    doc.text('Lettre recommandée avec accusé de réception', margin, y); y += 10

    doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
    doc.text(`Madame, Monsieur,`, margin, y); y += 10

    doc.setFontSize(10)
    for (const p of paragraphes) {
      if (!p) continue
      const lignes = doc.splitTextToSize(p, maxW)
      for (const ligne of lignes) {
        if (y > 265) { doc.addPage(); y = 20 }
        doc.text(ligne, margin, y); y += 6
      }
      y += 4
    }

    if (y > 255) { doc.addPage(); y = 20 }
    y += 6
    doc.text(`Nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.`, margin, y, { maxWidth: maxW }); y += 14

    // Bloc signature : on s'assure d'avoir la place (nom + label + image ~35mm)
    if (y > 250) { doc.addPage(); y = 20 }
    doc.text(f.bailleurNom, margin, y); y += 6
    doc.text('Signature :', margin, y); y += 4
    if (signatureBailleur) {
      try { doc.addImage(signatureBailleur, 'PNG', margin, y, 50, 20) } catch (e) { /* signature invalide, on ignore */ }
    }

    doc.setFontSize(7); doc.setTextColor(150, 150, 150)
    doc.text('Document généré par Ma Gestion-Locative', pageW / 2, 290, { align: 'center' })

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    // --- Sauvegarde coffre-fort ---
    const nomFichier = `MiseEnDemeure_${(motifLabel || 'motif').replace(/[^a-zA-Z0-9]/g, '_')}_${f.locataireNom.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    const cheminStorage = `${userId}/${f.bienId || 'sans-bien'}/Mise en demeure/${nomFichier}`

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
      bail_id: f.bailId || null,
      nom_fichier: nomFichier,
      categorie: 'Mise en demeure',
      annee: new Date().getFullYear(),
      storage_path: cheminStorage,
      url: urlData.publicUrl,
    })

    // On retourne le PDF (base64) pour téléchargement immédiat côté client
    const pdfBase64 = pdfBuffer.toString('base64')

    return NextResponse.json({ success: true, url: urlData.publicUrl, pdfBase64, nomFichier })

  } catch (err) {
    console.error('generate-mise-en-demeure error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}