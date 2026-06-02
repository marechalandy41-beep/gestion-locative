'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';

export default function NouveauBail() {

  const [user, setUser] = useState(null);
  const [biens, setBiens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [etape, setEtape] = useState(1);
  const [bail, setBail] = useState({
    bien_id: '',
    type_bail: 'Non meublé',
    loyer_hc: '',
    charges: '',
    type_charges: 'Forfaitaires',
    date_debut: '',
    date_fin: '',
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        chargerBiens(data.user.id);
      } else {
        window.location.href = '/auth';
      }
    });
  }, []);

  async function chargerBiens(userId) {
    const { data } = await supabase.from('Biens').select('*').eq('user_id', userId);
    setBiens(data || []);
  }

  async function sauvegarderBail() {
    if (!bail.bien_id || !bail.loyer_hc || !bail.date_debut) return;
    setLoading(true);
    const { error } = await supabase.from('Baux').insert([{
      bien_id: parseInt(bail.bien_id),
      user_id: user.id,
      type_bail: bail.type_bail,
      loyer_hc: parseFloat(bail.loyer_hc),
      charges: parseFloat(bail.charges) || 0,
      type_charges: bail.type_charges,
      date_debut: bail.date_debut,
      date_fin: bail.date_fin || null,
      statut: 'actif'
    }]);
    if (!error) {
      window.location.href = '/dashboard';
    } else {
      console.log('Erreur:', error);
    }
    setLoading(false);
  }

  const inputStyle = {
    width: '100%', border: '1px solid #e5e7eb', borderRadius: 8,
    padding: '10px 12px', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', background: 'white'
  };

  const labelStyle = {
    fontSize: 13, fontWeight: 500, color: '#374151',
    display: 'block', marginBottom: 6
  };

  return (
    <main style={{minHeight:'100vh', background:'#f9fafb'}}>

      {/* ========== NAVIGATION ========== */}
      <nav style={{background:'white', borderBottom:'1px solid #e5e7eb', boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
        <div style={{maxWidth:1280, margin:'0 auto', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <a href="/" style={{fontSize:22, fontWeight:700, color:'#2563eb', textDecoration:'none'}}>GestionLocative</a>
          <div style={{display:'flex', gap:24, fontSize:14, fontWeight:500, alignItems:'center'}}>
            <a href="/dashboard" style={{color:'#6b7280', textDecoration:'none'}}>Mes Baux</a>
            <a href="/biens" style={{color:'#6b7280', textDecoration:'none'}}>Mes Biens</a>
            <a href="/compte" style={{color:'#6b7280', textDecoration:'none'}}>Mon Compte</a>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/auth'; }}
              style={{background:'#fef2f2', color:'#dc2626', padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500}}>
              Déconnexion
            </button>
          </div>
        </div>
      </nav>
      {/* ========== FIN NAVIGATION ========== */}

      <div style={{maxWidth:800, margin:'0 auto', padding:'32px 24px'}}>

        {/* ========== EN-TÊTE ========== */}
        <div style={{display:'flex', alignItems:'center', gap:16, marginBottom:32}}>
          <a href="/dashboard" style={{color:'#6b7280', textDecoration:'none', fontSize:20}}>←</a>
          <div>
            <h2 style={{fontSize:24, fontWeight:700, color:'#111827'}}>Nouveau bail</h2>
            <p style={{color:'#6b7280', fontSize:14, marginTop:4}}>Étape {etape}/2</p>
          </div>
        </div>

        {/* ========== FORMULAIRE ========== */}
        <div style={{background:'white', borderRadius:20, border:'1px solid #f3f4f6', padding:32, boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>

          {/* ===== ÉTAPE 1 ===== */}
          {etape === 1 && (
            <div>
              <h3 style={{fontSize:16, fontWeight:600, color:'#111827', marginBottom:24}}>📋 Informations du bail</h3>

              {/* Sélection du bien */}
              <div style={{marginBottom:16}}>
                <label style={labelStyle}>Bien concerné *</label>
                <select value={bail.bien_id} onChange={e => setBail({...bail, bien_id: e.target.value})} style={inputStyle}>
                  <option value="">Sélectionner un bien...</option>
                  {biens.map(b => <option key={b.id} value={b.id}>{b.nom} — {b.adresse}</option>)}
                </select>
              </div>

              {/* Type de bail */}
              <div style={{marginBottom:16}}>
                <label style={labelStyle}>Type de bail *</label>
                <select value={bail.type_bail} onChange={e => setBail({...bail, type_bail: e.target.value})} style={inputStyle}>
                  <option value="Non meublé">Non meublé</option>
                  <option value="Meublé">Meublé</option>
                  <option value="Bail commercial 3-6-9">Bail commercial 3-6-9</option>
                  <option value="Bail précaire">Bail précaire</option>
                  <option value="Bail parking">Bail parking</option>
                  <option value="Bail stockage">Bail stockage</option>
                </select>
              </div>

              {/* Dates */}
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24}}>
                <div>
                  <label style={labelStyle}>Date de début *</label>
                  <input type="date" value={bail.date_debut} onChange={e => setBail({...bail, date_debut: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Date de fin <span style={{color:'#9ca3af'}}>(optionnel)</span></label>
                  <input type="date" value={bail.date_fin} onChange={e => setBail({...bail, date_fin: e.target.value})} style={inputStyle} />
                </div>
              </div>

              {/* Bouton suivant */}
              <button onClick={() => { if (bail.bien_id && bail.date_debut) setEtape(2); }}
                style={{background:'#2563eb', color:'white', padding:'10px 24px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:14}}>
                Suivant →
              </button>
            </div>
          )}

          {/* ===== ÉTAPE 2 ===== */}
          {etape === 2 && (
            <div>
              <h3 style={{fontSize:16, fontWeight:600, color:'#111827', marginBottom:24}}>💰 Loyer et charges</h3>

              {/* Loyer HC */}
              <div style={{marginBottom:16}}>
                <label style={labelStyle}>Loyer hors charges (€/mois) *</label>
                <input type="number" value={bail.loyer_hc} onChange={e => setBail({...bail, loyer_hc: e.target.value})} placeholder="Ex: 800" style={inputStyle} />
              </div>

              {/* Charges */}
              <div style={{marginBottom:16}}>
                <label style={labelStyle}>Charges (€/mois)</label>
                <input type="number" value={bail.charges} onChange={e => setBail({...bail, charges: e.target.value})} placeholder="Ex: 100" style={inputStyle} />
              </div>

              {/* Type de charges */}
              <div style={{marginBottom:16}}>
                <label style={labelStyle}>Type de charges</label>
                <select value={bail.type_charges} onChange={e => setBail({...bail, type_charges: e.target.value})} style={inputStyle}>
                  <option value="Forfaitaires">Forfaitaires — montant fixe</option>
                  <option value="Provisionnelles">Provisionnelles — régularisables en fin d'année</option>
                </select>
              </div>

              {/* Récapitulatif total */}
              {bail.loyer_hc && (
                <div style={{background:'#eff6ff', borderRadius:10, padding:16, marginBottom:24, border:'1px solid #bfdbfe'}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}>
                    <span style={{fontSize:13, color:'#374151'}}>Loyer hors charges</span>
                    <span style={{fontSize:13, fontWeight:600}}>{bail.loyer_hc}€</span>
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}>
                    <span style={{fontSize:13, color:'#374151'}}>Charges</span>
                    <span style={{fontSize:13, fontWeight:600}}>{bail.charges || 0}€</span>
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between', paddingTop:8, borderTop:'1px solid #bfdbfe'}}>
                    <span style={{fontSize:14, fontWeight:700, color:'#1e40af'}}>Total mensuel</span>
                    <span style={{fontSize:14, fontWeight:700, color:'#1e40af'}}>{(parseFloat(bail.loyer_hc)||0) + (parseFloat(bail.charges)||0)}€</span>
                  </div>
                </div>
              )}

              {/* Boutons */}
              <div style={{display:'flex', gap:8}}>
                <button onClick={sauvegarderBail} disabled={loading}
                  style={{background:'#2563eb', color:'white', padding:'10px 24px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:14}}>
                  {loading ? 'Enregistrement...' : '✅ Créer le bail'}
                </button>
                <button onClick={() => setEtape(1)}
                  style={{background:'#f3f4f6', color:'#374151', padding:'10px 24px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:14}}>
                  ← Retour
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}