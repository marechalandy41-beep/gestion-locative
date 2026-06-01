'use client';
import { useState } from 'react';

const biensData = [
  {
    id: 1,
    adresse: "12 Rue de la Paix, Paris 75001",
    type: "Appartement",
    locataire: "Martin Dupont",
    loyer: 1200,
    statut: "paye",
    progression: { bail: true, banque: true, loyer: true, quittance: true, coffre: false }
  },
  {
    id: 2,
    adresse: "8 Avenue des Fleurs, Lyon 69001",
    type: "Maison",
    locataire: "Sophie Bernard",
    loyer: 900,
    statut: "attente",
    progression: { bail: true, banque: true, loyer: false, quittance: false, coffre: false }
  },
  {
    id: 3,
    adresse: "Parking B12, Bordeaux 33000",
    type: "Parking",
    locataire: "Jean Lefebvre",
    loyer: 80,
    statut: "paye",
    progression: { bail: true, banque: false, loyer: true, quittance: true, coffre: false }
  },
];

function StatutBadge({ statut }) {
  if (statut === 'paye') return <span style={{background:'#dcfce7',color:'#15803d',fontSize:'11px',fontWeight:600,padding:'3px 8px',borderRadius:999}}>✓ Payé</span>;
  if (statut === 'attente') return <span style={{background:'#ffedd5',color:'#c2410c',fontSize:'11px',fontWeight:600,padding:'3px 8px',borderRadius:999}}>⏳ En attente</span>;
  return <span style={{background:'#fee2e2',color:'#dc2626',fontSize:'11px',fontWeight:600,padding:'3px 8px',borderRadius:999}}>✗ Impayé</span>;
}

function ProgressionBarre({ progression }) {
  const etapes = [
    { key: 'bail', label: 'Bail' },
    { key: 'banque', label: 'Banque' },
    { key: 'loyer', label: 'Loyer' },
    { key: 'quittance', label: 'Quittance' },
    { key: 'coffre', label: 'Coffre' },
  ];
  const completes = Object.values(progression).filter(Boolean).length;
  return (
    <div style={{marginTop:16}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style={{fontSize:11,color:'#9ca3af'}}>Progression</span>
        <span style={{fontSize:11,color:'#9ca3af'}}>{completes}/5</span>
      </div>
      <div style={{display:'flex',gap:4}}>
        {etapes.map(e => (
          <div key={e.key} style={{flex:1}}>
            <div style={{height:6,borderRadius:999,background: progression[e.key] ? '#3b82f6' : '#e5e7eb'}}></div>
            <p style={{fontSize:10,color:'#9ca3af',marginTop:3,textAlign:'center'}}>{e.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [biens] = useState(biensData);

  return (
    <main style={{minHeight:'100vh',background:'#f9fafb'}}>
      <nav style={{background:'white',borderBottom:'1px solid #e5e7eb',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
        <div style={{maxWidth:1280,margin:'0 auto',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{fontSize:22,fontWeight:700,color:'#2563eb'}}>GestionLocative</h1>
          <div style={{display:'flex',gap:24,fontSize:14,fontWeight:500}}>
            <span style={{color:'#2563eb',borderBottom:'2px solid #2563eb',paddingBottom:4,cursor:'pointer'}}>Mes Briques</span>
            <span style={{color:'#6b7280',cursor:'pointer'}}>Mes Biens</span>
            <span style={{color:'#6b7280',cursor:'pointer'}}>Mon Compte</span>
          </div>
        </div>
      </nav>

      <div style={{maxWidth:1280,margin:'0 auto',padding:'32px 24px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:32}}>
          <div>
            <h2 style={{fontSize:24,fontWeight:700,color:'#111827'}}>Mes Briques</h2>
            <p style={{color:'#6b7280',fontSize:14,marginTop:4}}>{biens.length} baux actifs</p>
          </div>
          <button style={{background:'#2563eb',color:'white',padding:'10px 20px',borderRadius:12,fontWeight:600,border:'none',cursor:'pointer',fontSize:14}}>
            + Ajouter une brique
          </button>
        </div>

        {/* Résumé */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:32}}>
          <div style={{background:'white',borderRadius:12,padding:20,border:'1px solid #f3f4f6',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
            <p style={{color:'#6b7280',fontSize:13}}>Loyers du mois</p>
            <p style={{fontSize:28,fontWeight:700,color:'#111827',marginTop:4}}>{biens.reduce((a,b)=>a+b.loyer,0).toLocaleString()}€</p>
          </div>
          <div style={{background:'white',borderRadius:12,padding:20,border:'1px solid #f3f4f6',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
            <p style={{color:'#6b7280',fontSize:13}}>Loyers perçus</p>
            <p style={{fontSize:28,fontWeight:700,color:'#16a34a',marginTop:4}}>{biens.filter(b=>b.statut==='paye').reduce((a,b)=>a+b.loyer,0).toLocaleString()}€</p>
          </div>
          <div style={{background:'white',borderRadius:12,padding:20,border:'1px solid #f3f4f6',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
            <p style={{color:'#6b7280',fontSize:13}}>En attente</p>
            <p style={{fontSize:28,fontWeight:700,color:'#ea580c',marginTop:4}}>{biens.filter(b=>b.statut==='attente').reduce((a,b)=>a+b.loyer,0).toLocaleString()}€</p>
          </div>
        </div>

        {/* Briques */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:24}}>
          {biens.map(bien => (
            <div key={bien.id} style={{background:'white',borderRadius:20,border:'1px solid #f3f4f6',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',padding:24,cursor:'pointer',display:'flex',flexDirection:'column',justifyContent:'space-between',minHeight:220}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                <div>
                  <span style={{fontSize:11,color:'#9ca3af',fontWeight:600,textTransform:'uppercase',letterSpacing:1}}>{bien.type}</span>
                  <h3 style={{fontWeight:600,color:'#111827',fontSize:14,marginTop:4,lineHeight:1.4}}>{bien.adresse}</h3>
                </div>
                <StatutBadge statut={bien.statut} />
              </div>

              <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0',borderTop:'1px solid #f9fafb',borderBottom:'1px solid #f9fafb',margin:'12px 0'}}>
                <div>
                  <p style={{fontSize:11,color:'#9ca3af'}}>Locataire</p>
                  <p style={{fontSize:13,fontWeight:500,color:'#374151',marginTop:2}}>{bien.locataire}</p>
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:11,color:'#9ca3af'}}>Loyer</p>
                  <p style={{fontSize:18,fontWeight:700,color:'#111827',marginTop:2}}>{bien.loyer}€<span style={{fontSize:11,fontWeight:400,color:'#9ca3af'}}>/mois</span></p>
                </div>
              </div>

              <ProgressionBarre progression={bien.progression} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}