'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import Footer from './footer'

export default function Nav({ pageCourante = '' }) {
  const [plan, setPlan] = useState('gratuit')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('plan')
          .eq('user_id', data.user.id)
          .single()
        if (customerData?.plan) setPlan(customerData.plan)
      }
    })
  }, [])

  const estPayant = plan !== 'gratuit'

  const lien = (href, label, actif) => (
    <a href={href} style={{
      color: actif ? '#2563eb' : '#6b7280',
      borderBottom: actif ? '2px solid #2563eb' : 'none',
      paddingBottom: actif ? 4 : 0,
      textDecoration: 'none',
      fontWeight: 500,
      fontSize: 14,
    }}>
      {label}
    </a>
  )

  const lienLock = (label) => (
    <span style={{ color: '#d1d5db', fontWeight: 500, fontSize: 14, cursor: 'default' }}>
      🔒 {label}
    </span>
  )

  return (
    <>
      <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href={estPayant ? '/dashboard' : '/biens'} style={{ fontSize: 22, fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>GestionLocative</a>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            {estPayant ? lien('/dashboard', 'Baux actifs', pageCourante === 'dashboard') : lienLock('Baux actifs')}
            {estPayant ? lien('/baux', 'Mes Baux', pageCourante === 'baux') : lienLock('Mes Baux')}
            {lien('/biens', 'Mes Biens', pageCourante === 'biens')}
            {lien('/compte', 'Mon Compte', pageCourante === 'compte')}
            {lien('/documents', 'Documents', pageCourante === 'documents')}
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/auth'; }}
              style={{ background: '#fef2f2', color: '#dc2626', padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              Déconnexion
            </button>
          </div>
        </div>
      </nav>
      {!estPayant && (
        <div style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe', padding: '10px 24px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#1d4ed8' }}>
            🔒 Vous êtes sur le plan gratuit — <a href="/compte" style={{ fontWeight: 700, color: '#1d4ed8' }}>Passer au plan payant</a> pour accéder à tous les outils
          </p>
        </div>
      )}
    </>
  )
}