'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase } from '@/supabase'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function CheckoutForm({ customerId }: { customerId: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

async function handleSubmit() {
  setLoading(true)
  setErreur('')

  const res = await fetch('/api/create-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
    }),
  })

  const { url, error } = await res.json()
  if (error) { setErreur(error); setLoading(false); return }
  window.location.href = url
}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px' }}>
        <CardElement />
      </div>
      {erreur && <p style={{ color: '#dc2626', fontSize: 13 }}>{erreur}</p>}
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{ background: '#2563eb', color: 'white', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
      >
        {loading ? 'Traitement...' : 'Souscrire — 5€/mois par brique'}
      </button>
    </div>
  )
}

export default function Abonnement() {
  const [customerId, setCustomerId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/auth'; return }

      const res = await fetch('/api/create-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, name: user.user_metadata?.prenom + ' ' + user.user_metadata?.nom }),
      })
      const { customerId } = await res.json()
      setCustomerId(customerId)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement...</div>

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2563eb', textAlign: 'center', marginBottom: 8 }}>GestionLocative</h1>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#374151', textAlign: 'center', marginBottom: 24 }}>Choisir un abonnement</h2>

        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <p style={{ fontWeight: 700, color: '#0369a1', fontSize: 18 }}>Plan Auto — 5€/brique/mois</p>
          <p style={{ color: '#0369a1', fontSize: 13, marginTop: 4 }}>Détection automatique des virements, quittances générées, coffre-fort numérique</p>
        </div>

        <Elements stripe={stripePromise}>
          <CheckoutForm customerId={customerId} />
        </Elements>
      </div>
    </main>
  )
}