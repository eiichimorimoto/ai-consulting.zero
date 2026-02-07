/**
 * PageSpeed Insights API キャッシュ管理
 * 
 * Supabaseを使用して24時間キャッシュし、API使用量を削減
 */

import { createClient } from '@/lib/supabase/server';

export interface PageSpeedCacheData {
  url: string;
  strategy: 'mobile' | 'desktop';
  result: any;
}

/**
 * キャッシュから PageSpeed 結果を取得
 * 
 * @param url - 分析対象URL
 * @param strategy - デバイス戦略
 * @returns キャッシュされた結果、または null
 */
export async function getPageSpeedCache(
  url: string,
  strategy: 'mobile' | 'desktop'
): Promise<any | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('pagespeed_cache')
      .select('result, expires_at')
      .eq('url', url)
      .eq('strategy', strategy)
      .gt('expires_at', new Date().toISOString()) // 有効期限内のみ
      .single();
    
    if (error || !data) {
      console.log(`💾 キャッシュミス: ${url} (${strategy})`);
      return null;
    }
    
    console.log(`✅ キャッシュヒット: ${url} (${strategy})`);
    return data.result;
    
  } catch (error) {
    console.error('キャッシュ取得エラー:', error);
    return null;
  }
}

/**
 * PageSpeed 結果をキャッシュに保存
 * 
 * @param url - 分析対象URL
 * @param strategy - デバイス戦略
 * @param result - PageSpeed API の結果
 */
export async function setPageSpeedCache(
  url: string,
  strategy: 'mobile' | 'desktop',
  result: any
): Promise<void> {
  try {
    const supabase = await createClient();
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24時間後
    
    // upsert: 既存データがあれば更新、なければ挿入
    const { error } = await supabase
      .from('pagespeed_cache')
      .upsert({
        url,
        strategy,
        result,
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'url,strategy'
      });
    
    if (error) {
      console.error('キャッシュ保存エラー:', error);
      return;
    }
    
    console.log(`💾 キャッシュ保存完了: ${url} (${strategy}), expires: ${expiresAt.toISOString()}`);
    
  } catch (error) {
    console.error('キャッシュ保存エラー:', error);
  }
}

/**
 * 複数のキャッシュを一括取得
 * 
 * @param url - 分析対象URL
 * @returns mobile と desktop の結果、またはnull
 */
export async function getBulkPageSpeedCache(
  url: string
): Promise<{ mobile: any; desktop: any } | null> {
  try {
    const [mobile, desktop] = await Promise.all([
      getPageSpeedCache(url, 'mobile'),
      getPageSpeedCache(url, 'desktop')
    ]);
    
    // 両方ともキャッシュがある場合のみ返す
    if (mobile && desktop) {
      console.log(`✅ 完全キャッシュヒット: ${url}`);
      return { mobile, desktop };
    }
    
    return null;
    
  } catch (error) {
    console.error('一括キャッシュ取得エラー:', error);
    return null;
  }
}

/**
 * 複数のキャッシュを一括保存
 * 
 * @param url - 分析対象URL
 * @param results - mobile と desktop の結果
 */
export async function setBulkPageSpeedCache(
  url: string,
  results: { mobile: any; desktop: any }
): Promise<void> {
  try {
    await Promise.all([
      setPageSpeedCache(url, 'mobile', results.mobile),
      setPageSpeedCache(url, 'desktop', results.desktop)
    ]);
    
    console.log(`💾 一括キャッシュ保存完了: ${url}`);
    
  } catch (error) {
    console.error('一括キャッシュ保存エラー:', error);
  }
}
