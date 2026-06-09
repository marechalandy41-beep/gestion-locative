'use client'
import { supabase } from '../../supabase'

export default function Documents() {
  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>

      <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/dashboard" style={{ fontSize: 22, fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>GestionLocative</a>
          <div style={{ display: 'flex', gap: 24, fontSize: 14, fontWeight: 500, alignItems: 'center' }}>
            <a href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none' }}>Baux actifs</a>
            <a href="/baux" style={{ color: '#6b7280', textDecoration: 'none' }}>Mes Baux</a>
            <a href="/biens" style={{ color: '#6b7280', textDecoration: 'none' }}>Mes Biens</a>
            <a href="/compte" style={{ color: '#6b7280', textDecoration: 'none' }}>Mon Compte</a>
            <a href="/documents" style={{ color: '#2563eb', borderBottom: '2px solid #2563eb', paddingBottom: 4, textDecoration: 'none' }}>Documents</a>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/auth'; }}
              style={{ background: '#fef2f2', color: '#dc2626', padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Créer un document</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Choisissez le type de document à générer</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Quittance */}
          <div onClick={() => window.location.href = '/documents/quittance'}
            style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', border: '2px solid transparent' }}
            onMouseEnter={e => e.currentTarget.style.border = '2px solid #2563eb'}
            onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Quittance de loyer</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Générez une quittance PDF pour un locataire et une période donnée.</p>
          </div>

         {/* État des lieux */}
<div onClick={() => window.location.href = '/etats-des-lieux'}
  style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', border: '2px solid transparent' }}
  onMouseEnter={e => e.currentTarget.style.border = '2px solid #2563eb'}
  onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
    <span style={{ background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>Plan payant</span>
  </div>
  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>État des lieux</h3>
  <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Créez un état des lieux d'entrée ou de sortie avec photos.</p>
</div>

{/* Récap fiscal */}
<div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', opacity: 0.6 }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
    <span style={{ background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>Plan payant</span>
  </div>
  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Récapitulatif fiscal</h3>
  <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>Générez votre récap annuel pour la déclaration de revenus fonciers.</p>
  <span style={{ background: '#f3f4f6', color: '#9ca3af', padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>🔒 Bientôt disponible</span>
</div>

         {/* Bail */}
<div onClick={() => window.location.href = '/baux/nouveau'}
  style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', border: '2px solid transparent' }}
  onMouseEnter={e => e.currentTarget.style.border = '2px solid #2563eb'}
  onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>✍️</div>
    <span style={{ background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>Plan payant</span>
  </div>
  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Créer un bail</h3>
  <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Rédigez un bail officiel conforme loi ALUR avec signature.</p>
</div>

{/* Coffre-fort */}
<div onClick={() => window.location.href = '/coffre-fort'}
  style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', border: '2px solid transparent' }}
  onMouseEnter={e => e.currentTarget.style.border = '2px solid #2563eb'}
  onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
  <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Coffre-fort numérique</h3>
  <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Tous vos documents immobiliers organisés par bien.</p>
</div>
        </div>
      </div>
    </main>
  )
}