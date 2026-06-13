'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Home() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user)
    })
  }, [])

  const features = [
    { label: 'Coffre-fort numérique', gratuit: true, manuel: true, auto: true },
    { label: 'Mes Biens', gratuit: true, manuel: true, auto: true },
    { label: 'Quittances manuelles', gratuit: true, manuel: true, auto: true },
    { label: 'Mes Baux', gratuit: false, manuel: true, auto: true },
    { label: 'États des lieux numériques', gratuit: false, manuel: true, auto: true },
    { label: 'Email bail au locataire', gratuit: false, manuel: true, auto: true },
    { label: 'Récap fiscal annuel', gratuit: false, manuel: true, auto: true },
    { label: 'Connexion bancaire', gratuit: false, manuel: false, auto: true },
    { label: 'Détection automatique des loyers', gratuit: false, manuel: false, auto: true },
    { label: 'Quittances automatiques', gratuit: false, manuel: false, auto: true },
    { label: 'Relances automatiques locataire', gratuit: false, manuel: false, auto: true },
  ]

  const Check = () => <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 18 }}>✓</span>
  const Cross = () => <span style={{ color: '#d1d5db', fontWeight: 700, fontSize: 18 }}>✕</span>

  return (
    <main style={{ minHeight: '100vh', background: 'white', fontFamily: 'Arial, sans-serif' }}>

      {/* NAV */}
      <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>GestionLocative</span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {user ? (
              <a href="/dashboard" style={{ background: '#2563eb', color: 'white', padding: '8px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                Mon espace →
              </a>
            ) : (
              <>
                <a href="/auth" style={{ color: '#374151', fontWeight: 500, fontSize: 14, textDecoration: 'none' }}>Connexion</a>
                <a href="/auth" style={{ background: '#2563eb', color: 'white', padding: '8px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                  Essayer gratuitement
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#dbeafe', color: '#1d4ed8', padding: '6px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
            🇫🇷 Conçu pour les propriétaires français
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 800, color: '#111827', lineHeight: 1.15, margin: '0 0 20px' }}>
            Gérez vos biens locatifs<br />
            <span style={{ color: '#2563eb' }}>en toute simplicité</span>
          </h1>
          <p style={{ fontSize: 18, color: '#6b7280', lineHeight: 1.7, margin: '0 auto 36px', maxWidth: 600 }}>
            Connexion bancaire automatique, quittances générées en un clic, coffre-fort numérique. Tout ce dont vous avez besoin pour gérer votre patrimoine immobilier.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/auth" style={{ background: '#2563eb', color: 'white', padding: '14px 32px', borderRadius: 10, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
              Commencer gratuitement →
            </a>
            <a href="#tarifs" style={{ background: 'white', color: '#374151', padding: '14px 32px', borderRadius: 10, fontWeight: 600, fontSize: 16, textDecoration: 'none', border: '1px solid #e5e7eb' }}>
              Voir les tarifs
            </a>
          </div>
        </div>
      </section>

      {/* FONCTIONNALITÉS */}
      <section style={{ padding: '72px 24px', background: 'white' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#111827', textAlign: 'center', margin: '0 0 48px' }}>
            Tout ce qu'il vous faut
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { emoji: '🏦', titre: 'Connexion bancaire', desc: 'Détection automatique de vos loyers sur 50+ banques françaises via Bridge.' },
              { emoji: '📄', titre: 'Quittances automatiques', desc: 'Générées et archivées automatiquement dès réception du loyer.' },
              { emoji: '🔒', titre: 'Coffre-fort numérique', desc: 'Tous vos documents immobiliers centralisés et sécurisés.' },
              { emoji: '✍️', titre: 'Baux conformes ALUR', desc: 'Créez des baux officiels avec signature numérique intégrée.' },
              { emoji: '📋', titre: 'États des lieux', desc: 'Formulaire complet avec photos, comparaison entrée/sortie.' },
              { emoji: '📊', titre: 'Récap fiscal annuel', desc: 'Préparez votre déclaration de revenus fonciers en un clic.' },
            ].map((f, i) => (
              <div key={i} style={{ background: '#f9fafb', borderRadius: 16, padding: 28, border: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{f.emoji}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>{f.titre}</h3>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ARGUMENT FISCAL */}
      <section style={{ background: '#eff6ff', padding: '56px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>💡</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1e40af', margin: '0 0 16px' }}>
            Un abonnement déductible de vos impôts
          </h2>
          <p style={{ fontSize: 16, color: '#374151', lineHeight: 1.7, margin: 0 }}>
  Selon l'article 31 du Code Général des Impôts, les frais de gestion locative sont <strong>déductibles de vos revenus fonciers</strong>. Votre abonnement GestionLocative est une charge déductible de votre avis d'imposition.
</p>
        </div>
      </section>

      {/* TARIFS */}
      <section id="tarifs" style={{ padding: '72px 24px', background: 'white' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#111827', textAlign: 'center', margin: '0 0 8px' }}>
            Des tarifs simples et transparents
          </h2>
          <p style={{ fontSize: 16, color: '#6b7280', textAlign: 'center', margin: '0 0 48px' }}>
            Payez uniquement pour vos bails actifs — pas de frais cachés
          </p>

          {/* Cards plans */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 48 }}>
            {[
              {
                nom: 'Gratuit', prix: '0€', periode: 'pour toujours',
                couleur: '#6b7280', bg: 'white', border: '#e5e7eb',
                boutonBg: '#111827', desc: 'Pour découvrir la plateforme',
              },
              {
                nom: 'Manuel', prix: '4€', periode: 'par bail actif / mois',
                couleur: '#2563eb', bg: '#eff6ff', border: '#bfdbfe',
                boutonBg: '#2563eb', desc: 'Pour gérer sans banque connectée',
              },
              {
                nom: 'Automatique', prix: '6€', periode: 'par bail actif / mois',
                couleur: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0',
                boutonBg: '#16a34a', desc: 'La gestion locative en pilote automatique',
                populaire: true,
              },
            ].map((plan, i) => (
              <div key={i} style={{ background: plan.bg, border: `2px solid ${plan.border}`, borderRadius: 20, padding: 28, position: 'relative' }}>
                {plan.populaire && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#16a34a', color: 'white', padding: '4px 16px', borderRadius: 99, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    ⭐ Recommandé
                  </div>
                )}
                <p style={{ fontSize: 13, fontWeight: 600, color: plan.couleur, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>{plan.nom}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 40, fontWeight: 800, color: '#111827' }}>{plan.prix}</span>
                </div>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>{plan.periode}</p>
                <p style={{ fontSize: 14, color: '#374151', margin: '0 0 24px', lineHeight: 1.5 }}>{plan.desc}</p>
                <a href="/auth" style={{ display: 'block', background: plan.boutonBg, color: 'white', padding: '10px', borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: 'none', textAlign: 'center' }}>
                  Commencer →
                </a>
              </div>
            ))}
          </div>

          {/* Tableau comparatif */}
          <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#374151' }}>Fonctionnalité</div>
              <div style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#6b7280', textAlign: 'center' }}>Gratuit</div>
              <div style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#2563eb', textAlign: 'center' }}>Manuel</div>
              <div style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#16a34a', textAlign: 'center' }}>Automatique</div>
            </div>
            {/* Lignes */}
            {features.map((f, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: i < features.length - 1 ? '1px solid #f3f4f6' : 'none', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <div style={{ padding: '13px 20px', fontSize: 14, color: '#374151', fontWeight: 500 }}>{f.label}</div>
                <div style={{ padding: '13px 20px', textAlign: 'center' }}>{f.gratuit ? <Check /> : <Cross />}</div>
                <div style={{ padding: '13px 20px', textAlign: 'center' }}>{f.manuel ? <Check /> : <Cross />}</div>
                <div style={{ padding: '13px 20px', textAlign: 'center' }}>{f.auto ? <Check /> : <Cross />}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ background: '#2563eb', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: 'white', margin: '0 0 16px' }}>
            Prêt à simplifier votre gestion locative ?
          </h2>
          <p style={{ fontSize: 16, color: '#bfdbfe', margin: '0 0 32px', lineHeight: 1.6 }}>
            Rejoignez les propriétaires qui gèrent leur patrimoine sereinement. Gratuit pour commencer, sans carte bancaire.
          </p>
          <a href="/auth" style={{ background: 'white', color: '#2563eb', padding: '14px 36px', borderRadius: 10, fontWeight: 700, fontSize: 16, textDecoration: 'none', display: 'inline-block' }}>
            Commencer gratuitement →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#111827', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
          © 2026 GestionLocative — Conforme loi ALUR — Fait avec ❤️ en France
        </p>
      </footer>

    </main>
  )
}