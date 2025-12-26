import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasKey: !!process.env.GOOGLE_PAGESPEED_API_KEY,
    keyPrefix: process.env.GOOGLE_PAGESPEED_API_KEY?.substring(0, 10) || 'なし',
    keyLength: process.env.GOOGLE_PAGESPEED_API_KEY?.length || 0,
  });
}

