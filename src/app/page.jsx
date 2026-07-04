'use client'
import { supabase } from '../supabase'
import { useState, useEffect } from 'react'

export default function Home() {
  const [email, setEmail] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [comingSoon, setComingSoon] = useState(true)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({})
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => {
        if (data.settings) {
          setSettings(data.settings)
          setComingSoon(data.settings.coming_soon !== 'false')
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Vérifier si l'utilisateur est connecté
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user)
    })
  }, [])

  async function sInscrire() {
    if (!email) return
    setEnvoye(true)
  }

  const prixManuel = settings.prix_manuel || '4'
  const prixAuto = settings.prix_auto || '6'

  const featGet = (cle, plan) => {
    try { return settings[cle] ? JSON.parse(settings[cle])[plan] : false } catch { return false }
  }

  const features = [
    { cle: 'feat_coffre', label: 'Coffre-fort numérique' },
    { cle: 'feat_biens', label: 'Mes Biens' },
    { cle: 'feat_quittance_manuelle', label: 'Quittances manuelles' },
    { cle: 'feat_baux', label: 'Mes Baux' },
    { cle: 'feat_edl', label: 'États des lieux' },
    { cle: 'feat_email_bail', label: 'Email bail au locataire' },
    { cle: 'feat_recap_fiscal', label: 'Récap fiscal annuel' },
    { cle: 'feat_bridge', label: 'Connexion bancaire' },
    { cle: 'feat_detection', label: 'Détection automatique loyers' },
    { cle: 'feat_quittance_auto', label: 'Quittances automatiques' },
    { cle: 'feat_relances', label: 'Relances automatiques' },
  ]

  if (loading) return null

  // PAGE COMING SOON
  if (comingSoon) return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 560 }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🏠</div>
        <h1 style={{ fontSize: 42, fontWeight: 800, color: 'white', margin: '0 0 16px' }}>Ma Gestion-Locative</h1>
        <p style={{ fontSize: 20, color: '#bfdbfe', margin: '0 0 12px', fontWeight: 500 }}>Bientôt disponible</p>
        <p style={{ fontSize: 15, color: '#93c5fd', margin: '0 0 40px', lineHeight: 1.7 }}>
          La plateforme de gestion locative tout-en-un pour les propriétaires bailleurs. Baux, quittances, états des lieux, connexion bancaire — tout en un seul endroit.
        </p>
        {!envoye ? (
          <div>
            <p style={{ color: '#bfdbfe', fontSize: 14, marginBottom: 12 }}>Soyez prévenu au lancement :</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <input type="email" placeholder="votre@email.fr" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sInscrire()}
                style={{ padding: '12px 16px', borderRadius: 10, border: 'none', fontSize: 14, width: 260, outline: 'none' }} />
              <button onClick={sInscrire}
                style={{ background: 'white', color: '#2563eb', padding: '12px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                Me prévenir
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '16px 24px', display: 'inline-block' }}>
            <p style={{ color: 'white', fontWeight: 600, margin: 0 }}>✅ Merci ! Vous serez prévenu au lancement.</p>
          </div>
        )}
        <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <a href="/auth" style={{ color: '#93c5fd', fontSize: 13, textDecoration: 'none' }}>Déjà un compte ? Se connecter →</a>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 32 }}>
          © 2026 Ma Gestion-Locative — <a href="/cgu" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>CGU</a> — <a href="/contact" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Contact</a>
        </p>
      </div>
    </main>
  )

  // LANDING PAGE COMPLÈTE
  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>

      {/* NAV */}
      <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#2563eb' }}>🏠 Ma Gestion-Locative</span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <a href="#tarifs" style={{ color: '#6b7280', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>Tarifs</a>
            <a href="#fonctionnalites" style={{ color: '#6b7280', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>Fonctionnalités</a>
            {user ? (
              <a href="/dashboard" style={{ background: '#2563eb', color: 'white', padding: '8px 18px', borderRadius: 8, fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>
                Mon espace →
              </a>
            ) : (
              <a href="/auth" style={{ background: '#2563eb', color: 'white', padding: '8px 18px', borderRadius: 8, fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>
                Se connecter
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', color: '#bfdbfe', padding: '6px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
            {settings.hero_badge || '🚀 La gestion locative réinventée'}
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 800, color: 'white', margin: '0 0 20px', lineHeight: 1.1 }}>
            {settings.hero_titre || 'Gérez vos biens locatifs en toute simplicité'}
          </h1>
          <p style={{ fontSize: 20, color: '#bfdbfe', margin: '0 0 16px', lineHeight: 1.6 }}>
            {settings.hero_sous_titre || 'Baux conformes ALUR, quittances automatiques, états des lieux, connexion bancaire — tout en un.'}
          </p>
          <p style={{ fontSize: 14, color: '#93c5fd', margin: '0 0 40px' }}>
            {settings.argument_fiscal || '💡 Déductible de vos revenus fonciers (Article 31 CGI) — votre coût réel après déduction : moins de 3€/bail/mois'}
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/auth" style={{ background: 'white', color: '#2563eb', padding: '16px 36px', borderRadius: 12, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
              Commencer gratuitement →
            </a>
            <a href="#tarifs" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '16px 36px', borderRadius: 12, fontWeight: 600, fontSize: 16, textDecoration: 'none' }}>
              Voir les tarifs
            </a>
          </div>
        </div>
      </section>

      {/* FONCTIONNALITÉS */}
      <section id="fonctionnalites" style={{ padding: '80px 24px', background: 'white' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, color: '#111827', textAlign: 'center', margin: '0 0 12px' }}>Tout ce dont vous avez besoin</h2>
          <p style={{ color: '#6b7280', textAlign: 'center', fontSize: 16, margin: '0 0 56px' }}>Une plateforme complète pour les propriétaires bailleurs</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { emoji: '📄', titre: 'Baux conformes ALUR', desc: 'Créez et signez vos baux en quelques minutes. Non meublé, meublé, commercial, parking — tous les types de bail.' },
              { emoji: '🧾', titre: 'Quittances automatiques', desc: 'Bridge détecte les virements de loyer et génère les quittances automatiquement. Plus aucun oubli.' },
              { emoji: '🏦', titre: 'Connexion bancaire', desc: 'Synchronisation avec votre banque via Bridge API. Détection intelligente des loyers reçus.' },
              { emoji: '📋', titre: 'États des lieux', desc: 'Réalisez vos états des lieux d\'entrée et de sortie avec photos, PDF automatique et comparaison.' },
              { emoji: '🔒', titre: 'Coffre-fort numérique', desc: 'Stockez tous vos documents (DPE, diagnostics, baux, quittances) de façon sécurisée avec alertes de validité.' },
              { emoji: '📊', titre: 'Récap fiscal annuel', desc: 'Calculez vos charges déductibles, générez votre récapitulatif fiscal pour votre déclaration.' },
            ].map((f, i) => (
              <div key={i} style={{ background: '#f9fafb', borderRadius: 16, padding: 28, border: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{f.emoji}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>{f.titre}</h3>
                <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ARGUMENT FISCAL */}
      <section style={{ padding: '60px 24px', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💡</div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#065f46', margin: '0 0 16px' }}>Déductible de vos revenus fonciers</h2>
          <p style={{ fontSize: 16, color: '#047857', lineHeight: 1.7, margin: '0 0 24px' }}>
            En tant que propriétaire bailleur, l'abonnement Ma Gestion-Locative est déductible de vos revenus fonciers au titre de l'article 31 du CGI (frais de gestion et d'administration). 
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: 'Tranche 11%', avant: `${prixAuto}€`, apres: `${(parseFloat(prixAuto) * 0.89).toFixed(2)}€` },
              { label: 'Tranche 30%', avant: `${prixAuto}€`, apres: `${(parseFloat(prixAuto) * 0.70).toFixed(2)}€` },
              { label: 'Tranche 41%', avant: `${prixAuto}€`, apres: `${(parseFloat(prixAuto) * 0.59).toFixed(2)}€` },
            ].map((t, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 12, padding: 20 }}>
                <p style={{ color: '#6b7280', fontSize: 12, margin: '0 0 8px', fontWeight: 600 }}>{t.label}</p>
                <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 4px', textDecoration: 'line-through' }}>{t.avant}/bail/mois</p>
                <p style={{ color: '#065f46', fontSize: 22, fontWeight: 700, margin: 0 }}>{t.apres}/bail/mois</p>
                <p style={{ color: '#6b7280', fontSize: 11, margin: '4px 0 0' }}>après déduction</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TARIFS */}
      <section id="tarifs" style={{ padding: '80px 24px', background: '#f9fafb' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, color: '#111827', textAlign: 'center', margin: '0 0 12px' }}>Tarifs simples et transparents</h2>
          <p style={{ color: '#6b7280', textAlign: 'center', fontSize: 16, margin: '0 0 56px' }}>Payez uniquement pour vos baux actifs — aucun frais caché</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 48 }}>
            {[
              {
                plan: 'Gratuit', prix: '0€', unite: '', couleur: '#6b7280', bg: 'white',
                desc: 'Pour démarrer', features: ['Coffre-fort numérique', 'Mes Biens', 'Quittances manuelles'],
              },
              {
                plan: 'Manuel', prix: `${prixManuel}€`, unite: '/bail actif/mois', couleur: '#2563eb', bg: 'white',
                desc: 'Pour les propriétaires actifs', features: ['Tout le Gratuit +', 'Mes Baux complets', 'États des lieux', 'Email bail au locataire', 'Récap fiscal'],
                badge: 'Populaire',
              },
              {
                plan: 'Automatique', prix: `${prixAuto}€`, unite: '/bail actif/mois', couleur: '#16a34a', bg: 'white',
                desc: 'Pour l\'automatisation totale', features: ['Tout le Manuel +', 'Connexion bancaire', 'Détection auto des loyers', 'Quittances automatiques', 'Relances automatiques'],
              },
            ].map((p, i) => (
              <div key={i} style={{ background: p.bg, borderRadius: 20, padding: 32, border: i === 1 ? '2px solid #2563eb' : '1px solid #e5e7eb', position: 'relative', boxShadow: i === 1 ? '0 8px 32px rgba(37,99,235,0.15)' : '0 1px 4px rgba(0,0,0,0.06)' }}>
                {p.badge && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#2563eb', color: 'white', padding: '4px 16px', borderRadius: 99, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {p.badge}
                  </div>
                )}
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>{p.plan}</h3>
                <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px' }}>{p.desc}</p>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: 42, fontWeight: 800, color: p.couleur }}>{p.prix}</span>
                  {p.unite && <span style={{ fontSize: 13, color: '#9ca3af', marginLeft: 4 }}>{p.unite}</span>}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px' }}>
                  {p.features.map((f, j) => (
                    <li key={j} style={{ color: '#374151', fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: p.couleur, fontWeight: 700 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a href="/auth" style={{ display: 'block', background: i === 1 ? '#2563eb' : '#f3f4f6', color: i === 1 ? 'white' : '#374151', padding: '12px', borderRadius: 10, textAlign: 'center', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
                  Commencer →
                </a>
              </div>
            ))}
          </div>

          {/* TABLEAU COMPARATIF */}
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', background: '#f9fafb', padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
              {['Fonctionnalité', 'Gratuit', 'Manuel', 'Automatique'].map(h => (
                <span key={h} style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{h}</span>
              ))}
            </div>
            {features.map(({ cle, label }, idx) => (
              <div key={cle} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '14px 24px', borderBottom: '1px solid #f3f4f6', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                <span style={{ fontSize: 14, color: '#374151' }}>{label}</span>
                {['gratuit', 'manuel', 'auto'].map(plan => (
                  <span key={plan} style={{ fontSize: 16 }}>
                    {featGet(cle, plan) ? '✅' : '❌'}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: '80px 24px', background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: 'white', margin: '0 0 16px' }}>Prêt à simplifier votre gestion locative ?</h2>
          <p style={{ color: '#bfdbfe', fontSize: 16, margin: '0 0 32px' }}>Rejoignez les propriétaires bailleurs qui font confiance à Ma Gestion-Locative</p>
          <a href="/auth" style={{ background: 'white', color: '#2563eb', padding: '16px 40px', borderRadius: 12, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
            Commencer gratuitement →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#111827', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 8px', fontWeight: 700 }}>🏠 Ma Gestion-Locative</p>
        <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>
          © 2026 Ma Gestion-Locative —{' '}
          <a href="/cgu" style={{ color: '#6b7280', textDecoration: 'none' }}>CGU</a> —{' '}
          <a href="/contact" style={{ color: '#6b7280', textDecoration: 'none' }}>Contact</a> —{' '}
          <a href="/auth" style={{ color: '#6b7280', textDecoration: 'none' }}>Se connecter</a>
        </p>
      </footer>

    </main>
  )
}