'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useRouter } from 'next/navigation';
import Nav from '../components/nav'

export default function etatsdeslieux() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [edls, setEdls] = useState([]);
  const [baux, setBaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false)

useEffect(() => {
  const check = () => setIsMobile(window.innerWidth < 768)
  check()
  window.addEventListener('resize', check)
  return () => window.removeEventListener('resize', check)
}, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth'); return; }
      setUser(data.user);
      chargerDonnees(data.user.id);
    });
  }, []);

  async function chargerDonnees(userId) {
    const { data: edlData } = await supabase
      .from('etatsdeslieux')
      .select('*, bail:bail_id(id, locataire_prenom, locataire_nom, Biens(nom))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const { data: bauxData } = await supabase
      .from('Baux')
      .select('id, locataire_prenom, locataire_nom, Biens(nom)')
      .eq('user_id', userId)
      .eq('statut', 'actif');

    setEdls(edlData || []);
    setBaux(bauxData || []);
    setLoading(false);
  }

  async function chargerDonnees(userId) {
  console.log('Chargement EDL pour user:', userId);
  const { data: edlData, error } = await supabase
    .from('EtatsDesLieux')
    .select('*, bail:bail_id(id, locataire_prenom, locataire_nom, Biens(nom))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  console.log('EDL data:', edlData, 'Erreur:', error);

  const { data: bauxData } = await supabase
    .from('Baux')
    .select('id, locataire_prenom, locataire_nom, Biens(nom)')
    .eq('user_id', userId)
    .in('statut', ['actif', 'brouillon']);

  setEdls(edlData || []);
  setBaux(bauxData || []);
  setLoading(false);
}

  const nav = (
  <Nav pageCourante="documents" />
);

  return (
    <main style={{minHeight:'100vh', background:'#f9fafb'}}>
      {nav}
      <div style={{maxWidth:1280, margin:'0 auto', padding: isMobile ? '16px' : '32px 24px'}}>

        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:32}}>
          <div>
            <h1 style={{fontSize:24, fontWeight:700, color:'#111827'}}>États des lieux</h1>
            <p style={{color:'#6b7280', fontSize:14, marginTop:4}}>Gérez vos états des lieux d'entrée et de sortie</p>
          </div>
          <button
            onClick={() => router.push('/etats-des-lieux/nouveau')}
            style={{background:'#2563eb', color:'white', padding:'10px 20px', borderRadius:12, fontWeight:600, fontSize:14, border:'none', cursor:'pointer'}}
          >
            + Nouvel état des lieux
          </button>
        </div>

        {loading ? (
          <p style={{textAlign:'center', color:'#6b7280', padding:40}}>Chargement...</p>
        ) : edls.length === 0 ? (
          <div style={{textAlign:'center', padding:60, background:'white', borderRadius:20, border:'1px solid #f3f4f6'}}>
            <p style={{fontSize:48, marginBottom:16}}>🏠</p>
            <p style={{fontSize:16, fontWeight:600, color:'#111827'}}>Aucun état des lieux</p>
            <p style={{color:'#6b7280', fontSize:14, marginTop:4}}>Créez votre premier état des lieux d'entrée</p>
            <button
              onClick={() => router.push('/etats-des-lieux/nouveau')}
              style={{marginTop:20, background:'#2563eb', color:'white', padding:'10px 24px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:600, fontSize:14}}
            >
              + Nouvel état des lieux
            </button>
          </div>
        ) : (
          <div style={{display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: isMobile ? 16 : 20}}>
            {edls.map(edl => (
              <div
                key={edl.id}
                onClick={() => router.push(`/etats-des-lieux/${edl.id}`)}
                style={{background:'white', borderRadius:16, border:'1px solid #f3f4f6', padding:20, cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}
                onMouseOver={e => e.currentTarget.style.borderColor = '#2563eb'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#f3f4f6'}
              >
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12}}>
                  <span style={{
                    background: edl.type === 'entree' ? '#dbeafe' : '#fce7f3',
                    color: edl.type === 'entree' ? '#1d4ed8' : '#be185d',
                    fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:999, textTransform:'uppercase'
                  }}>
                    {edl.type === 'entree' ? '🔑 Entrée' : '🚪 Sortie'}
                  </span>
                  <span style={{
                    background: edl.statut === 'finalise' ? '#dcfce7' : '#fef9c3',
                    color: edl.statut === 'finalise' ? '#15803d' : '#854d0e',
                    fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:999
                  }}>
                    {edl.statut === 'finalise' ? '✅ Finalisé' : '📝 Brouillon'}
                  </span>
                </div>
                <h3 style={{fontWeight:600, color:'#111827', fontSize:15, marginBottom:4}}>
                  {edl.bail?.Biens?.nom || 'Bien inconnu'}
                </h3>
                <p style={{color:'#6b7280', fontSize:13}}>
                  {edl.bail?.locataire_prenom} {edl.bail?.locataire_nom}
                </p>
                <p style={{color:'#9ca3af', fontSize:12, marginTop:8}}>
                  {new Date(edl.date_edl).toLocaleDateString('fr-FR')}
                </p>
                <p style={{color:'#6b7280', fontSize:12, marginTop:4}}>
                  {Array.isArray(edl.pieces) ? edl.pieces.length : 0} pièce(s) renseignée(s)
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}