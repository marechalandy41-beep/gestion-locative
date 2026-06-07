'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';

export default function NouveauBail() {
  const [user, setUser] = useState(null);
  const [biens, setBiens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ecran, setEcran] = useState('choix'); // choix | formulaire | signature
  const [etape, setEtape] = useState(1);
  const [signatureBailleur, setSignatureBailleur] = useState(null);
  const [signatureLocataire, setSignatureLocataire] = useState(null);
  const [canvasRef, setCanvasRef] = useState(null);
  const [dessin, setDessin] = useState(false);
  const [bailId, setBailId] = useState(null);

  const [bail, setBail] = useState({
    // Bailleur
    bailleur_prenom: '', bailleur_nom: '', bailleur_adresse: '',
    // Locataire
    locataire_prenom: '', locataire_nom: '', locataire_email: '',
    locataire_telephone: '', locataire_naissance: '', locataire_adresse: '',
    // Bien & loyer
    bien_id: '', type_bail: 'Non meublé', loyer_hc: '',
    charges: '', type_charges: 'Forfaitaires', depot_garantie: '',
    // Dates & clauses
    date_debut: '', date_fin: '', clauses: '',
  });

 useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        setUser(data.user);
        chargerBiens(data.user.id);
        // Charger le brouillon si ID dans l'URL
        const params = new URLSearchParams(window.location.search);
        const bailId = params.get('id');
        if (bailId) {
          const { data: bailData } = await supabase
            .from('Baux').select('*').eq('id', bailId).single();
          if (bailData) {
            setBail({
              bailleur_prenom: bailData.bailleur_prenom || '',
              bailleur_nom: bailData.bailleur_nom || '',
              bailleur_adresse: bailData.bailleur_adresse || '',
              locataire_prenom: bailData.locataire_prenom || '',
              locataire_nom: bailData.locataire_nom || '',
              locataire_email: bailData.locataire_email || '',
              locataire_telephone: bailData.locataire_telephone || '',
              locataire_naissance: bailData.locataire_naissance || '',
              locataire_adresse: bailData.locataire_adresse || '',
              bien_id: bailData.bien_id?.toString() || '',
              type_bail: bailData.type_bail || 'Non meublé',
              loyer_hc: bailData.loyer_hc?.toString() || '',
              charges: bailData.charges?.toString() || '',
              type_charges: bailData.type_charges || 'Forfaitaires',
              depot_garantie: bailData.depot_garantie?.toString() || '',
              date_debut: bailData.date_debut || '',
              date_fin: bailData.date_fin || '',
              clauses: bailData.clauses || '',
            });
            setBailId(bailId);
            setEcran('signature'); // Aller direct à la signature
          }
        }
      } else { window.location.href = '/auth'; }
    });
  }, []);

  async function chargerBiens(userId) {
    const { data } = await supabase.from('Biens').select('*').eq('user_id', userId);
    setBiens(data || []);
  }

 async function sauvegarderBail(statut = 'actif') {
    setLoading(true);
    const payload = {
      bien_id: parseInt(bail.bien_id),
      type_bail: bail.type_bail,
      loyer_hc: parseFloat(bail.loyer_hc),
      charges: parseFloat(bail.charges) || 0,
      type_charges: bail.type_charges,
      depot_garantie: parseFloat(bail.depot_garantie) || 0,
      date_debut: bail.date_debut,
      date_fin: bail.date_fin || null,
      locataire_prenom: bail.locataire_prenom,
      locataire_nom: bail.locataire_nom,
      locataire_email: bail.locataire_email,
      locataire_telephone: bail.locataire_telephone,
      locataire_naissance: bail.locataire_naissance || null,
      locataire_adresse: bail.locataire_adresse,
      bailleur_prenom: bail.bailleur_prenom,
      bailleur_nom: bail.bailleur_nom,
      bailleur_adresse: bail.bailleur_adresse,
      clauses: bail.clauses,
      signature_bailleur: signatureBailleur,
      signature_locataire: signatureLocataire,
      statut,
    };
    let error;
    if (bailId) {
      ({ error } = await supabase.from('Baux').update(payload).eq('id', bailId));
    } else {
      ({ error } = await supabase.from('Baux').insert([{ ...payload, user_id: user.id }]));
    }
    setLoading(false);
    if (!error) { window.location.href = '/baux'; }
    else { alert('Erreur : ' + error.message); }
  }

  // Canvas signature
  function initCanvas(canvas) {
    if (!canvas) return;
    setCanvasRef(canvas);
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  }

  function startDraw(e) {
    setDessin(true);
    const canvas = canvasRef;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e) {
    if (!dessin) return;
    e.preventDefault();
    const canvas = canvasRef;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDraw() { setDessin(false); }

  function effacerCanvas() {
    const canvas = canvasRef;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }

  function validerSignature(pour) {
    const dataUrl = canvasRef.toDataURL('image/png');
    if (pour === 'bailleur') { setSignatureBailleur(dataUrl); }
    else { setSignatureLocataire(dataUrl); }
    effacerCanvas();
  }

  const inp = {
    width: '100%', border: '1px solid #e5e7eb', borderRadius: 8,
    padding: '10px 12px', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', background: 'white',
  };
  const lbl = { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 };
  const bienSel = biens.find(b => b.id === parseInt(bail.bien_id));

  // ===== ÉCRAN CHOIX =====
  if (ecran === 'choix') return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: 580, margin: '0 auto' }}>
        <button onClick={() => window.location.href = '/dashboard'}
          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>
          ← Retour
        </button>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Nouveau bail</h1>
        <p style={{ color: '#6b7280', fontSize: 15, marginBottom: 28 }}>Vous avez déjà un bail ou vous souhaitez en créer un ?</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Bail existant */}
          <div onClick={() => alert('Upload bail existant — bientôt disponible')}
            style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: 'pointer', border: '2px solid transparent', display: 'flex', gap: 16, alignItems: 'center' }}
            onMouseEnter={e => e.currentTarget.style.border = '2px solid #2563eb'}
            onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
            <div style={{ fontSize: 36 }}>📄</div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>J'ai déjà un bail signé</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Importez votre PDF — il sera stocké dans votre coffre-fort.</p>
            </div>
          </div>

          {/* Créer un bail */}
          <div onClick={() => setEcran('formulaire')}
            style={{ background: '#2563eb', borderRadius: 16, padding: 24, boxShadow: '0 4px 12px rgba(37,99,235,0.3)', cursor: 'pointer', border: '2px solid transparent', display: 'flex', gap: 16, alignItems: 'center' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.92'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <div style={{ fontSize: 36 }}>✍️</div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: '0 0 4px' }}>Créer un bail officiel</h3>
              <p style={{ fontSize: 13, color: '#bfdbfe', margin: 0 }}>Formulaire complet — PDF généré + signature sur tablette.</p>
            </div>
          </div>

          {/* Plus tard */}
          <div onClick={() => sauvegarderBail('brouillon')}
            style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: 'pointer', border: '2px solid transparent', display: 'flex', gap: 16, alignItems: 'center' }}
            onMouseEnter={e => e.currentTarget.style.border = '2px solid #e5e7eb'}
            onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
            <div style={{ fontSize: 36 }}>⏰</div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#374151', margin: '0 0 4px' }}>Plus tard</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Créez le bail maintenant, ajoutez le document plus tard.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );

  // ===== FORMULAIRE =====
  if (ecran === 'formulaire') {
    const etapes = ['Bailleur', 'Locataire', 'Bien & loyer', 'Dates'];
    return (
      <main style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <button onClick={() => setEcran('choix')}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>
            ← Retour
          </button>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 28 }}>Créer un bail officiel</h1>

          {/* Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, gap: 0 }}>
            {etapes.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < etapes.length - 1 ? 1 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13,
                    background: etape === i + 1 ? '#2563eb' : etape > i + 1 ? '#16a34a' : '#e5e7eb',
                    color: etape >= i + 1 ? 'white' : '#9ca3af',
                  }}>{etape > i + 1 ? '✓' : i + 1}</div>
                  <span style={{ fontSize: 11, color: etape === i + 1 ? '#2563eb' : '#9ca3af', fontWeight: 500, whiteSpace: 'nowrap' }}>{e}</span>
                </div>
                {i < etapes.length - 1 && <div style={{ flex: 1, height: 2, background: etape > i + 1 ? '#16a34a' : '#e5e7eb', margin: '0 6px', marginBottom: 20 }} />}
              </div>
            ))}
          </div>

          <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>

            {/* ÉTAPE 1 — BAILLEUR */}
            {etape === 1 && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>🏠 Informations bailleur</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Prénom *</label>
                    <input style={inp} value={bail.bailleur_prenom} onChange={e => setBail({ ...bail, bailleur_prenom: e.target.value })} placeholder="Votre prénom" />
                  </div>
                  <div>
                    <label style={lbl}>Nom *</label>
                    <input style={inp} value={bail.bailleur_nom} onChange={e => setBail({ ...bail, bailleur_nom: e.target.value })} placeholder="Votre nom" />
                  </div>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={lbl}>Adresse complète *</label>
                  <input style={inp} value={bail.bailleur_adresse} onChange={e => setBail({ ...bail, bailleur_adresse: e.target.value })} placeholder="12 rue de la Paix, 75001 Paris" />
                </div>
                <button onClick={() => {
                  if (!bail.bailleur_prenom || !bail.bailleur_nom || !bail.bailleur_adresse) { alert('Remplissez tous les champs obligatoires.'); return; }
                  setEtape(2);
                }} style={{ width: '100%', background: '#2563eb', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>
                  Suivant →
                </button>
              </div>
            )}

            {/* ÉTAPE 2 — LOCATAIRE */}
            {etape === 2 && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>👤 Informations locataire</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Prénom *</label>
                    <input style={inp} value={bail.locataire_prenom} onChange={e => setBail({ ...bail, locataire_prenom: e.target.value })} placeholder="Prénom" />
                  </div>
                  <div>
                    <label style={lbl}>Nom *</label>
                    <input style={inp} value={bail.locataire_nom} onChange={e => setBail({ ...bail, locataire_nom: e.target.value })} placeholder="Nom" />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Email *</label>
                  <input style={inp} type="email" value={bail.locataire_email} onChange={e => setBail({ ...bail, locataire_email: e.target.value })} placeholder="email@exemple.com" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Téléphone</label>
                    <input style={inp} value={bail.locataire_telephone} onChange={e => setBail({ ...bail, locataire_telephone: e.target.value })} placeholder="06 00 00 00 00" />
                  </div>
                  <div>
                    <label style={lbl}>Date de naissance</label>
                    <input style={inp} type="date" value={bail.locataire_naissance} onChange={e => setBail({ ...bail, locataire_naissance: e.target.value })} />
                  </div>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={lbl}>Adresse actuelle</label>
                  <input style={inp} value={bail.locataire_adresse} onChange={e => setBail({ ...bail, locataire_adresse: e.target.value })} placeholder="Adresse du locataire" />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setEtape(1)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                  <button onClick={() => {
                    if (!bail.locataire_prenom || !bail.locataire_nom || !bail.locataire_email) { alert('Prénom, nom et email obligatoires.'); return; }
                    setEtape(3);
                  }} style={{ flex: 2, background: '#2563eb', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Suivant →</button>
                </div>
              </div>
            )}

            {/* ÉTAPE 3 — BIEN & LOYER */}
            {etape === 3 && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>💰 Bien & conditions financières</h3>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Bien concerné *</label>
                  <select style={inp} value={bail.bien_id} onChange={e => setBail({ ...bail, bien_id: e.target.value })}>
                    <option value="">— Sélectionnez un bien —</option>
                    {biens.map(b => <option key={b.id} value={b.id}>{b.nom} — {b.adresse}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Type de bail *</label>
                  <select style={inp} value={bail.type_bail} onChange={e => setBail({ ...bail, type_bail: e.target.value })}>
                    <option>Non meublé</option>
                    <option>Meublé</option>
                    <option>Commercial (3-6-9)</option>
                    <option>Parking / Garage</option>
                    <option>Autre</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Loyer HC (€) *</label>
                    <input style={inp} type="number" value={bail.loyer_hc} onChange={e => setBail({ ...bail, loyer_hc: e.target.value })} placeholder="800" />
                  </div>
                  <div>
                    <label style={lbl}>Charges (€)</label>
                    <input style={inp} type="number" value={bail.charges} onChange={e => setBail({ ...bail, charges: e.target.value })} placeholder="100" />
                  </div>
                  <div>
                    <label style={lbl}>Dépôt garantie (€)</label>
                    <input style={inp} type="number" value={bail.depot_garantie} onChange={e => setBail({ ...bail, depot_garantie: e.target.value })} placeholder="800" />
                  </div>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={lbl}>Type de charges</label>
                  <select style={inp} value={bail.type_charges} onChange={e => setBail({ ...bail, type_charges: e.target.value })}>
                    <option value="Forfaitaires">Forfaitaires — montant fixe</option>
                    <option value="Provisionnelles">Provisionnelles — régularisables</option>
                  </select>
                </div>
                {bail.loyer_hc && (
                  <div style={{ background: '#eff6ff', borderRadius: 10, padding: 14, marginBottom: 20, border: '1px solid #bfdbfe' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>Total mensuel CC</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>{(parseFloat(bail.loyer_hc) || 0) + (parseFloat(bail.charges) || 0)}€</span>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setEtape(2)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                  <button onClick={() => {
                    if (!bail.bien_id || !bail.loyer_hc) { alert('Bien et loyer obligatoires.'); return; }
                    setEtape(4);
                  }} style={{ flex: 2, background: '#2563eb', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Suivant →</button>
                </div>
              </div>
            )}

            {/* ÉTAPE 4 — DATES & CLAUSES */}
            {etape === 4 && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>📅 Dates & clauses</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Date de début *</label>
                    <input style={inp} type="date" value={bail.date_debut} onChange={e => setBail({ ...bail, date_debut: e.target.value })} />
                  </div>
                  <div>
                    <label style={lbl}>Date de fin (optionnel)</label>
                    <input style={inp} type="date" value={bail.date_fin} onChange={e => setBail({ ...bail, date_fin: e.target.value })} />
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Vide = reconduction tacite</p>
                  </div>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={lbl}>Clauses particulières</label>
                  <textarea style={{ ...inp, minHeight: 100, resize: 'vertical' }} value={bail.clauses} onChange={e => setBail({ ...bail, clauses: e.target.value })} placeholder="Ex : animaux interdits, sous-location interdite..." />
                </div>

                {/* Récap */}
                {bienSel && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                    <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#15803d' }}>✅ Récapitulatif</p>
                    <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}><b>Bailleur :</b> {bail.bailleur_prenom} {bail.bailleur_nom}</p>
                    <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}><b>Locataire :</b> {bail.locataire_prenom} {bail.locataire_nom} — {bail.locataire_email}</p>
                    <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}><b>Bien :</b> {bienSel.nom} — {bail.type_bail}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#374151' }}><b>Loyer :</b> {bail.loyer_hc}€ HC + {bail.charges || 0}€ = {(parseFloat(bail.loyer_hc) || 0) + (parseFloat(bail.charges) || 0)}€ CC — DG : {bail.depot_garantie || 0}€</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setEtape(3)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                  <button onClick={() => {
                    if (!bail.date_debut) { alert('Date de début obligatoire.'); return; }
                    setEcran('signature');
                  }} style={{ flex: 2, background: '#2563eb', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Passer à la signature →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ===== ÉCRAN SIGNATURE =====
  if (ecran === 'signature') return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Signature du bail</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 28 }}>Choisissez votre mode de signature</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Signature sur tablette */}
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>🖊️ Signer sur tablette</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>Le bailleur signe, puis le locataire. Les signatures sont intégrées au PDF.</p>

            {/* Signature bailleur */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                {signatureBailleur ? '✅ Bailleur signé' : `Signature du bailleur — ${bail.bailleur_prenom} ${bail.bailleur_nom}`}
              </p>
              {!signatureBailleur ? (
                <div>
                  <canvas
                    ref={initCanvas}
                    width={520} height={140}
                    onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                    onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                    style={{ border: '2px dashed #93c5fd', borderRadius: 10, width: '100%', height: 140, cursor: 'crosshair', touchAction: 'none', background: '#fafafa' }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={effacerCanvas} style={{ flex: 1, background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 13 }}>🗑 Effacer</button>
                    <button onClick={() => validerSignature('bailleur')} style={{ flex: 2, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>✅ Valider signature bailleur</button>
                  </div>
                </div>
              ) : (
                <div>
                  <img src={signatureBailleur} style={{ border: '1px solid #e5e7eb', borderRadius: 8, width: '100%', height: 100, objectFit: 'contain' }} alt="Signature bailleur" />
                  <button onClick={() => setSignatureBailleur(null)} style={{ marginTop: 6, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Recommencer</button>
                </div>
              )}
            </div>

            {/* Signature locataire */}
            {signatureBailleur && (
              <div style={{ marginBottom: 20, borderTop: '1px solid #f3f4f6', paddingTop: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  {signatureLocataire ? '✅ Locataire signé' : `Signature du locataire — ${bail.locataire_prenom} ${bail.locataire_nom}`}
                </p>
                {!signatureLocataire ? (
                  <div>
                    <canvas
                      ref={initCanvas}
                      width={520} height={140}
                      onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                      onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                      style={{ border: '2px dashed #93c5fd', borderRadius: 10, width: '100%', height: 140, cursor: 'crosshair', touchAction: 'none', background: '#fafafa' }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={effacerCanvas} style={{ flex: 1, background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 13 }}>🗑 Effacer</button>
                      <button onClick={() => validerSignature('locataire')} style={{ flex: 2, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>✅ Valider signature locataire</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <img src={signatureLocataire} style={{ border: '1px solid #e5e7eb', borderRadius: 8, width: '100%', height: 100, objectFit: 'contain' }} alt="Signature locataire" />
                    <button onClick={() => setSignatureLocataire(null)} style={{ marginTop: 6, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Recommencer</button>
                  </div>
                )}
              </div>
            )}

            {signatureBailleur && signatureLocataire && (
              <button onClick={() => sauvegarderBail('actif')} disabled={loading}
                style={{ width: '100%', background: '#16a34a', color: 'white', padding: 14, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, marginTop: 8 }}>
                {loading ? 'Enregistrement...' : '🎉 Finaliser le bail signé'}
              </button>
            )}
          </div>

          {/* Yousign */}
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', opacity: 0.6 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>✉️ Signature électronique Yousign</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>Envoyez le bail par email — chaque partie signe depuis son téléphone.</p>
            <button disabled style={{ width: '100%', background: '#e5e7eb', color: '#9ca3af', padding: 12, borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 14 }}>
              🔒 Bientôt disponible
            </button>
          </div>

          {/* Plus tard */}
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>⏰ Signer plus tard</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>Le bail est sauvegardé en brouillon, vous pouvez revenir le signer depuis "Mes Baux".</p>
            <button onClick={() => sauvegarderBail('brouillon')} disabled={loading}
              style={{ width: '100%', background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              {loading ? 'Enregistrement...' : '💾 Sauvegarder en brouillon'}
            </button>
          </div>

        </div>
      </div>
    </main>
  );

  return null;
}