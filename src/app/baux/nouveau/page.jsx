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
    const { data } = await supabase.from('Biens').select('*').eq('user_id', userId);
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
      statut: 'actif',
    }]);
    setLoading(false);
    if (!error) window.location.href = '/baux';
  }

  const inputStyle = {
    width: '100%', border: '1px solid #e5e7eb', borderRadius: 8,
    padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box'
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', padding: 24 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <a href="/baux" style={{ color: '#6b7280', fontSize: 14, textDecoration: 'none' }}>← Retour</a>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginTop: 8, marginBottom: 32 }}>📋 Nouveau bail</h1>

        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Bien concerné</label>
              <select style={inputStyle} value={bail.bien_id} onChange={e => setBail({ ...bail, bien_id: e.target.value })}>
                <option value="">Sélectionner un bien</option>
                {biens.map(b => (
                  <option key={b.id} value={b.id}>{b.adresse}, {b.ville}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Type de bail</label>
              <select style={inputStyle} value={bail.type_bail} onChange={e => setBail({ ...bail, type_bail: e.target.value })}>
                <option>Non meublé</option>
                <option>Meublé</option>
                <option>Commercial</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Loyer HC (€)</label>
                <input style={inputStyle} type="number" value={bail.loyer_hc} onChange={e => setBail({ ...bail, loyer_hc: e.target.value })} placeholder="800" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Charges (€)</label>
                <input style={inputStyle} type="number" value={bail.charges} onChange={e => setBail({ ...bail, charges: e.target.value })} placeholder="50" />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Type de charges</label>
              <select style={inputStyle} value={bail.type_charges} onChange={e => setBail({ ...bail, type_charges: e.target.value })}>
                <option>Forfaitaires</option>
                <option>Provisions sur charges</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Date de début</label>
                <input style={inputStyle} type="date" value={bail.date_debut} onChange={e => setBail({ ...bail, date_debut: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Date de fin</label>
                <input style={inputStyle} type="date" value={bail.date_fin} onChange={e => setBail({ ...bail, date_fin: e.target.value })} />
              </div>
            </div>

            <button
              onClick={sauvegarderBail}
              disabled={loading}
              style={{ background: '#2563eb', color: 'white', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, marginTop: 8 }}
            >
              {loading ? 'Enregistrement...' : '✅ Créer le bail'}
            </button>

          </div>
        </div>
      </div>
    </main>
  );
}