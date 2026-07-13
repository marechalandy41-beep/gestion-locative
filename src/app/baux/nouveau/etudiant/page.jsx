'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../../supabase'
import jsPDF from 'jspdf'

export default function NouveauBailEtudiant() {
  const [user, setUser] = useState(null)
  const [lotsDisponibles, setLotsDisponibles] = useState([])
  const [lotsSelectionnes, setLotsSelectionnes] = useState([])
  const [biens, setBiens] = useState([])
  const [loading, setLoading] = useState(false)
  const [etape, setEtape] = useState(1)
  const [bailIdExistant, setBailIdExistant] = useState(null)
  const [signatureBailleur, setSignatureBailleur] = useState(null)
  const [signatureLocataire, setSignatureLocataire] = useState(null)
  const [signatureActive, setSignatureActive] = useState(null)
  const [dessin, setDessin] = useState(false)
  const [luApprouveBailleur, setLuApprouveBailleur] = useState(false)
  const [luApprouveLocataire, setLuApprouveLocataire] = useState(false)
  const canvasRef = useRef(null)

  const inp = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'white' }
  const lbl = { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }

  const [form, setForm] = useState({
    bailleur_prenom: '', bailleur_nom: '', bailleur_adresse: '', bailleur_naissance: '', bailleur_lieu_naissance: '', bailleur_nationalite: 'Française',
    bailleur_type: 'particulier', bailleur_denomination: '', bailleur_forme_juridique: 'SCI', bailleur_siren: '', bailleur_representant: '', bailleur_representant_type: 'physique', bailleur_representant_denomination: '', bailleur_representant_personne: '',
    locataire_type: 'particulier',
    locataire_prenom: '', locataire_nom: '', locataire_email: '', locataire_telephone: '', locataire_naissance: '', locataire_nationalite: 'Française', locataire_adresse: '', etablissement: '',
    bien_id: '', surface_habitable: '', nombre_pieces: '', etage: '', equipements: '', classe_dpe: 'D', numero_lot: '',
    loyer_hc: '', charges: '', depot_garantie: '', modalite_paiement: 'Virement bancaire', date_exigibilite: '1',
    date_debut: '', clauses: '',
  })

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) { window.location.href = '/auth'; return }
      const { data: customer } = await supabase.from('customers').select('plan').eq('user_id', data.user.id).single()
      if (!customer || customer.plan === 'gratuit') { window.location.href = '/biens?plan=gratuit'; return }
      setUser(data.user)
      const { data: biensData } = await supabase.from('Biens').select('*').eq('user_id', data.user.id)
      setBiens(biensData || [])
      const params = new URLSearchParams(window.location.search)
      const bailId = params.get('id')
      if (bailId) {
        const { data: bail } = await supabase.from('Baux').select('*').eq('id', parseInt(bailId)).single()
        if (bail) {
          setForm({ bailleur_prenom: bail.bailleur_prenom || '', bailleur_nom: bail.bailleur_nom || '', bailleur_adresse: bail.bailleur_adresse || '', bailleur_naissance: bail.bailleur_naissance || '', bailleur_lieu_naissance: bail.bailleur_lieu_naissance || '', bailleur_nationalite: bail.bailleur_nationalite || 'Française', locataire_prenom: bail.locataire_prenom || '', locataire_nom: bail.locataire_nom || '', locataire_email: bail.locataire_email || '', locataire_telephone: bail.locataire_telephone || '', locataire_naissance: bail.locataire_naissance || '', locataire_nationalite: bail.locataire_nationalite || 'Française', locataire_adresse: bail.locataire_adresse || '', etablissement: bail.locataire_profession || '', bien_id: bail.bien_id?.toString() || '', surface_habitable: bail.surface_habitable?.toString() || '', nombre_pieces: bail.nombre_pieces?.toString() || '', etage: bail.etage || '', equipements: bail.equipements || '', classe_dpe: bail.classe_dpe || 'D', numero_lot: bail.numero_lot || '', loyer_hc: bail.loyer_hc?.toString() || '', charges: bail.charges?.toString() || '', depot_garantie: bail.depot_garantie?.toString() || '', modalite_paiement: bail.modalite_paiement || 'Virement bancaire', date_exigibilite: bail.date_exigibilite?.toString() || '1', date_debut: bail.date_debut || '', clauses: bail.clauses || '' })
          setBailIdExistant(parseInt(bailId))
          if (params.get('sign') === 'true') setEtape(4)
        }
      }
    })
  }, [])

  function startDraw(e) { setDessin(true); const ctx = canvasRef.current.getContext('2d'); const rect = canvasRef.current.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo((e.touches ? e.touches[0].clientX : e.clientX) - rect.left, (e.touches ? e.touches[0].clientY : e.clientY) - rect.top) }
  function draw(e) { if (!dessin) return; e.preventDefault(); const ctx = canvasRef.current.getContext('2d'); ctx.strokeStyle = '#db2777'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; const rect = canvasRef.current.getBoundingClientRect(); ctx.lineTo((e.touches ? e.touches[0].clientX : e.clientX) - rect.left, (e.touches ? e.touches[0].clientY : e.clientY) - rect.top); ctx.stroke() }
  function stopDraw() { setDessin(false) }
  function effacer() { canvasRef.current.getContext('2d').clearRect(0, 0, 520, 140) }
  function validerSignature() { const caseCochee = signatureActive === 'bailleur' ? luApprouveBailleur : luApprouveLocataire; if (!caseCochee) { alert('Veuillez cocher « Je certifie avoir lu et approuvé » avant de valider la signature.'); return } const d = canvasRef.current.toDataURL('image/png'); if (signatureActive === 'bailleur') setSignatureBailleur(d); else setSignatureLocataire(d); setSignatureActive(null); effacer() }
  function sanitize(n) { return (n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_') }
  const bienSel = biens.find(b => b.id === parseInt(form.bien_id))

  async function chargerLots(bienId) {
    const { data } = await supabase.from('lots').select('*').eq('bien_id', bienId)
    setLotsDisponibles(data || [])
    setLotsSelectionnes([])
  }

  // Calcul date fin automatique (9 mois après début)
  const dateFin = form.date_debut ? (() => { const d = new Date(form.date_debut); d.setMonth(d.getMonth() + 9); return d.toLocaleDateString('fr-FR') })() : '—'

  async function sauvegarderBrouillon() {
    setLoading(true)
    const d = new Date(form.date_debut); d.setMonth(d.getMonth() + 9)
   const bailData = { user_id: user.id, bien_id: parseInt(form.bien_id) || null, type_bail: 'Étudiant', loyer_hc: parseFloat(form.loyer_hc) || 0, charges: parseFloat(form.charges) || 0, depot_garantie: parseFloat(form.depot_garantie) || 0, date_debut: form.date_debut || null, date_fin: form.date_debut ? d.toISOString().split('T')[0] : null, date_exigibilite: parseInt(form.date_exigibilite) || 1, modalite_paiement: form.modalite_paiement, clauses: form.clauses, bailleur_prenom: form.bailleur_prenom, bailleur_nom: form.bailleur_nom, bailleur_adresse: form.bailleur_adresse, bailleur_naissance: form.bailleur_naissance || null, bailleur_lieu_naissance: form.bailleur_lieu_naissance, bailleur_nationalite: form.bailleur_nationalite, bailleur_type: form.bailleur_type, bailleur_denomination: form.bailleur_denomination, bailleur_forme_juridique: form.bailleur_forme_juridique, bailleur_siren: form.bailleur_siren, bailleur_representant: form.bailleur_representant, bailleur_representant_type: form.bailleur_representant_type, bailleur_representant_denomination: form.bailleur_representant_denomination, bailleur_representant_personne: form.bailleur_representant_personne, locataire_type: 'particulier', locataire_prenom: form.locataire_prenom, locataire_nom: form.locataire_nom, locataire_email: form.locataire_email, locataire_telephone: form.locataire_telephone, locataire_naissance: form.locataire_naissance || null, locataire_nationalite: form.locataire_nationalite, locataire_profession: form.etablissement, locataire_adresse: form.locataire_adresse, surface_habitable: parseFloat(form.surface_habitable) || null, nombre_pieces: parseInt(form.nombre_pieces) || null, etage: form.etage, equipements: form.equipements, classe_dpe: form.classe_dpe, numero_lot: form.numero_lot, statut: 'brouillon' }
    if (bailIdExistant) await supabase.from('Baux').update(bailData).eq('id', bailIdExistant)
    else await supabase.from('Baux').insert(bailData)
    setLoading(false); window.location.href = '/baux'
  }

async function envoyerVersYousign() {
    if (!form.locataire_email) { alert('Email du locataire obligatoire pour Yousign.'); return }
    setLoading(true)
    try {
      // Générer le PDF (même logique que finaliserEtSauvegarder)
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
      const bienSel = biens.find(b => b.id === parseInt(form.bien_id))

      doc.setFillColor(37, 99, 235); doc.rect(0, 0, 210, 20, 'F')
      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
      doc.text('CONTRAT DE LOCATION', pageW / 2, 10, { align: 'center' })
      doc.setFontSize(9)
      doc.text('NON MEUBLÉ — Loi n°89-462 du 6 juillet 1989', pageW / 2, 16, { align: 'center' })
      y = 28; doc.setTextColor(0, 0, 0)

      titre('ARTICLE 1 — LE BAILLEUR')
      ligne('Nom et prénom :', `${form.bailleur_prenom} ${form.bailleur_nom}`)
      ligne('Adresse :', form.bailleur_adresse)

      titre('ARTICLE 2 — LE LOCATAIRE')
      ligne('Nom et prénom :', `${form.locataire_prenom} ${form.locataire_nom}`)
      ligne('Email :', form.locataire_email)
      ligne('Téléphone :', form.locataire_telephone)

      titre('ARTICLE 3 — BIEN LOUÉ')
      ligne('Adresse :', bienSel?.adresse)
      ligne('Surface :', form.surface_habitable ? `${form.surface_habitable} m²` : null)

      titre('ARTICLE 4 — CONDITIONS FINANCIÈRES')
      ligne('Loyer HC :', `${form.loyer_hc} €`)
      ligne('Charges :', form.charges ? `${form.charges} €` : null)
      ligne('Dépôt de garantie :', form.depot_garantie ? `${form.depot_garantie} €` : null)

      titre('ARTICLE 5 — DURÉE')
      ligne('Date de début :', form.date_debut ? new Date(form.date_debut).toLocaleDateString('fr-FR') : null)
      ligne('Date de fin :', form.date_fin ? new Date(form.date_fin).toLocaleDateString('fr-FR') : 'Reconduction tacite')

      if (form.clauses) { titre('CLAUSES PARTICULIÈRES'); texte(form.clauses) }

      y += 20; titre('SIGNATURES')
      doc.text(`À signer électroniquement via Yousign`, margin, y)

      const nomFichier = `Bail_NonMeuble_${sanitize(form.locataire_nom)}_${sanitize(form.bailleur_nom)}_${form.date_debut || 'date'}.pdf`
      const pdfBase64 = doc.output('datauristring').split(',')[1]

      // Sauvegarder le bail
      const bailData = {
        user_id: user.id, bien_id: parseInt(form.bien_id),
        type_bail: 'Étudiant',
        loyer_hc: parseFloat(form.loyer_hc), charges: parseFloat(form.charges) || 0,
        type_charges: form.type_charges, depot_garantie: parseFloat(form.depot_garantie) || 0,
        date_debut: form.date_debut || null, date_fin: form.date_fin || null,
        date_exigibilite: parseInt(form.date_exigibilite) || 1,
        revision_irl: form.revision_irl, modalite_paiement: form.modalite_paiement,
        clauses: form.clauses, relance_auto_active: form.relance_auto_active || false,
        relance_auto_jours: form.relance_auto_jours || 5,
        bailleur_prenom: form.bailleur_prenom, bailleur_nom: form.bailleur_nom,
        bailleur_adresse: form.bailleur_adresse, bailleur_naissance: form.bailleur_naissance || null,
        bailleur_lieu_naissance: form.bailleur_lieu_naissance, bailleur_nationalite: form.bailleur_nationalite,
        bailleur_type: form.bailleur_type, bailleur_denomination: form.bailleur_denomination, bailleur_forme_juridique: form.bailleur_forme_juridique, bailleur_siren: form.bailleur_siren, bailleur_representant: form.bailleur_representant, bailleur_representant_type: form.bailleur_representant_type, bailleur_representant_denomination: form.bailleur_representant_denomination, bailleur_representant_personne: form.bailleur_representant_personne, locataire_type: 'particulier',
        locataire_prenom: form.locataire_prenom, locataire_nom: form.locataire_nom,
        locataire_email: form.locataire_email, locataire_telephone: form.locataire_telephone,
        locataire_naissance: form.locataire_naissance || null, locataire_nationalite: form.locataire_nationalite,
        locataire_profession: form.locataire_profession, locataire_adresse: form.locataire_adresse,
        surface_habitable: parseFloat(form.surface_habitable) || null,
        nombre_pieces: parseInt(form.nombre_pieces) || null,
        etage: form.etage, equipements: form.equipements,
        classe_dpe: form.classe_dpe, numero_lot: form.numero_lot,
        statut: 'en_attente_signature',
      }

      let bail, bailError
      if (bailIdExistant) {
        const res = await supabase.from('Baux').update(bailData).eq('id', bailIdExistant).select().single()
        bail = res.data; bailError = res.error
      } else {
        const res = await supabase.from('Baux').insert(bailData).select().single()
        bail = res.data; bailError = res.error
      }
      if (bailError) { alert('Erreur : ' + bailError.message); setLoading(false); return }

      // Envoyer vers Yousign
      const res = await fetch('/api/yousign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_signature_request',
          bailId: bail.id,
          userId: user.id,
          pdfBase64,
          nomFichier,
          bailleurEmail: user.email,
          bailleurNom: `${form.bailleur_prenom} ${form.bailleur_nom}`,
          locataireEmail: form.locataire_email,
          locataireNom: `${form.locataire_prenom} ${form.locataire_nom}`,
        }),
      })
      const data = await res.json()
      if (data.success) {
        alert('✅ Emails de signature envoyés via Yousign au bailleur et au locataire !')
        window.location.href = `/baux/${bail.id}`
      } else {
        alert('Erreur Yousign : ' + (data.error || JSON.stringify(data.details)))
      }
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
    setLoading(false)
  }

  async function finaliserEtSauvegarder() {
    setLoading(true)
    try {
      const dateFinObj = new Date(form.date_debut); dateFinObj.setMonth(dateFinObj.getMonth() + 9)
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const pageW = 210, margin = 20, contenuW = pageW - margin * 2; let y = 20
      const checkPage = () => { if (y > 270) { doc.addPage(); y = 20 } }
      const titre = (t) => { checkPage(); doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(219, 39, 119); doc.text(t, margin, y); y += 2; doc.setDrawColor(219, 39, 119); doc.setLineWidth(0.4); doc.line(margin, y, pageW - margin, y); y += 6; doc.setTextColor(0, 0, 0) }
      const ligne = (label, valeur) => { if (!valeur) return; checkPage(); doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text(label, margin, y); doc.setFont('helvetica', 'normal'); const lignes = doc.splitTextToSize(valeur.toString(), contenuW - 55); doc.text(lignes, margin + 55, y); y += Math.max(5, lignes.length * 4.5) }
      const texte = (t) => { checkPage(); doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50); doc.splitTextToSize(t, contenuW).forEach(l => { checkPage(); doc.text(l, margin, y); y += 4.5 }); doc.setTextColor(0, 0, 0); y += 2 }

      doc.setFillColor(219, 39, 119); doc.rect(0, 0, 210, 20, 'F')
      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
      doc.text('BAIL ÉTUDIANT MEUBLÉ', pageW / 2, 10, { align: 'center' })
      doc.setFontSize(9); doc.text('Loi n°89-462 du 6 juillet 1989 — Article 25-7 — Durée 9 mois', pageW / 2, 16, { align: 'center' })
      y = 28; doc.setTextColor(0, 0, 0)

      titre('ARTICLE 1 — LE BAILLEUR')
      if (form.bailleur_type === 'morale') {
        ligne('Société :', `${form.bailleur_denomination} (${form.bailleur_forme_juridique})`)
        ligne('SIREN :', form.bailleur_siren)
        ligne('Siège social :', form.bailleur_adresse)
        if (form.bailleur_representant_type === 'morale') {
          ligne('Représentée par :', `${form.bailleur_representant_denomination}, elle-même représentée par ${form.bailleur_representant_personne}`)
        } else {
          ligne('Représentée par :', form.bailleur_representant)
        }
      } else {
        ligne('Nom et prénom :', `${form.bailleur_prenom} ${form.bailleur_nom}`)
        ligne('Date de naissance :', form.bailleur_naissance ? new Date(form.bailleur_naissance).toLocaleDateString('fr-FR') : null)
        ligne('Adresse :', form.bailleur_adresse)
      }
      y += 4

      titre('ARTICLE 2 — L\'ÉTUDIANT LOCATAIRE')
      ligne('Nom et prénom :', `${form.locataire_prenom} ${form.locataire_nom}`)
      ligne('Date de naissance :', form.locataire_naissance ? new Date(form.locataire_naissance).toLocaleDateString('fr-FR') : null)
      ligne('Établissement :', form.etablissement)
      ligne('Email :', form.locataire_email)
      ligne('Téléphone :', form.locataire_telephone); y += 4

      titre('ARTICLE 3 — DÉSIGNATION DU LOGEMENT MEUBLÉ')
      ligne('Adresse :', bienSel?.adresse)
      ligne('Surface :', form.surface_habitable ? `${form.surface_habitable} m²` : null)
      ligne('Équipements :', form.equipements)
      ligne('Classe DPE :', form.classe_dpe); y += 4

      titre('ARTICLE 4 — DURÉE DU BAIL ÉTUDIANT')
      ligne('Date de début :', form.date_debut ? new Date(form.date_debut).toLocaleDateString('fr-FR') : null)
      ligne('Date de fin :', dateFinObj.toLocaleDateString('fr-FR'))
      texte("Le présent bail est conclu pour une durée de 9 mois conformément à l'article 25-7-III de la loi du 6 juillet 1989. Il ne se renouvelle pas tacitement. À l'issue des 9 mois, le locataire doit quitter les lieux sans qu'il soit nécessaire de donner congé.")

      titre('ARTICLE 5 — CONDITIONS FINANCIÈRES')
      ligne('Loyer mensuel HC :', `${form.loyer_hc} €`)
      ligne('Charges :', form.charges ? `${form.charges} €` : null)
      ligne('Total CC :', `${(parseFloat(form.loyer_hc) + parseFloat(form.charges || 0)).toFixed(2)} €`)
      ligne('Dépôt de garantie :', form.depot_garantie ? `${form.depot_garantie} € (2 mois max)` : null)
      ligne("Exigibilité :", `Le ${form.date_exigibilite} du mois`)

      if (form.clauses?.trim()) { titre('ARTICLE 6 — CLAUSES PARTICULIÈRES'); texte(form.clauses) }

      if (y > 220) { doc.addPage(); y = 20 }
      y += 8; titre('SIGNATURES')
      doc.setFontSize(9); doc.text(`Fait le ${new Date().toLocaleDateString('fr-FR')}`, margin, y); y += 12
      doc.setFont('helvetica', 'bold'); doc.text('Le Bailleur', margin, y); doc.text('L\'Étudiant Locataire', pageW / 2 + 5, y); y += 6
      doc.setDrawColor(180, 180, 180); doc.rect(margin, y, 80, 38); doc.rect(pageW / 2 + 5, y, 80, 38)
      doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(120, 120, 120)
      if (luApprouveBailleur) doc.text('Lu et approuvé', margin + 2, y + 4)
      if (luApprouveLocataire) doc.text('Lu et approuvé', pageW / 2 + 7, y + 4)
      doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal')
      if (signatureBailleur) doc.addImage(signatureBailleur, 'PNG', margin + 1, y + 5, 78, 32)
      if (signatureLocataire) doc.addImage(signatureLocataire, 'PNG', pageW / 2 + 6, y + 5, 78, 32)
      y += 44; doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.text('Document généré par Ma Gestion-Locative — Bail étudiant loi 89-462 art. 25-7', pageW / 2, y, { align: 'center' })

      const nomFichier = `Bail_Etudiant_${sanitize(form.locataire_nom)}_${form.date_debut || 'date'}.pdf`
      doc.save(nomFichier)
      const pdfBlob = doc.output('blob')
      const cheminStorage = `baux/${user.id}/${Date.now()}_${nomFichier}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(cheminStorage, pdfBlob, { contentType: 'application/pdf' })
      let bailPdfUrl = null
      if (!uploadError) { const { data: urlData } = supabase.storage.from('documents').getPublicUrl(cheminStorage); bailPdfUrl = urlData.publicUrl; await supabase.from('Documents').insert({ user_id: user.id, bien_id: parseInt(form.bien_id), nom_fichier: nomFichier, categorie: 'Bail', url: bailPdfUrl, storage_path: cheminStorage, annee: new Date().getFullYear() }) }

     const bailData = { user_id: user.id, bien_id: parseInt(form.bien_id), type_bail: 'Étudiant', loyer_hc: parseFloat(form.loyer_hc), charges: parseFloat(form.charges) || 0, depot_garantie: parseFloat(form.depot_garantie) || 0, date_debut: form.date_debut || null, date_fin: dateFinObj.toISOString().split('T')[0], date_exigibilite: parseInt(form.date_exigibilite) || 1, modalite_paiement: form.modalite_paiement, clauses: form.clauses, bailleur_prenom: form.bailleur_prenom, bailleur_nom: form.bailleur_nom, bailleur_adresse: form.bailleur_adresse, bailleur_naissance: form.bailleur_naissance || null, bailleur_lieu_naissance: form.bailleur_lieu_naissance, bailleur_nationalite: form.bailleur_nationalite, bailleur_type: form.bailleur_type, bailleur_denomination: form.bailleur_denomination, bailleur_forme_juridique: form.bailleur_forme_juridique, bailleur_siren: form.bailleur_siren, bailleur_representant: form.bailleur_representant, bailleur_representant_type: form.bailleur_representant_type, bailleur_representant_denomination: form.bailleur_representant_denomination, bailleur_representant_personne: form.bailleur_representant_personne, locataire_type: 'particulier', locataire_prenom: form.locataire_prenom, locataire_nom: form.locataire_nom, locataire_email: form.locataire_email, locataire_telephone: form.locataire_telephone, locataire_naissance: form.locataire_naissance || null, locataire_nationalite: form.locataire_nationalite, locataire_profession: form.etablissement, locataire_adresse: form.locataire_adresse, surface_habitable: parseFloat(form.surface_habitable) || null, nombre_pieces: parseInt(form.nombre_pieces) || null, etage: form.etage, equipements: form.equipements, classe_dpe: form.classe_dpe, numero_lot: form.numero_lot, signature_bailleur: signatureBailleur, signature_locataire: signatureLocataire, statut: 'actif', ...(bailPdfUrl && { bail_pdf_url: bailPdfUrl }) }
      let bail, bailError
      if (bailIdExistant) { const res = await supabase.from('Baux').update(bailData).eq('id', bailIdExistant).select().single(); bail = res.data; bailError = res.error }
      else { const res = await supabase.from('Baux').insert(bailData).select().single(); bail = res.data; bailError = res.error }
      if (bailError) { alert('Erreur : ' + bailError.message); setLoading(false); return }
      if (lotsSelectionnes.length > 0) {
        await supabase.from('lots')
          .update({ statut: 'loue', bail_id: bail.id })
          .in('id', lotsSelectionnes.map(l => l.id))
      }
      await fetch('/api/sync-quantity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) }).catch(() => {})
      setLoading(false); window.location.href = `/baux/${bail.id}`
    } catch (err) { alert('Erreur : ' + err.message); setLoading(false) }
  }

  const etapes = ['Bailleur', 'Étudiant', 'Bien & loyer', 'Signature']

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <button onClick={() => etape === 1 ? window.location.href = '/baux/nouveau' : setEtape(etape - 1)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>← Retour</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><span style={{ background: '#fdf2f8', color: '#db2777', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>🎓 Bail étudiant</span></div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Bail étudiant meublé</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 28 }}>Durée fixe 9 mois — Pas de reconduction tacite — Meublé obligatoire</p>
        {form.date_debut && <div style={{ background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: 10, padding: 12, marginBottom: 20 }}><p style={{ margin: 0, fontSize: 13, color: '#db2777', fontWeight: 600 }}>📅 Durée : {new Date(form.date_debut).toLocaleDateString('fr-FR')} → {dateFin} (9 mois fixes)</p></div>}

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          {etapes.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < etapes.length - 1 ? 1 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, background: etape === i+1 ? '#db2777' : etape > i+1 ? '#16a34a' : '#e5e7eb', color: etape >= i+1 ? 'white' : '#9ca3af' }}>{etape > i+1 ? '✓' : i+1}</div>
                <span style={{ fontSize: 11, color: etape === i+1 ? '#db2777' : '#9ca3af', fontWeight: 500, whiteSpace: 'nowrap' }}>{e}</span>
              </div>
              {i < etapes.length - 1 && <div style={{ flex: 1, height: 2, background: etape > i+1 ? '#16a34a' : '#e5e7eb', margin: '0 6px', marginBottom: 20 }} />}
            </div>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          {etape === 1 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>👤 Informations bailleur</h3>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setForm({...form, bailleur_type: 'particulier'})} style={{ flex: 1, padding: 10, borderRadius: 10, border: `2px solid ${form.bailleur_type === 'particulier' ? '#db2777' : '#e5e7eb'}`, background: form.bailleur_type === 'particulier' ? '#fdf2f8' : 'white', color: form.bailleur_type === 'particulier' ? '#db2777' : '#6b7280', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>👤 Particulier</button>
                  <button type="button" onClick={() => setForm({...form, bailleur_type: 'morale'})} style={{ flex: 1, padding: 10, borderRadius: 10, border: `2px solid ${form.bailleur_type === 'morale' ? '#db2777' : '#e5e7eb'}`, background: form.bailleur_type === 'morale' ? '#fdf2f8' : 'white', color: form.bailleur_type === 'morale' ? '#db2777' : '#6b7280', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>🏢 Société (SCI, SARL...)</button>
                </div>
              </div>
              {form.bailleur_type === 'morale' && (
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div><label style={lbl}>Dénomination sociale *</label><input style={inp} value={form.bailleur_denomination} onChange={e => setForm({...form, bailleur_denomination: e.target.value})} placeholder="SCI du Moulin" /></div>
                    <div><label style={lbl}>Forme juridique</label><select style={inp} value={form.bailleur_forme_juridique} onChange={e => setForm({...form, bailleur_forme_juridique: e.target.value})}><option value="SCI">SCI</option><option value="SARL">SARL</option><option value="SAS">SAS</option><option value="SASU">SASU</option><option value="EURL">EURL</option><option value="SA">SA</option><option value="Autre">Autre</option></select></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div><label style={lbl}>N° SIREN</label><input style={inp} value={form.bailleur_siren} onChange={e => setForm({...form, bailleur_siren: e.target.value})} placeholder="123 456 789" /></div>
                    <div><label style={lbl}>Représentée par</label><select style={inp} value={form.bailleur_representant_type} onChange={e => setForm({...form, bailleur_representant_type: e.target.value})}><option value="physique">Une personne physique</option><option value="morale">Une autre société</option></select></div>
                  </div>
                  {form.bailleur_representant_type === 'physique' && (
                    <div style={{ marginTop: 12 }}><label style={lbl}>Nom du représentant légal</label><input style={inp} value={form.bailleur_representant} onChange={e => setForm({...form, bailleur_representant: e.target.value})} placeholder="Jean Dupont, gérant" /></div>
                  )}
                  {form.bailleur_representant_type === 'morale' && (
                    <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div><label style={lbl}>Société représentante</label><input style={inp} value={form.bailleur_representant_denomination} onChange={e => setForm({...form, bailleur_representant_denomination: e.target.value})} placeholder="Holding SAS" /></div>
                      <div><label style={lbl}>Elle-même représentée par</label><input style={inp} value={form.bailleur_representant_personne} onChange={e => setForm({...form, bailleur_representant_personne: e.target.value})} placeholder="Jean Dupont" /></div>
                    </div>
                  )}
                </div>
              )}
              {form.bailleur_type === 'particulier' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div><label style={lbl}>Prénom *</label><input style={inp} value={form.bailleur_prenom} onChange={e => setForm({...form, bailleur_prenom: e.target.value})} /></div>
                    <div><label style={lbl}>Nom *</label><input style={inp} value={form.bailleur_nom} onChange={e => setForm({...form, bailleur_nom: e.target.value})} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div><label style={lbl}>Date de naissance</label><input style={inp} type="date" value={form.bailleur_naissance} onChange={e => setForm({...form, bailleur_naissance: e.target.value})} /></div>
                    <div><label style={lbl}>Lieu de naissance</label><input style={inp} value={form.bailleur_lieu_naissance} onChange={e => setForm({...form, bailleur_lieu_naissance: e.target.value})} /></div>
                  </div>
                </>
              )}
              <div style={{ marginBottom: 24 }}><label style={lbl}>{form.bailleur_type === 'morale' ? 'Adresse du siège *' : 'Adresse *'}</label><input style={inp} value={form.bailleur_adresse} onChange={e => setForm({...form, bailleur_adresse: e.target.value})} /></div>
              <button onClick={() => { if (form.bailleur_type === 'morale') { if (!form.bailleur_denomination || !form.bailleur_adresse) { alert('Dénomination sociale et adresse obligatoires.'); return } } else { if (!form.bailleur_prenom || !form.bailleur_nom || !form.bailleur_adresse) { alert('Champs obligatoires.'); return } } setEtape(2) }} style={{ width: '100%', background: '#db2777', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Suivant → Étudiant</button>
            </div>
          )}

          {etape === 2 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>🎓 Informations de l'étudiant</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Prénom *</label><input style={inp} value={form.locataire_prenom} onChange={e => setForm({...form, locataire_prenom: e.target.value})} /></div>
                <div><label style={lbl}>Nom *</label><input style={inp} value={form.locataire_nom} onChange={e => setForm({...form, locataire_nom: e.target.value})} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Email *</label><input style={inp} type="email" value={form.locataire_email} onChange={e => setForm({...form, locataire_email: e.target.value})} /></div>
                <div><label style={lbl}>Téléphone</label><input style={inp} value={form.locataire_telephone} onChange={e => setForm({...form, locataire_telephone: e.target.value})} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Date de naissance</label><input style={inp} type="date" value={form.locataire_naissance} onChange={e => setForm({...form, locataire_naissance: e.target.value})} /></div>
                <div><label style={lbl}>Établissement scolaire</label><input style={inp} value={form.etablissement} onChange={e => setForm({...form, etablissement: e.target.value})} placeholder="Université Paris 1, IUT..." /></div>
              </div>
              <div style={{ marginBottom: 20 }}><label style={lbl}>Adresse actuelle</label><input style={inp} value={form.locataire_adresse} onChange={e => setForm({...form, locataire_adresse: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEtape(1)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                <button onClick={() => { if (!form.locataire_prenom || !form.locataire_nom || !form.locataire_email) { alert('Champs obligatoires.'); return } setEtape(3) }} style={{ flex: 2, background: '#db2777', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Suivant → Bien & loyer</button>
              </div>
            </div>
          )}

          {etape === 3 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>🏠 Bien & conditions financières</h3>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Bien concerné *</label>
                <select style={inp} value={form.bien_id} onChange={e => { const b = biens.find(b => b.id === parseInt(e.target.value)); setForm({...form, bien_id: e.target.value, surface_habitable: b?.surface?.toString() || '', nombre_pieces: b?.nombre_pieces?.toString() || '', etage: b?.etage || '', classe_dpe: b?.classe_dpe || 'D', equipements: b?.equipements || '', numero_lot: b?.numero_lot || ''}); if (e.target.value) chargerLots(parseInt(e.target.value)); else { setLotsDisponibles([]); setLotsSelectionnes([]) } }}>
                  <option value="">— Sélectionnez —</option>
                  {biens.map(b => <option key={b.id} value={b.id}>{b.nom} — {b.adresse}</option>)}
                </select>
              </div>
              {lotsDisponibles.length > 0 && (
                <div style={{ marginTop: 12, marginBottom: 14, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 14 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', marginBottom: 10 }}>🏠 Sélectionnez les lots concernés par ce bail</p>
                  {lotsDisponibles.map(lot => (
                    <label key={lot.id} htmlFor={`lot-${lot.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
                      <input type="checkbox" id={`lot-${lot.id}`} checked={lotsSelectionnes.some(l => l.id === lot.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            const nouveauxLots = [...lotsSelectionnes, lot]
                            setLotsSelectionnes(nouveauxLots)
                            const surfaceTotale = nouveauxLots.reduce((acc, l) => acc + (parseFloat(l.surface) || 0), 0)
                            if (surfaceTotale > 0) setForm(f => ({...f, surface_habitable: surfaceTotale.toString()}))
                            setForm(f => ({...f, numero_lot: nouveauxLots.map(l => l.nom).join(', ')}))
                          } else {
                            const nouveauxLots = lotsSelectionnes.filter(l => l.id !== lot.id)
                            setLotsSelectionnes(nouveauxLots)
                            const surfaceTotale = nouveauxLots.reduce((acc, l) => acc + (parseFloat(l.surface) || 0), 0)
                            if (surfaceTotale > 0) setForm(f => ({...f, surface_habitable: surfaceTotale.toString()}))
                            setForm(f => ({...f, numero_lot: nouveauxLots.map(l => l.nom).join(', ')}))
                          }
                        }}
                        style={{ width: 16, height: 16 }} />
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{lot.nom}</span>
                        {lot.surface && <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>{lot.surface} m²</span>}
                        {lot.etage && <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>— {lot.etage}</span>}
                      </div>
                    </label>
                  ))}
                  {lotsSelectionnes.length > 0 && (
                    <div style={{ background: 'white', borderRadius: 8, padding: 10, marginTop: 8, border: '1px solid #bfdbfe' }}>
                      <p style={{ fontSize: 12, color: '#2563eb', margin: 0, fontWeight: 600 }}>
                        ✅ {lotsSelectionnes.length} lot{lotsSelectionnes.length > 1 ? 's' : ''} sélectionné{lotsSelectionnes.length > 1 ? 's' : ''} — Surface totale : {lotsSelectionnes.reduce((acc, l) => acc + (parseFloat(l.surface) || 0), 0)} m²
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Surface (m²)</label><input style={inp} type="number" value={form.surface_habitable} onChange={e => setForm({...form, surface_habitable: e.target.value})} /></div>
                <div><label style={lbl}>Classe DPE</label><select style={inp} value={form.classe_dpe} onChange={e => setForm({...form, classe_dpe: e.target.value})}>{['A','B','C','D','E','F','G'].map(c => <option key={c} value={c}>Classe {c}</option>)}</select></div>
              </div>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Équipements inclus *</label><input style={inp} value={form.equipements} onChange={e => setForm({...form, equipements: e.target.value})} placeholder="Lit, bureau, réfrigérateur..." /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Loyer HC (€) *</label><input style={inp} type="number" value={form.loyer_hc} onChange={e => setForm({...form, loyer_hc: e.target.value})} /></div>
                <div><label style={lbl}>Charges (€)</label><input style={inp} type="number" value={form.charges} onChange={e => setForm({...form, charges: e.target.value})} /></div>
                <div><label style={lbl}>Dépôt (max 2 mois)</label><input style={inp} type="number" value={form.depot_garantie} onChange={e => setForm({...form, depot_garantie: e.target.value})} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Date de début *</label><input style={inp} type="date" value={form.date_debut} onChange={e => setForm({...form, date_debut: e.target.value})} /></div>
                <div><label style={lbl}>Date de fin (auto)</label><input style={inp} value={dateFin} disabled style={{ ...inp, background: '#f9fafb', color: '#6b7280' }} /></div>
              </div>
              <div style={{ marginBottom: 20 }}><label style={lbl}>Clauses particulières</label><textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={form.clauses} onChange={e => setForm({...form, clauses: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEtape(2)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                <button onClick={() => { if (!form.bien_id || !form.loyer_hc || !form.date_debut) { alert('Bien, loyer et date obligatoires.'); return } setEtape(4) }} style={{ flex: 2, background: '#db2777', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Passer à la signature →</button>
              </div>
            </div>
          )}

          {etape === 4 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 8 }}>✍️ Comment souhaitez-vous signer ?</h3>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Choisissez le mode de signature.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                <div onClick={() => setEtape(5)} style={{ background: '#f0fdf4', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center', border: '2px solid transparent' }} onMouseEnter={e => e.currentTarget.style.border = '2px solid #16a34a'} onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
                  <div style={{ fontSize: 32 }}>✍️</div><div><h3 style={{ fontSize: 15, fontWeight: 700, color: '#16a34a', margin: '0 0 3px' }}>Signer maintenant</h3><p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Signature manuscrite.</p></div><div style={{ marginLeft: 'auto', color: '#16a34a', fontSize: 18 }}>→</div>
                </div>
                <div onClick={envoyerVersYousign} style={{ background: '#f5f3ff', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center', border: '2px solid transparent' }} onMouseEnter={e => e.currentTarget.style.border = '2px solid #7c3aed'} onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
                  <div style={{ fontSize: 32 }}>🔏</div><div><h3 style={{ fontSize: 15, fontWeight: 700, color: '#7c3aed', margin: '0 0 3px' }}>Yousign</h3><p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Signature électronique.</p></div><div style={{ marginLeft: 'auto' }}><span style={{ background: '#ede9fe', color: '#7c3aed', padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}></span></div>
                </div>
                <div onClick={sauvegarderBrouillon} style={{ background: '#f9fafb', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center', border: '2px solid transparent' }} onMouseEnter={e => e.currentTarget.style.border = '2px solid #9ca3af'} onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
                  <div style={{ fontSize: 32 }}>⏰</div><div><h3 style={{ fontSize: 15, fontWeight: 700, color: '#6b7280', margin: '0 0 3px' }}>Signer plus tard</h3><p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Brouillon dans Mes Baux.</p></div><div style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 18 }}>→</div>
                </div>
              </div>
              <button onClick={() => setEtape(3)} style={{ width: '100%', background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
            </div>
          )}

          {etape === 5 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>✍️ Signatures</h3>
              {['bailleur', 'locataire'].map(qui => {
                const nom = qui === 'bailleur' ? `${form.bailleur_prenom} ${form.bailleur_nom}` : `${form.locataire_prenom} ${form.locataire_nom}`
                const sig = qui === 'bailleur' ? signatureBailleur : signatureLocataire
                const setSig = qui === 'bailleur' ? setSignatureBailleur : setSignatureLocataire
                return (
                  <div key={qui} style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #e5e7eb' }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 12 }}>{sig ? `✅ ${nom}` : `🖊️ ${qui === 'bailleur' ? 'Bailleur' : 'Étudiant'} — ${nom}`}</p>
                    {!sig || signatureActive === qui ? (
                      <>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                          <input type="checkbox" checked={qui === 'bailleur' ? luApprouveBailleur : luApprouveLocataire} onChange={e => qui === 'bailleur' ? setLuApprouveBailleur(e.target.checked) : setLuApprouveLocataire(e.target.checked)} style={{ width: 16, height: 16 }} />
                          Je certifie avoir <strong>&nbsp;lu et approuvé&nbsp;</strong> le contenu du bail
                        </label>
                        <canvas ref={signatureActive === qui || (!signatureActive && qui === 'bailleur') ? canvasRef : null} onClick={() => setSignatureActive(qui)} onMouseDown={signatureActive === qui ? startDraw : null} onMouseMove={signatureActive === qui ? draw : null} onMouseUp={stopDraw} onMouseLeave={stopDraw} onTouchStart={e => { setSignatureActive(qui); startDraw(e) }} onTouchMove={draw} onTouchEnd={stopDraw} width={520} height={140} style={{ border: `2px dashed ${signatureActive === qui ? '#db2777' : '#d1d5db'}`, borderRadius: 10, width: '100%', height: 140, cursor: 'crosshair', touchAction: 'none', background: '#fafafa', display: 'block' }} />
                        {signatureActive === qui && <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><button onClick={effacer} style={{ flex: 1, background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 13 }}>🗑</button><button onClick={validerSignature} style={{ flex: 2, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>✅ Valider</button></div>}
                        {!signatureActive && !sig && <button onClick={() => setSignatureActive(qui)} style={{ marginTop: 8, background: '#fdf2f8', color: '#db2777', border: '1px solid #fbcfe8', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🖊️ Signer</button>}
                      </>
                    ) : (
                      <div><img src={sig} style={{ border: '1px solid #e5e7eb', borderRadius: 8, width: '100%', height: 80, objectFit: 'contain' }} /><button onClick={() => { setSig(null); setSignatureActive(qui) }} style={{ marginTop: 6, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Recommencer</button></div>
                    )}
                  </div>
                )
              })}
              {(!signatureBailleur || !signatureLocataire || !luApprouveBailleur || !luApprouveLocataire) && (
                <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: 10, marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: '#854d0e', margin: 0 }}>⚠️ Les deux parties doivent signer et cocher « Lu et approuvé » pour finaliser.</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEtape(4)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                <button onClick={finaliserEtSauvegarder} disabled={loading || !signatureBailleur || !signatureLocataire || !luApprouveBailleur || !luApprouveLocataire} style={{ flex: 2, background: (loading || !signatureBailleur || !signatureLocataire || !luApprouveBailleur || !luApprouveLocataire) ? '#86efac' : '#16a34a', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: (loading || !signatureBailleur || !signatureLocataire || !luApprouveBailleur || !luApprouveLocataire) ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15 }}>{loading ? '⏳ Génération...' : '🎉 Finaliser et télécharger'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
