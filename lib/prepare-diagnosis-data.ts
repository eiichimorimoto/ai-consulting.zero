import { createClient } from "@/utils/supabase/server"

export async function prepareDiagnosisData(companyId: string) {
  const supabase = await createClient()

  // 企業情報を取得
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single()

  if (companyError) throw companyError

  // デジタルスコアを取得（最新のもの）
  const { data: digitalScore, error: scoreError } = await supabase
    .from("digital_scores")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (scoreError && scoreError.code !== "PGRST116") {
    // PGRST116 = データなし（エラーではない）
    throw scoreError
  }

  // 診断データを構造化
  const diagnosisData = {
    company: {
      name: company.name,
      industry: company.industry,
      employeeCount: company.employee_count,
      founded: company.founded_year,
      website: company.website,
    },
    digital: digitalScore
      ? {
          webPerformance: {
            mobileScore: digitalScore.mobile_score,
            desktopScore: digitalScore.desktop_score,
            status: getPerformanceStatus(digitalScore.mobile_score, digitalScore.desktop_score),
          },
          security: {
            hasSSL: digitalScore.has_ssl,
            status: digitalScore.has_ssl ? "secure" : "vulnerable",
          },
          mobile: {
            isFriendly: digitalScore.is_mobile_friendly,
            status: digitalScore.is_mobile_friendly ? "optimized" : "needs_improvement",
          },
          coreWebVitals: {
            lcp: {
              mobile: digitalScore.lcp_mobile,
              desktop: digitalScore.lcp_desktop,
              status: getWebVitalsStatus("lcp", digitalScore.lcp_mobile),
            },
            fcp: {
              mobile: digitalScore.fcp_mobile,
              desktop: digitalScore.fcp_desktop,
              status: getWebVitalsStatus("fcp", digitalScore.fcp_mobile),
            },
            cls: {
              mobile: digitalScore.cls_mobile,
              desktop: digitalScore.cls_desktop,
              status: getWebVitalsStatus("cls", digitalScore.cls_mobile),
            },
          },
        }
      : null,
    issueFlags: {
      slowWebsite: digitalScore
        ? digitalScore.mobile_score < 50 || digitalScore.desktop_score < 50
        : false,
      noSSL: digitalScore ? !digitalScore.has_ssl : false,
      notMobileFriendly: digitalScore ? !digitalScore.is_mobile_friendly : false,
      poorWebVitals: digitalScore
        ? digitalScore.lcp_mobile > 2500 || digitalScore.fcp_mobile > 1800
        : false,
    },
  }

  return diagnosisData
}

function getPerformanceStatus(mobileScore: number, desktopScore: number): string {
  const avgScore = (mobileScore + desktopScore) / 2
  if (avgScore >= 90) return "excellent"
  if (avgScore >= 70) return "good"
  if (avgScore >= 50) return "needs_improvement"
  return "poor"
}

function getWebVitalsStatus(metric: string, value: number): string {
  const thresholds: { [key: string]: { good: number; needsImprovement: number } } = {
    lcp: { good: 2500, needsImprovement: 4000 }, // ms
    fcp: { good: 1800, needsImprovement: 3000 }, // ms
    cls: { good: 0.1, needsImprovement: 0.25 }, // score
  }

  const threshold = thresholds[metric]
  if (!threshold) return "unknown"

  if (value <= threshold.good) return "good"
  if (value <= threshold.needsImprovement) return "needs_improvement"
  return "poor"
}
