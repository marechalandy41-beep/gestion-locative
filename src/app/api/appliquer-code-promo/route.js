import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { code, userId } = await request.json();

    // Vérifier que le code existe et est actif
    const { data: codeData, error } = await supabase
      .from('codes_promo')
      .select('*')
      .eq('code', code)
      .eq('actif', true)
      .single();

    if (error || !codeData) {
      return NextResponse.json({ error: 'Code invalide ou inactif' }, { status: 400 });
    }

    // Vérifier la date d'expiration
    if (codeData.expire_le && new Date(codeData.expire_le) < new Date()) {
      return NextResponse.json({ error: 'Ce code a expiré' }, { status: 400 });
    }

    // Vérifier le nombre d'utilisations
    if (codeData.usage_max && codeData.usage_count >= codeData.usage_max) {
      return NextResponse.json({ error: 'Ce code a atteint son nombre maximum d\'utilisations' }, { status: 400 });
    }

    // Incrémenter le compteur d'utilisations
    await supabase
      .from('codes_promo')
      .update({ usage_count: codeData.usage_count + 1 })
      .eq('id', codeData.id);

    // Sauvegarder la réduction dans la table customers
    await supabase
      .from('customers')
      .update({ reduction: codeData.reduction, code_promo: code })
      .eq('user_id', userId);

    return NextResponse.json({ success: true, reduction: codeData.reduction });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}