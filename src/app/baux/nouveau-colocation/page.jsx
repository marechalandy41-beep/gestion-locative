'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../supabase'
import jsPDF from 'jspdf'

export default function NouvelleColocation() {
  const [user, setUser] = useState(null)
  const [biens, setBiens] = useState([])
  const [loading, setLoading] = useState(false)
  const [etape, setEtape] = useState(1)
  const [signatureBailleur, setSignatureBailleur] = useState(null)
  const [signaturesColocataires, setSignaturesColocataires] = useState([])
  const [canvasRef, setCanvasRef] = useState(null)
  const [dessin, setDessin] = useState(false)
  const [ecran, setEcran] = useState('formulaire')
  const [signatureEnCours, setSignatureEnCours] = useState(null) // 'bailleur' ou index colocataire
  const [plan, setPlan] = useState('')

  const inp = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'white' }
  const lbl = { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }

  const [form, setForm] = useState({
    // Bailleur
    bailleur_prenom: '', bailleur_nom: '', bailleur_adresse: '',
    bailleur_naissance: '', bailleur_lieu_naissance: '', bailleur_nationalite: 'Française',
    // Bien
    bien_id: '', type_bail: 'Non meublé',
    surface_habitable: '', nombre_pieces: '', etage: '',
    equipements: '', classe_dpe: 'D', numero_lot: '',
    // Financier
    loyer_total_hc: '', charges: '', type_charges: 'Forfaitaires',
    depot_garantie: '', modalite_paiement: 'Virement bancaire',
    date_exigibilite: '1', revision_irl: true,
    // Dates
    date_debut: '', date_fin: '', clauses: '',
    relance_auto_active: false, relance_auto_jours: 5,
  })

  const colocataireVide = {
    prenom: '', nom: '', email: '', telephone: '',
    naissance: '', nationalite: 'Française', profession: '', adresse: '',
    part_loyer: ''
  }
  const [colocataires, setColocataires] = useState([
    { ...colocataireVide },
    { ...colocataireVide },
  ])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) { window.location.href = '/auth'; return }
      const { data: customer } = await supabase.from('customers').select('plan').eq('user_id', data.user.id).single()
      if (!customer || customer.plan === 'gratuit') { window.location.href = '/biens?plan=gratuit'; return }
      setUser(data.user)
      setPlan(customer.plan)
      const { data: biensData } = await supabase.from('Biens').select('*').eq('user_id', data.user.id)
      setBiens(biensData || [])
      setSignaturesColocataires(new Array(2).fill(null))
    })
  }, [])

  function updateColocataire(index, champ, valeur) {
    const nouv = [...colocataires]
    nouv[index][champ] = valeur
    setColocataires(nouv)
  }

  function ajouterColocataire() {
    if (colocataires.length >= 20) { alert('Maximum 20 colocataires.'); return }
    setColocataires([...colocataires, { ...colocataireVide }])
    setSignaturesColocataires([...signaturesColocataires, null])
  }

  function supprimerColocataire(index) {
    if (colocataires.length <= 2) { alert('Minimum 2 colocataires pour une colocation.'); return }
    setColocataires(colocataires.filter((_, i) => i !== index))
    setSignaturesColocataires(signaturesColocataires.filter((_, i) => i !== index))
  }

  const totalParts = colocataires.reduce((acc, c) => acc + (parseFloat(c.part_loyer) || 0), 0)
  const loyerTotal = parseFloat(form.loyer_total_hc) || 0
  const bienSel = biens.find(b => b.id === parseInt(form.bien_id))

  // Canvas signature
  function initCanvas(canvas) {
    if (!canvas) return
    setCanvasRef(canvas)
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#1e40af'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
  }
  function startDraw(e) {
    setDessin(true)
    const ctx = canvasRef.getContext('2d')
    const rect = canvasRef.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.beginPath(); ctx.moveTo(x, y)
  }
  function draw(e) {
    if (!dessin) return
    e.preventDefault()
    const ctx = canvasRef.getContext('2d')
    const rect = canvasRef.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.lineTo(x, y); ctx.stroke()
  }
  function stopDraw() { setDessin(false) }
  function effacerCanvas() { canvasRef.getContext('2d').clearRect(0, 0, canvasRef.width, canvasRef.height) }
  function validerSignature(pour) {
    const dataUrl = canvasRef.toDataURL('image/png')
    if (pour === 'bailleur') {
      setSignatureBailleur(dataUrl)
    } else {
      const nouv = [...signaturesColocataires]
      nouv[pour] = dataUrl
      setSignaturesColocataires(nouv)
    }
    setSignatureEnCours(null)
    effacerCanvas()
  }

  function sanitizerNomFichier(nom) {
    return (nom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
  }

  async function finaliserEtSauvegarder() {
    setLoading(true)
    try {
      for (let i = 0; i < colocataires.length; i++) {
        const coloc = colocataires[i]
        const partLoyer = parseFloat(coloc.part_loyer) || (loyerTotal / colocataires.length)
        const partCharges = (parseFloat(form.charges) || 0) / colocataires.length
        const partDepot = (parseFloat(form.depot_garantie) || 0) / colocataires.length

        // Générer PDF pour ce colocataire
        const doc = new jsPDF({ unit: 'mm', format: 'a4' })
        const pageW = 210, margin = 20, contenuW = pageW - margin * 2
        let y = 20
        const checkPage = () => { if (y > 270) { doc.addPage(); y = 20; } }
        const titre = (texte) => {
          checkPage()
          doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235)
          doc.text(texte, margin, y); y += 2
          doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.4)
          doc.line(margin, y, pageW - margin, y); y += 6; doc.setTextColor(0, 0, 0)
        }
        const ligne = (label, valeur) => {
          checkPage()
          doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text(label, margin, y)
          doc.setFont('helvetica', 'normal')
          const val = valeur?.toString() || '—'
          const lignes = doc.splitTextToSize(val, contenuW - 55)
          doc.text(lignes, margin + 55, y)
          y += Math.max(5, lignes.length * 4.5)
        }
        const texte = (t) => {
          checkPage()
          doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50)
          const lignes = doc.splitTextToSize(t, contenuW)
          lignes.forEach(l => { checkPage(); doc.text(l, margin, y); y += 4.5; })
          doc.setTextColor(0, 0, 0); y += 2
        }
        const saut = (n = 5) => { y += n }

        doc.setFillColor(37, 99, 235); doc.rect(0, 0, 210, 20, 'F')
        doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
        doc.text('CONTRAT DE BAIL — COLOCATION', pageW / 2, 10, { align: 'center' })
        doc.setFontSize(9)
        doc.text(`${form.type_bail.toUpperCase()} — Loi n°89-462 du 6 juillet 1989 modifiée par la loi ALUR du 24 mars 2014`, pageW / 2, 16, { align: 'center' })
        y = 28; doc.setTextColor(0, 0, 0)

        titre('ARTICLE 1 — LE BAILLEUR')
        ligne('Nom et prénom :', `${form.bailleur_prenom} ${form.bailleur_nom}`)
        ligne('Date de naissance :', form.bailleur_naissance ? new Date(form.bailleur_naissance).toLocaleDateString('fr-FR') : '')
        ligne('Lieu de naissance :', form.bailleur_lieu_naissance)
        ligne('Nationalité :', form.bailleur_nationalite)
        ligne('Adresse :', form.bailleur_adresse); saut()

        titre('ARTICLE 2 — LE LOCATAIRE (COLOCATAIRE)')
        ligne('Nom et prénom :', `${coloc.prenom} ${coloc.nom}`)
        ligne('Date de naissance :', coloc.naissance ? new Date(coloc.naissance).toLocaleDateString('fr-FR') : '')
        ligne('Nationalité :', coloc.nationalite)
        ligne('Profession :', coloc.profession)
        ligne('Adresse actuelle :', coloc.adresse)
        ligne('Email :', coloc.email)
        ligne('Téléphone :', coloc.telephone)
        ligne('Autres colocataires :', colocataires.filter((_, j) => j !== i).map(c => `${c.prenom} ${c.nom}`).join(', ')); saut()

        titre('ARTICLE 3 — DÉSIGNATION DU BIEN LOUÉ')
        ligne('Adresse :', bienSel?.adresse || '')
        ligne('Type de bien :', bienSel?.type || '')
        ligne('Surface habitable :', form.surface_habitable ? `${form.surface_habitable} m²` : '')
        ligne('Nombre de pièces :', form.nombre_pieces)
        if (form.etage) ligne('Étage / Bâtiment :', form.etage)
        if (form.numero_lot) ligne('Numéro de lot :', form.numero_lot)
        ligne('Classe énergétique (DPE) :', form.classe_dpe)
        if (form.equipements) ligne('Équipements inclus :', form.equipements); saut()

        titre('ARTICLE 4 — DURÉE DU BAIL')
        const duree = form.type_bail === 'Meublé' ? '1 an' : '3 ans'
        ligne('Date de début :', form.date_debut ? new Date(form.date_debut).toLocaleDateString('fr-FR') : '')
        ligne('Date de fin :', form.date_fin ? new Date(form.date_fin).toLocaleDateString('fr-FR') : `Reconduction tacite (${duree})`)
        texte(`Le présent bail est conclu pour une durée de ${duree}, conformément à la loi du 6 juillet 1989.`)

        titre('ARTICLE 5 — CONDITIONS FINANCIÈRES')
        ligne('Loyer total de la colocation :', `${loyerTotal} €`)
        ligne('Part de loyer HC du colocataire :', `${partLoyer.toFixed(2)} €`)
        ligne('Part des charges :', `${partCharges.toFixed(2)} €`)
        ligne('Total CC du colocataire :', `${(partLoyer + partCharges).toFixed(2)} €`)
        ligne('Dépôt de garantie (part) :', `${partDepot.toFixed(2)} €`)
        ligne('Modalité de paiement :', form.modalite_paiement)
        ligne("Date d'exigibilité :", `Le ${form.date_exigibilite} de chaque mois`)
        ligne('Révision annuelle IRL :', form.revision_irl ? "Oui — selon l'IRL (INSEE)" : 'Non'); saut()

        titre('ARTICLE 6 — OBLIGATIONS DU BAILLEUR')
        texte("Le bailleur s'engage à : délivrer le logement en bon état d'usage et de réparation, assurer la jouissance paisible des lieux, entretenir les locaux en état de servir à l'usage prévu, réaliser les réparations autres que locatives, garantir contre les vices ou défauts cachés.")

        titre('ARTICLE 7 — OBLIGATIONS DU LOCATAIRE')
        texte("Le locataire s'engage à : payer sa part de loyer et de charges aux termes convenus, user paisiblement des locaux, répondre des dégradations survenues pendant la durée du contrat, souscrire une assurance multirisque habitation et en justifier chaque année.")

        titre('ARTICLE 8 — DÉPÔT DE GARANTIE')
        texte(`Un dépôt de garantie de ${partDepot.toFixed(2)} € est versé à la signature du présent bail par ${coloc.prenom} ${coloc.nom}. Il sera restitué dans un délai d'un mois à compter de la remise des clés si aucune dégradation n'est constatée.`)

        if (form.clauses?.trim()) {
          titre('ARTICLE 9 — CLAUSES PARTICULIÈRES')
          texte(form.clauses)
        }

        if (y > 210) { doc.addPage(); y = 20; }
        saut(5); titre('SIGNATURES')
        doc.setFontSize(9); doc.setFont('helvetica', 'normal')
        doc.text(`Fait en deux exemplaires originaux, le ${new Date().toLocaleDateString('fr-FR')}`, margin, y); y += 12
        doc.setFont('helvetica', 'bold')
        doc.text('Le Bailleur', margin, y); doc.text('Le Locataire', pageW / 2 + 5, y); y += 4
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
        doc.text(`${form.bailleur_prenom} ${form.bailleur_nom}`, margin, y)
        doc.text(`${coloc.prenom} ${coloc.nom}`, pageW / 2 + 5, y); y += 2
        doc.text('(Précédé de la mention "Lu et approuvé")', margin, y)
        doc.text('(Précédé de la mention "Lu et approuvé")', pageW / 2 + 5, y); y += 4
        doc.setDrawColor(180, 180, 180)
        doc.rect(margin, y, 80, 38); doc.rect(pageW / 2 + 5, y, 80, 38)
        if (signatureBailleur) doc.addImage(signatureBailleur, 'PNG', margin + 1, y + 1, 78, 36)
        if (signaturesColocataires[i]) doc.addImage(signaturesColocataires[i], 'PNG', pageW / 2 + 6, y + 1, 78, 36)
        y += 44; doc.setFontSize(7); doc.setTextColor(150, 150, 150)
        doc.text('Document généré par GestionLocative — Conforme loi n°89-462 du 6 juillet 1989 et loi ALUR du 24 mars 2014', pageW / 2, y, { align: 'center' })

        // Téléchargement PDF
        const nomFichier = `Bail_Colocation_${sanitizerNomFichier(coloc.nom)}_${sanitizerNomFichier(form.bailleur_nom)}_${form.date_debut || 'date'}.pdf`
        doc.save(nomFichier)

        // Upload dans Supabase Storage
        const pdfBlob = doc.output('blob')
        const cheminStorage = `baux/${user.id}/${Date.now()}_${nomFichier}`
        const { error: uploadError } = await supabase.storage.from('documents').upload(cheminStorage, pdfBlob, { contentType: 'application/pdf' })
        let bailPdfUrl = null
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('documents').getPublicUrl(cheminStorage)
          bailPdfUrl = urlData.publicUrl
          await supabase.from('Documents').insert({
            user_id: user.id,
            bien_id: parseInt(form.bien_id),
            nom_fichier: nomFichier,
            categorie: 'Bail',
            url: bailPdfUrl,
            storage_path: cheminStorage,
            annee: form.date_debut ? new Date(form.date_debut).getFullYear() : new Date().getFullYear(),
          })
        }

        // Insérer le bail en base
        const { error: bailError } = await supabase.from('Baux').insert({
          user_id: user.id,
          bien_id: parseInt(form.bien_id),
          type_bail: form.type_bail,
          loyer_hc: partLoyer,
          charges: partCharges,
          type_charges: form.type_charges,
          depot_garantie: partDepot,
          date_debut: form.date_debut || null,
          date_fin: form.date_fin || null,
          date_exigibilite: parseInt(form.date_exigibilite) || 1,
          revision_irl: form.revision_irl,
          modalite_paiement: form.modalite_paiement,
          clauses: form.clauses,
          relance_auto_active: form.relance_auto_active || false,
          relance_auto_jours: form.relance_auto_jours || 5,
          bailleur_prenom: form.bailleur_prenom,
          bailleur_nom: form.bailleur_nom,
          bailleur_adresse: form.bailleur_adresse,
          bailleur_naissance: form.bailleur_naissance || null,
          bailleur_lieu_naissance: form.bailleur_lieu_naissance,
          bailleur_nationalite: form.bailleur_nationalite,
          locataire_prenom: coloc.prenom,
          locataire_nom: coloc.nom,
          locataire_email: coloc.email,
          locataire_telephone: coloc.telephone,
          locataire_naissance: coloc.naissance || null,
          locataire_nationalite: coloc.nationalite,
          locataire_profession: coloc.profession,
          locataire_adresse: coloc.adresse,
          surface_habitable: parseFloat(form.surface_habitable) || null,
          nombre_pieces: parseInt(form.nombre_pieces) || null,
          etage: form.etage,
          equipements: form.equipements,
          classe_dpe: form.classe_dpe,
          numero_lot: form.numero_lot,
          signature_bailleur: signatureBailleur,
          signature_locataire: signaturesColocataires[i],
          statut: 'actif',
          is_colocation: true,
          colocataires: colocataires.map(c => ({ prenom: c.prenom, nom: c.nom, email: c.email, part_loyer: parseFloat(c.part_loyer) || 0 })),
          ...(bailPdfUrl && { bail_pdf_url: bailPdfUrl }),
        })

        if (bailError) { alert('Erreur : ' + bailError.message); setLoading(false); return }
      }

      // Sync Stripe — 1 seule brique
      await fetch('/api/sync-quantity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      }).catch(() => {})

      setLoading(false)
      window.location.href = '/baux'
    } catch (err) {
      alert('Erreur : ' + err.message)
      setLoading(false)
    }
  }

  const etapes = ['Bailleur', 'Colocataires', 'Bien & loyer', 'Dates', 'Signature']

  if (ecran === 'signature') return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Signature de la colocation</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 28 }}>Le bailleur signe une fois, puis chaque colocataire signe son bail.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Signature bailleur */}
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 12 }}>
              {signatureBailleur ? '✅ Bailleur signé' : `🖊️ Signature du bailleur — ${form.bailleur_prenom} ${form.bailleur_nom}`}
            </p>
            {!signatureBailleur ? (
              <>
                <canvas ref={initCanvas} width={520} height={140}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                  style={{ border: '2px dashed #93c5fd', borderRadius: 10, width: '100%', height: 140, cursor: 'crosshair', touchAction: 'none', background: '#fafafa' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={effacerCanvas} style={{ flex: 1, background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 13 }}>🗑 Effacer</button>
                  <button onClick={() => validerSignature('bailleur')} style={{ flex: 2, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>✅ Valider</button>
                </div>
              </>
            ) : (
              <div>
                <img src={signatureBailleur} style={{ border: '1px solid #e5e7eb', borderRadius: 8, width: '100%', height: 80, objectFit: 'contain' }} alt="Signature bailleur" />
                <button onClick={() => setSignatureBailleur(null)} style={{ marginTop: 6, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Recommencer</button>
              </div>
            )}
          </div>

          {/* Signatures colocataires */}
          {colocataires.map((coloc, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 12 }}>
                {signaturesColocataires[i] ? `✅ ${coloc.prenom} ${coloc.nom} signé` : `🖊️ Signature de ${coloc.prenom} ${coloc.nom}`}
              </p>
              {!signaturesColocataires[i] ? (
                <>
                  <canvas ref={signatureEnCours === i ? initCanvas : undefined} width={520} height={140}
                    onMouseDown={e => { setSignatureEnCours(i); startDraw(e) }}
                    onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                    onTouchStart={e => { setSignatureEnCours(i); startDraw(e) }}
                    onTouchMove={draw} onTouchEnd={stopDraw}
                    style={{ border: '2px dashed #93c5fd', borderRadius: 10, width: '100%', height: 140, cursor: 'crosshair', touchAction: 'none', background: '#fafafa' }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={effacerCanvas} style={{ flex: 1, background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 13 }}>🗑 Effacer</button>
                    <button onClick={() => validerSignature(i)} style={{ flex: 2, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>✅ Valider</button>
                  </div>
                </>
              ) : (
                <div>
                  <img src={signaturesColocataires[i]} style={{ border: '1px solid #e5e7eb', borderRadius: 8, width: '100%', height: 80, objectFit: 'contain' }} alt={`Signature ${coloc.prenom}`} />
                  <button onClick={() => { const n = [...signaturesColocataires]; n[i] = null; setSignaturesColocataires(n) }} style={{ marginTop: 6, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Recommencer</button>
                </div>
              )}
            </div>
          ))}

          {/* Bouton finaliser */}
          {signatureBailleur && signaturesColocataires.every(s => s !== null) && (
            <button onClick={finaliserEtSauvegarder} disabled={loading}
              style={{ background: loading ? '#86efac' : '#16a34a', color: 'white', padding: 14, borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15 }}>
              {loading ? '⏳ Création des baux...' : `🎉 Finaliser — Télécharger les ${colocataires.length} PDF`}
            </button>
          )}

          <button onClick={() => setEcran('formulaire')}
            style={{ background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            ← Retour au formulaire
          </button>
        </div>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        <button onClick={() => window.location.href = '/baux/nouveau'} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>← Retour</button>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Nouvelle colocation</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 28 }}>Un bail complet par colocataire — 1 seule brique facturée.</p>

        {/* Barre de progression */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          {etapes.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < etapes.length - 1 ? 1 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, background: etape === i+1 ? '#2563eb' : etape > i+1 ? '#16a34a' : '#e5e7eb', color: etape >= i+1 ? 'white' : '#9ca3af' }}>
                  {etape > i+1 ? '✓' : i+1}
                </div>
                <span style={{ fontSize: 11, color: etape === i+1 ? '#2563eb' : '#9ca3af', fontWeight: 500, whiteSpace: 'nowrap' }}>{e}</span>
              </div>
              {i < etapes.length - 1 && <div style={{ flex: 1, height: 2, background: etape > i+1 ? '#16a34a' : '#e5e7eb', margin: '0 6px', marginBottom: 20 }} />}
            </div>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>

          {/* ETAPE 1 — BAILLEUR */}
          {etape === 1 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>🏠 Informations bailleur</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Prénom *</label><input style={inp} value={form.bailleur_prenom} onChange={e => setForm({...form, bailleur_prenom: e.target.value})} placeholder="Prénom" /></div>
                <div><label style={lbl}>Nom *</label><input style={inp} value={form.bailleur_nom} onChange={e => setForm({...form, bailleur_nom: e.target.value})} placeholder="Nom" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Date de naissance</label><input style={inp} type="date" value={form.bailleur_naissance} onChange={e => setForm({...form, bailleur_naissance: e.target.value})} /></div>
                <div><label style={lbl}>Lieu de naissance</label><input style={inp} value={form.bailleur_lieu_naissance} onChange={e => setForm({...form, bailleur_lieu_naissance: e.target.value})} placeholder="Paris, France" /></div>
              </div>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Nationalité</label><input style={inp} value={form.bailleur_nationalite} onChange={e => setForm({...form, bailleur_nationalite: e.target.value})} placeholder="Française" /></div>
              <div style={{ marginBottom: 24 }}><label style={lbl}>Adresse complète *</label><input style={inp} value={form.bailleur_adresse} onChange={e => setForm({...form, bailleur_adresse: e.target.value})} placeholder="12 rue de la Paix, 75001 Paris" /></div>
              <button onClick={() => { if (!form.bailleur_prenom || !form.bailleur_nom || !form.bailleur_adresse) { alert('Prénom, nom et adresse obligatoires.'); return } setEtape(2) }}
                style={{ width: '100%', background: '#2563eb', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>
                Suivant → Colocataires
              </button>
            </div>
          )}

          {/* ETAPE 2 — COLOCATAIRES */}
          {etape === 2 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>👥 Colocataires ({colocataires.length})</h3>
                <button onClick={ajouterColocataire}
                  style={{ background: '#eff6ff', color: '#2563eb', padding: '6px 14px', borderRadius: 8, border: '1px solid #bfdbfe', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  + Ajouter
                </button>
              </div>

              {colocataires.map((coloc, i) => (
                <div key={i} style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <p style={{ fontWeight: 700, color: '#111827', fontSize: 14, margin: 0 }}>👤 Colocataire {i + 1}</p>
                    {colocataires.length > 2 && (
                      <button onClick={() => supprimerColocataire(i)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 18 }}>×</button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><label style={lbl}>Prénom *</label><input style={inp} value={coloc.prenom} onChange={e => updateColocataire(i, 'prenom', e.target.value)} placeholder="Prénom" /></div>
                    <div><label style={lbl}>Nom *</label><input style={inp} value={coloc.nom} onChange={e => updateColocataire(i, 'nom', e.target.value)} placeholder="Nom" /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><label style={lbl}>Email *</label><input style={inp} type="email" value={coloc.email} onChange={e => updateColocataire(i, 'email', e.target.value)} placeholder="email@exemple.com" /></div>
                    <div><label style={lbl}>Téléphone</label><input style={inp} value={coloc.telephone} onChange={e => updateColocataire(i, 'telephone', e.target.value)} placeholder="06 00 00 00 00" /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><label style={lbl}>Date de naissance</label><input style={inp} type="date" value={coloc.naissance} onChange={e => updateColocataire(i, 'naissance', e.target.value)} /></div>
                    <div><label style={lbl}>Nationalité</label><input style={inp} value={coloc.nationalite} onChange={e => updateColocataire(i, 'nationalite', e.target.value)} placeholder="Française" /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><label style={lbl}>Profession</label><input style={inp} value={coloc.profession} onChange={e => updateColocataire(i, 'profession', e.target.value)} placeholder="Salarié, étudiant..." /></div>
                    <div><label style={lbl}>Part de loyer HC (€)</label><input style={inp} type="number" value={coloc.part_loyer} onChange={e => updateColocataire(i, 'part_loyer', e.target.value)} placeholder="Laisser vide = parts égales" /></div>
                  </div>
                  <div><label style={lbl}>Adresse actuelle</label><input style={inp} value={coloc.adresse} onChange={e => updateColocataire(i, 'adresse', e.target.value)} placeholder="Adresse actuelle du colocataire" /></div>
                </div>
              ))}

              {form.loyer_total_hc && (
                <div style={{ background: totalParts > 0 && Math.abs(totalParts - loyerTotal) > 1 ? '#fef2f2' : '#f0fdf4', borderRadius: 10, padding: 12, marginBottom: 16, border: `1px solid ${totalParts > 0 && Math.abs(totalParts - loyerTotal) > 1 ? '#fca5a5' : '#bbf7d0'}` }}>
                  <p style={{ fontSize: 13, margin: 0, color: totalParts > 0 && Math.abs(totalParts - loyerTotal) > 1 ? '#dc2626' : '#15803d', fontWeight: 600 }}>
                    {totalParts > 0 ? `Total des parts : ${totalParts}€ / ${loyerTotal}€` : `Parts égales : ${(loyerTotal / colocataires.length).toFixed(2)}€ par colocataire`}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEtape(1)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                <button onClick={() => {
                  if (colocataires.some(c => !c.prenom || !c.nom || !c.email)) { alert('Prénom, nom et email obligatoires pour chaque colocataire.'); return }
                  setEtape(3)
                }} style={{ flex: 2, background: '#2563eb', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Suivant → Bien & loyer</button>
              </div>
            </div>
          )}

          {/* ETAPE 3 — BIEN & LOYER */}
          {etape === 3 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>💰 Bien & conditions financières</h3>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Bien concerné *</label>
                <select style={inp} value={form.bien_id} onChange={e => {
                  const b = biens.find(b => b.id === parseInt(e.target.value))
                  setForm({...form, bien_id: e.target.value, surface_habitable: b?.surface?.toString() || '', nombre_pieces: b?.nombre_pieces?.toString() || '', etage: b?.etage || '', classe_dpe: b?.classe_dpe || 'D', equipements: b?.equipements || '', numero_lot: b?.numero_lot || ''})
                }}>
                  <option value="">— Sélectionnez un bien —</option>
                  {biens.map(b => <option key={b.id} value={b.id}>{b.nom} — {b.adresse}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Type de bail *</label>
                <select style={inp} value={form.type_bail} onChange={e => setForm({...form, type_bail: e.target.value})}>
                  <option>Non meublé</option><option>Meublé</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Surface (m²)</label><input style={inp} type="number" value={form.surface_habitable} onChange={e => setForm({...form, surface_habitable: e.target.value})} placeholder="45" /></div>
                <div><label style={lbl}>Nb de pièces</label><input style={inp} type="number" value={form.nombre_pieces} onChange={e => setForm({...form, nombre_pieces: e.target.value})} placeholder="3" /></div>
                <div><label style={lbl}>Étage / Bât.</label><input style={inp} value={form.etage} onChange={e => setForm({...form, etage: e.target.value})} placeholder="2ème / Bât. A" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Classe DPE</label>
                  <select style={inp} value={form.classe_dpe} onChange={e => setForm({...form, classe_dpe: e.target.value})}>
                    {['A','B','C','D','E','F','G'].map(c => <option key={c} value={c}>Classe {c}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Numéro de lot</label><input style={inp} value={form.numero_lot} onChange={e => setForm({...form, numero_lot: e.target.value})} placeholder="Lot 12" /></div>
              </div>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Équipements inclus</label><input style={inp} value={form.equipements} onChange={e => setForm({...form, equipements: e.target.value})} placeholder="Cuisine équipée, chaudière gaz..." /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Loyer total HC (€) *</label><input style={inp} type="number" value={form.loyer_total_hc} onChange={e => setForm({...form, loyer_total_hc: e.target.value})} placeholder="1200" /></div>
                <div><label style={lbl}>Charges totales (€)</label><input style={inp} type="number" value={form.charges} onChange={e => setForm({...form, charges: e.target.value})} placeholder="200" /></div>
                <div><label style={lbl}>Dépôt garantie total (€)</label><input style={inp} type="number" value={form.depot_garantie} onChange={e => setForm({...form, depot_garantie: e.target.value})} placeholder="1200" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Type de charges</label>
                  <select style={inp} value={form.type_charges} onChange={e => setForm({...form, type_charges: e.target.value})}>
                    <option value="Forfaitaires">Forfaitaires</option><option value="Provisionnelles">Provisionnelles</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Modalité de paiement</label>
                  <select style={inp} value={form.modalite_paiement} onChange={e => setForm({...form, modalite_paiement: e.target.value})}>
                    <option>Virement bancaire</option><option>Chèque</option><option>Prélèvement automatique</option><option>Espèces</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Jour d'exigibilité</label>
                  <select style={inp} value={form.date_exigibilite} onChange={e => setForm({...form, date_exigibilite: e.target.value})}>
                    {[1,5,10,15,20,25].map(j => <option key={j} value={j}>Le {j} du mois</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={lbl}>Révision IRL annuelle</label>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}><input type="radio" checked={form.revision_irl === true} onChange={() => setForm({...form, revision_irl: true})} /> Oui</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}><input type="radio" checked={form.revision_irl === false} onChange={() => setForm({...form, revision_irl: false})} /> Non</label>
                  </div>
                </div>
              </div>
              {form.loyer_total_hc && (
                <div style={{ background: '#eff6ff', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid #bfdbfe' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', margin: '0 0 6px' }}>Récapitulatif par colocataire</p>
                  {colocataires.map((c, i) => {
                    const part = parseFloat(c.part_loyer) || (loyerTotal / colocataires.length)
                    return <p key={i} style={{ fontSize: 12, color: '#374151', margin: '2px 0' }}>{c.prenom || `Colocataire ${i+1}`} : <strong>{part.toFixed(2)}€</strong> HC = <strong>{(part + (parseFloat(form.charges)||0)/colocataires.length).toFixed(2)}€ CC</strong></p>
                  })}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEtape(2)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                <button onClick={() => { if (!form.bien_id || !form.loyer_total_hc) { alert('Bien et loyer obligatoires.'); return } setEtape(4) }}
                  style={{ flex: 2, background: '#2563eb', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Suivant → Dates</button>
              </div>
            </div>
          )}

          {/* ETAPE 4 — DATES */}
          {etape === 4 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>📅 Dates & clauses</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Date de début *</label>
                  <input style={inp} type="date" value={form.date_debut} onChange={e => setForm({...form, date_debut: e.target.value})} />
                </div>
                <div>
                  <label style={lbl}>Date de fin (optionnel)</label>
                  <input style={inp} type="date" value={form.date_fin} onChange={e => setForm({...form, date_fin: e.target.value})} />
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Vide = reconduction tacite</p>
                </div>
              </div>
              {plan === 'automatique' && (
                <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#854d0e', margin: '0 0 12px' }}>📧 Relances automatiques</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <input type="checkbox" checked={form.relance_auto_active || false} onChange={e => setForm({...form, relance_auto_active: e.target.checked})} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                    <label style={{ fontSize: 13, color: '#374151', cursor: 'pointer', fontWeight: 500 }}>Activer les relances automatiques</label>
                  </div>
                  {form.relance_auto_active && (
                    <select style={inp} value={form.relance_auto_jours || 5} onChange={e => setForm({...form, relance_auto_jours: parseInt(e.target.value)})}>
                      {[3,5,7,10,15].map(j => <option key={j} value={j}>⏰ {j} jours sans paiement</option>)}
                    </select>
                  )}
                </div>
              )}
              <div style={{ marginBottom: 24 }}>
                <label style={lbl}>Clauses particulières</label>
                <textarea style={{ ...inp, minHeight: 100, resize: 'vertical' }} value={form.clauses} onChange={e => setForm({...form, clauses: e.target.value})} placeholder="Ex : parties communes partagées, animaux interdits..." />
              </div>
              {bienSel && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#15803d' }}>✅ Récapitulatif colocation</p>
                  <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}><b>Bailleur :</b> {form.bailleur_prenom} {form.bailleur_nom}</p>
                  <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}><b>Bien :</b> {bienSel.nom} — {form.surface_habitable}m² — DPE {form.classe_dpe}</p>
                  <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}><b>Loyer total :</b> {form.loyer_total_hc}€ HC + {form.charges||0}€ charges</p>
                  <p style={{ margin: '0 0 2px', fontSize: 12, color: '#374151' }}><b>Colocataires :</b> {colocataires.map(c => `${c.prenom} ${c.nom}`).join(', ')}</p>
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>⚡ 1 seule brique Stripe pour cette colocation.</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEtape(3)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                <button onClick={() => { if (!form.date_debut) { alert('Date de début obligatoire.'); return } setEcran('signature') }}
                  style={{ flex: 2, background: '#2563eb', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Passer à la signature →</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
