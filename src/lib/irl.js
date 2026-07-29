// Récupère l'Indice de Référence des Loyers (IRL) publié par l'INSEE.
// Service gratuit, sans authentification : https://www.insee.fr/fr/information/2862759
// Série officielle "IRL - France entière" : idbank 001515333

const IDBANK_IRL = '001515333'

/**
 * Interroge l'API SDMX de l'INSEE et retourne la série IRL sous forme simple :
 * [{ periode: '2026-Q1', valeur: 146.60 }, ...] triée du plus récent au plus ancien.
 */
export async function recupererSerieIRL(nbTrimestres = 16) {
  const url = `https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/${IDBANK_IRL}?lastNObservations=${nbTrimestres}`
  const res = await fetch(url, { headers: { Accept: 'application/xml' }, next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`INSEE a répondu avec le statut ${res.status}`)
  const xml = await res.text()

  // Le format SDMX-ML encode chaque observation avec sa période et sa valeur.
  // On extrait les paires (TIME_PERIOD, OBS_VALUE) de façon tolérante, sans dépendance XML.
  const observations = []
  const regexObs = /<(?:\w+:)?Obs[^>]*>([\s\S]*?)<\/(?:\w+:)?Obs>/g
  let match
  while ((match = regexObs.exec(xml)) !== null) {
    const bloc = match[1]
    const periodeMatch = bloc.match(/(?:TIME_PERIOD|ObsDimension)[^>]*value="([^"]+)"/)
    const valeurMatch = bloc.match(/(?:OBS_VALUE|ObsValue)[^>]*value="([^"]+)"/)
    if (periodeMatch && valeurMatch) {
      observations.push({ periode: periodeMatch[1], valeur: parseFloat(valeurMatch[1]) })
    }
  }

  // Certaines réponses encodent aussi TIME_PERIOD/OBS_VALUE en attributs sur une seule balise <Obs .../>
  if (observations.length === 0) {
    const regexAttr = /<(?:\w+:)?Obs\b([^>]*)\/?>/g
    let m2
    while ((m2 = regexAttr.exec(xml)) !== null) {
      const attrs = m2[1]
      const periodeMatch = attrs.match(/TIME_PERIOD="([^"]+)"/)
      const valeurMatch = attrs.match(/OBS_VALUE="([^"]+)"/)
      if (periodeMatch && valeurMatch) {
        observations.push({ periode: periodeMatch[1], valeur: parseFloat(valeurMatch[1]) })
      }
    }
  }

  if (observations.length === 0) throw new Error('Impossible de lire les données IRL renvoyées par l\'INSEE.')

  return observations
}

/** Convertit une date JS en trimestre INSEE "YYYY-Qn" */
export function dateVersTrimestre(date) {
  const d = new Date(date)
  const trimestre = Math.floor(d.getMonth() / 3) + 1
  return `${d.getFullYear()}-Q${trimestre}`
}

/** Calcule le trimestre correspondant, un an plus tôt */
export function trimestrePrecedent(trimestreLabel) {
  const [annee, q] = trimestreLabel.split('-Q')
  return `${parseInt(annee) - 1}-Q${q}`
}