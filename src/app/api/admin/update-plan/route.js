import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { userId, plan } = await request.json();

    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing) {
      await supabase.from('customers').update({ plan }).eq('user_id', userId);
    } else {
      await supabase.from('customers').insert({ user_id: userId, plan });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}