'use client'
import { useState, useEffect, useRef } from 'react'

export default function SignatureEDL() {
  const token = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : null
  const [edl, setEdl] = useState(null)
  const [erreurChargement, setErreurChargement] = useState('')
  const [refuse, setRefuse] = useState(false)
  const [dessin, setDessin] = useState(false)
  const [aSigne, setASigne] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState(false)
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/signature-edl-info?token=${token}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) setErreurChargement(json.error)
        else setEdl(json.edl)
      })
      .catch(() => setErreurChargement('Impossible de charger cet état des lieux.'))
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
    if (!refuse && !aSigne) { setErreur('Veuillez apposer votre signature dans le cadre prévu, ou cocher la case de refus.'); return }
    setLoading(true)
    try {
      const signatureLocataire = refuse ? null : canvasRef.current.toDataURL('image/png')
      const res = await fetch('/api/finaliser-signature-edl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signatureLocataire, locataireRefuse: refuse }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur lors de la signature')
      setSucces(true)
    } catch (e) {
      setErreur(e.message)
    }
    setLoading(false)
  }

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

  if (!edl) {
    return <main style={{ minHeight: '100vh', background: '#f9fafb' }}><p style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Chargement...</p></main>
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ background: '#2563eb', padding: '20px 24px', textAlign: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'white', fontWeight: 800, fontSize: 20 }}>
          <img src="/icon-192.png" alt="Ma Gestion-Locative" style={{ width: 28, height: 28, borderRadius: 6 }} /> Ma Gestion-Locative
        </span>
      </div>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px' }}>

        {succes ? (
          <div style={{ background: 'white', borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
              {refuse ? 'Refus de signature enregistré' : 'État des lieux signé avec succès'}
            </h1>
            <p style={{ color: '#6b7280', fontSize: 14 }}>
              {refuse
                ? "Votre refus a bien été transmis au propriétaire."
                : "Une copie signée vient de vous être envoyée par email."}
            </p>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
              ✍️ Signature de l'état des lieux {edl.type === 'entree' ? "d'entrée" : 'de sortie'}
            </h1>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
              {edl.bailleur_nom} vous invite à signer l'état des lieux.
            </p>

            <div style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Récapitulatif</h2>
              <p style={{ fontSize: 13, color: '#374151', margin: '0 0 4px' }}><b>Logement :</b> {edl.bien_nom || edl.bien_adresse}</p>
              <p style={{ fontSize: 13, color: '#374151', margin: '0 0 4px' }}><b>Adresse :</b> {edl.bien_adresse}</p>
              <p style={{ fontSize: 13, color: '#374151', margin: '0 0 4px' }}><b>Date :</b> {edl.date_edl ? new Date(edl.date_edl).toLocaleDateString('fr-FR') : '—'}</p>
              <p style={{ fontSize: 13, color: '#374151', margin: '0 0 4px' }}><b>{edl.nb_pieces} pièce{edl.nb_pieces > 1 ? 's' : ''}</b> renseignée{edl.nb_pieces > 1 ? 's' : ''}</p>
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>Le détail complet par pièce figure dans le document que vous recevrez signé par email.</p>
            </div>

            <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#374151', marginBottom: 16, cursor: 'pointer' }}>
                <input type="checkbox" checked={refuse} onChange={e => { setRefuse(e.target.checked); if (e.target.checked) effacer() }} style={{ marginTop: 2 }} />
                Je refuse de signer cet état des lieux.
              </label>

              {!refuse && (
                <>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Votre signature :</p>
                  <canvas ref={canvasRef} width={520} height={160}
                    onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                    onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                    style={{ width: '100%', maxWidth: 520, height: 160, border: '2px dashed #d1d5db', borderRadius: 10, touchAction: 'none', background: '#fafafa' }} />
                  <button onClick={effacer} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer', marginTop: 6, marginBottom: 16 }}>
                    Effacer et recommencer
                  </button>
                </>
              )}

              {erreur && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{erreur}</p>}

              <button onClick={signer} disabled={loading}
                style={{ width: '100%', background: loading ? '#9ca3af' : '#2563eb', color: 'white', padding: 14, borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 15 }}>
                {loading ? 'Envoi en cours...' : refuse ? '✅ Confirmer le refus' : '✅ Signer l\'état des lieux'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
