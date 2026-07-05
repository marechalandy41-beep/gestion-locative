import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export async function POST(request) {
  try {
    const { userId, title, body, url } = await request.json()

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)

    if (!subs || subs.length === 0) {
      return NextResponse.json({ success: true, message: 'Aucun abonnement push' })
    }

    const payload = JSON.stringify({ title, body, url: url || '/' })

    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription, payload)
      } catch (err) {
        // Abonnement expiré — on le supprime
        if (err.statusCode === 410) {
          await supabase.from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('subscription', sub.subscription)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}