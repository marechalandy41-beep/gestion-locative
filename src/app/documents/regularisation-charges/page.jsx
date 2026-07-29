'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../supabase'
import Nav from '../../components/nav'

const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, marginBottom: 14 }
const label = { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }

function nombreDeMois(dateDebut, dateFin) {
  if (!dateDebut || !dateFin) return 0
  const d = new Date(dateDebut), f = new Date(dateFin)
  if (isNaN(d) || isNaN(f) || f < d) return 0
  return Math.max(1, Math.round((f - d) / (1000 * 60 * 60 * 24 * 30.44)))
}

export default function RegularisationCharges() {
  const [user, setUser] = useState(null)
  const [plan, setPlan] = useState('gratuit')
  const [baux, setBaux] = useState([])
  const [bailId, setBailId] = useState('')
  const [loading, setLoading] = useState(false)
  const [envoye, setEnvoye] = useState(false)
  const [erreur, setErreur] = useState('')
  const [fichierJustificatif, setFichierJustificatif] = useState(null)

  const [form, setForm] = useState({
    bailleurNom: '', bailleurAdresse: '',
    locataireNom: '', locataireEmail: '', locataireAdresse: '',
    bienAdresse: '',
    dateDebut: '', dateFin: '',
    chargesProvisionnees: '', chargesReelles: '',
  })

  const estPayant = plan !== 'gratuit'

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) return
      setUser(data.user)
      const { data: customerData } = await supabase.from('customers').select('plan').eq('user_id', data.user.id).single()
      if (customerData?.plan) setPlan(customerData.plan)
      const { data: bauxData } = await supabase.from('Baux').select('*, Biens(*)').eq('user_id', data.user.id).order('id', { ascending: false })
      setBaux(bauxData || [])
    })
  }, [])

  // Pré-remplissage automatique quand un bail est sélectionné (plan payant uniquement)
  useEffect(() => {
    if (!estPayant || !bailId) return
    const bail = baux.find(b => String(b.id) === String(bailId))
    if (!bail) return

    const nomBailleur = (bail.bailleur_denomination && bail.bailleur_denomination.trim())
      ? bail.bailleur_denomination.trim()
      : `${bail.bailleur_prenom || ''} ${bail.bailleur_nom || ''}`.trim()
    const nomLocataire = (bail.locataire_denomination && bail.locataire_denomination.trim())
      ? bail.locataire_denomination.trim()
      : `${bail.locataire_prenom || ''} ${bail.locataire_nom || ''}`.trim()
    const adrBien = bail.Biens?.adresse || [bail.Biens?.code_postal, bail.Biens?.ville].filter(Boolean).join(' ') || ''

    setForm(f => ({
      ...f,
      bailleurNom: nomBailleur,
      bailleurAdresse: bail.bailleur_adresse || '',
      locataireNom: nomLocataire,
      locataireEmail: bail.locataire_email || '',
      locataireAdresse: adrBien,
      bienAdresse: adrBien,
    }))
  }, [bailId, estPayant, baux])

  // Calcul automatique des charges provisionnées selon la période, si un bail est sélectionné
  useEffect(() => {
    if (!estPayant || !bailId || !form.dateDebut || !form.dateFin) return
    const bail = baux.find(b => String(b.id) === String(bailId))
    if (!bail) return
    const mois = nombreDeMois(form.dateDebut, form.dateFin)
    const provisionMensuelle = parseFloat(bail.charges) || 0
    setForm(f => ({ ...f, chargesProvisionnees: (mois * provisionMensuelle).toFixed(2) }))
  }, [bailId, form.dateDebut, form.dateFin, estPayant, baux])

  const solde = (parseFloat(form.chargesReelles) || 0) - (parseFloat(form.chargesProvisionnees) || 0)
  const soldeAffichable = form.chargesReelles !== '' && form.chargesProvisionnees !== ''

  async function genererEtTelecharger() {
    setErreur('')
    if (!form.bailleurNom || !form.locataireNom) {
      setErreur('Le nom du bailleur et du locataire sont obligatoires.')
      return
    }
    if (!form.dateDebut || !form.dateFin) {
      setErreur('La période de régularisation est obligatoire.')
      return
    }
    if (form.chargesProvisionnees === '' || form.chargesReelles === '') {
      setErreur('Les montants provisionnés et réels sont obligatoires.')
      return
    }
    setLoading(true)
    try {
      const bail = bailId ? baux.find(b => String(b.id) === String(bailId)) : null
      const res = await fetch('/api/generate-regularisation-charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          bailId: bailId || null,
          bienId: bail?.bien_id || null,
          ...form,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur lors de la génération')

      // Téléchargement du PDF
      if (json.pdfBase64) {
        const octets = Uint8Array.from(atob(json.pdfBase64), c => c.charCodeAt(0))
        const blob = new Blob([octets], { type: 'application/pdf' })
        const lien = document.createElement('a')
        lien.href = URL.createObjectURL(blob)
        lien.download = json.nomFichier || 'regularisation-charges.pdf'
        document.body.appendChild(lien)
        lien.click()
        document.body.removeChild(lien)
        URL.revokeObjectURL(lien.href)
      }

      // Upload optionnel du justificatif de charges (copro, factures...) dans le même dossier
      if (fichierJustificatif) {
        const bienId = bail?.bien_id || 'sans-bien'
        const cheminJustif = `${user.id}/${bienId}/Régularisation charges/Justificatif_${Date.now()}_${fichierJustificatif.name}`
        const { error: uploadErr } = await supabase.storage.from('documents').upload(cheminJustif, fichierJustificatif)
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('documents').getPublicUrl(cheminJustif)
          await supabase.from('Documents').insert({
            user_id: user.id,
            bien_id: bail?.bien_id || null,
            bail_id: bailId || null,
            nom_fichier: fichierJustificatif.name,
            categorie: 'Régularisation charges',
            annee: new Date().getFullYear(),
            storage_path: cheminJustif,
            url: urlData.publicUrl,
          })
        }
      }

      setEnvoye(true)
    } catch (e) {
      setErreur(e.message)
    }
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Nav pageCourante="documents" />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px' }}>

        <a href="/documents" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>← Retour aux documents</a>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '12px 0 4px' }}>🧾 Régularisation des charges</h1>
        <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 28px' }}>
          {estPayant ? 'Sélectionnez un bail pour pré-remplir automatiquement les informations.' : 'Remplissez le formulaire ci-dessous (plan gratuit : saisie manuelle).'}
        </p>

        {envoye ? (
          <div style={{ background: 'white', borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Régularisation générée</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>
              Le PDF a été téléchargé et enregistré dans votre coffre-fort{fichierJustificatif ? ', avec le justificatif joint' : ''}.
            </p>
            <a href="/coffre-fort" style={{ display: 'block', color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
              📁 Retrouver le PDF dans mon coffre-fort
            </a>
            <a href="/documents" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 13 }}>← Retour aux documents</a>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

            {estPayant && (
              <>
                <label style={label}>Bail concerné (optionnel — pré-remplit le formulaire)</label>
                <select style={inp} value={bailId} onChange={e => setBailId(e.target.value)}>
                  <option value="">— Saisie manuelle —</option>
                  {baux.map(b => (
                    <option key={b.id} value={b.id}>
                      {((b.locataire_denomination && b.locataire_denomination.trim()) ? b.locataire_denomination : `${b.locataire_prenom || ''} ${b.locataire_nom || ''}`)} — {b.Biens?.nom || b.Biens?.adresse || 'Bien'}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Votre nom (bailleur)</label>
                <input style={inp} value={form.bailleurNom} onChange={e => setForm(f => ({ ...f, bailleurNom: e.target.value }))} />
              </div>
              <div>
                <label style={label}>Votre adresse</label>
                <input style={inp} value={form.bailleurAdresse} onChange={e => setForm(f => ({ ...f, bailleurAdresse: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Nom du locataire</label>
                <input style={inp} value={form.locataireNom} onChange={e => setForm(f => ({ ...f, locataireNom: e.target.value }))} />
              </div>
              <div>
                <label style={label}>Email du locataire</label>
                <input style={inp} value={form.locataireEmail} onChange={e => setForm(f => ({ ...f, locataireEmail: e.target.value }))} />
              </div>
            </div>

            <label style={label}>Adresse du logement loué</label>
            <input style={inp} value={form.bienAdresse} onChange={e => setForm(f => ({ ...f, bienAdresse: e.target.value }))} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Début de la période</label>
                <input style={inp} type="date" value={form.dateDebut} onChange={e => setForm(f => ({ ...f, dateDebut: e.target.value }))} />
              </div>
              <div>
                <label style={label}>Fin de la période</label>
                <input style={inp} type="date" value={form.dateFin} onChange={e => setForm(f => ({ ...f, dateFin: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Charges provisionnées sur la période (€)</label>
                <input style={inp} type="number" value={form.chargesProvisionnees} onChange={e => setForm(f => ({ ...f, chargesProvisionnees: e.target.value }))} />
              </div>
              <div>
                <label style={label}>Charges réelles justifiées (€)</label>
                <input style={inp} type="number" value={form.chargesReelles} onChange={e => setForm(f => ({ ...f, chargesReelles: e.target.value }))} />
              </div>
            </div>

            {soldeAffichable && (
              <div style={{
                background: solde > 0 ? '#fef2f2' : solde < 0 ? '#f0fdf4' : '#f9fafb',
                border: `1px solid ${solde > 0 ? '#fecaca' : solde < 0 ? '#bbf7d0' : '#e5e7eb'}`,
                borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 13,
                color: solde > 0 ? '#991b1b' : solde < 0 ? '#166534' : '#374151',
              }}>
                {solde > 0 && <>💰 Solde de <strong>{solde.toFixed(2)} €</strong> à réclamer au locataire.</>}
                {solde < 0 && <>💰 Trop-perçu de <strong>{Math.abs(solde).toFixed(2)} €</strong> à rembourser au locataire.</>}
                {solde === 0 && <>✅ Charges provisionnées et réelles à l'équilibre, aucun solde.</>}
              </div>
            )}

            <label style={label}>Justificatif de charges — décompte copropriété, factures... (optionnel)</label>
            <input style={{ ...inp, padding: '8px 12px' }} type="file" accept=".pdf,.csv,.jpg,.jpeg,.png"
              onChange={e => setFichierJustificatif(e.target.files?.[0] || null)} />

            {erreur && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{erreur}</p>}

            <button onClick={genererEtTelecharger} disabled={loading} style={{ width: '100%', background: loading ? '#9ca3af' : '#2563eb', color: 'white', padding: 14, borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 15, marginTop: 4 }}>
              {loading ? 'Génération en cours...' : '📄 Générer et télécharger le PDF'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
