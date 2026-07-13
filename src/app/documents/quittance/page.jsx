'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../supabase'
import { generateQuittance } from '@/lib/generationQuittance'
import jsPDF from 'jspdf'
import Nav from '../../components/nav'

export default function Quittance() {
  const [baux, setBaux] = useState([])
  const [biens, setBiens] = useState([])
  const [loading, setLoading] = useState(false)
  const [bailId, setBailId] = useState('')
  const [mois, setMois] = useState('')
  const [annee, setAnnee] = useState(new Date().getFullYear().toString())
  const [datePaiement, setDatePaiement] = useState('')
  const [sauvegarde, setSauvegarde] = useState(false)
  const [plan, setPlan] = useState('')
  const [modeManuel, setModeManuel] = useState(false)
  const [manuel, setManuel] = useState({
    proprietaire_nom: '', proprietaire_prenom: '', proprietaire_adresse: '',
    locataire_nom: '', locataire_prenom: '',
    bien_adresse: '', bien_ville: '', bien_cp: '',
    loyer: '', charges: '',
  })
  

  useEffect(() => {
    chargerBaux()
    chargerPlan()
    chargerBiens()
    const today = new Date()
    setDatePaiement(today.toISOString().split('T')[0])
    setMois((today.getMonth() + 1).toString().padStart(2, '0'))
  }, [])

  async function chargerPlan() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('customers').select('plan').eq('user_id', user.id).single()
    const planUser = data?.plan || 'gratuit'
    setPlan(planUser)
    if (planUser === 'gratuit') setModeManuel(true) // gratuit → mode manuel forcé
  }

  async function chargerBiens() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('Biens').select('*').eq('user_id', user.id).order('nom')
    if (data) setBiens(data)
  }

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

async function genererManuel() {
    if (!manuel.proprietaire_nom || !manuel.locataire_nom || !manuel.bien_adresse || !manuel.loyer || !mois || !annee || !datePaiement) {
      alert('Merci de remplir : propriétaire, locataire, adresse du bien, loyer, période et date.')
      return
    }
    setLoading(true)
    try {
      const montantTotal = (parseFloat(manuel.loyer) || 0) + (parseFloat(manuel.charges) || 0)
      generateQuittance({
        proprietaire: { nom: manuel.proprietaire_nom, prenom: manuel.proprietaire_prenom, adresse: manuel.proprietaire_adresse },
        locataire: { nom: manuel.locataire_nom, prenom: manuel.locataire_prenom },
        bien: { adresse: manuel.bien_adresse, ville: manuel.bien_ville, codePostal: manuel.bien_cp },
        loyer: { montant: parseFloat(manuel.loyer) || 0, charges: parseFloat(manuel.charges) || 0, periode: `${moisLabels[mois]} ${annee}`, datePaiement: new Date(datePaiement).toLocaleDateString('fr-FR') },
      })
      setSauvegarde(true)
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
    setLoading(false)
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
      loyer: { montant: (bail.loyer_hc || 0) * nbMois, charges: (bail.charges || 0) * nbMois, periode: libellePeriode(), datePaiement: new Date(datePaiement).toLocaleDateString('fr-FR') },
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
      doc.text(`Période : ${libellePeriode()}`, 14, y); y += 8
      doc.text(`Loyer CC : ${montantQuittance}€`, 14, y)
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

  // Gestion trimestrielle : montant ×3 et période sur 3 mois
  const estTrimestriel = bailSelectionne?.periodicite === 'trimestriel'
  const nbMois = estTrimestriel ? 3 : 1
  const loyerBase = (bailSelectionne?.loyer_hc || 0) + (bailSelectionne?.charges || 0)
  const montantQuittance = loyerBase * nbMois

  // Construit le libellé de période (1 mois ou 3 mois consécutifs)
  function libellePeriode() {
    if (!mois) return ''
    const moisNum = parseInt(mois)
    if (!estTrimestriel) return `${moisLabels[mois]} ${annee}`
    // Trimestriel : mois de début → mois + 2
    const noms = Object.values(moisLabels)
    const idxDebut = moisNum - 1
    const idxFin = (idxDebut + 2) % 12
    const anneeFin = idxDebut + 2 > 11 ? parseInt(annee) + 1 : annee
    if (anneeFin !== annee) {
      return `${noms[idxDebut]} ${annee} – ${noms[idxFin]} ${anneeFin}`
    }
    return `${noms[idxDebut]} – ${noms[idxFin]} ${annee}`
  }

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
          {plan !== 'gratuit' && (
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
          )}

          {modeManuel && (
            <div style={{ marginBottom: 16 }}>
              {plan === 'gratuit' && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: '#1e40af', margin: 0 }}>ℹ️ En plan gratuit, remplissez les informations à la main. Passez à un plan payant pour générer vos quittances automatiquement depuis vos baux.</p>
                </div>
              )}
              <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Propriétaire (bailleur)</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
                <div><label style={lbl}>Prénom</label><input style={inp} value={manuel.proprietaire_prenom} onChange={e => setManuel({...manuel, proprietaire_prenom: e.target.value})} /></div>
                <div><label style={lbl}>Nom *</label><input style={inp} value={manuel.proprietaire_nom} onChange={e => setManuel({...manuel, proprietaire_nom: e.target.value})} /></div>
              </div>
              <div style={{ marginBottom: 16 }}><label style={lbl}>Adresse du propriétaire <span style={{ fontWeight: 400, color: '#9ca3af' }}>(facultatif)</span></label><input style={inp} value={manuel.proprietaire_adresse} onChange={e => setManuel({...manuel, proprietaire_adresse: e.target.value})} /></div>

              <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Locataire</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div><label style={lbl}>Prénom</label><input style={inp} value={manuel.locataire_prenom} onChange={e => setManuel({...manuel, locataire_prenom: e.target.value})} /></div>
                <div><label style={lbl}>Nom *</label><input style={inp} value={manuel.locataire_nom} onChange={e => setManuel({...manuel, locataire_nom: e.target.value})} /></div>
              </div>

              <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Logement loué</p>
              {biens.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>Choisir un bien existant <span style={{ fontWeight: 400, color: '#9ca3af' }}>(ou saisir à la main ci-dessous)</span></label>
                  <select style={inp} onChange={e => {
                    const b = biens.find(x => x.id === parseInt(e.target.value))
                    if (b) setManuel({...manuel, bien_adresse: b.adresse || '', bien_ville: b.ville || '', bien_cp: b.code_postal || ''})
                  }}>
                    <option value="">— Saisie manuelle —</option>
                    {biens.map(b => <option key={b.id} value={b.id}>{b.nom} — {b.adresse}</option>)}
                  </select>
                </div>
              )}
              <div style={{ marginBottom: 12 }}><label style={lbl}>Adresse du bien *</label><input style={inp} value={manuel.bien_adresse} onChange={e => setManuel({...manuel, bien_adresse: e.target.value})} placeholder="12 rue de la Paix" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div><label style={lbl}>Code postal</label><input style={inp} value={manuel.bien_cp} onChange={e => setManuel({...manuel, bien_cp: e.target.value})} /></div>
                <div><label style={lbl}>Ville</label><input style={inp} value={manuel.bien_ville} onChange={e => setManuel({...manuel, bien_ville: e.target.value})} /></div>
              </div>

              <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Montant</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 4 }}>
                <div><label style={lbl}>Loyer HC (€) *</label><input style={inp} type="number" value={manuel.loyer} onChange={e => setManuel({...manuel, loyer: e.target.value})} /></div>
                <div><label style={lbl}>Charges (€)</label><input style={inp} type="number" value={manuel.charges} onChange={e => setManuel({...manuel, charges: e.target.value})} /></div>
              </div>
            </div>
          )}

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
              <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}><b>Loyer :</b> {loyerBase}€ CC {estTrimestriel ? `× 3 mois = ${montantQuittance}€` : ''}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#374151' }}><b>Période :</b> {libellePeriode()} {estTrimestriel ? '(trimestre)' : ''}</p>
            </div>
          )}

          <button onClick={modeManuel ? genererManuel : handleGenerate} disabled={loading || (!modeManuel && !bailId)}
            style={{ width: '100%', background: (loading || (!modeManuel && !bailId)) ? '#93c5fd' : '#2563eb', color: 'white', padding: 14, borderRadius: 10, border: 'none', cursor: (loading || (!modeManuel && !bailId)) ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15 }}>
            {loading ? 'Génération...' : '📄 Générer la quittance PDF'}
          </button>
        </div>
      </div>
    </main>
  )
}