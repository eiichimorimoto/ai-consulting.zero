import { NextResponse } from 'next/server';
import { analyzePageSpeed } from '@/lib/pagespeed';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const { companyId, url } = await request.json();

    if (!companyId || !url) {
      return NextResponse.json(
        { error: 'companyId and url are required' },
        { status: 400 }
      );
    }

    // PageSpeed分析を実行
    const metrics = await analyzePageSpeed(url);

    // Supabaseに保存
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('digital_scores')
      .insert({
        company_id: companyId,
        mobile_score: metrics.mobileScore,
        desktop_score: metrics.desktopScore,
        performance_mobile: metrics.categories.performance.mobile,
        performance_desktop: metrics.categories.performance.desktop,
        accessibility_mobile: metrics.categories.accessibility.mobile,
        accessibility_desktop: metrics.categories.accessibility.desktop,
        best_practices_mobile: metrics.categories.bestPractices.mobile,
        best_practices_desktop: metrics.categories.bestPractices.desktop,
        seo_mobile: metrics.categories.seo.mobile,
        seo_desktop: metrics.categories.seo.desktop,
        fcp_mobile: metrics.coreWebVitals.fcp.mobile,
        fcp_desktop: metrics.coreWebVitals.fcp.desktop,
        lcp_mobile: metrics.coreWebVitals.lcp.mobile,
        lcp_desktop: metrics.coreWebVitals.lcp.desktop,
        tti_mobile: metrics.coreWebVitals.tti.mobile,
        tti_desktop: metrics.coreWebVitals.tti.desktop,
        tbt_mobile: metrics.coreWebVitals.tbt.mobile,
        tbt_desktop: metrics.coreWebVitals.tbt.desktop,
        cls_mobile: metrics.coreWebVitals.cls.mobile,
        cls_desktop: metrics.coreWebVitals.cls.desktop,
        has_ssl: metrics.hasSSL,
        is_mobile_friendly: metrics.isMobileFriendly,
      })
      .select()
      .single();

    if (error) throw error;

    // ログ記録
    await supabase.from('data_collection_logs').insert({
      company_id: companyId,
      collection_type: 'pagespeed',
      status: 'success',
      items_collected: 1,
    });

    return NextResponse.json({
      success: true,
      data: {
        mobileScore: metrics.mobileScore,
        desktopScore: metrics.desktopScore,
        hasSSL: metrics.hasSSL,
        isMobileFriendly: metrics.isMobileFriendly,
      },
    });
  } catch (error: unknown) {
    console.error('PageSpeed collection error:', error);
    const message = error instanceof Error ? error.message : String(error)

    // エラーログ記録
    const supabase = await createClient();
    await supabase.from('data_collection_logs').insert({
      company_id: request.json().then((d: { companyId?: string }) => d.companyId).catch(() => null),
      collection_type: 'pagespeed',
      status: 'error',
      error_message: message,
    });

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
