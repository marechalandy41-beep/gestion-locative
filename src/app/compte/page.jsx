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
  const [codeParrainage, setCodeParrainage] = useState('')
  const [mesMessages, setMesMessages] = useState([])
  const [portalLoading, setPortalLoading] = useState(false)
  const [planActuel, setPlanActuel] = useState('gratuit')
  const [planSelectionne, setPlanSelectionne] = useState(null)
  const [changementLoading, setChangementLoading] = useState(false)
  const [prixManuel, setPrixManuel] = useState('4')
  const [prixAutomatique, setPrixAutomatique] = useState('6')
  const [priceIdManuel, setPriceIdManuel] = useState('price_1TkNf95LCX9emtMyBEftu67t')
  const [priceIdAutomatique, setPriceIdAutomatique] = useState('price_1TkNdU5LCX9emtMyGZ3X1hwy')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        setUser(data.user);
        setPrenom(data.user.user_metadata?.prenom || '');
        setNom(data.user.user_metadata?.nom || '');
        setTelephone(data.user.user_metadata?.telephone || '');

        const { data: customerData } = await supabase
          .from('customers')
          .select('code_promo, reduction, code_parrainage, plan')
          .eq('user_id', data.user.id)
          .single();

        if (customerData?.plan) {
          setPlanActuel(customerData.plan)
        }

        // Charge les prix et price_id dynamiques depuis settings
        const { data: settingsData } = await supabase
          .from('settings')
          .select('cle, valeur')
          .in('cle', ['prix_manuel', 'prix_auto', 'price_id_manuel', 'price_id_auto'])

        if (settingsData) {
          const prixManuelSetting = settingsData.find(s => s.cle === 'prix_manuel')
          const prixAutoSetting = settingsData.find(s => s.cle === 'prix_auto')
          const priceIdManuelSetting = settingsData.find(s => s.cle === 'price_id_manuel')
          const priceIdAutoSetting = settingsData.find(s => s.cle === 'price_id_auto')
          if (prixManuelSetting) setPrixManuel(prixManuelSetting.valeur)
          if (prixAutoSetting) setPrixAutomatique(prixAutoSetting.valeur)
          if (priceIdManuelSetting) setPriceIdManuel(priceIdManuelSetting.valeur)
          if (priceIdAutoSetting) setPriceIdAutomatique(priceIdAutoSetting.valeur)
        }

        if (customerData?.code_promo) {
          const { data: codeData } = await supabase
            .from('codes_promo')
            .select('expire_le, actif')
            .eq('code', customerData.code_promo)
            .single()

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
        if (customerData?.code_parrainage) {
          setCodeParrainage(customerData.code_parrainage)
        }

        // Charger les messages de contact
        const { data: msgs } = await supabase
          .from('contacts')
          .select('*')
          .eq('user_id', data.user.id)
          .order('created_at', { ascending: false })
        setMesMessages(msgs || [])

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

  async function gererAbonnement() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Erreur : ' + (data.error || 'Impossible d\'ouvrir le portail de gestion.'))
        setPortalLoading(false)
      }
    } catch (err) {
      alert('Erreur : ' + err.message)
      setPortalLoading(false)
    }
  }

  const PLANS = [
    { id: 'gratuit', nom: 'Gratuit', prix: '0€', description: 'Quittances manuelles, 50 Mo de stockage', priceId: null },
    { id: 'manuel', nom: 'Manuel', prix: `${prixManuel}€`, description: 'Baux, états des lieux, coffre-fort complet', priceId: priceIdManuel },
    { id: 'automatique', nom: 'Automatique', prix: `${prixAutomatique}€`, description: 'Connexion bancaire, quittances et relances automatiques', priceId: priceIdAutomatique },
  ]

  async function confirmerChangementPlan() {
    if (!planSelectionne || planSelectionne === planActuel) return
    setChangementLoading(true)

    const planChoisi = PLANS.find(p => p.id === planSelectionne)
    const aUnAbonnementPayantActif = planActuel === 'manuel' || planActuel === 'automatique'

    try {
      if (planChoisi.id === 'gratuit') {
        // Downgrade vers gratuit → annulation complète
        const res = await fetch('/api/cancel-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        })
        const data = await res.json()
        if (data.success) {
          setPlanActuel('gratuit')
          setPlanSelectionne(null)
          setMessage('Vous êtes repassé en plan Gratuit.')
          setTimeout(() => setMessage(''), 4000)
        } else {
          alert('Erreur : ' + (data.error || 'Impossible de changer de plan.'))
        }
      } else if (aUnAbonnementPayantActif) {
        // Changement entre 2 plans payants → modification directe de l'abonnement existant
        const res = await fetch('/api/update-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, newPriceId: planChoisi.priceId }),
        })
        const data = await res.json()
        if (data.success) {
          setPlanActuel(planChoisi.id)
          setPlanSelectionne(null)
          setMessage(`Vous êtes passé au plan ${planChoisi.nom}.`)
          setTimeout(() => setMessage(''), 4000)
        } else {
          alert('Erreur : ' + (data.error || 'Impossible de changer de plan.'))
        }
      } else {
        // Upgrade depuis Gratuit → paiement Stripe classique
        const res = await fetch('/api/create-customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            name: prenom + ' ' + nom,
            userId: user.id,
          }),
        })
        const data1 = await res.json()
        const { customerId } = data1

        const res2 = await fetch('/api/create-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId, priceId: planChoisi.priceId }),
        })
        const data2 = await res2.json()
        if (data2.url) {
          window.location.href = data2.url
        } else {
          alert('Erreur : ' + (data2.error || 'Impossible de lancer le paiement.'))
        }
      }
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
    setChangementLoading(false)
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
            { id: 'messages', label: `📬 Mes demandes${mesMessages.length > 0 ? ` (${mesMessages.length})` : ''}` },
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

            <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f3f4f6', padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>💳 Mon abonnement</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>Gérez votre abonnement — facture, moyen de paiement, résiliation.</p>
              <button onClick={gererAbonnement} disabled={portalLoading}
                style={{ background: portalLoading ? '#93c5fd' : '#2563eb', color: 'white', padding: '10px 24px', borderRadius: 10, border: 'none', cursor: portalLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14, marginBottom: 28 }}>
                {portalLoading ? 'Ouverture...' : '⚙️ Gérer mon abonnement'}
              </button>

              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 14 }}>Changer de plan</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                {PLANS.map(p => {
                  const estActuel = p.id === planActuel
                  const estSelectionne = p.id === planSelectionne
                  return (
                    <div key={p.id} onClick={() => setPlanSelectionne(p.id)}
                      style={{
                        position: 'relative',
                        border: estSelectionne ? '2px solid #2563eb' : '2px solid #e5e7eb',
                        borderRadius: 14, padding: 18, cursor: 'pointer',
                        background: estSelectionne ? '#eff6ff' : 'white',
                        transition: 'all 0.15s'
                      }}>
                      {estActuel && (
                        <span style={{ position: 'absolute', top: -10, right: 12, background: '#16a34a', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                          Plan actuel
                        </span>
                      )}
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>{p.nom}</p>
                      <p style={{ fontSize: 22, fontWeight: 800, color: '#2563eb', margin: '0 0 8px' }}>{p.prix}<span style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af' }}>{p.id !== 'gratuit' ? '/bail' : ''}</span></p>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>{p.description}</p>
                    </div>
                  )
                })}
              </div>

              {planSelectionne && planSelectionne !== planActuel && (
                <button onClick={confirmerChangementPlan} disabled={changementLoading}
                  style={{ background: changementLoading ? '#93c5fd' : '#16a34a', color: 'white', padding: '10px 24px', borderRadius: 10, border: 'none', cursor: changementLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14 }}>
                  {changementLoading ? 'Traitement...' : `✅ Confirmer le passage au plan ${PLANS.find(p => p.id === planSelectionne)?.nom}`}
                </button>
              )}
            </div>

            <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f3f4f6', padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>🤝 Parrainez un proche</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.6 }}>
                Partagez votre code et obtenez <strong>-5%</strong> sur votre abonnement pour chaque filleul qui s'abonne !
              </p>
              <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px' }}>Votre code parrainage</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#2563eb', letterSpacing: 2, margin: 0 }}>{codeParrainage || '—'}</p>
                </div>
                <button onClick={() => {
                  navigator.clipboard.writeText(codeParrainage)
                  alert('Code copié !')
                }}
                  style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  📋 Copier
                </button>
              </div>
            </div>

            {codeExpire && (
              <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 12, padding: 14 }}>
                <p style={{ fontSize: 13, color: '#854d0e', margin: 0, fontWeight: 500 }}>
                  ⚠️ Votre code promo a expiré. Vous pouvez en saisir un nouveau ci-dessous.
                </p>
              </div>
            )}

            {codeActuel && !codeExpire && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#15803d', marginBottom: 8 }}>🎟️ Code promo actif</h3>
                <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>
                  Code <strong>{codeActuel}</strong> — Réduction de <strong>{reductionActuelle}%</strong> sur votre abonnement
                </p>
              </div>
            )}

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

        {/* ONGLET MES MESSAGES */}
        {onglet === 'messages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f3f4f6', padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>📬 Mes demandes de support</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Retrouvez ici tous vos messages envoyés au support.</p>

              {mesMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <p style={{ color: '#9ca3af', fontSize: 14 }}>Aucune demande envoyée pour l'instant.</p>
                  <a href="/contact" style={{ display: 'inline-block', marginTop: 12, background: '#2563eb', color: 'white', padding: '10px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                    Contacter le support →
                  </a>
                </div>
              ) : mesMessages.map((m) => (
                <div key={m.id} style={{ background: '#f9fafb', borderRadius: 12, padding: 20, marginBottom: 12, border: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{
                      background: m.statut === 'non_lu' ? '#eff6ff' : '#f0fdf4',
                      color: m.statut === 'non_lu' ? '#2563eb' : '#15803d',
                      padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600
                    }}>
                      {m.statut === 'non_lu' ? '⏳ En attente' : m.statut === 'lu' ? '👀 Lu' : '✅ Traité'}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: 12 }}>
                      {new Date(m.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  {m.sujet && <p style={{ fontWeight: 600, color: '#111827', fontSize: 14, margin: '0 0 6px' }}>{m.sujet}</p>}
                  <p style={{ color: '#374151', fontSize: 13, margin: 0, whiteSpace: 'pre-wrap' }}>{m.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
