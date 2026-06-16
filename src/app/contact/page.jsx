'use client'
import { useState } from 'react'
import { supabase } from '../../supabase'

export default function Contact() {
  const [form, setForm] = useState({ nom: '', email: '', sujet: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [succes, setSucces] = useState(false)
  const [erreur, setErreur] = useState(null)

  async function envoyer() {
  if (!form.nom || !form.email || !form.message) {
    setErreur('Veuillez remplir tous les champs obligatoires.')
    return
  }
  setLoading(true)
  setErreur(null)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const res = await fetch('/api/send-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, userId: user?.id || null }),
    })
    const data = await res.json()
    if (data.success) {
      setSucces(true)
    } else {
      setErreur('Erreur : ' + data.error)
    }
  } catch (err) {
    setErreur('Erreur : ' + err.message)
  } finally {
    setLoading(false)
  }
}

  const inp = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'white', color: '#111827' }

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontSize: 20, fontWeight: 800, color: '#2563eb', textDecoration: 'none' }}>GestionLocative</a>
        <a href="/" style={{ color: '#6b7280', fontSize: 14, textDecoration: 'none' }}>← Retour</a>
      </nav>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Contactez-nous</h1>
        <p style={{ color: '#6b7280', fontSize: 15, marginBottom: 32 }}>Une question ? Un problème ? Nous vous répondons sous 24h.</p>

        {succes ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 16, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: '#15803d', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Message envoyé !</h2>
            <p style={{ color: '#374151', marginBottom: 24 }}>Nous avons bien reçu votre message et vous répondrons dans les meilleurs délais. Un email de confirmation vous a été envoyé.</p>
            <button onClick={() => { setSucces(false); setForm({ nom: '', email: '', sujet: '', message: '' }) }}
              style={{ background: '#2563eb', color: 'white', padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Envoyer un autre message
            </button>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 16, padding: 32, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>

            {erreur && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: 14 }}>
                {erreur}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Nom complet *</label>
              <input style={inp} value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Jean Dupont" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Email *</label>
              <input style={inp} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jean@exemple.com" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Sujet</label>
              <select style={inp} value={form.sujet} onChange={e => setForm({ ...form, sujet: e.target.value })}>
                <option value="">— Choisissez un sujet —</option>
                <option value="Question générale">Question générale</option>
                <option value="Problème technique">Problème technique</option>
                <option value="Facturation / Abonnement">Facturation / Abonnement</option>
                <option value="Demande de fonctionnalité">Demande de fonctionnalité</option>
                <option value="Partenariat">Partenariat</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Message *</label>
              <textarea style={{ ...inp, minHeight: 140, resize: 'vertical' }} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Décrivez votre demande..." />
            </div>

            <button onClick={envoyer} disabled={loading}
              style={{ width: '100%', background: loading ? '#93c5fd' : '#2563eb', color: 'white', padding: 14, borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15 }}>
              {loading ? '⏳ Envoi en cours...' : '📨 Envoyer le message'}
            </button>

            <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 16 }}>
              Nous répondons généralement sous 24h en jours ouvrés.
            </p>
          </div>
        )}
      </div>

      <footer style={{ background: 'white', borderTop: '1px solid #e5e7eb', padding: '24px', textAlign: 'center', marginTop: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 12 }}>
          <a href="/cgu" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>CGU</a>
          <a href="/contact" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>Contact</a>
          <a href="/auth" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>Connexion</a>
        </div>
        <p style={{ color: '#9ca3af', fontSize: 12, margin: 0 }}>© 2026 GestionLocative — Andy Maréchal</p>
      </footer>
    </main>
  )
}