'use client'
import { useState, useEffect } from 'react'

export default function NotFound() {
  const [compteur, setCompteur] = useState(10)

  useEffect(() => {
    const interval = setInterval(() => {
      setCompteur(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          window.location.href = '/'
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 560 }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>🏠</div>
        <h1 style={{ fontSize: 80, fontWeight: 800, color: 'white', margin: '0 0 8px', lineHeight: 1 }}>404</h1>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#bfdbfe', margin: '0 0 16px' }}>Page introuvable</h2>
        <p style={{ fontSize: 16, color: '#93c5fd', margin: '0 0 40px', lineHeight: 1.7 }}>
          Cette page n'existe pas ou a été déplacée. Vous allez être redirigé automatiquement dans <strong style={{ color: 'white' }}>{compteur}</strong> secondes.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/" style={{ background: 'white', color: '#2563eb', padding: '12px 28px', borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
            🏠 Accueil
          </a>
          <a href="/dashboard" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '12px 28px', borderRadius: 12, fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
            📊 Mon espace
          </a>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 48 }}>
          © 2026 Ma Gestion-Locative
        </p>
      </div>
    </main>
  )
}