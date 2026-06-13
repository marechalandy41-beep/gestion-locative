'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

export default function Admin() {
  const [settings, setSettings] = useState({})
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsToast, setSettingsToast] = useState(false)
  const [accesOk, setAccesOk] = useState(false)
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [onglet, setOnglet] = useState('dashboard')

  useEffect(() => {
    const adminOk = sessionStorage.getItem('admin_ok')
    if (adminOk === 'true') {
      setAccesOk(true)
      chargerDonnees()
    } else {
      setLoading(false)
    }
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user || data.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        window.location.href = '/auth'
      }
    })
  }, [])

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

  if (!accesOk) return (
    <main style={{ minHeight: '100vh', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1f2937', borderRadius: 20, padding: 40, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: '0 0 4px' }}>Back-office</h1>
          <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>GestionLocative Admin</p>
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
    { id: 'parametres', label: '⚙️ Paramètres' },
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
  style={{ background: '#374151', color: '#9ca3af', border: '1px solid #4b5563', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', marginLeft: 6 }}>
  📦 RGPD
</button>
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

        {/* PARAMÈTRES */}
        {onglet === 'parametres' && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 24 }}>⚙️ Paramètres</h2>

            {settingsToast && (
              <div style={{ background: '#14532d', color: '#4ade80', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
                ✅ Sauvegardé !
              </div>
            )}

            {/* PRIX */}
            <div style={{ background: '#1f2937', borderRadius: 14, padding: 24, border: '1px solid #374151', marginBottom: 20 }}>
              <h3 style={{ color: 'white', fontSize: 16, fontWeight: 600, margin: '0 0 20px' }}>💰 Prix des plans</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { cle: 'prix_manuel', label: 'Plan Manuel (€/bail/mois)' },
                  { cle: 'prix_auto', label: 'Plan Automatique (€/bail/mois)' },
                ].map(({ cle, label }) => (
                  <div key={cle}>
                    <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 6 }}>{label}</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="number"
                        value={settings[cle] || ''}
                        onChange={e => setSettings(prev => ({ ...prev, [cle]: e.target.value }))}
                        style={{ flex: 1, background: '#374151', border: '1px solid #4b5563', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: 'white', outline: 'none' }}
                      />
                      <button onClick={() => sauvegarderSetting(cle, settings[cle])}
                        style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TEXTES LANDING */}
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
                      <textarea value={settings[cle] || ''}
                        onChange={e => setSettings(prev => ({ ...prev, [cle]: e.target.value }))}
                        rows={2}
                        style={{ flex: 1, background: '#374151', border: '1px solid #4b5563', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'white', outline: 'none', resize: 'vertical' }}
                      />
                      <button onClick={() => sauvegarderSetting(cle, settings[cle])}
                        style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, alignSelf: 'flex-start' }}>
                        ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TABLEAU COMPARATIF */}
            <div style={{ background: '#1f2937', borderRadius: 14, padding: 24, border: '1px solid #374151' }}>
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
                        <input type="checkbox"
                          checked={val[plan] || false}
                          onChange={async e => {
                            const newVal = { ...val, [plan]: e.target.checked }
                            setSettings(prev => ({ ...prev, [cle]: JSON.stringify(newVal) }))
                            await sauvegarderSetting(cle, JSON.stringify(newVal))
                          }}
                          style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}