'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useRouter } from 'next/navigation';

export default function ConnexionBancaire() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [comptes, setComptes] = useState([]);
  const [accessToken, setAccessToken] = useState(null);
  const [etape, setEtape] = useState('accueil');
  const [erreur, setErreur] = useState(null);
  const [baux, setBaux] = useState([]);
  const [matchings, setMatchings] = useState([]);

  useEffect(() => {
  supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth'); return; }
      setUser(data.user);
      chargerBaux(data.user.id);

      // Vérifier si on revient du widget Bridge
      const params = new URLSearchParams(window.location.search);
if (params.get('bridge_callback') === 'true') {
  const token = localStorage.getItem('bridge_token');
  if (token) {
    setAccessToken(token);
    await chargerComptes(token);
    setEtape('comptes');
  } else {
    // Pas de token, re-authentifier
    const res = await fetch('/api/bridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_connect_session',
        userId: data.user.id,
        userEmail: data.user.email,
      }),
    });
    const sessionData = await res.json();
    if (sessionData.access_token) {
      localStorage.setItem('bridge_token', sessionData.access_token);
      setAccessToken(sessionData.access_token);
      await chargerComptes(sessionData.access_token);
      setEtape('comptes');
    }
  }
}
    });
  }, []);

  async function chargerBaux(userId) {
    const { data } = await supabase
      .from('Baux')
      .select('*, Biens(nom, adresse)')
      .eq('user_id', userId)
      .eq('statut', 'actif');
    setBaux(data || []);
  }

  async function connecterBanque() {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch('/api/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_connect_session',
          userId: user.id,
          userEmail: user.email,
        }),
      });
      const data = await res.json();
      console.log('Session data:', data);

      if (data.error) {
        setErreur('Erreur Bridge : ' + (data.details?.message || data.error));
        setLoading(false);
        return;
      }

      // Stocker le token et rediriger vers le widget Bridge
      if (data.token) localStorage.setItem('bridge_token', data.token);
      localStorage.setItem('bridge_connected_at', Date.now().toString());
      if (data.connect_url) {
        window.location.href = data.connect_url;
      } else {
        setErreur('Pas d\'URL de connexion reçue. Détails : ' + JSON.stringify(data));
      }
    } catch (e) {
      setErreur('Erreur : ' + e.message);
    }
    setLoading(false);
  }

  async function chargerComptes(token) {
    setLoading(true);
    try {
      const res = await fetch('/api/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_accounts', accessToken: token }),
      });
      const data = await res.json();
      setComptes(data.resources || data || []);
    } catch (e) {
      setErreur('Erreur comptes : ' + e.message);
    }
    setLoading(false);
  }

  async function analyserTransactions(accountId) {
  setLoading(true);
  setErreur(null);
  try {
    const res = await fetch('/api/bridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_transactions', accessToken, accountId }),
    });
    const data = await res.json();
    console.log('Transactions reçues:', JSON.stringify(data));
    const transactions = Array.isArray(data.resources) ? data.resources : Array.isArray(data) ? data : [];
    console.log('Nombre de transactions:', transactions.length);
    const matches = detecterLoyers(transactions, baux);
    console.log('Loyers matchés:', matches.length);
    setMatchings(matches);
    setEtape('succes');
  } catch (e) {
    setErreur('Erreur analyse : ' + e.message);
    setEtape('succes'); // on passe quand même à l'écran suivant
  }
  setLoading(false);
}

  function detecterLoyers(transactions, baux) {
    const matches = [];
    const maintenant = new Date();
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);

    for (const tx of transactions) {
      if (tx.amount <= 0) continue;
      const dateTx = new Date(tx.date || tx.transaction_date);
      if (dateTx < debutMois) continue;

      for (const bail of baux) {
        const loyer = parseFloat(bail.loyer_hc) + parseFloat(bail.charges || 0);
        const tolerance = loyer * 0.02;
        if (Math.abs(tx.amount - loyer) <= tolerance) {
          const libelle = (tx.label || tx.description || '').toLowerCase();
          const nomLocataire = (bail.locataire_nom || '').toLowerCase();
          const scoreNom = nomLocataire && libelle.includes(nomLocataire) ? 2 : 0;
          matches.push({
            transaction: tx, bail,
            score: scoreNom + 1,
            confiance: scoreNom > 0 ? 'haute' : 'moyenne',
          });
          break;
        }
      }
    }
    return matches.sort((a, b) => b.score - a.score);
  }

  async function validerLoyer(matching) {
    const mois = new Date().getMonth() + 1;
    const annee = new Date().getFullYear();
    await supabase.from('Paiements').insert({
      bail_id: matching.bail.id,
      user_id: user.id,
      montant: matching.transaction.amount,
      date_paiement: matching.transaction.date || matching.transaction.transaction_date,
      mois, annee,
      statut: 'paye',
      source: 'bridge_auto',
      libelle_virement: matching.transaction.label || matching.transaction.description,
    });
    setMatchings(prev => prev.filter(m => m !== matching));
    alert(`✅ Loyer validé pour ${matching.bail.locataire_prenom} ${matching.bail.locataire_nom} !`);
  }

  const nav = (
    <nav style={{ background: '#1e3a5f', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span onClick={() => router.push('/dashboard')} style={{ color: 'white', fontWeight: 700, fontSize: 18, cursor: 'pointer' }}>GestionLocative</span>
      <div style={{ display: 'flex', gap: 24 }}>
        {[['Baux actifs', '/dashboard'], ['Mes Baux', '/baux'], ['Mes Biens', '/biens'], ['Mon Compte', '/compte'], ['Documents', '/documents']].map(([label, href]) => (
          <span key={href} onClick={() => router.push(href)} style={{ color: '#93c5fd', cursor: 'pointer', fontSize: 14 }}>{label}</span>
        ))}
      </div>
    </nav>
  );

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {nav}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>

        {etape === 'accueil' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🏦</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Connexion bancaire</h1>
            <p style={{ color: '#6b7280', fontSize: 16, marginBottom: 8 }}>
              Connectez votre compte bancaire pour détecter automatiquement les virements de loyer.
            </p>
            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 40 }}>
              🔒 Connexion sécurisée via Bridge — agréé ACPR — lecture seule, aucun virement possible
            </p>

            {baux.length === 0 ? (
              <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 12, padding: 20, marginBottom: 32 }}>
                <p style={{ color: '#854d0e', margin: 0 }}>⚠️ Vous n'avez aucun bail actif. Créez un bail avant de connecter votre banque.</p>
              </div>
            ) : (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, marginBottom: 32, textAlign: 'left' }}>
                <p style={{ color: '#166534', fontWeight: 600, marginBottom: 8 }}>✅ {baux.length} bail(s) actif(s) détecté(s)</p>
                {baux.map(bail => (
                  <div key={bail.id} style={{ color: '#15803d', fontSize: 13, marginBottom: 4 }}>
                    • {bail.locataire_prenom} {bail.locataire_nom} — {bail.Biens?.nom} — {parseFloat(bail.loyer_hc) + parseFloat(bail.charges || 0)}€/mois
                  </div>
                ))}
              </div>
            )}

            {erreur && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: 12, marginBottom: 24, color: '#dc2626', fontSize: 13, textAlign: 'left' }}>
                {erreur}
              </div>
            )}

            <button
              onClick={connecterBanque}
              disabled={loading || baux.length === 0}
              style={{ background: loading || baux.length === 0 ? '#9ca3af' : '#2563eb', color: 'white', padding: '14px 32px', borderRadius: 10, border: 'none', cursor: loading || baux.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 16 }}
            >
              {loading ? '⏳ Connexion en cours...' : '🔗 Connecter ma banque'}
            </button>
          </div>
        )}

        {etape === 'comptes' && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Vos comptes bancaires</h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>Sélectionnez le compte sur lequel vous recevez les loyers.</p>
            {loading && <p style={{ color: '#6b7280' }}>⏳ Chargement des comptes...</p>}
            {!loading && comptes.length === 0 && (
              <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 12, padding: 20 }}>
                <p style={{ color: '#854d0e' }}>Aucun compte trouvé après la connexion Bridge.</p>
              </div>
            )}
            {comptes.map(compte => (
              <div key={compte.id} onClick={() => analyserTransactions(compte.id)}
                style={{ background: 'white', border: '2px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 12, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#2563eb'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#e5e7eb'}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{compte.name || compte.bank_name || 'Compte bancaire'}</div>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>{compte.iban || compte.number || ''}</div>
                </div>
                <div style={{ fontWeight: 700, color: '#2563eb', fontSize: 18 }}>
                  {compte.balance != null ? `${compte.balance}€` : '→'}
                </div>
              </div>
            ))}
          </div>
        )}

        {etape === 'succes' && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Virements détectés ce mois</h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>Validez les loyers identifiés automatiquement.</p>
            {matchings.length === 0 ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <p style={{ color: '#166534', fontWeight: 600 }}>Aucun loyer en attente détecté ce mois.</p>
              </div>
            ) : (
              matchings.map((m, i) => (
                <div key={i} style={{ background: 'white', border: `2px solid ${m.confiance === 'haute' ? '#bbf7d0' : '#fde68a'}`, borderRadius: 12, padding: 20, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{m.bail.locataire_prenom} {m.bail.locataire_nom}</div>
                      <div style={{ color: '#6b7280', fontSize: 13 }}>{m.bail.Biens?.nom}</div>
                      <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Libellé : {m.transaction.label || m.transaction.description || 'N/A'}</div>
                      <span style={{ background: m.confiance === 'haute' ? '#dcfce7' : '#fef9c3', color: m.confiance === 'haute' ? '#166534' : '#854d0e', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, display: 'inline-block', marginTop: 8 }}>
                        {m.confiance === 'haute' ? '✅ Confiance haute' : '⚠️ Confiance moyenne'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#2563eb', fontSize: 22 }}>{m.transaction.amount}€</div>
                      <div style={{ color: '#9ca3af', fontSize: 12 }}>{m.transaction.date || m.transaction.transaction_date}</div>
                      <button onClick={() => validerLoyer(m)}
                        style={{ marginTop: 8, background: '#2563eb', color: 'white', padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                        ✅ Valider
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
            <button onClick={() => { setEtape('accueil'); setMatchings([]); }}
              style={{ marginTop: 16, background: 'white', color: '#6b7280', padding: '10px 20px', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 14 }}>
              ← Retour
            </button>
          </div>
        )}
      </div>
    </main>
  );
}