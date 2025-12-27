import { createClient } from '@/utils/supabase/server';

export default async function DiagnosisPage() {
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from('diagnostic_reports')
    .select(`
      *,
      companies (
        name,
        website
      )
    `)
    .order('generated_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pt-24 px-8 pb-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">
          企業診断レポート一覧
        </h1>

        <div className="grid gap-6">
          {reports?.map((report: any) => (
            <div
              key={report.id}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {report.companies?.name || '企業名不明'}
                  </h2>
                  <p className="text-blue-200">
                    {report.companies?.website}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-yellow-400">
                    {report.overall_score}
                  </div>
                  <div className="text-sm text-gray-300">総合スコア</div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mb-2">
                {report.report_title}
              </h3>

              <p className="text-gray-300 mb-4">
                {report.report_summary}
              </p>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {report.priority_score}
                  </div>
                  <div className="text-sm text-gray-400">優先度</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-orange-400">
                    {report.urgency_score}
                  </div>
                  <div className="text-sm text-gray-400">緊急度</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {report.impact_score}
                  </div>
                  <div className="text-sm text-gray-400">影響度</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-400">
                  検出された課題（{report.matched_issues?.length || 0}件）
                </h4>
                {report.matched_issues?.slice(0, 3).map((issue: any, index: number) => (
                  <div
                    key={index}
                    className="bg-white/5 rounded-lg p-3 border-l-4 border-red-500"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`
                        px-2 py-1 rounded text-xs font-bold
                        ${issue.severity === 'critical' ? 'bg-red-500' : ''}
                        ${issue.severity === 'high' ? 'bg-orange-500' : ''}
                        ${issue.severity === 'medium' ? 'bg-yellow-500' : ''}
                        ${issue.severity === 'low' ? 'bg-green-500' : ''}
                      `}>
                        {issue.severity}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {issue.category}
                      </span>
                    </div>
                    <p className="text-white text-sm">{issue.issue}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
