'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

export default function Compte() {

  // ========== ÉTATS DU COMPOSANT ==========
  const [onglet, setOnglet] = useState('profil');
  const [user, setUser] = useState(null);
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmMdp, setConfirmMdp] = useState('');

  // ========== CHARGEMENT DE L'UTILISATEUR CONNECTÉ ==========
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        // Récupère les infos du profil stockées dans Supabase Auth
        setPrenom(data.user.user_metadata?.prenom || '');
        setNom(data.user.user_metadata?.nom || '');
        setTelephone(data.user.user_metadata?.telephone || '');
      } else {
        window.location.href = '/auth';
      }
      setLoading(false);
    });
  }, []);

  // ========== FONCTION: SAUVEGARDER LE PROFIL ==========
  async function sauvegarderProfil() {
    const { error } = await supabase.auth.updateUser({
      data: { prenom, nom, telephone }
    });
    if (!error) {
      setMessage('Profil mis à jour avec succès !');
      setTimeout(() => setMessage(''), 3000);
    }
  }

  // ========== FONCTION: CHANGER LE MOT DE PASSE ==========
  async function changerMotDePasse() {
    if (nouveauMdp !== confirmMdp) {
      setMessage('Les mots de passe ne correspondent pas');
      return;
    }
    if (nouveauMdp.length < 6) {
      setMessage('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: nouveauMdp });
    if (!error) {
      setMessage('Mot de passe modifié avec succès !');
      setAncienMdp(''); setNouveauMdp(''); setConfirmMdp('');
      setTimeout(() => setMessage(''), 3000);
    }
  }

  // ========== FONCTION: DÉCONNEXION ==========
  async function deconnexion() {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }

  // ========== STYLES ==========
  const inputStyle = {
    width: '100%',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box'
  };

  if (loading) return <p style={{textAlign:'center', padding:40}}>Chargement...</p>;

  return (
    <main style={{minHeight:'100vh', background:'#f9fafb'}}>

      {/* ========== BARRE DE NAVIGATION ========== */}
      <nav style={{background:'white', borderBottom:'1px solid #e5e7eb', boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
        <div style={{maxWidth:1280, margin:'0 auto', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <a href="/dashboard" style={{fontSize:22, fontWeight:700, color:'#2563eb', textDecoration:'none'}}>GestionLocative</a>
          <div style={{display:'flex', gap:24, fontSize:14, fontWeight:500, alignItems:'center'}}>
            <a href="/dashboard" style={{color:'#6b7280', textDecoration:'none'}}>Mes Briques</a>
            <a href="/biens" style={{color:'#6b7280', textDecoration:'none'}}>Mes Biens</a>
            <a href="/compte" style={{color:'#2563eb', borderBottom:'2px solid #2563eb', paddingBottom:4, textDecoration:'none'}}>Mon Compte</a>
            {/* Bouton déconnexion */}
            <button onClick={deconnexion} style={{background:'#fef2f2', color:'#dc2626', padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500}}>
              Déconnexion
            </button>
          </div>
        </div>
      </nav>
      {/* ========== FIN NAVIGATION ========== */}

      <div style={{maxWidth:800, margin:'0 auto', padding:'32px 24px'}}>

        {/* ========== EN-TÊTE AVEC NOM DE L'UTILISATEUR ========== */}
        <div style={{marginBottom:24}}>
          <h2 style={{fontSize:24, fontWeight:700, color:'#111827'}}>Mon Compte</h2>
          {/* Affiche l'email de l'utilisateur connecté */}
          <p style={{color:'#6b7280', fontSize:14, marginTop:4}}>Connecté en tant que {user?.email}</p>
        </div>

        {/* ========== MESSAGE DE SUCCÈS ========== */}
        {message && (
          <div style={{background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:12, marginBottom:16}}>
            <p style={{color:'#15803d', fontSize:13}}>{message}</p>
          </div>
        )}

        {/* ========== ONGLETS ========== */}
        <div style={{display:'flex', gap:4, background:'#f3f4f6', borderRadius:12, padding:4, marginBottom:32, width:'fit-content'}}>
          {['profil', 'securite'].map(o => (
            <button key={o} onClick={() => setOnglet(o)} style={{
              padding:'8px 20px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
              background: onglet === o ? 'white' : 'transparent',
              color: onglet === o ? '#2563eb' : '#6b7280',
              boxShadow: onglet === o ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}>
              {o === 'profil' ? '👤 Profil' : '🔒 Sécurité'}
            </button>
          ))}
        </div>

        {/* ========== ONGLET PROFIL ========== */}
        {onglet === 'profil' && (
          <div style={{background:'white', borderRadius:20, border:'1px solid #f3f4f6', padding:32, boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
            <h3 style={{fontSize:16, fontWeight:600, color:'#111827', marginBottom:24}}>Informations personnelles</h3>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16}}>
              <div>
                <label style={{fontSize:13, fontWeight:500, color:'#374151', display:'block', marginBottom:6}}>Prénom</label>
                <input value={prenom} onChange={e => setPrenom(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{fontSize:13, fontWeight:500, color:'#374151', display:'block', marginBottom:6}}>Nom</label>
                <input value={nom} onChange={e => setNom(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:13, fontWeight:500, color:'#374151', display:'block', marginBottom:6}}>Email</label>
              {/* Email non modifiable - affiché en grisé */}
              <input value={user?.email || ''} disabled style={{...inputStyle, background:'#f9fafb', color:'#9ca3af'}} />
            </div>
            <div style={{marginBottom:24}}>
              <label style={{fontSize:13, fontWeight:500, color:'#374151', display:'block', marginBottom:6}}>Téléphone</label>
              <input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="Ex: 06 12 34 56 78" style={inputStyle} />
            </div>
            {/* Bouton sauvegarder le profil */}
            <button onClick={sauvegarderProfil} style={{background:'#2563eb', color:'white', padding:'10px 24px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:600, fontSize:14}}>
              Sauvegarder
            </button>
          </div>
        )}

        {/* ========== ONGLET SÉCURITÉ ========== */}
        {onglet === 'securite' && (
          <div style={{background:'white', borderRadius:20, border:'1px solid #f3f4f6', padding:32, boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
            <h3 style={{fontSize:16, fontWeight:600, color:'#111827', marginBottom:24}}>Changer le mot de passe</h3>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:13, fontWeight:500, color:'#374151', display:'block', marginBottom:6}}>Nouveau mot de passe</label>
              <input type="password" value={nouveauMdp} onChange={e => setNouveauMdp(e.target.value)} placeholder="6 caractères minimum" style={inputStyle} />
            </div>
            <div style={{marginBottom:24}}>
              <label style={{fontSize:13, fontWeight:500, color:'#374151', display:'block', marginBottom:6}}>Confirmer le nouveau mot de passe</label>
              <input type="password" value={confirmMdp} onChange={e => setConfirmMdp(e.target.value)} placeholder="••••••••" style={inputStyle} />
            </div>
            {/* Bouton changer le mot de passe */}
            <button onClick={changerMotDePasse} style={{background:'#2563eb', color:'white', padding:'10px 24px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:600, fontSize:14}}>
              Changer le mot de passe
            </button>
          </div>
        )}

      </div>
    </main>
  );
}