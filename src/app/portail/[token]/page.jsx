'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../supabase'

export default function PortailLocataire() {
  const token = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : null
  const [data, setData] = useState(null)
  const [quittances, setQuittances] = useState([])
  const [edls, setEdls] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [onglet, setOnglet] = useState('quittances')
  // ===== MESSAGERIE =====
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)

  useEffect(() => {
    if (token) charger()
  }, [])

  // Polling messages toutes les 5 secondes (démarre après chargement)
  useEffect(() => {
    if (!data) return
    chargerMessages()
    const interval = setInterval(chargerMessages, 5000)
    return () => clearInterval(interval)
  }, [data])

  async function charger() {
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('*, Baux(*, Biens(*))')
      .eq('token', token)
      .single()

    if (error || !invitation) {
      setErreur('Lien invalide ou expiré.')
      setLoading(false)
      return
    }

    if (new Date(invitation.expires_at) < new Date()) {
      setErreur('Ce lien a expiré. Demandez un nouveau lien à votre propriétaire.')
      setLoading(false)
      return
    }

    setData(invitation)

    // Charger les quittances
    const { data: docs } = await supabase
      .from('Documents')
      .select('*')
      .eq('bail_id', invitation.bail_id)
      .eq('categorie', 'Quittance')
      .order('created_at', { ascending: false })
    setQuittances(docs || [])

    // Charger les EDL
    const { data: edlData } = await supabase
      .from('EtatsDesLieux')
      .select('*')
      .eq('bail_id', invitation.bail_id)
      .eq('statut', 'finalise')
      .order('date_edl', { ascending: false })
    setEdls(edlData || [])
    setLoading(false)
  }

  // ===== CHARGER MESSAGES =====
  async function chargerMessages() {
    if (!data) return
    const { data: msgs } = await supabase
      .from('messages_locataires')
      .select('*')
      .eq('bail_id', data.bail_id)
      .order('created_at', { ascending: true })
    setMessages(msgs || [])
    // Marquer les messages proprio comme lus
    await supabase
      .from('messages_locataires')
      .update({ lu: true })
      .eq('bail_id', data.bail_id)
      .eq('expediteur', 'proprio')
      .eq('lu', false)
  }

  // ===== ENVOYER MESSAGE =====
  async function envoyerMessage() {
    if (!newMessage.trim() || !data) return
    setSendingMsg(true)
    await supabase.from('messages_locataires').insert({
      bail_id: data.bail_id,
      expediteur: 'locataire',
      contenu: newMessage.trim(),
    })
    setNewMessage('')
    await chargerMessages()
    setSendingMsg(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <p style={{ color: '#6b7280' }}>Chargement...</p>
    </div>
  )

  if (erreur) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, textAlign: 'center', maxWidth: 400, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ color: '#111827', marginBottom: 8 }}>Accès impossible</h2>
        <p style={{ color: '#6b7280', fontSize: 14 }}>{erreur}</p>
      </div>
    </div>
  )

  const bail = data.Baux
  const bien = bail?.Biens
  const nbNonLus = messages.filter(m => !m.lu && m.expediteur === 'proprio').length

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <nav style={{ background: '#2563eb', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>GestionLocative</span>
        <span style={{ fontSize: 13, color: '#bfdbfe' }}>Espace locataire</span>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 4px' }}>Bonjour</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
            {bail?.locataire_prenom} {bail?.locataire_nom}
          </h1>
          <p style={{ color: '#374151', fontSize: 14, margin: 0 }}>
            📍 {bien?.nom} — {bien?.adresse}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 4px' }}>Loyer CC</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#2563eb', margin: 0 }}>
                {(bail?.loyer_hc || 0) + (bail?.charges || 0)}€
              </p>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 4px' }}>Échéance</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                Le {bail?.date_exigibilite}
              </p>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 4px' }}>Début bail</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                {bail?.date_debut ? new Date(bail.date_debut).toLocaleDateString('fr-FR') : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { id: 'quittances', label: '🧾 Quittances' },
            { id: 'bail', label: '📄 Mon bail' },
            { id: 'edl', label: '🔑 États des lieux' },
            { id: 'messages', label: nbNonLus > 0 ? `💬 Messages 🔴 ${nbNonLus}` : '💬 Messages' },
          ].map(o => (
            <button key={o.id} onClick={() => setOnglet(o.id)}
              style={{ background: onglet === o.id ? '#2563eb' : 'white', color: onglet === o.id ? 'white' : '#6b7280', border: '1px solid #e5e7eb', padding: '8px 18px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {o.label}
            </button>
          ))}
        </div>

        {/* QUITTANCES */}
        {onglet === 'quittances' && (
          <div>
            {quittances.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 16, padding: 40, textAlign: 'center' }}>
                <p style={{ color: '#6b7280' }}>Aucune quittance disponible pour l'instant.</p>
              </div>
            ) : quittances.map((q, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div>
                  <p style={{ fontWeight: 600, color: '#111827', margin: '0 0 2px', fontSize: 14 }}>{q.nom_fichier}</p>
                  <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>{new Date(q.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <a href={q.url} target="_blank" rel="noopener noreferrer"
                  style={{ background: '#eff6ff', color: '#2563eb', padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  📥 Télécharger
                </a>
              </div>
            ))}
          </div>
        )}

        {/* BAIL */}
        {onglet === 'bail' && (
          <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {bail?.bail_pdf_url ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                <p style={{ color: '#374151', marginBottom: 20 }}>Votre bail est disponible en téléchargement.</p>
                <a href={bail.bail_pdf_url} target="_blank" rel="noopener noreferrer"
                  style={{ background: '#2563eb', color: 'white', padding: '12px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
                  📥 Télécharger mon bail
                </a>
              </div>
            ) : (
              <p style={{ color: '#6b7280', textAlign: 'center' }}>Bail non disponible en téléchargement.</p>
            )}
          </div>
        )}

        {/* ÉTATS DES LIEUX */}
        {onglet === 'edl' && (
          <div>
            {edls.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 16, padding: 40, textAlign: 'center' }}>
                <p style={{ color: '#6b7280' }}>Aucun état des lieux disponible.</p>
              </div>
            ) : edls.map((edl, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div>
                  <span style={{ background: edl.type === 'entree' ? '#dbeafe' : '#fce7f3', color: edl.type === 'entree' ? '#1d4ed8' : '#be185d', padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
                    {edl.type === 'entree' ? '🔑 Entrée' : '🚪 Sortie'}
                  </span>
                  <p style={{ fontWeight: 600, color: '#111827', margin: '6px 0 2px', fontSize: 14 }}>
                    {new Date(edl.date_edl).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                {edl.pdf_url && (
                  <a href={edl.pdf_url} target="_blank" rel="noopener noreferrer"
                    style={{ background: '#eff6ff', color: '#2563eb', padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    📥 Télécharger
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* MESSAGES */}
        {onglet === 'messages' && (
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginTop: 0, marginBottom: 20 }}>
              💬 Messages avec votre propriétaire
            </h3>

            {/* Zone messages */}
            <div style={{ height: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, padding: 12, background: '#f9fafb', borderRadius: 12 }}>
              {messages.length === 0 && (
                <p style={{ color: '#9ca3af', textAlign: 'center', margin: 'auto', fontSize: 14 }}>
                  Aucun message pour l'instant.<br />
                  <span style={{ fontSize: 12 }}>Écrivez un message à votre propriétaire.</span>
                </p>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.expediteur === 'locataire' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '70%', padding: '10px 14px', borderRadius: 12, fontSize: 14, lineHeight: 1.5,
                    background: msg.expediteur === 'locataire' ? '#2563eb' : 'white',
                    color: msg.expediteur === 'locataire' ? 'white' : '#111827',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    borderBottomRightRadius: msg.expediteur === 'locataire' ? 4 : 12,
                    borderBottomLeftRadius: msg.expediteur === 'proprio' ? 4 : 12,
                  }}>
                    <p style={{ margin: '0 0 4px' }}>{msg.contenu}</p>
                    <p style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>
                      {msg.expediteur === 'locataire' ? 'Vous' : 'Votre propriétaire'} — {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Zone saisie */}
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyerMessage(); } }}
                placeholder="Écrivez un message à votre propriétaire..."
                style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none' }}
              />
              <button onClick={envoyerMessage} disabled={sendingMsg || !newMessage.trim()}
                style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 16, cursor: !newMessage.trim() ? 'not-allowed' : 'pointer', opacity: !newMessage.trim() ? 0.5 : 1 }}>
                {sendingMsg ? '...' : '→'}
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
