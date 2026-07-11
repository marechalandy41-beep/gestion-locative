'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

function FaqItem({ question, reponse }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 20, marginBottom: 20 }}>
      <button onClick={() => setOuvert(!ouvert)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0, textAlign: 'left' }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{question}</span>
        <span style={{ fontSize: 24, color: '#2563eb', flexShrink: 0, marginLeft: 16 }}>{ouvert ? '−' : '+'}</span>
      </button>
      {ouvert && (
        <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.7, margin: '12px 0 0' }}>{reponse}</p>
      )}
    </div>
  )
}

export default function FAQ() {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => {
        if (data.settings?.faq_dynamique) {
          try { setFaqs(JSON.parse(data.settings.faq_dynamique)) } catch { setFaqs([]) }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>

      {/* NAV */}
      <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/" style={{ fontSize: 20, fontWeight: 800, color: '#2563eb', textDecoration: 'none' }}>🏠 Ma Gestion-Locative</a>
          <a href="/auth" style={{ background: '#2563eb', color: 'white', padding: '8px 18px', borderRadius: 8, fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>
            Se connecter
          </a>
        </div>
      </nav>

      {/* HEADER */}
      <section style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: 'white', margin: '0 0 16px' }}>❓ Foire aux questions</h1>
          <p style={{ fontSize: 18, color: '#bfdbfe', margin: 0 }}>Toutes les réponses à vos questions sur Ma Gestion-Locative</p>
        </div>
      </section>

      {/* CONTENU */}
      <section style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {loading ? (
            <p style={{ color: '#6b7280', textAlign: 'center' }}>Chargement...</p>
          ) : faqs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              <p style={{ color: '#6b7280', fontSize: 16 }}>Aucune question pour l'instant.</p>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: 16, padding: 40, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              {faqs.map((faq, i) => (
                <FaqItem key={i} question={faq.q} reponse={faq.r} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#111827', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 8px', fontWeight: 700 }}>🏠 Ma Gestion-Locative</p>
        <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>
          © 2026 Ma Gestion-Locative —{' '}
          <a href="/cgu" style={{ color: '#6b7280', textDecoration: 'none' }}>CGU</a> —{' '}
          <a href="/faq" style={{ color: '#6b7280', textDecoration: 'none' }}>FAQ</a> —{' '}
          <a href="/blog" style={{ color: '#6b7280', textDecoration: 'none' }}>Blog</a> —{' '}
          <a href="/contact" style={{ color: '#6b7280', textDecoration: 'none' }}>Contact</a> —{' '}
          <a href="/auth" style={{ color: '#6b7280', textDecoration: 'none' }}>Se connecter</a>
        </p>
      </footer>

    </main>
  )
}