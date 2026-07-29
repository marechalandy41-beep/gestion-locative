import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'
import { ajouterQRFooter } from '@/lib/qrDocument'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

function sanitize(nom) {
  return (nom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
}

export async function POST(request) {
  try {
    const { token, signatureLocataire, luApprouve } = await request.json()
    if (!token || !signatureLocataire) return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 })
    if (!luApprouve) return NextResponse.json({ error: 'Vous devez cocher « Lu et approuvé » avant de signer.' }, { status: 400 })

    const { data: bail, error: bailErr } = await supabase
      .from('Baux')
      .select('*, Biens(nom, adresse, type)')
      .eq('token_signature', token)
      .single()

    if (bailErr || !bail) return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 404 })
    if (bail.statut !== 'attente_signature') return NextResponse.json({ error: 'Ce bail a déjà été signé.' }, { status: 409 })

    // ===== GÉNÉRATION DU PDF FINAL (mêmes articles que la création côté bailleur) =====
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = 210, margin = 20, contenuW = pageW - margin * 2
    let y = 20
    const checkPage = () => { if (y > 270) { doc.addPage(); y = 20 } }
    const titre = (texte) => {
      checkPage()
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235)
      doc.text(texte, margin, y); y += 2
      doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.4)
      doc.line(margin, y, pageW - margin, y); y += 6; doc.setTextColor(0, 0, 0)
    }
    const ligne = (label, valeur) => {
      if (!valeur) return
      checkPage()
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text(label, margin, y)
      doc.setFont('helvetica', 'normal')
      const lignes = doc.splitTextToSize(valeur.toString(), contenuW - 55)
      doc.text(lignes, margin + 55, y)
      y += Math.max(5, lignes.length * 4.5)
    }
    const texte = (t) => {
      checkPage()
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50)
      const lignes = doc.splitTextToSize(t, contenuW)
      lignes.forEach(l => { checkPage(); doc.text(l, margin, y); y += 4.5 })
      doc.setTextColor(0, 0, 0); y += 2
    }
    const saut = (n = 5) => { y += n }

    doc.setFillColor(37, 99, 235); doc.rect(0, 0, 210, 20, 'F')
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
    doc.text('CONTRAT DE LOCATION', pageW / 2, 10, { align: 'center' })
    doc.setFontSize(9)
    doc.text('NON MEUBLÉ — Loi n°89-462 du 6 juillet 1989 modifiée par la loi ALUR du 24 mars 2014', pageW / 2, 16, { align: 'center' })
    y = 28; doc.setTextColor(0, 0, 0)

    titre('ARTICLE 1 — LE BAILLEUR')
    if (bail.bailleur_type === 'morale') {
      ligne('Société :', `${bail.bailleur_denomination} (${bail.bailleur_forme_juridique})`)
      ligne('SIREN :', bail.bailleur_siren)
      ligne('Siège social :', bail.bailleur_adresse)
      ligne('Représentée par :', bail.bailleur_representant_type === 'morale'
        ? `${bail.bailleur_representant_denomination}, elle-même représentée par ${bail.bailleur_representant_personne}`
        : bail.bailleur_representant)
    } else {
      ligne('Nom et prénom :', `${bail.bailleur_prenom} ${bail.bailleur_nom}`)
      ligne('Adresse :', bail.bailleur_adresse)
    }

    titre('ARTICLE 2 — LE LOCATAIRE')
    if (bail.locataire_type === 'morale') {
      ligne('Société :', `${bail.locataire_denomination} (${bail.locataire_forme_juridique})`)
      ligne('SIREN :', bail.locataire_siren)
      ligne('Adresse :', bail.locataire_adresse)
      ligne('Représentée par :', bail.locataire_representant_type === 'morale'
        ? `${bail.locataire_representant_denomination}, elle-même représentée par ${bail.locataire_representant_personne}`
        : bail.locataire_representant)
      ligne('Email :', bail.locataire_email)
      ligne('Téléphone :', bail.locataire_telephone)
    } else {
      ligne('Nom et prénom :', `${bail.locataire_prenom} ${bail.locataire_nom}`)
      ligne('Email :', bail.locataire_email)
      ligne('Téléphone :', bail.locataire_telephone)
    }

    titre('ARTICLE 3 — DÉSIGNATION DU BIEN LOUÉ')
    ligne('Adresse :', bail.Biens?.adresse)
    ligne('Type de bien :', bail.Biens?.type)
    ligne('Surface habitable :', bail.surface_habitable ? `${bail.surface_habitable} m²` : null)
    ligne('Nombre de pièces :', bail.nombre_pieces)
    ligne('Étage / Bâtiment :', bail.etage)
    ligne('Numéro de lot :', bail.numero_lot)
    ligne('Classe DPE :', bail.classe_dpe)
    ligne('Équipements :', bail.equipements); saut()

    titre('ARTICLE 4 — DURÉE DU BAIL')
    ligne('Date de début :', bail.date_debut ? new Date(bail.date_debut).toLocaleDateString('fr-FR') : null)
    ligne('Date de fin :', bail.date_fin ? new Date(bail.date_fin).toLocaleDateString('fr-FR') : 'Reconduction tacite (3 ans)')
    texte("Le présent bail est conclu pour une durée minimale de 3 ans, conformément à l'article 10 de la loi du 6 juillet 1989. À l'expiration de cette durée, il se renouvelle tacitement pour la même durée, sauf congé donné dans les formes et délais prévus par la loi.")

    titre('ARTICLE 5 — CONDITIONS FINANCIÈRES')
    ligne('Loyer mensuel HC :', `${bail.loyer_hc} €`)
    ligne('Charges mensuelles :', bail.charges ? `${bail.charges} € (${bail.type_charges})` : null)
    ligne('Total CC :', `${(parseFloat(bail.loyer_hc) + parseFloat(bail.charges || 0)).toFixed(2)} €`)
    ligne('Dépôt de garantie :', bail.depot_garantie ? `${bail.depot_garantie} €` : null)
    ligne('Modalité de paiement :', bail.modalite_paiement)
    ligne("Date d'exigibilité :", `Le ${bail.date_exigibilite} de chaque mois`)
    ligne('Révision annuelle IRL :', bail.revision_irl ? "Oui — selon l'IRL (INSEE)" : 'Non'); saut()

    titre('ARTICLE 6 — OBLIGATIONS DU BAILLEUR')
    texte("Le bailleur s'engage à : délivrer le logement en bon état d'usage et de réparation, assurer la jouissance paisible des lieux, entretenir les locaux en état de servir à l'usage prévu, réaliser les réparations autres que locatives, garantir contre les vices ou défauts cachés.")

    titre('ARTICLE 7 — OBLIGATIONS DU LOCATAIRE')
    texte("Le locataire s'engage à : payer le loyer et les charges aux termes convenus, user paisiblement des locaux, répondre des dégradations survenues pendant la durée du contrat, souscrire une assurance multirisque habitation et en justifier chaque année, ne pas transformer les locaux sans accord du bailleur.")

    titre('ARTICLE 8 — DÉPÔT DE GARANTIE')
    texte(`Un dépôt de garantie de ${bail.depot_garantie || 0} € est versé à la signature du présent bail. Il sera restitué dans un délai d'un mois à compter de la remise des clés si l'état des lieux de sortie est conforme à l'état des lieux d'entrée, ou de deux mois dans le cas contraire.`)

    titre('ARTICLE 9 — RÉSILIATION')
    texte("Le locataire peut résilier le bail à tout moment avec un préavis de 3 mois (réduit à 1 mois dans les zones tendues, pour perte d'emploi, mutation professionnelle, ou pour le locataire de plus de 60 ans). Le bailleur peut résilier à l'échéance avec un préavis de 6 mois pour reprise, vente ou motif légitime et sérieux.")

    if (bail.clauses?.trim()) {
      titre('ARTICLE 10 — CLAUSES PARTICULIÈRES')
      texte(bail.clauses)
    }

    if (y > 220) { doc.addPage(); y = 20 }
    saut(8); titre('SIGNATURES')
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text(`Fait en deux exemplaires originaux, le ${new Date().toLocaleDateString('fr-FR')}`, margin, y); y += 12
    doc.setFont('helvetica', 'bold')
    doc.text('Le Bailleur', margin, y); doc.text('Le Locataire', pageW / 2 + 5, y); y += 4
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
    const nomSignBailleur = bail.bailleur_type === 'morale'
      ? `${bail.bailleur_denomination}${bail.bailleur_representant ? ' — ' + bail.bailleur_representant : (bail.bailleur_representant_personne ? ' — ' + bail.bailleur_representant_personne : '')}`
      : `${bail.bailleur_prenom} ${bail.bailleur_nom}`
    const nomSignLocataire = bail.locataire_type === 'morale'
      ? `${bail.locataire_denomination}${bail.locataire_representant ? ' — ' + bail.locataire_representant : (bail.locataire_representant_personne ? ' — ' + bail.locataire_representant_personne : '')}`
      : `${bail.locataire_prenom} ${bail.locataire_nom}`
    doc.text(nomSignBailleur, margin, y)
    doc.text(nomSignLocataire, pageW / 2 + 5, y); y += 2
    y += 4
    doc.setDrawColor(180, 180, 180)
    doc.rect(margin, y, 80, 38); doc.rect(pageW / 2 + 5, y, 80, 38)
    doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(120, 120, 120)
    doc.text('Lu et approuvé (envoi pour signature à distance)', margin + 2, y + 4)
    doc.text('Lu et approuvé', pageW / 2 + 7, y + 4)
    doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal')
    if (bail.signature_bailleur) doc.addImage(bail.signature_bailleur, 'PNG', margin + 1, y + 5, 78, 32)
    doc.addImage(signatureLocataire, 'PNG', pageW / 2 + 6, y + 5, 78, 32)
    y += 44
    await ajouterQRFooter(doc, undefined, { x: margin, y: y - 4 })

    const nomFichier = `Bail_NonMeuble_${sanitize(bail.locataire_nom || bail.locataire_denomination)}_${sanitize(bail.bailleur_nom || bail.bailleur_denomination)}_${bail.date_debut || 'date'}.pdf`
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    const cheminStorage = `baux/${bail.user_id}/${Date.now()}_${nomFichier}`
    const { error: uploadErr } = await supabase.storage.from('documents').upload(cheminStorage, pdfBuffer, { contentType: 'application/pdf' })
    let bailPdfUrl = bail.bail_pdf_url || null
    if (!uploadErr) {
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(cheminStorage)
      bailPdfUrl = urlData.publicUrl
      await supabase.from('Documents').insert({
        user_id: bail.user_id, bien_id: bail.bien_id,
        nom_fichier: nomFichier, categorie: 'Bail', url: bailPdfUrl,
        storage_path: cheminStorage, annee: bail.date_debut ? new Date(bail.date_debut).getFullYear() : new Date().getFullYear(),
      })
    }

    // Activer le bail
    const nouveauStatut = (bail.date_debut && bail.date_debut > new Date().toISOString().split('T')[0]) ? 'a_venir' : 'actif'
    await supabase.from('Baux').update({
      signature_locataire: signatureLocataire,
      statut: nouveauStatut,
      token_signature: null,
      bail_pdf_url: bailPdfUrl,
    }).eq('id', bail.id)

    // Notifier le bailleur
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/notifications`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: bail.user_id, type: 'bail_signe',
        message: `${nomSignLocataire} a signé le bail — le bail est maintenant ${nouveauStatut === 'actif' ? 'actif' : 'programmé'}.`,
        lien: `/baux/${bail.id}`,
      }),
    }).catch(() => {})

    // Envoyer une copie du bail signé au locataire par email
    if (bail.locataire_email) {
      try {
        await resend.emails.send({
          from: 'Ma Gestion-Locative <noreply@magestion-locative.fr>',
          to: [bail.locataire_email],
          subject: 'Votre bail signé',
          html: `<p>Bonjour ${nomSignLocataire},</p><p>Votre bail a bien été signé par les deux parties. Vous en trouverez une copie en pièce jointe.</p>`,
          attachments: [{ filename: nomFichier, content: pdfBuffer.toString('base64') }],
        })
      } catch (e) { console.error('Envoi copie locataire échoué :', e.message) }
    }

    return NextResponse.json({ success: true, bailId: bail.id })
  } catch (err) {
    console.error('finaliser-signature-bail error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}