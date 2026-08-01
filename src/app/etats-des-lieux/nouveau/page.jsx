'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabase';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf'
import { genererCorpsEDL } from '@/lib/pdfEdlExtras'

const PIECES_DEFAUT = [
  'Entrée / Couloir', 'Salon', 'Cuisine', 'Salle de bain', 'WC', 'Chambre 1'
];

const ETATS = ['Très bon état', 'Bon état', 'État moyen', 'Mauvais état'];

export default function NouvelEDL() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [baux, setBaux] = useState([]);
  const [biens, setBiens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [etape, setEtape] = useState(1); // 1=infos, 2=pièces, 3=compteurs, 4=recap


  const [form, setForm] = useState({
    bail_id: '',
    bien_id: '',
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

  const [signatureBailleurEnregistree, setSignatureBailleurEnregistree] = useState(null);
  const [locataireRefuse, setLocataireRefuse] = useState(false);
  const [dessin, setDessin] = useState(false);
  const [aSigneLocataire, setASigneLocataire] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
  supabase.auth.getUser().then(async ({ data }) => {
    if (!data.user) { router.push('/auth'); return; }

    setUser(data.user);
    supabase.from('Baux')
      .select('id, locataire_prenom, locataire_nom, locataire_email, bien_id, bailleur_prenom, bailleur_nom, bailleur_type, bailleur_denomination, Biens(nom)')
      .eq('user_id', data.user.id)
      .in('statut', ['actif', 'brouillon'])
      .then(({ data: bauxData }) => setBaux(bauxData || []));
    supabase.from('Biens')
      .select('id, nom, adresse')
      .eq('user_id', data.user.id)
      .then(({ data: biensData }) => setBiens(biensData || []));
    supabase.from('customers')
      .select('signature')
      .eq('user_id', data.user.id)
      .single()
      .then(({ data: custData }) => setSignatureBailleurEnregistree(custData?.signature || null));
  });
}, []);

  function startDraw(e) {
    setDessin(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y);
  }
  function draw(e) {
    if (!dessin) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e40af'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y); ctx.stroke();
    setASigneLocataire(true);
  }
  function stopDraw() { setDessin(false); }
  function effacerSignature() {
    if (canvasRef.current) canvasRef.current.getContext('2d').clearRect(0, 0, 520, 160);
    setASigneLocataire(false);
  }

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

  function supprimerPhoto(pieceIndex, photoIndex) {
    const newPieces = [...pieces];
    newPieces[pieceIndex].photos = newPieces[pieceIndex].photos.filter((_, j) => j !== photoIndex);
    setPieces(newPieces);
  }

  async function sauvegarder(statut = 'brouillon') {
  if (!form.bien_id) { alert('Sélectionnez un bien'); return; }
  if (statut === 'finalise' && !locataireRefuse && !aSigneLocataire) { alert('Faites signer le locataire, ou cochez la case de refus.'); return; }
  setLoading(true);
  const signatureLocataireFinale = (statut === 'finalise' && !locataireRefuse && canvasRef.current) ? canvasRef.current.toDataURL('image/png') : null;

  // Bail optionnel (peut ne pas exister en plan gratuit) : on récupère infos locataire si dispo
  let bailData = null;
  if (form.bail_id) {
    const { data } = await supabase
      .from('Baux')
      .select('*, Biens(id, nom, adresse)')
      .eq('id', parseInt(form.bail_id))
      .single();
    bailData = data;
  }
  const bienSelectionne = biens.find(b => b.id === parseInt(form.bien_id))

  const { data: edl, error } = await supabase.from('EtatsDesLieux').insert({
    bail_id: form.bail_id ? parseInt(form.bail_id) : null,
    bien_id: parseInt(form.bien_id),
    user_id: user.id,
    type: form.type,
    date_edl: form.date_edl,
    pieces: pieces,
    compteurs,
    observations: form.observations,
    statut,
    signature_bailleur: statut === 'finalise' ? signatureBailleurEnregistree : null,
    signature_locataire: signatureLocataireFinale,
    locataire_refuse_signature: statut === 'finalise' ? locataireRefuse : false,
  }).select().single();

  if (error) { alert('Erreur : ' + error.message); setLoading(false); return; }

  // Si finalisé, générer et uploader le PDF
  if (statut === 'finalise') {
    try {
      const doc = new jsPDF();

      await genererCorpsEDL(doc, {
        type: form.type,
        date_edl: form.date_edl,
        bienNom: bailData?.Biens?.nom || bienSelectionne?.nom || bienSelectionne?.adresse || '',
        locataireNom: bailData ? `${bailData.locataire_prenom || ''} ${bailData.locataire_nom || ''}` : '—',
        pieces,
        compteurs,
        observations: form.observations,
        signatureBailleur: signatureBailleurEnregistree,
        signatureLocataire: signatureLocataireFinale,
        locataireRefuse,
      });

      const nomFichier = `EDL_${form.type}_${bailData?.Biens?.nom || bienSelectionne?.nom || 'bien'}_${form.date_edl}.pdf`;
      const pdfBlob = doc.output('blob');
      const bienId = bailData?.Biens?.id || bienSelectionne?.id;
      const cheminStorage = `${user.id}/${bienId}/Etat des lieux/${nomFichier}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(cheminStorage, pdfBlob, { contentType: 'application/pdf', upsert: true });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(cheminStorage);
        await supabase.from('Documents').insert({
          user_id: user.id,
          bien_id: bienId,
          nom_fichier: nomFichier,
          categorie: form.type === 'entree' ? 'État des lieux entrée' : 'État des lieux sortie',
          url: urlData.publicUrl,
          storage_path: cheminStorage,
          annee: new Date(form.date_edl).getFullYear(),
        });
        // Téléchargement local aussi
        doc.save(nomFichier);
      }
    } catch (err) {
      console.error('Erreur PDF EDL:', err);
    }
  }

  setLoading(false);
  router.push(`/etats-des-lieux/${edl.id}`);
}

  async function envoyerSignatureEmail() {
    if (!form.bien_id) { alert('Sélectionnez un bien'); return; }
    if (!form.bail_id) { alert('Sélectionnez un bail lié pour connaître l\'email du locataire.'); return; }
    const bailSelectionne = baux.find(b => b.id === parseInt(form.bail_id));
    if (!bailSelectionne?.locataire_email) { alert('Ce bail n\'a pas d\'email locataire renseigné.'); return; }
    if (!signatureBailleurEnregistree) { alert('Enregistrez d\'abord votre signature dans "Mon compte" avant d\'envoyer par email.'); return; }

    setLoading(true);
    const token = crypto.randomUUID();
    const bienSelectionne = biens.find(b => b.id === parseInt(form.bien_id));

    const { data: edl, error } = await supabase.from('EtatsDesLieux').insert({
      bail_id: parseInt(form.bail_id),
      bien_id: parseInt(form.bien_id),
      user_id: user.id,
      type: form.type,
      date_edl: form.date_edl,
      pieces,
      compteurs,
      observations: form.observations,
      statut: 'attente_signature',
      signature_bailleur: signatureBailleurEnregistree,
      token_signature: token,
    }).select().single();

    if (error) { alert('Erreur : ' + error.message); setLoading(false); return; }

    await fetch('/api/send-signature-edl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        locataireEmail: bailSelectionne.locataire_email,
        locataireNom: `${bailSelectionne.locataire_prenom || ''} ${bailSelectionne.locataire_nom || ''}`,
        proprietaireNom: bailSelectionne.bailleur_type === 'morale' ? bailSelectionne.bailleur_denomination : `${bailSelectionne.bailleur_prenom || ''} ${bailSelectionne.bailleur_nom || ''}`,
        bienNom: bienSelectionne?.nom || bienSelectionne?.adresse || '',
        typeEdl: form.type,
      }),
    }).catch(() => {});

    setLoading(false);
    router.push('/etats-des-lieux');
  }

  const nav = (
    <nav style={{background:'white', borderBottom:'1px solid #e5e7eb', boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
      <div style={{maxWidth:1280, margin:'0 auto', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <a href="/dashboard" style={{fontSize:22, fontWeight:700, color:'#2563eb', textDecoration:'none'}}>Ma Gestion-Locative</a>
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
          {['Informations', 'Pièces', 'Compteurs', 'Récapitulatif', 'Signature'].map((label, i) => (
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
              <label style={{display:'block', fontSize:14, fontWeight:600, color:'#374151', marginBottom:6}}>Bien concerné *</label>
              <select
                value={form.bien_id}
                onChange={e => setForm({...form, bien_id: e.target.value, bail_id: ''})}
                style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #d1d5db', fontSize:14}}
              >
                <option value="">Sélectionner un bien</option>
                {biens.map(bien => (
                  <option key={bien.id} value={bien.id}>
                    {bien.nom || bien.adresse}
                  </option>
                ))}
              </select>
            </div>

            {baux.filter(b => !form.bien_id || b.bien_id === parseInt(form.bien_id)).length > 0 && (
              <div style={{marginBottom:20}}>
                <label style={{display:'block', fontSize:14, fontWeight:600, color:'#374151', marginBottom:6}}>Bail associé (optionnel — préremplit le nom du locataire)</label>
                <select
                  value={form.bail_id}
                  onChange={e => setForm({...form, bail_id: e.target.value})}
                  style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #d1d5db', fontSize:14}}
                >
                  <option value="">Aucun</option>
                  {baux.filter(b => !form.bien_id || b.bien_id === parseInt(form.bien_id)).map(bail => (
                    <option key={bail.id} value={bail.id}>
                      {bail.locataire_prenom} {bail.locataire_nom}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
              onClick={() => { if (!form.bien_id) { alert('Sélectionnez un bien'); return; } setEtape(2); }}
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
                      <div key={j} style={{ position: 'relative', width: 64, height: 64 }}>
                        <img src={url} alt="" style={{width:64, height:64, objectFit:'cover', borderRadius:8, border:'1px solid #e5e7eb'}} />
                        <button type="button" onClick={() => supprimerPhoto(i, j)}
                          style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#dc2626', color: 'white', border: '2px solid white', fontSize: 11, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                          ✕
                        </button>
                      </div>
                    ))}
                    <label style={{width:64, height:64, borderRadius:8, border:'2px dashed #d1d5db', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#6b7280', fontSize:20}}>
                      📷
                      <span style={{fontSize:9, marginTop:2}}>Photo</span>
                      <input type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={e => { if (e.target.files[0]) uploadPhoto(i, e.target.files[0]); }} />
                    </label>
                    <label style={{width:64, height:64, borderRadius:8, border:'2px dashed #d1d5db', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#6b7280', fontSize:20}}>
                      🖼️
                      <span style={{fontSize:9, marginTop:2}}>Galerie</span>
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
                onClick={() => setEtape(5)}
                style={{flex:2, background:'#2563eb', color:'white', padding:'12px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:600, fontSize:15}}
              >
                Suivant → Signature
              </button>
            </div>
          </div>
        )}

        {/* ETAPE 5 - Signature */}
        {etape === 5 && (
          <div style={{background:'white', borderRadius:16, padding:32, border:'1px solid #f3f4f6'}}>
            <h2 style={{fontSize:18, fontWeight:700, color:'#111827', marginBottom:8}}>Signature</h2>
            <p style={{color:'#6b7280', fontSize:14, marginBottom:24}}>À faire signer sur place, sur cet appareil (tablette ou mobile).</p>

            <div style={{background:'#f9fafb', borderRadius:12, padding:16, marginBottom:20}}>
              <p style={{fontSize:13, color:'#374151', margin:0}}>
                {signatureBailleurEnregistree
                  ? '✅ Votre signature (propriétaire) est enregistrée et sera appliquée automatiquement.'
                  : '⚠️ Vous n\'avez pas de signature enregistrée dans "Mon compte". Le PDF sera généré sans signature propriétaire.'}
              </p>
            </div>

            {(() => {
              const bailSelectionne = baux.find(b => b.id === parseInt(form.bail_id));
              const emailDisponible = !!bailSelectionne?.locataire_email;
              return (
                <div style={{background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12, padding:16, marginBottom:20}}>
                  <p style={{fontSize:14, fontWeight:600, color:'#1e40af', margin:'0 0 6px'}}>📧 Le locataire n'est pas sur place ?</p>
                  <p style={{fontSize:12, color:'#374151', margin:'0 0 12px'}}>
                    {emailDisponible
                      ? `Envoyez-lui un lien pour signer à distance à ${bailSelectionne.locataire_email}. Votre signature sera appliquée tout de suite, la sienne dès qu'il aura signé.`
                      : 'Sélectionnez un bail avec un email locataire renseigné (étape 1) pour activer l\'envoi à distance.'}
                  </p>
                  <button
                    type="button"
                    onClick={envoyerSignatureEmail}
                    disabled={!emailDisponible || !signatureBailleurEnregistree || loading}
                    style={{width:'100%', background: (!emailDisponible || !signatureBailleurEnregistree) ? '#c7d2fe' : '#4f46e5', color:'white', padding:'10px', borderRadius:10, border:'none', cursor: (!emailDisponible || !signatureBailleurEnregistree || loading) ? 'not-allowed' : 'pointer', fontWeight:600, fontSize:14}}
                  >
                    {loading ? '⏳ Envoi...' : '📧 Envoyer par email pour signature à distance'}
                  </button>
                </div>
              );
            })()}

            <div style={{display:'flex', alignItems:'center', gap:12, margin:'20px 0'}}>
              <div style={{flex:1, height:1, background:'#e5e7eb'}}></div>
              <span style={{fontSize:12, color:'#9ca3af', fontWeight:600}}>OU SIGNER SUR PLACE</span>
              <div style={{flex:1, height:1, background:'#e5e7eb'}}></div>
            </div>

            <label style={{display:'flex', alignItems:'flex-start', gap:8, fontSize:13, color:'#374151', marginBottom:16, cursor:'pointer'}}>
              <input type="checkbox" checked={locataireRefuse} onChange={e => { setLocataireRefuse(e.target.checked); if (e.target.checked) effacerSignature(); }} style={{marginTop:2}} />
              Le locataire refuse de signer l'état des lieux
            </label>

            {!locataireRefuse && (
              <div style={{marginBottom:20}}>
                <p style={{fontSize:13, fontWeight:600, color:'#374151', marginBottom:8}}>Signature du locataire :</p>
                <canvas ref={canvasRef} width={520} height={160}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                  style={{width:'100%', maxWidth:520, height:160, border:'2px dashed #d1d5db', borderRadius:10, touchAction:'none', background:'#fafafa'}} />
                <button type="button" onClick={effacerSignature} style={{background:'none', border:'none', color:'#6b7280', fontSize:12, cursor:'pointer', marginTop:6}}>
                  Effacer et recommencer
                </button>
              </div>
            )}

            <div style={{display:'flex', gap:12, marginTop:8}}>
              <button onClick={() => setEtape(4)} style={{flex:1, background:'white', color:'#6b7280', padding:'12px', borderRadius:10, border:'1px solid #e5e7eb', cursor:'pointer', fontWeight:600}}>
                ← Retour
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