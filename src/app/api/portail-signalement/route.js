import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { token, titre, description, photoBase64 } = await request.json()
    if (!token || !titre) return NextResponse.json({ error: 'Titre obligatoire.' }, { status: 400 })

    const { data: invitation, error: invErr } = await supabaseAdmin
      .from('invitations')
      .select('bail_id, Baux(user_id, bien_id, Biens(nom))')
      .eq('token', token)
      .single()

    if (invErr || !invitation) return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 404 })

    const userId = invitation.Baux?.user_id
    const bailId = invitation.bail_id
    const bienNom = invitation.Baux?.Biens?.nom || 'votre bien'

    let photoUrl = null
    if (photoBase64) {
      try {
        const matches = photoBase64.match(/^data:(image\/\w+);base64,(.+)$/)
        if (matches) {
          const ext = matches[1].split('/')[1] || 'jpg'
          const buffer = Buffer.from(matches[2], 'base64')
          const cheminStorage = `${userId}/signalements/${Date.now()}.${ext}`
          const { error: uploadError } = await supabaseAdmin.storage
            .from('documents')
            .upload(cheminStorage, buffer, { contentType: matches[1], upsert: true })
          if (!uploadError) {
            const { data: urlData } = supabaseAdmin.storage.from('documents').getPublicUrl(cheminStorage)
            photoUrl = urlData.publicUrl
          }
        }
      } catch (e) {
        console.error('Erreur upload photo signalement:', e.message)
      }
    }

    const { error: insertError } = await supabaseAdmin.from('signalements_locataires').insert({
      bail_id: bailId,
      user_id: userId,
      titre,
      description: description || null,
      photo_url: photoUrl,
      statut: 'nouveau',
    })

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        type: 'signalement_locataire',
        message: `🔧 Nouveau signalement — ${bienNom} : "${titre}"`,
        lien: `/baux/${bailId}`,
      }),
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}