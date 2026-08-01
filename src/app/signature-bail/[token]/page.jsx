'use client'
import { useState, useEffect, useRef } from 'react'

export default function SignatureBail() {
  const token = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : null
  const [bail, setBail] = useState(null)
  const [erreurChargement, setErreurChargement] = useState('')
  const [luApprouve, setLuApprouve] = useState(false)
  const [dessin, setDessin] = useState(false)
  const [aSigne, setASigne] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState(false)
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/signature-bail-info?token=${token}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) setErreurChargement(json.error)
        else setBail(json.bail)
      })
      .catch(() => setErreurChargement('Impossible de charger ce bail.'))
  }, [token])

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
    if (!dessin) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#1e40af'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.lineTo(x, y); ctx.stroke()
    setASigne(true)
  }
  function stopDraw() { setDessin(false) }
  function effacer() { canvasRef.current.getContext('2d').clearRect(0, 0, 520, 160); setASigne(false) }

  async function signer() {
    setErreur('')
    if (!luApprouve) { setErreur('Vous devez cocher « Lu et approuvé » avant de signer.'); return }
    if (!aSigne) { setErreur('Veuillez apposer votre signature dans le cadre prévu.'); return }
    setLoading(true)
    try {
      const signatureLocataire = canvasRef.current.toDataURL('image/png')
      const res = await fetch('/api/finaliser-signature-bail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signatureLocataire, luApprouve }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur lors de la signature')
      setSucces(true)
    } catch (e) {
      setErreur(e.message)
    }
    setLoading(false)
  }

  const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14 }

  if (erreurChargement) {
    return (
      <main style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 480, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <p style={{ color: '#374151' }}>{erreurChargement}</p>
        </div>
      </main>
    )
  }

  if (!bail) {
    return <main style={{ minHeight: '100vh', background: '#f9fafb' }}><p style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Chargement...</p></main>
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ background: '#2563eb', padding: '20px 24px', textAlign: 'center' }}>
        <span style={{ color: 'white', fontWeight: 800, fontSize: 20 }}>🏠 Ma Gestion-Locative</span>
      </div>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px' }}>

        {succes ? (
          <div style={{ background: 'white', borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Bail signé avec succès</h1>
            <p style={{ color: '#6b7280', fontSize: 14 }}>
              Le bail est maintenant définitivement conclu. Une copie signée vient de vous être envoyée par email.
            </p>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>✍️ Signature de votre bail</h1>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
              {bail.bailleur_nom} vous invite à signer votre contrat de location.
            </p>

            <div style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Récapitulatif</h2>
              <p style={{ fontSize: 13, color: '#374151', margin: '0 0 4px' }}><b>Logement :</b> {bail.bien_nom || bail.bien_adresse}</p>
              <p style={{ fontSize: 13, color: '#374151', margin: '0 0 4px' }}><b>Adresse :</b> {bail.bien_adresse}</p>
              <p style={{ fontSize: 13, color: '#374151', margin: '0 0 4px' }}><b>Loyer HC :</b> {bail.loyer_hc} € — <b>Charges :</b> {bail.charges} €</p>
              {bail.depot_garantie ? <p style={{ fontSize: 13, color: '#374151', margin: '0 0 4px' }}><b>Dépôt de garantie :</b> {bail.depot_garantie} €</p> : null}
              <p style={{ fontSize: 13, color: '#374151', margin: '0 0 4px' }}><b>Début du bail :</b> {bail.date_debut ? new Date(bail.date_debut).toLocaleDateString('fr-FR') : '—'}</p>
              <a href={`/api/apercu-bail?token=${token}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, background: '#eff6ff', color: '#1e40af', padding: '12px', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14, border: '1px solid #bfdbfe' }}>
                📄 Lire le contrat complet avant de signer
              </a>
            </div>

            <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#374151', marginBottom: 16, cursor: 'pointer' }}>
                <input type="checkbox" checked={luApprouve} onChange={e => setLuApprouve(e.target.checked)} style={{ marginTop: 2 }} />
                Je certifie avoir lu et approuvé l'intégralité des termes de ce bail.
              </label>

              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Votre signature :</p>
              <canvas ref={canvasRef} width={520} height={160}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                style={{ width: '100%', maxWidth: 520, height: 160, border: '2px dashed #d1d5db', borderRadius: 10, touchAction: 'none', background: '#fafafa' }} />
              <button onClick={effacer} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer', marginTop: 6, marginBottom: 16 }}>
                Effacer et recommencer
              </button>

              {erreur && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{erreur}</p>}

              <button onClick={signer} disabled={loading}
                style={{ width: '100%', background: loading ? '#9ca3af' : '#2563eb', color: 'white', padding: 14, borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 15 }}>
                {loading ? 'Signature en cours...' : '✅ Signer le bail'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
