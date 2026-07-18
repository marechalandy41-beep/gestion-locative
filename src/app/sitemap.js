import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const BASE = 'https://www.magestion-locative.fr'

export default async function sitemap() {
  // Pages statiques
  const pagesStatiques = [
    { url: BASE, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/blog`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/attestation-gratuite`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/faq`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/cgu`, changeFrequency: 'monthly', priority: 0.3 },
  ].map(p => ({ ...p, lastModified: new Date() }))

  // Articles de blog publiés (dynamique)
  let articles = []
  try {
    const { data } = await supabase
      .from('articles')
      .select('slug, created_at')
      .eq('publie', true)
    articles = (data || []).map(a => ({
      url: `${BASE}/blog/${a.slug}`,
      lastModified: a.created_at ? new Date(a.created_at) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    }))
  } catch (e) {
    // en cas d'erreur, on renvoie au moins les pages statiques
  }

  return [...pagesStatiques, ...articles]
}