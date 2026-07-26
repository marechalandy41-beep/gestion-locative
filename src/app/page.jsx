import { createClient } from '@supabase/supabase-js'
import HomeClient from './HomeClient'

async function getSettings() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data, error } = await supabase.from('settings').select('*')
    if (error) throw error
    const settings = {}
    data.forEach(s => { settings[s.cle] = s.valeur })
    return settings
  } catch {
    return {}
  }
}

export default async function Home() {
  const settings = await getSettings()
  const comingSoon = settings.coming_soon !== 'false'
  return <HomeClient initialSettings={settings} initialComingSoon={comingSoon} />
}
