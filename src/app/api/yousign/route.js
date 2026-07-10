import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const YOUSIGN_API_URL = process.env.YOUSIGN_API_URL
const YOUSIGN_API_KEY = process.env.YOUSIGN_API_KEY

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${YOUSIGN_API_KEY}`,
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, bailId, userId, pdfBase64, nomFichier, bailleurEmail, bailleurNom, locataireEmail, locataireNom } = body

    if (action === 'create_signature_request') {

      // 1. Créer la signature request
      const signatureRes = await fetch(`${YOUSIGN_API_URL}/signature_requests`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: nomFichier || 'Bail de location',
          delivery_mode: 'email',
        }),
      })
      const signatureData = await signatureRes.json()
      console.log('Signature request:', JSON.stringify(signatureData))
      if (!signatureData.id) {
        return NextResponse.json({ error: 'Erreur création signature request', details: signatureData }, { status: 400 })
      }
      const signatureRequestId = signatureData.id

      // 2. Uploader le document dans la signature request
      const uploadRes = await fetch(`${YOUSIGN_API_URL}/signature_requests/${signatureRequestId}/documents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          nature: 'signable_document',
          content: pdfBase64,
          filename: nomFichier || 'bail.pdf',
        }),
      })
      const uploadData = await uploadRes.json()
      console.log('Upload document:', JSON.stringify(uploadData))
      if (!uploadData.id) {
        return NextResponse.json({ error: 'Erreur upload document', details: uploadData }, { status: 400 })
      }

      // 3. Ajouter les signataires
      const signataires = [
        { email: bailleurEmail, nom: bailleurNom, ordre: 1 },
        { email: locataireEmail, nom: locataireNom, ordre: 2 },
      ]

      for (const s of signataires) {
        const [first_name, ...rest] = s.nom.split(' ')
        const last_name = rest.join(' ') || first_name
        const signerRes = await fetch(`${YOUSIGN_API_URL}/signature_requests/${signatureRequestId}/signers`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            info: {
              first_name,
              last_name,
              email: s.email,
              locale: 'fr',
            },
            signature_level: 'electronic_signature',
            signature_authentication_mode: 'no_otp',
            fields: [{
              document_id: uploadData.id,
              type: 'signature',
              page: 1,
              x: s.ordre === 1 ? 50 : 300,
              y: 700,
              width: 180,
              height: 60,
            }],
          }),
        })
        const signerData = await signerRes.json()
        console.log('Signer:', JSON.stringify(signerData))
      }

      // 4. Activer la demande
      const activateRes = await fetch(`${YOUSIGN_API_URL}/signature_requests/${signatureRequestId}/activate`, {
        method: 'POST',
        headers,
      })
      const activateData = await activateRes.json()
      console.log('Activate:', JSON.stringify(activateData))

      // 5. Sauvegarder dans Supabase
      await supabase.from('Baux').update({
        yousign_signature_request_id: signatureRequestId,
        statut: 'en_attente_signature',
      }).eq('id', bailId)

      return NextResponse.json({ success: true, signatureRequestId })
    }

    if (action === 'check_status') {
      const { data: bail } = await supabase.from('Baux').select('yousign_signature_request_id').eq('id', bailId).single()
      const reqId = bail?.yousign_signature_request_id
      if (!reqId) return NextResponse.json({ error: 'Pas de demande Yousign' }, { status: 400 })

      const res = await fetch(`${YOUSIGN_API_URL}/signature_requests/${reqId}`, { headers })
      const data = await res.json()

      if (data.status === 'done') {
        await supabase.from('Baux').update({ statut: 'actif' }).eq('id', bailId)
      }

      return NextResponse.json({ success: true, status: data.status, data })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}