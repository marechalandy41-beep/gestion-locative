'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../supabase'

export default function NouveauBail() {
  const [biens, setBiens] = useState([])
  const [user, setUser] = useState(null)
  const [ecran, setEcran] = useState('choix') // choix | choix-type | import
  const [bienImport, setBienImport] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) { window.location.href = '/auth'; return }
      const { data: customer } = await supabase.from('customers').select('plan').eq('user_id', data.user.id).single()
      if (!customer || customer.plan === 'gratuit') { window.location.href = '/biens?plan=gratuit'; return }
      setUser(data.user)
      const { data: biensData } = await supabase.from('Biens').select('*').eq('user_id', data.user.id)
      setBiens(biensData || [])
    })
  }, [])

  async function importerBail() {
    if (!bienImport) { alert('Sélectionnez un bien.'); return }
    setUploading(true)
    let pdfUrl = null
    if (pdfFile) {
      const nomFichier = `baux/${user.id}/${Date.now()}_${pdfFile.name}`
      const { error } = await supabase.storage.from('documents').upload(nomFichier, pdfFile)
      if (!error) {
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(nomFichier)
        pdfUrl = urlData.publicUrl
      }
    }
    const { data: bail, error } = await supabase.from('Baux').insert({
      user_id: user.id,
      bien_id: parseInt(bienImport),
      statut: 'actif',
      type_bail: 'Non meublé',
      ...(pdfUrl && { bail_pdf_url: pdfUrl }),
    }).select().single()
    setUploading(false)
    if (error) { alert('Erreur : ' + error.message); return }
    await fetch('/api/sync-quantity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) }).catch(() => {})
    window.location.href = `/baux/${bail.id}`
  }

  const typesBail = [
    { id: 'non-meuble', emoji: '🏠', label: 'Non meublé', desc: 'Loi 89-462 — Durée minimale 3 ans', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    { id: 'meuble', emoji: '🛋️', label: 'Meublé', desc: 'Loi 89-462 — Durée minimale 1 an', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
    { id: 'commercial', emoji: '🏢', label: 'Commercial (3-6-9)', desc: 'Loi 1953 — Durée minimale 9 ans', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
   { id: 'parking', emoji: '🅿️', label: 'Parking / Garage', desc: 'Bail libre — non encadré par la loi 89-462', color: '#ca8a04', bg: '#fefce8', border: '#fde047' },
    { id: 'etudiant', emoji: '🎓', label: 'Bail étudiant', desc: 'Meublé — Durée 9 mois non renouvelable', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' },
    { id: 'mobilite', emoji: '⚡', label: 'Bail mobilité', desc: 'Meublé — Durée 1 à 10 mois', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
    { id: 'autre', emoji: '📦', label: 'Autre', desc: 'Stockage, cave, local divers...', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
  ]


  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        <button onClick={() => ecran === 'choix-type' ? setEcran('choix') : window.location.href = '/baux'}
          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>
          ← Retour
        </button>

        {/* ÉCRAN 1 — CHOIX PRINCIPAL */}
        {ecran === 'choix' && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Nouveau bail</h1>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 28 }}>Vous avez déjà un bail ou vous souhaitez en créer un ?</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* J'ai déjà un bail */}
              <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '2px solid transparent', cursor: 'pointer' }}
                onClick={() => setEcran('import')}
                onMouseEnter={e => e.currentTarget.style.border = '2px solid #2563eb'}
                onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ fontSize: 36 }}>📋</div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>J'ai déjà un bail signé</h3>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Importez votre PDF et renseignez les infos principales.</p>
                  </div>
                </div>
                {ecran === 'import' && (
                  <div style={{ marginTop: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Bien concerné *</label>
                    <select style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', marginBottom: 12 }}
                      value={bienImport} onChange={e => setBienImport(e.target.value)}>
                      <option value="">— Sélectionnez un bien —</option>
                      {biens.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                    </select>
                    <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>PDF du bail (optionnel)</label>
                    <input ref={fileRef} type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files[0])} style={{ display: 'none' }} />
                    <button onClick={e => { e.stopPropagation(); fileRef.current.click() }}
                      style={{ background: '#f3f4f6', color: '#374151', padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 13, marginBottom: 12, display: 'block' }}>
                      {pdfFile ? `📄 ${pdfFile.name}` : '📁 Choisir un PDF'}
                    </button>
                    <button onClick={e => { e.stopPropagation(); importerBail() }} disabled={uploading}
                      style={{ width: '100%', background: uploading ? '#93c5fd' : '#2563eb', color: 'white', padding: '10px', borderRadius: 8, border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14 }}>
                      {uploading ? '⏳ Import...' : '✅ Importer ce bail'}
                    </button>
                  </div>
                )}
              </div>

              {/* Créer un bail officiel */}
              <div onClick={() => setEcran('choix-type')}
                style={{ background: '#2563eb', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ fontSize: 36 }}>✍️</div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: '0 0 4px' }}>Créer un bail officiel</h3>
                  <p style={{ fontSize: 13, color: '#bfdbfe', margin: 0 }}>Formulaire complet — PDF généré + signature.</p>
                </div>
              </div>

            </div>
          </>
        )}

        {/* ÉCRAN 1b — IMPORT */}
        {ecran === 'import' && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Importer un bail existant</h1>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 28 }}>Renseignez le bien et importez votre PDF signé.</p>
            <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Bien concerné *</label>
                <select style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  value={bienImport} onChange={e => setBienImport(e.target.value)}>
                  <option value="">— Sélectionnez un bien —</option>
                  {biens.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>PDF du bail (optionnel)</label>
                <input ref={fileRef} type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files[0])} style={{ display: 'none' }} />
                <button onClick={() => fileRef.current.click()}
                  style={{ background: '#f3f4f6', color: '#374151', padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 13 }}>
                  {pdfFile ? `📄 ${pdfFile.name}` : '📁 Choisir un PDF'}
                </button>
              </div>
              <button onClick={importerBail} disabled={uploading}
                style={{ width: '100%', background: uploading ? '#93c5fd' : '#2563eb', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 15 }}>
                {uploading ? '⏳ Import...' : '✅ Importer ce bail'}
              </button>
            </div>
          </>
        )}

        {/* ÉCRAN 2 — CHOIX TYPE */}
        {ecran === 'choix-type' && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Quel type de bail ?</h1>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 28 }}>Choisissez le type de bail adapté à votre situation.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {typesBail.map(type => (
                <div key={type.id}
                  onClick={() => window.location.href = '/baux/nouveau/' + type.id}
                  style={{ background: type.bg, borderRadius: 14, padding: '18px 20px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center', border: `2px solid transparent`, transition: 'border 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.border = `2px solid ${type.border}`}
                  onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
                  <div style={{ fontSize: 32, flexShrink: 0 }}>{type.emoji}</div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: type.color, margin: '0 0 3px' }}>{type.label}</h3>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{type.desc}</p>
                  </div>
                  <div style={{ marginLeft: 'auto', color: type.color, fontSize: 18 }}>→</div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </main>
  )
}
