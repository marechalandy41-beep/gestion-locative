'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../supabase'

export default function NouvelleColocation() {
  const [user, setUser] = useState(null)
  const [biens, setBiens] = useState([])
  const [loading, setLoading] = useState(false)
  const [etape, setEtape] = useState(1)

  const [form, setForm] = useState({
    bien_id: '',
    bailleur_prenom: '', bailleur_nom: '', bailleur_adresse: '',
    loyer_total_hc: '', charges: '', depot_garantie: '',
    date_exigibilite: '1', date_debut: '', date_fin: '',
    type_bail: 'Non meublé', clauses: '',
  })

  const colocataireVide = { prenom: '', nom: '', email: '', telephone: '', part_loyer: '' }
  const [colocataires, setColocataires] = useState([
    { ...colocataireVide },
    { ...colocataireVide },
  ])

  const inp = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'white' }
  const lbl = { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) { window.location.href = '/auth'; return }
      const { data: customer } = await supabase.from('customers').select('plan').eq('user_id', data.user.id).single()
      if (!customer || customer.plan === 'gratuit') { window.location.href = '/biens?plan=gratuit'; return }
      setUser(data.user)
      const { data: biensData } = await supabase.from('Biens').select('*').eq('user_id', data.user.id)
      setBiens(biensData || [])
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
  }

  function supprimerColocataire(index) {
    if (colocataires.length <= 2) { alert('Minimum 2 colocataires pour une colocation.'); return }
    setColocataires(colocataires.filter((_, i) => i !== index))
  }

  const totalParts = colocataires.reduce((acc, c) => acc + (parseFloat(c.part_loyer) || 0), 0)
  const loyerTotal = parseFloat(form.loyer_total_hc) || 0

  async function sauvegarder() {
    if (!form.bien_id) { alert('Sélectionnez un bien.'); return }
    if (!form.loyer_total_hc) { alert('Renseignez le loyer total.'); return }
    if (!form.date_debut) { alert('Renseignez la date de début.'); return }
    if (colocataires.some(c => !c.prenom || !c.nom || !c.email)) { alert('Renseignez prénom, nom et email de chaque colocataire.'); return }

    setLoading(true)

    // Créer 1 bail par colocataire (avec is_colocation = true)
    const bailsIds = []
    for (const coloc of colocataires) {
      const partLoyer = parseFloat(coloc.part_loyer) || (loyerTotal / colocataires.length)
      const { data: bail, error } = await supabase.from('Baux').insert({
        user_id: user.id,
        bien_id: parseInt(form.bien_id),
        type_bail: form.type_bail,
        loyer_hc: partLoyer,
        charges: parseFloat(form.charges) / colocataires.length || 0,
        depot_garantie: parseFloat(form.depot_garantie) / colocataires.length || 0,
        date_debut: form.date_debut || null,
        date_fin: form.date_fin || null,
        date_exigibilite: parseInt(form.date_exigibilite) || 1,
        locataire_prenom: coloc.prenom,
        locataire_nom: coloc.nom,
        locataire_email: coloc.email,
        locataire_telephone: coloc.telephone,
        bailleur_prenom: form.bailleur_prenom,
        bailleur_nom: form.bailleur_nom,
        bailleur_adresse: form.bailleur_adresse,
        clauses: form.clauses,
        statut: 'actif',
        is_colocation: true,
        colocataires: colocataires.map(c => ({ prenom: c.prenom, nom: c.nom, email: c.email, part_loyer: parseFloat(c.part_loyer) || 0 })),
      }).select().single()

      if (error) { alert('Erreur : ' + error.message); setLoading(false); return }
      bailsIds.push(bail.id)
    }

    // Sync Stripe quantity (1 seule brique pour toute la colocation)
    await fetch('/api/sync-quantity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    }).catch(() => {})

    setLoading(false)
    window.location.href = '/baux'
  }

  const etapes = ['Bailleur', 'Colocataires', 'Bien & loyer', 'Dates']

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        <button onClick={() => window.location.href = '/baux/nouveau'} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>← Retour</button>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Nouvelle colocation</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 28 }}>Un bail par colocataire avec sa part de loyer — 1 seule brique facturée.</p>

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
              <div style={{ marginBottom: 24 }}>
                <label style={lbl}>Adresse complète *</label>
                <input style={inp} value={form.bailleur_adresse} onChange={e => setForm({...form, bailleur_adresse: e.target.value})} placeholder="12 rue de la Paix, 75001 Paris" />
              </div>
              <button onClick={() => { if (!form.bailleur_prenom || !form.bailleur_nom || !form.bailleur_adresse) { alert('Tous les champs bailleur sont obligatoires.'); return } setEtape(2) }}
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
                    <p style={{ fontWeight: 600, color: '#111827', fontSize: 14, margin: 0 }}>Colocataire {i + 1}</p>
                    {colocataires.length > 2 && (
                      <button onClick={() => supprimerColocataire(i)}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 18 }}>×</button>
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
                  <div>
                    <label style={lbl}>Part de loyer HC (€) — laisser vide pour parts égales</label>
                    <input style={inp} type="number" value={coloc.part_loyer} onChange={e => updateColocataire(i, 'part_loyer', e.target.value)} placeholder="Ex: 350" />
                  </div>
                </div>
              ))}

              {form.loyer_total_hc && (
                <div style={{ background: totalParts > 0 && Math.abs(totalParts - loyerTotal) > 1 ? '#fef2f2' : '#f0fdf4', borderRadius: 10, padding: 12, marginBottom: 16, border: `1px solid ${totalParts > 0 && Math.abs(totalParts - loyerTotal) > 1 ? '#fca5a5' : '#bbf7d0'}` }}>
                  <p style={{ fontSize: 13, margin: 0, color: totalParts > 0 && Math.abs(totalParts - loyerTotal) > 1 ? '#dc2626' : '#15803d', fontWeight: 600 }}>
                    {totalParts > 0 ? `Total des parts : ${totalParts}€ / ${loyerTotal}€` : `Parts égales : ${(loyerTotal / colocataires.length).toFixed(2)}€ par colocataire`}
                    {totalParts > 0 && Math.abs(totalParts - loyerTotal) > 1 ? ' ⚠️ Les parts ne correspondent pas au loyer total' : ' ✅'}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEtape(1)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                <button onClick={() => setEtape(3)} style={{ flex: 2, background: '#2563eb', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Suivant → Bien & loyer</button>
              </div>
            </div>
          )}

          {/* ETAPE 3 — BIEN & LOYER */}
          {etape === 3 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 20 }}>💰 Bien & conditions financières</h3>

              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Bien concerné *</label>
                <select style={inp} value={form.bien_id} onChange={e => setForm({...form, bien_id: e.target.value})}>
                  <option value="">— Sélectionnez un bien —</option>
                  {biens.map(b => <option key={b.id} value={b.id}>{b.nom} — {b.adresse}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Type de bail</label>
                <select style={inp} value={form.type_bail} onChange={e => setForm({...form, type_bail: e.target.value})}>
                  <option>Non meublé</option><option>Meublé</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Loyer total HC (€) *</label>
                  <input style={inp} type="number" value={form.loyer_total_hc} onChange={e => setForm({...form, loyer_total_hc: e.target.value})} placeholder="Ex: 1200" />
                </div>
                <div>
                  <label style={lbl}>Charges totales (€)</label>
                  <input style={inp} type="number" value={form.charges} onChange={e => setForm({...form, charges: e.target.value})} placeholder="Ex: 200" />
                </div>
                <div>
                  <label style={lbl}>Dépôt garantie total (€)</label>
                  <input style={inp} type="number" value={form.depot_garantie} onChange={e => setForm({...form, depot_garantie: e.target.value})} placeholder="Ex: 1200" />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Jour d'exigibilité</label>
                <select style={inp} value={form.date_exigibilite} onChange={e => setForm({...form, date_exigibilite: e.target.value})}>
                  {[1,5,10,15,20,25].map(j => <option key={j} value={j}>Le {j} du mois</option>)}
                </select>
              </div>

              {form.loyer_total_hc && (
                <div style={{ background: '#eff6ff', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid #bfdbfe' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', margin: '0 0 4px' }}>Récapitulatif par colocataire</p>
                  {colocataires.map((c, i) => {
                    const part = parseFloat(c.part_loyer) || (loyerTotal / colocataires.length)
                    return (
                      <p key={i} style={{ fontSize: 12, color: '#374151', margin: '2px 0' }}>
                        {c.prenom || `Colocataire ${i+1}`} : <strong>{part.toFixed(2)}€</strong> HC + {((parseFloat(form.charges) || 0) / colocataires.length).toFixed(2)}€ charges = <strong>{(part + (parseFloat(form.charges) || 0) / colocataires.length).toFixed(2)}€ CC</strong>
                      </p>
                    )
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

              <div style={{ marginBottom: 24 }}>
                <label style={lbl}>Clauses particulières</label>
                <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={form.clauses} onChange={e => setForm({...form, clauses: e.target.value})} placeholder="Ex : animaux interdits, parties communes partagées..." />
              </div>

              {/* Récap final */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#15803d', margin: '0 0 8px' }}>✅ Récapitulatif colocation</p>
                <p style={{ fontSize: 12, color: '#374151', margin: '2px 0' }}><b>Bien :</b> {biens.find(b => b.id === parseInt(form.bien_id))?.nom}</p>
                <p style={{ fontSize: 12, color: '#374151', margin: '2px 0' }}><b>Loyer total :</b> {form.loyer_total_hc}€ HC + {form.charges||0}€ charges</p>
                <p style={{ fontSize: 12, color: '#374151', margin: '2px 0' }}><b>Colocataires :</b> {colocataires.map(c => `${c.prenom} ${c.nom}`).join(', ')}</p>
                <p style={{ fontSize: 12, color: '#374151', margin: '2px 0' }}><b>Début :</b> {form.date_debut ? new Date(form.date_debut).toLocaleDateString('fr-FR') : '—'}</p>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '8px 0 0', fontStyle: 'italic' }}>⚡ 1 seule brique Stripe sera facturée pour cette colocation.</p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEtape(3)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
                <button onClick={sauvegarder} disabled={loading}
                  style={{ flex: 2, background: loading ? '#86efac' : '#16a34a', color: 'white', padding: 12, borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15 }}>
                  {loading ? '⏳ Création...' : '🏠 Créer la colocation'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
