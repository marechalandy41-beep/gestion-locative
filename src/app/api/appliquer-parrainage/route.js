import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { code, filleulId } = await request.json();

    // Trouver le parrain avec ce code
    const { data: parrain, error } = await supabase
      .from('customers')
      .select('user_id, reduction')
      .eq('code_parrainage', code)
      .single();

    if (error || !parrain) {
      return NextResponse.json({ error: 'Code parrainage invalide' }, { status: 400 });
    }

    // Vérifier que le filleul ne parraine pas lui-même
    if (parrain.user_id === filleulId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas utiliser votre propre code' }, { status: 400 });
    }

    // Appliquer -5% au filleul
    await supabase
      .from('customers')
      .update({ reduction: 5, code_promo: code })
      .eq('user_id', filleulId);

    // Ajouter -5% au parrain (cumulable avec sa réduction actuelle, max 15%)
    const nouvelleReduction = Math.min((parrain.reduction || 0) + 5, 15)
    await supabase
      .from('customers')
      .update({ reduction: nouvelleReduction })
      .eq('user_id', parrain.user_id);

    // Enregistrer le parrainage
    await supabase.from('parrainages').insert({
      parrain_id: parrain.user_id,
      filleul_id: filleulId,
      code_parrainage: code,
      reduction_filleul: 5,
      reduction_parrain: 5,
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}