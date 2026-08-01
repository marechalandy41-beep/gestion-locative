import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { token, locataireEmail, locataireNom, proprietaireNom, bienNom, typeEdl } = await request.json();
    if (!token || !locataireEmail) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });

    const lien = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/signature-edl/${token}`;
    const libelle = typeEdl === 'entree' ? "d'entrée" : 'de sortie';

    const { data, error } = await resend.emails.send({
      from: 'Ma Gestion-Locative <noreply@magestion-locative.fr>',
      to: [locataireEmail],
      subject: `État des lieux ${libelle} à signer — ${bienNom}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2563eb; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Ma Gestion-Locative</h1>
          </div>
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #111827;">Bonjour <strong>${locataireNom}</strong>,</p>
            <p style="color: #374151;"><strong>${proprietaireNom}</strong> vous invite à signer l'état des lieux ${libelle} du logement situé ${bienNom}. Le propriétaire a déjà signé sa partie.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${lien}" style="background: #2563eb; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; display: inline-block;">Consulter et signer l'état des lieux</a>
            </div>
            <p style="color: #6b7280; font-size: 13px;">Ce lien est personnel, ne le partagez pas. Une fois signé, vous recevrez une copie par email.</p>
            <p style="color: #6b7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
              Ce message est envoyé automatiquement par Ma Gestion-Locative. Merci de ne pas répondre directement à cet email.
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (error) {
    console.error('Send signature EDL error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}