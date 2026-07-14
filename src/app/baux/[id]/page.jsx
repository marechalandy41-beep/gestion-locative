'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import Nav from '../../components/nav'

export default function DetailBail() {
  const id = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : null;
  const [bail, setBail] = useState(null);
  const [bien, setBien] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editContact, setEditContact] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newTel, setNewTel] = useState('');
  const [editPayeur, setEditPayeur] = useState(false);
  const [newPayeurPrenom, setNewPayeurPrenom] = useState('');
  const [newPayeurNom, setNewPayeurNom] = useState('');
  const [lotsLies, setLotsLies] = useState([]);
  const [sending, setSending] = useState(false);
  const [emailToast, setEmailToast] = useState(null);
  const [sendingRelance, setSendingRelance] = useState(false);
  const [relanceToast, setRelanceToast] = useState(null);
  const [sendingInvitation, setSendingInvitation] = useState(false);
  const [invitationToast, setInvitationToast] = useState(null);
  // ===== MESSAGERIE =====
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [ongletBail, setOngletBail] = useState('details');


  useEffect(() => {
    chargerBail();
  }, []);

  // Polling messages toutes les 5 secondes
  useEffect(() => {
  if (!bail) return;
  chargerMessages();
}, [bail]);

useEffect(() => {
  if (!bail) return;
  if (ongletBail !== 'messages') return;
  const interval = setInterval(chargerMessages, 5000);
  return () => clearInterval(interval);
}, [bail, ongletBail]);

  // ===== CHARGER MESSAGES =====
  async function chargerMessages() {
    const { data } = await supabase
      .from('messages_locataires')
      .select('*')
      .eq('bail_id', parseInt(id))
      .order('created_at', { ascending: true });
    setMessages(data || []);
  }

  async function marquerLus() {
    await supabase
      .from('messages_locataires')
      .update({ lu: true })
      .eq('bail_id', parseInt(id))
      .eq('expediteur', 'locataire')
      .eq('lu', false);
  }

  // ===== ENVOYER MESSAGE =====
  async function envoyerMessage() {
    if (!newMessage.trim()) return;
    setSendingMsg(true);
    await supabase.from('messages_locataires').insert({
      bail_id: parseInt(id),
      expediteur: 'proprio',
      contenu: newMessage.trim(),
    });
    setNewMessage('');
    await chargerMessages();
    setSendingMsg(false);
  }

  // ===== INVITATION PORTAIL =====
  async function envoyerInvitation() {
    if (!bail.locataire_email) { alert('Email du locataire manquant.'); return; }
    if (!confirm(`Envoyer l'invitation au portail locataire à ${bail.locataire_email} ?`)) return;
    setSendingInvitation(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch('/api/send-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bailId: bail.id,
          userId: user.id,
          locataireEmail: bail.locataire_email,
          locatairePrenom: bail.locataire_prenom,
          locataireNom: bail.locataire_nom,
          proprietaireNom: `${bail.bailleur_prenom} ${bail.bailleur_nom}`,
          bienNom: bien?.nom || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInvitationToast({ msg: '✅ Invitation envoyée au locataire !', succes: true });
      } else {
        setInvitationToast({ msg: '❌ Erreur : ' + data.error, succes: false });
      }
    } catch (err) {
      setInvitationToast({ msg: '❌ Erreur : ' + err.message, succes: false });
    } finally {
      setSendingInvitation(false);
      setTimeout(() => setInvitationToast(null), 4000);
    }
  }

  // ===== CHARGER BAIL =====
  async function chargerBail() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/auth'; return; }
    const { data, error } = await supabase
      .from('Baux')
      .select('*, Biens(*)')
      .eq('id', parseInt(id))
      .eq('user_id', user.id)
      .single();
    if (error || !data) { window.location.href = '/baux'; return; }
    setBail(data);
    setBien(data.Biens);
    const { data: lotsData } = await supabase.from('lots').select('*').eq('bail_id', parseInt(id));
    setLotsLies(lotsData || []);
    setLoading(false);
  }

  // ===== ENVOYER BAIL PAR EMAIL =====
  async function envoyerBail() {
    if (!bail.bail_pdf_url) { alert('Aucun PDF de bail disponible.'); return; }
    if (!bail.locataire_email) { alert('Email du locataire manquant.'); return; }
    if (!confirm(`Envoyer le bail par email à ${bail.locataire_email} ?`)) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch('/api/send-bail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bailPdfUrl: bail.bail_pdf_url,
          locataireEmail: bail.locataire_email,
          locataireNom: bail.locataire_nom,
          locatairePrenom: bail.locataire_prenom,
          proprietaireEmail: user.email,
          proprietaireNom: `${bail.bailleur_prenom} ${bail.bailleur_nom}`,
          bienNom: bien?.nom || '',
          loyer: (bail.loyer_hc || 0) + (bail.charges || 0),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailToast({ msg: '✅ Bail envoyé au locataire et à vous-même !', succes: true });
      } else {
        setEmailToast({ msg: '❌ Erreur : ' + data.error, succes: false });
      }
    } catch (err) {
      setEmailToast({ msg: '❌ Erreur : ' + err.message, succes: false });
    } finally {
      setSending(false);
      setTimeout(() => setEmailToast(null), 4000);
    }
  }

  // ===== CLOTURER BAIL =====
  async function cloturerBail() {
    if (!confirm('Confirmer la clôture de ce bail ? Il passera en statut "Terminé".')) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('Baux').update({ statut: 'termine' }).eq('id', bail.id);
    await supabase.from('lots').update({ statut: 'vacant', bail_id: null }).eq('bail_id', bail.id);
    fetch('/api/sync-quantity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    }).catch(err => console.error('Erreur sync quantity:', err));
    window.location.href = '/baux';
  }

  // ===== ENVOYER RELANCE =====
  async function envoyerRelance() {
    if (!bail.locataire_email) { alert('Email du locataire manquant.'); return; }
    if (!confirm(`Envoyer une relance de loyer à ${bail.locataire_email} ?`)) return;
    setSendingRelance(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const moisLabels = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
      const now = new Date();
      const res = await fetch('/api/send-relance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locataireEmail: bail.locataire_email,
          locatairePrenom: bail.locataire_prenom,
          locataireNom: bail.locataire_nom,
          proprietaireNom: `${bail.bailleur_prenom} ${bail.bailleur_nom}`,
          bienNom: bien?.nom || '',
          montant: (bail.loyer_hc || 0) + (bail.charges || 0),
          dateEcheance: bail.date_exigibilite || 1,
          mois: moisLabels[now.getMonth()],
          annee: now.getFullYear(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRelanceToast({ msg: '✅ Relance envoyée au locataire !', succes: true });
      } else {
        setRelanceToast({ msg: '❌ Erreur : ' + data.error, succes: false });
      }
    } catch (err) {
      setRelanceToast({ msg: '❌ Erreur : ' + err.message, succes: false });
    } finally {
      setSendingRelance(false);
      setTimeout(() => setRelanceToast(null), 4000);
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <p style={{ color: '#6b7280' }}>Chargement...</p>
    </div>
  );

  const statutStyle = {
    actif:     { bg: '#dcfce7', color: '#16a34a', label: 'Actif' },
    brouillon: { bg: '#fef9c3', color: '#ca8a04', label: 'Brouillon' },
    termine:   { bg: '#fee2e2', color: '#dc2626', label: 'Terminé' },
  }[bail?.statut] || { bg: '#f3f4f6', color: '#6b7280', label: bail?.statut };

  const section = (titre) => (
    <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8, marginBottom: 16, marginTop: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>{titre}</h3>
    </div>
  );

  const info = (label, valeur) => valeur ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontSize: 13, color: '#6b7280', minWidth: 160 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', textAlign: 'right', flex: 1 }}>{valeur}</span>
    </div>
  ) : null;

  // Nombre de messages non lus du locataire
  const nbNonLus = messages.filter(m => !m.lu && m.expediteur === 'locataire').length;

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Nav pageCourante="baux" />

      {/* ===== TOASTS ===== */}
      {emailToast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: emailToast.succes ? '#dcfce7' : '#fef2f2', color: emailToast.succes ? '#15803d' : '#dc2626', border: `1px solid ${emailToast.succes ? '#86efac' : '#fca5a5'}`, borderRadius: 12, padding: '14px 20px', fontWeight: 600, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {emailToast.msg}
        </div>
      )}
      {relanceToast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: relanceToast.succes ? '#dcfce7' : '#fef2f2', color: relanceToast.succes ? '#15803d' : '#dc2626', border: `1px solid ${relanceToast.succes ? '#86efac' : '#fca5a5'}`, borderRadius: 12, padding: '14px 20px', fontWeight: 600, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {relanceToast.msg}
        </div>
      )}
      {invitationToast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: invitationToast.succes ? '#dcfce7' : '#fef2f2', color: invitationToast.succes ? '#15803d' : '#dc2626', border: `1px solid ${invitationToast.succes ? '#86efac' : '#fca5a5'}`, borderRadius: 12, padding: '14px 20px', fontWeight: 600, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {invitationToast.msg}
        </div>
      )}

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

        {/* ===== HEADER ===== */}
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => window.location.href = '/baux'}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 16 }}>
            ← Retour aux baux
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>{bien?.nom || 'Bien inconnu'}</h1>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>{bien?.adresse}</p>
            </div>
            <span style={{ background: statutStyle.bg, color: statutStyle.color, padding: '4px 14px', borderRadius: 99, fontSize: 13, fontWeight: 700 }}>
              {statutStyle.label}
            </span>
          </div>
        </div>

        {/* ===== ONGLETS ===== */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[
            { id: 'details', label: '📄 Détails' },
            { id: 'messages', label: nbNonLus > 0 ? `💬 Messages 🔴 ${nbNonLus}` : '💬 Messages' },
          ].map(o => (
            <button key={o.id} onClick={() => { setOngletBail(o.id); if (o.id === 'messages') marquerLus(); }}
              style={{ background: ongletBail === o.id ? '#2563eb' : 'white', color: ongletBail === o.id ? 'white' : '#6b7280', border: '1px solid #e5e7eb', padding: '8px 20px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              {o.label}
            </button>
          ))}
        </div>

        {/* ===== ONGLET DÉTAILS ===== */}
        {ongletBail === 'details' && (
          <>
            <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}>

              {section('🏠 Bailleur')}
              {info(bail.bailleur_denomination ? 'Société' : 'Nom et prénom', bail.bailleur_denomination ? `${bail.bailleur_denomination}${bail.bailleur_forme_juridique ? ' (' + bail.bailleur_forme_juridique + ')' : ''}` : ([bail.bailleur_prenom, bail.bailleur_nom].filter(Boolean).join(' ') || null))}
              {info('Adresse', bail.bailleur_adresse)}
              {info('Date de naissance', bail.bailleur_naissance ? new Date(bail.bailleur_naissance).toLocaleDateString('fr-FR') : null)}
              {info('Lieu de naissance', bail.bailleur_lieu_naissance)}
              {info('Nationalité', bail.bailleur_nationalite)}

              {section('👤 Locataire')}
              {info(bail.locataire_denomination ? 'Société' : 'Nom et prénom', bail.locataire_denomination ? `${bail.locataire_denomination}${bail.locataire_forme_juridique ? ' (' + bail.locataire_forme_juridique + ')' : ''}` : ([bail.locataire_prenom, bail.locataire_nom].filter(Boolean).join(' ') || null))}
              {!editContact ? (
                <div>
                  {info('Email', bail.locataire_email)}
                  {info('Téléphone', bail.locataire_telephone)}
                  <button onClick={() => { setNewEmail(bail.locataire_email || ''); setNewTel(bail.locataire_telephone || ''); setEditContact(true); }}
                    style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
                    ✏️ Modifier les coordonnées
                  </button>
                </div>
              ) : (
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Email</label>
                    <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
                      style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Téléphone</label>
                    <input value={newTel} onChange={e => setNewTel(e.target.value)}
                      style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditContact(false)}
                      style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Annuler
                    </button>
                    <button onClick={async () => {
                      const { error } = await supabase.from('Baux').update({ locataire_email: newEmail, locataire_telephone: newTel }).eq('id', bail.id);
                      if (!error) { setBail({ ...bail, locataire_email: newEmail, locataire_telephone: newTel }); setEditContact(false); }
                      else { alert('Erreur : ' + error.message); }
                    }}
                      style={{ flex: 2, background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      ✅ Sauvegarder
                    </button>
                  </div>
                </div>
              )}
              {info('Date de naissance', bail.locataire_naissance ? new Date(bail.locataire_naissance).toLocaleDateString('fr-FR') : null)}
              {info('Nationalité', bail.locataire_nationalite)}
              {info('Profession', bail.locataire_profession)}
              {info('Adresse actuelle', bail.locataire_adresse)}

              {/* ===== PAYEUR ===== */}
              <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 10, padding: 14, marginTop: 12, marginBottom: 4 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#854d0e', margin: '0 0 8px' }}>💳 Payeur du loyer</p>
                {!editPayeur ? (
                  <div>
                    <p style={{ fontSize: 13, color: '#374151', margin: '0 0 8px' }}>
                      {bail.payeur_prenom || bail.payeur_nom
                        ? `${bail.payeur_prenom || ''} ${bail.payeur_nom || ''}`.trim()
                        : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Identique au locataire</span>}
                    </p>
                    <button onClick={() => { setNewPayeurPrenom(bail.payeur_prenom || ''); setNewPayeurNom(bail.payeur_nom || ''); setEditPayeur(true); }}
                      style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      ✏️ Modifier le payeur
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Prénom du payeur</label>
                        <input value={newPayeurPrenom} onChange={e => setNewPayeurPrenom(e.target.value)}
                          placeholder="Ex : Marie (mère du locataire)"
                          style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Nom du payeur</label>
                        <input value={newPayeurNom} onChange={e => setNewPayeurNom(e.target.value)}
                          placeholder="Ex : Dupont"
                          style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: '#92400e', margin: '0 0 8px' }}>ℹ️ Laissez vide si le locataire paie lui-même. Bridge recherchera ce nom dans le libellé du virement.</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setEditPayeur(false)}
                        style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Annuler
                      </button>
                      <button onClick={async () => {
                        const { error } = await supabase.from('Baux').update({ payeur_prenom: newPayeurPrenom || null, payeur_nom: newPayeurNom || null }).eq('id', bail.id);
                        if (!error) { setBail({ ...bail, payeur_prenom: newPayeurPrenom || null, payeur_nom: newPayeurNom || null }); setEditPayeur(false); }
                        else { alert('Erreur : ' + error.message); }
                      }}
                        style={{ flex: 2, background: '#ca8a04', color: 'white', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        ✅ Sauvegarder
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {section('🏢 Bien loué')}
              {lotsLies.length > 0 && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', margin: '0 0 8px' }}>🏠 Lots concernés par ce bail</p>
                  {lotsLies.map((lot, i) => (
                    <div key={lot.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < lotsLies.length - 1 ? '1px solid #dbeafe' : 'none' }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{lot.nom}</span>
                        {lot.surface && <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>{lot.surface} m²</span>}
                        {lot.etage && <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>— {lot.etage}</span>}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#dcfce7', color: '#15803d' }}>
                        ✓ Loué
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {info('Adresse', bien?.adresse)}
              {info('Type de bien', bien?.type)}
              {info('Type de bail', bail.type_bail)}
              {info('Surface', bail.surface_habitable ? bail.surface_habitable + ' m²' : null)}
              {info('Nombre de pièces', bail.nombre_pieces)}
              {info('Étage / Bâtiment', bail.etage)}
              {info('Classe DPE', bail.classe_dpe)}
              {info('Numéro de lot', bail.numero_lot)}
              {info('Équipements', bail.equipements)}

              {section('💰 Conditions financières')}
              <div style={{ background: '#eff6ff', borderRadius: 12, padding: 16, marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px' }}>Loyer HC</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>{bail.loyer_hc}€</p>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid #bfdbfe', borderRight: '1px solid #bfdbfe' }}>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px' }}>Charges</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>{bail.charges}€</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px' }}>Total CC</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#2563eb', margin: 0 }}>{(bail.loyer_hc || 0) + (bail.charges || 0)}€</p>
                </div>
              </div>
              {info('Dépôt de garantie', bail.depot_garantie ? bail.depot_garantie + '€' : null)}
              {info('Type de charges', bail.type_charges)}
              {info('Modalité de paiement', bail.modalite_paiement)}
              {info('Échéance', bail.date_exigibilite ? 'Le ' + bail.date_exigibilite + ' du mois' : null)}
              {info('Révision IRL', bail.revision_irl === true ? 'Oui' : bail.revision_irl === false ? 'Non' : null)}

              {section('📅 Durée du bail')}
              {info('Date de début', bail.date_debut ? new Date(bail.date_debut).toLocaleDateString('fr-FR') : null)}
              {info('Date de fin', bail.date_fin ? new Date(bail.date_fin).toLocaleDateString('fr-FR') : 'Reconduction tacite')}

              {bail.clauses && (
                <>
                  {section('📋 Clauses particulières')}
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{bail.clauses}</p>
                </>
              )}
            </div>

            {/* ===== BOUTONS ACTIONS ===== */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {bail.bail_pdf_url && (
                <a href={bail.bail_pdf_url} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, background: '#2563eb', color: 'white', padding: 14, borderRadius: 12, fontWeight: 600, fontSize: 14, textDecoration: 'none', textAlign: 'center' }}>
                  📄 Télécharger le PDF du bail
                </a>
              )}
              {bail.statut === 'actif' && bail.bail_pdf_url && bail.locataire_email && (
                <button onClick={envoyerBail} disabled={sending}
                  style={{ flex: 1, background: sending ? '#86efac' : '#16a34a', color: 'white', padding: 14, borderRadius: 12, border: 'none', fontWeight: 600, fontSize: 14, cursor: sending ? 'not-allowed' : 'pointer' }}>
                  {sending ? '⏳ Envoi...' : '📧 Envoyer au locataire'}
                </button>
              )}
              {bail.statut === 'actif' && bail.locataire_email && (
                <button onClick={envoyerRelance} disabled={sendingRelance}
                  style={{ flex: 1, background: sendingRelance ? '#fde68a' : '#f59e0b', color: 'white', padding: 14, borderRadius: 12, border: 'none', fontWeight: 600, fontSize: 14, cursor: sendingRelance ? 'not-allowed' : 'pointer' }}>
                  {sendingRelance ? '⏳ Envoi...' : '⚠️ Relancer le locataire'}
                </button>
              )}
              {bail.statut === 'actif' && bail.locataire_email && (
                <button onClick={envoyerInvitation} disabled={sendingInvitation}
                  style={{ flex: 1, background: sendingInvitation ? '#a5b4fc' : '#6366f1', color: 'white', padding: 14, borderRadius: 12, border: 'none', fontWeight: 600, fontSize: 14, cursor: sendingInvitation ? 'not-allowed' : 'pointer' }}>
                  {sendingInvitation ? '⏳ Envoi...' : '🔗 Portail locataire'}
                </button>
              )}

              {bail.statut === 'brouillon' && (
  <button onClick={() => window.location.href = `/baux/nouveau/${
  bail.type_bail === 'Meublé' ? 'meuble' :
  bail.type_bail === 'Commercial (3-6-9)' ? 'commercial' :
  bail.type_bail === 'Parking / Garage' ? 'parking' :
  bail.type_bail === 'Étudiant' ? 'etudiant' :
  bail.type_bail === 'Mobilité' ? 'mobilite' :
  bail.type_bail === 'Autre' ? 'autre' :
  'non-meuble'
}?id=${bail.id}&sign=true`}
    style={{ flex: 1, background: '#16a34a', color: 'white', padding: 14, borderRadius: 12, border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
    ✍️ Signer le bail
  </button>
)}
              {bail.statut !== 'termine' && (
                <button onClick={cloturerBail}
                  style={{ flex: 1, background: '#fef2f2', color: '#dc2626', padding: 14, borderRadius: 12, border: '1px solid #fecaca', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  🔒 Clôturer ce bail
                </button>
              )}
              <button onClick={async () => {
                const confirm1 = confirm('Supprimer définitivement ce bail ?');
                if (!confirm1) return;
                const confirm2 = confirm('Cette action est irréversible. Confirmer la suppression ?');
                if (!confirm2) return;
                const { data: { user } } = await supabase.auth.getUser();
                await supabase.from('lots').update({ statut: 'vacant', bail_id: null }).eq('bail_id', bail.id);
                const { error } = await supabase.from('Baux').delete().eq('id', bail.id);
                if (!error) {
                  if (bail.statut === 'actif') {
                    fetch('/api/sync-quantity', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: user.id }),
                    }).catch(err => console.error('Erreur sync quantity:', err));
                  }
                  window.location.href = '/baux';
                } else { alert('Erreur : ' + error.message); }
              }}
                style={{ flex: 1, background: 'white', color: '#6b7280', padding: 14, borderRadius: 12, border: '1px solid #e5e7eb', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                🗑 Supprimer
              </button>
            </div>
          </>
        )}

        {/* ===== ONGLET MESSAGES ===== */}
        {ongletBail === 'messages' && (
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginTop: 0, marginBottom: 20 }}>
              💬 Messages avec {bail.locataire_prenom} {bail.locataire_nom}
            </h3>

            {/* Zone messages */}
            <div style={{ height: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, padding: 12, background: '#f9fafb', borderRadius: 12 }}>
              {messages.length === 0 && (
                <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: 'auto', marginBottom: 'auto', fontSize: 14 }}>
                  Aucun message pour l'instant.<br />
                  <span style={{ fontSize: 12 }}>Le locataire peut vous écrire depuis son portail.</span>
                </p>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.expediteur === 'proprio' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '70%', padding: '10px 14px', borderRadius: 12, fontSize: 14, lineHeight: 1.5,
                    background: msg.expediteur === 'proprio' ? '#2563eb' : 'white',
                    color: msg.expediteur === 'proprio' ? 'white' : '#111827',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    borderBottomRightRadius: msg.expediteur === 'proprio' ? 4 : 12,
                    borderBottomLeftRadius: msg.expediteur === 'locataire' ? 4 : 12,
                  }}>
                    <p style={{ margin: '0 0 4px' }}>{msg.contenu}</p>
                    <p style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>
                      {msg.expediteur === 'proprio' ? 'Vous' : bail.locataire_prenom} — {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Zone saisie */}
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyerMessage(); } }}
                placeholder="Écrivez un message..."
                style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none' }}
              />
              <button onClick={envoyerMessage} disabled={sendingMsg || !newMessage.trim()}
                style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 16, cursor: !newMessage.trim() ? 'not-allowed' : 'pointer', opacity: !newMessage.trim() ? 0.5 : 1 }}>
                {sendingMsg ? '...' : '→'}
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
