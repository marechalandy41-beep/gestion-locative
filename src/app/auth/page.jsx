'use client';
import { useState } from 'react';
import { supabase } from '../../supabase';

export default function Auth() {
  const [mode, setMode] = useState('connexion');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [codeParrainage, setCodeParrainage] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');

  async function handleConnexion() {
    setLoading(true);
    setErreur('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErreur('Email ou mot de passe incorrect');
    } else {
      window.location.href = '/dashboard';
    }
    setLoading(false);
  }

  async function handleInscription() {
    setLoading(true);
    setErreur('');
    if (!prenom || !nom || !email || !password) {
      setErreur('Veuillez remplir tous les champs');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setErreur('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { prenom, nom } }
    });

    if (error) {
      setErreur('Erreur : ' + error.message);
      setLoading(false);
      return;
    }

    // Si un code parrainage a été saisi, on l'applique
    if (codeParrainage.trim() && data?.user) {
      await fetch('/api/appliquer-parrainage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeParrainage.trim().toUpperCase(),
          filleulId: data.user.id,
        }),
      })
    }

    setMessage('Compte créé ! Vérifiez votre email pour confirmer votre inscription.');
    setLoading(false);
  }

  const inputStyle = {
    width: '100%', border: '1px solid #e5e7eb', borderRadius: 8,
    padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box'
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f3f4f6', padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

        <a href="/" style={{ display: 'block', textAlign: 'center', marginBottom: 4, color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>← Retour au site</a>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2563eb', textAlign: 'center', marginBottom: 24 }}>Ma Gestion-Locative</h1>

        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 10, padding: 4, marginBottom: 24 }}>
          <button onClick={() => { setMode('connexion'); setErreur(''); setMessage(''); }}
            style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: mode === 'connexion' ? 'white' : 'transparent',
              color: mode === 'connexion' ? '#2563eb' : '#6b7280',
              boxShadow: mode === 'connexion' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            Connexion
          </button>
          <button onClick={() => { setMode('inscription'); setErreur(''); setMessage(''); }}
            style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: mode === 'inscription' ? 'white' : 'transparent',
              color: mode === 'inscription' ? '#2563eb' : '#6b7280',
              boxShadow: mode === 'inscription' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            Inscription
          </button>
        </div>

        {message && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <p style={{ color: '#15803d', fontSize: 13 }}>{message}</p>
          </div>
        )}

        {erreur && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <p style={{ color: '#dc2626', fontSize: 13 }}>{erreur}</p>
          </div>
        )}

        {mode === 'connexion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleConnexion(); }}
                placeholder="votre@email.com" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleConnexion(); }}
                placeholder="••••••••" style={inputStyle} />
            </div>
            <button onClick={handleConnexion} disabled={loading}
              style={{ background: '#2563eb', color: 'white', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, marginTop: 8 }}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
              Mot de passe oublié ?{' '}
              <span style={{ color: '#2563eb', cursor: 'pointer' }}
                onClick={async () => {
                  if (!email) { setErreur("Entrez votre email d'abord"); return; }
                  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/reset_password` });
                  setMessage('Email de réinitialisation envoyé !');
                }}>
                Réinitialiser
              </span>
            </p>
          </div>
        )}

        {mode === 'inscription' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Prénom</label>
                <input type="text" value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Jean" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Nom</label>
                <input type="text" value={nom} onChange={e => setNom(e.target.value)} placeholder="Dupont" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleInscription(); }}
                placeholder="6 caractères minimum" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
                Code parrainage <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optionnel)</span>
              </label>
              <input type="text" value={codeParrainage}
                onChange={e => setCodeParrainage(e.target.value.toUpperCase())}
                placeholder="Ex: GL-ABC123" style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: 1 }} />
            </div>
            <button onClick={handleInscription} disabled={loading}
              style={{ background: '#2563eb', color: 'white', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, marginTop: 8 }}>
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
              En vous inscrivant vous acceptez nos{' '}
              <span style={{ color: '#2563eb', cursor: 'pointer' }}>CGU</span>
            </p>
          </div>
        )}

      </div>
    </main>
  );
}