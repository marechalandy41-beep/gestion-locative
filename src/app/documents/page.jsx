'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import Nav from '../components/nav'

export default function Documents() {
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

  const cartePayante = (onClick, emoji, titre, description) => (
    <div
      onClick={estPayant ? onClick : undefined}
      style={{
        background: estPayant ? 'white' : '#f9fafb',
        borderRadius: 16, padding: 28,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        cursor: estPayant ? 'pointer' : 'not-allowed',
        border: '2px solid transparent',
        opacity: estPayant ? 1 : 0.6,
      }}
      onMouseEnter={e => { if (estPayant) e.currentTarget.style.border = '2px solid #2563eb' }}
      onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</div>
        {!estPayant ? (
          <span style={{ background: '#fef2f2', color: '#dc2626', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>🔒 Plan payant</span>
        ) : (
          <span style={{ background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>Plan payant</span>
        )}
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>{titre}</h3>
      <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{description}</p>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Nav pageCourante="documents" />

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Créer un document</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Choisissez le type de document à générer</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Quittance — accessible à tous */}
          <div onClick={() => window.location.href = '/documents/quittance'}
            style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', border: '2px solid transparent' }}
            onMouseEnter={e => e.currentTarget.style.border = '2px solid #2563eb'}
            onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Quittance de loyer</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Générez une quittance PDF pour un locataire et une période donnée.</p>
          </div>

          {/* Coffre-fort — accessible à tous */}
          <div onClick={() => window.location.href = '/coffre-fort'}
            style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', border: '2px solid transparent' }}
            onMouseEnter={e => e.currentTarget.style.border = '2px solid #2563eb'}
            onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Coffre-fort numérique</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Tous vos documents immobiliers organisés par bien.</p>
          </div>

{/* Mise en demeure — accessible à tous */}
          <div onClick={() => window.location.href = '/documents/mise-en-demeure'}
            style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', border: '2px solid transparent' }}
            onMouseEnter={e => e.currentTarget.style.border = '2px solid #2563eb'}
            onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Mise en demeure</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Impayé de loyer, troubles, dégradations : générez une mise en demeure PDF.</p>
          </div>

          {/* Attestations — accessible à tous */}
          <div onClick={() => window.location.href = '/documents/attestations'}
            style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', border: '2px solid transparent' }}
            onMouseEnter={e => e.currentTarget.style.border = '2px solid #2563eb'}
            onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Attestations</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Hébergement, bon paiement, fin de bail, sur l'honneur.</p>
          </div>

          {/* État des lieux — payant */}
          {cartePayante(
            () => window.location.href = '/etats-des-lieux',
            '📋', 'État des lieux',
            "Créez un état des lieux d'entrée ou de sortie avec photos."
          )}

          {/* Récap fiscal — payant */}
          {cartePayante(
            () => window.location.href = '/documents/recap-fiscal',
            '📊', 'Récapitulatif fiscal',
            'Générez votre récap annuel pour la déclaration de revenus fonciers.'
          )}

          {/* Bail — payant */}
          {cartePayante(
            () => window.location.href = '/baux/nouveau',
            '✍️', 'Créer un bail',
            'Rédigez un bail officiel conforme loi ALUR avec signature.'
          )}

          

        </div>
      </div>
    </main>
  )
}