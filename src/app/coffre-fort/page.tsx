'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/supabase'

const CATEGORIES = [
  'Quittances',
  'Bail',
  'État des lieux entrée',
  'État des lieux sortie',
  'DPE',
  'Diagnostic amiante',
  'Diagnostic plomb',
  'Diagnostic électricité',
  'Diagnostic gaz',
  'Taxe foncière',
  'Assurance',
  'Factures travaux',
  'Acte de propriété',
  'Autre',
]

export default function CoffreFort() {
  const [userId, setUserId] = useState('')
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [categorie, setCategorie] = useState('Autre')
  const [message, setMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/auth'; return }
      setUserId(user.id)
      await loadFiles(user.id)
    }
    init()
  }, [])

  async function loadFiles(uid: string) {
    setLoading(true)
    const res = await fetch(`/api/documents?userId=${uid}`)
    const { files } = await res.json()
    setFiles(files || [])
    setLoading(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', userId)
    formData.append('path', categorie)

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    const { success, error } = await res.json()

    if (success) {
      setMessage('✅ Document uploadé avec succès !')
      await loadFiles(userId)
    } else {
      setMessage('❌ Erreur : ' + error)
    }
    setUploading(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', padding: '24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937' }}>🔒 Coffre-fort numérique</h1>
          <p style={{ color: '#6b7280', marginTop: 4 }}>Vos documents immobiliers sécurisés</p>
        </div>

        {/* Upload */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 16 }}>➕ Ajouter un document</h2>
          
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <select
              value={categorie}
              onChange={e => setCategorie(e.target.value)}
              style={{ flex: 1, minWidth: 200, border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14 }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ background: '#2563eb', color: 'white', padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
            >
              {uploading ? 'Upload...' : '📁 Choisir un fichier'}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            style={{ display: 'none' }}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />

          {message && (
            <p style={{ fontSize: 13, color: message.includes('✅') ? '#15803d' : '#dc2626' }}>{message}</p>
          )}
        </div>

        {/* Liste des fichiers */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 16 }}>📂 Mes documents</h2>

          {loading ? (
            <p style={{ color: '#6b7280', fontSize: 14 }}>Chargement...</p>
          ) : files.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>Aucun document pour l'instant</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {files.map((file, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{file.name}</p>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
  {file.categorie} — {file.metadata?.size ? (file.metadata.size / 1024).toFixed(1) + ' Ko' : ''}
</p>
                  </div>
                 {file.url && (
  <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ background: '#eff6ff', color: '#2563eb', padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
    📥 Télécharger
  </a>
)}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}