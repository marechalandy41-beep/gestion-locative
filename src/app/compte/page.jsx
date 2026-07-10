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
 const [conversations, setConversations] = useState([])
  const [conversationActive, setConversationActive] = useState(null)
  const [messagesConversation, setMessagesConversation] = useState([])
  const [nouveauMessage, setNouveauMessage] = useState('')
  const [envoiMessageLoading, setEnvoiMessageLoading] = useState(false)
 const [nouveauSujet, setNouveauSujet] = useState('')
  const [messagesNonLus, setMessagesNonLus] = useState(0)
  const [conversationsNonLues, setConversationsNonLues] = useState([])
  const [categoriesSupport, setCategoriesSupport] = useState(['Problème technique', 'Facturation / Abonnement', 'Suggestion d\'amélioration', 'Question sur mon compte', 'Autre'])
  const [portalLoading, setPortalLoading] = useState(false)
  const [faqs, setFaqs] = useState([])
  const [faqOuvert, setFaqOuvert] = useState(null)
  const [pushActif, setPushActif] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [planActuel, setPlanActuel] = useState('gratuit')
  const [planSelectionne, setPlanSelectionne] = useState(null)
  const [changementLoading, setChangementLoading] = useState(false)
  const [prixManuel, setPrixManuel] = useState('4')
  const [prixAutomatique, setPrixAutomatique] = useState('6')
  const [priceIdManuel, setPriceIdManuel] = useState('price_1TkNf95LCX9emtMyBEftu67t')
  const [priceIdAutomatique, setPriceIdAutomatique] = useState('price_1TkNdU5LCX9emtMyGZ3X1hwy')
  const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const check = () => setIsMobile(window.innerWidth < 768);
  check();
  window.addEventListener('resize', check);
  return () => window.removeEventListener('resize', check);
}, []);

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
          .in('cle', ['prix_manuel', 'prix_auto', 'price_id_manuel', 'price_id_auto', 'categories_support', 'faq_dynamique'])

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

        const categoriesSetting = settingsData.find(s => s.cle === 'categories_support')
          if (categoriesSetting) {
            try { setCategoriesSupport(JSON.parse(categoriesSetting.valeur)) } catch {}
          }

        const faqSetting = settingsData.find(s => s.cle === 'faq_dynamique')
        if (faqSetting) {
          try { setFaqs(JSON.parse(faqSetting.valeur)) } catch {}
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

        // Charger les conversations
        const { data: convs } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', data.user.id)
          .order('derniere_activite', { ascending: false })
        setConversations(convs || [])

        // Compte les messages admin non lus par le client
        if (convs && convs.length > 0) {
          const { data: nonLus } = await supabase
            .from('messages')
            .select('conversation_id')
            .eq('expediteur', 'admin')
            .eq('lu_par_client', false)
            .in('conversation_id', convs.map(c => c.id))
          const idsNonLus = [...new Set((nonLus || []).map(m => m.conversation_id))]
          setConversationsNonLues(idsNonLus)
          setMessagesNonLus(idsNonLus.length)
        }

      } else {
        window.location.href = '/auth';
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!conversationActive) return
    const channel = supabase
      .channel(`conversation-${conversationActive.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationActive.id}` },
        (payload) => {
          setMessagesConversation(prev => [...prev, payload.new])
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationActive])
  
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

async function ouvrirConversation(conv) {
    setConversationActive(conv)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
    setMessagesConversation(data || [])

    // Marque les messages admin comme lus par le client
    await supabase
      .from('messages')
      .update({ lu_par_client: true })
      .eq('conversation_id', conv.id)
      .eq('expediteur', 'admin')

    // Retire cette conversation de la liste des non lues
    setConversationsNonLues(prev => prev.filter(id => id !== conv.id))
  }

  async function envoyerMessage() {
    if (!nouveauMessage.trim()) return
    setEnvoiMessageLoading(true)
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversationActive?.id || null,
          userId: user.id,
          expediteur: 'client',
          contenu: nouveauMessage.trim(),
          sujet: nouveauSujet || 'Nouvelle demande',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setNouveauMessage('')
        if (!conversationActive) {
          // Nouvelle conversation créée, recharge la liste
          const { data: convs } = await supabase
            .from('conversations')
            .select('*')
            .eq('user_id', user.id)
            .order('derniere_activite', { ascending: false })
          setConversations(convs || [])
          const nouvConv = convs.find(c => c.id === data.conversationId)
          if (nouvConv) ouvrirConversation(nouvConv)
        } else {
          ouvrirConversation(conversationActive)
        }
      } else {
        alert('Erreur : ' + data.error)
      }
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
    setEnvoiMessageLoading(false)
  }

async function activerPushNotifications() {
    setPushLoading(true)
    try {
      // Attendre que OneSignal soit prêt
      let tentatives = 0
      while ((!window.OneSignal || !window.OneSignal.Notifications) && tentatives < 10) {
        await new Promise(r => setTimeout(r, 500))
        tentatives++
      }
      if (!window.OneSignal || !window.OneSignal.Notifications) {
        alert('OneSignal non chargé. Rechargez la page et réessayez.')
        setPushLoading(false)
        return
      }
      const permission = await window.OneSignal.Notifications.requestPermission()
      if (permission) {
        setPushActif(true)
        alert('✅ Notifications push activées !')
      } else {
        alert('Permission refusée. Activez les notifications dans les paramètres de votre navigateur.')
      }
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
    setPushLoading(false)
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
        <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 32, width: '100%', overflowX: 'auto', flexWrap: 'nowrap' }}>
          {[
            { id: 'profil', label: '👤 Profil' },
            { id: 'securite', label: '🔒 Sécurité' },
            { id: 'abonnement', label: '💳 Abonnement' },
            { id: 'messages', label: `📬 Mes demandes${conversationsNonLues.length > 0 ? ` (${conversationsNonLues.length})` : ''}` },
            { id: 'faq', label: '❓ FAQ' },
            { id: 'installer', label: '📱 Installer l\'app' },
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
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={sauvegarderProfil} style={{ background: '#2563eb', color: 'white', padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                Sauvegarder
              </button>
              <button onClick={activerPushNotifications} disabled={pushLoading || pushActif}
                style={{ background: pushActif ? '#f0fdf4' : '#fef9c3', color: pushActif ? '#15803d' : '#92400e', border: `1px solid ${pushActif ? '#bbf7d0' : '#fde047'}`, padding: '10px 24px', borderRadius: 10, cursor: pushActif ? 'default' : 'pointer', fontWeight: 600, fontSize: 14 }}>
                {pushLoading ? '⏳...' : pushActif ? '✅ Notifications activées' : '🔔 Activer les notifications push'}
              </button>
            </div>
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
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16, height: isMobile ? 'auto' : 560}}>

            {/* LISTE DES CONVERSATIONS */}
            <div style={{ width: isMobile ? '100%' : 280, background: 'white', borderRadius: 20, border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: 16, borderBottom: '1px solid #f3f4f6' }}>
                <button onClick={() => { setConversationActive(null); setMessagesConversation([]); setNouveauSujet('') }}
                  style={{ width: '100%', background: '#2563eb', color: 'white', padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  + Nouvelle demande
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {conversations.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>Aucune conversation.</p>
                ) : conversations.map(c => {
                  const estNonLue = conversationsNonLues.includes(c.id)
                  return (
                    <div key={c.id} onClick={() => ouvrirConversation(c)}
                      style={{ padding: 14, borderBottom: '1px solid #f9fafb', cursor: 'pointer', background: conversationActive?.id === c.id ? '#eff6ff' : estNonLue ? '#fffbeb' : 'white', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      {estNonLue && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', marginTop: 5, flexShrink: 0 }} />}
                      <div>
                        <p style={{ fontSize: 13, fontWeight: estNonLue ? 700 : 600, color: '#111827', margin: '0 0 4px' }}>{c.sujet || 'Sans sujet'}</p>
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                          {c.statut === 'ferme' ? '✅ Fermé' : '🟢 Ouvert'} — {new Date(c.derniere_activite).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ZONE DE CHAT */}
            <div style={{ flex: 1, background: 'white', borderRadius: 20, border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {!conversationActive ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Nouvelle demande au support</p>
                  <select value={nouveauSujet} onChange={e => setNouveauSujet(e.target.value)}
                    style={{ ...inputStyle, marginBottom: 12 }}>
                    <option value="">— Choisir une catégorie —</option>
                    {categoriesSupport.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <textarea value={nouveauMessage} onChange={e => setNouveauMessage(e.target.value)} placeholder="Décrivez votre demande..." rows={5}
                    style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }} />
                  <button onClick={envoyerMessage} disabled={envoiMessageLoading || !nouveauMessage.trim()}
                    style={{ background: envoiMessageLoading ? '#93c5fd' : '#2563eb', color: 'white', padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, alignSelf: 'flex-start' }}>
                    {envoiMessageLoading ? 'Envoi...' : 'Envoyer →'}
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ padding: 16, borderBottom: '1px solid #f3f4f6' }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: '#111827', margin: 0 }}>{conversationActive.sujet}</p>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, minHeight: isMobile ? 300 : 'auto' }}>
                    {messagesConversation.map(m => (
                      <div key={m.id} style={{
                        alignSelf: m.expediteur === 'client' ? 'flex-end' : 'flex-start',
                        maxWidth: '75%',
                        background: m.expediteur === 'client' ? '#2563eb' : '#f3f4f6',
                        color: m.expediteur === 'client' ? 'white' : '#111827',
                        borderRadius: 14, padding: '10px 14px', fontSize: 13
                      }}>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.contenu}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 10, opacity: 0.7 }}>
                          {new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: 16, borderTop: '1px solid #f3f4f6', display: 'flex', gap: 8 }}>
                    <input value={nouveauMessage} onChange={e => setNouveauMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && envoyerMessage()}
                      placeholder="Votre message..." style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={envoyerMessage} disabled={envoiMessageLoading || !nouveauMessage.trim()}
                      style={{ background: '#2563eb', color: 'white', padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                      →
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      {/* ONGLET INSTALLER */}
        {onglet === 'installer' && (
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f3f4f6', padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>📱 Installer Ma Gestion-Locative sur votre téléphone</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 32px' }}>Accédez à l'application comme une vraie app mobile — sans passer par le navigateur.</p>

            {/* iOS */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, background: '#f3f4f6', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🍎</div>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>iPhone (iOS / Safari)</h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { num: '1', texte: 'Ouvrez magestion-locative.fr dans Safari (pas Chrome)' },
                  { num: '2', texte: 'Appuyez sur le bouton Partager en bas de l\'écran (carré avec une flèche vers le haut)' },
                  { num: '3', texte: 'Faites défiler et appuyez sur "Sur l\'écran d\'accueil"' },
                  { num: '4', texte: 'Appuyez sur "Ajouter" en haut à droite' },
                ].map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#2563eb', color: 'white', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{e.num}</div>
                    <p style={{ fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.5 }}>{e.texte}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Android */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, background: '#f3f4f6', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Android (Chrome)</h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { num: '1', texte: 'Ouvrez magestion-locative.fr dans Chrome' },
                  { num: '2', texte: 'Appuyez sur les 3 points en haut à droite' },
                  { num: '3', texte: 'Appuyez sur "Ajouter à l\'écran d\'accueil"' },
                  { num: '4', texte: 'Appuyez sur "Ajouter" pour confirmer' },
                ].map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#16a34a', color: 'white', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{e.num}</div>
                    <p style={{ fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.5 }}>{e.texte}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 13, color: '#2563eb', margin: 0 }}>
                💡 Une fois installée, l'app apparaît sur votre écran d'accueil comme une vraie application. Vous pouvez l'utiliser sans connexion internet pour consulter vos données.
              </p>
            </div>
          </div>
        )}

        {/* ONGLET FAQ */}
        {onglet === 'faq' && (
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f3f4f6', padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>❓ Questions fréquentes</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Retrouvez les réponses aux questions les plus courantes.</p>
            {faqs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <p style={{ color: '#9ca3af', fontSize: 14 }}>Aucune question disponible pour le moment.</p>
              </div>
            ) : faqs.map((faq, i) => (
              <div key={i} style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 16, marginBottom: 16 }}>
                <button onClick={() => setFaqOuvert(faqOuvert === i ? null : i)}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0, textAlign: 'left' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{faq.q}</span>
                  <span style={{ fontSize: 20, color: '#2563eb', flexShrink: 0, marginLeft: 16 }}>{faqOuvert === i ? '−' : '+'}</span>
                </button>
                {faqOuvert === i && (
                  <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.7, margin: '10px 0 0' }}>{faq.r}</p>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}