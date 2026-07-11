'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

export default function Blog() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('articles').select('*').eq('publie', true).order('created_at', { ascending: false })
      .then(({ data }) => { setArticles(data || []); setLoading(false) })
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* NAV */}
      <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/" style={{ fontSize: 20, fontWeight: 800, color: '#2563eb', textDecoration: 'none' }}>🏠 Ma Gestion-Locative</a>
          <a href="/auth" style={{ background: '#2563eb', color: 'white', padding: '8px 18px', borderRadius: 8, fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>Se connecter</a>
        </div>
      </nav>

      {/* HEADER */}
      <section style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: 'white', margin: '0 0 16px' }}>📚 Blog & Guides</h1>
          <p style={{ fontSize: 18, color: '#bfdbfe', margin: 0 }}>Tout ce qu'il faut savoir sur la gestion locative</p>
        </div>
      </section>

      {/* ARTICLES */}
      <section style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>Chargement...</p>
          ) : articles.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>Aucun article disponible.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {articles.map(article => (
                <a key={article.id} href={`/blog/${article.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'white', borderRadius: 16, padding: 32, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>{article.titre}</h2>
                    <p style={{ color: '#6b7280', fontSize: 15, margin: '0 0 16px', lineHeight: 1.6 }}>{article.meta_description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#9ca3af' }}>
                        {new Date(article.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      <span style={{ fontSize: 14, color: '#2563eb', fontWeight: 600 }}>Lire l'article →</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#111827', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>
          © 2026 Ma Gestion-Locative — <a href="/cgu" style={{ color: '#6b7280', textDecoration: 'none' }}>CGU</a> — <a href="/faq" style={{ color: '#6b7280', textDecoration: 'none' }}>FAQ</a> — <a href="/blog" style={{ color: '#6b7280', textDecoration: 'none' }}>Blog</a>
        </p>
      </footer>
    </main>
  )
}