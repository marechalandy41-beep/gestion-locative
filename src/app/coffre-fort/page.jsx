'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

const CATEGORIES = [
  'Bail', 'Quittances', 'État des lieux entrée', 'État des lieux sortie',
  'DPE', 'Diagnostic amiante', 'Diagnostic plomb', 'Diagnostic électricité',
  'Diagnostic gaz', 'Taxe foncière', 'Assurance', 'Factures travaux',
  'Acte de propriété', 'Autre'
]

export default function CoffreFort() {
  const [user, setUser] = useState(null)
  const [biens, setBiens] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [bienSelectionne, setBienSelectionne] = useState(null) // null = vue générale
  const [categorieSelectionnee, setCategorieSelectionnee] = useState(null)
  const [anneeSelectionnee, setAnneeSelectionnee] = useState(null)
  // Formulaire upload
  const [uploadBienId, setUploadBienId] = useState('')
  const [uploadCategorie, setUploadCategorie] = useState('Autre')
  const [uploadAnnee, setUploadAnnee] = useState(new Date().getFullYear().toString())
  const [showUpload, setShowUpload] = useState(false)

useEffect(() => {
    init().then(() => {
      const params = new URLSearchParams(window.location.search)
      const bienParam = params.get('bien')
      if (bienParam) setBienSelectionne(parseInt(bienParam))
    })
  }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/auth'; return }
    setUser(user)
    const { data: biensData } = await supabase.from('Biens').select('*').eq('user_id', user.id)
    setBiens(biensData || [])
    await chargerDocuments(user.id)
  }

  async function chargerDocuments(userId) {
    setLoading(true)
    const { data } = await supabase
      .from('Documents')
      .select('*, Biens(nom, adresse)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setDocuments(data || [])
    setLoading(false)
  }

  async function handleUpload(e) {
    const fichier = e.target.files[0]
    if (!fichier) return
    if (!uploadBienId) { alert('Sélectionnez un bien.'); return }
    if (fichier.size > 10 * 1024 * 1024) { alert('Fichier trop lourd — max 10 Mo.'); return }
    setUploading(true)
    setMessage('')
    try {
      const annee = uploadAnnee
      const nomFichier = `${user.id}/${uploadBienId}/${uploadCategorie}/${annee}/${Date.now()}_${fichier.name}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(nomFichier, fichier)
      if (uploadError) { setMessage('❌ Erreur upload : ' + uploadError.message); setUploading(false); return }
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(nomFichier)
      const { error: insertError } = await supabase.from('Documents').insert([{
        user_id: user.id,
        bien_id: parseInt(uploadBienId),
        nom_fichier: fichier.name,
        categorie: uploadCategorie,
        annee: parseInt(annee),
        storage_path: nomFichier,
        url: urlData.publicUrl,
        taille: fichier.size,
      }])
      if (insertError) { setMessage('❌ Erreur sauvegarde : ' + insertError.message); setUploading(false); return }
      setMessage('✅ Document ajouté avec succès !')
      setShowUpload(false)
      await chargerDocuments(user.id)
    } catch (err) { setMessage('❌ Erreur : ' + err.message) }
    setUploading(false)
  }

  // Filtrage des documents selon la navigation
  const docsFiltres = documents.filter(d => {
    if (bienSelectionne && d.bien_id !== bienSelectionne) return false
    if (categorieSelectionnee && d.categorie !== categorieSelectionnee) return false
    if (anneeSelectionnee && d.annee !== anneeSelectionnee) return false
    return true
  })

  // Stats par bien
  const docParBien = (bienId) => documents.filter(d => d.bien_id === bienId).length
  const docParCategorie = (bienId, cat) => documents.filter(d => d.bien_id === bienId && d.categorie === cat).length
  const anneesParCategorie = (bienId, cat) => [...new Set(documents.filter(d => d.bien_id === bienId && d.categorie === cat).map(d => d.annee))].sort((a,b) => b-a)

  const inp = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'white' }

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>

      {/* NAV */}
      <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/dashboard" style={{ fontSize: 22, fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>GestionLocative</a>
          <div style={{ display: 'flex', gap: 24, fontSize: 14, fontWeight: 500, alignItems: 'center' }}>
            <a href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none' }}>Baux actifs</a>
            <a href="/baux" style={{ color: '#6b7280', textDecoration: 'none' }}>Mes Baux</a>
            <a href="/biens" style={{ color: '#6b7280', textDecoration: 'none' }}>Mes Biens</a>
            <a href="/compte" style={{ color: '#6b7280', textDecoration: 'none' }}>Mon Compte</a>
            <a href="/documents" style={{ color: '#6b7280', textDecoration: 'none' }}>Documents</a>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/auth'; }}
              style={{ background: '#fef2f2', color: '#dc2626', padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px', display: 'flex', gap: 24 }}>

        {/* SIDEBAR NAVIGATION */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 16 }}>🔒 Coffre-fort</h2>

            {/* Vue générale */}
            <div onClick={() => { setBienSelectionne(null); setCategorieSelectionnee(null); setAnneeSelectionnee(null); }}
              style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                background: !bienSelectionne ? '#eff6ff' : 'transparent',
                color: !bienSelectionne ? '#2563eb' : '#374151',
                fontWeight: !bienSelectionne ? 600 : 400, fontSize: 14 }}>
              📁 Tous les documents <span style={{ fontSize: 12, color: '#9ca3af' }}>({documents.length})</span>
            </div>

            {/* Par bien */}
            {biens.map(bien => (
              <div key={bien.id}>
                <div onClick={() => { setBienSelectionne(bien.id); setCategorieSelectionnee(null); setAnneeSelectionnee(null); }}
                  style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                    background: bienSelectionne === bien.id && !categorieSelectionnee ? '#eff6ff' : 'transparent',
                    color: bienSelectionne === bien.id ? '#2563eb' : '#374151',
                    fontWeight: bienSelectionne === bien.id ? 600 : 400, fontSize: 14 }}>
                  🏠 {bien.nom} <span style={{ fontSize: 12, color: '#9ca3af' }}>({docParBien(bien.id)})</span>
                </div>

                {/* Catégories du bien */}
                {bienSelectionne === bien.id && CATEGORIES.filter(cat => docParCategorie(bien.id, cat) > 0).map(cat => (
                  <div key={cat}>
                    <div onClick={() => { setCategorieSelectionnee(cat); setAnneeSelectionnee(null); }}
                      style={{ padding: '6px 12px 6px 24px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                        background: categorieSelectionnee === cat && !anneeSelectionnee ? '#f0fdf4' : 'transparent',
                        color: categorieSelectionnee === cat ? '#16a34a' : '#6b7280',
                        fontSize: 13 }}>
                      📂 {cat} <span style={{ fontSize: 11, color: '#9ca3af' }}>({docParCategorie(bien.id, cat)})</span>
                    </div>

                    {/* Années */}
                    {categorieSelectionnee === cat && anneesParCategorie(bien.id, cat).map(annee => (
                      <div key={annee} onClick={() => setAnneeSelectionnee(annee)}
                        style={{ padding: '5px 12px 5px 40px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                          background: anneeSelectionnee === annee ? '#fef9c3' : 'transparent',
                          color: anneeSelectionnee === annee ? '#ca8a04' : '#9ca3af',
                          fontSize: 12 }}>
                        📅 {annee} <span style={{ fontSize: 11 }}>({documents.filter(d => d.bien_id === bien.id && d.categorie === cat && d.annee === annee).length})</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Bouton ajouter */}
          <button onClick={() => setShowUpload(!showUpload)}
            style={{ width: '100%', background: '#2563eb', color: 'white', padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            + Ajouter un document
          </button>
        </div>

        {/* CONTENU PRINCIPAL */}
        <div style={{ flex: 1 }}>

          {/* Formulaire upload */}
          {showUpload && (
            <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 16 }}>➕ Ajouter un document</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Bien *</label>
                  <select style={inp} value={uploadBienId} onChange={e => setUploadBienId(e.target.value)}>
                    <option value="">— Bien —</option>
                    {biens.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Catégorie</label>
                  <select style={inp} value={uploadCategorie} onChange={e => setUploadCategorie(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Année</label>
                  <select style={inp} value={uploadAnnee} onChange={e => setUploadAnnee(e.target.value)}>
                    {[2022,2023,2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <input type="file" id="file-upload" style={{ display: 'none' }}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleUpload} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label htmlFor="file-upload"
                  style={{ background: uploadBienId ? '#2563eb' : '#9ca3af', color: 'white', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: uploadBienId ? 'pointer' : 'not-allowed' }}>
                  {uploading ? 'Upload...' : '📁 Choisir le fichier'}
                </label>
                <button onClick={() => setShowUpload(false)}
                  style={{ background: '#f3f4f6', color: '#374151', padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13 }}>
                  Annuler
                </button>
              </div>
              {message && <p style={{ marginTop: 8, fontSize: 13, color: message.includes('✅') ? '#15803d' : '#dc2626' }}>{message}</p>}
            </div>
          )}

          {/* Header vue actuelle */}
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
              {!bienSelectionne ? '📁 Tous les documents' :
                !categorieSelectionnee ? `🏠 ${biens.find(b => b.id === bienSelectionne)?.nom}` :
                !anneeSelectionnee ? `📂 ${categorieSelectionnee}` :
                `📅 ${categorieSelectionnee} — ${anneeSelectionnee}`}
            </h2>
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{docsFiltres.length} document{docsFiltres.length > 1 ? 's' : ''}</p>
          </div>

          {/* Liste documents */}
          {loading ? (
            <p style={{ color: '#6b7280' }}>Chargement...</p>
          ) : docsFiltres.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p style={{ color: '#6b7280', fontSize: 14 }}>Aucun document dans cette section</p>
              <button onClick={() => setShowUpload(true)}
                style={{ marginTop: 16, background: '#2563eb', color: 'white', padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                + Ajouter un document
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {docsFiltres.map(doc => (
                <div key={doc.id} style={{ background: 'white', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: 0 }}>📄 {doc.nom_fichier}</p>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                      🏠 {doc.Biens?.nom} — 📂 {doc.categorie} — 📅 {doc.annee}
                      {doc.taille ? ` — ${(doc.taille / 1024).toFixed(0)} Ko` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      style={{ background: '#eff6ff', color: '#2563eb', padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                      📥 Ouvrir
                    </a>
                    <button onClick={async () => {
                      if (!confirm('Supprimer ce document ?')) return
                      await supabase.storage.from('documents').remove([doc.storage_path])
                      await supabase.from('Documents').delete().eq('id', doc.id)
                      await chargerDocuments(user.id)
                    }}
                      style={{ background: '#fef2f2', color: '#dc2626', padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13 }}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}