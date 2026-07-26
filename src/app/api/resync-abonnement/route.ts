import { NextRequest, NextResponse } from 'next/server'
import { resyncAbonnementUtilisateur } from '@/lib/resyncAbonnement'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    const result = await resyncAbonnementUtilisateur(userId)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}