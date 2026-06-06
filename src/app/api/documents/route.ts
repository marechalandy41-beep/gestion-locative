import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Lister les dossiers (catégories)
    const { data: folders } = await supabase.storage
      .from('documents')
      .list(userId)

    if (!folders) return NextResponse.json({ files: [] })

    // Pour chaque dossier, lister les fichiers
    const allFiles: any[] = []
    for (const folder of folders) {
      const { data: files } = await supabase.storage
        .from('documents')
        .list(`${userId}/${folder.name}`)

      if (files) {
        for (const file of files) {
          const filePath = `${userId}/${folder.name}/${file.name}`
          const { data: urlData } = await supabase.storage
            .from('documents')
            .createSignedUrl(filePath, 3600)

          allFiles.push({
            ...file,
            categorie: folder.name,
            url: urlData?.signedUrl,
            path: filePath,
          })
        }
      }
    }

    return NextResponse.json({ files: allFiles })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}