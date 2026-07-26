import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resyncAbonnementUtilisateur } from '@/lib/resyncAbonnement';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { userId, code } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 });

    // Retirer le code et la réduction associée du client (uniquement la part code promo)
    await supabase
      .from('customers')
      .update({ code_promo: null, reduction_code_promo: 0 })
      .eq('user_id', userId);

    // Décrémenter le compteur d'utilisation du code (si fourni et > 0)
    if (code) {
      const { data: codeData } = await supabase
        .from('codes_promo')
        .select('id, usage_count')
        .eq('code', code)
        .single();
      if (codeData && codeData.usage_count > 0) {
        await supabase
          .from('codes_promo')
          .update({ usage_count: codeData.usage_count - 1 })
          .eq('id', codeData.id);
      }
    }

    // Répercuter sur l'abonnement Stripe actif (retire la réduction en cours)
    const resync = await resyncAbonnementUtilisateur(userId).catch(e => ({ error: e.message }));

    return NextResponse.json({ success: true, resync });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}