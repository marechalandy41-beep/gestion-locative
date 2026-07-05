import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { locataireEmail, locataireNom, locatairePrenom, proprietaireEmail, proprietaireNom, bienNom, loyer, bailPdfUrl } = await request.json();

    // Télécharger le PDF depuis Supabase et le convertir en base64
    const pdfResponse = await fetch(bailPdfUrl);
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
    const nomFichier = `Bail_${bienNom.replace(/\s+/g, '_')}.pdf`;

    // Email au locataire
    const { error: errorLoc } = await resend.emails.send({
      from: 'Ma Gestion-Locative <noreply@magestion-locative.fr>',
      to: [locataireEmail],
      subject: `Votre bail de location — ${bienNom}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2563eb; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Ma Gestion-Locative</h1>
          </div>
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #111827;">Bonjour <strong>${locatairePrenom} ${locataireNom}</strong>,</p>
            <p style="color: #374151;">Votre propriétaire <strong>${proprietaireNom}</strong> vous adresse votre contrat de bail pour le logement suivant :</p>
            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">Bien loué</p>
              <p style="margin: 0; font-weight: 600; color: #111827;">${bienNom}</p>
              <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">Loyer charges comprises</p>
              <p style="margin: 0; font-weight: 700; font-size: 24px; color: #2563eb;">${loyer}€/mois</p>
            </div>
            <p style="color: #374151;">Votre bail est disponible en pièce jointe. Conservez-le précieusement.</p>
            <p style="color: #6b7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
              Ce message est envoyé automatiquement par Ma Gestion-Locative. Merci de ne pas répondre directement à cet email.
            </p>
          </div>
        </div>
      `,
      attachments: [{ filename: nomFichier, content: pdfBase64 }],
    });

    if (errorLoc) return NextResponse.json({ error: errorLoc.message }, { status: 400 });

    // Email au propriétaire
    const { error: errorProp } = await resend.emails.send({
      from: 'Ma Gestion-Locative <noreply@magestion-locative.fr>',
      to: [proprietaireEmail],
      subject: `✅ Bail envoyé à ${locatairePrenom} ${locataireNom} — ${bienNom}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2563eb; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Ma Gestion-Locative</h1>
          </div>
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #111827;">Bonjour <strong>${proprietaireNom}</strong>,</p>
            <p style="color: #374151;">Le bail de <strong>${bienNom}</strong> a bien été envoyé à votre locataire.</p>
            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">Locataire</p>
              <p style="margin: 0; font-weight: 600; color: #111827;">${locatairePrenom} ${locataireNom} — ${locataireEmail}</p>
              <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">Bien loué</p>
              <p style="margin: 0; font-weight: 600; color: #111827;">${bienNom}</p>
              <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">Loyer CC</p>
              <p style="margin: 0; font-weight: 700; font-size: 24px; color: #2563eb;">${loyer}€/mois</p>
            </div>
            <p style="color: #374151;">Le bail est également en pièce jointe pour vos archives.</p>
            <p style="color: #6b7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
              Ce message est envoyé automatiquement par Ma Gestion-Locative. Merci de ne pas répondre directement à cet email.
            </p>
          </div>
        </div>
      `,
      attachments: [{ filename: nomFichier, content: pdfBase64 }],
    });

    if (errorProp) return NextResponse.json({ error: errorProp.message }, { status: 400 });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Send bail error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}