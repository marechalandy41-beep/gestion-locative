'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../../supabase'
import jsPDF from 'jspdf'

export default function NouveauBailAutre() {
  const [user, setUser] = useState(null)
  const [biens, setBiens] = useState([])
  const [loading, setLoading] = useState(false)
  const [etape, setEtape] = useState(1)
  const [bailIdExistant, setBailIdExistant] = useState(null)
  const [signatureBailleur, setSignatureBailleur] = useState(null)
  const [signatureLocataire, setSignatureLocataire] = useState(null)
  const [signatureActive, setSignatureActive] = useState(null)
  const [dessin, setDessin] = useState(false)
  const canvasRef = useRef(null)

  const inp = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'white' }
  const lbl = { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }

  const [form, setForm] = useState({
    bailleur_prenom: '', bailleur_nom: '', bailleur_adresse: '',
    locataire_prenom: '', locataire_nom: '', locataire_email: '', locataire_telephone: '', locataire_adresse: '',
    type_location: '', description_bien: '',
    bien_id: '',
    loyer_hc: '', charges: '', depot_garantie: '',
    modalite_paiement: 'Virement bancaire', date_exigibilite: '1',
    date_debut: '', date_fin: '', preavis_mois: '1', clauses: '',
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
          setForm({ bailleur_prenom: bail.bailleur_prenom || '', bailleur_nom: bail.bailleur_nom || '', bailleur_adresse: bail.bailleur_adresse || '', locataire_prenom: bail.locataire_prenom || '', locataire_nom: bail.locataire_nom || '', locataire_email: bail.locataire_email || '', locataire_telephone: bail.locataire_telephone || '', locataire_adresse: bail.locataire_adresse || '', type_location: bail.type_bail || '', description_bien: bail.equipements || '', bien_id: bail.bien_id?.toString() || '', loyer_hc: bail.loyer_hc?.toString() || '', charges: bail.charges?.toString() || '', depot_garantie: bail.depot_garantie?.toString() || '', modalite_paiement: bail.modalite_paiement || 'Virement bancaire', date_exigibilite: bail.date_exigibilite?.toString() || '1', date_debut: bail.date_debut || '', date_fin: bail.date_fin || '', preavis_mois: '1', clauses: bail.clauses || '' })
          setBailIdExistant(parseInt(bailId))
          if (params.get('sign') === 'true') setEtape(3)
        }
      }
    })
  }, [])

  function startDraw(e) { setDessin(true); const ctx = canvasRef.current.getContext('2d'); const rect = canvasRef.current.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo((e.touches ? e.touches[0].clientX : e.clientX) - rect.left, (e.touches ? e.touches[0].clientY : e.clientY) - rect.top) }
  function draw(e) { if (!dessin) return; e.preventDefault(); const ctx = canvasRef.current.getContext('2d'); ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; const rect = canvasRef.current.getBoundingClientRect(); ctx.lineTo((e.touches ? e.touches[0].clientX : e.clientX) - rect.left, (e.touches ? e.touches[0].clientY : e.clientY) - rect.top); ctx.stroke() }
  function stopDraw() { setDessin(false) }
  function effacer() { canvasRef.current.getContext('2d').clearRect(0, 0, 520, 140) }
  function validerSignature() { const d = canvasRef.current.toDataURL('image/png'); if (signatureActive === 'bailleur') setSignatureBailleur(d); else setSignatureLocataire(d); setSignatureActive(null); effacer() }
  function sanitize(n) { return (n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_') }
  const bienSel = biens.find(b => b.id === parseInt(form.bien_id))

  async function sauvegarderBrouillon() {
    setLoading(true)
    const bailData = { user_id: user.id, bien_id: parseInt(form.bien_id) || null, type_bail: 'Autre', loyer_hc: parseFloat(form.loyer_hc) || 0, charges: parseFloat(form.charges) || 0, depot_garantie: parseFloat(form.depot_garantie) || 0, date_debut: form.date_debut || null, date_fin: form.date_fin || null, date_exigibilite: parseInt(form.date_exigibilite) || 1, modalite_paiement: form.modalite_paiement, clauses: form.clauses, bailleur_prenom: form.bailleur_prenom, bailleur_nom: form.bailleur_nom, bailleur_adresse: form.bailleur_adresse, locataire_prenom: form.locataire_prenom, locataire_nom: form.locataire_nom, locataire_email: form.locataire_email, locataire_telephone: form.locataire_telephone, locataire_adresse: form.locataire_adresse, equipements: form.description_bien, statut: 'brouillon' }
    if (bailIdExistant) await supabase.from('Baux').update(bailData).eq('id', bailIdExistant)
    else await supabase.from('Baux').insert(bailData)
    setLoading(false); window.location.href = '/baux'
  }

  async function finaliserEtSauvegarder() {
    setLoading(true)
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const pageW = 210, margin = 20, contenuW = pageW - margin * 2; let y = 20
      const checkPage = () => { if (y > 270) { doc.addPage(); y = 20 } }
      const titre = (t) => { checkPage(); doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(75, 85, 99); doc.text(t, margin, y); y += 2; doc.setDrawColor(75, 85, 99); doc.setLineWidth(0.4); doc.line(margin, y, pageW - margin, y); y += 6; doc.setTextColor(0, 0, 0) }
      const ligne = (label, valeur) => { if (!valeur) return; checkPage(); doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text(label, margin, y); doc.setFont('helvetica', 'normal'); const lignes = doc.splitTextToSize(valeur.toString(), contenuW - 55); doc.text(lignes, margin + 55, y); y += Math.max(5, lignes.length * 4.5) }
      const texte = (t) => { checkPage(); doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50); doc.splitTextToSize(t, contenuW).forEach(l => { checkPage(); doc.text(l, margin, y); y += 4.5 }); doc.setTextColor(0, 0, 0); y += 2 }

      doc.setFillColor(75, 85, 99); doc.rect(0, 0, 210, 20, 'F')
      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
      doc.text('CONTRAT DE LOCATION', pageW / 2, 10, { align: 'center' })
      doc.setFontSize(9); doc.text(`${form.type_location || 'Bail libre'} — Document généré par Ma Gestion-Locative`, pageW / 2, 16, { align: 'center' })
      y = 28; doc.setTextColor(0, 0, 0)

      titre('ARTICLE 1 — LE BAILLEUR')
      ligne('Nom et prénom :', `${form.bailleur_prenom} ${form.bailleur_nom}`)
      ligne('Adresse :', form.bailleur_adresse); y += 4

      titre('ARTICLE 2 — LE LOCATAIRE')
      ligne('Nom et prénom :', `${form.locataire_prenom} ${form.locataire_nom}`)
      ligne('Email :', form.locataire_email)
      ligne('Téléphone :', form.locataire_telephone)
      ligne('Adresse :', form.locataire_adresse); y += 4

      titre('ARTICLE 3 — OBJET DU CONTRAT')
      ligne('Type de location :', form.type_location)
      ligne('Bien :', bienSel?.adresse)
      ligne('Description :', form.description_bien); y += 4

      titre('ARTICLE 4 — DURÉE')
      ligne('Date de début :', form.date_debut ? new Date(form.date_debut).toLocaleDateString('fr-FR') : null)
      ligne('Date de fin :', form.date_fin ? new Date(form.date_fin).toLocaleDateString('fr-FR') : 'Indéterminée')
      texte(`Le présent contrat peut être résilié par l'une ou l'autre des parties avec un préavis de ${form.preavis_mois} mois.`)

      titre('ARTICLE 5 — CONDITIONS FINANCIÈRES')
      ligne('Loyer mensuel :', `${form.loyer_hc} €`)
      ligne('Charges :', form.charges ? `${form.charges} €` : null)
      ligne('Dépôt de garantie :', form.depot_garantie ? `${form.depot_garantie} €` : null)
      ligne('Modalité :', form.modalite_paiement)
      ligne('Exigibilité :', `Le ${form.date_exigibilite} du mois`)

      if (form.clauses?.trim()) { titre('ARTICLE 6 — CLAUSES PARTICULIÈRES'); texte(form.clauses) }

      if (y > 220) { doc.addPage(); y = 20 }
      y += 8; titre('SIGNATURES')
      doc.setFontSize(9); doc.text(`Fait le ${new Date().toLocaleDateString('fr-FR')}`, margin, y); y += 12
      doc.setFont('helvetica', 'bold'); doc.text('Le Bailleur', margin, y); doc.text('Le Locataire', pageW / 2 + 5, y); y += 6
      doc.setDrawColor(180, 180, 180); doc.rect(margin, y, 80, 38); doc.rect(pageW / 2 + 5, y, 80, 38)
      if (signatureBailleur) doc.addImage(signatureBailleur, 'PNG', margin + 1, y + 1, 78, 36)
      if (signatureLocataire) doc.addImage(signatureLocataire, 'PNG', pageW / 2 + 6, y + 1, 78, 36)
      y += 44; doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.text('Document généré par Ma Gestion-Locative', pageW / 2, y, { align: 'center' })

      const nomFichier = `Bail_${sanitize(form.type_location || 'Autre')}_${sanitize(form.locataire_nom)}_${form.date_debut || 'date'}.pdf`
      doc.save(nomFichier)
      const pdfBlob = doc.output('blob')
      const cheminStorage = `baux/${user.id}/${Date.now()}_${nomFichier}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(cheminStorage, pdfBlob, { contentType: 'application/pdf' })
      let bailPdfUrl = null
      if (!uploadError) { const { data: urlData } = supabase.storage.from('documents').getPublicUrl(cheminStorage); bailPdfUrl = urlData.publicUrl; await supabase.from('Documents').insert({ user_id: user.id, bien_id: parseInt(form.bien_id), nom_fichier: nomFichier, categorie: 'Bail', url: bailPdfUrl, storage_path: cheminStorage, annee: new Date().getFullYear() }) }

      const bailData = { user_id: user.id, bien_id: parseInt(form.bien_id), type_bail: 'Autre', loyer_hc: parseFloat(form.loyer_hc), charges: parseFloat(form.charges) || 0, depot_garantie: parseFloat(form.depot_garantie) || 0, date_debut: form.date_debut || null, date_fin: form.date_fin || null, date_exigibilite: parseInt(form.date_exigibilite) || 1, modalite_paiement: form.modalite_paiement, clauses: form.clauses, bailleur_prenom: form.bailleur_prenom, bailleur_nom: form.bailleur_nom, bailleur_adresse: form.bailleur_adresse, locataire_prenom: form.locataire_prenom, locataire_nom: form.locataire_nom, locataire_email: form.locataire_email, locataire_telephone: form.locataire_telephone, locataire_adresse: form.locataire_adresse, equipements: form.description_bien, signature_bailleur: signatureBailleur, signature_locataire: signatureLocataire, statut: 'actif', ...(bailPdfUrl && { bail_pdf_url: bailPdfUrl }) }
      let bail, bailError
      if (bailIdExistant) { const res = await supabase.from('Baux').update(bailData).eq('id', bailIdExistant).select().single(); bail = res.data; bailError = res.error }
      else { const res = await supabase.from('Baux').insert(bailData).select().single(); bail = res.data; bailError = res.error }
      if (bailError) { alert('Erreur : ' + bailError.message); setLoading(false); return }
      await fetch('/api/sync-quantity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) }).catch(() => {})
      setLoading(false); window.location.href = `/baux/${bail.id}`
    } catch (err) { alert('Erreur : ' + err.message); setLoading(false) }
  }

  const etapes = ['Parties', 'Bien & conditions', 'Signature']

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <button onClick={() => etape === 1 ? window.location.href = '/baux/nouveau' : setEtape(etape - 1)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>← Retour</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><span style={{ background: '#f9fafb', color: '#6b7280', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, border: '1px solid #e5e7eb' }}>📦 Autre</span></div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Bail libre / autre</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 28 }}>Stockage, cave, local divers — Bail libre sans encadrement légal spécifique</p>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          {etapes.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < etapes.length - 1 ? 1 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, background: etape === i+1 ? '#6b7280' : etape > i+1 ? '#16a34a' : '#e5e7eb', color: etape >= i+1 ? 'white' : '#9ca3af' }}>{etape > i+1 ? '✓' : i+1}</div>
                <span style={{ fontSize: 11, color: etape === i+1 ? '#6b7280' : '#9ca3af', fontWeight: 500, whiteSpace: 'nowrap' }}>{e}</span>
              </div>
              {i < etapes.length - 1 && <div style={{ flex: 1, height: 2, background: etape > i+1 ? '#16a34a' : '#e5e7eb', margin: '0 6px', marginBottom: 20 }} />}
            </div>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>

          {etape === 1 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>👤 Bailleur & Locataire</h3>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Bailleur</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Prénom *</label><input style={inp} value={form.bailleur_prenom} onChange={e => setForm({...form, bailleur_prenom: e.target.value})} /></div>
                <div><label style={lbl}>Nom *</label><input style={inp} value={form.bailleur_nom} onChange={e => setForm({...form, bailleur_nom: e.target.value})} /></div>
              </div>
              <div style={{ marginBottom: 20 }}><label style={lbl}>Adresse *</label><input style={inp} value={form.bailleur_adresse} onChange={e => setForm({...form, bailleur_adresse: e.target.value})} /></div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Locataire</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Prénom *</label><input style={inp} value={form.locataire_prenom} onChange={e => setForm({...form, locataire_prenom: e.target.value})} /></div>
                <div><label style={lbl}>Nom *</label><input style={inp} value={form.locataire_nom} onChange={e => setForm({...form, locataire_nom: e.target.value})} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Email *</label><input style={inp} type="email" value={form.locataire_email} onChange={e => setForm({...form, locataire_email: e.target.value})} /></div>
                <div><label style={lbl}>Téléphone</label><input style={inp} value={form.locataire_telephone} onChange={e => setForm({...form, locataire_telephone: e.target.value})} /></div>
              </div>
              <div style={{ marginBottom: 20 }}><label style={lbl}>Adresse du locataire</label><input style={inp} value={form.locataire_adresse} onChange={e => setForm({...form, locataire_adresse: e.target.value})} /></div>
              <button onClick={() => { if (!form.bailleur_prenom || !form.bailleur_nom || !form.locataire_prenom || !form.locataire_nom || !form.locataire_email) { alert('Champs obligatoires.'); return } setEtape(2) }} style={{ width: '100%', background: '#6b7280', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Suivant → Bien & conditions</button>
            </div>
          )}

          {etape === 2 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>📦 Bien & conditions financières</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Type de location</label>
                  <select style={inp} value={form.type_location} onChange={e => setForm({...form, type_location: e.target.value})}>
                    <option value="">— Choisir —</option>
                    <option>Stockage</option><option>Cave</option><option>Local associatif</option><option>Local artisanal</option><option>Terrain</option><option>Autre</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Bien concerné</label>
                  <select style={inp} value={form.bien_id} onChange={e => setForm({...form, bien_id: e.target.value})}>
                    <option value="">— Sélectionnez —</option>
                    {biens.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Description du bien loué</label><textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={form.description_bien} onChange={e => setForm({...form, description_bien: e.target.value})} placeholder="Description précise de ce qui est loué..." /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Loyer mensuel (€) *</label><input style={inp} type="number" value={form.loyer_hc} onChange={e => setForm({...form, loyer_hc: e.target.value})} /></div>
                <div><label style={lbl}>Charges (€)</label><input style={inp} type="number" value={form.charges} onChange={e => setForm({...form, charges: e.target.value})} /></div>
                <div><label style={lbl}>Dépôt garantie (€)</label><input style={inp} type="number" value={form.depot_garantie} onChange={e => setForm({...form, depot_garantie: e.target.value})} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Date de début *</label><input style={inp} type="date" value={form.date_debut} onChange={e => setForm({...form, date_debut: e.target.value})} /></div>
                <div><label style={lbl}>Date de fin (optionnel)</label><input style={inp} type="date" value={form.date_fin} onChange={e => setForm({...form, date_fin: e.target.value})} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Préavis (mois)</label><select style={inp} value={form.preavis_mois} onChange={e => setForm({...form, preavis_mois: e.target.value})}>{[1,2,3,6].map(m => <option key={m} value={m}>{m} mois</option>)}</select></div>
                <div><label style={lbl}>Jour d'exigibilité</label><select style={inp} value={form.date_exigibilite} onChange={e => setForm({...form, date_exigibilite: e.target.value})}>{[1,5,10,15,20,25].map(j => <option key={j} value={j}>Le {j}</option>)}</select></div>
              </div>
              <div style={{ marginBottom: 20 }}><label style={lbl}>Clauses particulières</label><textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={form.clauses} onChange={e => setForm({...form, clauses: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEtape(1)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                <button onClick={() => { if (!form.loyer_hc || !form.date_debut) { alert('Loyer et date obligatoires.'); return } setEtape(3) }} style={{ flex: 2, background: '#6b7280', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Passer à la signature →</button>
              </div>
            </div>
          )}

          {etape === 3 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 8 }}>✍️ Comment souhaitez-vous signer ?</h3>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Choisissez le mode de signature.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                <div onClick={() => setEtape(4)} style={{ background: '#f0fdf4', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center', border: '2px solid transparent' }} onMouseEnter={e => e.currentTarget.style.border = '2px solid #16a34a'} onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
                  <div style={{ fontSize: 32 }}>✍️</div><div><h3 style={{ fontSize: 15, fontWeight: 700, color: '#16a34a', margin: '0 0 3px' }}>Signer maintenant</h3><p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Signature manuscrite.</p></div><div style={{ marginLeft: 'auto', color: '#16a34a', fontSize: 18 }}>→</div>
                </div>
                <div onClick={() => alert('Yousign — bientôt disponible !')} style={{ background: '#f5f3ff', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center', border: '2px solid transparent' }} onMouseEnter={e => e.currentTarget.style.border = '2px solid #7c3aed'} onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
                  <div style={{ fontSize: 32 }}>🔏</div><div><h3 style={{ fontSize: 15, fontWeight: 700, color: '#7c3aed', margin: '0 0 3px' }}>Yousign</h3><p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Signature électronique.</p></div><div style={{ marginLeft: 'auto' }}><span style={{ background: '#ede9fe', color: '#7c3aed', padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>Bientôt</span></div>
                </div>
                <div onClick={sauvegarderBrouillon} style={{ background: '#f9fafb', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center', border: '2px solid transparent' }} onMouseEnter={e => e.currentTarget.style.border = '2px solid #9ca3af'} onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
                  <div style={{ fontSize: 32 }}>⏰</div><div><h3 style={{ fontSize: 15, fontWeight: 700, color: '#6b7280', margin: '0 0 3px' }}>Signer plus tard</h3><p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Brouillon dans Mes Baux.</p></div><div style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 18 }}>→</div>
                </div>
              </div>
              <button onClick={() => setEtape(2)} style={{ width: '100%', background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
            </div>
          )}

          {etape === 4 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>✍️ Signatures</h3>
              {['bailleur', 'locataire'].map(qui => {
                const nom = qui === 'bailleur' ? `${form.bailleur_prenom} ${form.bailleur_nom}` : `${form.locataire_prenom} ${form.locataire_nom}`
                const sig = qui === 'bailleur' ? signatureBailleur : signatureLocataire
                const setSig = qui === 'bailleur' ? setSignatureBailleur : setSignatureLocataire
                return (
                  <div key={qui} style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #e5e7eb' }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 12 }}>{sig ? `✅ ${nom}` : `🖊️ ${nom}`}</p>
                    {!sig || signatureActive === qui ? (
                      <>
                        <canvas ref={signatureActive === qui || (!signatureActive && qui === 'bailleur') ? canvasRef : null} onClick={() => setSignatureActive(qui)} onMouseDown={signatureActive === qui ? startDraw : null} onMouseMove={signatureActive === qui ? draw : null} onMouseUp={stopDraw} onMouseLeave={stopDraw} onTouchStart={e => { setSignatureActive(qui); startDraw(e) }} onTouchMove={draw} onTouchEnd={stopDraw} width={520} height={140} style={{ border: `2px dashed ${signatureActive === qui ? '#6b7280' : '#d1d5db'}`, borderRadius: 10, width: '100%', height: 140, cursor: 'crosshair', touchAction: 'none', background: '#fafafa', display: 'block' }} />
                        {signatureActive === qui && <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><button onClick={effacer} style={{ flex: 1, background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 13 }}>🗑</button><button onClick={validerSignature} style={{ flex: 2, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>✅ Valider</button></div>}
                        {!signatureActive && !sig && <button onClick={() => setSignatureActive(qui)} style={{ marginTop: 8, background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🖊️ Signer</button>}
                      </>
                    ) : (
                      <div><img src={sig} style={{ border: '1px solid #e5e7eb', borderRadius: 8, width: '100%', height: 80, objectFit: 'contain' }} /><button onClick={() => { setSig(null); setSignatureActive(qui) }} style={{ marginTop: 6, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Recommencer</button></div>
                    )}
                  </div>
                )
              })}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEtape(3)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                <button onClick={finaliserEtSauvegarder} disabled={loading} style={{ flex: 2, background: loading ? '#86efac' : '#16a34a', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15 }}>{loading ? '⏳ Génération...' : '🎉 Finaliser et télécharger'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
