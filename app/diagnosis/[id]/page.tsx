import { notFound } from 'next/navigation';
import DiagnosisReportClient, { ReportData } from './components/DiagnosisReportClient';

// サーバーサイドでレポートデータを取得
async function getReport(id: string): Promise<ReportData | null> {
  try {
    // 内部APIを直接呼び出すのではなく、絶対URLでフェッチ
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/diagnosis-report/${id}`, {
      cache: 'no-store', // 常に最新データを取得
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Failed to fetch report:', error);
    return null;
  }
}

// Next.js 16準拠: params を Promise として受け取り
export default async function DiagnosisReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next.js 16: await で params を取得
  const { id } = await params;

  // サーバーサイドでデータ取得
  const report = await getReport(id);

  // レポートが見つからない場合は404
  if (!report) {
    notFound();
  }

  // Client Componentにデータを渡す
  return <DiagnosisReportClient report={report} />;
}
