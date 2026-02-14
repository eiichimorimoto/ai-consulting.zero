import { createClient } from "@/utils/supabase/server"

export default async function DiagnosisPage() {
  const supabase = await createClient()

  const { data: reports } = await supabase
    .from("diagnostic_reports")
    .select(
      `
      *,
      companies (
        name,
        website
      )
    `
    )
    .order("generated_at", { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-8 pb-8 pt-24">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 text-4xl font-bold text-white">企業診断レポート一覧</h1>

        <div className="grid gap-6">
          {reports?.map((report: any) => (
            <div
              key={report.id}
              className="rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-lg"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="mb-2 text-2xl font-bold text-white">
                    {report.companies?.name || "企業名不明"}
                  </h2>
                  <p className="text-blue-200">{report.companies?.website}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-yellow-400">{report.overall_score}</div>
                  <div className="text-sm text-gray-300">総合スコア</div>
                </div>
              </div>

              <h3 className="mb-2 text-xl font-semibold text-white">{report.report_title}</h3>

              <p className="mb-4 text-gray-300">{report.report_summary}</p>

              <div className="mb-4 grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-white/5 p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">{report.priority_score}</div>
                  <div className="text-sm text-gray-400">優先度</div>
                </div>
                <div className="rounded-lg bg-white/5 p-3 text-center">
                  <div className="text-2xl font-bold text-orange-400">{report.urgency_score}</div>
                  <div className="text-sm text-gray-400">緊急度</div>
                </div>
                <div className="rounded-lg bg-white/5 p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">{report.impact_score}</div>
                  <div className="text-sm text-gray-400">影響度</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-400">
                  検出された課題（{report.matched_issues?.length || 0}件）
                </h4>
                {report.matched_issues?.slice(0, 3).map((issue: any, index: number) => (
                  <div key={index} className="rounded-lg border-l-4 border-red-500 bg-white/5 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-1 text-xs font-bold ${issue.severity === "critical" ? "bg-red-500" : ""} ${issue.severity === "high" ? "bg-orange-500" : ""} ${issue.severity === "medium" ? "bg-yellow-500" : ""} ${issue.severity === "low" ? "bg-green-500" : ""} `}
                      >
                        {issue.severity}
                      </span>
                      <span className="text-xs text-gray-400">{issue.category}</span>
                    </div>
                    <p className="text-sm text-white">{issue.issue}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
