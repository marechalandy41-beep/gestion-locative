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
  const [nonLusParBail, setNonLusParBail] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [historiquePaiements, setHistoriquePaiements] = useState([]);
  const [bauxEnFin, setBauxEnFin] = useState([]);
  const [ongletActif, setOngletActif] = useState('overview');
  const [anneeFiscale, setAnneeFiscale] = useState(new Date().getFullYear());
  const [paiementsFiscal, setPaiementsFiscal] = useState([]);
  const [chargesFiscal, setChargesFiscal] = useState([]);
  const [loadingFiscal, setLoadingFiscal] = useState(false);
  const [bauxFiscal, setBauxFiscal] = useState([]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) { setUser(data.user); chargerDonnees(data.user.id); }
      else { window.location.href = '/auth'; }
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
    const { data: customerData } = await supabase.from('customers').select('plan').eq('user_id', userId).single();
    if (customerData?.plan) setPlan(customerData.plan);
    if (!customerData?.plan || customerData.plan === 'gratuit') { window.location.href = '/biens'; return; }
    const { data: biensData } = await supabase.from('Biens').select('*').eq('user_id', userId);
    const { data: bauxData } = await supabase.from('Baux').select('*, bien:bien_id(id, nom, adresse, type)').eq('user_id', userId).eq('statut', 'actif');
    const moisActuel = new Date().getMonth() + 1;
    const anneeActuelle = new Date().getFullYear();
    const { data: paiementsData } = await supabase.from('paiements').select('bail_id').eq('user_id', userId).eq('mois', moisActuel).eq('annee', anneeActuelle);
    setBiens(biensData || []);
    setBaux(bauxData || []);
    setPaiementsMois(paiementsData || []);

    // Historique 6 derniers mois
    const debut6Mois = new Date()
    debut6Mois.setMonth(debut6Mois.getMonth() - 5)
    const { data: historiqueData } = await supabase
      .from('paiements')
      .select('montant, mois, annee')
      .eq('user_id', userId)
      .eq('statut', 'valide')
      .gte('annee', debut6Mois.getFullYear())
      .order('annee', { ascending: true })
      .order('mois', { ascending: true })
    setHistoriquePaiements(historiqueData || [])

    // Baux qui arrivent à échéance dans les 60 jours
    const dans60jours = new Date()
    dans60jours.setDate(dans60jours.getDate() + 60)
    const bauxFin = (bauxData || []).filter(b => {
      if (!b.date_fin) return false
      const fin = new Date(b.date_fin)
      return fin <= dans60jours && fin >= new Date()
    })
    setBauxEnFin(bauxFin)

    setLoading(false);
    if (bauxData && bauxData.length > 0) chargerNonLus(bauxData.map(b => b.id));
  }

  async function chargerNonLus(bailIds) {
    const { data } = await supabase.from('messages_locataires').select('bail_id').in('bail_id', bailIds).eq('expediteur', 'locataire').eq('lu', false);
    if (!data) return;
    const compteur = {};
    data.forEach(m => { compteur[m.bail_id] = (compteur[m.bail_id] || 0) + 1; });
    setNonLusParBail(compteur);
  }

  // Calculs fiscaux
  const totalLoyersPercus = paiementsFiscal.reduce((a, p) => a + (parseFloat(p.montant) || 0), 0);
  const totalChargesDeductibles = chargesFiscal.reduce((a, c) =>
    a + (parseFloat(c.taxe_fonciere) || 0)
      + (parseFloat(c.assurance) || 0)
      + (parseFloat(c.travaux) || 0)
      + (parseFloat(c.frais_gestion) || 0)
      + (parseFloat(c.interets_emprunt) || 0)
      + (parseFloat(c.autres) || 0), 0);
  const revenuNet = totalLoyersPercus - totalChargesDeductibles;

  // Détail par bien
  
  const detailParBien = biens.map(bien => {
    const bauxDuBien = bauxFiscal.filter(b => b.bien_id === bien.id).map(b => b.id);
    // fallback : certains paiements peuvent ne pas matcher un bail actif, on somme par bail rattaché au bien
    const loyersBien = paiementsFiscal
      .filter(p => bauxDuBien.includes(p.bail_id))
      .reduce((a, p) => a + (parseFloat(p.montant) || 0), 0);
    const c = chargesFiscal.find(ch => ch.bien_id === bien.id);
    const chargesBien = c
      ? (parseFloat(c.taxe_fonciere) || 0) + (parseFloat(c.assurance) || 0) + (parseFloat(c.travaux) || 0)
        + (parseFloat(c.frais_gestion) || 0) + (parseFloat(c.interets_emprunt) || 0) + (parseFloat(c.autres) || 0)
      : 0;
    return { bien, loyers: loyersBien, charges: chargesBien, net: loyersBien - chargesBien };
  }).filter(d => d.loyers > 0 || d.charges > 0);

  const anneesDispo = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  async function chargerFiscal(userId, annee) {
    setLoadingFiscal(true);
    const { data: paiementsData } = await supabase
      .from('paiements')
      .select('montant, bail_id, statut')
      .eq('user_id', userId)
      .eq('annee', annee)
      .in('statut', ['valide', 'paye'])
      .gt('montant', 0);
    const { data: chargesData } = await supabase
      .from('charges_fiscales')
      .select('*')
      .eq('user_id', userId)
      .eq('annee', annee);
    const { data: bauxFiscalData } = await supabase
      .from('Baux')
      .select('id, bien_id')
      .eq('user_id', userId);
    setPaiementsFiscal(paiementsData || []);
    setChargesFiscal(chargesData || []);
    setBauxFiscal(bauxFiscalData || []);
    setLoadingFiscal(false);
  }

  useEffect(() => {
    if (user?.id && ongletActif === 'fiscal') {
      chargerFiscal(user.id, anneeFiscale);
    }
  }, [user, ongletActif, anneeFiscale]);

  const totalLoyers = baux.reduce((a, b) => a + (b.loyer_hc || 0) + (b.charges || 0), 0);
  const biensSansBail = Math.max(0, biens.length - baux.length);
  const estPayant = plan !== 'gratuit';
  const estAuto = plan === 'automatique';
  const bauxAttendusCeMois = baux.filter(b => loyerAttenduCeMois(b));
  const idsBauxAttendus = new Set(bauxAttendusCeMois.map(b => b.id));
  const paiementsBauxAttendus = paiementsMois.filter(p => idsBauxAttendus.has(p.bail_id));
  const bauxPayesCeMois = new Set(paiementsBauxAttendus.map(p => p.bail_id)).size;
  const tauxPaiement = bauxAttendusCeMois.length > 0 ? Math.min(100, Math.round((bauxPayesCeMois / bauxAttendusCeMois.length) * 100)) : 0;

  const moisLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  const derniers6Mois = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return { mois: d.getMonth() + 1, annee: d.getFullYear(), label: moisLabels[d.getMonth()] }
  })
  const dataGraphique = derniers6Mois.map(m => ({
    label: m.label,
    total: historiquePaiements
      .filter(p => p.mois === m.mois && p.annee === m.annee)
      .reduce((acc, p) => acc + (p.montant || 0), 0)
  }))
  const maxGraphique = Math.max(...dataGraphique.map(d => d.total), 1)
  // Un bail trimestriel n'est attendu qu'au mois de début puis tous les 3 mois
  function loyerAttenduCeMois(bail) {
    if (bail.periodicite !== 'trimestriel') return true; // mensuel = attendu chaque mois
    if (!bail.date_debut) return true; // sécurité : si pas de date, on considère attendu
    const moisDebut = new Date(bail.date_debut).getMonth(); // 0-11
    const moisActuel = new Date().getMonth(); // 0-11
    return (((moisActuel - moisDebut) % 3) + 3) % 3 === 0;
  }

  function statutLoyer(bail) {
    const jour = new Date().getDate();
    if (!loyerAttenduCeMois(bail)) return { couleur: '#6b7280', bg: '#f3f4f6', texte: '— Trimestriel' };
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
      await supabase.from('paiements').delete().eq('bail_id', bail.id).eq('mois', moisActuel).eq('annee', anneeActuelle).eq('user_id', user.id);
      setPaiementsMois(prev => prev.filter(p => p.bail_id !== bail.id));
    } else {
      const { data } = await supabase.from('paiements').insert({
        bail_id: bail.id, user_id: user.id, montant: (bail.loyer_hc || 0) + (bail.charges || 0),
        mois: moisActuel, annee: anneeActuelle, date_paiement: new Date().toISOString().split('T')[0],
        source: 'manuel', statut: 'valide', libelle_virement: 'Paiement manuel',
      }).select().single();
      if (data) setPaiementsMois(prev => [...prev, { bail_id: bail.id }]);
    }
  }

  const boutonBanque = estAuto && (
    joursRestants === null ? (
      <a href="/connexion-bancaire" style={{ background: '#f0fdf4', color: '#16a34a', padding: '10px 16px', borderRadius: 12, fontWeight: 600, fontSize: 13, textDecoration: 'none', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        🏦 Connecter ma banque
      </a>
    ) : joursRestants > 10 ? (
      <a href="/connexion-bancaire" style={{ background: '#f0fdf4', color: '#16a34a', padding: '10px 16px', borderRadius: 12, fontWeight: 600, fontSize: 13, border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        🏦 Banque connectée — {joursRestants}j
      </a>
    ) : (
      <a href="/connexion-bancaire" style={{ background: '#fef9c3', color: '#854d0e', padding: '10px 16px', borderRadius: 12, fontWeight: 600, fontSize: 13, textDecoration: 'none', border: '1px solid #fde047', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        ⚠️ Reconnexion dans {joursRestants}j
      </a>
    )
  );

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Nav pageCourante="dashboard" />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '24px 16px' : '32px 24px' }}>

{/* ONGLETS */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
          <button onClick={() => setOngletActif('overview')}
            style={{ background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              color: ongletActif === 'overview' ? '#2563eb' : '#6b7280',
              borderBottom: ongletActif === 'overview' ? '2px solid #2563eb' : '2px solid transparent', marginBottom: -1 }}>
            📊 Vue d'ensemble
          </button>
          <button onClick={() => setOngletActif('fiscal')}
            style={{ background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              color: ongletActif === 'fiscal' ? '#2563eb' : '#6b7280',
              borderBottom: ongletActif === 'fiscal' ? '2px solid #2563eb' : '2px solid transparent', marginBottom: -1 }}>
            💰 Bilan fiscal
          </button>
        </div>

        {ongletActif === 'overview' && (<>

        {/* EN-TÊTE */}
        {isMobile ? (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>
                  Bonjour {user?.user_metadata?.prenom || user?.email?.split('@')[0]} 👋
                </h2>
                <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>{baux.length} bail{baux.length > 1 ? 's' : ''} actif{baux.length > 1 ? 's' : ''}</p>
              </div>
              <a href="/baux/nouveau" style={{ background: estPayant ? '#2563eb' : '#9ca3af', color: 'white', padding: '8px 12px', borderRadius: 10, fontWeight: 600, fontSize: 12, textDecoration: 'none', textAlign: 'center', whiteSpace: 'nowrap' }}
                onClick={e => { if (!estPayant) e.preventDefault(); }}>
                + Ajouter
              </a>
            </div>
            {estAuto && <div style={{ width: '100%' }}>{boutonBanque}</div>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginBottom: 24, gap: 16 }}>
            {/* Gauche - titre */}
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
                Bonjour {user?.user_metadata?.prenom || user?.email?.split('@')[0]} 👋
              </h2>
              <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>{baux.length} bail{baux.length > 1 ? 's' : ''} actif{baux.length > 1 ? 's' : ''}</p>
            </div>
            {/* Centre - bouton banque */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {boutonBanque}
            </div>
            {/* Droite - bouton ajouter */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <a href="/baux/nouveau" style={{ background: estPayant ? '#2563eb' : '#9ca3af', color: 'white', padding: '10px 20px', borderRadius: 12, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}
                onClick={e => { if (!estPayant) e.preventDefault(); }}>
                + Ajouter un bail
              </a>
            </div>
          </div>
        )}

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: isMobile ? 10 : 16, marginBottom: 24 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: isMobile ? 14 : 20, border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#6b7280', fontSize: isMobile ? 11 : 13 }}>Loyers du mois</p>
            <p style={{ fontSize: isMobile ? 18 : 28, fontWeight: 700, color: '#111827', marginTop: 4 }}>{totalLoyers.toLocaleString()}€</p>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: isMobile ? 14 : 20, border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#6b7280', fontSize: isMobile ? 11 : 13 }}>Baux actifs</p>
            <p style={{ fontSize: isMobile ? 18 : 28, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>{baux.length}</p>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: isMobile ? 14 : 20, border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#6b7280', fontSize: isMobile ? 11 : 13 }}>Biens sans bail</p>
            <p style={{ fontSize: isMobile ? 18 : 28, fontWeight: 700, color: '#ea580c', marginTop: 4 }}>{biensSansBail}</p>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: isMobile ? 14 : 20, border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#6b7280', fontSize: isMobile ? 11 : 13 }}>Taux de paiement</p>
            <p style={{ fontSize: isMobile ? 18 : 28, fontWeight: 700, color: tauxPaiement === 100 ? '#16a34a' : tauxPaiement > 50 ? '#ca8a04' : '#dc2626', marginTop: 4 }}>{tauxPaiement}%</p>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{bauxPayesCeMois}/{bauxAttendusCeMois.length} reçus</p>
          </div>
        </div>

        {/* GRAPHIQUE + ALERTES */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 20, marginBottom: 24 }}>

          {/* GRAPHIQUE 6 MOIS */}
          <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>📈 Loyers encaissés — 6 derniers mois</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
              {dataGraphique.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{d.total > 0 ? `${d.total}€` : ''}</span>
                  <div style={{ width: '100%', background: i === 5 ? '#2563eb' : '#bfdbfe', borderRadius: '4px 4px 0 0', height: `${Math.max(4, (d.total / maxGraphique) * 100)}px`, transition: 'height 0.3s' }} />
                  <span style={{ fontSize: 11, color: i === 5 ? '#2563eb' : '#9ca3af', fontWeight: i === 5 ? 700 : 400 }}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ALERTES BAUX EN FIN */}
          <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>⚠️ Échéances proches</h3>
            {bauxEnFin.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: 28, marginBottom: 8 }}>✅</p>
                <p style={{ color: '#9ca3af', fontSize: 13 }}>Aucune échéance dans les 60 jours</p>
              </div>
            ) : bauxEnFin.map(bail => {
              const fin = new Date(bail.date_fin)
              const jours = Math.ceil((fin - new Date()) / (1000 * 60 * 60 * 24))
              return (
                <div key={bail.id} style={{ background: jours <= 30 ? '#fef2f2' : '#fef9c3', borderRadius: 10, padding: 12, marginBottom: 8, border: `1px solid ${jours <= 30 ? '#fecaca' : '#fde047'}` }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>{bail.bien?.nom}</p>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px' }}>{bail.locataire_prenom} {bail.locataire_nom}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: jours <= 30 ? '#dc2626' : '#ca8a04', margin: 0 }}>
                    ⏳ Dans {jours} jour{jours > 1 ? 's' : ''} — {fin.toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )
            })}
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
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: isMobile ? 16 : 24 }}>
            {baux.map(bail => {
              const statut = statutLoyer(bail);
              const nbNonLus = nonLusParBail[bail.id] || 0;
              return (
                <div key={bail.id} style={{ background: 'white', borderRadius: 20, border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: isMobile ? 18 : 24 }}>
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
                      style={{ flex: 1, background: paiementsMois.some(p => p.bail_id === bail.id) ? '#fef2f2' : '#f0fdf4', color: paiementsMois.some(p => p.bail_id === bail.id) ? '#dc2626' : '#16a34a', padding: '8px', borderRadius: 8, fontSize: isMobile ? 11 : 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                      {paiementsMois.some(p => p.bail_id === bail.id) ? '❌ Annuler' : '✅ Marquer payé'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>)}

        {/* ONGLET FISCAL */}
        {ongletActif === 'fiscal' && (
          <div>
            {/* Sélecteur d'année */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Année fiscale :</label>
              <select value={anneeFiscale} onChange={e => setAnneeFiscale(parseInt(e.target.value))}
                style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, fontWeight: 600, color: '#111827', background: 'white', cursor: 'pointer' }}>
                {anneesDispo.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {loadingFiscal ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Calcul en cours...</p>
            ) : (
              <>
                {/* 3 cartes de synthèse */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                  <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Loyers perçus {anneeFiscale}</p>
                    <p style={{ fontSize: 30, fontWeight: 700, color: '#16a34a', marginTop: 8 }}>{totalLoyersPercus.toLocaleString('fr-FR')}€</p>
                  </div>
                  <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Charges déductibles</p>
                    <p style={{ fontSize: 30, fontWeight: 700, color: '#ea580c', marginTop: 8 }}>{totalChargesDeductibles.toLocaleString('fr-FR')}€</p>
                  </div>
                  <div style={{ background: revenuNet >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: 16, padding: 24, border: `1px solid ${revenuNet >= 0 ? '#bbf7d0' : '#fecaca'}` }}>
                    <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Revenu foncier net</p>
                    <p style={{ fontSize: 30, fontWeight: 700, color: revenuNet >= 0 ? '#16a34a' : '#dc2626', marginTop: 8 }}>{revenuNet.toLocaleString('fr-FR')}€</p>
                  </div>
                </div>

                {/* Détail par bien */}
                <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>🏠 Détail par bien</h3>
                  {detailParBien.length === 0 ? (
                    <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>Aucune donnée pour {anneeFiscale}.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>BIEN</th>
                            <th style={{ textAlign: 'right', padding: '8px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>LOYERS</th>
                            <th style={{ textAlign: 'right', padding: '8px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>CHARGES</th>
                            <th style={{ textAlign: 'right', padding: '8px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>NET</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailParBien.map(d => (
                            <tr key={d.bien.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                              <td style={{ padding: '12px', color: '#111827', fontWeight: 600 }}>{d.bien.nom}</td>
                              <td style={{ padding: '12px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{d.loyers.toLocaleString('fr-FR')}€</td>
                              <td style={{ padding: '12px', textAlign: 'right', color: '#ea580c', fontWeight: 600 }}>{d.charges.toLocaleString('fr-FR')}€</td>
                              <td style={{ padding: '12px', textAlign: 'right', color: d.net >= 0 ? '#111827' : '#dc2626', fontWeight: 700 }}>{d.net.toLocaleString('fr-FR')}€</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div style={{ background: '#eff6ff', borderRadius: 12, padding: 16, border: '1px solid #bfdbfe' }}>
                  <p style={{ fontSize: 13, color: '#1e40af', margin: 0 }}>
                    ℹ️ Les charges déductibles proviennent de votre récap fiscal. Pour les modifier, rendez-vous dans <a href="/documents/recap-fiscal" style={{ color: '#2563eb', fontWeight: 600 }}>Récap fiscal</a>. Ces chiffres sont indicatifs et ne constituent pas un conseil fiscal.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
