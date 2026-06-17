'use client'
import { useState } from 'react'

export default function Home() {
  const [email, setEmail] = useState('')
  const [envoye, setEnvoye] = useState(false)

  async function sInscrire() {
    if (!email) return
    setEnvoye(true)
  }

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 560 }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🏠</div>
        <h1 style={{ fontSize: 42, fontWeight: 800, color: 'white', margin: '0 0 16px' }}>GestionLocative</h1>
        <p style={{ fontSize: 20, color: '#bfdbfe', margin: '0 0 12px', fontWeight: 500 }}>Bientôt disponible</p>
        <p style={{ fontSize: 15, color: '#93c5fd', margin: '0 0 40px', lineHeight: 1.7 }}>
          La plateforme de gestion locative tout-en-un pour les propriétaires bailleurs. Baux, quittances, états des lieux, connexion bancaire — tout en un seul endroit.
        </p>

        {!envoye ? (
          <div>
            <p style={{ color: '#bfdbfe', fontSize: 14, marginBottom: 12 }}>Soyez prévenu au lancement :</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <input
                type="email"
                placeholder="votre@email.fr"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sInscrire()}
                style={{ padding: '12px 16px', borderRadius: 10, border: 'none', fontSize: 14, width: 260, outline: 'none' }}
              />
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
          <a href="/auth" style={{ color: '#93c5fd', fontSize: 13, textDecoration: 'none' }}>
            Déjà un compte ? Se connecter →
          </a>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 32 }}>
          © 2026 GestionLocative — <a href="/cgu" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>CGU</a> — <a href="/contact" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Contact</a>
        </p>
      </div>
    </main>
  )
}
