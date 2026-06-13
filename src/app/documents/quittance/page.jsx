'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../supabase'
import { generateQuittance } from '@/lib/generationQuittance'
import jsPDF from 'jspdf'
import Nav from '../../components/nav'

export default function Quittance() {
  const [baux, setBaux] = useState([])
  const [loading, setLoading] = useState(false)
  const [bailId, setBailId] = useState('')
  const [mois, setMois] = useState('')
  const [annee, setAnnee] = useState(new Date().getFullYear().toString())
  const [datePaiement, setDatePaiement] = useState('')
  const [sauvegarde, setSauvegarde] = useState(false)

  useEffect(() => {
    chargerBaux()
    const today = new Date()
    setDatePaiement(today.toISOString().split('T')[0])
    setMois((today.getMonth() + 1).toString().padStart(2, '0'))
  }, [])

  async function chargerBaux() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/auth'; return }
    const { data } = await supabase
      .from('Baux')
      .select('*, Biens(*)')
      .eq('user_id', user.id)
      .eq('statut', 'actif')
      .order('created_at', { ascending: false })
    if (data) setBaux(data)
  }

  const moisLabels = {
    '01': 'Janvier', '02': 'Février', '03': 'Mars', '04': 'Avril',
    '05': 'Mai', '06': 'Juin', '07': 'Juillet', '08': 'Août',
    '09': 'Septembre', '10': 'Octobre', '11': 'Novembre', '12': 'Décembre'
  }

  async function sauvegarderDansCoffre(bail, pdfBlob, nomFichier) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const path = `${user.id}/${bail.bien_id}/quittances/${nomFichier}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true })

      if (uploadError) { console.error('Upload erreur:', uploadError); return; }

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)

      await supabase.from('Documents').insert({
  user_id: user.id,
  bien_id: bail.bien_id,
  bail_id: bail.id,
  nom_fichier: nomFichier,
  categorie: 'Quittance',
  annee: parseInt(annee),
  storage_path: path,
  url: urlData.publicUrl,
})

      setSauvegarde(true)
      setTimeout(() => setSauvegarde(false), 3000)
    } catch (e) {
      console.error('Erreur sauvegarde coffre:', e)
    }
  }

  async function handleGenerate() {
    if (!bailId || !mois || !annee || !datePaiement) { alert('Remplissez tous les champs.'); return }
    const bail = baux.find(b => b.id === parseInt(bailId))
    if (!bail) return
    setLoading(true)

    const nomFichier = `Quittance_${moisLabels[mois]}_${annee}_${bail.locataire_nom}.pdf`

    // Générer et télécharger le PDF
    generateQuittance({
      proprietaire: { nom: bail.bailleur_nom || '', prenom: bail.bailleur_prenom || '', adresse: bail.bailleur_adresse || '' },
      locataire: { nom: bail.locataire_nom || '', prenom: bail.locataire_prenom || '' },
      bien: { adresse: bail.Biens?.adresse || '', ville: bail.Biens?.ville || '', codePostal: bail.Biens?.code_postal || '' },
      loyer: { montant: bail.loyer_hc || 0, charges: bail.charges || 0, periode: `${moisLabels[mois]} ${annee}`, datePaiement: new Date(datePaiement).toLocaleDateString('fr-FR') },
    })

    // Générer aussi un blob pour sauvegarder dans le coffre
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      doc.setFillColor(37, 99, 235)
      doc.rect(0, 0, pageWidth, 35, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('QUITTANCE DE LOYER', pageWidth / 2, 22, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      let y = 50
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`Bien : ${bail.Biens?.nom || ''}`, 14, y); y += 8
      doc.text(`Locataire : ${bail.locataire_prenom} ${bail.locataire_nom}`, 14, y); y += 8
      doc.text(`Période : ${moisLabels[mois]} ${annee}`, 14, y); y += 8
      doc.text(`Loyer CC : ${(bail.loyer_hc || 0) + (bail.charges || 0)}€`, 14, y)
      const pdfBlob = doc.output('blob')
      await sauvegarderDansCoffre(bail, pdfBlob, nomFichier)
    } catch(e) {
      console.error('Erreur génération blob:', e)
    }

    setLoading(false)
  }

  const inp = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'white' }
  const lbl = { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }
  const bailSelectionne = baux.find(b => b.id === parseInt(bailId))

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
     <Nav pageCourante="documents" />

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => window.location.href = '/documents'}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 16 }}>
            ← Retour aux documents
          </button>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Quittance de loyer</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Sélectionnez le bail et la période</p>
        </div>

        {sauvegarde && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#15803d' }}>Quittance sauvegardée dans le coffre-fort !</p>
          </div>
        )}

        <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Bail concerné *</label>
            <select style={inp} value={bailId} onChange={e => setBailId(e.target.value)}>
              <option value="">— Sélectionnez un bail —</option>
              {baux.map(b => (
                <option key={b.id} value={b.id}>{b.Biens?.nom || 'Bien inconnu'} — {b.locataire_prenom} {b.locataire_nom} — {(b.loyer_hc || 0) + (b.charges || 0)}€/mois</option>
              ))}
            </select>
            {baux.length === 0 && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>Aucun bail actif trouvé.</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={lbl}>Mois *</label>
              <select style={inp} value={mois} onChange={e => setMois(e.target.value)}>
                {Object.entries(moisLabels).map(([val, label]) => (<option key={val} value={val}>{label}</option>))}
              </select>
            </div>
            <div>
              <label style={lbl}>Année *</label>
              <select style={inp} value={annee} onChange={e => setAnnee(e.target.value)}>
                {[2024, 2025, 2026, 2027].map(a => (<option key={a} value={a}>{a}</option>))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={lbl}>Date de paiement *</label>
            <input type="date" style={inp} value={datePaiement} onChange={e => setDatePaiement(e.target.value)} />
          </div>

          {bailSelectionne && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, marginBottom: 20 }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#15803d' }}>✅ Récapitulatif</p>
              <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}><b>Bien :</b> {bailSelectionne.Biens?.nom} — {bailSelectionne.Biens?.adresse}</p>
              <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}><b>Locataire :</b> {bailSelectionne.locataire_prenom} {bailSelectionne.locataire_nom}</p>
              <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}><b>Loyer :</b> {bailSelectionne.loyer_hc}€ + {bailSelectionne.charges}€ = {(bailSelectionne.loyer_hc || 0) + (bailSelectionne.charges || 0)}€ CC</p>
              <p style={{ margin: 0, fontSize: 12, color: '#374151' }}><b>Période :</b> {moisLabels[mois]} {annee}</p>
            </div>
          )}

          <button onClick={handleGenerate} disabled={loading || !bailId}
            style={{ width: '100%', background: loading || !bailId ? '#93c5fd' : '#2563eb', color: 'white', padding: 14, borderRadius: 10, border: 'none', cursor: loading || !bailId ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15 }}>
            {loading ? 'Génération...' : '📄 Générer la quittance PDF'}
          </button>
        </div>
      </div>
    </main>
  )
}