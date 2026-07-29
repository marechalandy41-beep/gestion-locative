import { NextResponse } from 'next/server'
import { recupererSerieIRL } from '@/lib/irl'

export async function GET() {
  try {
    const serie = await recupererSerieIRL(16)
    // Tri du plus récent au plus ancien pour l'affichage
    serie.sort((a, b) => (a.periode < b.periode ? 1 : -1))
    return NextResponse.json({ serie })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}