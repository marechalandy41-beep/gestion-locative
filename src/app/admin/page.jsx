'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

export default function Admin() {
  const [codes, setCodes] = useState([])
  const [nouveauCode, setNouveauCode] = useState({ code: '', reduction: 10, type: 'promo', usage_max: '', expire_le: '' })
  const [showFormCode, setShowFormCode] = useState(false)
  const [settings, setSettings] = useState({})
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsToast, setSettingsToast] = useState(false)
  const [accesOk, setAccesOk] = useState(false)
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [conversations, setConversations] = useState([])
  const [conversationActive, setConversationActive] = useState(null)
  const [messagesConversation, setMessagesConversation] = useState([])
  const [nouveauMessageAdmin, setNouveauMessageAdmin] = useState('')
  const [envoiAdminLoading, setEnvoiAdminLoading] = useState(false)
  const [onglet, setOnglet] = useState('dashboard')

  useEffect(() => {
    const adminOk = sessionStorage.getItem('admin_ok')
    if (adminOk === 'true') {
      setAccesOk(true)
      chargerDonnees()
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(async () => {
      // Rafraîchit la liste des conversations (pour la surbrillance des nouvelles)
      const res = await fetch('/api/admin/conversations')
      const data = await res.json()
      if (data.conversations) setConversations(data.conversations)

      // Si une conversation est ouverte, rafraîchit aussi ses messages
      if (conversationActive) {
        const res2 = await fetch(`/api/admin/conversation-messages?conversationId=${conversationActive.id}`)
        const data2 = await res2.json()
        if (data2.messages) setMessagesConversation(data2.messages)
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [conversationActive])

  async function verifierMotDePasse() {
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: motDePasse }),
    })
    const data = await res.json()
    if (data.ok) {
      sessionStorage.setItem('admin_ok', 'true')
      setAccesOk(true)
      chargerDonnees()
    } else {
      setErreur('Mot de passe incorrect')
    }
  }

  async function chargerDonnees() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      setStats(data.stats)
      setUsers(data.users)
      const resSettings = await fetch('/api/admin/settings')
      const dataSettings = await resSettings.json()
      if (dataSettings.settings) setSettings(dataSettings.settings)
    } catch (err) {
      console.error(err)
    }
    const resCodes = await fetch('/api/admin/codes-promo')
    const dataCodes = await resCodes.json()
    if (dataCodes.codes) setCodes(dataCodes.codes)

    const resConvs = await fetch('/api/admin/conversations')
    const dataConvs = await resConvs.json()
    if (dataConvs.conversations) setConversations(dataConvs.conversations)

    setLoading(false)
  }

  async function sauvegarderSetting(cle, valeur) {
    setSavingSettings(true)
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cle, valeur }),
    })
    setSavingSettings(false)
    setSettingsToast(true)
    setTimeout(() => setSettingsToast(false), 2000)
  }

async function ouvrirConversationAdmin(conv) {
    setConversationActive(conv)
    const res = await fetch(`/api/admin/conversation-messages?conversationId=${conv.id}`)
    const data = await res.json()
    setMessagesConversation(data.messages || [])
  }

  async function envoyerMessageAdmin() {
    if (!nouveauMessageAdmin.trim() || !conversationActive) return
    setEnvoiAdminLoading(true)
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversationActive.id,
          expediteur: 'admin',
          contenu: nouveauMessageAdmin.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setNouveauMessageAdmin('')
        ouvrirConversationAdmin(conversationActive)
      } else {
        alert('Erreur : ' + data.error)
      }
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
    setEnvoiAdminLoading(false)
  }

  if (!accesOk) return (
    <main style={{ minHeight: '100vh', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1f2937', borderRadius: 20, padding: 40, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: '0 0 4px' }}>Back-office</h1>
          <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>Ma Gestion-Locative Admin</p>
        </div>
        <input type="password" placeholder="Mot de passe admin"
          value={motDePasse} onChange={e => setMotDePasse(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && verifierMotDePasse()}
          style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: 'white', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
        />
        {erreur && <p style={{ color: '#ef4444', fontSize: 13, margin: '0 0 12px' }}>{erreur}</p>}
        <button onClick={verifierMotDePasse}
          style={{ width: '100%', background: '#2563eb', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>
          Accéder →
        </button>
      </div>
    </main>
  )

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#9ca3af' }}>Chargement...</p>
    </main>
  )

  const onglets = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'users', label: '👥 Utilisateurs' },
    { id: 'abonnements', label: '💳 Abonnements' },
    { id: 'messages', label: `📬 Messages${conversations.filter(c => c.statut === 'ouvert').length > 0 ? ` (${conversations.filter(c => c.statut === 'ouvert').length})` : ''}` },
    { id: 'parametres', label: '⚙️ Paramètres' },
    { id: 'codes', label: '🎟️ Codes promo' },
    { id: 'liens', label: '🔗 Liens rapides' },
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#111827' }}>

      <nav style={{ background: '#1f2937', borderBottom: '1px solid #374151' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#2563eb' }}>GL</span>
            <span style={{ color: '#9ca3af', fontSize: 13 }}>Back-office</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {onglets.map(o => (
              <button key={o.id} onClick={() => setOnglet(o.id)}
                style={{ background: onglet === o.id ? '#2563eb' : 'transparent', color: onglet === o.id ? 'white' : '#9ca3af', border: 'none', padding: '6px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                {o.label}
              </button>
            ))}
          </div>
          <button onClick={() => { sessionStorage.removeItem('admin_ok'); setAccesOk(false) }}
            style={{ background: '#374151', color: '#9ca3af', border: 'none', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            Déconnexion
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>

        {/* DASHBOARD */}
        {onglet === 'dashboard' && stats && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 24 }}>Vue globale</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
              {[
                { label: 'Utilisateurs', valeur: stats.totalUsers, couleur: '#3b82f6', emoji: '👥' },
                { label: 'Plan payant', valeur: stats.usersPayants, couleur: '#16a34a', emoji: '💳' },
                { label: 'Plan gratuit', valeur: stats.usersGratuits, couleur: '#9ca3af', emoji: '🆓' },
                { label: 'Baux actifs', valeur: stats.totalBaux, couleur: '#f59e0b', emoji: '📋' },
              ].map((s, i) => (
                <div key={i} style={{ background: '#1f2937', borderRadius: 14, padding: 20, border: '1px solid #374151' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 8px' }}>{s.label}</p>
                      <p style={{ fontSize: 32, fontWeight: 700, color: s.couleur, margin: 0 }}>{s.valeur}</p>
                    </div>
                    <span style={{ fontSize: 28 }}>{s.emoji}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#1f2937', borderRadius: 14, padding: 20, border: '1px solid #374151' }}>
                <h3 style={{ color: 'white', fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>📈 Répartition des plans</h3>
                {[
                  { label: 'Gratuit', count: stats.usersGratuits, total: stats.totalUsers, couleur: '#6b7280' },
                  { label: 'Manuel', count: stats.usersManuel, total: stats.totalUsers, couleur: '#2563eb' },
                  { label: 'Automatique', count: stats.usersAuto, total: stats.totalUsers, couleur: '#16a34a' },
                ].map((p, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#9ca3af', fontSize: 13 }}>{p.label}</span>
                      <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{p.count}</span>
                    </div>
                    <div style={{ background: '#374151', borderRadius: 999, height: 6 }}>
                      <div style={{ background: p.couleur, borderRadius: 999, height: 6, width: `${p.total > 0 ? (p.count / p.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#1f2937', borderRadius: 14, padding: 20, border: '1px solid #374151' }}>
                <h3 style={{ color: 'white', fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>💰 Revenus estimés</h3>
                <div style={{ marginBottom: 12 }}>
                  <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 4px' }}>Plan Manuel (4€/bail)</p>
                  <p style={{ color: '#2563eb', fontSize: 24, fontWeight: 700, margin: 0 }}>{stats.revenuManuel}€/mois</p>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 4px' }}>Plan Auto (6€/bail)</p>
                  <p style={{ color: '#16a34a', fontSize: 24, fontWeight: 700, margin: 0 }}>{stats.revenuAuto}€/mois</p>
                </div>
                <div style={{ borderTop: '1px solid #374151', paddingTop: 12, marginTop: 12 }}>
                  <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 4px' }}>Total estimé</p>
                  <p style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: 0 }}>{stats.revenuTotal}€/mois</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* UTILISATEURS */}
        {onglet === 'users' && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 24 }}>Utilisateurs ({users.length})</h2>
            <div style={{ background: '#1f2937', borderRadius: 14, border: '1px solid #374151', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', background: '#374151', padding: '12px 20px' }}>
                {['Email', 'Plan', 'Baux actifs', 'Inscrit le', 'Action'].map(h => (
                  <span key={h} style={{ color: '#9ca3af', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {users.map((u, i) => (
                <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '14px 20px', borderBottom: i < users.length - 1 ? '1px solid #374151' : 'none', alignItems: 'center' }}>
                  <span style={{ color: 'white', fontSize: 14 }}>{u.email}</span>
                  <span style={{
                    background: u.plan === 'auto' ? '#14532d' : u.plan === 'manuel' ? '#1e3a5f' : '#374151',
                    color: u.plan === 'auto' ? '#4ade80' : u.plan === 'manuel' ? '#60a5fa' : '#9ca3af',
                    padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, display: 'inline-block'
                  }}>
                    {u.plan || 'gratuit'}
                  </span>
                  <span style={{ color: '#9ca3af', fontSize: 14 }}>{u.nbBaux}</span>
                  <span style={{ color: '#9ca3af', fontSize: 13 }}>{new Date(u.created_at).toLocaleDateString('fr-FR')}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select value={u.plan || 'gratuit'}
                      onChange={async (e) => {
                        const nouveauPlan = e.target.value
                        const res = await fetch('/api/admin/update-plan', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: u.id, plan: nouveauPlan }),
                        })
                        const data = await res.json()
                        if (data.success) {
                          setUsers(prev => prev.map(user => user.id === u.id ? { ...user, plan: nouveauPlan } : user))
                        } else {
                          alert('Erreur : ' + data.error)
                        }
                      }}
                      style={{ background: '#374151', color: 'white', border: '1px solid #4b5563', borderRadius: 8, padding: '6px 10px', fontSize: 13, cursor: 'pointer' }}>
                      <option value="gratuit">Gratuit</option>
                      <option value="manuel">Manuel</option>
                      <option value="auto">Automatique</option>
                    </select>
                    <button
                      onClick={async () => {
                        if (!confirm(`Exporter les données RGPD de ${u.email} ?`)) return
                        const res = await fetch('/api/admin/export-rgpd', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: u.id, userEmail: u.email }),
                        })
                        const blob = await res.blob()
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `RGPD_${u.email}_${new Date().toISOString().split('T')[0]}.zip`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                      style={{ background: '#374151', color: '#9ca3af', border: '1px solid #4b5563', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                      📦 RGPD
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABONNEMENTS */}
        {onglet === 'abonnements' && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 24 }}>Abonnements</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {[
                { label: 'Plan gratuit', count: stats?.usersGratuits || 0, couleur: '#6b7280', bg: '#374151' },
                { label: 'Plan manuel', count: stats?.usersManuel || 0, couleur: '#60a5fa', bg: '#1e3a5f' },
                { label: 'Plan automatique', count: stats?.usersAuto || 0, couleur: '#4ade80', bg: '#14532d' },
              ].map((p, i) => (
                <div key={i} style={{ background: '#1f2937', borderRadius: 14, padding: 24, border: '1px solid #374151' }}>
                  <div style={{ background: p.bg, borderRadius: 10, padding: '6px 14px', display: 'inline-block', marginBottom: 12 }}>
                    <span style={{ color: p.couleur, fontSize: 13, fontWeight: 600 }}>{p.label}</span>
                  </div>
                  <p style={{ fontSize: 40, fontWeight: 700, color: 'white', margin: '8px 0 4px' }}>{p.count}</p>
                  <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>utilisateurs</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MESSAGES */}
        {onglet === 'messages' && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 24 }}>📬 Messages ({conversations.length})</h2>
            <div style={{ display: 'flex', gap: 16, height: 600 }}>

              {/* LISTE DES CONVERSATIONS */}
              <div style={{ width: 320, background: '#1f2937', borderRadius: 14, border: '1px solid #374151', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {conversations.length === 0 ? (
                    <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>Aucune conversation.</p>
                  ) : conversations.map(c => (
                    <div key={c.id} onClick={() => ouvrirConversationAdmin(c)}
                      style={{ padding: 14, borderBottom: '1px solid #374151', cursor: 'pointer', background: conversationActive?.id === c.id ? '#374151' : c.a_non_lu ? '#1e3a5f' : 'transparent' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{c.user_email}</span>
                        <span style={{
                          background: c.statut === 'ferme' ? '#374151' : '#1e3a5f',
                          color: c.statut === 'ferme' ? '#9ca3af' : '#60a5fa',
                          padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600
                        }}>
                          {c.statut === 'ferme' ? 'Fermé' : 'Ouvert'}
                        </span>
                      </div>
                      <p style={{ color: '#9ca3af', fontSize: 12, margin: '0 0 4px' }}>{c.sujet || 'Sans sujet'}</p>
                      <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>{new Date(c.derniere_activite).toLocaleDateString('fr-FR')} à {new Date(c.derniere_activite).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ZONE DE CHAT */}
              <div style={{ flex: 1, background: '#1f2937', borderRadius: 14, border: '1px solid #374151', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {!conversationActive ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: '#9ca3af', fontSize: 14 }}>Sélectionnez une conversation</p>
                  </div>
                ) : (
                  <>
                    <div style={{ padding: 16, borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ color: 'white', fontWeight: 600, fontSize: 14, margin: 0 }}>{conversationActive.user_email}</p>
                        <p style={{ color: '#9ca3af', fontSize: 12, margin: '2px 0 0' }}>{conversationActive.sujet}</p>
                      </div>
                      <button onClick={async () => {
                        const nouveauStatut = conversationActive.statut === 'ferme' ? 'ouvert' : 'ferme'
                        await fetch('/api/admin/conversations', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: conversationActive.id, statut: nouveauStatut }),
                        })
                        setConversationActive(prev => ({ ...prev, statut: nouveauStatut }))
                        setConversations(prev => prev.map(c => c.id === conversationActive.id ? { ...c, statut: nouveauStatut } : c))
                      }}
                        style={{ background: '#374151', color: '#9ca3af', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>
                        {conversationActive.statut === 'ferme' ? '🔓 Rouvrir' : '✅ Marquer résolu'}
                      </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {messagesConversation.map(m => (
                        <div key={m.id} style={{
                          alignSelf: m.expediteur === 'admin' ? 'flex-end' : 'flex-start',
                          maxWidth: '70%',
                          background: m.expediteur === 'admin' ? '#2563eb' : '#374151',
                          color: 'white',
                          borderRadius: 14, padding: '10px 14px', fontSize: 13
                        }}>
                          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.contenu}</p>
                          <p style={{ margin: '4px 0 0', fontSize: 10, opacity: 0.7 }}>
                            {new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: 16, borderTop: '1px solid #374151', display: 'flex', gap: 8 }}>
                      <input value={nouveauMessageAdmin} onChange={e => setNouveauMessageAdmin(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && envoyerMessageAdmin()}
                        placeholder="Votre réponse..."
                        style={{ flex: 1, background: '#374151', border: '1px solid #4b5563', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'white', outline: 'none' }} />
                      <button onClick={envoyerMessageAdmin} disabled={envoiAdminLoading || !nouveauMessageAdmin.trim()}
                        style={{ background: '#2563eb', color: 'white', padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                        →
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CODES PROMO */}
        {onglet === 'codes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: 0 }}>🎟️ Codes promo</h2>
              <button onClick={() => setShowFormCode(!showFormCode)}
                style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                + Créer un code
              </button>
            </div>

            {showFormCode && (
              <div style={{ background: '#1f2937', borderRadius: 14, padding: 24, border: '1px solid #374151', marginBottom: 20 }}>
                <h3 style={{ color: 'white', fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>Nouveau code promo</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Code</label>
                    <input placeholder="NOT-12345" value={nouveauCode.code}
                      onChange={e => setNouveauCode(prev => ({ ...prev, code: e.target.value }))}
                      style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Réduction (%)</label>
                    <input type="number" min="1" value={nouveauCode.reduction}
                      onChange={e => setNouveauCode(prev => ({ ...prev, reduction: e.target.value }))}
                      style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Type</label>
                    <select value={nouveauCode.type}
                      onChange={e => setNouveauCode(prev => ({ ...prev, type: e.target.value }))}
                      style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'white', outline: 'none' }}>
                      <option value="promo">Promo</option>
                      <option value="notaire">Notaire</option>
                      <option value="agence">Agence</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Utilisations max</label>
                    <input type="number" min="1" placeholder="Illimité" value={nouveauCode.usage_max}
                      onChange={e => setNouveauCode(prev => ({ ...prev, usage_max: e.target.value }))}
                      style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Expire le</label>
                    <input type="date" value={nouveauCode.expire_le}
                      onChange={e => setNouveauCode(prev => ({ ...prev, expire_le: e.target.value }))}
                      style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={async () => {
                    if (!nouveauCode.code) { alert('Code obligatoire'); return }
                    const res = await fetch('/api/admin/codes-promo', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'create', ...nouveauCode }),
                    })
                    const data = await res.json()
                    if (data.success) {
                      const resCodes = await fetch('/api/admin/codes-promo')
                      const dataCodes = await resCodes.json()
                      setCodes(dataCodes.codes || [])
                      setShowFormCode(false)
                      setNouveauCode({ code: '', reduction: 10, type: 'promo', usage_max: '', expire_le: '' })
                    }
                  }}
                    style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    ✅ Créer
                  </button>
                  <button onClick={() => setShowFormCode(false)}
                    style={{ background: '#374151', color: '#9ca3af', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
                    Annuler
                  </button>
                </div>
              </div>
            )}

            <div style={{ background: '#1f2937', borderRadius: 14, border: '1px solid #374151', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', background: '#374151', padding: '12px 20px' }}>
                {['Code', 'Réduction', 'Type', 'Utilisations', 'Expire le', 'Actions'].map(h => (
                  <span key={h} style={{ color: '#9ca3af', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {codes.length === 0 ? (
                <p style={{ color: '#9ca3af', padding: 20, fontSize: 14 }}>Aucun code promo créé.</p>
              ) : codes.map((c, i) => (
                <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', padding: '14px 20px', borderBottom: i < codes.length - 1 ? '1px solid #374151' : 'none', alignItems: 'center' }}>
                  <span style={{ color: 'white', fontWeight: 700, fontSize: 14, fontFamily: 'monospace' }}>{c.code}</span>
                  <span style={{ color: '#4ade80', fontWeight: 700 }}>-{c.reduction}%</span>
                  <span style={{ color: '#9ca3af', fontSize: 13 }}>{c.type}</span>
                  <span style={{ color: '#9ca3af', fontSize: 13 }}>{c.usage_count}/{c.usage_max || '∞'}</span>
                  <span style={{ color: '#9ca3af', fontSize: 13 }}>{c.expire_le ? new Date(c.expire_le).toLocaleDateString('fr-FR') : '—'}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={async () => {
                      await fetch('/api/admin/codes-promo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'toggle', id: c.id }),
                      })
                      setCodes(prev => prev.map(code => code.id === c.id ? { ...code, actif: !code.actif } : code))
                    }}
                      style={{ background: c.actif ? '#14532d' : '#374151', color: c.actif ? '#4ade80' : '#9ca3af', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                      {c.actif ? '✓ Actif' : '✗ Inactif'}
                    </button>
                    <button onClick={async () => {
                      if (!confirm('Supprimer ce code ?')) return
                      await fetch('/api/admin/codes-promo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'delete', id: c.id }),
                      })
                      setCodes(prev => prev.filter(code => code.id !== c.id))
                    }}
                      style={{ background: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* PARRAINAGE */}
            <div style={{ background: '#1f2937', borderRadius: 14, padding: 24, border: '1px solid #374151', marginTop: 20 }}>
              <h3 style={{ color: 'white', fontSize: 16, fontWeight: 600, margin: '0 0 20px' }}>🤝 Paramètres parrainage</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ background: '#374151', borderRadius: 10, padding: 16 }}>
                  <p style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600, margin: '0 0 12px' }}>👤 Filleul (nouveau client)</p>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Type de récompense</label>
                    <select value={settings.parrainage_type_filleul || 'reduction'}
                      onChange={e => { setSettings(prev => ({ ...prev, parrainage_type_filleul: e.target.value })); sauvegarderSetting('parrainage_type_filleul', e.target.value) }}
                      style={{ width: '100%', background: '#1f2937', border: '1px solid #4b5563', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'white', outline: 'none' }}>
                      <option value="reduction">Réduction (%)</option>
                      <option value="mois_gratuit">Mois gratuit(s)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>
                      {settings.parrainage_type_filleul === 'mois_gratuit' ? 'Nombre de mois' : 'Réduction (%)'}
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="number" min="1" value={settings.parrainage_reduction_filleul || ''}
                        onChange={e => setSettings(prev => ({ ...prev, parrainage_reduction_filleul: e.target.value }))}
                        style={{ flex: 1, background: '#1f2937', border: '1px solid #4b5563', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'white', outline: 'none' }} />
                      <button onClick={() => sauvegarderSetting('parrainage_reduction_filleul', settings.parrainage_reduction_filleul)}
                        style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>✓</button>
                    </div>
                  </div>
                </div>
                <div style={{ background: '#374151', borderRadius: 10, padding: 16 }}>
                  <p style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600, margin: '0 0 12px' }}>🎁 Parrain (client existant)</p>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Type de récompense</label>
                    <select value={settings.parrainage_type_parrain || 'reduction'}
                      onChange={e => { setSettings(prev => ({ ...prev, parrainage_type_parrain: e.target.value })); sauvegarderSetting('parrainage_type_parrain', e.target.value) }}
                      style={{ width: '100%', background: '#1f2937', border: '1px solid #4b5563', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'white', outline: 'none' }}>
                      <option value="reduction">Réduction (%)</option>
                      <option value="mois_gratuit">Mois gratuit(s)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>
                      {settings.parrainage_type_parrain === 'mois_gratuit' ? 'Nombre de mois' : 'Réduction (%)'}
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="number" min="1" value={settings.parrainage_reduction_parrain || ''}
                        onChange={e => setSettings(prev => ({ ...prev, parrainage_reduction_parrain: e.target.value }))}
                        style={{ flex: 1, background: '#1f2937', border: '1px solid #4b5563', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'white', outline: 'none' }} />
                      <button onClick={() => sauvegarderSetting('parrainage_reduction_parrain', settings.parrainage_reduction_parrain)}
                        style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>✓</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PARAMÈTRES */}
        {onglet === 'parametres' && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 24 }}>⚙️ Paramètres</h2>

            {settingsToast && (
              <div style={{ background: '#14532d', color: '#4ade80', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
                ✅ Sauvegardé !
              </div>
            )}

           <div style={{ background: '#1f2937', borderRadius: 14, padding: 24, border: '1px solid #374151', marginBottom: 20 }}>
              <h3 style={{ color: 'white', fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>💰 Prix des plans</h3>
              <p style={{ color: '#9ca3af', fontSize: 12, margin: '0 0 20px' }}>⚠️ Modifier un prix crée un nouveau tarif sur Stripe. Les abonnés existants ne sont pas affectés rétroactivement.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { cle: 'prix_manuel', plan: 'manuel', label: 'Plan Manuel (€/bail/mois)' },
                  { cle: 'prix_auto', plan: 'automatique', label: 'Plan Automatique (€/bail/mois)' },
                ].map(({ cle, plan, label }) => (
                  <div key={cle}>
                    <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 6 }}>{label}</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="number" value={settings[cle] || ''}
                        onChange={e => setSettings(prev => ({ ...prev, [cle]: e.target.value }))}
                        style={{ flex: 1, background: '#374151', border: '1px solid #4b5563', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: 'white', outline: 'none' }} />
                      <button onClick={async () => {
                        if (!confirm(`Créer un nouveau tarif Stripe à ${settings[cle]}€/mois pour le plan ${label} ?`)) return
                        setSavingSettings(true)
                        try {
                          const res = await fetch('/api/admin/update-price', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ plan, nouveauPrix: settings[cle] }),
                          })
                          const data = await res.json()
                          if (data.success) {
                            setSettingsToast(true)
                            setTimeout(() => setSettingsToast(false), 2000)
                          } else {
                            alert('Erreur : ' + data.error)
                          }
                        } catch (err) {
                          alert('Erreur : ' + err.message)
                        }
                        setSavingSettings(false)
                      }}
                        style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>✓</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#1f2937', borderRadius: 14, padding: 24, border: '1px solid #374151', marginBottom: 20 }}>
              <h3 style={{ color: 'white', fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>🏷️ Catégories du support</h3>
              <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 16px' }}>Liste des catégories proposées aux clients dans le formulaire de demande.</p>
              {(() => {
                let cats = []
                try { cats = settings.categories_support ? JSON.parse(settings.categories_support) : [] } catch { cats = [] }
                return (
                  <div>
                    {cats.map((cat, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                        <input value={cat} onChange={e => {
                          const newCats = [...cats]
                          newCats[i] = e.target.value
                          setSettings(prev => ({ ...prev, categories_support: JSON.stringify(newCats) }))
                        }}
                          style={{ flex: 1, background: '#374151', border: '1px solid #4b5563', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'white', outline: 'none' }} />
                        <button onClick={() => {
                          const newCats = cats.filter((_, idx) => idx !== i)
                          setSettings(prev => ({ ...prev, categories_support: JSON.stringify(newCats) }))
                          sauvegarderSetting('categories_support', JSON.stringify(newCats))
                        }}
                          style={{ background: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}>
                          🗑
                        </button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button onClick={() => {
                        const newCats = [...cats, 'Nouvelle catégorie']
                        setSettings(prev => ({ ...prev, categories_support: JSON.stringify(newCats) }))
                      }}
                        style={{ background: '#374151', color: '#9ca3af', border: '1px dashed #4b5563', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
                        + Ajouter une catégorie
                      </button>
                      <button onClick={() => sauvegarderSetting('categories_support', settings.categories_support)}
                        style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        💾 Sauvegarder
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>

            <div style={{ background: '#1f2937', borderRadius: 14, padding: 24, border: '1px solid #374151', marginBottom: 20 }}>
              <h3 style={{ color: 'white', fontSize: 16, fontWeight: 600, margin: '0 0 20px' }}>📝 Textes landing page</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { cle: 'hero_badge', label: 'Badge hero' },
                  { cle: 'hero_titre', label: 'Titre principal' },
                  { cle: 'hero_sous_titre', label: 'Sous-titre' },
                  { cle: 'argument_fiscal', label: 'Argument fiscal' },
                ].map(({ cle, label }) => (
                  <div key={cle}>
                    <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 6 }}>{label}</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <textarea value={settings[cle] || ''} onChange={e => setSettings(prev => ({ ...prev, [cle]: e.target.value }))} rows={2}
                        style={{ flex: 1, background: '#374151', border: '1px solid #4b5563', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'white', outline: 'none', resize: 'vertical' }} />
                      <button onClick={() => sauvegarderSetting(cle, settings[cle])}
                        style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, alignSelf: 'flex-start' }}>✓</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#1f2937', borderRadius: 14, padding: 24, border: '1px solid #374151', marginBottom: 20 }}>
              <h3 style={{ color: 'white', fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>📊 Tableau comparatif</h3>
              <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 16px' }}>Cochez les fonctionnalités disponibles par plan</p>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', background: '#374151', padding: '10px 0', borderRadius: '8px 8px 0 0', marginBottom: 2 }}>
                {['Fonctionnalité', 'Gratuit', 'Manuel', 'Auto'].map(h => (
                  <span key={h} style={{ color: '#9ca3af', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', padding: '0 12px' }}>{h}</span>
                ))}
              </div>
              {[
                { cle: 'feat_coffre', label: 'Coffre-fort numérique' },
                { cle: 'feat_biens', label: 'Mes Biens' },
                { cle: 'feat_quittance_manuelle', label: 'Quittances manuelles' },
                { cle: 'feat_baux', label: 'Mes Baux' },
                { cle: 'feat_edl', label: 'États des lieux' },
                { cle: 'feat_email_bail', label: 'Email bail au locataire' },
                { cle: 'feat_recap_fiscal', label: 'Récap fiscal annuel' },
                { cle: 'feat_bridge', label: 'Connexion bancaire' },
                { cle: 'feat_detection', label: 'Détection automatique des loyers' },
                { cle: 'feat_quittance_auto', label: 'Quittances automatiques' },
                { cle: 'feat_relances', label: 'Relances automatiques' },
              ].map(({ cle, label }, idx) => {
                const val = settings[cle] ? JSON.parse(settings[cle]) : { gratuit: false, manuel: false, auto: false }
                return (
                  <div key={cle} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #374151', background: idx % 2 === 0 ? '#1f2937' : '#243040' }}>
                    <span style={{ color: 'white', fontSize: 14, padding: '0 12px' }}>{label}</span>
                    {['gratuit', 'manuel', 'auto'].map(plan => (
                      <div key={plan} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <input type="checkbox" checked={val[plan] || false}
                          onChange={async e => {
                            const newVal = { ...val, [plan]: e.target.checked }
                            setSettings(prev => ({ ...prev, [cle]: JSON.stringify(newVal) }))
                            await sauvegarderSetting(cle, JSON.stringify(newVal))
                          }}
                          style={{ width: 16, height: 16, cursor: 'pointer' }} />
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>

            <div style={{ background: '#1f2937', borderRadius: 14, padding: 24, border: '1px solid #374151' }}>
              <h3 style={{ color: 'white', fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>📋 CGU & Mentions légales</h3>
              <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 20px' }}>Ces infos apparaissent sur la page /cgu</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { cle: 'cgu_nom', label: 'Nom / Raison sociale' },
                  { cle: 'cgu_adresse', label: 'Adresse' },
                  { cle: 'cgu_email', label: 'Email de contact' },
                  { cle: 'cgu_site', label: 'URL du site' },
                  { cle: 'cgu_date_maj', label: 'Date de mise à jour' },
                ].map(({ cle, label }) => (
                  <div key={cle}>
                    <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 6 }}>{label}</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={settings[cle] || ''} onChange={e => setSettings(prev => ({ ...prev, [cle]: e.target.value }))}
                        style={{ flex: 1, background: '#374151', border: '1px solid #4b5563', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'white', outline: 'none' }} />
                      <button onClick={() => sauvegarderSetting(cle, settings[cle])}
                        style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>✓</button>
                    </div>
                  </div>
                ))}
                <div>
                  <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 6 }}>Contenu complet des CGU (HTML autorisé)</label>
                  <textarea value={settings.cgu_contenu || ''} onChange={e => setSettings(prev => ({ ...prev, cgu_contenu: e.target.value }))}
                    rows={20}
                    style={{ width: '100%', background: '#374151', border: '1px solid #4b5563', borderRadius: 8, padding: '12px', fontSize: 13, color: 'white', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace' }} />
                  <button onClick={() => sauvegarderSetting('cgu_contenu', settings.cgu_contenu)}
                    style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginTop: 8 }}>
                    💾 Sauvegarder le contenu
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LIENS RAPIDES */}
        {onglet === 'liens' && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 8 }}>🔗 Liens rapides</h2>
            <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 24 }}>Accès direct aux outils du projet</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { emoji: '🗄️', label: 'Supabase', desc: 'Base de données & Storage', url: 'https://supabase.com/dashboard', couleur: '#16a34a' },
                { emoji: '▲', label: 'Vercel', desc: 'Hébergement & déploiements', url: 'https://vercel.com/dashboard', couleur: '#ffffff' },
                { emoji: '💳', label: 'Stripe', desc: 'Paiements & abonnements', url: 'https://dashboard.stripe.com', couleur: '#6366f1' },
                { emoji: '📧', label: 'Resend', desc: 'Emails transactionnels', url: 'https://resend.com/emails', couleur: '#2563eb' },
                { emoji: '🏦', label: 'Bridge API', desc: 'Connexion bancaire', url: 'https://dashboard.bridgeapi.io', couleur: '#f59e0b' },
                { emoji: '🐙', label: 'GitHub', desc: 'Code source du projet', url: 'https://github.com/marechalandy41-beep/gestion-locative', couleur: '#9ca3af' },
              ].map((lien, i) => (
                <a key={i} href={lien.url} target="_blank" rel="noopener noreferrer"
                  style={{ background: '#1f2937', borderRadius: 14, padding: 24, border: '1px solid #374151', textDecoration: 'none', display: 'block' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = lien.couleur}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#374151'}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{lien.emoji}</div>
                  <p style={{ color: 'white', fontWeight: 700, fontSize: 16, margin: '0 0 4px' }}>{lien.label}</p>
                  <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>{lien.desc}</p>
                  <p style={{ color: lien.couleur, fontSize: 12, margin: '8px 0 0', fontWeight: 600 }}>Ouvrir →</p>
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
