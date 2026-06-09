'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';

const moisLabels = {
  1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril',
  5: 'Mai', 6: 'Juin', 7: 'Juillet', 8: 'Août',
  9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre'
};

export default function ConnexionBancaire() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [comptes, setComptes] = useState([]);
  const [accessToken, setAccessToken] = useState(null);
  const [etape, setEtape] = useState('accueil');
  const [erreur, setErreur] = useState(null);
  const [baux, setBaux] = useState([]);
  const [matchings, setMatchings] = useState([]);
  const [validationEnCours, setValidationEnCours] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth'); return; }
      setUser(data.user);
      chargerBaux(data.user.id);

      const params = new URLSearchParams(window.location.search);
      if (params.get('bridge_callback') === 'true') {
        const res = await fetch('/api/bridge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_connect_session',
            userId: data.user.id,
            userEmail: data.user.email,
          }),
        });
        const sessionData = await res.json();
        if (sessionData.access_token) {
          localStorage.setItem('bridge_token', sessionData.access_token);
          setAccessToken(sessionData.access_token);
          await chargerComptes(sessionData.access_token);
          setEtape('comptes');
        }
      }
    });
  }, []);

  async function chargerBaux(userId) {
    const { data } = await supabase
      .from('Baux')
      .select('*, Biens(nom, adresse, ville, code_postal)')
      .eq('user_id', userId)
      .eq('statut', 'actif');
    setBaux(data || []);
  }

  async function connecterBanque() {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch('/api/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_connect_session', userId: user.id, userEmail: user.email }),
      });
      const data = await res.json();
      if (data.error) { setErreur('Erreur Bridge : ' + (data.details?.message || data.error)); setLoading(false); return; }
      if (data.token) localStorage.setItem('bridge_token', data.token);
      localStorage.setItem('bridge_connected_at', Date.now().toString());
      if (data.connect_url) window.location.href = data.connect_url;
      else setErreur('Pas d\'URL de connexion reçue.');
    } catch (e) { setErreur('Erreur : ' + e.message); }
    setLoading(false);
  }

  async function chargerComptes(token) {
    setLoading(true);
    try {
      const res = await fetch('/api/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_accounts', accessToken: token }),
      });
      const data = await res.json();
      const liste = data.resources || (Array.isArray(data) ? data : []);
      const unique = liste.filter((compte, index, self) =>
        index === self.findIndex(c => c.name === compte.name)
      );
      setComptes(unique);
    } catch (e) { setErreur('Erreur comptes : ' + e.message); }
    setLoading(false);
  }

  async function analyserTransactions(accountId) {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch('/api/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_transactions', accessToken, accountId }),
      });
      const data = await res.json();
      const transactions = Array.isArray(data.resources) ? data.resources : Array.isArray(data) ? data : [];
      const matches = detecterLoyers(transactions, baux);
      setMatchings(matches);
      setEtape('succes');
    } catch (e) {
      setErreur('Erreur analyse : ' + e.message);
      setEtape('succes');
    }
    setLoading(false);
  }

  function detecterLoyers(transactions, baux) {
    const matches = [];
    const maintenant = new Date();
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    for (const tx of transactions) {
      if (tx.amount <= 0) continue;
      const dateTx = new Date(tx.date || tx.transaction_date);
      if (dateTx < debutMois) continue;
      for (const bail of baux) {
        const loyer = parseFloat(bail.loyer_hc) + parseFloat(bail.charges || 0);
        const tolerance = loyer * 0.02;
        if (Math.abs(tx.amount - loyer) <= tolerance) {
          const libelle = (tx.label || tx.description || '').toLowerCase();
          const nomLocataire = (bail.locataire_nom || '').toLowerCase();
          const scoreNom = nomLocataire && libelle.includes(nomLocataire) ? 2 : 0;
          matches.push({ transaction: tx, bail, score: scoreNom + 1, confiance: scoreNom > 0 ? 'haute' : 'moyenne' });
          break;
        }
      }
    }
    return matches.sort((a, b) => b.score - a.score);
  }

  function genererPDFQuittance(bail, mois, annee, datePaiement) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const montantTotal = (bail.loyer_hc || 0) + (bail.charges || 0);
    const periode = `${moisLabels[mois]} ${annee}`;
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('QUITTANCE DE LOYER', pageWidth / 2, 22, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    let y = 50;
    doc.setFillColor(243, 244, 246);
    doc.rect(14, y - 6, pageWidth - 28, 36, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Période :', 18, y); doc.setFont('helvetica', 'normal'); doc.text(periode, 55, y); y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Bien :', 18, y); doc.setFont('helvetica', 'normal'); doc.text(bail.Biens?.nom || '', 55, y); y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Locataire :', 18, y); doc.setFont('helvetica', 'normal'); doc.text(`${bail.locataire_prenom} ${bail.locataire_nom}`, 55, y); y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Date paiement :', 18, y); doc.setFont('helvetica', 'normal'); doc.text(new Date(datePaiement).toLocaleDateString('fr-FR'), 55, y);
    y += 20;
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
    doc.text('DÉTAIL DU LOYER', 14, y); y += 10;
    doc.setTextColor(0, 0, 0); doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text(`Loyer hors charges : ${bail.loyer_hc}€`, 18, y); y += 8;
    doc.text(`Charges : ${bail.charges || 0}€`, 18, y); y += 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text(`Total réglé : ${montantTotal}€`, 18, y); y += 20;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
    const texte = `Je soussigné(e), ${bail.bailleur_prenom || ''} ${bail.bailleur_nom || ''}, propriétaire du logement désigné ci-dessus, déclare avoir reçu de ${bail.locataire_prenom} ${bail.locataire_nom} la somme de ${montantTotal} euros au titre du loyer et des charges du mois de ${periode}.`;
    const lines = doc.splitTextToSize(texte, pageWidth - 28);
    doc.text(lines, 14, y); y += lines.length * 6 + 20;
    doc.setTextColor(0, 0, 0); doc.setDrawColor(200, 200, 200);
    doc.line(14, y, 90, y);
    doc.setFontSize(9); doc.setTextColor(150, 150, 150);
    doc.text('Signature du propriétaire', 14, y + 5);
    doc.setFontSize(8);
    doc.text('Document généré par GestionLocative.fr', pageWidth / 2, 290, { align: 'center' });
    return doc.output('datauristring').split(',')[1];
  }

  async function simulerVirement() {
    if (baux.length === 0) { alert('Aucun bail actif trouvé'); return; }
    const bail = baux[0];
    await validerLoyer({
      transaction: {
        amount: parseFloat(bail.loyer_hc) + parseFloat(bail.charges || 0),
        date: new Date().toISOString().split('T')[0],
        label: `VIR ${bail.locataire_nom} LOYER`,
      },
      bail,
      confiance: 'haute',
    });
  }

  async function validerLoyer(matching) {
    setValidationEnCours(matching.bail.id);
    const mois = new Date().getMonth() + 1;
    const annee = new Date().getFullYear();
    const datePaiement = matching.transaction.date || new Date().toISOString().split('T')[0];

    const { data: existant } = await supabase
      .from('Documents')
      .select('id')
      .eq('bail_id', matching.bail.id)
      .eq('categorie', 'Quittance')
      .eq('annee', annee)
      .like('nom_fichier', `%${moisLabels[mois]}%`);
    if (existant && existant.length > 0) {
      alert('Une quittance existe déjà pour ce bail ce mois !');
      setValidationEnCours(null);
      return;
    }

    await supabase.from('Paiements').insert({
      bail_id: matching.bail.id,
      user_id: user.id,
      montant: matching.transaction.amount,
      date_paiement: datePaiement,
      mois, annee,
      statut: 'paye',
      source: 'bridge_auto',
      libelle_virement: matching.transaction.label,
    });

    const pdfBase64 = genererPDFQuittance(matching.bail, mois, annee, datePaiement);
    const nomFichier = `Quittance_${moisLabels[mois]}_${annee}_${matching.bail.locataire_nom}.pdf`;

    try {
      const pdfBlob = new Blob([Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))], { type: 'application/pdf' });
      const path = `${user.id}/${matching.bail.bien_id}/Quittance/${nomFichier}`;
      await supabase.storage.from('documents').upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true });
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
      await supabase.from('Documents').insert({
        user_id: user.id,
        bien_id: matching.bail.bien_id,
        bail_id: matching.bail.id,
        nom_fichier: nomFichier,
        categorie: 'Quittance',
        annee,
        storage_path: path,
        url: urlData.publicUrl,
      });
    } catch (e) { console.error('Erreur upload coffre:', e); }

    if (matching.bail.locataire_email) {
      try {
        await fetch('/api/send-quittance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locataireEmail: matching.bail.locataire_email,
            locataireNom: matching.bail.locataire_nom,
            locatairePrenom: matching.bail.locataire_prenom,
            bienNom: matching.bail.Biens?.nom,
            periode: `${moisLabels[mois]} ${annee}`,
            montant: (matching.bail.loyer_hc || 0) + (matching.bail.charges || 0),
            pdfBase64,
            proprietaireNom: `${matching.bail.bailleur_prenom || ''} ${matching.bail.bailleur_nom || ''}`,
          }),
        });
      } catch (e) { console.error('Erreur envoi email:', e); }
    }

    setMatchings(prev => prev.filter(m => m !== matching));
    setSuccessMessage(`✅ Loyer validé, quittance générée${matching.bail.locataire_email ? ' et envoyée par email' : ''} !`);
    setTimeout(() => setSuccessMessage(null), 5000);
    setValidationEnCours(null);
  }

  const nav = (
    <nav style={{ background: '#1e3a5f', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span onClick={() => router.push('/dashboard')} style={{ color: 'white', fontWeight: 700, fontSize: 18, cursor: 'pointer' }}>GestionLocative</span>
      <div style={{ display: 'flex', gap: 24 }}>
        {[['Baux actifs', '/dashboard'], ['Mes Baux', '/baux'], ['Mes Biens', '/biens'], ['Mon Compte', '/compte'], ['Documents', '/documents']].map(([label, href]) => (
          <span key={href} onClick={() => router.push(href)} style={{ color: '#93c5fd', cursor: 'pointer', fontSize: 14 }}>{label}</span>
        ))}
      </div>
    </nav>
  );

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {nav}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>

        {successMessage && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <p style={{ margin: 0, fontWeight: 600, color: '#15803d' }}>{successMessage}</p>
          </div>
        )}

        {etape === 'accueil' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🏦</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Connexion bancaire</h1>
            <p style={{ color: '#6b7280', fontSize: 16, marginBottom: 8 }}>
              Connectez votre compte bancaire pour détecter automatiquement les virements de loyer.
            </p>
            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 40 }}>
              🔒 Connexion sécurisée via Bridge — agréé ACPR — lecture seule, aucun virement possible
            </p>
            {baux.length === 0 ? (
              <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 12, padding: 20, marginBottom: 32 }}>
                <p style={{ color: '#854d0e', margin: 0 }}>⚠️ Vous n'avez aucun bail actif.</p>
              </div>
            ) : (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, marginBottom: 32, textAlign: 'left' }}>
                <p style={{ color: '#166534', fontWeight: 600, marginBottom: 8 }}>✅ {baux.length} bail(s) actif(s) détecté(s)</p>
                {baux.map(bail => (
                  <div key={bail.id} style={{ color: '#15803d', fontSize: 13, marginBottom: 4 }}>
                    • {bail.locataire_prenom} {bail.locataire_nom} — {bail.Biens?.nom} — {parseFloat(bail.loyer_hc) + parseFloat(bail.charges || 0)}€/mois
                    {!bail.locataire_email && <span style={{ color: '#f59e0b', marginLeft: 8 }}>⚠️ Pas d'email locataire</span>}
                  </div>
                ))}
              </div>
            )}
            {erreur && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: 12, marginBottom: 24, color: '#dc2626', fontSize: 13, textAlign: 'left' }}>
                {erreur}
              </div>
            )}
            <button onClick={connecterBanque} disabled={loading || baux.length === 0}
              style={{ background: loading || baux.length === 0 ? '#9ca3af' : '#2563eb', color: 'white', padding: '14px 32px', borderRadius: 10, border: 'none', cursor: loading || baux.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 16 }}>
              {loading ? '⏳ Connexion en cours...' : '🔗 Connecter ma banque'}
            </button>
            <div style={{ marginTop: 16 }}>
              <button onClick={simulerVirement}
                style={{ background: '#f3f4f6', color: '#6b7280', padding: '10px 20px', borderRadius: 10, border: '1px dashed #d1d5db', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                🧪 Simuler un virement (test dev)
              </button>
            </div>
          </div>
        )}

        {etape === 'comptes' && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Vos comptes bancaires</h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>Sélectionnez le compte sur lequel vous recevez les loyers.</p>
            {loading && <p style={{ color: '#6b7280' }}>⏳ Chargement des comptes...</p>}
            {comptes.map(compte => (
              <div key={compte.id} onClick={() => analyserTransactions(compte.id)}
                style={{ background: 'white', border: '2px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 12, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#2563eb'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#e5e7eb'}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{compte.name || compte.bank_name || 'Compte bancaire'}</div>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>{compte.iban || compte.number || ''}</div>
                </div>
                <div style={{ fontWeight: 700, color: '#2563eb', fontSize: 18 }}>{compte.balance != null ? `${compte.balance}€` : '→'}</div>
              </div>
            ))}
          </div>
        )}

        {etape === 'succes' && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Virements détectés ce mois</h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>Validez les loyers — la quittance sera générée et envoyée automatiquement.</p>
            {matchings.length === 0 ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <p style={{ color: '#166534', fontWeight: 600 }}>Aucun loyer en attente détecté ce mois.</p>
              </div>
            ) : (
              matchings.map((m, i) => (
                <div key={i} style={{ background: 'white', border: `2px solid ${m.confiance === 'haute' ? '#bbf7d0' : '#fde68a'}`, borderRadius: 12, padding: 20, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{m.bail.locataire_prenom} {m.bail.locataire_nom}</div>
                      <div style={{ color: '#6b7280', fontSize: 13 }}>{m.bail.Biens?.nom}</div>
                      <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Libellé : {m.transaction.label || 'N/A'}</div>
                      <div style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>
                        📧 {m.bail.locataire_email || <span style={{ color: '#f59e0b' }}>Pas d'email — quittance sans envoi</span>}
                      </div>
                      <span style={{ background: m.confiance === 'haute' ? '#dcfce7' : '#fef9c3', color: m.confiance === 'haute' ? '#166534' : '#854d0e', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, display: 'inline-block', marginTop: 8 }}>
                        {m.confiance === 'haute' ? '✅ Confiance haute' : '⚠️ Confiance moyenne'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#2563eb', fontSize: 22 }}>{m.transaction.amount}€</div>
                      <div style={{ color: '#9ca3af', fontSize: 12 }}>{m.transaction.date}</div>
                      <button onClick={() => validerLoyer(m)} disabled={validationEnCours === m.bail.id}
                        style={{ marginTop: 8, background: validationEnCours === m.bail.id ? '#9ca3af' : '#2563eb', color: 'white', padding: '8px 16px', borderRadius: 8, border: 'none', cursor: validationEnCours === m.bail.id ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}>
                        {validationEnCours === m.bail.id ? '⏳ En cours...' : '✅ Valider + Quittance'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
            <button onClick={() => { setEtape('accueil'); setMatchings([]); }}
              style={{ marginTop: 16, background: 'white', color: '#6b7280', padding: '10px 20px', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 14 }}>
              ← Retour
            </button>
          </div>
        )}
      </div>
    </main>
  );
}