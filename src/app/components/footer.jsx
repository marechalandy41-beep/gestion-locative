export default function Footer() {
  return (
    <footer style={{ background: 'white', borderTop: '1px solid #e5e7eb', padding: '24px', textAlign: 'center', marginTop: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 8 }}>
        <a href="/cgu" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>CGU & Mentions légales</a>
        <a href="/contact" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>Contact</a>
      </div>
      <p style={{ color: '#9ca3af', fontSize: 12, margin: 0 }}>© 2026 Ma Gestion-Locative — Andy Maréchal</p>
    </footer>
  )
}