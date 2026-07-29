'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../../supabase'
import Nav from '../../../components/nav'

const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, marginBottom: 14 }
const label = { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }

function trimestreDate(date) {
  const d = new Date(date)
  return Math.floor(d.getMonth() / 3) + 1
}
function labelTrimestre(periode) {
  const [annee, q] = periode.split('-Q')
  return `T${q} ${annee}`
}

export default function RevisionLoyer() {
  const id = typeof window !== 'undefined' ? window.location.pathname.split('/')[window.location.pathname.split('/').length - 2] : null;
  const [user, setUser] = useState(null)
  const [bail, setBail] = useState(null)
  const [serieIRL, setSerieIRL] = useState([])
  const [loadingIRL, setLoadingIRL] = useState(true)
  const [erreurIRL, setErreurIRL] = useState('')
  const [dateEffet, setDateEffet] = useState(new Date().toISOString().split('T')[0])
  const [trimestreReference, setTrimestreReference] = useState('')
  const [trimestreNouveau, setTrimestreNouveau] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) return
      setUser(data.user)
      const { data: bailData } = await supabase.from('Baux').select('*, Biens(nom, adresse)').eq('id', id).single()
      setBail(bailData)
    })

    fetch('/api/irl-insee')
      .then(r => r.json())
      .then(json => {
        if (json.error) { setErreurIRL(json.error); return }
        setSerieIRL(json.serie || [])
        // Pré-sélection : trimestre actuel et le même trimestre l'an dernier
        const trimActuel = json.serie?.[0]?.periode
        if (trimActuel) {
          const [annee, q] = trimActuel.split('-Q')
          const trimAnDernier = `${parseInt(annee) - 1}-Q${q}`
          setTrimestreNouveau(trimActuel)
          if (json.serie.find(s => s.periode === trimAnDernier)) setTrimestreReference(trimAnDernier)
        }
      })
      .catch(e => setErreurIRL(e.message))
      .finally(() => setLoadingIRL(false))
  }, [id])

  const indiceRef = serieIRL.find(s => s.periode === trimestreReference)?.valeur
  const indiceNouveau = serieIRL.find(s => s.periode === trimestreNouveau)?.valeur
  const ancienLoyer = parseFloat(bail?.loyer_hc) || 0
  const nouveauLoyer = (indiceRef && indiceNouveau && ancienLoyer)
    ? Math.round(ancienLoyer * (indiceNouveau / indiceRef) * 100) / 100
    : null
  const variation = (nouveauLoyer !== null) ? ((nouveauLoyer - ancienLoyer) / ancienLoyer) * 100 : null

  async function appliquerRevision() {
    setErreur('')
    if (!indiceRef || !indiceNouveau || !nouveauLoyer) {
      setErreur('Sélectionnez les deux trimestres IRL pour calculer le nouveau loyer.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/appliquer-revision-loyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id, bailId: id,
          ancienLoyer, nouveauLoyer,
          trimestreReference, indiceReference: indiceRef,
          trimestreNouveau, indiceNouveau,
          dateEffet,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur lors de la révision')

      if (json.pdfBase64) {
        const octets = Uint8Array.from(atob(json.pdfBase64), c => c.charCodeAt(0))
        const blob = new Blob([octets], { type: 'application/pdf' })
        const lien = document.createElement('a')
        lien.href = URL.createObjectURL(blob)
        lien.download = json.nomFichier || 'revision-loyer.pdf'
        document.body.appendChild(lien)
        lien.click()
        document.body.removeChild(lien)
        URL.revokeObjectURL(lien.href)
      }
      setSucces(true)
    } catch (e) {
      setErreur(e.message)
    }
    setLoading(false)
  }

  if (!bail) return <main style={{ minHeight: '100vh', background: '#f9fafb' }}><Nav pageCourante="baux" /><p style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Chargement...</p></main>

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Nav pageCourante="baux" />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px' }}>
        <a href={`/baux/${id}`} style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>← Retour au bail</a>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '12px 0 4px' }}>📈 Révision annuelle du loyer</h1>
        <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 28px' }}>
          {bail.Biens?.nom || bail.Biens?.adresse} — calcul automatique basé sur l'IRL publié par l'INSEE.
        </p>

        {succes ? (
          <div style={{ background: 'white', borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Loyer révisé</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>
              Le nouveau loyer ({nouveauLoyer?.toFixed(2)} €) s'applique désormais à ce bail. Le courrier d'information a été téléchargé et enregistré dans votre coffre-fort.
            </p>
            <a href={`/baux/${id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>← Retour au bail</a>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

            {loadingIRL ? (
              <p style={{ color: '#6b7280', fontSize: 14 }}>Récupération de l'indice IRL auprès de l'INSEE...</p>
            ) : erreurIRL ? (
              <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
                Impossible de récupérer l'IRL automatiquement ({erreurIRL}). Vous pouvez consulter les valeurs sur insee.fr et les indiquer manuellement — fonctionnalité à venir.
              </p>
            ) : (
              <>
                <label style={label}>Loyer hors charges actuel</label>
                <input style={inp} value={`${ancienLoyer.toFixed(2)} €`} disabled />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={label}>IRL de référence (trimestre initial)</label>
                    <select style={inp} value={trimestreReference} onChange={e => setTrimestreReference(e.target.value)}>
                      <option value="">—</option>
                      {serieIRL.map(s => (
                        <option key={s.periode} value={s.periode}>{labelTrimestre(s.periode)} — {s.valeur.toFixed(2)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={label}>Nouvel IRL (trimestre de révision)</label>
                    <select style={inp} value={trimestreNouveau} onChange={e => setTrimestreNouveau(e.target.value)}>
                      <option value="">—</option>
                      {serieIRL.map(s => (
                        <option key={s.periode} value={s.periode}>{labelTrimestre(s.periode)} — {s.valeur.toFixed(2)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <label style={label}>Date d'effet de la révision</label>
                <input style={inp} type="date" value={dateEffet} onChange={e => setDateEffet(e.target.value)} />

                {nouveauLoyer !== null && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                    <p style={{ fontSize: 13, color: '#1e40af', margin: '0 0 6px' }}>
                      Nouveau loyer hors charges : <strong style={{ fontSize: 16 }}>{nouveauLoyer.toFixed(2)} €</strong>
                    </p>
                    <p style={{ fontSize: 12, color: '#3b82f6', margin: 0 }}>
                      Variation : {variation >= 0 ? '+' : ''}{variation.toFixed(2)} % — {ancienLoyer.toFixed(2)} € → {nouveauLoyer.toFixed(2)} €
                    </p>
                  </div>
                )}

                {erreur && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{erreur}</p>}

                <button onClick={appliquerRevision} disabled={loading || !nouveauLoyer}
                  style={{ width: '100%', background: (loading || !nouveauLoyer) ? '#9ca3af' : '#2563eb', color: 'white', padding: 14, borderRadius: 10, border: 'none', cursor: (loading || !nouveauLoyer) ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 15 }}>
                  {loading ? 'Application en cours...' : '✅ Appliquer la révision et générer le courrier'}
                </button>
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 10, textAlign: 'center' }}>
                  Cette action met à jour le loyer du bail : les prochaines quittances refléteront le nouveau montant.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
