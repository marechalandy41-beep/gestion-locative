'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { useRouter } from 'next/navigation';

export default function DetailEDL() {
  const router = useRouter();
  const [edl, setEdl] = useState(null);
  const [edlComparaison, setEdlComparaison] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = window.location.pathname.split('/').pop();
    console.log('ID récupéré:', id);
    chargerEDL(id);
  }, []);

  async function chargerEDL(id) {
    console.log('Chargement EDL id:', id);
    const { data, error } = await supabase
      .from('EtatsDesLieux')
      .select('*, bail:bail_id(id, locataire_prenom, locataire_nom, Biens(nom, adresse))')
      .eq('id', id)
      .single();
    console.log('Résultat:', data, 'Erreur:', error);

    setEdl(data);

    if (data) {
      const typeComparaison = data.type === 'entree' ? 'sortie' : 'entree';
      const { data: comp } = await supabase
        .from('EtatsDesLieux')
        .select('*')
        .eq('bail_id', data.bail_id)
        .eq('type', typeComparaison)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      setEdlComparaison(comp);
    }
    setLoading(false);
  }

  function couleurEtat(etat) {
    if (etat === 'Très bon état') return { color: '#15803d', bg: '#dcfce7' };
    if (etat === 'Bon état') return { color: '#1d4ed8', bg: '#dbeafe' };
    if (etat === 'État moyen') return { color: '#854d0e', bg: '#fef9c3' };
    return { color: '#dc2626', bg: '#fef2f2' };
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

  if (loading) return <main style={{minHeight:'100vh', background:'#f9fafb'}}>{nav}<p style={{textAlign:'center', padding:60, color:'#6b7280'}}>Chargement...</p></main>;
  if (!edl) return <main style={{minHeight:'100vh', background:'#f9fafb'}}>{nav}<p style={{textAlign:'center', padding:60, color:'#dc2626'}}>EDL introuvable</p></main>;

  const pieces = Array.isArray(edl.pieces) ? edl.pieces : [];
  const piecesComp = edlComparaison && Array.isArray(edlComparaison.pieces) ? edlComparaison.pieces : [];

  return (
    <main style={{minHeight:'100vh', background:'#f9fafb'}}>
      {nav}
      <div style={{maxWidth:1000, margin:'0 auto', padding:'32px 24px'}}>

        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:32}}>
          <div>
            <div style={{display:'flex', gap:10, alignItems:'center', marginBottom:8}}>
              <span style={{background: edl.type === 'entree' ? '#dbeafe' : '#fce7f3', color: edl.type === 'entree' ? '#1d4ed8' : '#be185d', fontSize:13, fontWeight:700, padding:'4px 12px', borderRadius:999}}>
                {edl.type === 'entree' ? '🔑 État des lieux d\'entrée' : '🚪 État des lieux de sortie'}
              </span>
              <span style={{background: edl.statut === 'finalise' ? '#dcfce7' : '#fef9c3', color: edl.statut === 'finalise' ? '#15803d' : '#854d0e', fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:999}}>
                {edl.statut === 'finalise' ? '✅ Finalisé' : '📝 Brouillon'}
              </span>
            </div>
            <h1 style={{fontSize:22, fontWeight:700, color:'#111827'}}>{edl.bail?.Biens?.nom}</h1>
            <p style={{color:'#6b7280', fontSize:14, marginTop:4}}>
              {edl.bail?.locataire_prenom} {edl.bail?.locataire_nom} — {new Date(edl.date_edl).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        {edlComparaison && (
          <div style={{background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12, padding:16, marginBottom:24}}>
            <p style={{color:'#1d4ed8', fontWeight:600, fontSize:14}}>
              🔄 Comparaison disponible avec l'état des lieux d'{edlComparaison.type === 'entree' ? 'entrée' : 'sortie'} du {new Date(edlComparaison.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
        )}

        {edl.compteurs && Object.values(edl.compteurs).some(v => v) && (
          <div style={{background:'white', borderRadius:16, border:'1px solid #f3f4f6', padding:24, marginBottom:24}}>
            <h2 style={{fontSize:16, fontWeight:700, color:'#111827', marginBottom:16}}>📊 Relevés de compteurs</h2>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12}}>
              {[['eau_froide', '💧 Eau froide', 'm³'], ['eau_chaude', '🔥 Eau chaude', 'm³'], ['electricite', '⚡ Électricité', 'kWh'], ['gaz', '🔵 Gaz', 'm³'], ['chauffage', '🌡️ Chauffage', '']].map(([key, label, unit]) => (
                edl.compteurs[key] ? (
                  <div key={key} style={{background:'#f9fafb', borderRadius:10, padding:12}}>
                    <p style={{fontSize:12, color:'#6b7280'}}>{label}</p>
                    <p style={{fontSize:18, fontWeight:700, color:'#111827', marginTop:4}}>{edl.compteurs[key]} {unit}</p>
                    {edlComparaison?.compteurs?.[key] && (
                      <p style={{fontSize:11, color:'#6b7280', marginTop:2}}>
                        Entrée : {edlComparaison.compteurs[key]} {unit} → Conso : {edl.compteurs[key] - edlComparaison.compteurs[key]} {unit}
                      </p>
                    )}
                  </div>
                ) : null
              ))}
            </div>
          </div>
        )}

        <div style={{background:'white', borderRadius:16, border:'1px solid #f3f4f6', padding:24, marginBottom:24}}>
          <h2 style={{fontSize:16, fontWeight:700, color:'#111827', marginBottom:16}}>🏠 État des pièces</h2>
          {pieces.length === 0 ? (
            <p style={{color:'#9ca3af', fontSize:14}}>Aucune pièce renseignée</p>
          ) : (
            pieces.map((piece, i) => {
              const c = couleurEtat(piece.etat);
              const pieceComp = piecesComp.find(p => p.nom === piece.nom);
              const etatChange = pieceComp && pieceComp.etat !== piece.etat;
              return (
                <div key={i} style={{borderBottom:'1px solid #f3f4f6', paddingBottom:16, marginBottom:16}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                    <h3 style={{fontWeight:600, color:'#111827', fontSize:15}}>{piece.nom}</h3>
                    <div style={{display:'flex', gap:8, alignItems:'center'}}>
                      {etatChange && (
                        <span style={{fontSize:11, color:'#854d0e', background:'#fef9c3', padding:'2px 8px', borderRadius:999}}>
                          ⚠️ {pieceComp.etat} → {piece.etat}
                        </span>
                      )}
                      <span style={{background: c.bg, color: c.color, fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:999}}>
                        {piece.etat}
                      </span>
                    </div>
                  </div>
                  {piece.commentaire && <p style={{color:'#6b7280', fontSize:13, marginBottom:8}}>{piece.commentaire}</p>}
                  {piece.photos && piece.photos.length > 0 && (
                    <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                      {piece.photos.map((url, j) => (
                        <img key={j} src={url} alt="" style={{width:80, height:80, objectFit:'cover', borderRadius:8, border:'1px solid #e5e7eb', cursor:'pointer'}} onClick={() => window.open(url)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {edl.observations && (
          <div style={{background:'white', borderRadius:16, border:'1px solid #f3f4f6', padding:24, marginBottom:24}}>
            <h2 style={{fontSize:16, fontWeight:700, color:'#111827', marginBottom:12}}>📝 Observations générales</h2>
            <p style={{color:'#374151', fontSize:14, lineHeight:1.6}}>{edl.observations}</p>
          </div>
        )}

      </div>
    </main>
  );
}