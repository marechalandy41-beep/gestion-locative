'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';

export default function DetailBail() {
  const id = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : null;
  const [bail, setBail] = useState(null);
  const [bien, setBien] = useState(null);
  const [loading, setLoading] = useState(true);
const [editContact, setEditContact] = useState(false);
const [newEmail, setNewEmail] = useState('');
const [newTel, setNewTel] = useState('');

  useEffect(() => {
    chargerBail();
  }, []);

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
    setLoading(false);
  }

  async function cloturerBail() {
    if (!confirm('Confirmer la clôture de ce bail ? Il passera en statut "Terminé".')) return;
    await supabase.from('Baux').update({ statut: 'termine' }).eq('id', bail.id);
    window.location.href = '/baux';
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

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>

      <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/dashboard" style={{ fontSize: 22, fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>GestionLocative</a>
          <div style={{ display: 'flex', gap: 24, fontSize: 14, fontWeight: 500, alignItems: 'center' }}>
            <a href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none' }}>Baux actifs</a>
            <a href="/baux" style={{ color: '#2563eb', borderBottom: '2px solid #2563eb', paddingBottom: 4, textDecoration: 'none' }}>Mes Baux</a>
            <a href="/biens" style={{ color: '#6b7280', textDecoration: 'none' }}>Mes Biens</a>
            <a href="/compte" style={{ color: '#6b7280', textDecoration: 'none' }}>Mon Compte</a>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/auth'; }}
              style={{ background: '#fef2f2', color: '#dc2626', padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ marginBottom: 32 }}>
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

        <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}>

          {section('🏠 Bailleur')}
          {info('Nom et prénom', [bail.bailleur_prenom, bail.bailleur_nom].filter(Boolean).join(' ') || null)}
          {info('Adresse', bail.bailleur_adresse)}
          {info('Date de naissance', bail.bailleur_naissance ? new Date(bail.bailleur_naissance).toLocaleDateString('fr-FR') : null)}
          {info('Lieu de naissance', bail.bailleur_lieu_naissance)}
          {info('Nationalité', bail.bailleur_nationalite)}

          {section('👤 Locataire')}
          {info('Nom et prénom', [bail.locataire_prenom, bail.locataire_nom].filter(Boolean).join(' ') || null)}
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

          {section('🏢 Bien loué')}
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

        <div style={{ display: 'flex', gap: 12 }}>
          {bail.bail_pdf_url && (
            <a href={bail.bail_pdf_url} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, background: '#2563eb', color: 'white', padding: 14, borderRadius: 12, fontWeight: 600, fontSize: 14, textDecoration: 'none', textAlign: 'center' }}>
              📄 Télécharger le PDF du bail
            </a>
          )}
          {bail.statut !== 'termine' && (
            <button onClick={cloturerBail}
              style={{ flex: 1, background: '#fef2f2', color: '#dc2626', padding: 14, borderRadius: 12, border: '1px solid #fecaca', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              🔒 Clôturer ce bail
            </button>
          )}
        </div>
      </div>
    </main>
  );
}