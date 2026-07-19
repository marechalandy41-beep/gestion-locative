const BASE = 'https://www.magestion-locative.fr'

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/api/',
        '/auth/',
        '/compte',
        '/dashboard',
        '/baux',
        '/biens',
        '/coffre-fort',
        '/documents',
        '/connexion-bancaire',
        '/etats-des-lieux',
        '/portail',
        '/abonnement',
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
  }
}