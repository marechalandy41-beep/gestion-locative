import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    const { data, error } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ articles: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const article = await request.json();
    const { id, ...articleSansId } = article;
    let error;
    if (id) {
      const res = await supabase.from('articles').update({ ...articleSansId, updated_at: new Date().toISOString() }).eq('id', id);
      error = res.error;
    } else {
      const res = await supabase.from('articles').insert({ ...articleSansId });
      error = res.error;
    }
    if (error) throw error;
    const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
    return NextResponse.json({ articles: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    const { error } = await supabase.from('articles').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}