import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const { bailId, userId, locataireEmail, locatairePrenom, locataireNom, proprietaireNom, bienNom } = await request.json()

    // Générer un token unique
    const token = crypto.randomUUID()

    // Supprimer l'ancienne invitation si elle existe
    await supabase.from('invitations').delete().eq('bail_id', bailId)

    // Créer la nouvelle invitation
    const { error } = await supabase.from('invitations').insert({
      bail_id: bailId,
      user_id: userId,
      token,
      locataire_email: locataireEmail,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const lien = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/portail/${token}`

    // Envoyer l'email
    await resend.emails.send({
      from: 'GestionLocative <onboarding@resend.dev>',
      to: [locataireEmail],
      subject: `Votre espace locataire — ${bienNom}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2563eb; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">GestionLocative</h1>
          </div>
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #111827;">Bonjour <strong>${locatairePrenom} ${locataireNom}</strong>,</p>
            <p style="color: #374151;">Votre propriétaire <strong>${proprietaireNom}</strong> vous invite à accéder à votre espace locataire pour le logement <strong>${bienNom}</strong>.</p>
            <p style="color: #374151;">Vous pouvez y consulter :</p>
            <ul style="color: #374151;">
              <li>Vos quittances de loyer</li>
              <li>Votre bail</li>
              <li>Vos états des lieux</li>
            </ul>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${lien}" style="background: #2563eb; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px;">
                Accéder à mon espace →
              </a>
            </div>
            <p style="color: #6b7280; font-size: 12px;">Ce lien est personnel et sécurisé. Ne le partagez pas.</p>
            <p style="color: #6b7280; font-size: 11px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
              Ce message est envoyé automatiquement par GestionLocative.
            </p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true, lien })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}