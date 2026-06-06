'use client'

import { useState } from 'react'
import { generateQuittance } from '@/lib/generationQuittance'

export default function Quittance() {
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    generateQuittance({
      proprietaire: {
        nom: 'Marechal',
        prenom: 'Andy',
        adresse: '12 rue de la Paix, 75001 Paris',
      },
      locataire: {
        nom: 'Dupont',
        prenom: 'Jean',
      },
      bien: {
        adresse: '5 avenue des Fleurs',
        ville: 'Lyon',
        codePostal: '69001',
      },
      loyer: {
        montant: 800,
        charges: 50,
        periode: 'juin 2026',
        datePaiement: '05/06/2026',
      },
    })
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 32, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2563eb', marginBottom: 8 }}>Test Quittance PDF</h1>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>Génère une quittance de test</p>
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{ background: '#2563eb', color: 'white', padding: '12px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
        >
          {loading ? 'Génération...' : '📄 Générer la quittance PDF'}
        </button>
      </div>
    </main>
  )
}