'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Nav from '../components/nav'

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [baux, setBaux] = useState([]);
  const [biens, setBiens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paiementsMois, setPaiementsMois] = useState([]);
  const [joursRestants, setJoursRestants] = useState(null);
  const [plan, setPlan] = useState('gratuit');
  // ===== MESSAGES NON LUS =====
  const [nonLusParBail, setNonLusParBail] = useState({});

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

  useEffect(() => {
    const bridgeConnectedAt = localStorage.getItem('bridge_connected_at');
    if (bridgeConnectedAt) {
      const jours = Math.max(0, 90 - Math.floor((Date.now() - parseInt(bridgeConnectedAt)) / (1000 * 60 * 60 * 24)));
      setJoursRestants(jours);
    }
  }, []);

  async function chargerDonnees(userId) {
    setLoading(true);

    const { data: customerData } = await supabase
      .from('customers')
      .select('plan')
      .eq('user_id', userId)
      .single();
    if (customerData?.plan) setPlan(customerData.plan);
    if (!customerData?.plan || customerData.plan === 'gratuit') {
      window.location.href = '/biens';
      return;
    }

    const { data: biensData } = await supabase
      .from('Biens')
      .select('*')
      .eq('user_id', userId);

    const { data: bauxData } = await supabase
      .from('Baux')
      .select('*, bien:bien_id(id, nom, adresse, type)')
      .eq('user_id', userId)
      .eq('statut', 'actif');

    const moisActuel = new Date().getMonth() + 1;
    const anneeActuelle = new Date().getFullYear();
    const { data: paiementsData } = await supabase
      .from('paiements')
      .select('bail_id')
      .eq('user_id', userId)
      .eq('mois', moisActuel)
      .eq('annee', anneeActuelle);

    setBiens(biensData || []);
    setBaux(bauxData || []);
    setPaiementsMois(paiementsData || []);
    setLoading(false);

    // Charger les messages non lus pour chaque bail
    if (bauxData && bauxData.length > 0) {
      chargerNonLus(bauxData.map(b => b.id));
    }
  }

  // ===== CHARGER MESSAGES NON LUS PAR BAIL =====
  async function chargerNonLus(bailIds) {
    const { data } = await supabase
      .from('messages_locataires')
      .select('bail_id')
      .in('bail_id', bailIds)
      .eq('expediteur', 'locataire')
      .eq('lu', false);

    if (!data) return;
    // Compter par bail_id
    const compteur = {};
    data.forEach(m => {
      compteur[m.bail_id] = (compteur[m.bail_id] || 0) + 1;
    });
    setNonLusParBail(compteur);
  }

  async function deconnexion() {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }

  const totalLoyers = baux.reduce((a, b) => a + (b.loyer_hc || 0) + (b.charges || 0), 0);
  const biensSansBail = Math.max(0, biens.length - baux.length);
  const estPayant = plan !== 'gratuit';

  function statutLoyer(bail) {
    const jour = new Date().getDate();
    const dejaPaye = paiementsMois.some(p => p.bail_id === bail.id);
    if (dejaPaye) return { couleur: '#16a34a', bg: '#dcfce7', texte: '✅ Payé' };
    if (jour < (bail.date_exigibilite || 5)) return { couleur: '#854d0e', bg: '#fef9c3', texte: '⏳ En attente' };
    return { couleur: '#dc2626', bg: '#fef2f2', texte: '❌ Impayé' };
  }

  async function togglePaiement(bail) {
    const moisActuel = new Date().getMonth() + 1;
    const anneeActuelle = new Date().getFullYear();
    const dejaPaye = paiementsMois.some(p => p.bail_id === bail.id);

    if (dejaPaye) {
      await supabase.from('paiements')
        .delete()
        .eq('bail_id', bail.id)
        .eq('mois', moisActuel)
        .eq('annee', anneeActuelle)
        .eq('user_id', user.id);
      setPaiementsMois(prev => prev.filter(p => p.bail_id !== bail.id));
    } else {
      const { data } = await supabase.from('paiements').insert({
        bail_id: bail.id,
        user_id: user.id,
        montant: (bail.loyer_hc || 0) + (bail.charges || 0),
        mois: moisActuel,
        annee: anneeActuelle,
        date_paiement: new Date().toISOString().split('T')[0],
        source: 'manuel',
        statut: 'valide',
        libelle_virement: 'Paiement manuel',
      }).select().single();
      if (data) setPaiementsMois(prev => [...prev, { bail_id: bail.id }]);
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>

      <Nav pageCourante="dashboard" />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>

        {/* EN-TÊTE */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
              Bonjour {user?.user_metadata?.prenom || user?.email?.split('@')[0]} 👋
            </h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>{baux.length} bail{baux.length > 1 ? 's' : ''} actif{baux.length > 1 ? 's' : ''}</p>
          </div>

          {estPayant && (
            joursRestants === null ? (
              <a href="/connexion-bancaire" style={{ background: '#f0fdf4', color: '#16a34a', padding: '10px 24px', borderRadius: 12, fontWeight: 600, fontSize: 14, textDecoration: 'none', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                🏦 Connecter ma banque
              </a>
            ) : joursRestants > 10 ? (
              <a href="/connexion-bancaire" style={{ background: '#f0fdf4', color: '#16a34a', padding: '10px 24px', borderRadius: 12, fontWeight: 600, fontSize: 14, border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                🏦 Banque connectée — {joursRestants}j
              </a>
            ) : (
              <a href="/connexion-bancaire" style={{ background: '#fef9c3', color: '#854d0e', padding: '10px 24px', borderRadius: 12, fontWeight: 600, fontSize: 14, textDecoration: 'none', border: '1px solid #fde047', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                ⚠️ Reconnexion dans {joursRestants}j
              </a>
            )
          )}

          <a href="/baux/nouveau" style={{ background: estPayant ? '#2563eb' : '#9ca3af', color: 'white', padding: '10px 20px', borderRadius: 12, fontWeight: 600, fontSize: 14, textDecoration: 'none', cursor: estPayant ? 'pointer' : 'not-allowed' }}
            onClick={e => { if (!estPayant) e.preventDefault(); }}>
            + Ajouter un bail
          </a>
        </div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#6b7280', fontSize: 13 }}>Loyers du mois</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginTop: 4 }}>{totalLoyers.toLocaleString()}€</p>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#6b7280', fontSize: 13 }}>Baux actifs</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>{baux.length}</p>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#6b7280', fontSize: 13 }}>Biens sans bail</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#ea580c', marginTop: 4 }}>{biensSansBail}</p>
          </div>
        </div>

        {/* LISTE BAUX */}
        {loading ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Chargement...</p>
        ) : baux.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 20, border: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 40, marginBottom: 16 }}>📋</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>Aucun bail actif</p>
            <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
              {biens.length === 0 ? 'Commencez par ajouter un bien' : 'Cliquez sur "+ Ajouter un bail"'}
            </p>
            <a href={biens.length === 0 ? '/biens' : '/baux/nouveau'} style={{ display: 'inline-block', marginTop: 20, background: '#2563eb', color: 'white', padding: '10px 24px', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
              {biens.length === 0 ? '→ Mes Biens' : '+ Ajouter un bail'}
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
            {baux.map(bail => {
              const statut = statutLoyer(bail);
              const nbNonLus = nonLusParBail[bail.id] || 0;
              return (
                <div key={bail.id} style={{ background: 'white', borderRadius: 20, border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{bail.type_bail}</span>
                      <h3 style={{ fontWeight: 600, color: '#111827', fontSize: 14, marginTop: 4 }}>{bail.bien?.nom || 'Bien inconnu'}</h3>
                      <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{bail.bien?.adresse || ''}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999 }}>✓ Actif</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: statut.bg, padding: '4px 10px', borderRadius: 999 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: statut.couleur, boxShadow: `0 0 6px ${statut.couleur}` }}></div>
                        <span style={{ color: statut.couleur, fontSize: 11, fontWeight: 600 }}>{statut.texte}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid #f9fafb', borderBottom: '1px solid #f9fafb', margin: '12px 0' }}>
                    <div>
                      <p style={{ fontSize: 11, color: '#9ca3af' }}>Loyer HC</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginTop: 2 }}>{bail.loyer_hc}€</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: '#9ca3af' }}>Charges</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginTop: 2 }}>{bail.charges}€</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: '#9ca3af' }}>Total</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: '#2563eb', marginTop: 2 }}>{(bail.loyer_hc || 0) + (bail.charges || 0)}€</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    {/* BOUTON VOIR LE BAIL avec badge messages non lus */}
                    <a href={`/baux/${bail.id}`} style={{ flex: 1, position: 'relative', background: '#eff6ff', color: '#2563eb', padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                      Voir le bail
                      {nbNonLus > 0 && (
                        <span style={{ position: 'absolute', top: -6, right: -6, background: '#dc2626', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {nbNonLus}
                        </span>
                      )}
                    </a>
                    <a href="/documents/quittance" style={{ flex: 1, background: '#f0fdf4', color: '#16a34a', padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                      Quittance
                    </a>
                    <button onClick={() => togglePaiement(bail)}
                      style={{ flex: 1, background: paiementsMois.some(p => p.bail_id === bail.id) ? '#fef2f2' : '#f0fdf4', color: paiementsMois.some(p => p.bail_id === bail.id) ? '#dc2626' : '#16a34a', padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                      {paiementsMois.some(p => p.bail_id === bail.id) ? '❌ Annuler' : '✅ Marquer payé'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
