'use client';
import { useState } from 'react';

const biensData = [
  {
    id: 1,
    nom: "Appartement Paris 11e",
    adresse: "12 Rue de la Paix, Paris 75001",
    type: "Appartement",
    lots: [
      { id: 1, nom: "Principal", surface: 65, statut: "loue" }
    ]
  },
  {
    id: 2,
    nom: "Immeuble Bordeaux",
    adresse: "8 Rue des Chartrons, Bordeaux 33000",
    type: "Immeuble",
    lots: [
      { id: 1, nom: "Lot A", surface: 800, statut: "loue" },
      { id: 2, nom: "Lot B", surface: 600, statut: "loue" },
      { id: 3, nom: "Lot C", surface: 700, statut: "vacant" },
      { id: 4, nom: "Lot D", surface: 900, statut: "vacant" },
    ]
  },
  {
    id: 3,
    nom: "Parking Bordeaux",
    adresse: "Parking B12, Bordeaux 33000",
    type: "Parking",
    lots: [
      { id: 1, nom: "Place B12", surface: 12, statut: "loue" }
    ]
  },
];

const iconeType = {
  Appartement: "🏠",
  Maison: "🏡",
  Immeuble: "🏢",
  "Local commercial": "🏪",
  Parking: "🅿️",
  Cave: "📦",
  Terrain: "🌱",
};

export default function Biens() {
  const [biens] = useState(biensData);
  const [selectionne, setSelectionne] = useState(null);

  return (
    <main style={{minHeight:'100vh',background:'#f9fafb'}}>
      <nav style={{background:'white',borderBottom:'1px solid #e5e7eb',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
        <div style={{maxWidth:1280,margin:'0 auto',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <a href="/" style={{fontSize:22,fontWeight:700,color:'#2563eb',textDecoration:'none'}}>GestionLocative</a>
          <div style={{display:'flex',gap:24,fontSize:14,fontWeight:500}}>
            <a href="/dashboard" style={{color:'#6b7280',textDecoration:'none'}}>Mes Briques</a>
            <a href="/biens" style={{color:'#2563eb',borderBottom:'2px solid #2563eb',paddingBottom:4,textDecoration:'none'}}>Mes Biens</a>
            <a href="/compte" style={{color:'#6b7280',textDecoration:'none'}}>Mon Compte</a>
          </div>
        </div>
      </nav>

      <div style={{maxWidth:1280,margin:'0 auto',padding:'32px 24px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:32}}>
          <div>
            <h2 style={{fontSize:24,fontWeight:700,color:'#111827'}}>Mes Biens</h2>
            <p style={{color:'#6b7280',fontSize:14,marginTop:4}}>{biens.length} biens — {biens.reduce((a,b)=>a+b.lots.length,0)} lots au total</p>
          </div>
          <button style={{background:'#2563eb',color:'white',padding:'10px 20px',borderRadius:12,fontWeight:600,border:'none',cursor:'pointer',fontSize:14}}>
            + Ajouter un bien
          </button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:24}}>
          {biens.map(bien => (
            <div
              key={bien.id}
              onClick={() => setSelectionne(selectionne === bien.id ? null : bien.id)}
              style={{background:'white',borderRadius:20,border: selectionne === bien.id ? '2px solid #2563eb' : '1px solid #f3f4f6',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',padding:24,cursor:'pointer'}}
            >
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                <div style={{fontSize:32}}>{iconeType[bien.type] || '🏠'}</div>
                <div>
                  <h3 style={{fontWeight:700,color:'#111827',fontSize:15}}>{bien.nom}</h3>
                  <p style={{fontSize:12,color:'#9ca3af',marginTop:2}}>{bien.adresse}</p>
                </div>
              </div>

              <div style={{display:'flex',gap:12,marginBottom:16}}>
                <div style={{flex:1,background:'#f0fdf4',borderRadius:8,padding:'8px 12px',textAlign:'center'}}>
                  <p style={{fontSize:18,fontWeight:700,color:'#16a34a'}}>{bien.lots.filter(l=>l.statut==='loue').length}</p>
                  <p style={{fontSize:11,color:'#6b7280'}}>Loués</p>
                </div>
                <div style={{flex:1,background:'#fef9f0',borderRadius:8,padding:'8px 12px',textAlign:'center'}}>
                  <p style={{fontSize:18,fontWeight:700,color:'#d97706'}}>{bien.lots.filter(l=>l.statut==='vacant').length}</p>
                  <p style={{fontSize:11,color:'#6b7280'}}>Vacants</p>
                </div>
                <div style={{flex:1,background:'#eff6ff',borderRadius:8,padding:'8px 12px',textAlign:'center'}}>
                  <p style={{fontSize:18,fontWeight:700,color:'#2563eb'}}>{bien.lots.length}</p>
                  <p style={{fontSize:11,color:'#6b7280'}}>Total</p>
                </div>
              </div>

              {selectionne === bien.id && (
                <div style={{borderTop:'1px solid #f3f4f6',paddingTop:16,marginTop:4}}>
                  <p style={{fontSize:12,fontWeight:600,color:'#6b7280',marginBottom:8,textTransform:'uppercase',letterSpacing:0.5}}>Lots</p>
                  {bien.lots.map(lot => (
                    <div key={lot.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f9fafb'}}>
                      <div>
                        <p style={{fontSize:13,fontWeight:500,color:'#374151'}}>{lot.nom}</p>
                        <p style={{fontSize:11,color:'#9ca3af'}}>{lot.surface} m²</p>
                      </div>
                      <span style={{
                        fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:999,
                        background: lot.statut === 'loue' ? '#dcfce7' : '#fef3c7',
                        color: lot.statut === 'loue' ? '#15803d' : '#d97706'
                      }}>
                        {lot.statut === 'loue' ? '✓ Loué' : '⏳ Vacant'}
                      </span>
                    </div>
                  ))}
                  <div style={{display:'flex',gap:8,marginTop:12}}>
                    <button style={{flex:1,background:'#f3f4f6',color:'#374151',padding:'8px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:500}}>
                      + Ajouter un lot
                    </button>
                    <button style={{flex:1,background:'#eff6ff',color:'#2563eb',padding:'8px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:500}}>
                      📁 Coffre-fort
                    </button>
                    <button style={{flex:1,background:'#fef2f2',color:'#dc2626',padding:'8px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:500}}>
                      🏷️ Vendre
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}