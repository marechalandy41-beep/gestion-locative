import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { nom, email, message, sujet, userId } = await request.json()

    if (!nom || !email || !message) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    // Sauvegarder en base
    await supabase.from('contacts').insert({
      nom,
      email,
      sujet: sujet || null,
      message,
      user_id: userId || null,
      statut: 'non_lu',
    })

    // Email à toi
    await resend.emails.send({
      from: 'Ma Gestion-Locative <onboarding@resend.dev>',
      to: ['ton@email.fr'],
      subject: `[Contact] ${sujet || 'Nouveau message'} — ${nom}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2563eb; padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 18px;">📬 Nouveau message de contact</h1>
          </div>
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p><strong>Nom :</strong> ${nom}</p>
            <p><strong>Email :</strong> ${email}</p>
            <p><strong>Sujet :</strong> ${sujet || '—'}</p>
            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-top: 16px;">
              <p style="margin: 0; white-space: pre-wrap;">${message}</p>
            </div>
          </div>
        </div>
      `,
    })

    // Email de confirmation à l'expéditeur
    await resend.emails.send({
      from: 'Ma Gestion-Locative <onboarding@resend.dev>',
      to: [email],
      subject: 'Nous avons bien reçu votre message — Ma Gestion-Locative',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2563eb; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Ma Gestion-Locative</h1>
          </div>
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #111827;">Bonjour <strong>${nom}</strong>,</p>
            <p style="color: #374151;">Nous avons bien reçu votre message et vous répondrons dans les meilleurs délais.</p>
            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 24px 0; border-left: 4px solid #2563eb;">
              <p style="margin: 0; color: #6b7280; font-size: 13px; white-space: pre-wrap;">${message}</p>
            </div>
            <p style="color: #374151;">À bientôt,<br><strong>L'équipe Ma Gestion-Locative</strong></p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}