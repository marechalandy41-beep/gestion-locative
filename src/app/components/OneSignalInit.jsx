'use client'
import { useEffect } from 'react'

const PAGES_PUBLIQUES = ['/', '/blog', '/faq', '/contact', '/cgu', '/attestation-gratuite', '/auth']

function estPagePublique(pathname) {
  if (PAGES_PUBLIQUES.includes(pathname)) return true
  if (pathname.startsWith('/blog/')) return true
  return false
}

export default function OneSignalInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (estPagePublique(window.location.pathname)) return

    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(async function(OneSignal) {
      try {
        await OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
          safari_web_id: '',
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: true,
        })
      } catch(e) {
        console.log('OneSignal init skipped:', e.message)
      }
    })

    const script = document.createElement('script')
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
    script.defer = true
    document.head.appendChild(script)
  }, [])

  return null
}