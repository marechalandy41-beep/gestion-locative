'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

// ========== CONFIGURATION DES TYPES DE BIENS ==========
// Chaque type a son icône et ses champs spécifiques
const typesConfig = {
  Appartement: {
    icone: "🏠",
    champsSpecifiques: [
      { id: 'numero_appartement', label: "Numéro d'appartement", placeholder: "Ex: 12" },
      { id: 'etage', label: "Étage", placeholder: "Ex: 3" },
      { id: 'numero_batiment', label: "Numéro de bâtiment", placeholder: "Ex: B" },
      { id: 'code_acces', label: "Code d'accès", placeholder: "Ex: 1234A" },
    ]
  },
  Maison: {
    icone: "🏡",
    champsSpecifiques: [
      { id: 'code_portail', label: "Code portail", placeholder: "Ex: 5678" },
      { id: 'code_acces', label: "Code d'accès", placeholder: "Ex: 1234A" },
    ]
  },
  Immeuble: {
    icone: "🏢",
    champsSpecifiques: [
      { id: 'nombre_niveaux', label: "Nombre de niveaux", placeholder: "Ex: 4" },
      { id: 'code_acces', label: "Code d'accès", placeholder: "Ex: 1234A" },
    ]
  },
  "Local commercial": {
    icone: "🏪",
    champsSpecifiques: [
      { id: 'numero_local', label: "Numéro de local", placeholder: "Ex: 3" },
      { id: 'surface', label: "Surface (m²)", placeholder: "Ex: 120" },
    ]
  },
  Parking: {
    icone: "🅿️",
    champsSpecifiques: [
      { id: 'numero_place', label: "Numéro de place", placeholder: "Ex: B12" },
      { id: 'niveau', label: "Niveau", placeholder: "Ex: -1" },
      { id: 'code_acces', label: "Code d'accès", placeholder: "Ex: 1234A" },
    ]
  },
  Cave: {
    icone: "📦",
    champsSpecifiques: [
      { id: 'numero_cave', label: "Numéro de cave", placeholder: "Ex: 5" },
      { id: 'niveau', label: "Niveau sous-sol", placeholder: "Ex: -2" },
    ]
  },
  "Terrain jardinage": {
    icone: "🌱",
    champsSpecifiques: [
      { id: 'numero_parcelle', label: "Numéro de parcelle", placeholder: "Ex: A14" },
      { id: 'surface', label: "Surface (m²)", placeholder: "Ex: 200" },
    ]
  },
  "Terrain agricole": {
    icone: "🚜",
    champsSpecifiques: [
      { id: 'numero_parcelle', label: "Numéro de parcelle cadastrale", placeholder: "Ex: ZA 0042" },
      { id: 'surface', label: "Surface (hectares)", placeholder: "Ex: 2.5" },
    ]
  },
};

// ========== LISTE DES DÉPARTEMENTS FRANÇAIS ==========
const departements = [
  "01 - Ain", "02 - Aisne", "03 - Allier", "04 - Alpes-de-Haute-Provence",
  "05 - Hautes-Alpes", "06 - Alpes-Maritimes", "07 - Ardèche", "08 - Ardennes",
  "09 - Ariège", "10 - Aube", "11 - Aude", "12 - Aveyron",
  "13 - Bouches-du-Rhône", "14 - Calvados", "15 - Cantal", "16 - Charente",
  "17 - Charente-Maritime", "18 - Cher", "19 - Corrèze", "21 - Côte-d'Or",
  "22 - Côtes-d'Armor", "23 - Creuse", "24 - Dordogne", "25 - Doubs",
  "26 - Drôme", "27 - Eure", "28 - Eure-et-Loir", "29 - Finistère",
  "30 - Gard", "31 - Haute-Garonne", "32 - Gers", "33 - Gironde",
  "34 - Hérault", "35 - Ille-et-Vilaine", "36 - Indre", "37 - Indre-et-Loire",
  "38 - Isère", "39 - Jura", "40 - Landes", "41 - Loir-et-Cher",
  "42 - Loire", "43 - Haute-Loire", "44 - Loire-Atlantique", "45 - Loiret",
  "46 - Lot", "47 - Lot-et-Garonne", "48 - Lozère", "49 - Maine-et-Loire",
  "50 - Manche", "51 - Marne", "52 - Haute-Marne", "53 - Mayenne",
  "54 - Meurthe-et-Moselle", "55 - Meuse", "56 - Morbihan", "57 - Moselle",
  "58 - Nièvre", "59 - Nord", "60 - Oise", "61 - Orne",
  "62 - Pas-de-Calais", "63 - Puy-de-Dôme", "64 - Pyrénées-Atlantiques",
  "65 - Hautes-Pyrénées", "66 - Pyrénées-Orientales", "67 - Bas-Rhin",
  "68 - Haut-Rhin", "69 - Rhône", "70 - Haute-Saône", "71 - Saône-et-Loire",
  "72 - Sarthe", "73 - Savoie", "74 - Haute-Savoie", "75 - Paris",
  "76 - Seine-Maritime", "77 - Seine-et-Marne", "78 - Yvelines",
  "79 - Deux-Sèvres", "80 - Somme", "81 - Tarn", "82 - Tarn-et-Garonne",
  "83 - Var", "84 - Vaucluse", "85 - Vendée", "86 - Vienne",
  "87 - Haute-Vienne", "88 - Vosges", "89 - Yonne", "90 - Territoire de Belfort",
  "91 - Essonne", "92 - Hauts-de-Seine", "93 - Seine-Saint-Denis",
  "94 - Val-de-Marne", "95 - Val-d'Oise",
  "971 - Guadeloupe", "972 - Martinique", "973 - Guyane",
  "974 - La Réunion", "976 - Mayotte"
];

// ========== VALEURS PAR DÉFAUT DU FORMULAIRE ==========
const formVide = {
  nom: '',
  type: 'Appartement',
  numero_rue: '',
  rue: '',
  complement: '',
  code_postal: '',
  ville: '',
  departement: '',
  champs_specifiques: {}
};

export default function Biens() {

  // ========== ÉTATS DU COMPOSANT ==========
  const [biens, setBiens] = useState([]);
  const [selectionne, setSelectionne] = useState(null);
  const [lots, setLots] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newBien, setNewBien] = useState(formVide);
  const [etapeForm, setEtapeForm] = useState(1); // Étape 1: infos générales, Étape 2: champs spécifiques

  // ========== CHARGEMENT DES BIENS AU DÉMARRAGE ==========
  useEffect(() => {
    chargerBiens();
  }, []);

  // ========== FONCTION: CHARGER LES BIENS DEPUIS SUPABASE ==========
  async function chargerBiens() {
    setLoading(true);
    const { data, error } = await supabase.from('Biens').select('*');
    if (!error) setBiens(data);
    setLoading(false);
  }

  // ========== FONCTION: CHARGER LES LOTS D'UN BIEN ==========
  async function chargerLots(bienId) {
    if (lots[bienId]) return;
    const { data, error } = await supabase.from('lots').select('*').eq('bien_id', bienId);
    if (!error) setLots(prev => ({ ...prev, [bienId]: data }));
  }

 // ========== FONCTION: SAUVEGARDER UN NOUVEAU BIEN ==========
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
      champs_specifiques: Object.keys(newBien.champs_specifiques).length > 0 ? newBien.champs_specifiques : null
    }]);
    if (!error) {
      setShowForm(false);
      setNewBien(formVide);
      setEtapeForm(1);
      chargerBiens();
    } else {
      console.log('Erreur:', error);
    }
  }

  // ========== FONCTION: GÉRER LA SÉLECTION D'UN BIEN ==========
  function handleSelect(bien) {
    if (selectionne === bien.id) {
      setSelectionne(null);
    } else {
      setSelectionne(bien.id);
      chargerLots(bien.id);
    }
  }

  // ========== FONCTION: METTRE À JOUR UN CHAMP SPÉCIFIQUE ==========
  function updateChampSpecifique(id, valeur) {
    setNewBien(prev => ({
      ...prev,
      champs_specifiques: { ...prev.champs_specifiques, [id]: valeur }
    }));
  }

  // ========== STYLE DES INPUTS ==========
  const inputStyle = {
    width: '100%',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    background: 'white'
  };

  const labelStyle = {
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    display: 'block',
    marginBottom: 6
  };

  return (
    <main style={{minHeight:'100vh', background:'#f9fafb'}}>

      {/* ========== BARRE DE NAVIGATION ========== */}
      <nav style={{background:'white', borderBottom:'1px solid #e5e7eb', boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
        <div style={{maxWidth:1280, margin:'0 auto', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          {/* Logo - renvoie vers la page d'accueil */}
          <a href="/" style={{fontSize:22, fontWeight:700, color:'#2563eb', textDecoration:'none'}}>GestionLocative</a>
          {/* Liens de navigation */}
          <div style={{display:'flex', gap:24, fontSize:14, fontWeight:500}}>
            <a href="/dashboard" style={{color:'#6b7280', textDecoration:'none'}}>Mes Briques</a>
            <a href="/biens" style={{color:'#2563eb', borderBottom:'2px solid #2563eb', paddingBottom:4, textDecoration:'none'}}>Mes Biens</a>
            <a href="/compte" style={{color:'#6b7280', textDecoration:'none'}}>Mon Compte</a>
          </div>
        </div>
      </nav>
      {/* ========== FIN NAVIGATION ========== */}

      <div style={{maxWidth:1280, margin:'0 auto', padding:'32px 24px'}}>

        {/* ========== EN-TÊTE DE PAGE ========== */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:32}}>
          <div>
            <h2 style={{fontSize:24, fontWeight:700, color:'#111827'}}>Mes Biens</h2>
            <p style={{color:'#6b7280', fontSize:14, marginTop:4}}>{biens.length} biens enregistrés</p>
          </div>
          {/* Bouton ouvrir le formulaire d'ajout */}
          <button
            onClick={() => { setShowForm(!showForm); setEtapeForm(1); setNewBien(formVide); }}
            style={{background:'#2563eb', color:'white', padding:'10px 20px', borderRadius:12, fontWeight:600, border:'none', cursor:'pointer', fontSize:14}}
          >
            + Ajouter un bien
          </button>
        </div>
        {/* ========== FIN EN-TÊTE ========== */}

        {/* ========== FORMULAIRE D'AJOUT DE BIEN ========== */}
        {showForm && (
          <div style={{background:'white', borderRadius:16, border:'1px solid #e5e7eb', padding:32, marginBottom:32, boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>

            {/* Titre et indicateur d'étape */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24}}>
              <h3 style={{fontSize:16, fontWeight:600, color:'#111827'}}>
                {etapeForm === 1 ? '📍 Informations générales' : '🔧 Détails spécifiques'}
              </h3>
              <span style={{fontSize:13, color:'#6b7280'}}>Étape {etapeForm}/2</span>
            </div>

            {/* ===== ÉTAPE 1 : INFORMATIONS GÉNÉRALES ===== */}
            {etapeForm === 1 && (
              <div>
                {/* Nom du bien et type */}
                <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16}}>
                  <div>
                    <label style={labelStyle}>Nom du bien *</label>
                    <input
                      value={newBien.nom}
                      onChange={e => setNewBien({...newBien, nom: e.target.value})}
                      placeholder="Ex: Appartement Paris 11e"
                      style={inputStyle}
                    />
                  </div>
                  {/* Sélecteur de type de bien - affecte les champs de l'étape 2 */}
                  <div>
                    <label style={labelStyle}>Type de bien *</label>
                    <select
                      value={newBien.type}
                      onChange={e => setNewBien({...newBien, type: e.target.value, champs_specifiques: {}})}
                      style={inputStyle}
                    >
                      {Object.keys(typesConfig).map(t => (
                        <option key={t} value={t}>{typesConfig[t].icone} {t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Numéro et rue */}
                <div style={{display:'grid', gridTemplateColumns:'1fr 3fr', gap:16, marginBottom:16}}>
                  <div>
                    <label style={labelStyle}>Numéro *</label>
                    <input
                      value={newBien.numero_rue}
                      onChange={e => setNewBien({...newBien, numero_rue: e.target.value})}
                      placeholder="Ex: 12"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Rue *</label>
                    <input
                      value={newBien.rue}
                      onChange={e => setNewBien({...newBien, rue: e.target.value})}
                      placeholder="Ex: Rue de la Paix"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Complément d'adresse */}
                <div style={{marginBottom:16}}>
                  <label style={labelStyle}>Complément d'adresse</label>
                  <input
                    value={newBien.complement}
                    onChange={e => setNewBien({...newBien, complement: e.target.value})}
                    placeholder="Ex: Résidence Les Lilas, Entrée B"
                    style={inputStyle}
                  />
                </div>

                {/* Code postal, ville et département */}
                <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:16, marginBottom:24}}>
                  <div>
                    <label style={labelStyle}>Code postal *</label>
                    <input
                      value={newBien.code_postal}
                      onChange={e => setNewBien({...newBien, code_postal: e.target.value})}
                      placeholder="Ex: 75001"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Ville *</label>
                    <input
                      value={newBien.ville}
                      onChange={e => setNewBien({...newBien, ville: e.target.value})}
                      placeholder="Ex: Paris"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Boutons navigation étape 1 */}
                <div style={{display:'flex', gap:8}}>
                  {/* Bouton suivant - passe à l'étape 2 */}
                  <button
                    onClick={() => { if (newBien.nom && newBien.rue && newBien.code_postal && newBien.ville) setEtapeForm(2); }}
                    style={{background:'#2563eb', color:'white', padding:'10px 24px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:14}}
                  >
                    Suivant →
                  </button>
                  {/* Bouton annuler - ferme le formulaire */}
                  <button
                    onClick={() => { setShowForm(false); setNewBien(formVide); }}
                    style={{background:'#f3f4f6', color:'#374151', padding:'10px 24px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:14}}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* ===== ÉTAPE 2 : CHAMPS SPÉCIFIQUES AU TYPE DE BIEN ===== */}
            {etapeForm === 2 && (
              <div>
                <p style={{fontSize:13, color:'#6b7280', marginBottom:20}}>
                  {typesConfig[newBien.type].icone} Informations spécifiques pour : <strong>{newBien.type}</strong>
                </p>

                {/* Champs spécifiques générés dynamiquement selon le type choisi */}
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24}}>
                  {typesConfig[newBien.type].champsSpecifiques.map(champ => (
                    <div key={champ.id}>
                      <label style={labelStyle}>{champ.label}</label>
                      <input
                        value={newBien.champs_specifiques[champ.id] || ''}
                        onChange={e => updateChampSpecifique(champ.id, e.target.value)}
                        placeholder={champ.placeholder}
                        style={inputStyle}
                      />
                    </div>
                  ))}
                </div>

                {/* Boutons navigation étape 2 */}
                <div style={{display:'flex', gap:8}}>
                  {/* Bouton enregistrer - sauvegarde dans Supabase */}
                  <button
                    onClick={ajouterBien}
                    style={{background:'#2563eb', color:'white', padding:'10px 24px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:14}}
                  >
                    ✅ Enregistrer le bien
                  </button>
                  {/* Bouton retour - revient à l'étape 1 */}
                  <button
                    onClick={() => setEtapeForm(1)}
                    style={{background:'#f3f4f6', color:'#374151', padding:'10px 24px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:14}}
                  >
                    ← Retour
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
        {/* ========== FIN FORMULAIRE ========== */}

        {/* ========== LISTE DES BIENS ========== */}
        {loading ? (
          <p style={{color:'#6b7280', textAlign:'center', padding:40}}>Chargement...</p>
        ) : biens.length === 0 ? (
          /* Message quand aucun bien n'est enregistré */
          <div style={{textAlign:'center', padding:60, background:'white', borderRadius:20, border:'1px solid #f3f4f6'}}>
            <p style={{fontSize:40, marginBottom:16}}>🏠</p>
            <p style={{fontSize:16, fontWeight:600, color:'#111827'}}>Aucun bien enregistré</p>
            <p style={{color:'#6b7280', fontSize:14, marginTop:4}}>Cliquez sur "Ajouter un bien" pour commencer</p>
          </div>
        ) : (
          /* Grille des briques de biens */
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:24}}>
            {biens.map(bien => (
              <div
                key={bien.id}
                onClick={() => handleSelect(bien)}
                style={{background:'white', borderRadius:20, border: selectionne === bien.id ? '2px solid #2563eb' : '1px solid #f3f4f6', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', padding:24, cursor:'pointer'}}
              >
                {/* En-tête de la brique - icône et nom */}
                <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:16}}>
                  <div style={{fontSize:32}}>{typesConfig[bien.type]?.icone || '🏠'}</div>
                  <div>
                    <h3 style={{fontWeight:700, color:'#111827', fontSize:15}}>{bien.nom}</h3>
                    <p style={{fontSize:12, color:'#9ca3af', marginTop:2}}>{bien.adresse}</p>
                  </div>
                </div>

                {/* Détail des lots - visible uniquement quand la brique est sélectionnée */}
                {selectionne === bien.id && lots[bien.id] && (
                  <div style={{borderTop:'1px solid #f3f4f6', paddingTop:16}}>
                    <p style={{fontSize:12, fontWeight:600, color:'#6b7280', marginBottom:8, textTransform:'uppercase'}}>Lots</p>
                    {lots[bien.id].length === 0 ? (
                      <p style={{fontSize:13, color:'#9ca3af'}}>Aucun lot enregistré</p>
                    ) : (
                      lots[bien.id].map(lot => (
                        <div key={lot.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f9fafb'}}>
                          <div>
                            <p style={{fontSize:13, fontWeight:500, color:'#374151'}}>{lot.nom}</p>
                            <p style={{fontSize:11, color:'#9ca3af'}}>{lot.surface} m²</p>
                          </div>
                          <span style={{fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:999, background: lot.statut === 'loue' ? '#dcfce7' : '#fef3c7', color: lot.statut === 'loue' ? '#15803d' : '#d97706'}}>
                            {lot.statut === 'loue' ? '✓ Loué' : '⏳ Vacant'}
                          </span>
                        </div>
                      ))
                    )}
                    {/* Boutons d'action sur le bien sélectionné */}
                    <div style={{display:'flex', gap:8, marginTop:12}}>
                      {/* Bouton ajouter un lot */}
                      <button style={{flex:1, background:'#f3f4f6', color:'#374151', padding:'8px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:500}}>
                        + Lot
                      </button>
                      {/* Bouton accéder au coffre-fort */}
                      <button style={{flex:1, background:'#eff6ff', color:'#2563eb', padding:'8px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:500}}>
                        📁 Coffre-fort
                      </button>
                      {/* Bouton préparer la vente */}
                      <button style={{flex:1, background:'#fef2f2', color:'#dc2626', padding:'8px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:500}}>
                        🏷️ Vendre
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {/* ========== FIN LISTE DES BIENS ========== */}

      </div>
    </main>
  );
}
