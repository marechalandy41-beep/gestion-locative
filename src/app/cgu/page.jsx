'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

export default function CGU() {
  const [s, setS] = useState({
    cgu_nom: 'Andy Maréchal',
    cgu_adresse: '53 route de saint julien, 41320 La Chapelle Montmartin',
    cgu_email: 'contact@gestion-locative.fr',
    cgu_site: 'https://gestion-locative.fr',
    cgu_date_maj: '16/06/2026',
  })

  useEffect(() => {
    async function charger() {
      const { data } = await supabase.from('settings').select('cle, valeur')
        .in('cle', ['cgu_nom', 'cgu_adresse', 'cgu_email', 'cgu_site', 'cgu_date_maj', 'cgu_contenu'])
      if (data) {
        const obj = {}
        data.forEach(r => obj[r.cle] = r.valeur)
        setS(prev => ({ ...prev, ...obj }))
      }
    }
    charger()
  }, [])

  const titre = (t) => (
    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '32px 0 12px', paddingTop: 24, borderTop: '1px solid #f3f4f6' }}>{t}</h2>
  )
  const p = (t) => <p style={{ color: '#374151', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>{t}</p>

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontSize: 20, fontWeight: 800, color: '#2563eb', textDecoration: 'none' }}>GestionLocative</a>
        <a href="/" style={{ color: '#6b7280', fontSize: 14, textDecoration: 'none' }}>← Retour</a>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
  <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Conditions Générales d'Utilisation</h1>
  <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 32 }}>Dernière mise à jour : {s.cgu_date_maj} — {s.cgu_site}</p>

  {s.cgu_contenu ? (
    <div
      style={{ color: '#374151', fontSize: 14, lineHeight: 1.8 }}
      dangerouslySetInnerHTML={{ __html: s.cgu_contenu }}
    />
  ) : (
    <p style={{ color: '#6b7280' }}>Contenu des CGU non configuré. Rendez-vous dans le back-office → Paramètres → CGU.</p>
  )}

  <div style={{ background: '#f9fafb', borderRadius: 12, padding: 20, marginTop: 40, border: '1px solid #e5e7eb' }}>
    <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
      Contact : <strong>{s.cgu_email}</strong> — {s.cgu_nom} — {s.cgu_adresse}
    </p>
  </div>
</div>

      <footer style={{ background: 'white', borderTop: '1px solid #e5e7eb', padding: '24px', textAlign: 'center', marginTop: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 12 }}>
          <a href="/cgu" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>CGU</a>
          <a href="/contact" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>Contact</a>
          <a href="/auth" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>Connexion</a>
        </div>
        <p style={{ color: '#9ca3af', fontSize: 12, margin: 0 }}>© 2026 GestionLocative — {s.cgu_nom}</p>
      </footer>
    </main>
  )
}