import Link from 'next/link'

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>🏠</div>
        <h1 style={{ fontSize: 48, fontWeight: 800, color: '#2563eb', margin: '0 0 8px' }}>404</h1>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Page introuvable</h2>
        <p style={{ color: '#6b7280', fontSize: 15, marginBottom: 32 }}>
          Cette page n'existe pas ou a été déplacée.
        </p>
        <Link href="/dashboard"
          style={{ background: '#2563eb', color: 'white', padding: '12px 28px', borderRadius: 12, fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
          Retour au dashboard
        </Link>
      </div>
    </main>
  )
}