'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import jsPDF from 'jspdf';
import Nav from '../../components/nav'

export default function NouveauBail() {
  const [user, setUser] = useState(null);
  const [biens, setBiens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ecran, setEcran] = useState('choix');
  const [etape, setEtape] = useState(1);
  const [signatureBailleur, setSignatureBailleur] = useState(null);
  const [signatureLocataire, setSignatureLocataire] = useState(null);
  const [canvasRef, setCanvasRef] = useState(null);
  const [dessin, setDessin] = useState(false);
  const [bailId, setBailId] = useState(null);
  const [bienIdUpload, setBienIdUpload] = useState('');

  const [bail, setBail] = useState({
    bailleur_prenom: '', bailleur_nom: '', bailleur_adresse: '',
    bailleur_naissance: '', bailleur_lieu_naissance: '', bailleur_nationalite: 'Française',
    locataire_prenom: '', locataire_nom: '', locataire_email: '',
    locataire_telephone: '', locataire_naissance: '', locataire_adresse: '',
    locataire_nationalite: 'Française', locataire_profession: '',
    bien_id: '', type_bail: 'Non meublé', loyer_hc: '',
    charges: '', type_charges: 'Forfaitaires', depot_garantie: '',
    surface_habitable: '', nombre_pieces: '', etage: '',
    equipements: '', classe_dpe: 'D', numero_lot: '',
    modalite_paiement: 'Virement bancaire', date_exigibilite: '1', revision_irl: true,
    date_debut: '', date_fin: '', clauses: '',
    relance_auto_active: false,
relance_auto_jours: 5,
  });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        setUser(data.user);
        chargerBiens(data.user.id);
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (id) {
          const { data: bailData } = await supabase.from('Baux').select('*').eq('id', id).single();
          if (bailData) {
            setBail({
              bailleur_prenom: bailData.bailleur_prenom || '',
              bailleur_nom: bailData.bailleur_nom || '',
              bailleur_adresse: bailData.bailleur_adresse || '',
              bailleur_naissance: bailData.bailleur_naissance || '',
              bailleur_lieu_naissance: bailData.bailleur_lieu_naissance || '',
              bailleur_nationalite: bailData.bailleur_nationalite || 'Française',
              locataire_prenom: bailData.locataire_prenom || '',
              locataire_nom: bailData.locataire_nom || '',
              locataire_email: bailData.locataire_email || '',
              locataire_telephone: bailData.locataire_telephone || '',
              locataire_naissance: bailData.locataire_naissance || '',
              locataire_adresse: bailData.locataire_adresse || '',
              locataire_nationalite: bailData.locataire_nationalite || 'Française',
              locataire_profession: bailData.locataire_profession || '',
              bien_id: bailData.bien_id?.toString() || '',
              type_bail: bailData.type_bail || 'Non meublé',
              loyer_hc: bailData.loyer_hc?.toString() || '',
              charges: bailData.charges?.toString() || '',
              type_charges: bailData.type_charges || 'Forfaitaires',
              depot_garantie: bailData.depot_garantie?.toString() || '',
              surface_habitable: bailData.surface_habitable?.toString() || '',
              nombre_pieces: bailData.nombre_pieces?.toString() || '',
              etage: bailData.etage || '',
              equipements: bailData.equipements || '',
              classe_dpe: bailData.classe_dpe || 'D',
              numero_lot: bailData.numero_lot || '',
              modalite_paiement: bailData.modalite_paiement || 'Virement bancaire',
              date_exigibilite: bailData.date_exigibilite?.toString() || '1',
              revision_irl: bailData.revision_irl ?? true,
              date_debut: bailData.date_debut || '',
              date_fin: bailData.date_fin || '',
              clauses: bailData.clauses || '',
            });
            setBailId(id);
            setEcran('signature');
          }
        }
      } else { window.location.href = '/auth'; }
    });
  }, []);

  async function chargerBiens(userId) {
    const { data } = await supabase.from('Biens').select('*').eq('user_id', userId);
    setBiens(data || []);
  }

  function genererPDFBail() {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const bienSel = biens.find(b => b.id === parseInt(bail.bien_id));
    const pageW = 210, margin = 20, contenuW = pageW - margin * 2;
    let y = 20;
    const checkPage = () => { if (y > 270) { doc.addPage(); y = 20; } };
    const titre = (texte) => {
      checkPage();
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
      doc.text(texte, margin, y); y += 2;
      doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.4);
      doc.line(margin, y, pageW - margin, y); y += 6; doc.setTextColor(0, 0, 0);
    };
    const ligne = (label, valeur) => {
      checkPage();
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text(label, margin, y);
      doc.setFont('helvetica', 'normal');
      const val = valeur?.toString() || '—';
      const lignes = doc.splitTextToSize(val, contenuW - 55);
      doc.text(lignes, margin + 55, y);
      y += Math.max(5, lignes.length * 4.5);
    };
    const texte = (t) => {
      checkPage();
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
      const lignes = doc.splitTextToSize(t, contenuW);
      lignes.forEach(l => { checkPage(); doc.text(l, margin, y); y += 4.5; });
      doc.setTextColor(0, 0, 0); y += 2;
    };
    const saut = (n = 5) => { y += n; };

    doc.setFillColor(37, 99, 235); doc.rect(0, 0, 210, 20, 'F');
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('CONTRAT DE BAIL', pageW / 2, 10, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`${bail.type_bail.toUpperCase()} — Loi n°89-462 du 6 juillet 1989 modifiée par la loi ALUR du 24 mars 2014`, pageW / 2, 16, { align: 'center' });
    y = 28; doc.setTextColor(0, 0, 0);

    titre('ARTICLE 1 — LE BAILLEUR');
    ligne('Nom et prénom :', `${bail.bailleur_prenom} ${bail.bailleur_nom}`);
    ligne('Date de naissance :', bail.bailleur_naissance ? new Date(bail.bailleur_naissance).toLocaleDateString('fr-FR') : '');
    ligne('Lieu de naissance :', bail.bailleur_lieu_naissance);
    ligne('Nationalité :', bail.bailleur_nationalite);
    ligne('Adresse :', bail.bailleur_adresse); saut();

    titre('ARTICLE 2 — LE LOCATAIRE');
    ligne('Nom et prénom :', `${bail.locataire_prenom} ${bail.locataire_nom}`);
    ligne('Date de naissance :', bail.locataire_naissance ? new Date(bail.locataire_naissance).toLocaleDateString('fr-FR') : '');
    ligne('Nationalité :', bail.locataire_nationalite);
    ligne('Profession :', bail.locataire_profession);
    ligne('Adresse actuelle :', bail.locataire_adresse);
    ligne('Email :', bail.locataire_email);
    ligne('Téléphone :', bail.locataire_telephone); saut();

    titre('ARTICLE 3 — DÉSIGNATION DU BIEN LOUÉ');
    ligne('Adresse :', bienSel?.adresse || '');
    ligne('Type de bien :', bienSel?.type || '');
    ligne('Surface habitable :', bail.surface_habitable ? `${bail.surface_habitable} m²` : '');
    ligne('Nombre de pièces :', bail.nombre_pieces);
    if (bail.etage) ligne('Étage / Bâtiment :', bail.etage);
    if (bail.numero_lot) ligne('Numéro de lot :', bail.numero_lot);
    ligne('Classe énergétique (DPE) :', bail.classe_dpe);
    if (bail.equipements) ligne('Équipements inclus :', bail.equipements); saut();

    titre('ARTICLE 4 — DURÉE DU BAIL');
    const duree = bail.type_bail === 'Meublé' ? '1 an' : bail.type_bail === 'Commercial (3-6-9)' ? '9 ans' : '3 ans';
    ligne('Date de début :', bail.date_debut ? new Date(bail.date_debut).toLocaleDateString('fr-FR') : '');
    ligne('Date de fin :', bail.date_fin ? new Date(bail.date_fin).toLocaleDateString('fr-FR') : `Reconduction tacite (${duree})`);
    texte(`Le présent bail est conclu pour une durée de ${duree}, conformément à la loi du 6 juillet 1989. À l'expiration de ce délai, le bail sera reconduit tacitement pour la même durée, sauf congé donné dans les délais légaux (6 mois pour le bailleur, 3 mois pour le locataire, 1 mois en zone tendue).`);

    titre('ARTICLE 5 — CONDITIONS FINANCIÈRES');
    ligne('Loyer mensuel hors charges :', `${bail.loyer_hc} €`);
    ligne('Charges mensuelles :', `${bail.charges || 0} €`);
    ligne('Type de charges :', bail.type_charges);
    ligne('Total mensuel charges comprises :', `${(parseFloat(bail.loyer_hc) || 0) + (parseFloat(bail.charges) || 0)} €`);
    ligne('Dépôt de garantie :', `${bail.depot_garantie || 0} €`);
    ligne('Modalité de paiement :', bail.modalite_paiement);
    ligne("Date d'exigibilité :", `Le ${bail.date_exigibilite} de chaque mois`);
    ligne('Révision annuelle IRL :', bail.revision_irl ? "Oui — selon l'Indice de Référence des Loyers (INSEE)" : 'Non');
    saut(2);
    texte(`Le loyer est payable mensuellement et d'avance, le ${bail.date_exigibilite} de chaque mois par ${bail.modalite_paiement.toLowerCase()}. Les charges sont de type ${bail.type_charges.toLowerCase()}.`);
    if (bail.revision_irl) texte("Le loyer sera révisé chaque année à la date anniversaire du bail sur la base de la variation de l'Indice de Référence des Loyers (IRL) publié par l'INSEE, conformément à l'article 17-1 de la loi du 6 juillet 1989.");

    titre('ARTICLE 6 — OBLIGATIONS DU BAILLEUR');
    texte("Le bailleur s'engage à : délivrer le logement en bon état d'usage et de réparation, assurer la jouissance paisible des lieux, entretenir les locaux en état de servir à l'usage prévu, réaliser les réparations autres que locatives, garantir contre les vices ou défauts cachés.");

    titre('ARTICLE 7 — OBLIGATIONS DU LOCATAIRE');
    texte("Le locataire s'engage à : payer le loyer et les charges aux termes convenus, user paisiblement des locaux, répondre des dégradations survenues pendant la durée du contrat, prendre à sa charge l'entretien courant et les menues réparations, souscrire une assurance multirisque habitation et en justifier chaque année, ne pas transformer les lieux sans accord écrit du bailleur, ne pas sous-louer sans autorisation écrite.");

    titre('ARTICLE 8 — DÉPÔT DE GARANTIE');
    texte(`Un dépôt de garantie de ${bail.depot_garantie || 0} € est versé à la signature du présent bail. Il sera restitué dans un délai d'un mois à compter de la remise des clés si aucune dégradation n'est constatée, ou de deux mois en cas de dégradations imputables au locataire, déduction faite des sommes dues.`);

    if (bail.clauses && bail.clauses.trim()) {
      titre('ARTICLE 9 — CLAUSES PARTICULIÈRES');
      texte(bail.clauses);
    }

    if (y > 210) { doc.addPage(); y = 20; }
    saut(5); titre('SIGNATURES');
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Fait en deux exemplaires originaux, le ${new Date().toLocaleDateString('fr-FR')}`, margin, y); y += 12;
    doc.setFont('helvetica', 'bold');
    doc.text('Le Bailleur', margin, y); doc.text('Le Locataire', pageW / 2 + 5, y); y += 4;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(`${bail.bailleur_prenom} ${bail.bailleur_nom}`, margin, y);
    doc.text(`${bail.locataire_prenom} ${bail.locataire_nom}`, pageW / 2 + 5, y); y += 2;
    doc.text('(Précédé de la mention "Lu et approuvé")', margin, y);
    doc.text('(Précédé de la mention "Lu et approuvé")', pageW / 2 + 5, y); y += 4;
    doc.setDrawColor(180, 180, 180);
    doc.rect(margin, y, 80, 38); doc.rect(pageW / 2 + 5, y, 80, 38);
    if (signatureBailleur) doc.addImage(signatureBailleur, 'PNG', margin + 1, y + 1, 78, 36);
    if (signatureLocataire) doc.addImage(signatureLocataire, 'PNG', pageW / 2 + 6, y + 1, 78, 36);
    y += 44; doc.setFontSize(7); doc.setTextColor(150, 150, 150);
    doc.text('Document généré par GestionLocative — Conforme loi n°89-462 du 6 juillet 1989 et loi ALUR du 24 mars 2014', pageW / 2, y, { align: 'center' });
    doc.save(`Bail_${bail.locataire_nom}_${bail.bailleur_nom}_${bail.date_debut || 'date'}.pdf`);
  }

  async function sauvegarderBail(statut = 'actif', bailPdfUrl = null) {
  setLoading(true);
  const payload = {
    bien_id: parseInt(bail.bien_id) || null,
    type_bail: bail.type_bail,
    loyer_hc: parseFloat(bail.loyer_hc) || null,
    charges: parseFloat(bail.charges) || 0,
    type_charges: bail.type_charges,
    depot_garantie: parseFloat(bail.depot_garantie) || 0,
    date_debut: bail.date_debut || null,
    date_fin: bail.date_fin || null,
    locataire_prenom: bail.locataire_prenom, locataire_nom: bail.locataire_nom,
    locataire_email: bail.locataire_email, locataire_telephone: bail.locataire_telephone,
    locataire_naissance: bail.locataire_naissance || null, locataire_adresse: bail.locataire_adresse,
    locataire_nationalite: bail.locataire_nationalite, locataire_profession: bail.locataire_profession,
    bailleur_prenom: bail.bailleur_prenom, bailleur_nom: bail.bailleur_nom,
    bailleur_adresse: bail.bailleur_adresse, bailleur_naissance: bail.bailleur_naissance || null,
    bailleur_lieu_naissance: bail.bailleur_lieu_naissance, bailleur_nationalite: bail.bailleur_nationalite,
    surface_habitable: parseFloat(bail.surface_habitable) || null,
    nombre_pieces: parseInt(bail.nombre_pieces) || null,
    etage: bail.etage, equipements: bail.equipements, classe_dpe: bail.classe_dpe,
    numero_lot: bail.numero_lot, modalite_paiement: bail.modalite_paiement,
    date_exigibilite: parseInt(bail.date_exigibilite) || 1,
    revision_irl: bail.revision_irl, clauses: bail.clauses,
    signature_bailleur: signatureBailleur, signature_locataire: signatureLocataire,
    statut,
    relance_auto_active: bail.relance_auto_active || false,
relance_auto_jours: bail.relance_auto_jours || 5,
    ...(bailPdfUrl && { bail_pdf_url: bailPdfUrl }),
  };
  let error;
  if (bailId) {
    ({ error } = await supabase.from('Baux').update(payload).eq('id', bailId));
  } else {
    ({ error } = await supabase.from('Baux').insert([{ ...payload, user_id: user.id }]));
  }
  setLoading(false);
  if (!error) { window.location.href = '/baux'; }
  else { alert('Erreur : ' + error.message); }
}

  async function genererPDFBail() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const bienSel = biens.find(b => b.id === parseInt(bail.bien_id));
  const pageW = 210, margin = 20, contenuW = pageW - margin * 2;
  let y = 20;
  const checkPage = () => { if (y > 270) { doc.addPage(); y = 20; } };
  const titre = (texte) => {
    checkPage();
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
    doc.text(texte, margin, y); y += 2;
    doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.4);
    doc.line(margin, y, pageW - margin, y); y += 6; doc.setTextColor(0, 0, 0);
  };
  const ligne = (label, valeur) => {
    checkPage();
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    const val = valeur?.toString() || '—';
    const lignes = doc.splitTextToSize(val, contenuW - 55);
    doc.text(lignes, margin + 55, y);
    y += Math.max(5, lignes.length * 4.5);
  };
  const texte = (t) => {
    checkPage();
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
    const lignes = doc.splitTextToSize(t, contenuW);
    lignes.forEach(l => { checkPage(); doc.text(l, margin, y); y += 4.5; });
    doc.setTextColor(0, 0, 0); y += 2;
  };
  const saut = (n = 5) => { y += n; };

  doc.setFillColor(37, 99, 235); doc.rect(0, 0, 210, 20, 'F');
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('CONTRAT DE BAIL', pageW / 2, 10, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`${bail.type_bail.toUpperCase()} — Loi n°89-462 du 6 juillet 1989 modifiée par la loi ALUR du 24 mars 2014`, pageW / 2, 16, { align: 'center' });
  y = 28; doc.setTextColor(0, 0, 0);

  titre('ARTICLE 1 — LE BAILLEUR');
  ligne('Nom et prénom :', `${bail.bailleur_prenom} ${bail.bailleur_nom}`);
  ligne('Date de naissance :', bail.bailleur_naissance ? new Date(bail.bailleur_naissance).toLocaleDateString('fr-FR') : '');
  ligne('Lieu de naissance :', bail.bailleur_lieu_naissance);
  ligne('Nationalité :', bail.bailleur_nationalite);
  ligne('Adresse :', bail.bailleur_adresse); saut();

  titre('ARTICLE 2 — LE LOCATAIRE');
  ligne('Nom et prénom :', `${bail.locataire_prenom} ${bail.locataire_nom}`);
  ligne('Date de naissance :', bail.locataire_naissance ? new Date(bail.locataire_naissance).toLocaleDateString('fr-FR') : '');
  ligne('Nationalité :', bail.locataire_nationalite);
  ligne('Profession :', bail.locataire_profession);
  ligne('Adresse actuelle :', bail.locataire_adresse);
  ligne('Email :', bail.locataire_email);
  ligne('Téléphone :', bail.locataire_telephone); saut();

  titre('ARTICLE 3 — DÉSIGNATION DU BIEN LOUÉ');
  ligne('Adresse :', bienSel?.adresse || '');
  ligne('Type de bien :', bienSel?.type || '');
  ligne('Surface habitable :', bail.surface_habitable ? `${bail.surface_habitable} m²` : '');
  ligne('Nombre de pièces :', bail.nombre_pieces);
  if (bail.etage) ligne('Étage / Bâtiment :', bail.etage);
  if (bail.numero_lot) ligne('Numéro de lot :', bail.numero_lot);
  ligne('Classe énergétique (DPE) :', bail.classe_dpe);
  if (bail.equipements) ligne('Équipements inclus :', bail.equipements); saut();

  titre('ARTICLE 4 — DURÉE DU BAIL');
  const duree = bail.type_bail === 'Meublé' ? '1 an' : bail.type_bail === 'Commercial (3-6-9)' ? '9 ans' : '3 ans';
  ligne('Date de début :', bail.date_debut ? new Date(bail.date_debut).toLocaleDateString('fr-FR') : '');
  ligne('Date de fin :', bail.date_fin ? new Date(bail.date_fin).toLocaleDateString('fr-FR') : `Reconduction tacite (${duree})`);
  texte(`Le présent bail est conclu pour une durée de ${duree}, conformément à la loi du 6 juillet 1989. À l'expiration de ce délai, le bail sera reconduit tacitement pour la même durée, sauf congé donné dans les délais légaux (6 mois pour le bailleur, 3 mois pour le locataire, 1 mois en zone tendue).`);

  titre('ARTICLE 5 — CONDITIONS FINANCIÈRES');
  ligne('Loyer mensuel hors charges :', `${bail.loyer_hc} €`);
  ligne('Charges mensuelles :', `${bail.charges || 0} €`);
  ligne('Type de charges :', bail.type_charges);
  ligne('Total mensuel charges comprises :', `${(parseFloat(bail.loyer_hc) || 0) + (parseFloat(bail.charges) || 0)} €`);
  ligne('Dépôt de garantie :', `${bail.depot_garantie || 0} €`);
  ligne('Modalité de paiement :', bail.modalite_paiement);
  ligne("Date d'exigibilité :", `Le ${bail.date_exigibilite} de chaque mois`);
  ligne('Révision annuelle IRL :', bail.revision_irl ? "Oui — selon l'Indice de Référence des Loyers (INSEE)" : 'Non');
  saut(2);
  texte(`Le loyer est payable mensuellement et d'avance, le ${bail.date_exigibilite} de chaque mois par ${bail.modalite_paiement.toLowerCase()}. Les charges sont de type ${bail.type_charges.toLowerCase()}.`);
  if (bail.revision_irl) texte("Le loyer sera révisé chaque année à la date anniversaire du bail sur la base de la variation de l'Indice de Référence des Loyers (IRL) publié par l'INSEE, conformément à l'article 17-1 de la loi du 6 juillet 1989.");

  titre('ARTICLE 6 — OBLIGATIONS DU BAILLEUR');
  texte("Le bailleur s'engage à : délivrer le logement en bon état d'usage et de réparation, assurer la jouissance paisible des lieux, entretenir les locaux en état de servir à l'usage prévu, réaliser les réparations autres que locatives, garantir contre les vices ou défauts cachés.");

  titre('ARTICLE 7 — OBLIGATIONS DU LOCATAIRE');
  texte("Le locataire s'engage à : payer le loyer et les charges aux termes convenus, user paisiblement des locaux, répondre des dégradations survenues pendant la durée du contrat, prendre à sa charge l'entretien courant et les menues réparations, souscrire une assurance multirisque habitation et en justifier chaque année, ne pas transformer les lieux sans accord écrit du bailleur, ne pas sous-louer sans autorisation écrite.");

  titre('ARTICLE 8 — DÉPÔT DE GARANTIE');
  texte(`Un dépôt de garantie de ${bail.depot_garantie || 0} € est versé à la signature du présent bail. Il sera restitué dans un délai d'un mois à compter de la remise des clés si aucune dégradation n'est constatée, ou de deux mois en cas de dégradations imputables au locataire, déduction faite des sommes dues.`);

  if (bail.clauses && bail.clauses.trim()) {
    titre('ARTICLE 9 — CLAUSES PARTICULIÈRES');
    texte(bail.clauses);
  }

  if (y > 210) { doc.addPage(); y = 20; }
  saut(5); titre('SIGNATURES');
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`Fait en deux exemplaires originaux, le ${new Date().toLocaleDateString('fr-FR')}`, margin, y); y += 12;
  doc.setFont('helvetica', 'bold');
  doc.text('Le Bailleur', margin, y); doc.text('Le Locataire', pageW / 2 + 5, y); y += 4;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(`${bail.bailleur_prenom} ${bail.bailleur_nom}`, margin, y);
  doc.text(`${bail.locataire_prenom} ${bail.locataire_nom}`, pageW / 2 + 5, y); y += 2;
  doc.text('(Précédé de la mention "Lu et approuvé")', margin, y);
  doc.text('(Précédé de la mention "Lu et approuvé")', pageW / 2 + 5, y); y += 4;
  doc.setDrawColor(180, 180, 180);
  doc.rect(margin, y, 80, 38); doc.rect(pageW / 2 + 5, y, 80, 38);
  if (signatureBailleur) doc.addImage(signatureBailleur, 'PNG', margin + 1, y + 1, 78, 36);
  if (signatureLocataire) doc.addImage(signatureLocataire, 'PNG', pageW / 2 + 6, y + 1, 78, 36);
  y += 44; doc.setFontSize(7); doc.setTextColor(150, 150, 150);
  doc.text('Document généré par GestionLocative — Conforme loi n°89-462 du 6 juillet 1989 et loi ALUR du 24 mars 2014', pageW / 2, y, { align: 'center' });

  return doc;
}

async function finaliserBailSigne() {
  setLoading(true);
  try {
    const doc = await genererPDFBail();
    const nomFichier = `Bail_${bail.locataire_nom}_${bail.bailleur_nom}_${bail.date_debut || 'date'}.pdf`;

    // Téléchargement local
    doc.save(nomFichier);

    // Upload dans Supabase Storage
    const pdfBlob = doc.output('blob');
    const cheminStorage = `baux/${user.id}/${Date.now()}_${nomFichier}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(cheminStorage, pdfBlob, { contentType: 'application/pdf' });

    if (uploadError) { alert('Erreur upload PDF : ' + uploadError.message); setLoading(false); return; }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(cheminStorage);
    const bailPdfUrl = urlData.publicUrl;

    // Insérer dans la table Documents pour le coffre-fort
    await supabase.from('Documents').insert({
      user_id: user.id,
      bien_id: parseInt(bail.bien_id),
      nom_fichier: nomFichier,
      categorie: 'Bail',
      url: bailPdfUrl,
      storage_path: cheminStorage,
      annee: bail.date_debut ? new Date(bail.date_debut).getFullYear() : new Date().getFullYear(),
    });

    // Sauvegarder le bail avec l'URL du PDF
    await sauvegarderBail('actif', bailPdfUrl);

  } catch (err) {
    alert('Erreur : ' + err.message);
    setLoading(false);
  }
}

  function initCanvas(canvas) {
    if (!canvas) return;
    setCanvasRef(canvas);
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e40af'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  }
  function startDraw(e) {
    setDessin(true);
    const ctx = canvasRef.getContext('2d');
    const rect = canvasRef.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y);
  }
  function draw(e) {
    if (!dessin) return;
    e.preventDefault();
    const ctx = canvasRef.getContext('2d');
    const rect = canvasRef.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y); ctx.stroke();
  }
  function stopDraw() { setDessin(false); }
  function effacerCanvas() { canvasRef.getContext('2d').clearRect(0, 0, canvasRef.width, canvasRef.height); }
  function validerSignature(pour) {
    const dataUrl = canvasRef.toDataURL('image/png');
    if (pour === 'bailleur') setSignatureBailleur(dataUrl);
    else setSignatureLocataire(dataUrl);
    effacerCanvas();
  }

  const inp = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'white' };
  const lbl = { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 };
  const bienSel = biens.find(b => b.id === parseInt(bail.bien_id));

  // ===== ÉCRAN CHOIX =====
  if (ecran === 'choix') return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: 580, margin: '0 auto' }}>
        <button onClick={() => window.location.href = '/dashboard'} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>← Retour</button>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Nouveau bail</h1>
        <p style={{ color: '#6b7280', fontSize: 15, marginBottom: 28 }}>Vous avez déjà un bail ou vous souhaitez en créer un ?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* BAIL EXISTANT */}
          {/* BAIL EXISTANT */}
<div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '2px solid transparent' }}
  onMouseEnter={e => e.currentTarget.style.border = '2px solid #2563eb'}
  onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
    <div style={{ fontSize: 36 }}>📄</div>
    <div style={{ flex: 1 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>J'ai déjà un bail signé</h3>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>Importez votre PDF et renseignez les infos principales.</p>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Bien concerné *</label>
        <select value={bienIdUpload} onChange={e => setBienIdUpload(e.target.value)}
          style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', background: 'white' }}>
          <option value="">— Sélectionnez un bien —</option>
          {biens.map(b => <option key={b.id} value={b.id}>{b.nom} — {b.adresse}</option>)}
        </select>
      </div>

      {bienIdUpload && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Loyer HC (€) *</label>
              <input type="number" placeholder="800" value={bail.loyer_hc} onChange={e => setBail({...bail, loyer_hc: e.target.value})}
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'white' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Charges (€)</label>
              <input type="number" placeholder="100" value={bail.charges} onChange={e => setBail({...bail, charges: e.target.value})}
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'white' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Dépôt (€)</label>
              <input type="number" placeholder="800" value={bail.depot_garantie} onChange={e => setBail({...bail, depot_garantie: e.target.value})}
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'white' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Prénom locataire</label>
              <input placeholder="Prénom" value={bail.locataire_prenom} onChange={e => setBail({...bail, locataire_prenom: e.target.value})}
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'white' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Nom locataire</label>
              <input placeholder="Nom" value={bail.locataire_nom} onChange={e => setBail({...bail, locataire_nom: e.target.value})}
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'white' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Date de début</label>
              <input type="date" value={bail.date_debut} onChange={e => setBail({...bail, date_debut: e.target.value})}
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'white' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Date de fin</label>
              <input type="date" value={bail.date_fin} onChange={e => setBail({...bail, date_fin: e.target.value})}
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'white' }} />
            </div>
          </div>

          <input type="file" accept=".pdf" id="upload-bail-existant" style={{ display: 'none' }}
            onChange={async (e) => {
              const fichier = e.target.files[0];
              if (!fichier) return;
              if (!bail.loyer_hc) { alert('Renseignez au moins le loyer.'); return; }
              if (fichier.size > 10 * 1024 * 1024) { alert('Fichier trop lourd — maximum 10 Mo.'); return; }
              setLoading(true);
              try {
                const nomFichier = `baux/${user.id}/${Date.now()}_${fichier.name}`;
                const { error: uploadError } = await supabase.storage.from('documents').upload(nomFichier, fichier, { contentType: 'application/pdf' });
                if (uploadError) { alert('Erreur upload : ' + uploadError.message); setLoading(false); return; }
                const { data: urlData } = supabase.storage.from('documents').getPublicUrl(nomFichier);
                const { error: insertError } = await supabase.from('Baux').insert([{
                  user_id: user.id,
                  bien_id: parseInt(bienIdUpload),
                  bail_pdf_url: urlData.publicUrl,
                  loyer_hc: parseFloat(bail.loyer_hc),
                  charges: parseFloat(bail.charges) || 0,
                  depot_garantie: parseFloat(bail.depot_garantie) || 0,
                  locataire_prenom: bail.locataire_prenom,
                  locataire_nom: bail.locataire_nom,
                  date_debut: bail.date_debut || null,
                  date_fin: bail.date_fin || null,
                  date_exigibilite: parseInt(bail.date_exigibilite) || 1,
                  mode_bail: 'existant',
                  statut: 'actif',
                }]);
                if (insertError) { alert('Erreur : ' + insertError.message); setLoading(false); return; }
                alert('✅ Bail importé avec succès !');
                window.location.href = '/baux';
              } catch (err) { alert('Erreur : ' + err.message); }
              setLoading(false);
            }} />
            <div style={{ marginBottom: 12 }}>
  <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Jour d'échéance du loyer</label>
  <select value={bail.date_exigibilite} onChange={e => setBail({...bail, date_exigibilite: e.target.value})}
    style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none', background: 'white' }}>
    {[1,5,10,15,20,25].map(j => <option key={j} value={j}>Le {j} du mois</option>)}
  </select>
  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Un rappel sera envoyé automatiquement si le loyer n'est pas reçu à cette date.</p>
</div>
          <label htmlFor="upload-bail-existant" style={{
            display: 'inline-block',
            background: '#2563eb', color: 'white',
            padding: '8px 16px', borderRadius: 8, fontSize: 13,
            fontWeight: 600, cursor: 'pointer'
          }}>
            {loading ? 'Upload en cours...' : '📁 Choisir le PDF et importer'}
          </label>
        </div>
      )}
    </div>
  </div>
</div>

          {/* CRÉER UN BAIL */}
          <div onClick={() => setEcran('formulaire')}
            style={{ background: '#2563eb', borderRadius: 16, padding: 24, boxShadow: '0 4px 12px rgba(37,99,235,0.3)', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.92'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <div style={{ fontSize: 36 }}>✍️</div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: '0 0 4px' }}>Créer un bail officiel</h3>
              <p style={{ fontSize: 13, color: '#bfdbfe', margin: 0 }}>Formulaire complet — PDF généré + signature sur tablette.</p>
            </div>
          </div>

          {/* PLUS TARD */}
          <div onClick={() => sauvegarderBail('brouillon')}
            style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: 'pointer', border: '2px solid transparent', display: 'flex', gap: 16, alignItems: 'center' }}
            onMouseEnter={e => e.currentTarget.style.border = '2px solid #e5e7eb'}
            onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
            <div style={{ fontSize: 36 }}>⏰</div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#374151', margin: '0 0 4px' }}>Plus tard</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Créez le bail maintenant, ajoutez le document plus tard.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );

  // ===== FORMULAIRE =====
  if (ecran === 'formulaire') {
    const etapes = ['Bailleur', 'Locataire', 'Bien & loyer', 'Dates'];
    return (
      <main style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <button onClick={() => setEcran('choix')} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>← Retour</button>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 28 }}>Créer un bail officiel</h1>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
            {etapes.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < etapes.length - 1 ? 1 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, background: etape === i+1 ? '#2563eb' : etape > i+1 ? '#16a34a' : '#e5e7eb', color: etape >= i+1 ? 'white' : '#9ca3af' }}>
                    {etape > i+1 ? '✓' : i+1}
                  </div>
                  <span style={{ fontSize: 11, color: etape === i+1 ? '#2563eb' : '#9ca3af', fontWeight: 500, whiteSpace: 'nowrap' }}>{e}</span>
                </div>
                {i < etapes.length - 1 && <div style={{ flex: 1, height: 2, background: etape > i+1 ? '#16a34a' : '#e5e7eb', margin: '0 6px', marginBottom: 20 }} />}
              </div>
            ))}
          </div>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>

            {etape === 1 && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>🏠 Informations bailleur</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div><label style={lbl}>Prénom *</label><input style={inp} value={bail.bailleur_prenom} onChange={e => setBail({...bail, bailleur_prenom: e.target.value})} placeholder="Prénom" /></div>
                  <div><label style={lbl}>Nom *</label><input style={inp} value={bail.bailleur_nom} onChange={e => setBail({...bail, bailleur_nom: e.target.value})} placeholder="Nom" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div><label style={lbl}>Date de naissance</label><input style={inp} type="date" value={bail.bailleur_naissance} onChange={e => setBail({...bail, bailleur_naissance: e.target.value})} /></div>
                  <div><label style={lbl}>Lieu de naissance</label><input style={inp} value={bail.bailleur_lieu_naissance} onChange={e => setBail({...bail, bailleur_lieu_naissance: e.target.value})} placeholder="Paris, France" /></div>
                </div>
                <div style={{ marginBottom: 14 }}><label style={lbl}>Nationalité</label><input style={inp} value={bail.bailleur_nationalite} onChange={e => setBail({...bail, bailleur_nationalite: e.target.value})} placeholder="Française" /></div>
                <div style={{ marginBottom: 24 }}><label style={lbl}>Adresse complète *</label><input style={inp} value={bail.bailleur_adresse} onChange={e => setBail({...bail, bailleur_adresse: e.target.value})} placeholder="12 rue de la Paix, 75001 Paris" /></div>
                <button onClick={() => { if (!bail.bailleur_prenom || !bail.bailleur_nom || !bail.bailleur_adresse) { alert('Prénom, nom et adresse obligatoires.'); return; } setEtape(2); }}
                  style={{ width: '100%', background: '#2563eb', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Suivant →</button>
              </div>
            )}

            {etape === 2 && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>👤 Informations locataire</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div><label style={lbl}>Prénom *</label><input style={inp} value={bail.locataire_prenom} onChange={e => setBail({...bail, locataire_prenom: e.target.value})} placeholder="Prénom" /></div>
                  <div><label style={lbl}>Nom *</label><input style={inp} value={bail.locataire_nom} onChange={e => setBail({...bail, locataire_nom: e.target.value})} placeholder="Nom" /></div>
                </div>
                <div style={{ marginBottom: 14 }}><label style={lbl}>Email *</label><input style={inp} type="email" value={bail.locataire_email} onChange={e => setBail({...bail, locataire_email: e.target.value})} placeholder="email@exemple.com" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div><label style={lbl}>Téléphone</label><input style={inp} value={bail.locataire_telephone} onChange={e => setBail({...bail, locataire_telephone: e.target.value})} placeholder="06 00 00 00 00" /></div>
                  <div><label style={lbl}>Date de naissance</label><input style={inp} type="date" value={bail.locataire_naissance} onChange={e => setBail({...bail, locataire_naissance: e.target.value})} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div><label style={lbl}>Nationalité</label><input style={inp} value={bail.locataire_nationalite} onChange={e => setBail({...bail, locataire_nationalite: e.target.value})} placeholder="Française" /></div>
                  <div><label style={lbl}>Profession</label><input style={inp} value={bail.locataire_profession} onChange={e => setBail({...bail, locataire_profession: e.target.value})} placeholder="Salarié, étudiant..." /></div>
                </div>
                <div style={{ marginBottom: 24 }}><label style={lbl}>Adresse actuelle</label><input style={inp} value={bail.locataire_adresse} onChange={e => setBail({...bail, locataire_adresse: e.target.value})} placeholder="Adresse actuelle du locataire" /></div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setEtape(1)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                  <button onClick={() => { if (!bail.locataire_prenom || !bail.locataire_nom || !bail.locataire_email) { alert('Prénom, nom et email obligatoires.'); return; } setEtape(3); }}
                    style={{ flex: 2, background: '#2563eb', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Suivant →</button>
                </div>
              </div>
            )}

            {etape === 3 && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>💰 Bien & conditions financières</h3>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Bien concerné *</label>
                  <select style={inp} value={bail.bien_id} onChange={e => {
                    const bienChoisi = biens.find(b => b.id === parseInt(e.target.value));
                    setBail({ ...bail, bien_id: e.target.value,
                      surface_habitable: bienChoisi?.surface?.toString() || '',
                      nombre_pieces: bienChoisi?.nombre_pieces?.toString() || '',
                      etage: bienChoisi?.etage || '', classe_dpe: bienChoisi?.classe_dpe || 'D',
                      equipements: bienChoisi?.equipements || '', numero_lot: bienChoisi?.numero_lot || '',
                    });
                  }}>
                    <option value="">— Sélectionnez un bien —</option>
                    {biens.map(b => <option key={b.id} value={b.id}>{b.nom} — {b.adresse}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Type de bail *</label>
                  <select style={inp} value={bail.type_bail} onChange={e => setBail({...bail, type_bail: e.target.value})}>
                    <option>Non meublé</option><option>Meublé</option><option>Commercial (3-6-9)</option><option>Parking / Garage</option><option>Autre</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div><label style={lbl}>Surface (m²) *</label><input style={inp} type="number" value={bail.surface_habitable} onChange={e => setBail({...bail, surface_habitable: e.target.value})} placeholder="45" /></div>
                  <div><label style={lbl}>Nb de pièces *</label><input style={inp} type="number" value={bail.nombre_pieces} onChange={e => setBail({...bail, nombre_pieces: e.target.value})} placeholder="3" /></div>
                  <div><label style={lbl}>Étage / Bât.</label><input style={inp} value={bail.etage} onChange={e => setBail({...bail, etage: e.target.value})} placeholder="2ème / Bât. A" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Classe DPE</label>
                    <select style={inp} value={bail.classe_dpe} onChange={e => setBail({...bail, classe_dpe: e.target.value})}>
                      {['A','B','C','D','E','F','G'].map(c => <option key={c} value={c}>Classe {c}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>Numéro de lot</label><input style={inp} value={bail.numero_lot} onChange={e => setBail({...bail, numero_lot: e.target.value})} placeholder="Lot 12 (copropriété)" /></div>
                </div>
                <div style={{ marginBottom: 14 }}><label style={lbl}>Équipements inclus</label><input style={inp} value={bail.equipements} onChange={e => setBail({...bail, equipements: e.target.value})} placeholder="Cuisine équipée, chaudière gaz..." /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div><label style={lbl}>Loyer HC (€) *</label><input style={inp} type="number" value={bail.loyer_hc} onChange={e => setBail({...bail, loyer_hc: e.target.value})} placeholder="800" /></div>
                  <div><label style={lbl}>Charges (€)</label><input style={inp} type="number" value={bail.charges} onChange={e => setBail({...bail, charges: e.target.value})} placeholder="100" /></div>
                  <div><label style={lbl}>Dépôt garantie (€)</label><input style={inp} type="number" value={bail.depot_garantie} onChange={e => setBail({...bail, depot_garantie: e.target.value})} placeholder="800" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Type de charges</label>
                    <select style={inp} value={bail.type_charges} onChange={e => setBail({...bail, type_charges: e.target.value})}>
                      <option value="Forfaitaires">Forfaitaires</option><option value="Provisionnelles">Provisionnelles</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Modalité de paiement</label>
                    <select style={inp} value={bail.modalite_paiement} onChange={e => setBail({...bail, modalite_paiement: e.target.value})}>
                      <option>Virement bancaire</option><option>Chèque</option><option>Prélèvement automatique</option><option>Espèces</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Jour d'exigibilité</label>
                    <select style={inp} value={bail.date_exigibilite} onChange={e => setBail({...bail, date_exigibilite: e.target.value})}>
                      {[1,5,10,15,20,25].map(j => <option key={j} value={j}>Le {j} du mois</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <label style={lbl}>Révision IRL annuelle</label>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}><input type="radio" checked={bail.revision_irl === true} onChange={() => setBail({...bail, revision_irl: true})} /> Oui</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}><input type="radio" checked={bail.revision_irl === false} onChange={() => setBail({...bail, revision_irl: false})} /> Non</label>
                    </div>
                  </div>
                </div>
                {bail.loyer_hc && (
                  <div style={{ background: '#eff6ff', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid #bfdbfe' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>Total mensuel CC</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>{(parseFloat(bail.loyer_hc)||0)+(parseFloat(bail.charges)||0)}€</span>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setEtape(2)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                  <button onClick={() => { if (!bail.bien_id || !bail.loyer_hc || !bail.surface_habitable) { alert('Bien, loyer et surface obligatoires.'); return; } setEtape(4); }}
                    style={{ flex: 2, background: '#2563eb', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Suivant →</button>
                </div>
              </div>
            )}

            {etape === 4 && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>📅 Dates & clauses</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Date de début *</label>
                    <input style={inp} type="date" value={bail.date_debut} onChange={e => setBail({...bail, date_debut: e.target.value})} />
                  </div>
                  <div>
                    <label style={lbl}>Date de fin (optionnel)</label>
                    <input style={inp} type="date" value={bail.date_fin} onChange={e => setBail({...bail, date_fin: e.target.value})} />
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Vide = reconduction tacite</p>
                  </div>
                </div>
                <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 12, padding: 16, marginBottom: 16 }}>
  <p style={{ fontSize: 13, fontWeight: 700, color: '#854d0e', margin: '0 0 12px' }}>📧 Relances automatiques</p>
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
    <input type="checkbox" id="relance_auto"
      checked={bail.relance_auto_active || false}
      onChange={e => setBail({...bail, relance_auto_active: e.target.checked})}
      style={{ width: 16, height: 16, cursor: 'pointer' }} />
    <label htmlFor="relance_auto" style={{ fontSize: 13, color: '#374151', cursor: 'pointer', fontWeight: 500 }}>
      Activer les relances automatiques (plan Automatique uniquement)
    </label>
  </div>
  {bail.relance_auto_active && (
    <div>
      <label style={lbl}>Envoyer la relance après</label>
      <select style={inp} value={bail.relance_auto_jours || 5} onChange={e => setBail({...bail, relance_auto_jours: parseInt(e.target.value)})}>
        {[3, 5, 7, 10, 15].map(j => <option key={j} value={j}>⏰ {j} jours sans paiement</option>)}
      </select>
    </div>
  )}
</div>
                <div style={{ marginBottom: 24 }}>
                  <label style={lbl}>Clauses particulières</label>
                  <textarea style={{ ...inp, minHeight: 100, resize: 'vertical' }} value={bail.clauses} onChange={e => setBail({...bail, clauses: e.target.value})} placeholder="Ex : animaux interdits, sous-location interdite..." />
                </div>
                {bienSel && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                    <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#15803d' }}>✅ Récapitulatif complet</p>
                    <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}><b>Bailleur :</b> {bail.bailleur_prenom} {bail.bailleur_nom}</p>
                    <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}><b>Locataire :</b> {bail.locataire_prenom} {bail.locataire_nom} — {bail.locataire_profession}</p>
                    <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}><b>Bien :</b> {bienSel.nom} — {bail.surface_habitable}m² — {bail.nombre_pieces} pièces — DPE {bail.classe_dpe}</p>
                    <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}><b>Loyer :</b> {bail.loyer_hc}€ HC + {bail.charges||0}€ = {(parseFloat(bail.loyer_hc)||0)+(parseFloat(bail.charges)||0)}€ CC</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#374151' }}><b>DG :</b> {bail.depot_garantie||0}€ — Le {bail.date_exigibilite} — {bail.modalite_paiement} — IRL : {bail.revision_irl ? 'Oui' : 'Non'}</p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setEtape(3)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                  <button onClick={() => { if (!bail.date_debut) { alert('Date de début obligatoire.'); return; } setEcran('signature'); }}
                    style={{ flex: 2, background: '#2563eb', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Passer à la signature →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ===== ÉCRAN SIGNATURE =====
  if (ecran === 'signature') return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Signature du bail</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 28 }}>Choisissez votre mode de signature</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>🖊️ Signer sur tablette</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>Le bailleur signe, puis le locataire. Signatures intégrées au PDF.</p>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                {signatureBailleur ? '✅ Bailleur signé' : `Signature du bailleur — ${bail.bailleur_prenom} ${bail.bailleur_nom}`}
              </p>
              {!signatureBailleur ? (
                <div>
                  <canvas ref={initCanvas} width={520} height={140}
                    onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                    onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                    style={{ border: '2px dashed #93c5fd', borderRadius: 10, width: '100%', height: 140, cursor: 'crosshair', touchAction: 'none', background: '#fafafa' }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={effacerCanvas} style={{ flex: 1, background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 13 }}>🗑 Effacer</button>
                    <button onClick={() => validerSignature('bailleur')} style={{ flex: 2, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>✅ Valider signature bailleur</button>
                  </div>
                </div>
              ) : (
                <div>
                  <img src={signatureBailleur} style={{ border: '1px solid #e5e7eb', borderRadius: 8, width: '100%', height: 100, objectFit: 'contain' }} alt="Signature bailleur" />
                  <button onClick={() => setSignatureBailleur(null)} style={{ marginTop: 6, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Recommencer</button>
                </div>
              )}
            </div>
            {signatureBailleur && (
              <div style={{ marginBottom: 20, borderTop: '1px solid #f3f4f6', paddingTop: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  {signatureLocataire ? '✅ Locataire signé' : `Signature du locataire — ${bail.locataire_prenom} ${bail.locataire_nom}`}
                </p>
                {!signatureLocataire ? (
                  <div>
                    <canvas ref={initCanvas} width={520} height={140}
                      onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                      onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                      style={{ border: '2px dashed #93c5fd', borderRadius: 10, width: '100%', height: 140, cursor: 'crosshair', touchAction: 'none', background: '#fafafa' }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={effacerCanvas} style={{ flex: 1, background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 13 }}>🗑 Effacer</button>
                      <button onClick={() => validerSignature('locataire')} style={{ flex: 2, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>✅ Valider signature locataire</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <img src={signatureLocataire} style={{ border: '1px solid #e5e7eb', borderRadius: 8, width: '100%', height: 100, objectFit: 'contain' }} alt="Signature locataire" />
                    <button onClick={() => setSignatureLocataire(null)} style={{ marginTop: 6, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Recommencer</button>
                  </div>
                )}
              </div>
            )}
            {signatureBailleur && signatureLocataire && (
              <button onClick={finaliserBailSigne} disabled={loading}
                style={{ width: '100%', background: '#16a34a', color: 'white', padding: 14, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, marginTop: 8 }}>
                {loading ? 'Enregistrement...' : '🎉 Finaliser — Télécharger le PDF signé'}
              </button>
            )}
          </div>

          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', opacity: 0.6 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>✉️ Signature électronique Yousign</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>Envoyez le bail par email — chaque partie signe depuis son téléphone.</p>
            <button disabled style={{ width: '100%', background: '#e5e7eb', color: '#9ca3af', padding: 12, borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 14 }}>🔒 Bientôt disponible</button>
          </div>

          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>⏰ Signer plus tard</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>Le bail est sauvegardé en brouillon, revenez le signer depuis "Mes Baux".</p>
            <button onClick={() => sauvegarderBail('brouillon')} disabled={loading}
              style={{ width: '100%', background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              {loading ? 'Enregistrement...' : '💾 Sauvegarder en brouillon'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );

  return null;
}