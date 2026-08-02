'use client'
import { useState, useMemo } from 'react'

const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, marginBottom: 14, boxSizing: 'border-box' }
const label = { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }

function arrondi(n) {
  return Math.round(n * 100) / 100
}

export default function SimulateurRentabilite() {
  const [avecCredit, setAvecCredit] = useState(false)

  const [form, setForm] = useState({
    prixAchat: '', fraisNotaire: '7.5', travaux: '',
    loyerMensuel: '', chargesMensuelles: '', taxeFonciere: '', assurancePNO: '',
    fraisGestion: '0', vacanceLocative: '0',
    apport: '', tauxCredit: '3.5', dureeCredit: '20',
  })

  function set(champ, valeur) {
    setForm(f => ({ ...f, [champ]: valeur }))
  }

  const resultats = useMemo(() => {
    const prixAchat = parseFloat(form.prixAchat) || 0
    if (prixAchat <= 0) return null

    const fraisNotaire = parseFloat(form.fraisNotaire) || 0
    const travaux = parseFloat(form.travaux) || 0
    const loyerMensuel = parseFloat(form.loyerMensuel) || 0
    const chargesMensuelles = parseFloat(form.chargesMensuelles) || 0
    const taxeFonciere = parseFloat(form.taxeFonciere) || 0
    const assurancePNO = parseFloat(form.assurancePNO) || 0
    const fraisGestion = parseFloat(form.fraisGestion) || 0
    const vacanceMois = Math.min(12, parseFloat(form.vacanceLocative) || 0)

    const investissementTotal = prixAchat * (1 + fraisNotaire / 100) + travaux
    const loyerAnnuelBrut = loyerMensuel * 12
    const loyerAnnuelReel = loyerMensuel * (12 - vacanceMois)
    const fraisGestionAnnuel = loyerAnnuelReel * (fraisGestion / 100)
    const chargesAnnuelles = chargesMensuelles * 12 + taxeFonciere + assurancePNO + fraisGestionAnnuel

    const rendementBrut = investissementTotal > 0 ? (loyerAnnuelBrut / investissementTotal) * 100 : 0
    const revenuNetAnnuel = loyerAnnuelReel - chargesAnnuelles
    const rendementNet = investissementTotal > 0 ? (revenuNetAnnuel / investissementTotal) * 100 : 0
    const cashFlowMensuelSansCredit = revenuNetAnnuel / 12

    let mensualiteCredit = 0
    let cashFlowMensuelAvecCredit = null
    if (avecCredit) {
      const apport = parseFloat(form.apport) || 0
      const tauxAnnuel = parseFloat(form.tauxCredit) || 0
      const dureeAns = parseFloat(form.dureeCredit) || 0
      const montantEmprunte = Math.max(0, investissementTotal - apport)
      const tauxMensuel = tauxAnnuel / 100 / 12
      const nMois = dureeAns * 12
      if (montantEmprunte > 0 && tauxMensuel > 0 && nMois > 0) {
        mensualiteCredit = montantEmprunte * tauxMensuel / (1 - Math.pow(1 + tauxMensuel, -nMois))
      } else if (montantEmprunte > 0 && nMois > 0) {
        mensualiteCredit = montantEmprunte / nMois
      }
      cashFlowMensuelAvecCredit = cashFlowMensuelSansCredit - mensualiteCredit
    }

    return {
      investissementTotal: arrondi(investissementTotal),
      rendementBrut: arrondi(rendementBrut),
      rendementNet: arrondi(rendementNet),
      cashFlowMensuelSansCredit: arrondi(cashFlowMensuelSansCredit),
      mensualiteCredit: arrondi(mensualiteCredit),
      cashFlowMensuelAvecCredit: cashFlowMensuelAvecCredit !== null ? arrondi(cashFlowMensuelAvecCredit) : null,
    }
  }, [form, avecCredit])

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header public */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 20, fontWeight: 800, color: '#2563eb', textDecoration: 'none' }}>
            <img src="/icon-192.png" alt="Ma Gestion-Locative" style={{ width: 28, height: 28, borderRadius: 6 }} /> Ma Gestion-Locative
          </a>
          <a href="/auth" style={{ background: '#2563eb', color: 'white', padding: '8px 18px', borderRadius: 8, fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>Créer un compte</a>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>📊 Simulateur de rentabilité locative</h1>
        <p style={{ color: '#6b7280', fontSize: 15, margin: '0 0 28px' }}>Estimez le rendement brut, net et le cash-flow mensuel de votre investissement locatif, gratuitement et sans inscription.</p>

        <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>🏠 Le bien</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={label}>Prix d'achat (€) *</label>
              <input type="number" style={inp} value={form.prixAchat} onChange={e => set('prixAchat', e.target.value)} placeholder="Ex : 150000" />
            </div>
            <div>
              <label style={label}>Frais de notaire (%)</label>
              <input type="number" style={inp} value={form.fraisNotaire} onChange={e => set('fraisNotaire', e.target.value)} placeholder="7.5 ancien, 2.5 neuf" />
            </div>
          </div>
          <label style={label}>Travaux éventuels (€)</label>
          <input type="number" style={inp} value={form.travaux} onChange={e => set('travaux', e.target.value)} placeholder="0" />

          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '20px 0 12px' }}>💶 Les revenus</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={label}>Loyer mensuel hors charges (€) *</label>
              <input type="number" style={inp} value={form.loyerMensuel} onChange={e => set('loyerMensuel', e.target.value)} placeholder="Ex : 650" />
            </div>
            <div>
              <label style={label}>Vacance locative estimée (mois/an)</label>
              <input type="number" style={inp} value={form.vacanceLocative} onChange={e => set('vacanceLocative', e.target.value)} placeholder="0" />
            </div>
          </div>

          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '20px 0 12px' }}>📉 Les charges</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={label}>Charges non récupérables (€/mois)</label>
              <input type="number" style={inp} value={form.chargesMensuelles} onChange={e => set('chargesMensuelles', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={label}>Taxe foncière (€/an)</label>
              <input type="number" style={inp} value={form.taxeFonciere} onChange={e => set('taxeFonciere', e.target.value)} placeholder="0" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={label}>Assurance PNO (€/an)</label>
              <input type="number" style={inp} value={form.assurancePNO} onChange={e => set('assurancePNO', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={label}>Frais de gestion locative (%)</label>
              <input type="number" style={inp} value={form.fraisGestion} onChange={e => set('fraisGestion', e.target.value)} placeholder="0" />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', margin: '16px 0 4px', cursor: 'pointer' }}>
            <input type="checkbox" checked={avecCredit} onChange={e => setAvecCredit(e.target.checked)} />
            Je finance cet achat avec un crédit
          </label>

          {avecCredit && (
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginTop: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={label}>Apport (€)</label>
                  <input type="number" style={inp} value={form.apport} onChange={e => set('apport', e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label style={label}>Taux annuel (%)</label>
                  <input type="number" style={inp} value={form.tauxCredit} onChange={e => set('tauxCredit', e.target.value)} placeholder="3.5" />
                </div>
                <div>
                  <label style={label}>Durée (ans)</label>
                  <input type="number" style={inp} value={form.dureeCredit} onChange={e => set('dureeCredit', e.target.value)} placeholder="20" />
                </div>
              </div>
            </div>
          )}
        </div>

        {resultats && (
          <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>📈 Résultats</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#eff6ff', borderRadius: 12, padding: 16 }}>
                <p style={{ fontSize: 12, color: '#1e40af', margin: '0 0 4px', fontWeight: 600 }}>Rendement brut</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: '#1e40af', margin: 0 }}>{resultats.rendementBrut}%</p>
              </div>
              <div style={{ background: '#eff6ff', borderRadius: 12, padding: 16 }}>
                <p style={{ fontSize: 12, color: '#1e40af', margin: '0 0 4px', fontWeight: 600 }}>Rendement net de charges</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: '#1e40af', margin: 0 }}>{resultats.rendementNet}%</p>
              </div>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px' }}>Investissement total (prix + notaire + travaux)</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>{resultats.investissementTotal.toLocaleString('fr-FR')} €</p>
            </div>

            <div style={{ background: resultats.cashFlowMensuelSansCredit >= 0 ? '#dcfce7' : '#fee2e2', borderRadius: 12, padding: 16, marginBottom: avecCredit ? 12 : 0 }}>
              <p style={{ fontSize: 13, color: resultats.cashFlowMensuelSansCredit >= 0 ? '#15803d' : '#dc2626', margin: '0 0 4px', fontWeight: 600 }}>
                Cash-flow mensuel (sans crédit)
              </p>
              <p style={{ fontSize: 20, fontWeight: 800, color: resultats.cashFlowMensuelSansCredit >= 0 ? '#15803d' : '#dc2626', margin: 0 }}>
                {resultats.cashFlowMensuelSansCredit >= 0 ? '+' : ''}{resultats.cashFlowMensuelSansCredit.toLocaleString('fr-FR')} €/mois
              </p>
            </div>

            {avecCredit && resultats.cashFlowMensuelAvecCredit !== null && (
              <>
                <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px' }}>Mensualité de crédit estimée</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>{resultats.mensualiteCredit.toLocaleString('fr-FR')} €/mois</p>
                </div>
                <div style={{ background: resultats.cashFlowMensuelAvecCredit >= 0 ? '#dcfce7' : '#fee2e2', borderRadius: 12, padding: 16 }}>
                  <p style={{ fontSize: 13, color: resultats.cashFlowMensuelAvecCredit >= 0 ? '#15803d' : '#dc2626', margin: '0 0 4px', fontWeight: 600 }}>
                    Cash-flow mensuel (avec crédit)
                  </p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: resultats.cashFlowMensuelAvecCredit >= 0 ? '#15803d' : '#dc2626', margin: 0 }}>
                    {resultats.cashFlowMensuelAvecCredit >= 0 ? '+' : ''}{resultats.cashFlowMensuelAvecCredit.toLocaleString('fr-FR')} €/mois
                  </p>
                </div>
              </>
            )}

            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 16, marginBottom: 0 }}>
              ⚠️ Estimation indicative uniquement, hors fiscalité (impôt sur le revenu, prélèvements sociaux) et hors assurance emprunteur. Ne remplace pas les conseils d'un professionnel (notaire, conseiller en gestion de patrimoine).
            </p>
          </div>
        )}

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 14, color: '#1e40af', margin: '0 0 12px', fontWeight: 600 }}>🏠 Vous avez trouvé votre futur investissement ?</p>
          <p style={{ fontSize: 13, color: '#374151', margin: '0 0 16px' }}>Ma Gestion-Locative génère vos baux, quittances, états des lieux et bien plus — et archive tout automatiquement dans un coffre-fort sécurisé.</p>
          <a href="/auth" style={{ background: '#2563eb', color: 'white', padding: '10px 24px', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Découvrir gratuitement →</a>
        </div>
      </div>
    </main>
  )
}
