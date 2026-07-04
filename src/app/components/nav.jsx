'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

export default function Nav({ pageCourante = '' }) {
  const [plan, setPlan] = useState('gratuit')
  const [isMobile, setIsMobile] = useState(false)
  const [menuOuvert, setMenuOuvert] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('plan')
          .eq('user_id', data.user.id)
          .single()
        if (customerData?.plan) setPlan(customerData.plan)
      }
    })
  }, [])

  const estPayant = plan !== 'gratuit'

  const liens = [
    { href: '/dashboard', label: 'Baux actifs', id: 'dashboard', locked: !estPayant },
    { href: '/baux', label: 'Mes Baux', id: 'baux', locked: !estPayant },
    { href: '/biens', label: 'Mes Biens', id: 'biens', locked: false },
    { href: '/compte', label: 'Mon Compte', id: 'compte', locked: false },
    { href: '/documents', label: 'Documents', id: 'documents', locked: false },
  ]

  const deconnexion = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  return (
    <>
      <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href={estPayant ? '/dashboard' : '/biens'} style={{ fontSize: 22, fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>
            Ma Gestion-Locative
          </a>

          {/* DESKTOP */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              {liens.map(l => l.locked ? (
                <span key={l.id} style={{ color: '#d1d5db', fontWeight: 500, fontSize: 14, cursor: 'default' }}>🔒 {l.label}</span>
              ) : (
                <a key={l.id} href={l.href} style={{ color: pageCourante === l.id ? '#2563eb' : '#6b7280', borderBottom: pageCourante === l.id ? '2px solid #2563eb' : 'none', paddingBottom: pageCourante === l.id ? 4 : 0, textDecoration: 'none', fontWeight: 500, fontSize: 14 }}>
                  {l.label}
                </a>
              ))}
              <button onClick={deconnexion}
                style={{ background: '#fef2f2', color: '#dc2626', padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                Déconnexion
              </button>
            </div>
          )}

          {/* MOBILE — burger */}
          {isMobile && (
            <button onClick={() => setMenuOuvert(!menuOuvert)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: '#374151', padding: 4 }}>
              {menuOuvert ? '✕' : '☰'}
            </button>
          )}
        </div>

        {/* MOBILE — menu déroulant */}
        {isMobile && menuOuvert && (
          <div style={{ borderTop: '1px solid #e5e7eb', background: 'white' }}>
            {liens.map(l => l.locked ? (
              <div key={l.id} style={{ padding: '14px 24px', color: '#d1d5db', fontWeight: 500, fontSize: 15, borderBottom: '1px solid #f3f4f6' }}>
                🔒 {l.label}
              </div>
            ) : (
              <a key={l.id} href={l.href}
                onClick={() => setMenuOuvert(false)}
                style={{ display: 'block', padding: '14px 24px', color: pageCourante === l.id ? '#2563eb' : '#374151', fontWeight: pageCourante === l.id ? 700 : 500, fontSize: 15, textDecoration: 'none', borderBottom: '1px solid #f3f4f6', background: pageCourante === l.id ? '#eff6ff' : 'white' }}>
                {l.label}
              </a>
            ))}
            <button onClick={deconnexion}
              style={{ display: 'block', width: '100%', padding: '14px 24px', color: '#dc2626', fontWeight: 600, fontSize: 15, background: '#fef2f2', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              Déconnexion
            </button>
          </div>
        )}
      </nav>

      {!estPayant && (
        <div style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe', padding: '10px 24px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#1d4ed8' }}>
            🔒 Vous êtes sur le plan gratuit — <a href="/compte" style={{ fontWeight: 700, color: '#1d4ed8' }}>Passer au plan payant</a> pour accéder à tous les outils
          </p>
        </div>
      )}
    </>
  )
}
