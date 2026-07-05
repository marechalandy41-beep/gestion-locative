'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../supabase'
import jsPDF from 'jspdf'
import Nav from '../../components/nav'

export default function RecapFiscal() {
  const [user, setUser] = useState(null)
  const [biens, setBiens] = useState([])
  const [baux, setBaux] = useState([])
  const [paiements, setPaiements] = useState([])
  const [annee, setAnnee] = useState(new Date().getFullYear() - 1)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [sauvegarde, setSauvegarde] = useState(false)
  const [chargesParBien, setChargesParBien] = useState({})
  const [showChargesForm, setShowChargesForm] = useState({})
  const [uploadingJustif, setUploadingJustif] = useState({})
  const [justificatifsParBien, setJustificatifsParBien] = useState({})
  const [showJustifModal, setShowJustifModal] = useState({})
const [categorieJustif, setCategorieJustif] = useState({})
  const [chargesSauvegardees, setChargesSauvegardees] = useState({})

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/auth'; return }
    setUser(user)
    const { data: biensData } = await supabase.from('Biens').select('*').eq('user_id', user.id)
    const { data: bauxData } = await supabase.from('Baux').select('*, Biens(*)').eq('user_id', user.id)
    const { data: paiementsData } = await supabase.from('Paiements').select('*, Baux(*, Biens(*))').eq('user_id', user.id)
    setBiens(biensData || [])
    setBaux(bauxData || [])
    setPaiements(paiementsData || [])

    // Charger les charges fiscales sauvegardées
    const { data: chargesData } = await supabase
      .from('charges_fiscales')
      .select('*')
      .eq('user_id', user.id)
    if (chargesData) {
      const parBien = {}
      chargesData.forEach(c => {
        if (!parBien[c.bien_id]) parBien[c.bien_id] = {}
        parBien[c.bien_id][c.annee] = {
          taxe_fonciere: c.taxe_fonciere?.toString() || '',
          assurance: c.assurance?.toString() || '',
          travaux: c.travaux?.toString() || '',
          frais_gestion: c.frais_gestion?.toString() || '',
          interets_emprunt: c.interets_emprunt?.toString() || '',
          autres: c.autres?.toString() || '',
        }
      })
      // Initialiser chargesParBien avec les données de l'année sélectionnée
      const initCharges = {}
      Object.keys(parBien).forEach(bienId => {
        initCharges[parseInt(bienId)] = parBien[parseInt(bienId)][annee] || {}
      })
      setChargesParBien(initCharges)
    }

    // Charger les justificatifs déjà uploadés par bien
    const { data: docsData } = await supabase
      .from('Documents')
      .select('*')
      .eq('user_id', user.id)
      .eq('categorie', 'Factures travaux')
    if (docsData) {
      const parBien = {}
      docsData.forEach(d => {
        if (!parBien[d.bien_id]) parBien[d.bien_id] = []
        parBien[d.bien_id].push(d)
      })
      setJustificatifsParBien(parBien)
    }
    setLoading(false)
  }

  const paiementsFiltres = paiements.filter(p => p.annee === annee)

  function statsBien(bienId) {
    const bauxBien = baux.filter(b => b.bien_id === bienId)
    const paiementsBien = paiementsFiltres.filter(p => p.Baux?.bien_id === bienId)
    const totalLoyers = paiementsBien.reduce((acc, p) => acc + (p.montant || 0), 0)
    return { totalLoyers, nbPaiements: paiementsBien.length, bauxBien }
  }

  function totalChargesBien(bienId) {
    const c = chargesParBien[bienId] || {}
    return (parseFloat(c.taxe_fonciere) || 0) +
      (parseFloat(c.assurance) || 0) +
      (parseFloat(c.travaux) || 0) +
      (parseFloat(c.frais_gestion) || 0) +
      (parseFloat(c.interets_emprunt) || 0) +
      (parseFloat(c.autres) || 0)
  }

  function updateCharge(bienId, champ, valeur) {
    setChargesParBien(prev => ({
      ...prev,
      [bienId]: { ...(prev[bienId] || {}), [champ]: valeur }
    }))
  }

  async function sauvegarderCharges(bienId) {
    const c = chargesParBien[bienId] || {}
    await supabase.from('charges_fiscales').upsert({
      user_id: user.id,
      bien_id: bienId,
      annee,
      taxe_fonciere: parseFloat(c.taxe_fonciere) || 0,
      assurance: parseFloat(c.assurance) || 0,
      travaux: parseFloat(c.travaux) || 0,
      frais_gestion: parseFloat(c.frais_gestion) || 0,
      interets_emprunt: parseFloat(c.interets_emprunt) || 0,
      autres: parseFloat(c.autres) || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,bien_id,annee' })
    setChargesSauvegardees(prev => ({ ...prev, [bienId]: true }))
    setTimeout(() => setChargesSauvegardees(prev => ({ ...prev, [bienId]: false })), 2000)
  }

  async function uploadJustificatif(bienId, fichier, categorie) {
  if (!fichier) return
  if (fichier.size > 10 * 1024 * 1024) { alert('Fichier trop lourd — max 10 Mo.'); return }
  setUploadingJustif(prev => ({ ...prev, [bienId]: true }))
  try {
    const nomFichier = `${Date.now()}_${fichier.name}`
    const categorieSlug = categorie.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_')
const cheminStorage = `${user.id}/${bienId}/${categorieSlug}/${nomFichier}`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(cheminStorage, fichier, { contentType: fichier.type, upsert: true })
    if (uploadError) { alert('Erreur upload : ' + uploadError.message); return }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(cheminStorage)
    const { data: insertData } = await supabase.from('Documents').insert({
      user_id: user.id,
      bien_id: bienId,
      nom_fichier: fichier.name,
      categorie: categorie,
      url: urlData.publicUrl,
      storage_path: cheminStorage,
      annee: annee,
      taille: fichier.size,
    }).select().single()
    if (insertData) {
      setJustificatifsParBien(prev => ({
        ...prev,
        [bienId]: [...(prev[bienId] || []), insertData]
      }))
    }
    setShowJustifModal(prev => ({ ...prev, [bienId]: false }))
  } catch (err) {
    alert('Erreur : ' + err.message)
  }
  setUploadingJustif(prev => ({ ...prev, [bienId]: false }))
}

  async function supprimerJustificatif(bienId, doc) {
    if (!confirm('Supprimer ce justificatif ?')) return
    await supabase.storage.from('documents').remove([doc.storage_path])
    await supabase.from('Documents').delete().eq('id', doc.id)
    setJustificatifsParBien(prev => ({
      ...prev,
      [bienId]: (prev[bienId] || []).filter(d => d.id !== doc.id)
    }))
  }

  const totalGeneral = biens.reduce((acc, bien) => {
    const s = statsBien(bien.id)
    return {
      totalLoyers: acc.totalLoyers + s.totalLoyers,
      totalCharges: acc.totalCharges + totalChargesBien(bien.id)
    }
  }, { totalLoyers: 0, totalCharges: 0 })

  const revenuNet = totalGeneral.totalLoyers - totalGeneral.totalCharges

  async function genererPDF() {
    setGenerating(true)
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      let y = 20

      doc.setFillColor(37, 99, 235)
      doc.rect(0, 0, pageWidth, 40, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('RÉCAPITULATIF FISCAL', pageWidth / 2, 18, { align: 'center' })
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`Revenus fonciers — Année ${annee}`, pageWidth / 2, 30, { align: 'center' })

      y = 55
      doc.setTextColor(0, 0, 0)
      doc.setFillColor(243, 244, 246)
      doc.rect(14, y - 6, pageWidth - 28, 20, 'F')
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Propriétaire :', 18, y)
      doc.setFont('helvetica', 'normal')
      doc.text(user.email, 60, y)
      y += 8
      doc.setFont('helvetica', 'bold')
      doc.text('Année fiscale :', 18, y)
      doc.setFont('helvetica', 'normal')
      doc.text(String(annee), 60, y)
      y += 18

      biens.forEach(bien => {
        if (y > 230) { doc.addPage(); y = 20 }
        const s = statsBien(bien.id)
        const charges = chargesParBien[bien.id] || {}
        const totalC = totalChargesBien(bien.id)
        const justifs = justificatifsParBien[bien.id] || []

        doc.setFillColor(37, 99, 235)
        doc.rect(14, y - 5, pageWidth - 28, 10, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(`${bien.nom} — ${bien.adresse || ''}`, 18, y + 2)
        y += 14
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10)

        doc.setFont('helvetica', 'bold')
        doc.text('RECETTES', 18, y); y += 6
        doc.setFont('helvetica', 'normal')
        doc.text(`Loyers perçus (${s.nbPaiements} paiements) :`, 22, y)
        doc.setFont('helvetica', 'bold')
        doc.text(`${s.totalLoyers.toFixed(2)} €`, 150, y); y += 10

        doc.setFont('helvetica', 'bold')
        doc.text('CHARGES DÉDUCTIBLES', 18, y); y += 6
        doc.setFont('helvetica', 'normal')
        const lignesCharges = [
          ['Taxe foncière :', charges.taxe_fonciere],
          ['Assurance propriétaire :', charges.assurance],
          ['Travaux / réparations :', charges.travaux],
          ['Frais de gestion :', charges.frais_gestion],
          ["Intérêts d'emprunt :", charges.interets_emprunt],
          ['Autres :', charges.autres],
        ]
        lignesCharges.forEach(([label, val]) => {
          if (val && parseFloat(val) > 0) {
            doc.text(label, 22, y)
            doc.setFont('helvetica', 'bold')
            doc.text(`${parseFloat(val).toFixed(2)} €`, 150, y)
            doc.setFont('helvetica', 'normal')
            y += 6
          }
        })
        if (totalC === 0) {
          doc.setTextColor(150, 150, 150)
          doc.text('Aucune charge renseignée', 22, y)
          doc.setTextColor(0, 0, 0)
          y += 6
        }
        doc.setFont('helvetica', 'bold')
        doc.text('Total charges :', 22, y)
        doc.text(`${totalC.toFixed(2)} €`, 150, y); y += 8
        doc.text('Résultat net du bien :', 18, y)
        const netBien = s.totalLoyers - totalC
        doc.setTextColor(netBien >= 0 ? 21 : 220, netBien >= 0 ? 128 : 38, netBien >= 0 ? 61 : 38)
        doc.text(`${netBien.toFixed(2)} €`, 150, y)
        doc.setTextColor(0, 0, 0); y += 10

        if (justifs.length > 0) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          doc.text(`Justificatifs (${justifs.length}) :`, 18, y); y += 5
          justifs.forEach(j => {
            doc.setFont('helvetica', 'normal')
            doc.text(`• ${j.nom_fichier}`, 22, y); y += 5
          })
        }

        s.bauxBien.forEach(b => {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(100, 100, 100)
          doc.text(`Locataire : ${b.locataire_prenom} ${b.locataire_nom} — ${b.loyer_hc}€ HC — depuis ${b.date_debut ? new Date(b.date_debut).toLocaleDateString('fr-FR') : '—'}`, 18, y)
          doc.setTextColor(0, 0, 0); y += 6
        })
        y += 4
      })

      if (y > 220) { doc.addPage(); y = 20 }
      doc.setFillColor(243, 244, 246)
      doc.rect(14, y - 6, pageWidth - 28, 55, 'F')
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(37, 99, 235)
      doc.text('RÉCAPITULATIF GLOBAL', 18, y); y += 10
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.text('Total loyers perçus :', 18, y)
      doc.setFont('helvetica', 'bold')
      doc.text(`${totalGeneral.totalLoyers.toFixed(2)} €`, 150, y); y += 7
      doc.setFont('helvetica', 'normal')
      doc.text('Total charges déductibles :', 18, y)
      doc.setFont('helvetica', 'bold')
      doc.text(`${totalGeneral.totalCharges.toFixed(2)} €`, 150, y); y += 7
      doc.setFont('helvetica', 'normal')
      doc.text('Résultat net foncier :', 18, y)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(revenuNet >= 0 ? 21 : 220, revenuNet >= 0 ? 128 : 38, revenuNet >= 0 ? 61 : 38)
      doc.text(`${revenuNet.toFixed(2)} €`, 150, y); y += 12
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('Cases pour votre déclaration :', 18, y); y += 8
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      if (totalGeneral.totalLoyers < 15000) {
        doc.text('Régime micro-foncier (revenus < 15 000€)', 18, y); y += 6
        doc.setFont('helvetica', 'bold')
        doc.text(`• Case 4BE : ${totalGeneral.totalLoyers.toFixed(2)} €`, 22, y); y += 6
        doc.setFont('helvetica', 'normal')
        doc.text("Abattement 30% appliqué automatiquement.", 22, y)
      } else {
        doc.text('Régime réel (revenus ≥ 15 000€) — Formulaire 2044', 18, y); y += 6
        doc.setFont('helvetica', 'bold')
        doc.text(`• Case 4BA : ${totalGeneral.totalLoyers.toFixed(2)} €`, 22, y); y += 6
        doc.text(`• Case 4BB : ${totalGeneral.totalCharges.toFixed(2)} €`, 22, y); y += 6
        doc.text(`• Case 4BC : ${revenuNet.toFixed(2)} €`, 22, y)
      }

      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.setFont('helvetica', 'normal')
      doc.text(`Généré par Ma Gestion-Locative.fr le ${new Date().toLocaleDateString('fr-FR')} — Document indicatif, consultez un expert-comptable.`, pageWidth / 2, 290, { align: 'center' })

      const nomFichier = `Recap_fiscal_${annee}.pdf`
      doc.save(nomFichier)

      const pdfBlob = doc.output('blob')
      if (biens.length > 0) {
        const cheminStorage = `${user.id}/${biens[0].id}/Recap fiscal/${nomFichier}`
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(cheminStorage, pdfBlob, { contentType: 'application/pdf', upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('documents').getPublicUrl(cheminStorage)
          await supabase.from('Documents').insert({
            user_id: user.id,
            bien_id: biens[0].id,
            nom_fichier: nomFichier,
            categorie: 'Autre',
            url: urlData.publicUrl,
            storage_path: cheminStorage,
            annee: annee,
          })
          setSauvegarde(true)
          setTimeout(() => setSauvegarde(false), 4000)
        }
      }
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
    setGenerating(false)
  }

  const inp = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'white' }
  const lbl = { fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Nav pageCourante="documents" />

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <button onClick={() => window.location.href = '/documents'}
          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 16 }}>
          ← Retour aux documents
        </button>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Récapitulatif fiscal</h1>
        <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 28px' }}>Revenus fonciers pour votre déclaration d'impôts</p>

        {sauvegarde && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>✅</span>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#15803d' }}>Récap fiscal sauvegardé dans le coffre-fort !</p>
          </div>
        )}

        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}>
          <div style={{ maxWidth: 200 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Année fiscale</label>
            <select style={{ ...inp, width: 'auto' }} value={annee} onChange={e => setAnnee(parseInt(e.target.value))}>
              {[2023, 2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {loading ? <p style={{ color: '#6b7280', textAlign: 'center' }}>Chargement...</p> : (
          <>
            {biens.map(bien => {
              const s = statsBien(bien.id)
              const charges = chargesParBien[bien.id] || {}
              const totalC = totalChargesBien(bien.id)
              const netBien = s.totalLoyers - totalC
              const showForm = showChargesForm[bien.id]
              const justifs = justificatifsParBien[bien.id] || []
              const uploading = uploadingJustif[bien.id]

              return (
                <div key={bien.id} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>🏠 {bien.nom}</h3>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>{bien.adresse}</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px' }}>Loyers perçus</p>
                      <p style={{ fontSize: 22, fontWeight: 700, color: '#16a34a', margin: 0 }}>{s.totalLoyers.toFixed(0)}€</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{s.nbPaiements} paiement{s.nbPaiements > 1 ? 's' : ''}</p>
                    </div>
                    <div style={{ background: totalC > 0 ? '#fef9c3' : '#f9fafb', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px' }}>Charges déductibles</p>
                      {totalC > 0 ? (
                        <p style={{ fontSize: 22, fontWeight: 700, color: '#854d0e', margin: 0 }}>{totalC.toFixed(0)}€</p>
                      ) : (
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#9ca3af', margin: 0 }}>À compléter</p>
                      )}
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>taxe foncière, travaux...</p>
                    </div>
                  </div>

                  {totalC > 0 && (
                    <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Résultat net du bien</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: netBien >= 0 ? '#16a34a' : '#dc2626' }}>{netBien.toFixed(0)}€</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
  <button onClick={() => setShowChargesForm(prev => ({ ...prev, [bien.id]: !prev[bien.id] }))}
    style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
    {showForm ? '▲ Masquer les charges' : '+ Ajouter mes charges'}
  </button>
  <button onClick={() => setShowJustifModal(prev => ({ ...prev, [bien.id]: !prev[bien.id] }))}
    style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
    📎 Ajouter un justificatif
  </button>
</div>

{showForm && (
  <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 12 }}>
    <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px' }}>Saisissez vos charges déductibles pour {annee} :</p>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {[
        ['taxe_fonciere', 'Taxe foncière'],
        ['assurance', 'Assurance propriétaire'],
        ['travaux', 'Travaux / réparations'],
        ['frais_gestion', 'Frais de gestion'],
        ['interets_emprunt', "Intérêts d'emprunt"],
        ['autres', 'Autres charges'],
      ].map(([champ, label]) => (
        <div key={champ}>
          <label style={lbl}>{label} (€)</label>
          <input type="number" min="0" placeholder="0"
            value={charges[champ] || ''}
            onChange={e => updateCharge(bien.id, champ, e.target.value)}
            style={inp} />
        </div>
      ))}
    </div>
    <button onClick={() => sauvegarderCharges(bien.id)}
      style={{ marginTop: 12, background: chargesSauvegardees[bien.id] ? '#16a34a' : '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.3s' }}>
      {chargesSauvegardees[bien.id] ? '✅ Sauvegardé !' : '💾 Sauvegarder les charges'}
    </button>
  </div>
)}
{/* Modal sélecteur catégorie + fichier */}
{showJustifModal[bien.id] && (
  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, marginTop: 12 }}>
    <p style={{ fontSize: 13, fontWeight: 600, color: '#15803d', margin: '0 0 10px' }}>📎 Quel type de justificatif ?</p>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
      {[
        ['Taxe foncière', '🏛️'],
        ['Assurance', '🛡️'],
        ['Factures travaux', '🔨'],
        ['Frais de gestion', '📋'],
        ['Intérêts emprunt', '🏦'],
        ['Autre', '📄'],
      ].map(([cat, emoji]) => (
        <button key={cat} onClick={() => setCategorieJustif(prev => ({ ...prev, [bien.id]: cat }))}
          style={{
            background: categorieJustif[bien.id] === cat ? '#16a34a' : 'white',
            color: categorieJustif[bien.id] === cat ? 'white' : '#374151',
            border: `1px solid ${categorieJustif[bien.id] === cat ? '#16a34a' : '#e5e7eb'}`,
            borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left'
          }}>
          {emoji} {cat}
        </button>
      ))}
    </div>
    {categorieJustif[bien.id] && (
      <div>
        <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>Choisissez votre fichier (PDF, JPG, PNG — max 10 Mo)</p>
        <input type="file" id={`justif-${bien.id}`} style={{ display: 'none' }}
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={e => {
            uploadJustificatif(bien.id, e.target.files[0], categorieJustif[bien.id])
            e.target.value = ''
          }} />
        <label htmlFor={`justif-${bien.id}`}
          style={{ background: uploading ? '#9ca3af' : '#16a34a', color: 'white', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', display: 'inline-block' }}>
          {uploading ? '⏳ Upload...' : '📁 Choisir le fichier'}
        </label>
        <button onClick={() => setShowJustifModal(prev => ({ ...prev, [bien.id]: false }))}
          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 13, marginLeft: 12 }}>
          Annuler
        </button>
      </div>
    )}
  </div>
)}

                  {/* Liste des justificatifs */}
                  {justifs.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>📎 Justificatifs ({justifs.length})</p>
                      {justifs.map(doc => (
                        <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>📄 {doc.nom_fichier}</p>
                            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{doc.taille ? `${(doc.taille / 1024).toFixed(0)} Ko` : ''}</p>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer"
                              style={{ background: '#eff6ff', color: '#2563eb', padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, textDecoration: 'none' }}>
                              Ouvrir
                            </a>
                            <button onClick={() => supprimerJustificatif(bien.id, doc)}
                              style={{ background: '#fef2f2', color: '#dc2626', padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12 }}>
                              🗑
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {s.bauxBien.map(b => (
                    <div key={b.id} style={{ fontSize: 12, color: '#6b7280', background: '#f9fafb', borderRadius: 8, padding: 10, marginTop: 12 }}>
                      👤 {b.locataire_prenom} {b.locataire_nom} — {b.loyer_hc}€ HC + {b.charges || 0}€ charges — depuis {b.date_debut ? new Date(b.date_debut).toLocaleDateString('fr-FR') : '—'}
                    </div>
                  ))}
                </div>
              )
            })}

            {/* Total global */}
            <div style={{ background: '#eff6ff', borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e40af', margin: '0 0 16px' }}>📊 Total {annee}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'white', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px' }}>Total loyers</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#16a34a', margin: 0 }}>{totalGeneral.totalLoyers.toFixed(0)}€</p>
                </div>
                <div style={{ background: 'white', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px' }}>Total charges</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#854d0e', margin: 0 }}>{totalGeneral.totalCharges.toFixed(0)}€</p>
                </div>
                <div style={{ background: 'white', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px' }}>Résultat net</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: revenuNet >= 0 ? '#16a34a' : '#dc2626', margin: 0 }}>{revenuNet.toFixed(0)}€</p>
                </div>
              </div>
              <div style={{ background: 'white', borderRadius: 10, padding: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', margin: '0 0 8px' }}>📋 Cases pour votre déclaration</p>
                {totalGeneral.totalLoyers < 15000 ? (
                  <div>
                    <p style={{ fontSize: 12, color: '#374151', margin: '0 0 4px' }}>Régime <strong>micro-foncier</strong> (revenus {'<'} 15 000€)</p>
                    <p style={{ fontSize: 12, color: '#374151', margin: '0 0 4px' }}>• Case <strong>4BE</strong> : {totalGeneral.totalLoyers.toFixed(2)}€</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>L'abattement de 30% sera appliqué automatiquement.</p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 12, color: '#374151', margin: '0 0 4px' }}>Régime <strong>réel</strong> (revenus ≥ 15 000€) — Formulaire 2044</p>
                    <p style={{ fontSize: 12, color: '#374151', margin: '0 0 4px' }}>• Case <strong>4BA</strong> : {totalGeneral.totalLoyers.toFixed(2)}€</p>
                    <p style={{ fontSize: 12, color: '#374151', margin: '0 0 4px' }}>• Case <strong>4BB</strong> : {totalGeneral.totalCharges.toFixed(2)}€</p>
                    <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>• Case <strong>4BC</strong> : {revenuNet.toFixed(2)}€</p>
                  </div>
                )}
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
                  ⚠️ Document indicatif — Consultez un expert-comptable pour votre situation.
                </p>
              </div>
            </div>

            <button onClick={genererPDF} disabled={generating || biens.length === 0}
              style={{ width: '100%', background: generating || biens.length === 0 ? '#93c5fd' : '#2563eb', color: 'white', padding: 14, borderRadius: 12, border: 'none', cursor: generating || biens.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15 }}>
              {generating ? '⏳ Génération...' : '📊 Générer le récap fiscal PDF'}
            </button>
          </>
        )}
      </div>
    </main>
  )
}