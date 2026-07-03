'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../../supabase'
import jsPDF from 'jspdf'

export default function NouveauBailCommercial() {
  const [user, setUser] = useState(null)
  const [biens, setBiens] = useState([])
  const [loading, setLoading] = useState(false)
  const [etape, setEtape] = useState(1)
  const [plan, setPlan] = useState('')
  const [bailIdExistant, setBailIdExistant] = useState(null)
  const [lotsDisponibles, setLotsDisponibles] = useState([])
const [lotsSelectionnes, setLotsSelectionnes] = useState([])
  const [signatureBailleur, setSignatureBailleur] = useState(null)
  const [signatureLocataire, setSignatureLocataire] = useState(null)
  const [signatureActive, setSignatureActive] = useState(null)
  const [dessin, setDessin] = useState(false)
  const canvasRef = useRef(null)

  const inp = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'white' }
  const lbl = { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }

  const [form, setForm] = useState({
    bailleur_prenom: '', bailleur_nom: '', bailleur_adresse: '',
    bailleur_naissance: '', bailleur_lieu_naissance: '', bailleur_nationalite: 'Française',
    locataire_prenom: '', locataire_nom: '', locataire_email: '',
    locataire_telephone: '', locataire_naissance: '', locataire_nationalite: 'Française',
    locataire_profession: '', locataire_adresse: '',
    // Champs spécifiques commercial
    denomination_sociale: '', forme_juridique: '', siret: '',
    destination_locaux: '', // activité autorisée
    bien_id: '', surface_habitable: '', etage: '', numero_lot: '',
    loyer_hc: '', charges: '', type_charges: 'Forfaitaires',
    depot_garantie: '', modalite_paiement: 'Virement bancaire',
    date_exigibilite: '1',
    indexation: 'ILC', // ILC ou ILAT
    tva_applicable: false,
    date_debut: '', date_fin: '', clauses: '',
  })

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) { window.location.href = '/auth'; return }
      const { data: customer } = await supabase.from('customers').select('plan').eq('user_id', data.user.id).single()
      if (!customer || customer.plan === 'gratuit') { window.location.href = '/biens?plan=gratuit'; return }
      setUser(data.user)
      setPlan(customer.plan)
      const { data: biensData } = await supabase.from('Biens').select('*').eq('user_id', data.user.id)
      setBiens(biensData || [])
      const params = new URLSearchParams(window.location.search)
      const bailId = params.get('id')
      const sign = params.get('sign')
      if (bailId) {
        const { data: bail } = await supabase.from('Baux').select('*').eq('id', parseInt(bailId)).single()
        if (bail) {
          setForm({
            bailleur_prenom: bail.bailleur_prenom || '', bailleur_nom: bail.bailleur_nom || '',
            bailleur_adresse: bail.bailleur_adresse || '', bailleur_naissance: bail.bailleur_naissance || '',
            bailleur_lieu_naissance: bail.bailleur_lieu_naissance || '', bailleur_nationalite: bail.bailleur_nationalite || 'Française',
            locataire_prenom: bail.locataire_prenom || '', locataire_nom: bail.locataire_nom || '',
            locataire_email: bail.locataire_email || '', locataire_telephone: bail.locataire_telephone || '',
            locataire_naissance: bail.locataire_naissance || '', locataire_nationalite: bail.locataire_nationalite || 'Française',
            locataire_profession: bail.locataire_profession || '', locataire_adresse: bail.locataire_adresse || '',
            denomination_sociale: bail.denomination_sociale || '', forme_juridique: bail.forme_juridique || '',
            siret: bail.siret || '', destination_locaux: bail.destination_locaux || '',
            bien_id: bail.bien_id?.toString() || '', surface_habitable: bail.surface_habitable?.toString() || '',
            etage: bail.etage || '', numero_lot: bail.numero_lot || '',
            loyer_hc: bail.loyer_hc?.toString() || '', charges: bail.charges?.toString() || '',
            type_charges: bail.type_charges || 'Forfaitaires', depot_garantie: bail.depot_garantie?.toString() || '',
            modalite_paiement: bail.modalite_paiement || 'Virement bancaire',
            date_exigibilite: bail.date_exigibilite?.toString() || '1',
            indexation: bail.indexation || 'ILC', tva_applicable: bail.tva_applicable || false,
            date_debut: bail.date_debut || '', date_fin: bail.date_fin || '', clauses: bail.clauses || '',
          })
          setBailIdExistant(parseInt(bailId))
          if (sign === 'true') setEtape(5)
        }
      }
    })
  }, [])

  function startDraw(e) {
    setDessin(true)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.beginPath(); ctx.moveTo(x, y)
  }
  function draw(e) {
    if (!dessin) return; e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.lineTo(x, y); ctx.stroke()
  }
  function stopDraw() { setDessin(false) }
  function effacer() { canvasRef.current.getContext('2d').clearRect(0, 0, 520, 140) }
  function validerSignature() {
    const dataUrl = canvasRef.current.toDataURL('image/png')
    if (signatureActive === 'bailleur') setSignatureBailleur(dataUrl)
    else setSignatureLocataire(dataUrl)
    setSignatureActive(null); effacer()
  }

async function chargerLots(bienId) {
  const { data } = await supabase.from('lots').select('*').eq('bien_id', bienId)
  setLotsDisponibles(data || [])
  setLotsSelectionnes([])
}

  function sanitize(nom) {
    return (nom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
  }

  const bienSel = biens.find(b => b.id === parseInt(form.bien_id))

  async function sauvegarderBrouillon() {
    setLoading(true)
    const bailData = {
      user_id: user.id, bien_id: parseInt(form.bien_id) || null,
      type_bail: 'Commercial (3-6-9)',
      loyer_hc: parseFloat(form.loyer_hc) || 0, charges: parseFloat(form.charges) || 0,
      type_charges: form.type_charges, depot_garantie: parseFloat(form.depot_garantie) || 0,
      date_debut: form.date_debut || null, date_fin: form.date_fin || null,
      date_exigibilite: parseInt(form.date_exigibilite) || 1,
      modalite_paiement: form.modalite_paiement, clauses: form.clauses,
      bailleur_prenom: form.bailleur_prenom, bailleur_nom: form.bailleur_nom,
      bailleur_adresse: form.bailleur_adresse, bailleur_naissance: form.bailleur_naissance || null,
      bailleur_lieu_naissance: form.bailleur_lieu_naissance, bailleur_nationalite: form.bailleur_nationalite,
      locataire_prenom: form.locataire_prenom, locataire_nom: form.locataire_nom,
      locataire_email: form.locataire_email, locataire_telephone: form.locataire_telephone,
      locataire_naissance: form.locataire_naissance || null, locataire_nationalite: form.locataire_nationalite,
      locataire_profession: form.locataire_profession, locataire_adresse: form.locataire_adresse,
      surface_habitable: parseFloat(form.surface_habitable) || null,
      etage: form.etage, numero_lot: form.numero_lot,
      statut: 'brouillon',
    }
    if (bailIdExistant) {
      await supabase.from('Baux').update(bailData).eq('id', bailIdExistant)
    } else {
      await supabase.from('Baux').insert(bailData)
    }
    setLoading(false)
    window.location.href = '/baux'
  }

  async function finaliserEtSauvegarder() {
    setLoading(true)
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const pageW = 210, margin = 20, contenuW = pageW - margin * 2
      let y = 20
      const checkPage = () => { if (y > 270) { doc.addPage(); y = 20 } }
      const titre = (texte) => {
        checkPage()
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(234, 88, 12)
        doc.text(texte, margin, y); y += 2
        doc.setDrawColor(234, 88, 12); doc.setLineWidth(0.4)
        doc.line(margin, y, pageW - margin, y); y += 6; doc.setTextColor(0, 0, 0)
      }
      const ligne = (label, valeur) => {
        if (!valeur) return; checkPage()
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

      doc.setFillColor(234, 88, 12); doc.rect(0, 0, 210, 20, 'F')
      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
      doc.text('BAIL COMMERCIAL (3-6-9)', pageW / 2, 10, { align: 'center' })
      doc.setFontSize(9)
      doc.text('Loi du 30 septembre 1953 — Statut des baux commerciaux', pageW / 2, 16, { align: 'center' })
      y = 28; doc.setTextColor(0, 0, 0)

      titre('ARTICLE 1 — LE BAILLEUR')
      ligne('Nom et prénom :', `${form.bailleur_prenom} ${form.bailleur_nom}`)
      ligne('Date de naissance :', form.bailleur_naissance ? new Date(form.bailleur_naissance).toLocaleDateString('fr-FR') : null)
      ligne('Lieu de naissance :', form.bailleur_lieu_naissance)
      ligne('Nationalité :', form.bailleur_nationalite)
      ligne('Adresse :', form.bailleur_adresse); saut()

      titre('ARTICLE 2 — LE PRENEUR (LOCATAIRE)')
      ligne('Nom et prénom :', `${form.locataire_prenom} ${form.locataire_nom}`)
      if (form.denomination_sociale) ligne('Dénomination sociale :', form.denomination_sociale)
      if (form.forme_juridique) ligne('Forme juridique :', form.forme_juridique)
      if (form.siret) ligne('N° SIRET :', form.siret)
      ligne('Adresse du siège :', form.locataire_adresse)
      ligne('Email :', form.locataire_email)
      ligne('Téléphone :', form.locataire_telephone); saut()

      titre('ARTICLE 3 — DÉSIGNATION DES LOCAUX')
      ligne('Adresse :', bienSel?.adresse)
      ligne('Surface :', form.surface_habitable ? `${form.surface_habitable} m²` : null)
      ligne('Étage / Bâtiment :', form.etage)
      ligne('Numéro de lot :', form.numero_lot)
      ligne('Destination des locaux :', form.destination_locaux); saut()

      titre('ARTICLE 4 — DURÉE DU BAIL')
      ligne('Date de début :', form.date_debut ? new Date(form.date_debut).toLocaleDateString('fr-FR') : null)
      ligne('Date de fin :', form.date_fin ? new Date(form.date_fin).toLocaleDateString('fr-FR') : `Fin de période 9 ans`)
      texte("Le présent bail est conclu pour une durée de 9 ans conformément au statut des baux commerciaux (loi du 30 septembre 1953). Le preneur a la faculté de résilier à l'expiration de chaque période triennale (3 ans, 6 ans) moyennant un préavis de 6 mois par acte d'huissier.")

      titre('ARTICLE 5 — LOYER ET CONDITIONS FINANCIÈRES')
      const loyerHT = parseFloat(form.loyer_hc) || 0
      const loyerTTC = form.tva_applicable ? loyerHT * 1.2 : loyerHT
      ligne('Loyer annuel HT :', `${(loyerHT * 12).toFixed(2)} €`)
      ligne('Loyer mensuel HT :', `${loyerHT} €`)
      if (form.tva_applicable) ligne('TVA (20%) :', `${(loyerHT * 0.2).toFixed(2)} € / mois`)
      if (form.tva_applicable) ligne('Loyer mensuel TTC :', `${loyerTTC.toFixed(2)} €`)
      ligne('Charges :', form.charges ? `${form.charges} € / mois` : null)
      ligne('Dépôt de garantie :', form.depot_garantie ? `${form.depot_garantie} €` : null)
      ligne('Modalité de paiement :', form.modalite_paiement)
      ligne("Date d'exigibilité :", `Le ${form.date_exigibilite} de chaque mois`)
      ligne('Indexation :', `Indice ${form.indexation} (INSEE)`); saut()

      titre('ARTICLE 6 — RÉVISION DU LOYER')
      texte(`Le loyer sera révisé chaque année à la date anniversaire du bail en fonction de la variation de l'indice ${form.indexation} (${form.indexation === 'ILC' ? "Indice des Loyers Commerciaux" : "Indice des Loyers des Activités Tertiaires"}) publié par l'INSEE.`)

      titre('ARTICLE 7 — DESTINATION DES LOCAUX')
      texte(`Les locaux sont loués exclusivement pour l'exercice de l'activité suivante : ${form.destination_locaux || '(à préciser)'}. Toute modification de destination devra faire l'objet d'une autorisation écrite préalable du bailleur.`)

      titre('ARTICLE 8 — OBLIGATIONS DU BAILLEUR')
      texte("Le bailleur s'engage à délivrer les locaux en bon état, assurer la jouissance paisible, effectuer les grosses réparations (article 606 du Code civil), et maintenir les locaux conformes à leur destination.")

      titre('ARTICLE 9 — OBLIGATIONS DU PRENEUR')
      texte("Le preneur s'engage à : payer le loyer aux termes convenus, exploiter les locaux conformément à la destination autorisée, entretenir les locaux et effectuer les réparations locatives, souscrire les assurances nécessaires, ne pas céder le bail sans accord du bailleur sauf dans le cadre d'une cession de fonds de commerce.")

      titre('ARTICLE 10 — DÉPÔT DE GARANTIE')
      texte(`Un dépôt de garantie de ${form.depot_garantie || 0} € est versé à la signature. Il sera restitué dans les 2 mois suivant la restitution des clés, déduction faite des sommes dues par le preneur.`)

      if (form.clauses?.trim()) {
        titre('ARTICLE 11 — CLAUSES PARTICULIÈRES')
        texte(form.clauses)
      }

      if (y > 220) { doc.addPage(); y = 20 }
      saut(8); titre('SIGNATURES')
      doc.setFontSize(9); doc.setFont('helvetica', 'normal')
      doc.text(`Fait en deux exemplaires originaux, le ${new Date().toLocaleDateString('fr-FR')}`, margin, y); y += 12
      doc.setFont('helvetica', 'bold')
      doc.text('Le Bailleur', margin, y); doc.text('Le Preneur', pageW / 2 + 5, y); y += 4
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
      doc.text(`${form.bailleur_prenom} ${form.bailleur_nom}`, margin, y)
      doc.text(`${form.locataire_prenom} ${form.locataire_nom}`, pageW / 2 + 5, y); y += 2
      doc.text('(Précédé de "Lu et approuvé")', margin, y)
      doc.text('(Précédé de "Lu et approuvé")', pageW / 2 + 5, y); y += 4
      doc.setDrawColor(180, 180, 180)
      doc.rect(margin, y, 80, 38); doc.rect(pageW / 2 + 5, y, 80, 38)
      if (signatureBailleur) doc.addImage(signatureBailleur, 'PNG', margin + 1, y + 1, 78, 36)
      if (signatureLocataire) doc.addImage(signatureLocataire, 'PNG', pageW / 2 + 6, y + 1, 78, 36)
      y += 44
      doc.setFontSize(7); doc.setTextColor(150, 150, 150)
      doc.text('Document généré par GestionLocative — Statut des baux commerciaux — Loi du 30 septembre 1953', pageW / 2, y, { align: 'center' })

      const nomFichier = `Bail_Commercial_${sanitize(form.locataire_nom)}_${sanitize(form.bailleur_nom)}_${form.date_debut || 'date'}.pdf`
      doc.save(nomFichier)

      const pdfBlob = doc.output('blob')
      const cheminStorage = `baux/${user.id}/${Date.now()}_${nomFichier}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(cheminStorage, pdfBlob, { contentType: 'application/pdf' })
      let bailPdfUrl = null
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(cheminStorage)
        bailPdfUrl = urlData.publicUrl
        await supabase.from('Documents').insert({
          user_id: user.id, bien_id: parseInt(form.bien_id),
          nom_fichier: nomFichier, categorie: 'Bail', url: bailPdfUrl,
          storage_path: cheminStorage, annee: form.date_debut ? new Date(form.date_debut).getFullYear() : new Date().getFullYear(),
        })
      }

      const bailData = {
        user_id: user.id, bien_id: parseInt(form.bien_id),
        type_bail: 'Commercial (3-6-9)',
        loyer_hc: parseFloat(form.loyer_hc), charges: parseFloat(form.charges) || 0,
        type_charges: form.type_charges, depot_garantie: parseFloat(form.depot_garantie) || 0,
        date_debut: form.date_debut || null, date_fin: form.date_fin || null,
        date_exigibilite: parseInt(form.date_exigibilite) || 1,
        modalite_paiement: form.modalite_paiement, clauses: form.clauses,
        bailleur_prenom: form.bailleur_prenom, bailleur_nom: form.bailleur_nom,
        bailleur_adresse: form.bailleur_adresse, bailleur_naissance: form.bailleur_naissance || null,
        bailleur_lieu_naissance: form.bailleur_lieu_naissance, bailleur_nationalite: form.bailleur_nationalite,
        locataire_prenom: form.locataire_prenom, locataire_nom: form.locataire_nom,
        locataire_email: form.locataire_email, locataire_telephone: form.locataire_telephone,
        locataire_naissance: form.locataire_naissance || null, locataire_nationalite: form.locataire_nationalite,
        locataire_profession: form.locataire_profession, locataire_adresse: form.locataire_adresse,
        surface_habitable: parseFloat(form.surface_habitable) || null,
        etage: form.etage, numero_lot: form.numero_lot,
        signature_bailleur: signatureBailleur, signature_locataire: signatureLocataire,
        statut: 'actif',
        ...(bailPdfUrl && { bail_pdf_url: bailPdfUrl }),
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
      await fetch('/api/sync-quantity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) }).catch(() => {})
      setLoading(false)
      window.location.href = `/baux/${bail.id}`
    } catch (err) { alert('Erreur : ' + err.message); setLoading(false) }
  }

  const etapes = ['Bailleur', 'Preneur', 'Locaux & loyer', 'Dates', 'Signature']

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <button onClick={() => etape === 1 ? window.location.href = '/baux/nouveau' : setEtape(etape - 1)}
          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>← Retour</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ background: '#fff7ed', color: '#ea580c', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>🏢 Commercial (3-6-9)</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Nouveau bail commercial</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 28 }}>Loi du 30 septembre 1953 — Durée 9 ans — Résiliation triennale</p>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          {etapes.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < etapes.length - 1 ? 1 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, background: etape === i+1 ? '#ea580c' : etape > i+1 ? '#16a34a' : '#e5e7eb', color: etape >= i+1 ? 'white' : '#9ca3af' }}>
                  {etape > i+1 ? '✓' : i+1}
                </div>
                <span style={{ fontSize: 11, color: etape === i+1 ? '#ea580c' : '#9ca3af', fontWeight: 500, whiteSpace: 'nowrap' }}>{e}</span>
              </div>
              {i < etapes.length - 1 && <div style={{ flex: 1, height: 2, background: etape > i+1 ? '#16a34a' : '#e5e7eb', margin: '0 6px', marginBottom: 20 }} />}
            </div>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>

          {/* ÉTAPE 1 — BAILLEUR */}
          {etape === 1 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>👤 Informations bailleur</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Prénom *</label><input style={inp} value={form.bailleur_prenom} onChange={e => setForm({...form, bailleur_prenom: e.target.value})} placeholder="Prénom" /></div>
                <div><label style={lbl}>Nom *</label><input style={inp} value={form.bailleur_nom} onChange={e => setForm({...form, bailleur_nom: e.target.value})} placeholder="Nom" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Date de naissance</label><input style={inp} type="date" value={form.bailleur_naissance} onChange={e => setForm({...form, bailleur_naissance: e.target.value})} /></div>
                <div><label style={lbl}>Lieu de naissance</label><input style={inp} value={form.bailleur_lieu_naissance} onChange={e => setForm({...form, bailleur_lieu_naissance: e.target.value})} placeholder="Paris, France" /></div>
              </div>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Nationalité</label><input style={inp} value={form.bailleur_nationalite} onChange={e => setForm({...form, bailleur_nationalite: e.target.value})} /></div>
              <div style={{ marginBottom: 24 }}><label style={lbl}>Adresse complète *</label><input style={inp} value={form.bailleur_adresse} onChange={e => setForm({...form, bailleur_adresse: e.target.value})} placeholder="12 rue de la Paix, 75001 Paris" /></div>
              <button onClick={() => { if (!form.bailleur_prenom || !form.bailleur_nom || !form.bailleur_adresse) { alert('Prénom, nom et adresse obligatoires.'); return } setEtape(2) }}
                style={{ width: '100%', background: '#ea580c', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>
                Suivant → Preneur
              </button>
            </div>
          )}

          {/* ÉTAPE 2 — PRENEUR */}
          {etape === 2 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>🏢 Informations du preneur</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Prénom *</label><input style={inp} value={form.locataire_prenom} onChange={e => setForm({...form, locataire_prenom: e.target.value})} placeholder="Prénom du gérant" /></div>
                <div><label style={lbl}>Nom *</label><input style={inp} value={form.locataire_nom} onChange={e => setForm({...form, locataire_nom: e.target.value})} placeholder="Nom du gérant" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Dénomination sociale</label><input style={inp} value={form.denomination_sociale} onChange={e => setForm({...form, denomination_sociale: e.target.value})} placeholder="Ma Société SAS" /></div>
                <div><label style={lbl}>Forme juridique</label><input style={inp} value={form.forme_juridique} onChange={e => setForm({...form, forme_juridique: e.target.value})} placeholder="SAS, SARL, EI..." /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>N° SIRET</label><input style={inp} value={form.siret} onChange={e => setForm({...form, siret: e.target.value})} placeholder="000 000 000 00000" /></div>
                <div><label style={lbl}>Email *</label><input style={inp} type="email" value={form.locataire_email} onChange={e => setForm({...form, locataire_email: e.target.value})} placeholder="email@societe.com" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Téléphone</label><input style={inp} value={form.locataire_telephone} onChange={e => setForm({...form, locataire_telephone: e.target.value})} placeholder="06 00 00 00 00" /></div>
                <div><label style={lbl}>Adresse du siège</label><input style={inp} value={form.locataire_adresse} onChange={e => setForm({...form, locataire_adresse: e.target.value})} placeholder="Adresse siège social" /></div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Destination / Activité autorisée *</label>
                <input style={inp} value={form.destination_locaux} onChange={e => setForm({...form, destination_locaux: e.target.value})} placeholder="Ex : Commerce de détail alimentaire, Restauration rapide, Bureau..." />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEtape(1)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                <button onClick={() => { if (!form.locataire_prenom || !form.locataire_nom || !form.locataire_email || !form.destination_locaux) { alert('Prénom, nom, email et destination obligatoires.'); return } setEtape(3) }}
                  style={{ flex: 2, background: '#ea580c', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>
                  Suivant → Locaux & loyer
                </button>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 — LOCAUX & LOYER */}
          {etape === 3 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>🏢 Locaux & conditions financières</h3>
              <div style={{ marginBottom: 14 }}>
  <label style={lbl}>Bien concerné *</label>
  <select style={inp} value={form.bien_id} onChange={e => {
    const b = biens.find(b => b.id === parseInt(e.target.value))
    setForm({...form, bien_id: e.target.value, surface_habitable: b?.surface?.toString() || '', etage: b?.etage || '', numero_lot: b?.numero_lot || ''})
    if (e.target.value) chargerLots(parseInt(e.target.value))
    else { setLotsDisponibles([]); setLotsSelectionnes([]) }
  }}>
                  <option value="">— Sélectionnez un bien —</option>
                  {biens.map(b => <option key={b.id} value={b.id}>{b.nom} — {b.adresse}</option>)}
                </select>
              </div>
              {lotsDisponibles.length > 0 && (
  <div style={{ marginTop: 12, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: 14 }}>
    <p style={{ fontSize: 13, fontWeight: 700, color: '#ea580c', marginBottom: 10 }}>🏢 Sélectionnez les lots concernés par ce bail</p>
    {lotsDisponibles.map(lot => (
      <label key={lot.id || lot.nom} htmlFor={`lot-${lot.id || lot.nom}`} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
        <input type="checkbox"
  id={`lot-${lot.id || lot.nom}`}
  checked={lotsSelectionnes.some(l => l.id === lot.id)}
          onChange={e => {
            if (e.target.checked) {
              const nouveauxLots = [...lotsSelectionnes, lot]
              setLotsSelectionnes(nouveauxLots)
              // Calcul auto surface totale
              const surfaceTotale = nouveauxLots.reduce((acc, l) => acc + (parseFloat(l.surface) || 0), 0)
              if (surfaceTotale > 0) setForm(f => ({...f, surface_habitable: surfaceTotale.toString()}))
              // Concat les noms de lots
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
      <div style={{ background: 'white', borderRadius: 8, padding: 10, marginTop: 8, border: '1px solid #fed7aa' }}>
        <p style={{ fontSize: 12, color: '#ea580c', margin: 0, fontWeight: 600 }}>
          ✅ {lotsSelectionnes.length} lot{lotsSelectionnes.length > 1 ? 's' : ''} sélectionné{lotsSelectionnes.length > 1 ? 's' : ''} — Surface totale : {lotsSelectionnes.reduce((acc, l) => acc + (parseFloat(l.surface) || 0), 0)} m²
        </p>
      </div>
    )}
  </div>
)}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Surface (m²)</label><input style={inp} type="number" value={form.surface_habitable} onChange={e => setForm({...form, surface_habitable: e.target.value})} placeholder="120" /></div>
                <div><label style={lbl}>Étage / Bât.</label><input style={inp} value={form.etage} onChange={e => setForm({...form, etage: e.target.value})} placeholder="RDC" /></div>
                <div><label style={lbl}>Numéro de lot</label><input style={inp} value={form.numero_lot} onChange={e => setForm({...form, numero_lot: e.target.value})} placeholder="Lot 1" /></div>
              </div>
              {/* TVA */}
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={form.tva_applicable} onChange={e => setForm({...form, tva_applicable: e.target.checked})} style={{ width: 16, height: 16 }} />
                  <label style={{ fontSize: 13, color: '#ea580c', fontWeight: 600 }}>TVA applicable sur le loyer (option à la TVA)</label>
                </div>
                {form.tva_applicable && <p style={{ fontSize: 12, color: '#9a3412', margin: '6px 0 0' }}>Le loyer sera soumis à TVA à 20%. Le preneur pourra la déduire s'il est assujetti.</p>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Loyer mensuel HT (€) *</label><input style={inp} type="number" value={form.loyer_hc} onChange={e => setForm({...form, loyer_hc: e.target.value})} placeholder="2000" /></div>
                <div><label style={lbl}>Charges (€/mois)</label><input style={inp} type="number" value={form.charges} onChange={e => setForm({...form, charges: e.target.value})} placeholder="300" /></div>
                <div><label style={lbl}>Dépôt de garantie (€)</label><input style={inp} type="number" value={form.depot_garantie} onChange={e => setForm({...form, depot_garantie: e.target.value})} placeholder="6000" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Indice de révision</label>
                  <select style={inp} value={form.indexation} onChange={e => setForm({...form, indexation: e.target.value})}>
                    <option value="ILC">ILC — Indice des Loyers Commerciaux</option>
                    <option value="ILAT">ILAT — Indice des Loyers des Activités Tertiaires</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Modalité de paiement</label>
                  <select style={inp} value={form.modalite_paiement} onChange={e => setForm({...form, modalite_paiement: e.target.value})}>
                    <option>Virement bancaire</option><option>Chèque</option><option>Prélèvement automatique</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Jour d'exigibilité</label>
                <select style={inp} value={form.date_exigibilite} onChange={e => setForm({...form, date_exigibilite: e.target.value})}>
                  {[1,5,10,15,20,25].map(j => <option key={j} value={j}>Le {j} du mois</option>)}
                </select>
              </div>
              {form.loyer_hc && (
                <div style={{ background: '#fff7ed', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid #fed7aa' }}>
                  <p style={{ fontSize: 13, color: '#ea580c', margin: 0 }}>
                    Loyer mensuel HT : <strong>{form.loyer_hc}€</strong>
                    {form.tva_applicable && ` + TVA : ${(parseFloat(form.loyer_hc) * 0.2).toFixed(2)}€ = TTC : ${(parseFloat(form.loyer_hc) * 1.2).toFixed(2)}€`}
                    {' '}— Loyer annuel : <strong>{(parseFloat(form.loyer_hc) * 12).toFixed(2)}€ HT</strong>
                  </p>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEtape(2)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                <button onClick={() => { if (!form.bien_id || !form.loyer_hc) { alert('Bien et loyer obligatoires.'); return } setEtape(4) }}
                  style={{ flex: 2, background: '#ea580c', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>
                  Suivant → Dates
                </button>
              </div>
            </div>
          )}

          {/* ÉTAPE 4 — DATES */}
          {etape === 4 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>📅 Dates & clauses</h3>
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: '#ea580c', margin: 0 }}>ℹ️ Le bail commercial est conclu pour <strong>9 ans minimum</strong>. Le preneur peut résilier à 3 ans et 6 ans avec un préavis de 6 mois.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Date de début *</label>
                  <input style={inp} type="date" value={form.date_debut} onChange={e => setForm({...form, date_debut: e.target.value})} />
                </div>
                <div>
                  <label style={lbl}>Date de fin (9 ans)</label>
                  <input style={inp} type="date" value={form.date_fin} onChange={e => setForm({...form, date_fin: e.target.value})} />
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Calculée automatiquement à 9 ans si vide</p>
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={lbl}>Clauses particulières</label>
                <textarea style={{ ...inp, minHeight: 100, resize: 'vertical' }} value={form.clauses} onChange={e => setForm({...form, clauses: e.target.value})} placeholder="Ex : travaux d'aménagement autorisés, enseigne, sous-location..." />
              </div>
              {bienSel && form.loyer_hc && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#15803d' }}>✅ Récapitulatif</p>
                  <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}><b>Bailleur :</b> {form.bailleur_prenom} {form.bailleur_nom}</p>
                  <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}><b>Preneur :</b> {form.locataire_prenom} {form.locataire_nom} {form.denomination_sociale && `(${form.denomination_sociale})`}</p>
                  <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}><b>Locaux :</b> {bienSel.nom} — {form.surface_habitable}m²</p>
                  <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}><b>Loyer :</b> {form.loyer_hc}€ HT/mois — Indice {form.indexation}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#374151' }}><b>Début :</b> {form.date_debut ? new Date(form.date_debut).toLocaleDateString('fr-FR') : '—'}</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEtape(3)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                <button onClick={() => { if (!form.date_debut) { alert('Date de début obligatoire.'); return } setEtape(5) }}
                  style={{ flex: 2, background: '#ea580c', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>
                  Passer à la signature →
                </button>
              </div>
            </div>
          )}

          {/* ÉTAPE 5 — CHOIX SIGNATURE */}
          {etape === 5 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 8 }}>✍️ Comment souhaitez-vous signer ?</h3>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Choisissez le mode de signature pour ce bail.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                <div onClick={() => setEtape(6)} style={{ background: '#f0fdf4', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center', border: '2px solid transparent' }} onMouseEnter={e => e.currentTarget.style.border = '2px solid #16a34a'} onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
                  <div style={{ fontSize: 32 }}>✍️</div>
                  <div><h3 style={{ fontSize: 15, fontWeight: 700, color: '#16a34a', margin: '0 0 3px' }}>Signer maintenant</h3><p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Signature manuscrite sur tablette ou écran.</p></div>
                  <div style={{ marginLeft: 'auto', color: '#16a34a', fontSize: 18 }}>→</div>
                </div>
                <div onClick={() => alert('Yousign — bientôt disponible !')} style={{ background: '#f5f3ff', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center', border: '2px solid transparent' }} onMouseEnter={e => e.currentTarget.style.border = '2px solid #7c3aed'} onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
                  <div style={{ fontSize: 32 }}>🔏</div>
                  <div><h3 style={{ fontSize: 15, fontWeight: 700, color: '#7c3aed', margin: '0 0 3px' }}>Signature électronique via Yousign</h3><p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Envoi par email — valeur juridique.</p></div>
                  <div style={{ marginLeft: 'auto' }}><span style={{ background: '#ede9fe', color: '#7c3aed', padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>Bientôt</span></div>
                </div>
                <div onClick={sauvegarderBrouillon} style={{ background: '#f9fafb', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center', border: '2px solid transparent' }} onMouseEnter={e => e.currentTarget.style.border = '2px solid #9ca3af'} onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
                  <div style={{ fontSize: 32 }}>⏰</div>
                  <div><h3 style={{ fontSize: 15, fontWeight: 700, color: '#6b7280', margin: '0 0 3px' }}>Signer plus tard</h3><p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Sauvegardé en brouillon dans Mes Baux.</p></div>
                  <div style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 18 }}>→</div>
                </div>
              </div>
              <button onClick={() => setEtape(4)} style={{ width: '100%', background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
            </div>
          )}

          {/* ÉTAPE 6 — SIGNATURE MANUSCRITE */}
          {etape === 6 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>✍️ Signatures</h3>
              {['bailleur', 'locataire'].map(qui => {
                const nom = qui === 'bailleur' ? `${form.bailleur_prenom} ${form.bailleur_nom}` : `${form.locataire_prenom} ${form.locataire_nom}`
                const sig = qui === 'bailleur' ? signatureBailleur : signatureLocataire
                const setSig = qui === 'bailleur' ? setSignatureBailleur : setSignatureLocataire
                return (
                  <div key={qui} style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #e5e7eb' }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 12 }}>
                      {sig ? `✅ ${nom} (${qui === 'bailleur' ? 'bailleur' : 'preneur'})` : `🖊️ Signature ${qui === 'bailleur' ? 'du bailleur' : 'du preneur'} — ${nom}`}
                    </p>
                    {!sig || signatureActive === qui ? (
                      <>
                        <canvas ref={signatureActive === qui || (!signatureActive && qui === 'bailleur') ? canvasRef : null}
                          onClick={() => setSignatureActive(qui)}
                          onMouseDown={signatureActive === qui ? startDraw : null}
                          onMouseMove={signatureActive === qui ? draw : null}
                          onMouseUp={stopDraw} onMouseLeave={stopDraw}
                          onTouchStart={e => { setSignatureActive(qui); startDraw(e) }}
                          onTouchMove={draw} onTouchEnd={stopDraw}
                          width={520} height={140}
                          style={{ border: `2px dashed ${signatureActive === qui ? '#ea580c' : '#d1d5db'}`, borderRadius: 10, width: '100%', height: 140, cursor: 'crosshair', touchAction: 'none', background: '#fafafa', display: 'block' }} />
                        {signatureActive === qui && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button onClick={effacer} style={{ flex: 1, background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 13 }}>🗑 Effacer</button>
                            <button onClick={validerSignature} style={{ flex: 2, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>✅ Valider</button>
                          </div>
                        )}
                        {!signatureActive && !sig && (
                          <button onClick={() => setSignatureActive(qui)} style={{ marginTop: 8, background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🖊️ Signer ici</button>
                        )}
                      </>
                    ) : (
                      <div>
                        <img src={sig} style={{ border: '1px solid #e5e7eb', borderRadius: 8, width: '100%', height: 80, objectFit: 'contain' }} alt={`Signature ${qui}`} />
                        <button onClick={() => { setSig(null); setSignatureActive(qui) }} style={{ marginTop: 6, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Recommencer</button>
                      </div>
                    )}
                  </div>
                )
              })}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEtape(5)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                <button onClick={finaliserEtSauvegarder} disabled={loading}
                  style={{ flex: 2, background: loading ? '#86efac' : '#16a34a', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15 }}>
                  {loading ? '⏳ Génération du bail...' : '🎉 Finaliser et télécharger'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
