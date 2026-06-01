'use client';
import { useState } from 'react';

export default function Compte() {
  const [onglet, setOnglet] = useState('profil');

  return (
    <main style={{minHeight:'100vh',background:'#f9fafb'}}>
      <nav style={{background:'white',borderBottom:'1px solid #e5e7eb',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
        <div style={{maxWidth:1280,margin:'0 auto',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <a href="/" style={{fontSize:22,fontWeight:700,color:'#2563eb',textDecoration:'none'}}>GestionLocative</a>
          <div style={{display:'flex',gap:24,fontSize:14,fontWeight:500}}>
            <a href="/dashboard" style={{color:'#6b7280',textDecoration:'none'}}>Mes Briques</a>
            <a href="/biens" style={{color:'#6b7280',textDecoration:'none'}}>Mes Biens</a>
            <a href="/compte" style={{color:'#2563eb',borderBottom:'2px solid #2563eb',paddingBottom:4,textDecoration:'none'}}>Mon Compte</a>
          </div>
        </div>
      </nav>

      <div style={{maxWidth:800,margin:'0 auto',padding:'32px 24px'}}>
        <h2 style={{fontSize:24,fontWeight:700,color:'#111827',marginBottom:24}}>Mon Compte</h2>

        {/* Onglets */}
        <div style={{display:'flex',gap:4,background:'#f3f4f6',borderRadius:12,padding:4,marginBottom:32,width:'fit-content'}}>
          {['profil','abonnement','securite'].map(o => (
            <button
              key={o}
              onClick={() => setOnglet(o)}
              style={{
                padding:'8px 20px',borderRadius:8,border:'none',cursor:'pointer',fontSize:13,fontWeight:500,
                background: onglet === o ? 'white' : 'transparent',
                color: onglet === o ? '#2563eb' : '#6b7280',
                boxShadow: onglet === o ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {o === 'profil' ? '👤 Profil' : o === 'abonnement' ? '💳 Abonnement' : '🔒 Sécurité'}
            </button>
          ))}
        </div>

        {/* Profil */}
        {onglet === 'profil' && (
          <div style={{background:'white',borderRadius:20,border:'1px solid #f3f4f6',padding:32,boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
            <h3 style={{fontSize:16,fontWeight:600,color:'#111827',marginBottom:24}}>Informations personnelles</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
              <div>
                <label style={{fontSize:13,fontWeight:500,color:'#374151',display:'block',marginBottom:6}}>Prénom</label>
                <input defaultValue="Jean" style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:8,padding:'10px 12px',fontSize:14,outline:'none',boxSizing:'border-box'}} />
              </div>
              <div>
                <label style={{fontSize:13,fontWeight:500,color:'#374151',display:'block',marginBottom:6}}>Nom</label>
                <input defaultValue="Dupont" style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:8,padding:'10px 12px',fontSize:14,outline:'none',boxSizing:'border-box'}} />
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:13,fontWeight:500,color:'#374151',display:'block',marginBottom:6}}>Email</label>
              <input defaultValue="jean.dupont@email.com" style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:8,padding:'10px 12px',fontSize:14,outline:'none',boxSizing:'border-box'}} />
            </div>
            <div style={{marginBottom:24}}>
              <label style={{fontSize:13,fontWeight:500,color:'#374151',display:'block',marginBottom:6}}>Téléphone</label>
              <input defaultValue="06 12 34 56 78" style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:8,padding:'10px 12px',fontSize:14,outline:'none',boxSizing:'border-box'}} />
            </div>
            <button style={{background:'#2563eb',color:'white',padding:'10px 24px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:600,fontSize:14}}>
              Sauvegarder
            </button>
          </div>
        )}

        {/* Abonnement */}
        {onglet === 'abonnement' && (
          <div style={{background:'white',borderRadius:20,border:'1px solid #f3f4f6',padding:32,boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
            <h3 style={{fontSize:16,fontWeight:600,color:'#111827',marginBottom:24}}>Mon abonnement</h3>
            
            <div style={{background:'#eff6ff',borderRadius:12,padding:20,marginBottom:24,border:'1px solid #bfdbfe'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <p style={{fontWeight:700,color:'#1e40af',fontSize:15}}>Plan actif</p>
                  <p style={{color:'#3b82f6',fontSize:13,marginTop:4}}>3 baux actifs — 2 appartements + 1 parking</p>
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:24,fontWeight:700,color:'#1e40af'}}>21€</p>
                  <p style={{fontSize:12,color:'#6b7280'}}>par mois</p>
                </div>
              </div>
            </div>

            <div style={{marginBottom:24}}>
              <p style={{fontSize:13,fontWeight:600,color:'#374151',marginBottom:12}}>Détail de la facturation</p>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #f3f4f6'}}>
                  <span style={{fontSize:13,color:'#6b7280'}}>Appartement Paris 11e</span>
                  <span style={{fontSize:13,fontWeight:500,color:'#111827'}}>8€/mois</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #f3f4f6'}}>
                  <span style={{fontSize:13,color:'#6b7280'}}>Maison Lyon</span>
                  <span style={{fontSize:13,fontWeight:500,color:'#111827'}}>8€/mois</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #f3f4f6'}}>
                  <span style={{fontSize:13,color:'#6b7280'}}>Parking Bordeaux</span>
                  <span style={{fontSize:13,fontWeight:500,color:'#111827'}}>4€/mois (tarif parking)</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0'}}>
                  <span style={{fontSize:13,fontWeight:700,color:'#111827'}}>Total</span>
                  <span style={{fontSize:13,fontWeight:700,color:'#111827'}}>21€/mois</span>
                </div>
              </div>
            </div>

            <button style={{background:'#fef2f2',color:'#dc2626',padding:'10px 24px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:600,fontSize:14}}>
              Résilier l'abonnement
            </button>
          </div>
        )}

        {/* Sécurité */}
        {onglet === 'securite' && (
          <div style={{background:'white',borderRadius:20,border:'1px solid #f3f4f6',padding:32,boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
            <h3 style={{fontSize:16,fontWeight:600,color:'#111827',marginBottom:24}}>Sécurité</h3>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:13,fontWeight:500,color:'#374151',display:'block',marginBottom:6}}>Mot de passe actuel</label>
              <input type="password" placeholder="••••••••" style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:8,padding:'10px 12px',fontSize:14,outline:'none',boxSizing:'border-box'}} />
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:13,fontWeight:500,color:'#374151',display:'block',marginBottom:6}}>Nouveau mot de passe</label>
              <input type="password" placeholder="••••••••" style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:8,padding:'10px 12px',fontSize:14,outline:'none',boxSizing:'border-box'}} />
            </div>
            <div style={{marginBottom:24}}>
              <label style={{fontSize:13,fontWeight:500,color:'#374151',display:'block',marginBottom:6}}>Confirmer le nouveau mot de passe</label>
              <input type="password" placeholder="••••••••" style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:8,padding:'10px 12px',fontSize:14,outline:'none',boxSizing:'border-box'}} />
            </div>
            <button style={{background:'#2563eb',color:'white',padding:'10px 24px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:600,fontSize:14}}>
              Changer le mot de passe
            </button>
          </div>
        )}
      </div>
    </main>
  );
}