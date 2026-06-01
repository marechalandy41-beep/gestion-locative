'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

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
  const [biens, setBiens] = useState([]);
  const [selectionne, setSelectionne] = useState(null);
  const [lots, setLots] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newBien, setNewBien] = useState({ nom: '', adresse: '', type: 'Appartement' });

  useEffect(() => {
    chargerBiens();
  }, []);

  async function chargerBiens() {
    setLoading(true);
    const { data, error } = await supabase.from('Biens').select('*');
    if (!error) setBiens(data);
    setLoading(false);
  }

  async function chargerLots(bienId) {
    if (lots[bienId]) return;
    const { data, error } = await supabase.from('lots').select('*').eq('bien_id', bienId);
    if (!error) setLots(prev => ({ ...prev, [bienId]: data }));
  }

  async function ajouterBien() {
    if (!newBien.nom || !newBien.adresse) return;
    const { error } = await supabase.from('Biens').insert([newBien]);
    if (!error) {
      setShowForm(false);
      setNewBien({ nom: '', adresse: '', type: 'Appartement' });
      chargerBiens();
    }
  }

  function handleSelect(bien) {
    if (selectionne === bien.id) {
      setSelectionne(null);
    } else {
      setSelectionne(bien.id);
      chargerLots(bien.id);
    }
  }

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
            <p style={{color:'#6b7280',fontSize:14,marginTop:4}}>{biens.length} biens enregistrés</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{background:'#2563eb',color:'white',padding:'10px 20px',borderRadius:12,fontWeight:600,border:'none',cursor:'pointer',fontSize:14}}
          >
            + Ajouter un bien
          </button>
        </div>

        {showForm && (
          <div style={{background:'white',borderRadius:16,border:'1px solid #e5e7eb',padding:24,marginBottom:24,boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
            <h3 style={{fontSize:15,fontWeight:600,color:'#111827',marginBottom:16}}>Nouveau bien</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:16}}>
              <div>
                <label style={{fontSize:13,fontWeight:500,color:'#374151',display:'block',marginBottom:6}}>Nom du bien</label>
                <input
                  value={newBien.nom}
                  onChange={e => setNewBien({...newBien, nom: e.target.value})}
                  placeholder="Ex: Appartement Paris 11e"
                  style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:8,padding:'10px 12px',fontSize:14,outline:'none',boxSizing:'border-box'}}
                />
              </div>
              <div>
                <label style={{fontSize:13,fontWeight:500,color:'#374151',display:'block',marginBottom:6}}>Adresse</label>
                <input
                  value={newBien.adresse}
                  onChange={e => setNewBien({...newBien, adresse: e.target.value})}
                  placeholder="Ex: 12 Rue de la Paix, Paris"
                  style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:8,padding:'10px 12px',fontSize:14,outline:'none',boxSizing:'border-box'}}
                />
              </div>
              <div>
                <label style={{fontSize:13,fontWeight:500,color:'#374151',display:'block',marginBottom:6}}>Type</label>
                <select
                  value={newBien.type}
                  onChange={e => setNewBien({...newBien, type: e.target.value})}
                  style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:8,padding:'10px 12px',fontSize:14,outline:'none',boxSizing:'border-box'}}
                >
                  {Object.keys(iconeType).map(t => <option key={t} value={t}>{iconeType[t]} {t}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={ajouterBien} style={{background:'#2563eb',color:'white',padding:'10px 20px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:600,fontSize:14}}>
                Enregistrer
              </button>
              <button onClick={() => setShowForm(false)} style={{background:'#f3f4f6',color:'#374151',padding:'10px 20px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:600,fontSize:14}}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p style={{color:'#6b7280',textAlign:'center',padding:40}}>Chargement...</p>
        ) : biens.length === 0 ? (
          <div style={{textAlign:'center',padding:60,background:'white',borderRadius:20,border:'1px solid #f3f4f6'}}>
            <p style={{fontSize:40,marginBottom:16}}>🏠</p>
            <p style={{fontSize:16,fontWeight:600,color:'#111827'}}>Aucun bien enregistré</p>
            <p style={{color:'#6b7280',fontSize:14,marginTop:4}}>Cliquez sur "Ajouter un bien" pour commencer</p>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:24}}>
            {biens.map(bien => (
              <div
                key={bien.id}
                onClick={() => handleSelect(bien)}
                style={{background:'white',borderRadius:20,border: selectionne === bien.id ? '2px solid #2563eb' : '1px solid #f3f4f6',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',padding:24,cursor:'pointer'}}
              >
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                  <div style={{fontSize:32}}>{iconeType[bien.type] || '🏠'}</div>
                  <div>
                    <h3 style={{fontWeight:700,color:'#111827',fontSize:15}}>{bien.nom}</h3>
                    <p style={{fontSize:12,color:'#9ca3af',marginTop:2}}>{bien.adresse}</p>
                  </div>
                </div>

                {selectionne === bien.id && lots[bien.id] && (
                  <div style={{borderTop:'1px solid #f3f4f6',paddingTop:16}}>
                    <p style={{fontSize:12,fontWeight:600,color:'#6b7280',marginBottom:8,textTransform:'uppercase'}}>Lots</p>
                    {lots[bien.id].length === 0 ? (
                      <p style={{fontSize:13,color:'#9ca3af'}}>Aucun lot enregistré</p>
                    ) : (
                      lots[bien.id].map(lot => (
                        <div key={lot.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f9fafb'}}>
                          <div>
                            <p style={{fontSize:13,fontWeight:500,color:'#374151'}}>{lot.nom}</p>
                            <p style={{fontSize:11,color:'#9ca3af'}}>{lot.surface} m²</p>
                          </div>
                          <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:999,background: lot.statut === 'loue' ? '#dcfce7' : '#fef3c7',color: lot.statut === 'loue' ? '#15803d' : '#d97706'}}>
                            {lot.statut === 'loue' ? '✓ Loué' : '⏳ Vacant'}
                          </span>
                        </div>
                      ))
                    )}
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
        )}
      </div>
    </main>
  );
}