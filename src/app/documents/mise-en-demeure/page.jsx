'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../supabase'
import Nav from '../../components/nav'

const moisLabels = { 1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril', 5: 'Mai', 6: 'Juin', 7: 'Juillet', 8: 'Août', 9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre' }

const motifs = [
  { id: 'impaye', label: 'Impayé de loyer' },
  { id: 'troubles', label: 'Troubles de voisinage' },
  { id: 'degradations', label: 'Dégradations du logement' },
  { id: 'autre', label: 'Autre manquement' },
]

const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, marginBottom: 14 }
const label = { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }

export default function MiseEnDemeure() {
  const [user, setUser] = useState(null)
  const [plan, setPlan] = useState('gratuit')
  const [baux, setBaux] = useState([])
  const [bailId, setBailId] = useState('')
  const [motif, setMotif] = useState('impaye')
  const [loading, setLoading] = useState(false)
  const [envoye, setEnvoye] = useState(false)
  const [erreur, setErreur] = useState('')
  const [calculEnCours, setCalculEnCours] = useState(false)

  const [form, setForm] = useState({
    bailleurNom: '', bailleurAdresse: '',
    locataireNom: '', locataireEmail: '', locataireAdresse: '',
    bienAdresse: '',
    montantDu: '', moisImpayes: '', description: '',
    delaiJours: 8,
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

    if (motif === 'impaye') {
      calculerImpayes(bail)
    }
  }, [bailId, motif, estPayant, baux])

  async function calculerImpayes(bail) {
    setCalculEnCours(true)
    const { data: paiements } = await supabase.from('paiements').select('*').eq('bail_id', bail.id)

    const debut = bail.date_debut ? new Date(bail.date_debut) : new Date()
    const maintenant = new Date()
    const loyerMensuel = (parseFloat(bail.loyer_hc) || 0) + (parseFloat(bail.charges) || 0)

    let cur = new Date(debut.getFullYear(), debut.getMonth(), 1)
    const fin = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1)
    const impayes = []

    while (cur <= fin) {
      const m = cur.getMonth() + 1, a = cur.getFullYear()
      const paye = (paiements || []).some(p => p.mois === m && p.annee === a && (parseFloat(p.montant) || 0) > 0)
      if (!paye) impayes.push({ mois: m, annee: a })
      cur.setMonth(cur.getMonth() + 1)
    }

    const total = impayes.length * loyerMensuel
    setForm(f => ({
      ...f,
      montantDu: total.toFixed(2),
      moisImpayes: impayes.map(i => `${moisLabels[i.mois]} ${i.annee}`).join(', '),
    }))
    setCalculEnCours(false)
  }

  async function genererEtTelecharger() {
    setErreur('')
    if (!form.bailleurNom || !form.locataireNom) {
      setErreur('Le nom du bailleur et du locataire sont obligatoires.')
      return
    }
    if (motif === 'impaye' && !form.montantDu) {
      setErreur('Le montant dû est obligatoire pour un impayé de loyer.')
      return
    }
    if (motif !== 'impaye' && !form.description) {
      setErreur('Merci de décrire le manquement reproché.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/generate-mise-en-demeure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          bailId: bailId || null,
          bienId: bailId ? (baux.find(b => String(b.id) === String(bailId))?.bien_id || null) : null,
          motif,
          motifLabel: motifs.find(m => m.id === motif)?.label,
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
        lien.download = json.nomFichier || 'mise-en-demeure.pdf'
        document.body.appendChild(lien)
        lien.click()
        document.body.removeChild(lien)
        URL.revokeObjectURL(lien.href)
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
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '12px 0 4px' }}>⚠️ Mise en demeure</h1>
        <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 28px' }}>
          {estPayant ? 'Sélectionnez un bail pour pré-remplir automatiquement les informations.' : 'Remplissez le formulaire ci-dessous (plan gratuit : saisie manuelle).'}
        </p>

        {envoye ? (
          <div style={{ background: 'white', borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Mise en demeure générée</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>
              Le PDF a été téléchargé et enregistré dans votre coffre-fort.
            </p>
            <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 12, padding: 16, textAlign: 'left', fontSize: 13, color: '#854d0e', marginBottom: 20 }}>
              ⚖️ <strong>Dernière étape essentielle :</strong> pour avoir pleine valeur juridique, une mise en demeure doit être envoyée en <strong>lettre recommandée avec accusé de réception</strong>. Vous pouvez le faire en ligne, sans vous déplacer, en joignant le PDF que vous venez de télécharger.
            </div>
            <a href="https://www.laposte.fr/lettre-recommandee-en-ligne" target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', background: '#ffd100', color: '#111827', padding: '14px 24px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
              📮 Envoyer en recommandé sur La Poste →
            </a>
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

            <label style={label}>Motif</label>
            <select style={inp} value={motif} onChange={e => setMotif(e.target.value)}>
              {motifs.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>

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

            {motif === 'impaye' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={label}>Montant total dû (€) {calculEnCours && '— calcul...'}</label>
                    <input style={inp} type="number" value={form.montantDu} onChange={e => setForm(f => ({ ...f, montantDu: e.target.value }))} />
                  </div>
                  <div>
                    <label style={label}>Délai de régularisation (jours)</label>
                    <input style={inp} type="number" value={form.delaiJours} onChange={e => setForm(f => ({ ...f, delaiJours: e.target.value }))} />
                  </div>
                </div>
                <label style={label}>Mois impayés concernés</label>
                <input style={inp} value={form.moisImpayes} onChange={e => setForm(f => ({ ...f, moisImpayes: e.target.value }))} placeholder="Ex : Mai 2026, Juin 2026" />
              </>
            ) : (
              <>
                <label style={label}>Description du manquement reproché</label>
                <textarea style={{ ...inp, minHeight: 100, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Décrivez précisément les faits, dates, éléments constatés..." />
                <label style={label}>Délai pour remédier au manquement (jours)</label>
                <input style={inp} type="number" value={form.delaiJours} onChange={e => setForm(f => ({ ...f, delaiJours: e.target.value }))} />
              </>
            )}

            {erreur && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{erreur}</p>}

            <button onClick={genererEtTelecharger} disabled={loading} style={{ width: '100%', background: loading ? '#9ca3af' : '#2563eb', color: 'white', padding: 14, borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 15, marginTop: 4 }}>
              {loading ? 'Génération en cours...' : '📄 Générer et télécharger le PDF'}
            </button>

            <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 16 }}>
              Besoin d'aide pour rédiger une mise en demeure ? <a href="/blog/mise-en-demeure-locataire-guide" style={{ color: '#2563eb' }}>Consultez notre guide sur le blog →</a>
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
