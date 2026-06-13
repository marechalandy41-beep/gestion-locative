import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('codes_promo')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ codes: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { action, code, reduction, type, usage_max, expire_le, id } = await request.json();

    if (action === 'create') {
      const { error } = await supabase.from('codes_promo').insert({
  code: code.toUpperCase(),
  reduction,
  type,
  usage_max: usage_max || null,
  expire_le: expire_le || null,
});
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      const { error } = await supabase.from('codes_promo').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'toggle') {
      const { data: current } = await supabase.from('codes_promo').select('actif').eq('id', id).single();
      const { error } = await supabase.from('codes_promo').update({ actif: !current.actif }).eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}