import { supabase } from '../../../supabase'
import ArticleContent from './ArticleContent'

const BASE = 'https://www.magestion-locative.fr'

async function getArticle(slug) {
  const { data } = await supabase.from('articles').select('*').eq('slug', slug).eq('publie', true).single()
  return data
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) {
    return { title: 'Article introuvable — Ma Gestion-Locative' }
  }

  return {
    title: `${article.titre} — Ma Gestion-Locative`,
    description: article.meta_description || article.titre,
    alternates: { canonical: `${BASE}/blog/${slug}` },
    openGraph: {
      title: article.titre,
      description: article.meta_description || article.titre,
      url: `${BASE}/blog/${slug}`,
      siteName: 'Ma Gestion-Locative',
      locale: 'fr_FR',
      type: 'article',
      publishedTime: article.created_at,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.titre,
      description: article.meta_description || article.titre,
    },
  }
}

export default async function Page({ params }) {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) {
    return <p style={{ textAlign: 'center', padding: 40 }}>Article introuvable.</p>
  }

  return <ArticleContent article={article} />
}