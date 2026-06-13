import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { code, filleulId } = await request.json();

    // Récupérer les settings parrainage
    const { data: settingsData } = await supabase
      .from('settings')
      .select('cle, valeur')
      .in('cle', ['parrainage_reduction_filleul', 'parrainage_reduction_parrain', 'parrainage_type_filleul', 'parrainage_type_parrain'])

    const settings = {}
    settingsData?.forEach(s => { settings[s.cle] = s.valeur })

    const reductionFilleul = parseInt(settings.parrainage_reduction_filleul) || 5
    const reductionParrain = parseInt(settings.parrainage_reduction_parrain) || 5
    const typeFilleul = settings.parrainage_type_filleul || 'reduction'
    const typeParrain = settings.parrainage_type_parrain || 'reduction'

    // Trouver le parrain avec ce code
    const { data: parrain, error } = await supabase
      .from('customers')
      .select('user_id, reduction')
      .eq('code_parrainage', code)
      .single();

    if (error || !parrain) {
      return NextResponse.json({ error: 'Code parrainage invalide' }, { status: 400 });
    }

    if (parrain.user_id === filleulId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas utiliser votre propre code' }, { status: 400 });
    }

    // Appliquer la récompense au filleul
    await supabase
      .from('customers')
      .update({
        reduction: typeFilleul === 'reduction' ? reductionFilleul : 0,
        mois_gratuits: typeFilleul === 'mois_gratuit' ? reductionFilleul : 0,
        code_promo: code
      })
      .eq('user_id', filleulId);

    // Appliquer la récompense au parrain
    const nouvelleReduction = typeParrain === 'reduction'
      ? Math.min((parrain.reduction || 0) + reductionParrain, 15)
      : 0
    const moisGratuits = typeParrain === 'mois_gratuit' ? reductionParrain : 0

    await supabase
      .from('customers')
      .update({
        reduction: nouvelleReduction,
        mois_gratuits: moisGratuits,
      })
      .eq('user_id', parrain.user_id);

    // Enregistrer le parrainage
    await supabase.from('parrainages').insert({
      parrain_id: parrain.user_id,
      filleul_id: filleulId,
      code_parrainage: code,
      reduction_filleul: reductionFilleul,
      reduction_parrain: reductionParrain,
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}