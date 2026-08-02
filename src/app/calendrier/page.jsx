'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import Nav from '../components/nav'

const DUREE_DIAGNOSTIC = {
  'DPE': 10,
  'Diagnostic électricité': 3,
  'Diagnostic gaz': 3,
}

function ajouterAns(date, ans) {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + ans)
  return d
}

function prochaineAnniversaire(dateDebut) {
  const debut = new Date(dateDebut)
  const maintenant = new Date()
  const anniversaireCetteAnnee = new Date(maintenant.getFullYear(), debut.getMonth(), debut.getDate())
  if (anniversaireCetteAnnee < maintenant) {
    anniversaireCetteAnnee.setFullYear(anniversaireCetteAnnee.getFullYear() + 1)
  }
  return anniversaireCetteAnnee
}

const STYLES_TYPE = {
  fin_bail: { emoji: '📄', bg: '#fef3c7', color: '#92400e', label: 'Fin de bail' },
  revision: { emoji: '📈', bg: '#dbeafe', color: '#1e40af', label: 'Révision IRL' },
  diagnostic: { emoji: '🔍', bg: '#fce7f3', color: '#9d174d', label: 'Diagnostic' },
}

export default function Calendrier() {
  const [user, setUser] = useState(null)
  const [evenements, setEvenements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) { window.location.href = '/auth'; return }
      setUser(data.user)
      await chargerEvenements(data.user.id)
      setLoading(false)
    })
  }, [])

  async function chargerEvenements(userId) {
    const liste = []

    const { data: baux } = await supabase
      .from('Baux')
      .select('id, date_fin, revision_irl, date_debut, locataire_prenom, locataire_nom, locataire_denomination, locataire_type, Biens(nom)')
      .eq('user_id', userId)
      .eq('statut', 'actif')

    for (const bail of baux || []) {
      const nomLocataire = bail.locataire_type === 'morale' ? bail.locataire_denomination : `${bail.locataire_prenom || ''} ${bail.locataire_nom || ''}`.trim()
      const bienNom = bail.Biens?.nom || 'Bien'

      if (bail.date_fin) {
        liste.push({
          date: new Date(bail.date_fin),
          type: 'fin_bail',
          titre: `Fin de bail — ${bienNom}`,
          sousTitre: nomLocataire ? `Locataire : ${nomLocataire}` : null,
          lien: `/baux/${bail.id}`,
        })
      }

      if (bail.revision_irl === true && bail.date_debut) {
        liste.push({
          date: prochaineAnniversaire(bail.date_debut),
          type: 'revision',
          titre: `Révision de loyer possible — ${bienNom}`,
          sousTitre: nomLocataire ? `Locataire : ${nomLocataire}` : null,
          lien: `/baux/${bail.id}`,
        })
      }
    }

    const { data: documents } = await supabase
      .from('Documents')
      .select('id, categorie, date_document, archive, Biens(nom)')
      .eq('user_id', userId)
      .eq('archive', false)
      .in('categorie', Object.keys(DUREE_DIAGNOSTIC))
      .not('date_document', 'is', null)

    for (const doc of documents || []) {
      const dureeAns = DUREE_DIAGNOSTIC[doc.categorie]
      const dateExpiration = ajouterAns(doc.date_document, dureeAns)
      liste.push({
        date: dateExpiration,
        type: 'diagnostic',
        titre: `${doc.categorie} à renouveler — ${doc.Biens?.nom || 'Bien'}`,
        sousTitre: null,
        lien: '/coffre-fort',
      })
    }

    liste.sort((a, b) => a.date - b.date)
    setEvenements(liste)
  }

  const maintenant = new Date()
  const dans30Jours = new Date(maintenant.getTime() + 30 * 24 * 60 * 60 * 1000)

  const enRetard = evenements.filter(e => e.date < maintenant)
  const ceMois = evenements.filter(e => e.date >= maintenant && e.date <= dans30Jours)
  const aVenir = evenements.filter(e => e.date > dans30Jours)

  function ligneEvenement(e, i) {
    const style = STYLES_TYPE[e.type]
    return (
      <a key={i} href={e.lien} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', borderRadius: 12, background: 'white', border: '1px solid #f3f4f6', marginBottom: 8, cursor: 'pointer' }}>
          <div style={{ background: style.bg, color: style.color, width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
            {style.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#111827' }}>{e.titre}</p>
            {e.sousTitre && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>{e.sousTitre}</p>}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span style={{ background: style.bg, color: style.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>{style.label}</span>
            <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: '#374151' }}>{e.date.toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      </a>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Nav pageCourante="calendrier" />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>📅 Calendrier des échéances</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 32 }}>Fins de bail, révisions de loyer et diagnostics à renouveler, tout au même endroit.</p>

        {loading ? (
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: 60 }}>Chargement...</p>
        ) : evenements.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 16, padding: 40, textAlign: 'center', border: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p style={{ color: '#6b7280', margin: 0 }}>Aucune échéance à venir pour le moment.</p>
          </div>
        ) : (
          <>
            {enRetard.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', marginBottom: 12 }}>⚠️ En retard ({enRetard.length})</h2>
                {enRetard.map(ligneEvenement)}
              </div>
            )}
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Dans les 30 prochains jours ({ceMois.length})</h2>
              {ceMois.length > 0 ? ceMois.map(ligneEvenement) : (
                <p style={{ color: '#9ca3af', fontSize: 13 }}>Rien de prévu dans les 30 prochains jours.</p>
              )}
            </div>
            {aVenir.length > 0 && (
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Plus tard ({aVenir.length})</h2>
                {aVenir.map(ligneEvenement)}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
