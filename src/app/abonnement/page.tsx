'use client'

import { useEffect } from 'react'
import { supabase } from '@/supabase'

export default function Abonnement() {
  useEffect(() => {
    async function redirect() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/auth'; return }

      const res = await fetch('/api/create-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: (user.user_metadata?.prenom || '') + ' ' + (user.user_metadata?.nom || '')
        }),
      })
      const { customerId } = await res.json()

      const res2 = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
        }),
      })
      const { url } = await res2.json()
      window.location.href = url
    }
    redirect()
  }, [])

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 18, color: '#374151' }}>Redirection vers le paiement...</p>
        <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 8 }}>Veuillez patienter</p>
      </div>
    </main>
  )
}