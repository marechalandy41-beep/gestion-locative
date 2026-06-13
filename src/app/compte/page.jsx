'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Nav from '../components/nav'

export default function Compte() {

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
  const [codePromo, setCodePromo] = useState('');
  const [codeMessage, setCodeMessage] = useState('');
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeActuel, setCodeActuel] = useState(null)
  const [reductionActuelle, setReductionActuelle] = useState(0)
  const [codeExpire, setCodeExpire] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        setUser(data.user);
        setPrenom(data.user.user_metadata?.prenom || '');
        setNom(data.user.user_metadata?.nom || '');
        setTelephone(data.user.user_metadata?.telephone || '');

        const { data: customerData } = await supabase
          .from('customers')
          .select('code_promo, reduction')
          .eq('user_id', data.user.id)
          .single();

        if (customerData?.code_promo) {
  const { data: codeData } = await supabase
    .from('codes_promo')
    .select('expire_le, actif')
    .eq('code', customerData.code_promo)
    .single()

  // Si le code n'existe plus dans la table, on garde quand même la réduction
  if (!codeData) {
    setCodeActuel(customerData.code_promo)
    setReductionActuelle(customerData.reduction)
  } else {
    const codeValide = codeData.actif &&
      (!codeData.expire_le || new Date(codeData.expire_le) >= new Date())

    if (codeValide) {
      setCodeActuel(customerData.code_promo)
      setReductionActuelle(customerData.reduction)
    } else {
      setCodeExpire(true)
      await supabase
        .from('customers')
        .update({ code_promo: null, reduction: 0 })
        .eq('user_id', data.user.id)
    }
  }
}
      } else {
        window.location.href = '/auth';
      }
      setLoading(false);
    });
  }, []);

  async function sauvegarderProfil() {
    const { error } = await supabase.auth.updateUser({
      data: { prenom, nom, telephone }
    });
    if (!error) {
      setMessage('Profil mis à jour avec succès !');
      setTimeout(() => setMessage(''), 3000);
    }
  }

  async function changerMotDePasse() {
    if (nouveauMdp !== confirmMdp) { setMessage('Les mots de passe ne correspondent pas'); return; }
    if (nouveauMdp.length < 6) { setMessage('Le mot de passe doit contenir au moins 6 caractères'); return; }
    const { error } = await supabase.auth.updateUser({ password: nouveauMdp });
    if (!error) {
      setMessage('Mot de passe modifié avec succès !');
      setAncienMdp(''); setNouveauMdp(''); setConfirmMdp('');
      setTimeout(() => setMessage(''), 3000);
    }
  }

  async function appliquerCodePromo() {
    if (!codePromo.trim()) { setCodeMessage('❌ Saisissez un code'); return; }
    setCodeLoading(true)
    setCodeMessage('')
    try {
      const res = await fetch('/api/appliquer-code-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codePromo.trim().toUpperCase(), userId: user.id }),
      })
      const data = await res.json()
      if (data.success) {
        setCodeMessage(`✅ Code appliqué ! Réduction de ${data.reduction}% sur votre abonnement.`)
        setCodeActuel(codePromo.trim().toUpperCase())
        setReductionActuelle(data.reduction)
        setCodeExpire(false)
        setCodePromo('')
      } else {
        setCodeMessage('❌ ' + data.error)
      }
    } catch (err) {
      setCodeMessage('❌ Erreur : ' + err.message)
    }
    setCodeLoading(false)
  }

  async function deconnexion() {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }

  const inputStyle = {
    width: '100%', border: '1px solid #e5e7eb', borderRadius: 8,
    padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box'
  };

  if (loading) return <p style={{ textAlign: 'center', padding: 40 }}>Chargement...</p>;

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Nav pageCourante="compte" />

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>Mon Compte</h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Connecté en tant que {user?.email}</p>
        </div>

        {message && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <p style={{ color: '#15803d', fontSize: 13 }}>{message}</p>
          </div>
        )}

        {/* ONGLETS */}
        <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 32, width: 'fit-content' }}>
          {[
            { id: 'profil', label: '👤 Profil' },
            { id: 'securite', label: '🔒 Sécurité' },
            { id: 'abonnement', label: '💳 Abonnement' },
          ].map(o => (
            <button key={o.id} onClick={() => setOnglet(o.id)} style={{
              padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: onglet === o.id ? 'white' : 'transparent',
              color: onglet === o.id ? '#2563eb' : '#6b7280',
              boxShadow: onglet === o.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}>
              {o.label}
            </button>
          ))}
        </div>

        {/* ONGLET PROFIL */}
        {onglet === 'profil' && (
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f3f4f6', padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 24 }}>Informations personnelles</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Prénom</label>
                <input value={prenom} onChange={e => setPrenom(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Nom</label>
                <input value={nom} onChange={e => setNom(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Email</label>
              <input value={user?.email || ''} disabled style={{ ...inputStyle, background: '#f9fafb', color: '#9ca3af' }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Téléphone</label>
              <input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="Ex: 06 12 34 56 78" style={inputStyle} />
            </div>
            <button onClick={sauvegarderProfil} style={{ background: '#2563eb', color: 'white', padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              Sauvegarder
            </button>
          </div>
        )}

        {/* ONGLET SÉCURITÉ */}
        {onglet === 'securite' && (
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f3f4f6', padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 24 }}>Changer le mot de passe</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Nouveau mot de passe</label>
              <input type="password" value={nouveauMdp} onChange={e => setNouveauMdp(e.target.value)} placeholder="6 caractères minimum" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Confirmer le nouveau mot de passe</label>
              <input type="password" value={confirmMdp} onChange={e => setConfirmMdp(e.target.value)} placeholder="••••••••" style={inputStyle} />
            </div>
            <button onClick={changerMotDePasse} style={{ background: '#2563eb', color: 'white', padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              Changer le mot de passe
            </button>
          </div>
        )}

        {/* ONGLET ABONNEMENT */}
        {onglet === 'abonnement' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Souscrire */}
            <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f3f4f6', padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>💳 Passer au plan payant</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>Accédez à toutes les fonctionnalités — baux, états des lieux, connexion bancaire et plus.</p>
              <a href="/abonnement" style={{ display: 'inline-block', background: '#2563eb', color: 'white', padding: '10px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                Voir les plans →
              </a>
            </div>

            {/* Code expiré */}
            {codeExpire && (
              <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 12, padding: 14 }}>
                <p style={{ fontSize: 13, color: '#854d0e', margin: 0, fontWeight: 500 }}>
                  ⚠️ Votre code promo a expiré. Vous pouvez en saisir un nouveau ci-dessous.
                </p>
              </div>
            )}

            {/* Code promo actif */}
            {codeActuel && !codeExpire && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#15803d', marginBottom: 8 }}>🎟️ Code promo actif</h3>
                <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>
                  Code <strong>{codeActuel}</strong> — Réduction de <strong>{reductionActuelle}%</strong> sur votre abonnement
                </p>
              </div>
            )}

            {/* Saisie code promo — visible si pas de code actif ou si code expiré */}
            {(!codeActuel || codeExpire) && (
              <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f3f4f6', padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>🎟️ Code promo</h3>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Vous avez un code de réduction ? Saisissez-le ici.</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={codePromo}
                    onChange={e => setCodePromo(e.target.value.toUpperCase())}
                    placeholder="Ex: NOT-12345"
                    onKeyDown={e => e.key === 'Enter' && appliquerCodePromo()}
                    style={{ ...inputStyle, flex: 1, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}
                  />
                  <button onClick={appliquerCodePromo} disabled={codeLoading}
                    style={{ background: codeLoading ? '#93c5fd' : '#2563eb', color: 'white', padding: '10px 20px', borderRadius: 10, border: 'none', cursor: codeLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>
                    {codeLoading ? '⏳' : 'Appliquer'}
                  </button>
                </div>
                {codeMessage && (
                  <p style={{ fontSize: 13, marginTop: 10, color: codeMessage.startsWith('✅') ? '#15803d' : '#dc2626', fontWeight: 500 }}>
                    {codeMessage}
                  </p>
                )}
              </div>
            )}

          </div>
        )}

      </div>
    </main>
  );
}