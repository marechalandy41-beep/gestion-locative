'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';

export default function NouveauBail() {

  const [user, setUser] = useState(null);
  const [biens, setBiens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [etape, setEtape] = useState(1);
  const [bail, setBail] = useState({
    bien_id: '',
    type_bail: 'Non meublé',
    loyer_hc: '',
    charges: '',
    type_charges: 'Forfaitaires',
    date_debut: '',
    date_fin: '',
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        chargerBiens(data.user.id);
      } else {
        window.location.href = '/auth';
      }
    });
  }, []);

  async function chargerBiens(userId) {
    const { data } = await supabase
      .from('Biens')
      .select('*')
      .eq('user_id', userId);
    setBiens(data || []);
  }

  async function sauvegarderBail() {
    if (!bail.bien_id || !bail.loyer_hc || !bail.date_debut) return;
    setLoading(true);
    const { error } = await supabase.from('Baux').insert([{
      bien_id: parseInt(bail.bien_id),
      user_id: user.id,
      type_bail: bail.type_bail,
      loyer_hc: parseFloat(bail.loyer_hc),
      charges: parseFloat(bail.charges) || 0,
      type_charges: bail.type_charges,
      date_debut: bail.date_debut,
      date_fin: bail.date_fin || null,
      statut: 'actif'
    }]);
    if (!error) {
      window.location.href = '/dashboard';
    } else {
      alert('Erreur : ' + error.message);
    }
    setLoading(false);
  }

  const inputStyle = {
    width: '100%',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    background: 'white',
  };

  const labelStyle = {
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    display: 'block',
    marginBottom: 6,
  };

  const bienSelectionne = biens.find(b => b.id === parseInt(bail.bien_id));

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>

        <div style={{ marginBottom: 32 }}>
          <button
            onClick={() => window.location.href = '/dashboard'}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 12 }}
          >
            ← Retour au dashboard
          </button>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: 0 }}>Nouveau bail</h1>
        </div>

        {/* Indicateur d'étapes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          {[1, 2].map((n) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14,
                background: etape === n ? '#2563eb' : etape > n ? '#16a34a' : '#e5e7eb',
                color: etape >= n ? 'white' : '#9ca3af',
              }}>
                {etape > n ? '✓' : n}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: etape === n ? '#2563eb' : '#9ca3af' }}>
                {n === 1 ? 'Bien & loyer' : 'Dates'}
              </span>
              {n < 2 && <div style={{ width: 40, height: 2, background: etape > 1 ? '#16a34a' : '#e5e7eb' }} />}
            </div>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>

          {etape === 1 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 20, marginTop: 0 }}>
                📍 Quel bien et quel loyer ?
              </h3>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Bien concerné *</label>
                <select
                  value={bail.bien_id}
                  onChange={e => setBail({ ...bail, bien_id: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">— Sélectionnez un bien —</option>
                  {biens.map(b => (
                    <option key={b.id} value={b.id}>{b.nom} — {b.adresse}</option>
                  ))}
                </select>
                {biens.length === 0 && (
                  <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>
                    Aucun bien. <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => window.location.href = '/biens'}>Ajoutez-en un d'abord.</span>
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Type de bail *</label>
                <select
                  value={bail.type_bail}
                  onChange={e => setBail({ ...bail, type_bail: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Non meublé">Non meublé</option>
                  <option value="Meublé">Meublé</option>
                  <option value="Commercial">Commercial (3-6-9)</option>
                  <option value="Parking">Parking / Garage</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Loyer HC (€) *</label>
                  <input
                    type="number"
                    value={bail.loyer_hc}
                    onChange={e => setBail({ ...bail, loyer_hc: e.target.value })}
                    placeholder="ex: 800"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Charges (€)</label>
                  <input
                    type="number"
                    value={bail.charges}
                    onChange={e => setBail({ ...bail, charges: e.target.value })}
                    placeholder="ex: 100"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Type de charges</label>
                <select
                  value={bail.type_charges}
                  onChange={e => setBail({ ...bail, type_charges: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Forfaitaires">Forfaitaires — montant fixe</option>
                  <option value="Provisionnelles">Provisionnelles — régularisables en fin d'année</option>
                </select>
              </div>

              {bail.loyer_hc && (
                <div style={{ background: '#eff6ff', borderRadius: 10, padding: 16, marginBottom: 24, border: '1px solid #bfdbfe' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#374151' }}>Loyer hors charges</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{bail.loyer_hc}€</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#374151' }}>Charges</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{bail.charges || 0}€</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #bfdbfe' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>Total mensuel CC</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>
                      {(parseFloat(bail.loyer_hc) || 0) + (parseFloat(bail.charges) || 0)}€
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  if (!bail.bien_id || !bail.loyer_hc) {
                    alert('Sélectionnez un bien et renseignez le loyer pour continuer.');
                    return;
                  }
                  setEtape(2);
                }}
                style={{ width: '100%', background: '#2563eb', color: 'white', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}
              >
                Suivant → Étape 2 / 2
              </button>
            </div>
          )}

          {etape === 2 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 20, marginTop: 0 }}>
                📅 Dates du bail
              </h3>

              {bienSelectionne && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                    ✅ {bienSelectionne.nom} — {bail.type_bail} — {bail.loyer_hc}€ HC + {bail.charges || 0}€ charges
                  </p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>Date de début *</label>
                  <input
                    type="date"
                    value={bail.date_debut}
                    onChange={e => setBail({ ...bail, date_debut: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Date de fin (optionnel)</label>
                  <input
                    type="date"
                    value={bail.date_fin}
                    onChange={e => setBail({ ...bail, date_fin: e.target.value })}
                    style={inputStyle}
                  />
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Laisser vide = reconduction tacite</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setEtape(1)}
                  style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
                >
                  ← Retour
                </button>
                <button
                  onClick={sauvegarderBail}
                  disabled={loading || !bail.date_debut}
                  style={{ flex: 2, background: loading || !bail.date_debut ? '#93c5fd' : '#2563eb', color: 'white', padding: '12px', borderRadius: 10, border: 'none', cursor: loading || !bail.date_debut ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 15 }}
                >
                  {loading ? 'Enregistrement...' : '✅ Créer le bail'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}