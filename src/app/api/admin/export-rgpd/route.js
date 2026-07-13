import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const JSZip = require('jszip');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { userId, userEmail } = await request.json();

    const [biens, baux, paiements, documents, edl] = await Promise.all([
      supabase.from('Biens').select('*').eq('user_id', userId),
      supabase.from('Baux').select('*').eq('user_id', userId),
      supabase.from('paiements').select('*').eq('user_id', userId),
      supabase.from('Documents').select('*').eq('user_id', userId),
      supabase.from('EtatsDesLieux').select('*'),
    ])

    const zip = new JSZip()
    zip.file('biens.json', JSON.stringify(biens.data || [], null, 2))
    zip.file('baux.json', JSON.stringify(baux.data || [], null, 2))
    zip.file('paiements.json', JSON.stringify(paiements.data || [], null, 2))
    zip.file('documents.json', JSON.stringify(documents.data || [], null, 2))
    zip.file('etats_des_lieux.json', JSON.stringify(edl.data || [], null, 2))
    zip.file('info.txt', `Export RGPD — ${userEmail}\nDate : ${new Date().toLocaleDateString('fr-FR')}\nToutes vos données Ma Gestion-Locative.`)

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="RGPD_${userEmail}_${new Date().toISOString().split('T')[0]}.zip"`,
      },
    })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}