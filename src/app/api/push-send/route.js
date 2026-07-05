import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { userId, title, body, url } = await request.json()

    // Récupérer l'email de l'utilisateur pour cibler via OneSignal
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    if (!user?.email) return NextResponse.json({ success: true, message: 'User not found' })

    // Envoyer via OneSignal REST API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: process.env.ONESIGNAL_APP_ID,
        filters: [{ field: 'email', value: user.email }],
        headings: { fr: title, en: title },
        contents: { fr: body, en: body },
        url: `https://magestion-locative.fr${url || '/'}`,
        web_push_topic: 'ma-gestion-locative',
      }),
    })

    const data = await response.json()
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}