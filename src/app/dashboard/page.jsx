'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

export default function Dashboard() {

  const [user, setUser] = useState(null);
  const [baux, setBaux] = useState([]);
  const [biens, setBiens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        chargerDonnees(data.user.id);
      } else {
        window.location.href = '/auth';
      }
    });
  }, []);

  async function chargerDonnees(userId) {
    setLoading(true);
    const { data: biensData } = await supabase
      .from('Biens')
      .select('*')
      .eq('user_id', userId);
    const { data: bauxData } = await supabase
      .from('Baux')
      .select('*, bien:bien_id(id, nom, adresse, type)')
      .eq('user_id', userId)
      .eq('statut', 'actif');
    setBiens(biensData || []);
    setBaux(bauxData || []);
    setLoading(false);
  }

  async function deconnexion() {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }

  const totalLoyers = baux.reduce((a, b) => a + (b.loyer_hc || 0) + (b.charges || 0), 0);
  const biensSansBail = Math.max(0, biens.length - baux.length);

  return (
    <main style={{minHeight:'100vh', background:'#f9fafb'}}>

      {/* ========== NAVIGATION ========== */}
      <nav style={{background:'white', borderBottom:'1px solid #e5e7eb', boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
        <div style={{maxWidth:1280, margin:'0 auto', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <a href="/" style={{fontSize:22, fontWeight:700, color:'#2563eb', textDecoration:'none'}}>GestionLocative</a>
          <div style={{display:'flex', gap:24, fontSize:14, fontWeight:500, alignItems:'center'}}>
            <a href="/dashboard" style={{color:'#2563eb', borderBottom:'2px solid #2563eb', paddingBottom:4, textDecoration:'none'}}>Mes Baux</a>
            <a href="/biens" style={{color:'#6b7280', textDecoration:'none'}}>Mes Biens</a>
            <a href="/compte" style={{color:'#6b7280', textDecoration:'none'}}>Mon Compte</a>
            <button onClick={deconnexion} style={{background:'#fef2f2', color:'#dc2626', padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500}}>
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      <div style={{maxWidth:1280, margin:'0 auto', padding:'32px 24px'}}>

        {/* ========== EN-TÊTE ========== */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:32}}>
          <div>
            <h2 style={{fontSize:24, fontWeight:700, color:'#111827'}}>Mes Baux</h2>
            <p style={{color:'#6b7280', fontSize:14, marginTop:4}}>{baux.length} bail{baux.length > 1 ? 's' : ''} actif{baux.length > 1 ? 's' : ''}</p>
          </div>
          <a href="/baux/nouveau" style={{background:'#2563eb', color:'white', padding:'10px 20px', borderRadius:12, fontWeight:600, fontSize:14, textDecoration:'none'}}>
            + Ajouter un bail
          </a>
        </div>

        {/* ========== STATS ========== */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:32}}>
          <div style={{background:'white', borderRadius:12, padding:20, border:'1px solid #f3f4f6', boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
            <p style={{color:'#6b7280', fontSize:13}}>Loyers du mois</p>
            <p style={{fontSize:28, fontWeight:700, color:'#111827', marginTop:4}}>{totalLoyers.toLocaleString()}€</p>
          </div>
          <div style={{background:'white', borderRadius:12, padding:20, border:'1px solid #f3f4f6', boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
            <p style={{color:'#6b7280', fontSize:13}}>Baux actifs</p>
            <p style={{fontSize:28, fontWeight:700, color:'#16a34a', marginTop:4}}>{baux.length}</p>
          </div>
          <div style={{background:'white', borderRadius:12, padding:20, border:'1px solid #f3f4f6', boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
            <p style={{color:'#6b7280', fontSize:13}}>Biens sans bail</p>
            <p style={{fontSize:28, fontWeight:700, color:'#ea580c', marginTop:4}}>{biensSansBail}</p>
          </div>
        </div>

        {/* ========== LISTE BAUX ========== */}
        {loading ? (
          <p style={{textAlign:'center', color:'#6b7280', padding:40}}>Chargement...</p>
        ) : baux.length === 0 ? (
          <div style={{textAlign:'center', padding:60, background:'white', borderRadius:20, border:'1px solid #f3f4f6'}}>
            <p style={{fontSize:40, marginBottom:16}}>📋</p>
            <p style={{fontSize:16, fontWeight:600, color:'#111827'}}>Aucun bail actif</p>
            <p style={{color:'#6b7280', fontSize:14, marginTop:4}}>
              {biens.length === 0 ? 'Commencez par ajouter un bien' : 'Cliquez sur "+ Ajouter un bail"'}
            </p>
            <a href={biens.length === 0 ? '/biens' : '/baux/nouveau'} style={{display:'inline-block', marginTop:20, background:'#2563eb', color:'white', padding:'10px 24px', borderRadius:10, textDecoration:'none', fontWeight:600, fontSize:14}}>
              {biens.length === 0 ? '→ Mes Biens' : '+ Ajouter un bail'}
            </a>
          </div>
        ) : (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:24}}>
            {baux.map(bail => (
              <div key={bail.id} style={{background:'white', borderRadius:20, border:'1px solid #f3f4f6', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', padding:24}}>
                <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12}}>
                  <div>
                    <span style={{fontSize:11, color:'#9ca3af', fontWeight:600, textTransform:'uppercase'}}>{bail.type_bail}</span>
                    {/* Nom du bien lié au bail */}
                    <h3 style={{fontWeight:600, color:'#111827', fontSize:14, marginTop:4}}>{bail.bien?.nom || 'Bien inconnu'}</h3>
                    <p style={{fontSize:12, color:'#9ca3af', marginTop:2}}>{bail.bien?.adresse || ''}</p>
                  </div>
                  <span style={{background:'#dcfce7', color:'#15803d', fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:999}}>✓ Actif</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', padding:'12px 0', borderTop:'1px solid #f9fafb', borderBottom:'1px solid #f9fafb', margin:'12px 0'}}>
                  <div>
                    <p style={{fontSize:11, color:'#9ca3af'}}>Loyer HC</p>
                    <p style={{fontSize:16, fontWeight:700, color:'#111827', marginTop:2}}>{bail.loyer_hc}€</p>
                  </div>
                  <div>
                    <p style={{fontSize:11, color:'#9ca3af'}}>Charges</p>
                    <p style={{fontSize:16, fontWeight:700, color:'#111827', marginTop:2}}>{bail.charges}€</p>
                  </div>
                  <div>
                    <p style={{fontSize:11, color:'#9ca3af'}}>Total</p>
                    <p style={{fontSize:16, fontWeight:700, color:'#2563eb', marginTop:2}}>{(bail.loyer_hc || 0) + (bail.charges || 0)}€</p>
                  </div>
                </div>
                <div style={{marginTop:12}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}>
                    <span style={{fontSize:11, color:'#9ca3af'}}>Progression</span>
                    <span style={{fontSize:11, color:'#9ca3af'}}>2/5</span>
                  </div>
                  <div style={{display:'flex', gap:4}}>
                    {['Bail', 'Banque', 'Loyer', 'Quittance', 'Coffre'].map((etape, i) => (
                      <div key={etape} style={{flex:1}}>
                        <div style={{height:6, borderRadius:999, background: i < 2 ? '#3b82f6' : '#e5e7eb'}}></div>
                        <p style={{fontSize:10, color:'#9ca3af', marginTop:3, textAlign:'center'}}>{etape}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}