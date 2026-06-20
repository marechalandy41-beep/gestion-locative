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
          name: (user.user_metadata?.prenom || '') + ' ' + (user.user_metadata?.nom || ''),
          userId: user.id
        }),
      })
      const data1 = await res.json()
      console.log('create-customer →', data1)
      const { customerId } = data1

      const res2 = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
        }),
      })
      const data2 = await res2.json()
      console.log('create-subscription →', data2)
      const { url } = data2

      if (!url) { alert('Pas d\'URL reçue. Voir la console (F12).'); return }
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