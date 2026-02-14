/**
 * 名刺OCR解析結果の型定義
 */

// 基本情報
export interface PersonInfo {
  nameJa: string // 日本語氏名
  nameEn: string // 英語氏名
  nameKana?: string // ふりがな（あれば）
}

// 会社情報
export interface CompanyInfo {
  nameJa: string // 日本語会社名
  nameEn: string // 英語会社名
  abbreviation?: string // 略称
  slogan?: {
    ja?: string
    en?: string
  }
}

// 部署情報
export interface DepartmentInfo {
  ja: string
  en?: string
}

// 連絡先情報
export interface ContactInfo {
  email?: string
  tel?: string
  telInternational?: string
  fax?: string
  faxInternational?: string
  mobile?: string
  url?: string
}

// 住所情報
export interface AddressInfo {
  name: string // 拠点名（本社、支店など）
  postalCode?: string
  addressJa?: string
  addressEn?: string
  building?: string
}

// 認証情報
export interface CertificationInfo {
  name: string // 認証規格名
  number: string // 認証番号
}

// 名刺全体のデータ構造
export interface BusinessCardData {
  person: PersonInfo
  company: CompanyInfo
  departments: DepartmentInfo[]
  contact: ContactInfo
  addresses: AddressInfo[]
  certifications: CertificationInfo[]
  rawText?: string // 元のOCRテキスト（デバッグ用）
  confidence?: number // 解析信頼度（0-1）
  analyzedAt: string // 解析日時
}

// API レスポンス型
export interface OCRResponse {
  success: boolean
  data?: BusinessCardData
  error?: string
}

// API リクエスト型
export interface OCRRequest {
  image: string // Base64エンコードされた画像
  imageType: "jpeg" | "png" | "webp" | "gif" | "pdf"
}
