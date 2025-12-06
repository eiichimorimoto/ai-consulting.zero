import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { ImageAnnotatorClient } from "@google-cloud/vision"

// Google Cloud Vision APIクライアントを初期化
function getVisionClient() {
  // 環境変数から認証情報を取得
  let credentials = process.env.GOOGLE_CLOUD_CREDENTIALS
  
  if (!credentials) {
    throw new Error("GOOGLE_CLOUD_CREDENTIALS環境変数が設定されていません")
  }

  // シングルクォートやダブルクォートを削除
  credentials = credentials.trim()
  if ((credentials.startsWith("'") && credentials.endsWith("'")) || 
      (credentials.startsWith('"') && credentials.endsWith('"'))) {
    credentials = credentials.slice(1, -1)
  }

  try {
    const credentialsJson = JSON.parse(credentials)
    
    // 必須フィールドの確認
    if (!credentialsJson.project_id || !credentialsJson.private_key || !credentialsJson.client_email) {
      throw new Error("認証情報に必須フィールドが不足しています")
    }
    
    console.log("🔑 認証情報の検証:")
    console.log("  Project ID:", credentialsJson.project_id)
    console.log("  Client Email:", credentialsJson.client_email)
    console.log("  Private Key:", credentialsJson.private_key ? "設定済み" : "未設定")
    
    const client = new ImageAnnotatorClient({
      credentials: credentialsJson,
    })
    
    console.log("✅ ImageAnnotatorClient を作成しました")
    return client
  } catch (error) {
    console.error("Credentials parsing error:", error)
    throw new Error(`GOOGLE_CLOUD_CREDENTIALSのJSON形式が正しくありません: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// OCR結果から名刺情報を抽出する関数
function extractBusinessCardInfo(text: string): {
  personName?: string
  personNameKana?: string
  position?: string
  department?: string
  companyName?: string
  email?: string
  phone?: string
  mobile?: string
  postalCode?: string
  address?: string
  website?: string
} {
  const lines = text.split("\n").filter((line) => line.trim().length > 0)
  const result: any = {}

  // メールアドレスの検出
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g
  const emails = text.match(emailRegex)
  if (emails && emails.length > 0) {
    result.email = emails[0]
  }

  // 電話番号の検出（日本の形式）
  const phoneRegex = /(\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{3,4})/g
  const phones = text.match(phoneRegex)
  if (phones && phones.length > 0) {
    // 携帯電話（090, 080, 070で始まる）
    const mobile = phones.find((p) => /^0[789]0/.test(p.replace(/[-.\s]/g, "")))
    if (mobile) {
      result.mobile = mobile
    }
    // 固定電話
    const landline = phones.find((p) => !/^0[789]0/.test(p.replace(/[-.\s]/g, "")))
    if (landline) {
      result.phone = landline
    }
  }

  // 郵便番号の検出（日本の形式: 123-4567）
  const postalCodeRegex = /\d{3}[-.\s]?\d{4}/
  const postalCode = text.match(postalCodeRegex)
  if (postalCode) {
    result.postalCode = postalCode[0]
  }

  // URL/ウェブサイトの検出
  const urlRegex = /https?:\/\/[\w.-]+/g
  const urls = text.match(urlRegex)
  if (urls && urls.length > 0) {
    result.website = urls[0]
  }

  // 住所の検出（都道府県名を含む行）
  const prefectureRegex = /(東京都|大阪府|京都府|北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/
  const addressMatch = text.match(new RegExp(`${prefectureRegex.source}[\\s\\S]{0,50}`, "g"))
  if (addressMatch) {
    result.address = addressMatch[0].trim()
  }

  // 会社名の検出（株式会社、有限会社、合同会社など）
  const companyRegex = /(株式会社|有限会社|合同会社|合資会社|合名会社|一般社団法人|一般財団法人|特定非営利活動法人|学校法人|医療法人|社会医療法人|社会福祉法人|宗教法人|協同組合|相互会社|信用金庫|信用組合|労働金庫|農業協同組合|漁業協同組合|生活協同組合)[\s\S]{0,30}/
  const companyMatch = text.match(companyRegex)
  if (companyMatch) {
    result.companyName = companyMatch[0].trim()
  }

  // 役職の検出
  const positionKeywords = [
    "代表取締役",
    "取締役",
    "執行役員",
    "部長",
    "次長",
    "課長",
    "係長",
    "主任",
    "マネージャー",
    "ディレクター",
    "エンジニア",
    "コンサルタント",
  ]
  for (const keyword of positionKeywords) {
    const positionRegex = new RegExp(`${keyword}[\\s\\S]{0,20}`, "g")
    const positionMatch = text.match(positionRegex)
    if (positionMatch) {
      result.position = positionMatch[0].trim()
      break
    }
  }

  // 部署の検出
  const departmentKeywords = [
    "営業部",
    "マーケティング部",
    "開発部",
    "技術部",
    "人事部",
    "経理部",
    "総務部",
    "企画部",
    "本部",
    "事業部",
  ]
  for (const keyword of departmentKeywords) {
    const deptRegex = new RegExp(`${keyword}`, "g")
    const deptMatch = text.match(deptRegex)
    if (deptMatch) {
      result.department = keyword
      break
    }
  }

  // 氏名の検出（最初の行または特定のパターン）
  // カタカナ名の検出
  const kanaRegex = /[ァ-ヶー\s]+/
  const kanaMatch = text.match(kanaRegex)
  if (kanaMatch && kanaMatch[0].trim().length > 2) {
    result.personNameKana = kanaMatch[0].trim()
  }

  // 漢字名の検出（最初の2-4文字の漢字の組み合わせ）
  const nameRegex = /^[\u4e00-\u9faf]{2,4}[\s\u4e00-\u9faf]{0,4}/
  const nameMatch = lines.find((line) => nameRegex.test(line.trim()))
  if (nameMatch) {
    const name = nameMatch.trim().match(/^[\u4e00-\u9faf\s]{2,8}/)
    if (name) {
      result.personName = name[0].trim()
    }
  }

  return result
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 認証されているユーザーを取得
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "ファイルがアップロードされていません" },
        { status: 400 }
      )
    }

    // ファイルをBufferに変換
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Google Cloud Vision APIを使用してOCRを実行
    let visionClient: ImageAnnotatorClient | null = null
    
    // 環境変数が設定されているか確認
    const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS
    const hasCredentials = credentials && credentials.trim() !== '' && credentials !== "''" && credentials !== '""'
    
    console.log("=== OCR API Debug Info ===")
    console.log("Has credentials:", hasCredentials ? "Yes" : "No")
    if (hasCredentials) {
      console.log("Credentials length:", credentials?.length || 0)
      console.log("Credentials preview:", credentials?.substring(0, 50) + "...")
    }
    
    if (hasCredentials) {
      try {
        visionClient = getVisionClient()
        console.log("✅ Google Cloud Vision API client initialized successfully")
      } catch (error) {
        console.error("❌ Vision client initialization error:", error)
        if (error instanceof Error) {
          console.error("Error message:", error.message)
          console.error("Error stack:", error.stack)
        }
        console.warn("⚠️ Google Cloud Vision APIが利用できないため、モックデータを使用します")
        // フォールバック: モックデータを使用
      }
    } else {
      console.warn("⚠️ GOOGLE_CLOUD_CREDENTIALS環境変数が設定されていません。モックデータを使用します。")
      console.warn("環境変数を設定するには: node scripts/setup-google-vision-env.js <JSONファイル>")
    }

    // Google Cloud Vision APIが利用可能な場合
    if (visionClient) {
      try {
        console.log("📸 画像をGoogle Cloud Vision APIに送信します...")
        console.log("Image buffer size:", buffer.length, "bytes")
        
        // テキスト検出を実行
        const [result] = await visionClient.textDetection({
          image: { content: buffer },
        })

        console.log("✅ Vision API response received")
        const detections = result.textAnnotations
        console.log("Detections count:", detections?.length || 0)
        
        if (!detections || detections.length === 0) {
          console.warn("⚠️ 画像からテキストを検出できませんでした。モックデータを使用します")
          // フォールバック: モックデータを使用
        } else {
          // 最初の要素は全テキスト、残りは個別の単語
          const fullText = detections[0].description || ""
          console.log("📝 検出されたテキスト（最初の100文字）:", fullText.substring(0, 100))

          // 名刺情報を抽出
          const extractedInfo = extractBusinessCardInfo(fullText)
          console.log("📋 抽出された情報:", extractedInfo)

          // 結果を返す
          return NextResponse.json({
            ...extractedInfo,
            rawText: fullText,
            confidence: detections[0].confidence || 0.8,
          })
        }
      } catch (visionError) {
        console.error("❌ Vision API error:", visionError)
        if (visionError instanceof Error) {
          console.error("Error message:", visionError.message)
          console.error("Error stack:", visionError.stack)
          
          // よくあるエラーの説明を追加
          if (visionError.message.includes("PERMISSION_DENIED")) {
            console.error("💡 ヒント: サービスアカウントにCloud Vision APIの権限が必要です")
            console.error("   Google Cloud Consoleで、サービスアカウントに 'Cloud Vision API User' ロールを付与してください")
          } else if (visionError.message.includes("API not enabled")) {
            console.error("💡 ヒント: Cloud Vision APIが有効になっていません")
            console.error("   Google Cloud Consoleで、Cloud Vision APIを有効にしてください")
          }
        }
        console.warn("⚠️ Google Cloud Vision APIエラー。モックデータを使用します")
        // フォールバック: モックデータを使用
      }
    }

    // フォールバック: モックデータを返す（開発環境またはAPIが利用できない場合）
    if (!hasCredentials) {
      console.log("⚠️ GOOGLE_CLOUD_CREDENTIALS環境変数が設定されていません。モックデータを使用します。")
      console.log("実際のOCR機能を使用するには、.env.localにGOOGLE_CLOUD_CREDENTIALSを設定してください。")
    } else {
      console.log("⚠️ Google Cloud Vision APIの呼び出しに失敗しました。モックデータを使用します。")
    }
    
    const mockResult = {
      personName: "田中 一郎",
      personNameKana: "タナカ イチロウ",
      position: "営業部長",
      department: "営業本部",
      companyName: "株式会社テックソリューションズ",
      email: "tanaka@techsolutions.co.jp",
      phone: "03-1234-5678",
      mobile: "090-1234-5678",
      postalCode: "150-0001",
      address: "東京都渋谷区恵比寿1-1-1",
      website: "https://techsolutions.co.jp",
      rawText: "モックデータ: 名刺情報のサンプル",
      confidence: 0.85,
    }

    return NextResponse.json(mockResult)
  } catch (error) {
    console.error("OCR processing error:", error)
    return NextResponse.json(
      {
        error: "OCR処理中にエラーが発生しました",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
