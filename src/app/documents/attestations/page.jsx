'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../supabase'
import Nav from '../../components/nav'

const types = [
  { id: 'hebergement', label: "Attestation d'hébergement" },
  { id: 'bon_paiement', label: 'Attestation de bon paiement du loyer' },
  { id: 'fin_bail', label: 'Attestation de fin de bail / départ' },
  { id: 'depart_locataire', label: 'Engagement de départ du locataire (vente)' },
  { id: 'conjoint', label: 'Attestation du conjoint non-propriétaire (vente)' },
  { id: 'honneur', label: "Attestation sur l'honneur (libre)" },
]

const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, marginBottom: 14, boxSizing: 'border-box' }
const label = { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }

export default function Attestations() {
  const [user, setUser] = useState(null)
  const [type, setType] = useState('hebergement')
  const [loading, setLoading] = useState(false)
  const [fait, setFait] = useState(false)
  const [erreur, setErreur] = useState('')

  const [form, setForm] = useState({
    declarantNom: '', declarantAdresse: '', lieu: '',
    personneNom: '', personneNaissance: '', personneLieuNaissance: '', dateDepuis: '',
    locataireNom: '', bienAdresse: '', dateDebut: '', dateFin: '', loyer: '',
    contenu: '',
    dateLiberation: '', proprietaireNom: '', qualiteConjoint: 'conjoint(e)',
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) { window.location.href = '/auth'; return }
      setUser(data.user)
    })
  }, [])

  async function genererEtTelecharger() {
    setErreur('')
    if (!form.declarantNom || !form.declarantAdresse) {
      setErreur('Votre nom et votre adresse sont obligatoires.')
      return
    }
    if (type === 'hebergement' && !form.personneNom) { setErreur("Le nom de la personne hébergée est obligatoire."); return }
    if ((type === 'bon_paiement' || type === 'fin_bail') && !form.locataireNom) { setErreur('Le nom du locataire est obligatoire.'); return }
    if (type === 'honneur' && !form.contenu) { setErreur('Le contenu de l’attestation est obligatoire.'); return }
    if (type === 'depart_locataire' && (!form.bienAdresse || !form.dateLiberation)) { setErreur('Adresse du logement et date de libération obligatoires.'); return }
    if (type === 'conjoint' && (!form.bienAdresse || !form.proprietaireNom || !form.dateLiberation)) { setErreur('Adresse, nom du propriétaire et date de libération obligatoires.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/generate-attestation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type,
          typeLabel: types.find(t => t.id === type)?.label,
          ...form,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur lors de la génération')

      if (json.pdfBase64) {
        const octets = Uint8Array.from(atob(json.pdfBase64), c => c.charCodeAt(0))
        const blob = new Blob([octets], { type: 'application/pdf' })
        const lien = document.createElement('a')
        lien.href = URL.createObjectURL(blob)
        lien.download = json.nomFichier || 'attestation.pdf'
        document.body.appendChild(lien)
        lien.click()
        document.body.removeChild(lien)
        URL.revokeObjectURL(lien.href)
      }
      setFait(true)
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
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '12px 0 4px' }}>📝 Attestations</h1>
        <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 28px' }}>Générez une attestation officielle en quelques clics.</p>

        {fait ? (
          <div style={{ background: 'white', borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Attestation générée</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>Le PDF a été téléchargé et enregistré dans votre coffre-fort.</p>
            <a href="/coffre-fort" style={{ display: 'block', color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: 14, marginBottom: 16 }}>📁 Retrouver le PDF dans mon coffre-fort</a>
            <button onClick={() => setFait(false)} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              Créer une autre attestation
            </button>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

            <label style={label}>Type d'attestation</label>
            <select style={inp} value={type} onChange={e => setType(e.target.value)}>
              {types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>

            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '20px 0 10px' }}>✍️ Vos informations</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Votre nom complet *</label>
                <input style={inp} value={form.declarantNom} onChange={e => setForm(f => ({ ...f, declarantNom: e.target.value }))} />
              </div>
              <div>
                <label style={label}>Fait à (ville)</label>
                <input style={inp} value={form.lieu} onChange={e => setForm(f => ({ ...f, lieu: e.target.value }))} />
              </div>
            </div>
            <label style={label}>Votre adresse *</label>
            <input style={inp} value={form.declarantAdresse} onChange={e => setForm(f => ({ ...f, declarantAdresse: e.target.value }))} />

            {type === 'hebergement' && (
              <>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '20px 0 10px' }}>🏠 Personne hébergée</h4>
                <label style={label}>Nom complet *</label>
                <input style={inp} value={form.personneNom} onChange={e => setForm(f => ({ ...f, personneNom: e.target.value }))} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={label}>Date de naissance</label>
                    <input type="date" style={inp} value={form.personneNaissance} onChange={e => setForm(f => ({ ...f, personneNaissance: e.target.value }))} />
                  </div>
                  <div>
                    <label style={label}>Lieu de naissance</label>
                    <input style={inp} value={form.personneLieuNaissance} onChange={e => setForm(f => ({ ...f, personneLieuNaissance: e.target.value }))} />
                  </div>
                </div>
                <label style={label}>Hébergé(e) depuis le</label>
                <input type="date" style={inp} value={form.dateDepuis} onChange={e => setForm(f => ({ ...f, dateDepuis: e.target.value }))} />
              </>
            )}

            {type === 'bon_paiement' && (
              <>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '20px 0 10px' }}>👤 Locataire & logement</h4>
                <label style={label}>Nom du locataire *</label>
                <input style={inp} value={form.locataireNom} onChange={e => setForm(f => ({ ...f, locataireNom: e.target.value }))} />
                <label style={label}>Adresse du logement</label>
                <input style={inp} value={form.bienAdresse} onChange={e => setForm(f => ({ ...f, bienAdresse: e.target.value }))} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={label}>Locataire depuis le</label>
                    <input type="date" style={inp} value={form.dateDebut} onChange={e => setForm(f => ({ ...f, dateDebut: e.target.value }))} />
                  </div>
                  <div>
                    <label style={label}>Loyer mensuel CC (€)</label>
                    <input type="number" style={inp} value={form.loyer} onChange={e => setForm(f => ({ ...f, loyer: e.target.value }))} />
                  </div>
                </div>
              </>
            )}

            {type === 'fin_bail' && (
              <>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '20px 0 10px' }}>👤 Locataire & logement</h4>
                <label style={label}>Nom du locataire *</label>
                <input style={inp} value={form.locataireNom} onChange={e => setForm(f => ({ ...f, locataireNom: e.target.value }))} />
                <label style={label}>Adresse du logement</label>
                <input style={inp} value={form.bienAdresse} onChange={e => setForm(f => ({ ...f, bienAdresse: e.target.value }))} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={label}>Entrée dans les lieux</label>
                    <input type="date" style={inp} value={form.dateDebut} onChange={e => setForm(f => ({ ...f, dateDebut: e.target.value }))} />
                  </div>
                  <div>
                    <label style={label}>Départ / restitution des clés</label>
                    <input type="date" style={inp} value={form.dateFin} onChange={e => setForm(f => ({ ...f, dateFin: e.target.value }))} />
                  </div>
                </div>
              </>
            )}
{type === 'depart_locataire' && (
              <>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12, color: '#1e40af' }}>
                  ℹ️ Ce document est signé par <strong>le locataire</strong>. Renseignez ses informations ci-dessus (nom + adresse), puis imprimez-le pour signature manuscrite.
                </div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '20px 0 10px' }}>🏠 Logement mis en vente</h4>
                <label style={label}>Adresse du logement *</label>
                <input style={inp} value={form.bienAdresse} onChange={e => setForm(f => ({ ...f, bienAdresse: e.target.value }))} />
                <label style={label}>Date de libération des lieux *</label>
                <input type="date" style={inp} value={form.dateLiberation} onChange={e => setForm(f => ({ ...f, dateLiberation: e.target.value }))} />
              </>
            )}

            {type === 'conjoint' && (
              <>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12, color: '#1e40af' }}>
                  ℹ️ Ce document est signé par <strong>le conjoint non-propriétaire</strong>. Renseignez ses informations ci-dessus (nom + adresse), puis imprimez-le pour signature manuscrite.
                </div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '20px 0 10px' }}>🏠 Bien mis en vente</h4>
                <label style={label}>Adresse du bien *</label>
                <input style={inp} value={form.bienAdresse} onChange={e => setForm(f => ({ ...f, bienAdresse: e.target.value }))} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={label}>Nom du propriétaire *</label>
                    <input style={inp} value={form.proprietaireNom} onChange={e => setForm(f => ({ ...f, proprietaireNom: e.target.value }))} />
                  </div>
                  <div>
                    <label style={label}>Qualité</label>
                    <select style={inp} value={form.qualiteConjoint} onChange={e => setForm(f => ({ ...f, qualiteConjoint: e.target.value }))}>
                      {['conjoint(e)', 'épouse', 'époux', 'concubin(e)', 'partenaire de PACS'].map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </div>
                </div>
                <label style={label}>Date de libération des lieux *</label>
                <input type="date" style={inp} value={form.dateLiberation} onChange={e => setForm(f => ({ ...f, dateLiberation: e.target.value }))} />
              </>
            )}
            
            {type === 'honneur' && (
              <>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '20px 0 10px' }}>📄 Contenu</h4>
                <label style={label}>Ce que vous attestez sur l'honneur *</label>
                <textarea style={{ ...inp, minHeight: 120, resize: 'vertical' }} value={form.contenu}
                  onChange={e => setForm(f => ({ ...f, contenu: e.target.value }))}
                  placeholder="Ex : que le logement situé au 12 rue de la Paix est libre de toute occupation à la date de la vente." />
              </>
            )}

            {erreur && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{erreur}</p>}

            <button onClick={genererEtTelecharger} disabled={loading}
              style={{ width: '100%', background: loading ? '#9ca3af' : '#2563eb', color: 'white', padding: 14, borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 15, marginTop: 4 }}>
              {loading ? 'Génération en cours...' : '📄 Générer et télécharger le PDF'}
            </button>

            <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 16 }}>
              Votre signature enregistrée dans <a href="/compte" style={{ color: '#2563eb' }}>Mon Compte</a> sera automatiquement apposée.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
