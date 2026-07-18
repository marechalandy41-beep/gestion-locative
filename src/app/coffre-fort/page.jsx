'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import Nav from '../components/nav'

const CATEGORIES = [
  'Bail', 'Quittance', 'Mise en demeure', 'Attestation', 'État des lieux entrée', 'État des lieux sortie',
  'DPE', 'Diagnostic amiante', 'Diagnostic plomb', 'Diagnostic électricité',
  'Diagnostic gaz', 'Taxe foncière', 'Assurance', 'Factures travaux',
  'Acte de propriété', 'Autre'
]

const VALIDITE_CATEGORIES = {
  'DPE': { dureeAns: 10, label: '10 ans' },
  'Diagnostic électricité': { dureeAns: 3, label: '3 ans' },
  'Diagnostic gaz': { dureeAns: 3, label: '3 ans' },
  'Diagnostic amiante': { dureeAns: null, label: 'Illimité' },
  'Diagnostic plomb': { dureeAns: null, label: 'Illimité' },
}

function getStatutValidite(doc) {
  const regle = VALIDITE_CATEGORIES[doc.categorie]
  if (!regle || regle.dureeAns === null) return null
  if (!doc.date_document) return { statut: 'inconnu', label: 'Date du document manquante', bg: '#f3f4f6', color: '#6b7280' }
  const dateDoc = new Date(doc.date_document)
  const dateExpiration = new Date(dateDoc)
  dateExpiration.setFullYear(dateExpiration.getFullYear() + regle.dureeAns)
  const maintenant = new Date()
  const moisRestants = (dateExpiration.getFullYear() - maintenant.getFullYear()) * 12 + (dateExpiration.getMonth() - maintenant.getMonth())
  const anneeExp = dateExpiration.getFullYear()
  if (dateExpiration < maintenant) return { statut: 'expire', label: 'Expiré', bg: '#fee2e2', color: '#dc2626' }
  if (moisRestants <= 12) return { statut: 'bientot', label: `Expire en ${anneeExp}`, bg: '#fef9c3', color: '#ca8a04' }
  return { statut: 'valide', label: `Valide jusqu'en ${anneeExp}`, bg: '#dcfce7', color: '#16a34a' }
}

export default function CoffreFort() {
  const [user, setUser] = useState(null)
  const [biens, setBiens] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [bienSelectionne, setBienSelectionne] = useState(null)
  const [categorieSelectionnee, setCategorieSelectionnee] = useState(null)
  const [anneeSelectionnee, setAnneeSelectionnee] = useState(null)
  const [uploadBienId, setUploadBienId] = useState('')
  const [uploadCategorie, setUploadCategorie] = useState('Autre')
  const [uploadAnnee, setUploadAnnee] = useState(new Date().getFullYear().toString())
  const [uploadDateDocument, setUploadDateDocument] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOuverte, setSidebarOuverte] = useState(false)
  const [docASupprimer, setDocASupprimer] = useState(null)
  const [voirArchives, setVoirArchives] = useState(false)
  const [sousTypeSelectionne, setSousTypeSelectionne] = useState(null)
  const [vueAttestations, setVueAttestations] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
      const { error: uploadError } = await supabase.storage.from('documents').upload(nomFichier, fichier)
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
        date_document: uploadDateDocument || null,
      }])
      if (insertError) { setMessage('❌ Erreur sauvegarde : ' + insertError.message); setUploading(false); return }
      setMessage('✅ Document ajouté avec succès !')
      setShowUpload(false)
      await chargerDocuments(user.id)
    } catch (err) { setMessage('❌ Erreur : ' + err.message) }
    setUploading(false)
  }

  const docsFiltres = documents.filter(d => {
    if (!voirArchives && d.archive) return false
    if (voirArchives && !d.archive) return false
    if (vueAttestations) {
      if (d.categorie !== 'Attestation') return false
      if (sousTypeSelectionne && (d.sous_categorie || 'Autre') !== sousTypeSelectionne) return false
      return true
    }
    if (bienSelectionne && d.bien_id !== bienSelectionne) return false
    if (categorieSelectionnee && d.categorie !== categorieSelectionnee) return false
    if (anneeSelectionnee && d.annee !== anneeSelectionnee) return false
    if (sousTypeSelectionne && (d.sous_categorie || 'Autre') !== sousTypeSelectionne) return false
    return true
  })

  // Types d'attestation présents parmi les documents actuellement visibles
  const yaAttestations = docsFiltres.some(d => d.categorie === 'Attestation')
  const sousTypesAttestation = [...new Set(
    documents.filter(d => d.categorie === 'Attestation' && (voirArchives ? d.archive : !d.archive))
      .map(d => d.sous_categorie || 'Autre')
  )]
  const nbAttestations = documents.filter(d => d.categorie === 'Attestation' && !d.archive).length

  const docParBien = (bienId) => documents.filter(d => d.bien_id === bienId).length
  const docParCategorie = (bienId, cat) => documents.filter(d => d.bien_id === bienId && d.categorie === cat).length
  const anneesParCategorie = (bienId, cat) => [...new Set(documents.filter(d => d.bien_id === bienId && d.categorie === cat).map(d => d.annee))].sort((a,b) => b-a)

  const inp = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'white' }

  const titreVue = vueAttestations ? `📝 Attestations${sousTypeSelectionne ? ' — ' + sousTypeSelectionne : ''}` :
    !bienSelectionne ? '📁 Tous les documents' :
    !categorieSelectionnee ? `🏠 ${biens.find(b => b.id === bienSelectionne)?.nom}` :
    !anneeSelectionnee ? `📂 ${categorieSelectionnee}` :
    `📅 ${categorieSelectionnee} — ${anneeSelectionnee}`

  const SidebarContenu = () => (
    <>
      <div onClick={() => { setBienSelectionne(null); setCategorieSelectionnee(null); setAnneeSelectionnee(null); setVueAttestations(false); setSousTypeSelectionne(null); setSidebarOuverte(false) }}
        style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
          background: !bienSelectionne ? '#eff6ff' : 'transparent',
          color: !bienSelectionne ? '#2563eb' : '#374151',
          fontWeight: !bienSelectionne ? 600 : 400, fontSize: 14 }}>
        📁 Tous les documents <span style={{ fontSize: 12, color: '#9ca3af' }}>({documents.length})</span>
      </div>
      {biens.map(bien => (
        <div key={bien.id}>
          <div onClick={() => { setBienSelectionne(bien.id); setCategorieSelectionnee(null); setAnneeSelectionnee(null); setVueAttestations(false); setSousTypeSelectionne(null); setSidebarOuverte(false) }}

            style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
              background: bienSelectionne === bien.id && !categorieSelectionnee ? '#eff6ff' : 'transparent',
              color: bienSelectionne === bien.id ? '#2563eb' : '#374151',
              fontWeight: bienSelectionne === bien.id ? 600 : 400, fontSize: 14 }}>
            🏠 {bien.nom} <span style={{ fontSize: 12, color: '#9ca3af' }}>({docParBien(bien.id)})</span>
          </div>
          {bienSelectionne === bien.id && CATEGORIES.filter(cat => docParCategorie(bien.id, cat) > 0).map(cat => (
            <div key={cat}>
              <div onClick={() => { setCategorieSelectionnee(cat); setAnneeSelectionnee(null); setSousTypeSelectionne(null); setSidebarOuverte(false) }}
                style={{ padding: '6px 12px 6px 24px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                  background: categorieSelectionnee === cat && !anneeSelectionnee ? '#f0fdf4' : 'transparent',
                  color: categorieSelectionnee === cat ? '#16a34a' : '#6b7280', fontSize: 13 }}>
                📂 {cat} <span style={{ fontSize: 11, color: '#9ca3af' }}>({docParCategorie(bien.id, cat)})</span>
              </div>
              {categorieSelectionnee === cat && anneesParCategorie(bien.id, cat).map(annee => (
                <div key={annee} onClick={() => { setAnneeSelectionnee(annee); setSidebarOuverte(false) }}
                  style={{ padding: '5px 12px 5px 40px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                    background: anneeSelectionnee === annee ? '#fef9c3' : 'transparent',
                    color: anneeSelectionnee === annee ? '#ca8a04' : '#9ca3af', fontSize: 12 }}>
                  📅 {annee} <span style={{ fontSize: 11 }}>({documents.filter(d => d.bien_id === bien.id && d.categorie === cat && d.annee === annee).length})</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

{nbAttestations > 0 && (
        <div style={{ marginTop: 4 }}>
          <div onClick={() => { setVueAttestations(true); setBienSelectionne(null); setCategorieSelectionnee(null); setAnneeSelectionnee(null); setSousTypeSelectionne(null); setSidebarOuverte(false) }}
            style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
              background: vueAttestations && !sousTypeSelectionne ? '#eff6ff' : 'transparent',
              color: vueAttestations ? '#2563eb' : '#374151',
              fontWeight: vueAttestations ? 600 : 400, fontSize: 14 }}>
            📝 Attestations <span style={{ fontSize: 12, color: '#9ca3af' }}>({nbAttestations})</span>
          </div>
          {vueAttestations && sousTypesAttestation.map(t => (
            <div key={t} onClick={() => { setSousTypeSelectionne(t); setSidebarOuverte(false) }}
              style={{ padding: '6px 12px 6px 24px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                background: sousTypeSelectionne === t ? '#f0fdf4' : 'transparent',
                color: sousTypeSelectionne === t ? '#16a34a' : '#6b7280', fontSize: 13 }}>
              📂 {t} <span style={{ fontSize: 11, color: '#9ca3af' }}>({documents.filter(d => d.categorie === 'Attestation' && !d.archive && (d.sous_categorie || 'Autre') === t).length})</span>
            </div>
          ))}
        </div>
      )}

    </>
  )

async function telechargerPuisSupprimer(doc) {
    window.open(doc.url, '_blank')
    setTimeout(async () => {
      await supabase.storage.from('documents').remove([doc.storage_path])
      await supabase.from('Documents').delete().eq('id', doc.id)
      await chargerDocuments(user.id)
      setDocASupprimer(null)
    }, 1500)
  }

  async function supprimerDefinitif(doc) {
    await supabase.storage.from('documents').remove([doc.storage_path])
    await supabase.from('Documents').delete().eq('id', doc.id)
    await chargerDocuments(user.id)
    setDocASupprimer(null)
  }

  async function archiverDoc(doc) {
    await supabase.from('Documents').update({ archive: true }).eq('id', doc.id)
    await chargerDocuments(user.id)
    setDocASupprimer(null)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Nav pageCourante="documents" />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '16px' : '32px 24px' }}>

        {/* MOBILE — header avec bouton filtre */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>🔒 Coffre-fort</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setSidebarOuverte(!sidebarOuverte)}
                style={{ background: '#eff6ff', color: '#2563eb', padding: '8px 14px', borderRadius: 10, border: '1px solid #bfdbfe', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                📂 Filtrer
              </button>
              <button onClick={() => setShowUpload(!showUpload)}
                style={{ background: '#2563eb', color: 'white', padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                + Ajouter
              </button>
            </div>
          </div>
        )}

        {/* MOBILE — sidebar déroulante */}
        {isMobile && sidebarOuverte && (
          <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 }}>
            <SidebarContenu />
          </div>
        )}

        <div style={{ display: 'flex', gap: 24, flexDirection: isMobile ? 'column' : 'row' }}>

          {/* SIDEBAR DESKTOP */}
          {!isMobile && (
            <div style={{ width: 280, flexShrink: 0 }}>
              <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 16 }}>🔒 Coffre-fort</h2>
                <SidebarContenu />
              </div>
              <button onClick={() => setShowUpload(!showUpload)}
                style={{ width: '100%', background: '#2563eb', color: 'white', padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                + Ajouter un document
              </button>
            </div>
          )}

          {/* CONTENU PRINCIPAL */}
          <div style={{ flex: 1 }}>

            {/* Formulaire upload */}
            {showUpload && (
              <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 16 }}>➕ Ajouter un document</h3>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
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
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>
                      Date du document
                      {VALIDITE_CATEGORIES[uploadCategorie] && <span style={{ color: '#dc2626' }}> *</span>}
                    </label>
                    <input type="date" style={inp} value={uploadDateDocument} onChange={e => setUploadDateDocument(e.target.value)}
                      placeholder="Date d'établissement du document" />
                    {VALIDITE_CATEGORIES[uploadCategorie] && (
                      <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>
                        ℹ️ Durée de validité : {VALIDITE_CATEGORIES[uploadCategorie].label}
                      </p>
                    )}
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
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color: '#111827', margin: 0 }}>{titreVue}</h2>
              <button onClick={() => setVoirArchives(v => !v)}
                style={{ background: voirArchives ? '#fde047' : '#f3f4f6', color: voirArchives ? '#854d0e' : '#6b7280', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, marginTop: 8 }}>
                {voirArchives ? '← Retour aux documents actifs' : '📦 Voir les archives'}
              </button>
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
                  <div key={doc.id} style={{ background: 'white', borderRadius: 12, padding: isMobile ? '12px 16px' : '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <p style={{ fontSize: isMobile ? 13 : 14, fontWeight: 500, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {doc.nom_fichier}</p>
                        {(() => { const v = getStatutValidite(doc); return v ? (
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: v.bg, color: v.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {v.statut === 'expire' ? '⚠️' : v.statut === 'bientot' ? '⏳' : '✅'} {v.label}
                          </span>
                        ) : null })()}
                      </div>
                      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, margin: '4px 0 0' }}>
                        🏠 {doc.Biens?.nom} — 📂 {doc.categorie} — 📅 {doc.annee}
                        {doc.taille ? ` — ${(doc.taille / 1024).toFixed(0)} Ko` : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer"
                        style={{ background: '#eff6ff', color: '#2563eb', padding: isMobile ? '6px 10px' : '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                        📥
                      </a>
                      <button onClick={() => setDocASupprimer(doc)}
                        style={{ background: '#fef2f2', color: '#dc2626', padding: isMobile ? '6px 10px' : '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13 }}>
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

{docASupprimer && (
        <div onClick={() => setDocASupprimer(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 16, padding: 28, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Que faire de ce document ?</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {docASupprimer.nom_fichier}</p>

            <button onClick={() => telechargerPuisSupprimer(docASupprimer)}
              style={{ width: '100%', textAlign: 'left', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
              📥 Télécharger puis supprimer
              <span style={{ display: 'block', fontSize: 12, fontWeight: 400, color: '#3b82f6', marginTop: 2 }}>Récupère une copie avant de l'effacer</span>
            </button>

            <button onClick={() => archiverDoc(docASupprimer)}
              style={{ width: '100%', textAlign: 'left', background: '#fefce8', color: '#854d0e', border: '1px solid #fde047', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
              📦 Archiver
              <span style={{ display: 'block', fontSize: 12, fontWeight: 400, color: '#a16207', marginTop: 2 }}>Garde le document mais le masque de la liste</span>
            </button>

            <button onClick={() => supprimerDefinitif(docASupprimer)}
              style={{ width: '100%', textAlign: 'left', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
              🗑 Supprimer définitivement
              <span style={{ display: 'block', fontSize: 12, fontWeight: 400, color: '#dc2626', marginTop: 2 }}>Action irréversible</span>
            </button>

            <button onClick={() => setDocASupprimer(null)}
              style={{ width: '100%', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              Annuler
            </button>
          </div>
        </div>
      )}

    </main>
  )
}
