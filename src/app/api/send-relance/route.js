import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { locataireEmail, locatairePrenom, locataireNom, proprietaireNom, bienNom, montant, dateEcheance, mois, annee } = await request.json();

    const { data, error } = await resend.emails.send({
      from: 'Ma Gestion-Locative <onboarding@resend.dev>',
      to: [locataireEmail],
      subject: `Rappel loyer — ${mois} ${annee} — ${bienNom}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f59e0b; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Ma Gestion-Locative</h1>
          </div>
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #111827;">Bonjour <strong>${locatairePrenom} ${locataireNom}</strong>,</p>
            <p style="color: #374151;">Votre propriétaire <strong>${proprietaireNom}</strong> vous rappelle que votre loyer du mois de <strong>${mois} ${annee}</strong> n'a pas encore été reçu.</p>
            <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0 0 8px; color: #854d0e; font-size: 14px;">Bien loué</p>
              <p style="margin: 0; font-weight: 600; color: #111827;">${bienNom}</p>
              <p style="margin: 8px 0 0; color: #854d0e; font-size: 14px;">Montant dû</p>
              <p style="margin: 0; font-weight: 700; font-size: 24px; color: #92400e;">${montant}€</p>
              <p style="margin: 8px 0 0; color: #854d0e; font-size: 14px;">Date d'échéance</p>
              <p style="margin: 0; font-weight: 600; color: #111827;">Le ${dateEcheance} de chaque mois</p>
            </div>
            <p style="color: #374151;">Merci de procéder au règlement dans les meilleurs délais.</p>
            <p style="color: #6b7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
              Ce message est envoyé automatiquement par Ma Gestion-Locative. Merci de ne pas répondre directement à cet email.
            </p>
          </div>
        </div>
      `,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, id: data?.id });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}