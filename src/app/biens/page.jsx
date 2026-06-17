'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Nav from '../components/nav'

const typesConfig = {
  Appartement: { icone: "🏠", champsSpecifiques: [
    { id: 'numero_appartement', label: "Numéro d'appartement", placeholder: "Ex: 12" },
    { id: 'numero_batiment', label: "Numéro de bâtiment", placeholder: "Ex: B" },
    { id: 'code_acces', label: "Code d'accès", placeholder: "Ex: 1234A" },
  ]},
  Maison: { icone: "🏡", champsSpecifiques: [
    { id: 'code_portail', label: "Code portail", placeholder: "Ex: 5678" },
    { id: 'code_acces', label: "Code d'accès", placeholder: "Ex: 1234A" },
  ]},
  Immeuble: { icone: "🏢", champsSpecifiques: [
    { id: 'nombre_niveaux', label: "Nombre de niveaux", placeholder: "Ex: 4" },
    { id: 'code_acces', label: "Code d'accès", placeholder: "Ex: 1234A" },
  ]},
  "Local commercial": { icone: "🏪", champsSpecifiques: [
    { id: 'numero_local', label: "Numéro de local", placeholder: "Ex: 3" },
  ]},
  Parking: { icone: "🅿️", champsSpecifiques: [
    { id: 'numero_place', label: "Numéro de place", placeholder: "Ex: B12" },
    { id: 'niveau', label: "Niveau", placeholder: "Ex: -1" },
    { id: 'code_acces', label: "Code d'accès", placeholder: "Ex: 1234A" },
  ]},
  Cave: { icone: "📦", champsSpecifiques: [
    { id: 'numero_cave', label: "Numéro de cave", placeholder: "Ex: 5" },
    { id: 'niveau', label: "Niveau sous-sol", placeholder: "Ex: -2" },
  ]},
  "Terrain jardinage": { icone: "🌱", champsSpecifiques: [
    { id: 'numero_parcelle', label: "Numéro de parcelle", placeholder: "Ex: A14" },
  ]},
  "Terrain agricole": { icone: "🚜", champsSpecifiques: [
    { id: 'numero_parcelle', label: "Numéro de parcelle cadastrale", placeholder: "Ex: ZA 0042" },
  ]},
};

const formVide = {
  nom: '', type: 'Appartement', numero_rue: '', rue: '',
  complement: '', code_postal: '', ville: '', champs_specifiques: {},
  surface: '', nombre_pieces: '', etage: '', classe_dpe: 'D',
  equipements: '', numero_lot: '',
};

export default function Biens() {
  const [biens, setBiens] = useState([]);
  const [selectionne, setSelectionne] = useState(null);
  const [lots, setLots] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newBien, setNewBien] = useState(formVide);
  const [etapeForm, setEtapeForm] = useState(1);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) { setUser(data.user); chargerBiens(data.user.id); }
      else { window.location.href = '/auth'; }
    });
  }, []);

  async function chargerBiens(userId) {
    setLoading(true);
    const { data, error } = await supabase.from('Biens').select('*').eq('user_id', userId);
    if (!error) setBiens(data);
    setLoading(false);
  }

  async function chargerLots(bienId) {
    if (lots[bienId]) return;
    const { data, error } = await supabase.from('lots').select('*').eq('bien_id', bienId);
    if (!error) setLots(prev => ({ ...prev, [bienId]: data }));
  }

  async function ajouterBien() {
    if (!newBien.nom || !newBien.rue || !newBien.code_postal || !newBien.ville) return;
    const { error } = await supabase.from('Biens').insert([{
      nom: newBien.nom,
      type: newBien.type,
      adresse: `${newBien.numero_rue} ${newBien.rue}, ${newBien.code_postal} ${newBien.ville}`,
      complement: newBien.complement || null,
      code_postal: newBien.code_postal,
      ville: newBien.ville,
      numero_rue: newBien.numero_rue || null,
      champs_specifiques: Object.keys(newBien.champs_specifiques).length > 0 ? newBien.champs_specifiques : null,
      surface: parseFloat(newBien.surface) || null,
      nombre_pieces: parseInt(newBien.nombre_pieces) || null,
      etage: newBien.etage || null,
      classe_dpe: newBien.classe_dpe || 'D',
      equipements: newBien.equipements || null,
      numero_lot: newBien.numero_lot || null,
      user_id: user.id,
    }]);
    if (!error) {
      setShowForm(false); setNewBien(formVide); setEtapeForm(1); chargerBiens(user.id);
    } else { console.log('Erreur:', error); }
  }

  function handleSelect(bien) {
    if (selectionne === bien.id) { setSelectionne(null); }
    else { setSelectionne(bien.id); chargerLots(bien.id); }
  }

  function updateChampSpecifique(id, valeur) {
    setNewBien(prev => ({ ...prev, champs_specifiques: { ...prev.champs_specifiques, [id]: valeur } }));
  }

  const inputStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'white' };
  const labelStyle = { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 };

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>

      <Nav pageCourante="biens" />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>Mes Biens</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>{biens.length} biens enregistrés</p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setEtapeForm(1); setNewBien(formVide); }}
            style={{ background: '#2563eb', color: 'white', padding: '10px 20px', borderRadius: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 14 }}>
            + Ajouter un bien
          </button>
        </div>

        {/* FORMULAIRE */}
        {showForm && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', padding: 32, marginBottom: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
                {etapeForm === 1 ? '📍 Informations générales' : '🔧 Détails du bien'}
              </h3>
              <span style={{ fontSize: 13, color: '#6b7280' }}>Étape {etapeForm}/2</span>
            </div>

            {etapeForm === 1 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Nom du bien *</label>
                    <input value={newBien.nom} onChange={e => setNewBien({...newBien, nom: e.target.value})} placeholder="Ex: Appartement Paris 11e" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Type de bien *</label>
                    <select value={newBien.type} onChange={e => setNewBien({...newBien, type: e.target.value, champs_specifiques: {}})} style={inputStyle}>
                      {Object.keys(typesConfig).map(t => <option key={t} value={t}>{typesConfig[t].icone} {t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Numéro</label>
                    <input value={newBien.numero_rue} onChange={e => setNewBien({...newBien, numero_rue: e.target.value})} placeholder="Ex: 12" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Rue *</label>
                    <input value={newBien.rue} onChange={e => setNewBien({...newBien, rue: e.target.value})} placeholder="Ex: Rue de la Paix" style={inputStyle} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Complément d'adresse</label>
                  <input value={newBien.complement} onChange={e => setNewBien({...newBien, complement: e.target.value})} placeholder="Ex: Résidence Les Lilas, Entrée B" style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 24 }}>
                  <div>
                    <label style={labelStyle}>Code postal *</label>
                    <input value={newBien.code_postal} onChange={e => setNewBien({...newBien, code_postal: e.target.value})} placeholder="Ex: 75001" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Ville *</label>
                    <input value={newBien.ville} onChange={e => setNewBien({...newBien, ville: e.target.value})} placeholder="Ex: Paris" style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { if (newBien.nom && newBien.rue && newBien.code_postal && newBien.ville) setEtapeForm(2); }}
                    style={{ background: '#2563eb', color: 'white', padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                    Suivant →
                  </button>
                  <button onClick={() => { setShowForm(false); setNewBien(formVide); }}
                    style={{ background: '#f3f4f6', color: '#374151', padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {etapeForm === 2 && (
              <div>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
                  {typesConfig[newBien.type].icone} <strong>{newBien.type}</strong> — Renseignez les caractéristiques du bien
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Surface (m²)</label>
                    <input type="number" value={newBien.surface || ''} onChange={e => setNewBien({...newBien, surface: e.target.value})} placeholder="Ex: 45" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Nb de pièces</label>
                    <input type="number" value={newBien.nombre_pieces || ''} onChange={e => setNewBien({...newBien, nombre_pieces: e.target.value})} placeholder="Ex: 3" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Étage / Bâtiment</label>
                    <input value={newBien.etage || ''} onChange={e => setNewBien({...newBien, etage: e.target.value})} placeholder="Ex: 2ème / Bât. A" style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Classe DPE</label>
                    <select value={newBien.classe_dpe || 'D'} onChange={e => setNewBien({...newBien, classe_dpe: e.target.value})} style={inputStyle}>
                      {['A','B','C','D','E','F','G'].map(c => <option key={c} value={c}>Classe {c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Numéro de lot</label>
                    <input value={newBien.numero_lot || ''} onChange={e => setNewBien({...newBien, numero_lot: e.target.value})} placeholder="Ex: Lot 12 (copropriété)" style={inputStyle} />
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Équipements inclus</label>
                  <input value={newBien.equipements || ''} onChange={e => setNewBien({...newBien, equipements: e.target.value})} placeholder="Cuisine équipée, chaudière gaz, interphone..." style={inputStyle} />
                </div>
                {typesConfig[newBien.type].champsSpecifiques.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                    {typesConfig[newBien.type].champsSpecifiques.map(champ => (
                      <div key={champ.id}>
                        <label style={labelStyle}>{champ.label}</label>
                        <input value={newBien.champs_specifiques[champ.id] || ''} onChange={e => updateChampSpecifique(champ.id, e.target.value)} placeholder={champ.placeholder} style={inputStyle} />
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={ajouterBien}
                    style={{ background: '#2563eb', color: 'white', padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                    ✅ Enregistrer le bien
                  </button>
                  <button onClick={() => setEtapeForm(1)}
                    style={{ background: '#f3f4f6', color: '#374151', padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                    ← Retour
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LISTE */}
        {loading ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: 40 }}>Chargement...</p>
        ) : biens.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 20, border: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 40, marginBottom: 16 }}>🏠</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>Aucun bien enregistré</p>
            <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Cliquez sur "Ajouter un bien" pour commencer</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
            {biens.map(bien => (
              <div key={bien.id} onClick={() => handleSelect(bien)}
                style={{ background: 'white', borderRadius: 20, border: selectionne === bien.id ? '2px solid #2563eb' : '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: 24, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 32 }}>{typesConfig[bien.type]?.icone || '🏠'}</div>
                  <div>
                    <h3 style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>{bien.nom}</h3>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{bien.adresse}</p>
                    {bien.surface && <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{bien.surface}m² — {bien.nombre_pieces} pièces — DPE {bien.classe_dpe}</p>}
                  </div>
                </div>
                {selectionne === bien.id && lots[bien.id] && (
                  <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>Lots</p>
                    {lots[bien.id].length === 0 ? (
                      <p style={{ fontSize: 13, color: '#9ca3af' }}>Aucun lot enregistré</p>
                    ) : (
                      lots[bien.id].map(lot => (
                        <div key={lot.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f9fafb' }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{lot.nom}</p>
                            <p style={{ fontSize: 11, color: '#9ca3af' }}>{lot.surface} m²</p>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: lot.statut === 'loue' ? '#dcfce7' : '#fef3c7', color: lot.statut === 'loue' ? '#15803d' : '#d97706' }}>
                            {lot.statut === 'loue' ? '✓ Loué' : '⏳ Vacant'}
                          </span>
                        </div>
                      ))
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                      <button style={{ background: '#f3f4f6', color: '#374151', padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                        + Lot
                      </button>
                      <button onClick={e => { e.stopPropagation(); window.location.href = '/coffre-fort?bien=' + bien.id; }}
                        style={{ background: '#eff6ff', color: '#2563eb', padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                        📁 Coffre-fort
                      </button>
                      <button onClick={e => { e.stopPropagation(); window.location.href = '/biens/' + bien.id + '/vendre'; }}
                        style={{ background: '#fef2f2', color: '#dc2626', padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                        🏷️ Vendre
                      </button>
                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          const c1 = confirm('Supprimer définitivement ce bien ?');
                          if (!c1) return;
                          const c2 = confirm('Cette action est irréversible. Confirmer ?');
                          if (!c2) return;
                          const { error } = await supabase.from('Biens').delete().eq('id', bien.id);
                          if (!error) { chargerBiens(user.id); setSelectionne(null); }
                          else { alert('Erreur : ' + error.message); }
                        }}
                        style={{ background: 'white', color: '#6b7280', padding: '8px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                        🗑 Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
