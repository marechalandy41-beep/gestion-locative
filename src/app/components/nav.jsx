'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'

export default function Nav({ pageCourante = '' }) {
  const [plan, setPlan] = useState('gratuit')
  const [isMobile, setIsMobile] = useState(false)
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [user, setUser] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [notifOuvert, setNotifOuvert] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        setUser(data.user)
        const { data: customerData } = await supabase
          .from('customers')
          .select('plan')
          .eq('user_id', data.user.id)
          .single()
        if (customerData?.plan) setPlan(customerData.plan)
        chargerNotifications(data.user.id)
      }
    })
  }, [])

  // Fermer le dropdown si clic en dehors
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOuvert(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Polling toutes les 30 secondes
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => chargerNotifications(user.id), 30000)
    return () => clearInterval(interval)
  }, [user])

  async function chargerNotifications(userId) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
  }

  async function marquerToutesLues() {
    if (!user) return
    await supabase.from('notifications').update({ lu: true }).eq('user_id', user.id).eq('lu', false)
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })))
  }

  async function marquerLue(notifId) {
    await supabase.from('notifications').update({ lu: true }).eq('id', notifId)
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, lu: true } : n))
  }

  const nbNonLues = notifications.filter(n => !n.lu).length

  const iconNotif = (type) => {
    if (type === 'message') return '💬'
    if (type === 'loyer') return '💰'
    if (type === 'bail_fin') return '📅'
    if (type === 'document_expire') return '📄'
    if (type === 'quittance') return '✅'
    return '🔔'
  }

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
      <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'relative', zIndex: 100 }}>
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

              {/* CLOCHE NOTIFICATIONS */}
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button onClick={() => { setNotifOuvert(!notifOuvert); if (!notifOuvert) marquerToutesLues() }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, position: 'relative', padding: '4px 8px', borderRadius: 8, color: '#374151' }}>
                  🔔
                  {nbNonLues > 0 && (
                    <span style={{ position: 'absolute', top: 0, right: 0, background: '#dc2626', color: 'white', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>
                      {nbNonLues > 9 ? '9+' : nbNonLues}
                    </span>
                  )}
                </button>

                {/* DROPDOWN NOTIFICATIONS */}
                {notifOuvert && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, width: 360, background: 'white', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb', zIndex: 999, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>🔔 Notifications</span>
                      {nbNonLues > 0 && (
                        <button onClick={marquerToutesLues} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                          Tout marquer lu
                        </button>
                      )}
                    </div>
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: 32, textAlign: 'center' }}>
                          <p style={{ fontSize: 32, marginBottom: 8 }}>🔕</p>
                          <p style={{ color: '#9ca3af', fontSize: 13 }}>Aucune notification</p>
                        </div>
                      ) : notifications.map(n => (
                        <div key={n.id}
                          onClick={() => { marquerLue(n.id); if (n.lien) window.location.href = n.lien; setNotifOuvert(false) }}
                          style={{ padding: '12px 16px', borderBottom: '1px solid #f9fafb', cursor: n.lien ? 'pointer' : 'default', background: n.lu ? 'white' : '#eff6ff', display: 'flex', gap: 12, alignItems: 'flex-start' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                          onMouseLeave={e => e.currentTarget.style.background = n.lu ? 'white' : '#eff6ff'}>
                          <span style={{ fontSize: 20, flexShrink: 0 }}>{iconNotif(n.type)}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, color: '#111827', margin: '0 0 4px', fontWeight: n.lu ? 400 : 600, lineHeight: 1.4 }}>{n.message}</p>
                            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                              {new Date(n.created_at).toLocaleDateString('fr-FR')} à {new Date(n.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {!n.lu && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', flexShrink: 0, marginTop: 4 }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={deconnexion}
                style={{ background: '#fef2f2', color: '#dc2626', padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                Déconnexion
              </button>
            </div>
          )}

          {/* MOBILE — burger */}
          {isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Cloche mobile */}
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button onClick={() => { setNotifOuvert(!notifOuvert); if (!notifOuvert) marquerToutesLues() }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, position: 'relative', padding: '4px' }}>
                  🔔
                  {nbNonLues > 0 && (
                    <span style={{ position: 'absolute', top: 0, right: 0, background: '#dc2626', color: 'white', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 5px' }}>
                      {nbNonLues > 9 ? '9+' : nbNonLues}
                    </span>
                  )}
                </button>
                {notifOuvert && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, width: 300, background: 'white', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb', zIndex: 999, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>🔔 Notifications</span>
                    </div>
                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>Aucune notification</p>
                      ) : notifications.map(n => (
                        <div key={n.id} onClick={() => { marquerLue(n.id); if (n.lien) window.location.href = n.lien; setNotifOuvert(false) }}
                          style={{ padding: '12px 16px', borderBottom: '1px solid #f9fafb', cursor: 'pointer', background: n.lu ? 'white' : '#eff6ff' }}>
                          <p style={{ fontSize: 13, color: '#111827', margin: '0 0 4px', fontWeight: n.lu ? 400 : 600 }}>{iconNotif(n.type)} {n.message}</p>
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{new Date(n.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setMenuOuvert(!menuOuvert)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: '#374151', padding: 4 }}>
                {menuOuvert ? '✕' : '☰'}
              </button>
            </div>
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