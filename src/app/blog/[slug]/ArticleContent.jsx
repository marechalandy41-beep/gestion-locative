'use client'

function renderMarkdown(text) {
  return text
    .replace(/^## (.+)$/gm, '<h2 style="font-size:22px;font-weight:700;color:#111827;margin:32px 0 12px">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:18px;font-weight:600;color:#374151;margin:24px 0 8px">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#2563eb;text-decoration:underline">$1</a>')
    .replace(/^- (.+)$/gm, '<li style="margin-bottom:6px;color:#374151">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul style="padding-left:20px;margin:12px 0">$&</ul>')
    .replace(/\n\n/g, '</p><p style="color:#374151;font-size:16px;line-height:1.8;margin:0 0 16px">')
    .replace(/^(?!<[h|u|l])(.+)$/gm, '<p style="color:#374151;font-size:16px;line-height:1.8;margin:0 0 16px">$1</p>')
}

export default function ArticleContent({ article }) {
  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* NAV */}
      <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/" style={{ fontSize: 20, fontWeight: 800, color: '#2563eb', textDecoration: 'none' }}>🏠 Ma Gestion-Locative</a>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <a href="/blog" style={{ color: '#6b7280', fontSize: 14, textDecoration: 'none' }}>← Blog</a>
            <a href="/auth" style={{ background: '#2563eb', color: 'white', padding: '8px 18px', borderRadius: 8, fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>Se connecter</a>
          </div>
        </div>
      </nav>

      {/* ARTICLE */}
      <article style={{ maxWidth: 780, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <a href="/blog" style={{ color: '#2563eb', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>← Retour au blog</a>
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#111827', margin: '0 0 16px', lineHeight: 1.2 }}>{article.titre}</h1>
        <p style={{ color: '#9ca3af', fontSize: 14, margin: '0 0 40px' }}>
          Publié le {new Date(article.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 20, marginBottom: 40 }}>
          <p style={{ color: '#1d4ed8', fontSize: 15, margin: 0, fontStyle: 'italic' }}>{article.meta_description}</p>
        </div>
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(article.contenu) }} />

        {/* CTA */}
        <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', borderRadius: 20, padding: 40, marginTop: 60, textAlign: 'center' }}>
          <h3 style={{ fontSize: 24, fontWeight: 700, color: 'white', margin: '0 0 12px' }}>Prêt à simplifier votre gestion locative ?</h3>
          <p style={{ color: '#bfdbfe', fontSize: 15, margin: '0 0 24px' }}>Rejoignez Ma Gestion-Locative et automatisez tout.</p>
          <a href="/auth" style={{ background: 'white', color: '#2563eb', padding: '14px 32px', borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
            Commencer gratuitement →
          </a>
        </div>
      </article>

      {/* FOOTER */}
      <footer style={{ background: '#111827', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>
          © 2026 Ma Gestion-Locative — <a href="/cgu" style={{ color: '#6b7280', textDecoration: 'none' }}>CGU</a> — <a href="/faq" style={{ color: '#6b7280', textDecoration: 'none' }}>FAQ</a> — <a href="/blog" style={{ color: '#6b7280', textDecoration: 'none' }}>Blog</a>
        </p>
      </footer>
    </main>
  )
}