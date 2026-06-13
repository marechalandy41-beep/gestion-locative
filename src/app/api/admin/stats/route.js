import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    const { data: customers } = await supabase.from('customers').select('*');
    const { data: baux } = await supabase.from('Baux').select('user_id, statut').eq('statut', 'actif');
    const { data: authUsers } = await supabase.auth.admin.listUsers();

    const users = (authUsers?.users || []).map(u => {
      const customer = customers?.find(c => c.user_id === u.id);
      const nbBaux = baux?.filter(b => b.user_id === u.id).length || 0;
      return {
        id: u.id,
        email: u.email,
        plan: customer?.plan || 'gratuit',
        nbBaux,
        created_at: u.created_at,
      }
    });

    const usersGratuits = users.filter(u => !u.plan || u.plan === 'gratuit').length;
    const usersManuel = users.filter(u => u.plan === 'manuel').length;
    const usersAuto = users.filter(u => u.plan === 'auto').length;
    const usersPayants = usersManuel + usersAuto;

    const revenuManuel = users.filter(u => u.plan === 'manuel').reduce((acc, u) => acc + u.nbBaux * 4, 0);
    const revenuAuto = users.filter(u => u.plan === 'auto').reduce((acc, u) => acc + u.nbBaux * 6, 0);
    const revenuTotal = revenuManuel + revenuAuto;

    return NextResponse.json({
      stats: {
        totalUsers: users.length,
        usersPayants,
        usersGratuits,
        usersManuel,
        usersAuto,
        totalBaux: baux?.length || 0,
        revenuManuel,
        revenuAuto,
        revenuTotal,
      },
      users,
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}