'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { useRouter } from 'next/navigation';

const PIECES_DEFAUT = [
  'Entrée / Couloir', 'Salon', 'Cuisine', 'Salle de bain', 'WC', 'Chambre 1'
];

const ETATS = ['Très bon état', 'Bon état', 'État moyen', 'Mauvais état'];

export default function NouvelEDL() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [baux, setBaux] = useState([]);
  const [loading, setLoading] = useState(false);
  const [etape, setEtape] = useState(1); // 1=infos, 2=pièces, 3=compteurs, 4=recap

  const [form, setForm] = useState({
    bail_id: '',
    type: 'entree',
    date_edl: new Date().toISOString().split('T')[0],
    observations: '',
  });

  const [pieces, setPieces] = useState(
    PIECES_DEFAUT.map(nom => ({ nom, etat: 'Bon état', commentaire: '', photos: [] }))
  );

  const [compteurs, setCompteurs] = useState({
    eau_froide: '', eau_chaude: '', electricite: '', gaz: '', chauffage: ''
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth'); return; }
      setUser(data.user);
      supabase.from('Baux')
        .select('id, locataire_prenom, locataire_nom, Biens(nom)')
        .eq('user_id', data.user.id)
        .in('statut', ['actif', 'brouillon'])
        .then(({ data: bauxData }) => setBaux(bauxData || []));
    });
  }, []);

  async function uploadPhoto(pieceIndex, file) {
    const ext = file.name.split('.').pop();
    const path = `edl/${user.id}/${Date.now()}_${pieceIndex}.${ext}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) { alert('Erreur upload : ' + error.message); return; }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
    const newPieces = [...pieces];
    newPieces[pieceIndex].photos = [...newPieces[pieceIndex].photos, urlData.publicUrl];
    setPieces(newPieces);
  }

  async function sauvegarder(statut = 'brouillon') {
    if (!form.bail_id) { alert('Sélectionnez un bail'); return; }
    setLoading(true);
    const { data, error } = await supabase.from('EtatsDesLieux').insert({
      bail_id: parseInt(form.bail_id),
      user_id: user.id,
      type: form.type,
      date_edl: form.date_edl,
      pieces: pieces,
      compteurs,
      observations: form.observations,
      statut,
    }).select().single();
    setLoading(false);
    if (error) { alert('Erreur : ' + error.message); return; }
    router.push(`/etats-des-lieux/${data.id}`);
  }

  const nav = (
    <nav style={{background:'white', borderBottom:'1px solid #e5e7eb', boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
      <div style={{maxWidth:1280, margin:'0 auto', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <a href="/dashboard" style={{fontSize:22, fontWeight:700, color:'#2563eb', textDecoration:'none'}}>GestionLocative</a>
        <button onClick={() => router.push('/etats-des-lieux')} style={{background:'white', color:'#6b7280', padding:'6px 16px', borderRadius:8, border:'1px solid #e5e7eb', cursor:'pointer', fontSize:14}}>
          ← Retour
        </button>
      </div>
    </nav>
  );

  return (
    <main style={{minHeight:'100vh', background:'#f9fafb'}}>
      {nav}
      <div style={{maxWidth:860, margin:'0 auto', padding:'32px 24px'}}>

        <h1 style={{fontSize:24, fontWeight:700, color:'#111827', marginBottom:8}}>Nouvel état des lieux</h1>

        {/* Barre de progression */}
        <div style={{display:'flex', gap:8, marginBottom:32}}>
          {['Informations', 'Pièces', 'Compteurs', 'Récapitulatif'].map((label, i) => (
            <div key={i} style={{flex:1, textAlign:'center'}}>
              <div style={{height:4, borderRadius:999, background: i < etape ? '#2563eb' : '#e5e7eb', marginBottom:6}}></div>
              <span style={{fontSize:12, color: i < etape ? '#2563eb' : '#9ca3af', fontWeight: i + 1 === etape ? 700 : 400}}>{label}</span>
            </div>
          ))}
        </div>

        {/* ETAPE 1 - Informations */}
        {etape === 1 && (
          <div style={{background:'white', borderRadius:16, padding:32, border:'1px solid #f3f4f6'}}>
            <h2 style={{fontSize:18, fontWeight:700, color:'#111827', marginBottom:24}}>Informations générales</h2>

            <div style={{marginBottom:20}}>
              <label style={{display:'block', fontSize:14, fontWeight:600, color:'#374151', marginBottom:6}}>Bail concerné *</label>
              <select
                value={form.bail_id}
                onChange={e => setForm({...form, bail_id: e.target.value})}
                style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #d1d5db', fontSize:14}}
              >
                <option value="">Sélectionner un bail</option>
                {baux.map(bail => (
                  <option key={bail.id} value={bail.id}>
                    {bail.Biens?.nom} — {bail.locataire_prenom} {bail.locataire_nom}
                  </option>
                ))}
              </select>
            </div>

            <div style={{marginBottom:20}}>
              <label style={{display:'block', fontSize:14, fontWeight:600, color:'#374151', marginBottom:6}}>Type d'état des lieux *</label>
              <div style={{display:'flex', gap:12}}>
                {[['entree', '🔑 Entrée'], ['sortie', '🚪 Sortie']].map(([val, label]) => (
                  <div
                    key={val}
                    onClick={() => setForm({...form, type: val})}
                    style={{flex:1, padding:'14px', borderRadius:10, border:`2px solid ${form.type === val ? '#2563eb' : '#e5e7eb'}`, background: form.type === val ? '#eff6ff' : 'white', cursor:'pointer', textAlign:'center', fontWeight:600, fontSize:14, color: form.type === val ? '#2563eb' : '#6b7280'}}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div style={{marginBottom:20}}>
              <label style={{display:'block', fontSize:14, fontWeight:600, color:'#374151', marginBottom:6}}>Date</label>
              <input
                type="date"
                value={form.date_edl}
                onChange={e => setForm({...form, date_edl: e.target.value})}
                style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #d1d5db', fontSize:14}}
              />
            </div>

            <button
              onClick={() => { if (!form.bail_id) { alert('Sélectionnez un bail'); return; } setEtape(2); }}
              style={{width:'100%', background:'#2563eb', color:'white', padding:'12px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:600, fontSize:15, marginTop:8}}
            >
              Suivant → Pièces
            </button>
          </div>
        )}

        {/* ETAPE 2 - Pièces */}
        {etape === 2 && (
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
              <h2 style={{fontSize:18, fontWeight:700, color:'#111827'}}>État des pièces</h2>
              <button
                onClick={() => {
                  const nom = prompt('Nom de la pièce à ajouter :');
                  if (nom) setPieces([...pieces, { nom, etat: 'Bon état', commentaire: '', photos: [] }]);
                }}
                style={{background:'white', color:'#2563eb', padding:'6px 14px', borderRadius:8, border:'1px solid #2563eb', cursor:'pointer', fontSize:13, fontWeight:600}}
              >
                + Ajouter une pièce
              </button>
            </div>

            {pieces.map((piece, i) => (
              <div key={i} style={{background:'white', borderRadius:16, border:'1px solid #f3f4f6', padding:20, marginBottom:12}}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
                  <h3 style={{fontWeight:600, color:'#111827', fontSize:15}}>{piece.nom}</h3>
                  <button
                    onClick={() => setPieces(pieces.filter((_, idx) => idx !== i))}
                    style={{background:'none', border:'none', color:'#9ca3af', cursor:'pointer', fontSize:18}}
                  >×</button>
                </div>

                <div style={{marginBottom:12}}>
                  <label style={{fontSize:12, color:'#6b7280', marginBottom:6, display:'block'}}>État</label>
                  <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                    {ETATS.map(etat => (
                      <span
                        key={etat}
                        onClick={() => { const p = [...pieces]; p[i].etat = etat; setPieces(p); }}
                        style={{
                          padding:'4px 12px', borderRadius:999, fontSize:12, cursor:'pointer', fontWeight:500,
                          background: piece.etat === etat ? (etat === 'Très bon état' ? '#dcfce7' : etat === 'Bon état' ? '#dbeafe' : etat === 'État moyen' ? '#fef9c3' : '#fef2f2') : '#f3f4f6',
                          color: piece.etat === etat ? (etat === 'Très bon état' ? '#15803d' : etat === 'Bon état' ? '#1d4ed8' : etat === 'État moyen' ? '#854d0e' : '#dc2626') : '#6b7280',
                          border: piece.etat === etat ? '1px solid currentColor' : '1px solid #e5e7eb'
                        }}
                      >
                        {etat}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{marginBottom:12}}>
                  <label style={{fontSize:12, color:'#6b7280', marginBottom:6, display:'block'}}>Commentaire</label>
                  <textarea
                    value={piece.commentaire}
                    onChange={e => { const p = [...pieces]; p[i].commentaire = e.target.value; setPieces(p); }}
                    placeholder="Ex: légère rayure sur le parquet..."
                    rows={2}
                    style={{width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #d1d5db', fontSize:13, resize:'vertical', boxSizing:'border-box'}}
                  />
                </div>

                <div>
                  <label style={{fontSize:12, color:'#6b7280', marginBottom:6, display:'block'}}>Photos</label>
                  <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
                    {piece.photos.map((url, j) => (
                      <img key={j} src={url} alt="" style={{width:64, height:64, objectFit:'cover', borderRadius:8, border:'1px solid #e5e7eb'}} />
                    ))}
                    <label style={{width:64, height:64, borderRadius:8, border:'2px dashed #d1d5db', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#9ca3af', fontSize:24}}>
                      +
                      <input type="file" accept="image/*" style={{display:'none'}} onChange={e => { if (e.target.files[0]) uploadPhoto(i, e.target.files[0]); }} />
                    </label>
                  </div>
                </div>
              </div>
            ))}

            <div style={{display:'flex', gap:12, marginTop:20}}>
              <button onClick={() => setEtape(1)} style={{flex:1, background:'white', color:'#6b7280', padding:'12px', borderRadius:10, border:'1px solid #e5e7eb', cursor:'pointer', fontWeight:600}}>
                ← Retour
              </button>
              <button onClick={() => setEtape(3)} style={{flex:2, background:'#2563eb', color:'white', padding:'12px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:600, fontSize:15}}>
                Suivant → Compteurs
              </button>
            </div>
          </div>
        )}

        {/* ETAPE 3 - Compteurs */}
        {etape === 3 && (
          <div style={{background:'white', borderRadius:16, padding:32, border:'1px solid #f3f4f6'}}>
            <h2 style={{fontSize:18, fontWeight:700, color:'#111827', marginBottom:24}}>Relevés de compteurs</h2>

            {[['eau_froide', '💧 Eau froide (m³)'], ['eau_chaude', '🔥 Eau chaude (m³)'], ['electricite', '⚡ Électricité (kWh)'], ['gaz', '🔵 Gaz (m³)'], ['chauffage', '🌡️ Chauffage collectif']].map(([key, label]) => (
              <div key={key} style={{marginBottom:16}}>
                <label style={{display:'block', fontSize:14, fontWeight:600, color:'#374151', marginBottom:6}}>{label}</label>
                <input
                  type="number"
                  value={compteurs[key]}
                  onChange={e => setCompteurs({...compteurs, [key]: e.target.value})}
                  placeholder="Relevé"
                  style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #d1d5db', fontSize:14, boxSizing:'border-box'}}
                />
              </div>
            ))}

            <div style={{marginBottom:20}}>
              <label style={{display:'block', fontSize:14, fontWeight:600, color:'#374151', marginBottom:6}}>Observations générales</label>
              <textarea
                value={form.observations}
                onChange={e => setForm({...form, observations: e.target.value})}
                rows={3}
                placeholder="Remarques générales sur le logement..."
                style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #d1d5db', fontSize:14, resize:'vertical', boxSizing:'border-box'}}
              />
            </div>

            <div style={{display:'flex', gap:12}}>
              <button onClick={() => setEtape(2)} style={{flex:1, background:'white', color:'#6b7280', padding:'12px', borderRadius:10, border:'1px solid #e5e7eb', cursor:'pointer', fontWeight:600}}>
                ← Retour
              </button>
              <button onClick={() => setEtape(4)} style={{flex:2, background:'#2563eb', color:'white', padding:'12px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:600, fontSize:15}}>
                Suivant → Récapitulatif
              </button>
            </div>
          </div>
        )}

        {/* ETAPE 4 - Récapitulatif */}
        {etape === 4 && (
          <div style={{background:'white', borderRadius:16, padding:32, border:'1px solid #f3f4f6'}}>
            <h2 style={{fontSize:18, fontWeight:700, color:'#111827', marginBottom:24}}>Récapitulatif</h2>

            <div style={{background:'#f9fafb', borderRadius:12, padding:20, marginBottom:20}}>
              <p style={{fontWeight:600, color:'#111827', marginBottom:8}}>
                {form.type === 'entree' ? '🔑 État des lieux d\'entrée' : '🚪 État des lieux de sortie'}
              </p>
              <p style={{color:'#6b7280', fontSize:14}}>Date : {new Date(form.date_edl).toLocaleDateString('fr-FR')}</p>
              <p style={{color:'#6b7280', fontSize:14, marginTop:4}}>{pieces.length} pièces renseignées</p>
              {form.observations && <p style={{color:'#6b7280', fontSize:14, marginTop:4}}>Observations : {form.observations}</p>}
            </div>

            <div style={{marginBottom:20}}>
              <p style={{fontWeight:600, color:'#111827', marginBottom:12}}>Résumé par pièce :</p>
              {pieces.map((piece, i) => (
                <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f3f4f6'}}>
                  <span style={{fontSize:14, color:'#374151'}}>{piece.nom}</span>
                  <span style={{fontSize:13, fontWeight:600, color: piece.etat === 'Très bon état' ? '#15803d' : piece.etat === 'Bon état' ? '#1d4ed8' : piece.etat === 'État moyen' ? '#854d0e' : '#dc2626'}}>
                    {piece.etat}
                  </span>
                </div>
              ))}
            </div>

            <div style={{display:'flex', gap:12}}>
              <button onClick={() => setEtape(3)} style={{flex:1, background:'white', color:'#6b7280', padding:'12px', borderRadius:10, border:'1px solid #e5e7eb', cursor:'pointer', fontWeight:600}}>
                ← Retour
              </button>
              <button
                onClick={() => sauvegarder('brouillon')}
                disabled={loading}
                style={{flex:1, background:'white', color:'#2563eb', padding:'12px', borderRadius:10, border:'1px solid #2563eb', cursor:'pointer', fontWeight:600}}
              >
                💾 Brouillon
              </button>
              <button
                onClick={() => sauvegarder('finalise')}
                disabled={loading}
                style={{flex:2, background:'#2563eb', color:'white', padding:'12px', borderRadius:10, border:'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight:600, fontSize:15, opacity: loading ? 0.7 : 1}}
              >
                {loading ? '⏳ Sauvegarde...' : '✅ Finaliser'}
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}