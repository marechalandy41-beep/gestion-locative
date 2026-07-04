'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')

  async function handleReset() {
    if (password !== confirm) {
      setErreur('Les mots de passe ne correspondent pas')
      return
    }
    if (password.length < 6) {
      setErreur('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    setLoading(true)
    setErreur('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setErreur('Erreur : ' + error.message)
    } else {
      setMessage('Mot de passe modifié ! Vous allez être redirigé...')
      setTimeout(() => window.location.href = '/auth', 2000)
    }
    setLoading(false)
  }

  return (
    <main style={{minHeight:'100vh', background:'#f9fafb', display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{background:'white', borderRadius:20, padding:32, width:'100%', maxWidth:440, boxShadow:'0 1px 3px rgba(0,0,0,0.05)', border:'1px solid #f3f4f6'}}>
        <h1 style={{fontSize:22, fontWeight:700, color:'#2563eb', textAlign:'center', marginBottom:8}}>Ma Gestion-Locative</h1>
        <h2 style={{fontSize:16, fontWeight:600, color:'#374151', textAlign:'center', marginBottom:24}}>Nouveau mot de passe</h2>

        {message && (
          <div style={{background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:12, marginBottom:16}}>
            <p style={{color:'#15803d', fontSize:13}}>{message}</p>
          </div>
        )}

        {erreur && (
          <div style={{background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:12, marginBottom:16}}>
            <p style={{color:'#dc2626', fontSize:13}}>{erreur}</p>
          </div>
        )}

        <div style={{display:'flex', flexDirection:'column', gap:16}}>
          <div>
            <label style={{fontSize:13, fontWeight:500, color:'#374151', display:'block', marginBottom:6}}>Nouveau mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="6 caractères minimum"
              style={{width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'10px 12px', fontSize:14, outline:'none', boxSizing:'border-box'}}
            />
          </div>
          <div>
            <label style={{fontSize:13, fontWeight:500, color:'#374151', display:'block', marginBottom:6}}>Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Répétez le mot de passe"
              style={{width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'10px 12px', fontSize:14, outline:'none', boxSizing:'border-box'}}
            />
          </div>
          <button
            onClick={handleReset}
            disabled={loading}
            style={{background:'#2563eb', color:'white', padding:'12px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:600, fontSize:14, marginTop:8}}
          >
            {loading ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </div>
      </div>
    </main>
  )
}