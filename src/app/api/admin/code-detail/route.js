import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { code } = await request.json();
    if (!code) return NextResponse.json({ error: 'Code requis' }, { status: 400 });

    // Clients ayant utilisé ce code
    const { data: clients } = await supabase
      .from('customers')
      .select('user_id, plan')
      .eq('code_promo', code);

    // Emails
    const { data: authData } = await supabase.auth.admin.listUsers();
    const emailMap = {};
    (authData?.users || []).forEach(u => { emailMap[u.id] = u.email || ''; });

    const liste = (clients || []).map(c => ({
      email: emailMap[c.user_id] || 'Inconnu',
      plan: c.plan || 'gratuit',
      payant: c.plan === 'manuel' || c.plan === 'automatique',
    }));

    const total = liste.length;
    const payants = liste.filter(c => c.payant).length;
    const conversion = total > 0 ? Math.round((payants / total) * 100) : 0;

    return NextResponse.json({ liste, total, payants, conversion });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}