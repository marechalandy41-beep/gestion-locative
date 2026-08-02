'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import { genererCorpsEDL } from '@/lib/pdfEdlExtras'
import Nav from '../../components/nav'

export default function DetailEDL() {
  const router = useRouter();
  const [edl, setEdl] = useState(null);
  const [edlComparaison, setEdlComparaison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    const id = window.location.pathname.split('/').pop();
    chargerEDL(id);
  }, []);

  async function chargerEDL(id) {
    const { data, error } = await supabase
      .from('EtatsDesLieux')
      .select('*, bail:bail_id(id, locataire_prenom, locataire_nom, locataire_email, bailleur_prenom, bailleur_nom, bailleur_type, bailleur_denomination, Biens(id, nom, adresse)), Biens:bien_id(id, nom, adresse)')
      .eq('id', id)
      .single();

    setEdl(data);

    if (data) {
      const typeComparaison = data.type === 'entree' ? 'sortie' : 'entree';
      let requeteComp = supabase
        .from('EtatsDesLieux')
        .select('*')
        .eq('type', typeComparaison)
        .order('created_at', { ascending: false })
        .limit(1)

      requeteComp = data.bail_id
        ? requeteComp.eq('bail_id', data.bail_id)
        : requeteComp.eq('bien_id', data.bien_id)

      const { data: comp } = await requeteComp.single();
      setEdlComparaison(comp);
    }
    setLoading(false);
  }

  function afficherToast(msg, succes = true) {
    setToastMsg({ msg, succes });
    setTimeout(() => setToastMsg(null), 4000);
  }

  async function relancerSignatureEDL() {
    if (!edl.token_signature) { afficherToast('❌ Aucune signature à distance en cours pour cet état des lieux.', false); return; }
    const locataireEmail = edl.bail?.locataire_email;
    if (!locataireEmail) { afficherToast('❌ Email du locataire manquant.', false); return; }
    if (!confirm(`Renvoyer le lien de signature à ${locataireEmail} ?`)) return;
    setSaving(true);
    try {
      const res = await fetch('/api/send-signature-edl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: edl.token_signature,
          locataireEmail,
          locataireNom: `${edl.bail?.locataire_prenom || ''} ${edl.bail?.locataire_nom || ''}`,
          proprietaireNom: edl.bail?.bailleur_type === 'morale' ? edl.bail.bailleur_denomination : `${edl.bail?.bailleur_prenom || ''} ${edl.bail?.bailleur_nom || ''}`,
          bienNom: edl.bail?.Biens?.nom || edl.Biens?.nom || '',
          typeEdl: edl.type,
        }),
      });
      const data = await res.json();
      if (data.success) afficherToast('✅ Lien de signature renvoyé au locataire !', true);
      else afficherToast('❌ Erreur : ' + data.error, false);
    } catch (err) {
      afficherToast('❌ Erreur : ' + err.message, false);
    } finally {
      setSaving(false);
    }
  }

  function couleurEtat(etat) {
    if (etat === 'Très bon état') return { color: '#15803d', bg: '#dcfce7' };
    if (etat === 'Bon état') return { color: '#1d4ed8', bg: '#dbeafe' };
    if (etat === 'État moyen') return { color: '#854d0e', bg: '#fef9c3' };
    return { color: '#dc2626', bg: '#fef2f2' };
  }

  async function construirePDF() {
    const doc = new jsPDF();

    await genererCorpsEDL(doc, {
      type: edl.type,
      date_edl: edl.date_edl,
      bienNom: edl.bail?.Biens?.nom || edl.Biens?.nom || '',
      locataireNom: edl.bail ? `${edl.bail.locataire_prenom || ''} ${edl.bail.locataire_nom || ''}` : '—',
      pieces: edl.pieces,
      compteurs: edl.compteurs,
      observations: edl.observations,
      signatureBailleur: edl.signature_bailleur,
      signatureLocataire: edl.signature_locataire,
      locataireRefuse: edl.locataire_refuse_signature,
    });

    return doc;
  }

  async function telechargerEtSauvegarder() {
    if (saving) return;
    setSaving(true);

    try {
      const doc = await construirePDF();
      const nomFichier = `EDL_${edl.type}_${edl.bail?.Biens?.nom || edl.Biens?.nom || 'bien'}_${edl.date_edl}.pdf`;

      // Téléchargement local
      doc.save(nomFichier);

      // Upload dans le coffre-fort
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const bienId = edl.bail?.Biens?.id || edl.Biens?.id || edl.bien_id;
      if (!bienId) throw new Error('Bien introuvable');

      const pdfBlob = doc.output('blob');
      const cheminStorage = `${user.id}/${bienId}/Etat des lieux/${nomFichier}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(cheminStorage, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(cheminStorage);

      const { error: insertError } = await supabase
  .from('Documents')
  .insert({
    user_id: user.id,
    bien_id: bienId,
    nom_fichier: nomFichier,
    categorie: edl.type === 'entree' ? 'État des lieux entrée' : 'État des lieux sortie',
    url: urlData.publicUrl,
    storage_path: cheminStorage,
    annee: new Date(edl.date_edl).getFullYear(),
  });

      if (insertError) throw insertError;

      afficherToast('✅ PDF téléchargé et sauvegardé dans le coffre-fort !', true);

    } catch (err) {
  console.error('ERREUR COMPLETE:', JSON.stringify(err));
  afficherToast('❌ Erreur lors de la sauvegarde : ' + (err?.message || JSON.stringify(err)), false);
} finally {
      setSaving(false);
    }
  }

  async function telechargerSeulement() {
    const doc = await construirePDF();
    const nomFichier = `EDL_${edl.type}_${edl.bail?.Biens?.nom || edl.Biens?.nom || 'bien'}_${edl.date_edl}.pdf`;
    doc.save(nomFichier);
  }

  async function supprimerEDL() {
    if (!confirm('Supprimer définitivement cet état des lieux ?')) return;
    if (!confirm('Cette action est irréversible. Confirmer la suppression ?')) return;

    const { error } = await supabase.from('EtatsDesLieux').delete().eq('id', edl.id);
    if (error) {
      afficherToast('❌ Erreur : ' + error.message, false);
      return;
    }
    window.location.href = '/etats-des-lieux';
  }

  const nav = (
    <Nav pageCourante="documents" />
  );

  if (loading) return <main style={{minHeight:'100vh', background:'#f9fafb'}}>{nav}<p style={{textAlign:'center', padding:60, color:'#6b7280'}}>Chargement...</p></main>;
  if (!edl) return <main style={{minHeight:'100vh', background:'#f9fafb'}}>{nav}<p style={{textAlign:'center', padding:60, color:'#dc2626'}}>EDL introuvable</p></main>;

  const pieces = Array.isArray(edl.pieces) ? edl.pieces : [];
  const piecesComp = edlComparaison && Array.isArray(edlComparaison.pieces) ? edlComparaison.pieces : [];
  const estFinalise = edl.statut === 'finalise';

  return (
    <main style={{minHeight:'100vh', background:'#f9fafb'}}>
      {nav}

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position:'fixed', top:24, right:24, zIndex:9999,
          background: toastMsg.succes ? '#dcfce7' : '#fef2f2',
          color: toastMsg.succes ? '#15803d' : '#dc2626',
          border: `1px solid ${toastMsg.succes ? '#86efac' : '#fca5a5'}`,
          borderRadius:12, padding:'14px 20px', fontWeight:600, fontSize:14,
          boxShadow:'0 4px 12px rgba(0,0,0,0.1)',
        }}>
          {toastMsg.msg}
        </div>
      )}

      <div style={{maxWidth:1000, margin:'0 auto', padding:'32px 24px'}}>

        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:32}}>
          <div>
            <div style={{display:'flex', gap:10, alignItems:'center', marginBottom:8}}>
              <span style={{background: edl.type === 'entree' ? '#dbeafe' : '#fce7f3', color: edl.type === 'entree' ? '#1d4ed8' : '#be185d', fontSize:13, fontWeight:700, padding:'4px 12px', borderRadius:999}}>
                {edl.type === 'entree' ? '🔑 État des lieux d\'entrée' : '🚪 État des lieux de sortie'}
              </span>
              <span style={{
                background: estFinalise ? '#dcfce7' : edl.statut === 'attente_signature' ? '#fef3c7' : '#fef9c3',
                color: estFinalise ? '#15803d' : edl.statut === 'attente_signature' ? '#92400e' : '#854d0e',
                fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:999
              }}>
                {estFinalise ? '✅ Finalisé' : edl.statut === 'attente_signature' ? '✉️ En attente de signature' : '📝 Brouillon'}
              </span>
            </div>
            <h1 style={{fontSize:22, fontWeight:700, color:'#111827'}}>{edl.bail?.Biens?.nom}</h1>
            <p style={{color:'#6b7280', fontSize:14, marginTop:4}}>
              {edl.bail?.locataire_prenom} {edl.bail?.locataire_nom} — {new Date(edl.date_edl).toLocaleDateString('fr-FR')}
            </p>
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end'}}>
            <button
              onClick={supprimerEDL}
              style={{background:'white', color:'#dc2626', padding:'8px 16px', borderRadius:10, border:'1px solid #fecaca', cursor:'pointer', fontWeight:600, fontSize:13}}
            >
              🗑 Supprimer
            </button>
            {edl.statut === 'attente_signature' && (
              <button
                onClick={relancerSignatureEDL}
                disabled={saving}
                style={{background: saving ? '#fde68a' : '#f59e0b', color:'white', padding:'10px 20px', borderRadius:10, border:'none', cursor: saving ? 'not-allowed' : 'pointer', fontWeight:600, fontSize:14, display:'flex', alignItems:'center', gap:8}}
              >
                {saving ? '⏳ Envoi...' : '✉️ Relancer pour signature'}
              </button>
            )}
            {estFinalise ? (
              <button
                onClick={telechargerEtSauvegarder}
                disabled={saving}
                style={{background: saving ? '#93c5fd' : '#2563eb', color:'white', padding:'10px 20px', borderRadius:10, border:'none', cursor: saving ? 'not-allowed' : 'pointer', fontWeight:600, fontSize:14, display:'flex', alignItems:'center', gap:8}}
              >
                {saving ? '⏳ Sauvegarde...' : '📄 Télécharger & Sauvegarder'}
              </button>
            ) : (
              <>
                <button
                  onClick={telechargerSeulement}
                  style={{background:'white', color:'#2563eb', padding:'10px 20px', borderRadius:10, border:'1px solid #2563eb', cursor:'pointer', fontWeight:600, fontSize:14, display:'flex', alignItems:'center', gap:8}}
                >
                  📄 Télécharger PDF
                </button>
                <p style={{fontSize:12, color:'#9ca3af', textAlign:'right'}}>Finalisez l'EDL pour le sauvegarder dans le coffre-fort</p>
              </>
            )}
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