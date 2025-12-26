import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    
    // WebサイトURLを持つ全企業を取得
    const { data: companies, error: fetchError } = await supabase
      .from('companies')
      .select('id, name, website')
      .not('website', 'is', null)
      .not('website', 'eq', '');

    if (fetchError) throw fetchError;

    if (!companies || companies.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No companies with website found',
      });
    }

    const results = {
      total: companies.length,
      succeeded: 0,
      failed: 0,
      details: [] as any[],
    };

    // 各企業を順番に処理（レート制限考慮）
    for (const company of companies) {
      try {
        console.log(`Processing: ${company.name} (${company.website})`);

        // PageSpeed APIを呼び出し
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/collect/pagespeed`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyId: company.id,
              url: company.website,
            }),
          }
        );

        const data = await response.json();

        if (response.ok && data.success) {
          results.succeeded++;
          results.details.push({
            company: company.name,
            status: 'success',
            data: data.data,
          });
          console.log(`✓ Success: ${company.name}`);
        } else {
          results.failed++;
          results.details.push({
            company: company.name,
            status: 'failed',
            error: data.error || 'Unknown error',
          });
          console.log(`✗ Failed: ${company.name} - ${data.error}`);
        }

        // レート制限対策：1秒待機
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        results.failed++;
        results.details.push({
          company: company.name,
          status: 'failed',
          error: error.message,
        });
        console.log(`✗ Error: ${company.name} - ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Processed ${results.total} companies: ${results.succeeded} succeeded, ${results.failed} failed`,
    });

  } catch (error: any) {
    console.error('Batch processing error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
