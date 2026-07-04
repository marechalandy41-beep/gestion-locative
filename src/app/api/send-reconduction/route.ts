import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { proprietaireEmail, proprietaireNom, locataireNom, bienNom, dateFin, type } = await req.json()
    // type = 'j60' | 'j30' | 'reconduit'

    const sujets = {
      j60: `⚠️ Votre bail "${bienNom}" arrive à échéance dans 2 mois`,
      j30: `🔔 Rappel : votre bail "${bienNom}" arrive à échéance dans 1 mois`,
      reconduit: `✅ Votre bail "${bienNom}" a été reconduit tacitement`,
    }

    const corps = {
      j60: `
        <p>Bonjour ${proprietaireNom},</p>
        <p>Votre bail pour le bien <strong>${bienNom}</strong> (locataire : ${locataireNom}) arrive à échéance le <strong>${dateFin}</strong>, soit dans environ 2 mois.</p>
        <p>Vous avez jusqu'au <strong>${dateFin}</strong> pour :</p>
        <ul>
          <li>Donner congé au locataire (préavis légal : 6 mois pour un bail non meublé, 3 mois pour un bail meublé)</li>
          <li>Ou laisser le bail se reconduire tacitement</li>
        </ul>
        <p>Connectez-vous à votre espace Ma Gestion-Locative pour gérer ce bail.</p>
      `,
      j30: `
        <p>Bonjour ${proprietaireNom},</p>
        <p>Rappel : votre bail pour le bien <strong>${bienNom}</strong> (locataire : ${locataireNom}) arrive à échéance le <strong>${dateFin}</strong>, soit dans environ 1 mois.</p>
        <p>Si vous n'avez pas encore donné congé, le bail sera reconduit tacitement automatiquement.</p>
        <p>Connectez-vous à votre espace Ma Gestion-Locative pour gérer ce bail.</p>
      `,
      reconduit: `
        <p>Bonjour ${proprietaireNom},</p>
        <p>Votre bail pour le bien <strong>${bienNom}</strong> (locataire : ${locataireNom}) a été <strong>reconduit tacitement</strong> à compter du <strong>${dateFin}</strong>.</p>
        <p>Il repart pour une nouvelle période. Aucune action n'est requise de votre part.</p>
        <p>Connectez-vous à votre espace Ma Gestion-Locative pour mettre à jour la date de fin si nécessaire.</p>
      `,
    }

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: proprietaireEmail,
      subject: sujets[type as keyof typeof sujets],
      html: corps[type as keyof typeof corps],
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}