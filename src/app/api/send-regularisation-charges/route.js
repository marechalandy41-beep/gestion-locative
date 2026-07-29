import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { locataireEmail, locataireNom, bienNom, periode, solde, sens, pdfBase64, proprietaireNom, nomFichier } = await request.json();

    const messageSolde = sens === 'du'
      ? `Il en résulte un solde de <strong>${solde} €</strong> restant à votre charge.`
      : sens === 'trop_percu'
        ? `Il en résulte un trop-perçu de <strong>${solde} €</strong> en votre faveur.`
        : `Les charges provisionnées correspondent aux charges réelles constatées, aucun solde n'est dû.`

    const { data, error } = await resend.emails.send({
      from: 'Ma Gestion-Locative <noreply@magestion-locative.fr>',
      to: [locataireEmail],
      subject: `Régularisation des charges — ${periode}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2563eb; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Ma Gestion-Locative</h1>
          </div>
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #111827;">Bonjour <strong>${locataireNom}</strong>,</p>
            <p style="color: #374151;">Votre propriétaire <strong>${proprietaireNom}</strong> vous adresse la régularisation des charges locatives pour la période de <strong>${periode}</strong> concernant le logement situé ${bienNom}.</p>
            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0; color: #374151;">${messageSolde}</p>
            </div>
            <p style="color: #374151;">Le détail du calcul est disponible en pièce jointe de cet email.</p>
            <p style="color: #6b7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
              Ce message est envoyé automatiquement par Ma Gestion-Locative. Merci de ne pas répondre directement à cet email.
            </p>
          </div>
        </div>
      `,
      attachments: pdfBase64 ? [{ filename: nomFichier || `Regularisation_${periode}.pdf`, content: pdfBase64 }] : [],
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: data?.id });

  } catch (error) {
    console.error('Send régularisation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}