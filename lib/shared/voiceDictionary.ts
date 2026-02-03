/**
 * Custom dictionary for consulting-specific terms
 * Helps improve speech recognition accuracy for domain-specific vocabulary
 */

export interface DictionaryEntry {
  term: string;
  alternatives: string[];
  category: string;
}

export const CONSULTING_DICTIONARY: DictionaryEntry[] = [
  // Business metrics
  { term: "KPI", alternatives: ["ケーピーアイ", "けーぴーあい"], category: "metrics" },
  { term: "ROI", alternatives: ["アールオーアイ", "あーるおーあい"], category: "metrics" },
  { term: "EBITDA", alternatives: ["イービットダー", "いーびっとだー"], category: "metrics" },
  { term: "PL", alternatives: ["ピーエル", "損益計算書"], category: "metrics" },
  { term: "BS", alternatives: ["ビーエス", "貸借対照表"], category: "metrics" },

  // Consulting terms
  { term: "DX", alternatives: ["ディーエックス", "デジタルトランスフォーメーション"], category: "consulting" },
  { term: "RPA", alternatives: ["アールピーエー", "あーるぴーえー"], category: "consulting" },
  { term: "BPR", alternatives: ["ビーピーアール", "業務改革"], category: "consulting" },
  { term: "PMO", alternatives: ["ピーエムオー", "ぴーえむおー"], category: "consulting" },
  { term: "PoC", alternatives: ["ピーオーシー", "概念実証"], category: "consulting" },

  // Technology
  { term: "API", alternatives: ["エーピーアイ", "えーぴーあい"], category: "technology" },
  { term: "SaaS", alternatives: ["サース", "さーす"], category: "technology" },
  { term: "クラウド", alternatives: ["くらうど"], category: "technology" },
  { term: "AI", alternatives: ["エーアイ", "人工知能"], category: "technology" },
  { term: "ML", alternatives: ["エムエル", "機械学習"], category: "technology" },

  // Finance
  { term: "CAPEX", alternatives: ["キャペックス", "設備投資"], category: "finance" },
  { term: "OPEX", alternatives: ["オペックス", "運用費"], category: "finance" },
  { term: "予実", alternatives: ["よじつ"], category: "finance" },
  { term: "損益分岐点", alternatives: ["そんえきぶんきてん"], category: "finance" },
  { term: "キャッシュフロー", alternatives: ["CF", "現金流"], category: "finance" },

  // Strategy
  { term: "SWOT", alternatives: ["スウォット", "すうぉっと"], category: "strategy" },
  { term: "PEST", alternatives: ["ペスト", "ぺすと"], category: "strategy" },
  { term: "3C", alternatives: ["スリーシー", "さんしー"], category: "strategy" },
  { term: "5F", alternatives: ["ファイブフォース", "ごふぉーす"], category: "strategy" },
  { term: "バリューチェーン", alternatives: ["価値連鎖"], category: "strategy" },
];

/**
 * Get speech recognition hints for better accuracy
 */
export function getSpeechHints(): string[] {
  return CONSULTING_DICTIONARY.map(entry => entry.term);
}

/**
 * Find the correct term from recognized text
 */
export function findCorrectTerm(recognizedText: string): string | null {
  const normalized = recognizedText.toLowerCase().trim();

  for (const entry of CONSULTING_DICTIONARY) {
    // Check if recognized text matches any alternative
    for (const alt of entry.alternatives) {
      if (normalized.includes(alt.toLowerCase())) {
        return entry.term;
      }
    }
  }

  return null;
}

/**
 * Replace recognized alternatives with correct terms
 */
export function correctTranscript(transcript: string): string {
  let corrected = transcript;

  for (const entry of CONSULTING_DICTIONARY) {
    for (const alt of entry.alternatives) {
      const regex = new RegExp(alt, 'gi');
      corrected = corrected.replace(regex, entry.term);
    }
  }

  return corrected;
}

/**
 * Get dictionary entries by category
 */
export function getDictionaryByCategory(category: string): DictionaryEntry[] {
  return CONSULTING_DICTIONARY.filter(entry => entry.category === category);
}

/**
 * Get all categories
 */
export function getCategories(): string[] {
  return Array.from(new Set(CONSULTING_DICTIONARY.map(entry => entry.category)));
}
