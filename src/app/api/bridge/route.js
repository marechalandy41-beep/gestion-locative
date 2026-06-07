import { NextResponse } from 'next/server';

const BRIDGE_API_URL = 'https://api.bridgeapi.io';
const CLIENT_ID = process.env.BRIDGE_CLIENT_ID;
const CLIENT_SECRET = process.env.BRIDGE_CLIENT_SECRET;
const BRIDGE_VERSION = '2025-01-15';

const headers_base = {
  'Content-Type': 'application/json',
  'Client-Id': CLIENT_ID,
  'Client-Secret': CLIENT_SECRET,
  'Bridge-Version': BRIDGE_VERSION,
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, userId, accessToken, accountId } = body;

    // ETAPE 3 : Créer une session Connect (widget Bridge)
    if (action === 'create_connect_session') {
      // D'abord authentifier l'utilisateur
      const authRes = await fetch(`${BRIDGE_API_URL}/v3/aggregation/authorization/token`, {
        method: 'POST',
        headers: headers_base,
        body: JSON.stringify({ external_user_id: `gl_${userId}` }),
      });
      const authData = await authRes.json();
      console.log('Auth response:', JSON.stringify(authData));

      if (!authData.access_token) {
        // L'utilisateur n'existe pas encore, on le crée
        const createRes = await fetch(`${BRIDGE_API_URL}/v3/aggregation/users`, {
          method: 'POST',
          headers: headers_base,
          body: JSON.stringify({ external_user_id: `gl_${userId}` }),
        });
        const createData = await createRes.json();
        console.log('Created user:', JSON.stringify(createData));

        // Ré-authentifier après création
        const authRes2 = await fetch(`${BRIDGE_API_URL}/v3/aggregation/authorization/token`, {
          method: 'POST',
          headers: headers_base,
          body: JSON.stringify({ external_user_id: `gl_${userId}` }),
        });
        const authData2 = await authRes2.json();
        console.log('Auth after create:', JSON.stringify(authData2));

        if (!authData2.access_token) {
          return NextResponse.json({
            error: 'Impossible d\'authentifier l\'utilisateur Bridge',
            details: authData2
          }, { status: 400 });
        }

        return await createConnectSession(authData2.access_token, body.userEmail);
      }

      return await createConnectSession(authData.access_token, body.userEmail);
    }

    // ETAPE 4 : Récupérer les comptes
    if (action === 'get_accounts') {
      const res = await fetch(`${BRIDGE_API_URL}/v3/aggregation/accounts`, {
        headers: { ...headers_base, 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await res.json();
      console.log('Accounts:', JSON.stringify(data));
      return NextResponse.json(data);
    }

    // ETAPE 5 : Récupérer les transactions
    if (action === 'get_transactions') {
      const res = await fetch(
        `${BRIDGE_API_URL}/v3/aggregation/accounts/${accountId}/transactions?limit=50`,
        {
          headers: { ...headers_base, 'Authorization': `Bearer ${accessToken}` },
        }
      );
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });

  } catch (error) {
    console.error('Bridge API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function createConnectSession(accessToken, userEmail) {
  const res = await fetch(`${BRIDGE_API_URL}/v3/aggregation/connect-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Id': process.env.BRIDGE_CLIENT_ID,
      'Client-Secret': process.env.BRIDGE_CLIENT_SECRET,
      'Bridge-Version': '2025-01-15',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
  user_email: userEmail,
  callback_url: 'http://localhost:3000/connexion-bancaire?bridge_callback=true',
  country_code: 'FR',
  account_types: 'all',
}),
  });

  const data = await res.json();
  console.log('Connect session:', JSON.stringify(data));

  if (!data.url) {
    return NextResponse.json({
      error: 'Pas d\'URL Connect',
      details: data
    }, { status: 400 });
  }

  return NextResponse.json({
    connect_url: data.url,
    access_token: accessToken,
  });
}