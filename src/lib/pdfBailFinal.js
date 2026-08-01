import { ajouterQRFooter } from './qrDocument'

function sanitize(nom) {
  return (nom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
}

function helpers(doc, couleurRGB) {
  const pageW = 210, margin = 20, contenuW = pageW - margin * 2
  let y = { v: 20 }
  const checkPage = () => { if (y.v > 270) { doc.addPage(); y.v = 20 } }
  const titre = (t) => {
    checkPage()
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...couleurRGB)
    doc.text(t, margin, y.v); y.v += 2
    doc.setDrawColor(...couleurRGB); doc.setLineWidth(0.4)
    doc.line(margin, y.v, pageW - margin, y.v); y.v += 6; doc.setTextColor(0, 0, 0)
  }
  const ligne = (label, valeur) => {
    if (!valeur) return
    checkPage()
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text(label, margin, y.v)
    doc.setFont('helvetica', 'normal')
    const lignes = doc.splitTextToSize(valeur.toString(), contenuW - 55)
    doc.text(lignes, margin + 55, y.v)
    y.v += Math.max(5, lignes.length * 4.5)
  }
  const texte = (t) => {
    checkPage()
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50)
    doc.splitTextToSize(t, contenuW).forEach(l => { checkPage(); doc.text(l, margin, y.v); y.v += 4.5 })
    doc.setTextColor(0, 0, 0); y.v += 2
  }
  return { pageW, margin, contenuW, y, titre, ligne, texte }
}

function signatures(doc, bail, signatureLocataire, h, labelLocataire = 'Le Locataire') {
  const { pageW, margin, y } = h
  if (y.v > 220) { doc.addPage(); y.v = 20 }
  y.v += 8
  h.titre('SIGNATURES')
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text(`Fait le ${new Date().toLocaleDateString('fr-FR')}`, margin, y.v); y.v += 12
  doc.setFont('helvetica', 'bold')
  doc.text('Le Bailleur', margin, y.v); doc.text(labelLocataire, pageW / 2 + 5, y.v); y.v += 6
  doc.setDrawColor(180, 180, 180)
  doc.rect(margin, y.v, 80, 38); doc.rect(pageW / 2 + 5, y.v, 80, 38)
  doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(120, 120, 120)
  doc.text('Lu et approuvé (envoi pour signature à distance)', margin + 2, y.v + 4)
  doc.text('Lu et approuvé', pageW / 2 + 7, y.v + 4)
  doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal')
  if (bail.signature_bailleur) doc.addImage(bail.signature_bailleur, 'PNG', margin + 1, y.v + 5, 78, 32)
  if (signatureLocataire) {
    doc.addImage(signatureLocataire, 'PNG', pageW / 2 + 6, y.v + 5, 78, 32)
  } else {
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(150, 150, 150)
    doc.text('En attente de signature', pageW / 2 + 8, y.v + 22)
    doc.setTextColor(0, 0, 0)
  }
  y.v += 44
}

const identiteBailleur = (bail, h) => {
  if (bail.bailleur_type === 'morale') {
    h.ligne('Société :', `${bail.bailleur_denomination} (${bail.bailleur_forme_juridique})`)
    h.ligne('SIREN :', bail.bailleur_siren)
    h.ligne('Siège social :', bail.bailleur_adresse)
    h.ligne('Représentée par :', bail.bailleur_representant_type === 'morale'
      ? `${bail.bailleur_representant_denomination}, elle-même représentée par ${bail.bailleur_representant_personne}`
      : bail.bailleur_representant)
  } else {
    h.ligne('Nom et prénom :', `${bail.bailleur_prenom} ${bail.bailleur_nom}`)
    h.ligne('Adresse :', bail.bailleur_adresse)
  }
}

// ===================== NON MEUBLÉ =====================
export async function construireNonMeuble(doc, bail, signatureLocataire) {
  const h = helpers(doc, [37, 99, 235])
  const { pageW, margin, y, titre, ligne, texte } = h
  doc.setFillColor(37, 99, 235); doc.rect(0, 0, 210, 20, 'F')
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
  doc.text('CONTRAT DE LOCATION', pageW / 2, 10, { align: 'center' })
  doc.setFontSize(9)
  doc.text('NON MEUBLÉ — Loi n°89-462 du 6 juillet 1989 modifiée par la loi ALUR du 24 mars 2014', pageW / 2, 16, { align: 'center' })
  y.v = 28; doc.setTextColor(0, 0, 0)

  titre('ARTICLE 1 — LE BAILLEUR'); identiteBailleur(bail, h)

  titre('ARTICLE 2 — LE LOCATAIRE')
  if (bail.locataire_type === 'morale') {
    ligne('Société :', `${bail.locataire_denomination} (${bail.locataire_forme_juridique})`)
    ligne('SIREN :', bail.locataire_siren)
    ligne('Adresse :', bail.locataire_adresse)
    ligne('Représentée par :', bail.locataire_representant_type === 'morale'
      ? `${bail.locataire_representant_denomination}, elle-même représentée par ${bail.locataire_representant_personne}`
      : bail.locataire_representant)
    ligne('Email :', bail.locataire_email); ligne('Téléphone :', bail.locataire_telephone)
  } else {
    ligne('Nom et prénom :', `${bail.locataire_prenom} ${bail.locataire_nom}`)
    ligne('Email :', bail.locataire_email); ligne('Téléphone :', bail.locataire_telephone)
  }

  titre('ARTICLE 3 — DÉSIGNATION DU BIEN LOUÉ')
  ligne('Adresse :', bail.Biens?.adresse)
  ligne('Type de bien :', bail.Biens?.type)
  ligne('Surface habitable :', bail.surface_habitable ? `${bail.surface_habitable} m²` : null)
  ligne('Nombre de pièces :', bail.nombre_pieces)
  ligne('Étage / Bâtiment :', bail.etage)
  ligne('Numéro de lot :', bail.numero_lot)
  ligne('Classe DPE :', bail.classe_dpe)
  ligne('Équipements :', bail.equipements); y.v += 5

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
  ligne('Révision annuelle IRL :', bail.revision_irl ? "Oui — selon l'IRL (INSEE)" : 'Non'); y.v += 5

  titre('ARTICLE 6 — OBLIGATIONS DU BAILLEUR')
  texte("Le bailleur s'engage à : délivrer le logement en bon état d'usage et de réparation, assurer la jouissance paisible des lieux, entretenir les locaux en état de servir à l'usage prévu, réaliser les réparations autres que locatives, garantir contre les vices ou défauts cachés.")

  titre('ARTICLE 7 — OBLIGATIONS DU LOCATAIRE')
  texte("Le locataire s'engage à : payer le loyer et les charges aux termes convenus, user paisiblement des locaux, répondre des dégradations survenues pendant la durée du contrat, souscrire une assurance multirisque habitation et en justifier chaque année, ne pas transformer les locaux sans accord du bailleur.")

  titre('ARTICLE 8 — DÉPÔT DE GARANTIE')
  texte(`Un dépôt de garantie de ${bail.depot_garantie || 0} € est versé à la signature du présent bail. Il sera restitué dans un délai d'un mois à compter de la remise des clés si l'état des lieux de sortie est conforme à l'état des lieux d'entrée, ou de deux mois dans le cas contraire.`)

  titre('ARTICLE 9 — RÉSILIATION')
  texte("Le locataire peut résilier le bail à tout moment avec un préavis de 3 mois (réduit à 1 mois dans les zones tendues, pour perte d'emploi, mutation professionnelle, ou pour le locataire de plus de 60 ans). Le bailleur peut résilier à l'échéance avec un préavis de 6 mois pour reprise, vente ou motif légitime et sérieux.")

  if (bail.clauses?.trim()) { titre('ARTICLE 10 — CLAUSES PARTICULIÈRES'); texte(bail.clauses) }

  signatures(doc, bail, signatureLocataire, h)
  await ajouterQRFooter(doc, undefined, { x: margin, y: y.v - 4 })
  return `Bail_NonMeuble_${sanitize(bail.locataire_nom || bail.locataire_denomination)}_${sanitize(bail.bailleur_nom || bail.bailleur_denomination)}_${bail.date_debut || 'date'}.pdf`
}

// ===================== MEUBLÉ =====================
export async function construireMeuble(doc, bail, signatureLocataire) {
  const h = helpers(doc, [124, 58, 237])
  const { pageW, margin, y, titre, ligne, texte } = h
  doc.setFillColor(124, 58, 237); doc.rect(0, 0, 210, 20, 'F')
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
  doc.text('CONTRAT DE LOCATION MEUBLÉE', pageW / 2, 10, { align: 'center' })
  doc.setFontSize(9)
  doc.text('Loi n°89-462 du 6 juillet 1989 modifiée — Décret n°2015-981 du 31 juillet 2015', pageW / 2, 16, { align: 'center' })
  y.v = 28; doc.setTextColor(0, 0, 0)

  titre('ARTICLE 1 — LE BAILLEUR'); identiteBailleur(bail, h); y.v += 5

  titre('ARTICLE 2 — LE LOCATAIRE')
  if (bail.locataire_type === 'morale') {
    ligne('Société :', `${bail.locataire_denomination} (${bail.locataire_forme_juridique})`)
    ligne('SIREN :', bail.locataire_siren)
    ligne('Adresse du siège :', bail.locataire_adresse)
    ligne('Représentée par :', bail.locataire_representant_type === 'morale'
      ? `${bail.locataire_representant_denomination}, elle-même représentée par ${bail.locataire_representant_personne}`
      : bail.locataire_representant)
    ligne('Email :', bail.locataire_email); ligne('Téléphone :', bail.locataire_telephone)
  } else {
    ligne('Nom et prénom :', `${bail.locataire_prenom} ${bail.locataire_nom}`)
    ligne('Nationalité :', bail.locataire_nationalite)
    ligne('Profession :', bail.locataire_profession)
    ligne('Email :', bail.locataire_email); ligne('Téléphone :', bail.locataire_telephone)
  }
  y.v += 5

  titre('ARTICLE 3 — DÉSIGNATION DU BIEN LOUÉ')
  ligne('Adresse :', bail.Biens?.adresse)
  ligne('Surface habitable :', bail.surface_habitable ? `${bail.surface_habitable} m²` : null)
  ligne('Nombre de pièces :', bail.nombre_pieces)
  ligne('Étage / Bâtiment :', bail.etage)
  ligne('Numéro de lot :', bail.numero_lot)
  ligne('Classe DPE :', bail.classe_dpe)
  ligne('Équipements :', bail.equipements); y.v += 5

  titre('ARTICLE 4 — DURÉE DU BAIL')
  ligne('Date de début :', bail.date_debut ? new Date(bail.date_debut).toLocaleDateString('fr-FR') : null)
  ligne('Date de fin :', bail.date_fin ? new Date(bail.date_fin).toLocaleDateString('fr-FR') : 'Reconduction tacite (1 an)')
  texte("Le présent bail meublé est conclu pour une durée d'un an, conformément à l'article 25-7 de la loi du 6 juillet 1989. À l'expiration, il se renouvelle tacitement pour la même durée. Le locataire peut résilier à tout moment avec un préavis d'un mois. Le bailleur doit donner congé 3 mois avant l'échéance.")

  titre('ARTICLE 5 — CONDITIONS FINANCIÈRES')
  ligne('Loyer mensuel HC :', `${bail.loyer_hc} €`)
  ligne('Charges mensuelles :', bail.charges ? `${bail.charges} € (${bail.type_charges})` : null)
  ligne('Total CC :', `${(parseFloat(bail.loyer_hc) + parseFloat(bail.charges || 0)).toFixed(2)} €`)
  ligne('Dépôt de garantie :', bail.depot_garantie ? `${bail.depot_garantie} € (2 mois max pour meublé)` : null)
  ligne('Modalité de paiement :', bail.modalite_paiement)
  ligne("Date d'exigibilité :", `Le ${bail.date_exigibilite} de chaque mois`)
  ligne('Révision annuelle IRL :', bail.revision_irl ? "Oui — selon l'IRL (INSEE)" : 'Non'); y.v += 5

  titre('ARTICLE 6 — INVENTAIRE ET ÉTAT DU MOBILIER')
  texte("Le logement est loué meublé conformément au décret n°2015-981 du 31 juillet 2015 fixant la liste des éléments de mobilier d'un logement meublé. Un inventaire détaillé du mobilier et des équipements est annexé au présent contrat et signé contradictoirement.")

  titre('ARTICLE 7 — OBLIGATIONS DU BAILLEUR')
  texte("Le bailleur s'engage à : délivrer le logement meublé en bon état d'usage, assurer la jouissance paisible des lieux, entretenir les locaux, réaliser les réparations autres que locatives, garantir contre les vices ou défauts cachés, maintenir le mobilier en bon état de fonctionnement.")

  titre('ARTICLE 8 — OBLIGATIONS DU LOCATAIRE')
  texte("Le locataire s'engage à : payer le loyer et les charges aux termes convenus, user paisiblement des locaux et du mobilier, répondre des dégradations survenues, souscrire une assurance multirisque habitation, restituer le logement avec le mobilier en bon état.")

  titre('ARTICLE 9 — DÉPÔT DE GARANTIE')
  texte(`Un dépôt de garantie de ${bail.depot_garantie || 0} € est versé à la signature. Pour un bail meublé, ce dépôt ne peut excéder 2 mois de loyer hors charges. Il sera restitué dans un délai d'un mois si l'état des lieux de sortie est conforme, ou de deux mois dans le cas contraire.`)

  titre('ARTICLE 10 — RÉSILIATION')
  texte("Le locataire peut résilier le bail à tout moment avec un préavis d'un mois. Le bailleur peut donner congé 3 mois avant l'échéance pour reprise, vente ou motif légitime et sérieux.")

  if (bail.clauses?.trim()) { titre('ARTICLE 11 — CLAUSES PARTICULIÈRES'); texte(bail.clauses) }

  signatures(doc, bail, signatureLocataire, h)
  await ajouterQRFooter(doc, undefined, { x: margin, y: y.v - 4 })
  return `Bail_Meuble_${sanitize(bail.locataire_nom || bail.locataire_denomination)}_${sanitize(bail.bailleur_nom || bail.bailleur_denomination)}_${bail.date_debut || 'date'}.pdf`
}

// ===================== COMMERCIAL =====================
export async function construireCommercial(doc, bail, signatureLocataire) {
  const h = helpers(doc, [234, 88, 12])
  const { pageW, margin, y, titre, ligne, texte } = h
  doc.setFillColor(234, 88, 12); doc.rect(0, 0, 210, 20, 'F')
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
  doc.text('BAIL COMMERCIAL (3-6-9)', pageW / 2, 10, { align: 'center' })
  doc.setFontSize(9); doc.text('Loi du 30 septembre 1953 — Statut des baux commerciaux', pageW / 2, 16, { align: 'center' })
  y.v = 28; doc.setTextColor(0, 0, 0)

  titre('ARTICLE 1 — LE BAILLEUR'); identiteBailleur(bail, h); y.v += 5

  titre('ARTICLE 2 — LE PRENEUR (LOCATAIRE)')
  if (bail.locataire_type === 'morale') {
    ligne('Société :', `${bail.locataire_denomination} (${bail.locataire_forme_juridique})`)
    ligne('SIREN :', bail.locataire_siren)
    ligne('Adresse du siège :', bail.locataire_adresse)
    ligne('Représentée par :', bail.locataire_representant_type === 'morale'
      ? `${bail.locataire_representant_denomination}, elle-même représentée par ${bail.locataire_representant_personne}`
      : bail.locataire_representant)
  } else {
    ligne('Nom et prénom :', `${bail.locataire_prenom} ${bail.locataire_nom}`)
    ligne('Adresse :', bail.locataire_adresse)
  }
  ligne('Email :', bail.locataire_email); ligne('Téléphone :', bail.locataire_telephone); y.v += 5

  titre('ARTICLE 3 — DÉSIGNATION DES LOCAUX')
  ligne('Adresse :', bail.Biens?.adresse)
  ligne('Surface :', bail.surface_habitable ? `${bail.surface_habitable} m²` : null)
  ligne('Étage / Bâtiment :', bail.etage)
  ligne('Numéro de lot :', bail.numero_lot)
  ligne('Destination des locaux :', bail.destination_locaux); y.v += 5

  titre('ARTICLE 4 — DURÉE DU BAIL')
  ligne('Date de début :', bail.date_debut ? new Date(bail.date_debut).toLocaleDateString('fr-FR') : null)
  ligne('Date de fin :', bail.date_fin ? new Date(bail.date_fin).toLocaleDateString('fr-FR') : `Fin de période 9 ans`)
  texte("Le présent bail est conclu pour une durée de 9 ans conformément au statut des baux commerciaux (loi du 30 septembre 1953). Le preneur a la faculté de résilier à l'expiration de chaque période triennale (3 ans, 6 ans) moyennant un préavis de 6 mois par acte d'huissier.")

  titre('ARTICLE 5 — LOYER ET CONDITIONS FINANCIÈRES')
  const loyerHT = parseFloat(bail.loyer_hc) || 0
  const loyerTTC = bail.tva_applicable ? loyerHT * 1.2 : loyerHT
  ligne('Loyer annuel HT :', `${(loyerHT * 12).toFixed(2)} €`)
  ligne('Loyer mensuel HT :', `${loyerHT} €`)
  if (bail.tva_applicable) ligne('TVA (20%) :', `${(loyerHT * 0.2).toFixed(2)} € / mois`)
  if (bail.tva_applicable) ligne('Loyer mensuel TTC :', `${loyerTTC.toFixed(2)} €`)
  ligne('Charges :', bail.charges ? `${bail.charges} € / mois` : null)
  ligne('Dépôt de garantie :', bail.depot_garantie ? `${bail.depot_garantie} €` : null)
  ligne('Modalité de paiement :', bail.modalite_paiement)
  ligne("Date d'exigibilité :", `Le ${bail.date_exigibilite} de chaque mois`)
  ligne('Indexation :', bail.indexation ? `Indice ${bail.indexation} (INSEE)` : null); y.v += 5

  titre('ARTICLE 6 — RÉVISION DU LOYER')
  texte(`Le loyer sera révisé chaque année à la date anniversaire du bail en fonction de la variation de l'indice ${bail.indexation || 'ILC'} (${bail.indexation === 'ILAT' ? "Indice des Loyers des Activités Tertiaires" : "Indice des Loyers Commerciaux"}) publié par l'INSEE.`)

  titre('ARTICLE 7 — DESTINATION DES LOCAUX')
  texte(`Les locaux sont loués exclusivement pour l'exercice de l'activité suivante : ${bail.destination_locaux || '(à préciser)'}. Toute modification de destination devra faire l'objet d'une autorisation écrite préalable du bailleur.`)

  titre('ARTICLE 8 — OBLIGATIONS DU BAILLEUR')
  texte("Le bailleur s'engage à délivrer les locaux en bon état, assurer la jouissance paisible, effectuer les grosses réparations (article 606 du Code civil), et maintenir les locaux conformes à leur destination.")

  titre('ARTICLE 9 — OBLIGATIONS DU PRENEUR')
  texte("Le preneur s'engage à : payer le loyer aux termes convenus, exploiter les locaux conformément à la destination autorisée, entretenir les locaux et effectuer les réparations locatives, souscrire les assurances nécessaires, ne pas céder le bail sans accord du bailleur sauf dans le cadre d'une cession de fonds de commerce.")

  titre('ARTICLE 10 — DÉPÔT DE GARANTIE')
  texte(`Un dépôt de garantie de ${bail.depot_garantie || 0} € est versé à la signature. Il sera restitué dans les 2 mois suivant la restitution des clés, déduction faite des sommes dues par le preneur.`)

  if (bail.clauses?.trim()) { titre('ARTICLE 11 — CLAUSES PARTICULIÈRES'); texte(bail.clauses) }

  signatures(doc, bail, signatureLocataire, h, 'Le Preneur')
  await ajouterQRFooter(doc, undefined, { x: margin, y: y.v - 4 })
  return `Bail_Commercial_${sanitize(bail.locataire_nom || bail.locataire_denomination)}_${sanitize(bail.bailleur_nom || bail.bailleur_denomination)}_${bail.date_debut || 'date'}.pdf`
}

// ===================== PARKING / GARAGE =====================
export async function construireParking(doc, bail, signatureLocataire) {
  const h = helpers(doc, [202, 138, 4])
  const { pageW, margin, y, titre, ligne, texte } = h
  doc.setFillColor(202, 138, 4); doc.rect(0, 0, 210, 20, 'F')
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
  doc.text('CONTRAT DE LOCATION — PARKING / GARAGE', pageW / 2, 10, { align: 'center' })
  doc.setFontSize(9); doc.text('Bail libre — Non soumis à la loi du 6 juillet 1989', pageW / 2, 16, { align: 'center' })
  y.v = 28; doc.setTextColor(0, 0, 0)

  titre('ARTICLE 1 — LE BAILLEUR')
  ligne('Nom et prénom :', `${bail.bailleur_prenom} ${bail.bailleur_nom}`)
  ligne('Adresse :', bail.bailleur_adresse); y.v += 4

  titre('ARTICLE 2 — LE LOCATAIRE')
  ligne('Nom et prénom :', `${bail.locataire_prenom} ${bail.locataire_nom}`)
  ligne('Email :', bail.locataire_email); ligne('Téléphone :', bail.locataire_telephone); y.v += 4

  titre("ARTICLE 3 — DÉSIGNATION DE L'EMPLACEMENT")
  ligne('Adresse :', bail.Biens?.adresse)
  ligne('Numéro de place :', bail.numero_lot)
  ligne('Description :', bail.equipements); y.v += 4

  titre('ARTICLE 4 — DURÉE ET PRÉAVIS')
  ligne('Date de début :', bail.date_debut ? new Date(bail.date_debut).toLocaleDateString('fr-FR') : null)
  ligne('Date de fin :', bail.date_fin ? new Date(bail.date_fin).toLocaleDateString('fr-FR') : 'Durée indéterminée')
  texte(`Le présent bail est conclu à durée indéterminée. Chaque partie peut y mettre fin avec un préavis de ${bail.preavis_mois || 1} mois.`)

  titre('ARTICLE 5 — LOYER')
  ligne('Loyer mensuel :', `${bail.loyer_hc} €`)
  ligne('Charges :', bail.charges ? `${bail.charges} €` : null)
  ligne('Dépôt de garantie :', bail.depot_garantie ? `${bail.depot_garantie} €` : null)
  ligne('Modalité :', bail.modalite_paiement)
  ligne('Exigibilité :', `Le ${bail.date_exigibilite} de chaque mois`)

  if (bail.clauses?.trim()) { titre('ARTICLE 6 — CLAUSES PARTICULIÈRES'); texte(bail.clauses) }

  signatures(doc, bail, signatureLocataire, h)
  await ajouterQRFooter(doc, undefined, { x: margin, y: y.v - 4 })
  return `Bail_Parking_${sanitize(bail.locataire_nom)}_${bail.date_debut || 'date'}.pdf`
}

// ===================== ÉTUDIANT =====================
export async function construireEtudiant(doc, bail, signatureLocataire) {
  const h = helpers(doc, [219, 39, 119])
  const { pageW, margin, y, titre, ligne, texte } = h
  doc.setFillColor(219, 39, 119); doc.rect(0, 0, 210, 20, 'F')
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
  doc.text('BAIL ÉTUDIANT MEUBLÉ', pageW / 2, 10, { align: 'center' })
  doc.setFontSize(9); doc.text('Loi n°89-462 du 6 juillet 1989 — Article 25-7 — Durée 9 mois', pageW / 2, 16, { align: 'center' })
  y.v = 28; doc.setTextColor(0, 0, 0)

  titre('ARTICLE 1 — LE BAILLEUR'); identiteBailleur(bail, h); y.v += 4

  titre("ARTICLE 2 — L'ÉTUDIANT LOCATAIRE")
  ligne('Nom et prénom :', `${bail.locataire_prenom} ${bail.locataire_nom}`)
  ligne('Date de naissance :', bail.locataire_naissance ? new Date(bail.locataire_naissance).toLocaleDateString('fr-FR') : null)
  ligne('Établissement :', bail.locataire_profession)
  ligne('Email :', bail.locataire_email); ligne('Téléphone :', bail.locataire_telephone); y.v += 4

  titre('ARTICLE 3 — DÉSIGNATION DU LOGEMENT MEUBLÉ')
  ligne('Adresse :', bail.Biens?.adresse)
  ligne('Surface :', bail.surface_habitable ? `${bail.surface_habitable} m²` : null)
  ligne('Équipements :', bail.equipements)
  ligne('Classe DPE :', bail.classe_dpe); y.v += 4

  titre('ARTICLE 4 — DURÉE DU BAIL ÉTUDIANT')
  ligne('Date de début :', bail.date_debut ? new Date(bail.date_debut).toLocaleDateString('fr-FR') : null)
  ligne('Date de fin :', bail.date_fin ? new Date(bail.date_fin).toLocaleDateString('fr-FR') : null)
  texte("Le présent bail est conclu pour une durée de 9 mois conformément à l'article 25-7-III de la loi du 6 juillet 1989. Il ne se renouvelle pas tacitement. À l'issue des 9 mois, le locataire doit quitter les lieux sans qu'il soit nécessaire de donner congé.")

  titre('ARTICLE 5 — CONDITIONS FINANCIÈRES')
  ligne('Loyer mensuel HC :', `${bail.loyer_hc} €`)
  ligne('Charges :', bail.charges ? `${bail.charges} €` : null)
  ligne('Total CC :', `${(parseFloat(bail.loyer_hc) + parseFloat(bail.charges || 0)).toFixed(2)} €`)
  ligne('Dépôt de garantie :', bail.depot_garantie ? `${bail.depot_garantie} € (2 mois max)` : null)
  ligne("Exigibilité :", `Le ${bail.date_exigibilite} du mois`)

  if (bail.clauses?.trim()) { titre('ARTICLE 6 — CLAUSES PARTICULIÈRES'); texte(bail.clauses) }

  signatures(doc, bail, signatureLocataire, h, "L'Étudiant Locataire")
  await ajouterQRFooter(doc, undefined, { x: margin, y: y.v - 4 })
  return `Bail_Etudiant_${sanitize(bail.locataire_nom)}_${bail.date_debut || 'date'}.pdf`
}

// ===================== MOBILITÉ =====================
export async function construireMobilite(doc, bail, signatureLocataire) {
  const h = helpers(doc, [2, 132, 199])
  const { pageW, margin, y, titre, ligne, texte } = h
  doc.setFillColor(2, 132, 199); doc.rect(0, 0, 210, 20, 'F')
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
  doc.text('BAIL MOBILITÉ MEUBLÉ', pageW / 2, 10, { align: 'center' })
  doc.setFontSize(9); doc.text('Loi ELAN du 23 novembre 2018 — Article 25-12 à 25-18 — Durée 1 à 10 mois', pageW / 2, 16, { align: 'center' })
  y.v = 28; doc.setTextColor(0, 0, 0)

  titre('ARTICLE 1 — LE BAILLEUR'); identiteBailleur(bail, h); y.v += 4

  titre('ARTICLE 2 — LE LOCATAIRE')
  ligne('Nom et prénom :', `${bail.locataire_prenom} ${bail.locataire_nom}`)
  ligne('Email :', bail.locataire_email)
  ligne('Motif de mobilité :', bail.locataire_profession); y.v += 4

  titre('ARTICLE 3 — LOGEMENT MEUBLÉ')
  ligne('Adresse :', bail.Biens?.adresse)
  ligne('Surface :', bail.surface_habitable ? `${bail.surface_habitable} m²` : null)
  ligne('Équipements :', bail.equipements)
  ligne('Classe DPE :', bail.classe_dpe); y.v += 4

  const dureeMois = bail.date_debut && bail.date_fin
    ? Math.round((new Date(bail.date_fin) - new Date(bail.date_debut)) / (1000 * 60 * 60 * 24 * 30.44))
    : null
  titre('ARTICLE 4 — DURÉE DU BAIL MOBILITÉ')
  ligne('Date de début :', bail.date_debut ? new Date(bail.date_debut).toLocaleDateString('fr-FR') : null)
  ligne('Durée :', dureeMois ? `${dureeMois} mois` : null)
  ligne('Date de fin :', bail.date_fin ? new Date(bail.date_fin).toLocaleDateString('fr-FR') : null)
  texte(`Le présent bail mobilité est conclu pour une durée de ${dureeMois || ''} mois conformément aux articles 25-12 à 25-18 de la loi du 6 juillet 1989 issus de la loi ELAN. Ce bail ne peut être renouvelé ni reconduit tacitement. Il ne peut être conclu que pour un motif de mobilité justifié.`)

  titre('ARTICLE 5 — CONDITIONS FINANCIÈRES')
  ligne('Loyer mensuel HC :', `${bail.loyer_hc} €`)
  ligne('Charges :', bail.charges ? `${bail.charges} €` : null)
  ligne('Total CC :', `${(parseFloat(bail.loyer_hc) + parseFloat(bail.charges || 0)).toFixed(2)} €`)
  texte('IMPORTANT : Aucun dépôt de garantie ne peut être exigé pour un bail mobilité.')

  if (bail.clauses?.trim()) { titre('ARTICLE 6 — CLAUSES PARTICULIÈRES'); texte(bail.clauses) }

  signatures(doc, bail, signatureLocataire, h)
  await ajouterQRFooter(doc, undefined, { x: margin, y: y.v - 4 })
  return `Bail_Mobilite_${sanitize(bail.locataire_nom)}_${bail.date_debut || 'date'}.pdf`
}

// ===================== AUTRE =====================
export async function construireAutre(doc, bail, signatureLocataire) {
  const h = helpers(doc, [75, 85, 99])
  const { pageW, margin, y, titre, ligne, texte } = h
  doc.setFillColor(75, 85, 99); doc.rect(0, 0, 210, 20, 'F')
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
  doc.text('CONTRAT DE LOCATION', pageW / 2, 10, { align: 'center' })
  doc.setFontSize(9); doc.text(`${bail.equipements ? 'Bail libre' : 'Bail libre'} — Document généré par Ma Gestion-Locative`, pageW / 2, 16, { align: 'center' })
  y.v = 28; doc.setTextColor(0, 0, 0)

  titre('ARTICLE 1 — LE BAILLEUR'); identiteBailleur(bail, h); y.v += 4

  titre('ARTICLE 2 — LE LOCATAIRE')
  if (bail.locataire_type === 'morale') {
    ligne('Société :', `${bail.locataire_denomination} (${bail.locataire_forme_juridique})`)
    ligne('SIREN :', bail.locataire_siren)
    ligne('Adresse du siège :', bail.locataire_adresse)
    ligne('Représentée par :', bail.locataire_representant_type === 'morale'
      ? `${bail.locataire_representant_denomination}, elle-même représentée par ${bail.locataire_representant_personne}`
      : bail.locataire_representant)
    ligne('Email :', bail.locataire_email); ligne('Téléphone :', bail.locataire_telephone)
  } else {
    ligne('Nom et prénom :', `${bail.locataire_prenom} ${bail.locataire_nom}`)
    ligne('Email :', bail.locataire_email); ligne('Téléphone :', bail.locataire_telephone)
    ligne('Adresse :', bail.locataire_adresse)
  }
  y.v += 4

  titre('ARTICLE 3 — OBJET DU CONTRAT')
  ligne('Bien :', bail.Biens?.adresse)
  ligne('Description :', bail.equipements); y.v += 4

  titre('ARTICLE 4 — DURÉE')
  ligne('Date de début :', bail.date_debut ? new Date(bail.date_debut).toLocaleDateString('fr-FR') : null)
  ligne('Date de fin :', bail.date_fin ? new Date(bail.date_fin).toLocaleDateString('fr-FR') : 'Indéterminée')
  texte(`Le présent contrat peut être résilié par l'une ou l'autre des parties avec un préavis de ${bail.preavis_mois || 1} mois.`)

  titre('ARTICLE 5 — CONDITIONS FINANCIÈRES')
  ligne('Loyer mensuel :', `${bail.loyer_hc} €`)
  ligne('Charges :', bail.charges ? `${bail.charges} €` : null)
  ligne('Dépôt de garantie :', bail.depot_garantie ? `${bail.depot_garantie} €` : null)
  ligne('Modalité :', bail.modalite_paiement)
  ligne('Exigibilité :', `Le ${bail.date_exigibilite} du mois`)

  if (bail.clauses?.trim()) { titre('ARTICLE 6 — CLAUSES PARTICULIÈRES'); texte(bail.clauses) }

  signatures(doc, bail, signatureLocataire, h)
  await ajouterQRFooter(doc, undefined, { x: margin, y: y.v - 4 })
  return `Bail_Autre_${sanitize(bail.locataire_nom || bail.locataire_denomination)}_${bail.date_debut || 'date'}.pdf`
}