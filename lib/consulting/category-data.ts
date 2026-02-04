/**
 * コンサルティングカテゴリデータ
 * 
 * 新規セッション開始時に表示されるカテゴリボタンのマスターデータ
 * 
 * @module lib/consulting/category-data
 */

import { CategoryData } from "@/types/consulting";

/**
 * コンサルティングカテゴリのマスターデータ
 * 
 * 使用箇所:
 * - createInitialSessionForNewUser: 新規ユーザーの初期セッション
 * - handleNewSession: 新規セッション作成時
 */
export const CONSULTING_CATEGORIES: CategoryData[] = [
  { 
    label: "売上の伸び悩み", 
    icon: "TrendingDown", 
    color: "bg-red-500", 
    bgLight: "bg-red-50 border-red-200" 
  },
  { 
    label: "コスト削減", 
    icon: "DollarSign", 
    color: "bg-green-500", 
    bgLight: "bg-green-50 border-green-200" 
  },
  { 
    label: "新規事業立ち上げ", 
    icon: "Rocket", 
    color: "bg-blue-500", 
    bgLight: "bg-blue-50 border-blue-200" 
  },
  { 
    label: "組織改革", 
    icon: "Users", 
    color: "bg-purple-500", 
    bgLight: "bg-purple-50 border-purple-200" 
  },
  { 
    label: "DX推進", 
    icon: "Cpu", 
    color: "bg-indigo-500", 
    bgLight: "bg-indigo-50 border-indigo-200" 
  },
  { 
    label: "セキュリティ強化", 
    icon: "Shield", 
    color: "bg-amber-500", 
    bgLight: "bg-amber-50 border-amber-200" 
  },
  { 
    label: "クラウド移行", 
    icon: "Cloud", 
    color: "bg-cyan-500", 
    bgLight: "bg-cyan-50 border-cyan-200" 
  },
  { 
    label: "業務自動化", 
    icon: "Zap", 
    color: "bg-yellow-500", 
    bgLight: "bg-yellow-50 border-yellow-200" 
  },
  { 
    label: "その他", 
    icon: "Edit3", 
    color: "bg-gray-500", 
    bgLight: "bg-gray-50 border-gray-200" 
  }
];
