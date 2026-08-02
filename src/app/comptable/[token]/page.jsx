'use client'
import { useState, useEffect } from 'react'

export default function PortailComptable() {
  const token = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : null
  const [donnees, setDonnees] = useState(null)
  const [erreur, setErreur] = useState('')
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) charger(annee)
  }, [token, annee])

  async function charger(a) {
    setLoading(true)
    try {
      const res = await fetch(`/api/comptable-info?token=${token}&annee=${a}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur de chargement')
      setDonnees(json)
    } catch (e) {
      setErreur(e.message)
    }
    setLoading(false)
  }

  const anneesDispo = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  if (erreur) {
    return (
      <main style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 480, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <p style={{ color: '#374151' }}>{erreur}</p>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ background: '#2563eb', padding: '20px 24px', textAlign: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'white', fontWeight: 800, fontSize: 20 }}>
          <img src="/icon-192.png" alt="Ma Gestion-Locative" style={{ width: 28, height: 28, borderRadius: 6 }} /> Ma Gestion-Locative
        </span>
        <p style={{ color: '#dbeafe', fontSize: 13, margin: '6px 0 0' }}>Accès comptable — lecture seule</p>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>📊 Bilan fiscal</h1>
          <select value={annee} onChange={e => setAnnee(parseInt(e.target.value))}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, fontWeight: 600 }}>
            {anneesDispo.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>Chargement...</p>
        ) : donnees && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px' }}>Loyers perçus</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>{donnees.totalLoyersPercus.toLocaleString('fr-FR')}€</p>
              </div>
              <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px' }}>Charges déductibles</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#ea580c', margin: 0 }}>{donnees.totalChargesDeductibles.toLocaleString('fr-FR')}€</p>
              </div>
              <div style={{ background: donnees.revenuNet >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: 16, padding: 20, border: `1px solid ${donnees.revenuNet >= 0 ? '#bbf7d0' : '#fecaca'}` }}>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px' }}>Revenu net</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: donnees.revenuNet >= 0 ? '#16a34a' : '#dc2626', margin: 0 }}>{donnees.revenuNet.toLocaleString('fr-FR')}€</p>
              </div>
            </div>

            {donnees.detailParBien.length > 0 && (
              <div style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 20, border: '1px solid #f3f4f6' }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Détail par bien</h2>
                {donnees.detailParBien.map((b, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{b.nom}</p>
                      <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{b.adresse}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 13, color: '#16a34a', margin: 0 }}>+{b.loyers.toLocaleString('fr-FR')}€</p>
                      <p style={{ fontSize: 13, color: '#ea580c', margin: 0 }}>-{b.charges.toLocaleString('fr-FR')}€</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid #f3f4f6' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Documents {annee}</h2>
              {donnees.documents.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: 13 }}>Aucun document pour cette année.</p>
              ) : donnees.documents.map(doc => (
                <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #f3f4f6' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{doc.nom_fichier}</p>
                      <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{doc.categorie}{doc.Biens?.nom ? ` — ${doc.Biens.nom}` : ''}</p>
                    </div>
                    <span style={{ color: '#2563eb', fontSize: 13, fontWeight: 600 }}>📥 Télécharger</span>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
