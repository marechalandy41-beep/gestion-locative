'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../../supabase'
import Nav from '../../../components/nav'
import JSZip from 'jszip'

const DOCUMENTS_VENTE = [
  { id: 'titre_propriete', label: 'Titre de propriété', obligatoire: true, info: 'Acte notarié prouvant que vous êtes propriétaire' },
  { id: 'dpe', label: 'Diagnostic de performance énergétique (DPE)', obligatoire: true, info: 'Valide 10 ans' },
  { id: 'diagnostic_electricite', label: 'Diagnostic électricité', obligatoire: true, info: 'Obligatoire si installation > 15 ans' },
  { id: 'diagnostic_gaz', label: 'Diagnostic gaz', obligatoire: true, info: 'Obligatoire si installation > 15 ans' },
  { id: 'diagnostic_amiante', label: 'Diagnostic amiante', obligatoire: true, info: 'Obligatoire si construction avant 1997' },
  { id: 'diagnostic_plomb', label: 'Diagnostic plomb (CREP)', obligatoire: true, info: 'Obligatoire si construction avant 1949' },
  { id: 'diagnostic_termites', label: 'Diagnostic termites', obligatoire: false, info: 'Selon zone géographique' },
  { id: 'diagnostic_assainissement', label: 'Diagnostic assainissement', obligatoire: false, info: 'Obligatoire pour maison individuelle' },
  { id: 'bail_en_cours', label: 'Bail en cours', obligatoire: false, info: 'Si le bien est loué' },
  { id: 'quittances', label: 'Dernières quittances de loyer', obligatoire: false, info: 'Si le bien est loué' },
  { id: 'charges_copro', label: 'Appels de charges copropriété', obligatoire: false, info: 'Si bien en copropriété' },
  { id: 'reglement_copro', label: 'Règlement de copropriété', obligatoire: false, info: 'Si bien en copropriété' },
  { id: 'pv_ag', label: 'PV des 3 dernières AG de copropriété', obligatoire: false, info: 'Si bien en copropriété' },
  { id: 'taxe_fonciere', label: 'Taxe foncière', obligatoire: true, info: 'Dernier avis de taxe foncière' },
  { id: 'plan_cadastral', label: 'Plan cadastral', obligatoire: false, info: 'Disponible sur cadastre.gouv.fr' },
]

export default function PageVendre() {
  const id = typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : null
  const [bien, setBien] = useState(null)
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) { window.location.href = '/auth'; return; }
      setUser(data.user)
      const { data: bienData } = await supabase.from('Biens').select('*').eq('id', parseInt(id)).single()
      setBien(bienData)
      const { data: docsData } = await supabase.from('Documents').select('*').eq('bien_id', parseInt(id))
      setDocs(docsData || [])
      setLoading(false)
    })
  }, [])

  function docPresent(docId) {
    return docs.some(d =>
      d.storage_path?.includes('/Vente/') &&
      d.storage_path?.includes(docId)
    )
  }

  async function uploaderDoc(docId, label, fichier) {
    if (!fichier) return
    setUploading(docId)
    try {
      const ext = fichier.name.split('.').pop()
      const chemin = `${user.id}/${id}/Vente/${Date.now()}_${docId}.${ext}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(chemin, fichier)
      if (uploadError) { alert('Erreur upload : ' + uploadError.message); setUploading(null); return }
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(chemin)
      const { error: insertError } = await supabase.from('Documents').insert({
        user_id: user.id,
        bien_id: parseInt(id),
        nom_fichier: fichier.name,
        categorie: label,
        url: urlData.publicUrl,
        storage_path: chemin,
        annee: new Date().getFullYear(),
      })
      if (insertError) { alert('Erreur insert : ' + insertError.message); setUploading(null); return }
      const { data: docsData } = await supabase.from('Documents').select('*').eq('bien_id', parseInt(id))
      setDocs(docsData || [])
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
    setUploading(null)
  }

  async function supprimerDoc(docId) {
    const docASuppr = docs.find(d => d.storage_path?.includes('/Vente/') && d.storage_path?.includes(docId))
    if (!docASuppr) return
    if (!confirm('Supprimer ce document ?')) return
    await supabase.storage.from('documents').remove([docASuppr.storage_path])
    await supabase.from('Documents').delete().eq('id', docASuppr.id)
    const { data: docsData } = await supabase.from('Documents').select('*').eq('bien_id', parseInt(id))
    setDocs(docsData || [])
  }

  const docsPresents = DOCUMENTS_VENTE.filter(d => docPresent(d.id)).length
  const docsObligatoires = DOCUMENTS_VENTE.filter(d => d.obligatoire)
  const docsObligatoiresPresents = docsObligatoires.filter(d => docPresent(d.id)).length
  const pct = Math.round((docsPresents / DOCUMENTS_VENTE.length) * 100)

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6b7280' }}>Chargement...</p>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Nav pageCourante="biens" />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>

        <button onClick={() => window.location.href = '/biens'} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>← Retour</button>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>🏷️ Préparer la vente</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>{bien?.nom} — {bien?.adresse}</p>
        </div>

        {/* PROGRESSION */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>Dossier de vente</span>
            <span style={{ fontWeight: 700, color: pct === 100 ? '#16a34a' : '#2563eb', fontSize: 15 }}>{pct}%</span>
          </div>
          <div style={{ background: '#e5e7eb', borderRadius: 999, height: 8, marginBottom: 12 }}>
            <div style={{ background: pct === 100 ? '#16a34a' : '#2563eb', borderRadius: 999, height: 8, width: `${pct}%`, transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 4px' }}>Documents présents</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>{docsPresents}/{DOCUMENTS_VENTE.length}</p>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 4px' }}>Obligatoires</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: docsObligatoiresPresents === docsObligatoires.length ? '#16a34a' : '#f59e0b', margin: 0 }}>
                {docsObligatoiresPresents}/{docsObligatoires.length}
              </p>
            </div>
          </div>
        </div>

        {/* BOUTON ZIP */}
        {docsPresents > 0 && (
          <div style={{ background: 'white', borderRadius: 16, padding: 20, marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 600, color: '#111827', fontSize: 15, margin: '0 0 4px' }}>📦 Télécharger le dossier complet</p>
              <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>{docsPresents} document{docsPresents > 1 ? 's' : ''} — ZIP prêt à envoyer au notaire</p>
            </div>
            <button onClick={async () => {
              const zip = new JSZip()
              const docsVente = docs.filter(d => d.storage_path?.includes('/Vente/'))
              for (const doc of docsVente) {
                try {
                  const res = await fetch(doc.url)
                  const blob = await res.blob()
                  zip.file(doc.nom_fichier, blob)
                } catch (err) {
                  console.log('Erreur fetch doc:', err)
                }
              }
              const content = await zip.generateAsync({ type: 'blob' })
              const url = URL.createObjectURL(content)
              const a = document.createElement('a')
              a.href = url
              a.download = `Dossier_vente_${bien?.nom || 'bien'}_${new Date().toISOString().split('T')[0]}.zip`
              a.click()
              URL.revokeObjectURL(url)
            }}
              style={{ background: '#2563eb', color: 'white', padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>
              📥 Télécharger ZIP
            </button>
          </div>
        )}

        {/* CHECKLIST */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>📋 Checklist des documents</h2>
          {DOCUMENTS_VENTE.map((doc) => {
            const present = docPresent(doc.id)
            return (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: present ? '#dcfce7' : '#f3f4f6', fontSize: 14, flexShrink: 0 }}>
                    {present ? '✅' : '⬜'}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: '0 0 2px' }}>
                      {doc.label}
                      {doc.obligatoire && <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, marginLeft: 8 }}>Obligatoire</span>}
                    </p>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{doc.info}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
                  <label style={{ background: '#eff6ff', color: '#2563eb', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {uploading === doc.id ? '⏳' : '+ Ajouter'}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                      onChange={e => { if (e.target.files[0]) uploaderDoc(doc.id, doc.label, e.target.files[0]) }} />
                  </label>
                  {present && (
                    <button onClick={() => supprimerDoc(doc.id)}
                      style={{ background: '#fef2f2', color: '#dc2626', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' }}>
                      🗑 Supprimer
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </main>
  )
}
