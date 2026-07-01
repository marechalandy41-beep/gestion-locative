'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import Nav from '../components/nav'

export default function BauxPage() {
  const [baux, setBaux] = useState([])
  const [loading, setLoading] = useState(true)
  // ===== MESSAGES NON LUS =====
  const [nonLusParBail, setNonLusParBail] = useState({})
  const [isMobile, setIsMobile] = useState(false)

useEffect(() => {
  const check = () => setIsMobile(window.innerWidth < 768)
  check()
  window.addEventListener('resize', check)
  return () => window.removeEventListener('resize', check)
}, [])

  useEffect(() => { chargerBaux() }, [])

  async function chargerBaux() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/auth'; return }
    const { data } = await supabase
      .from('Baux').select('*, Biens(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) {
      setBaux(data)
      // Charger les messages non lus
      if (data.length > 0) {
        chargerNonLus(data.map(b => b.id))
      }
    }
    setLoading(false)
  }

  // ===== CHARGER MESSAGES NON LUS PAR BAIL =====
  async function chargerNonLus(bailIds) {
    const { data } = await supabase
      .from('messages_locataires')
      .select('bail_id')
      .in('bail_id', bailIds)
      .eq('expediteur', 'locataire')
      .eq('lu', false)
    if (!data) return
    const compteur = {}
    data.forEach(m => {
      compteur[m.bail_id] = (compteur[m.bail_id] || 0) + 1
    })
    setNonLusParBail(compteur)
  }

  const statutStyle = (s) => ({
    actif:     { bg: '#dcfce7', color: '#16a34a', label: 'Actif' },
    brouillon: { bg: '#fef9c3', color: '#ca8a04', label: 'Brouillon' },
    termine:   { bg: '#fee2e2', color: '#dc2626', label: 'Terminé' },
  }[s] || { bg: '#f3f4f6', color: '#6b7280', label: s })

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p>Chargement...</p>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>

      <Nav pageCourante="baux" />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '16px' : '32px 24px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>Mes Baux</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>{baux.length} bail{baux.length > 1 ? 'x' : ''}</p>
          </div>
          <a href="/baux/nouveau" style={{ background: '#2563eb', color: 'white', padding: '10px 20px', borderRadius: 12, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            + Nouveau bail
          </a>
        </div>

        {baux.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 20, border: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 40, marginBottom: 16 }}>📋</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>Aucun bail</p>
            <a href="/baux/nouveau" style={{ display: 'inline-block', marginTop: 20, background: '#2563eb', color: 'white', padding: '10px 24px', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
              + Créer un bail
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: isMobile ? 16 : 24 }}>
            {baux.map(bail => {
              const s = statutStyle(bail.statut)
              const nbNonLus = nonLusParBail[bail.id] || 0
              return (
                <div key={bail.id}
                  onClick={() => window.location.href = '/baux/' + bail.id}
                  style={{ background: 'white', borderRadius: 20, border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: 24, cursor: 'pointer', position: 'relative' }}>

                  {/* Badge messages non lus sur la carte */}
                  {nbNonLus > 0 && (
                    <div style={{ position: 'absolute', top: 12, right: 12, background: '#dc2626', color: 'white', borderRadius: 99, padding: '2px 8px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      💬 {nbNonLus}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{bail.type_bail}</span>
                      <h3 style={{ fontWeight: 600, color: '#111827', fontSize: 14, marginTop: 4 }}>{bail.Biens?.nom || 'Bien inconnu'}</h3>
                      <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{bail.Biens?.adresse || ''}</p>
                    </div>
                    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                      {s.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid #f9fafb', borderBottom: '1px solid #f9fafb', margin: '12px 0' }}>
                    <div>
                      <p style={{ fontSize: 11, color: '#9ca3af' }}>Loyer HC</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginTop: 2 }}>{bail.loyer_hc}€</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: '#9ca3af' }}>Charges</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginTop: 2 }}>{bail.charges}€</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: '#9ca3af' }}>Total CC</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: '#2563eb', marginTop: 2 }}>{(bail.loyer_hc || 0) + (bail.charges || 0)}€</p>
                    </div>
                  </div>

                  {bail.locataire_prenom && (
                    <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                      👤 {bail.locataire_prenom} {bail.locataire_nom}
                    </p>
                  )}
                  {bail.date_debut && (
                    <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
                      📅 Depuis le {new Date(bail.date_debut).toLocaleDateString('fr-FR')}
                    </p>
                  )}

                  {bail.statut === 'brouillon' && (
                    <button
                      onClick={e => { e.stopPropagation(); window.location.href = '/baux/nouveau?id=' + bail.id; }}
                      style={{ width: '100%', marginTop: 8, background: '#fef9c3', color: '#ca8a04', border: '1px solid #fde68a', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      ✍️ Finaliser et signer
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
