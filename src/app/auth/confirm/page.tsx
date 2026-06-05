'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/supabase'

export default function AuthConfirm() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_IN') {
        setStatus('success')
        setTimeout(() => router.push('/login'), 3000)
      } else {
        setStatus('error')
      }
    })
    return () => authListener.subscription.unsubscribe()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-md text-center max-w-md w-full">
        {status === 'loading' && (
          <>
            <p className="text-gray-500 text-lg">Vérification en cours...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Email confirmé !</h1>
            <p className="text-gray-500">Votre compte est activé. Vous allez être redirigé vers la page de connexion...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Lien invalide</h1>
            <p className="text-gray-500 mb-4">Ce lien a peut-être expiré.</p>
            <button
              onClick={() => router.push('/login')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Retour à la connexion
            </button>
          </>
        )}
      </div>
    </div>
  )
}