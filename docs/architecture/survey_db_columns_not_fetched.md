# DB項目の取得状況調査

**調査日**: 2026-02-05  
**対象**: `profiles`, `companies` のカラムで、アプリで「取得していない」または「一部の画面・APIでしか取得していない」項目。

---

## profiles

| カラム | 取得している場所 | 取得していない／注意 |
|--------|------------------|------------------------|
| id, user_id, company_id | 多数 | - |
| name, email | ほぼ全箇所で取得 | - |
| name_kana | complete-profile, 設定(select('*')) | ログイン・ダッシュボード・dify/context では未取得 |
| phone, mobile | complete-profile, 設定(*) | ログイン・ダッシュボード・**dify/context** では未取得 |
| **position** | complete-profile, 設定(*), dify/chat(*) | **dify/context** では明示 select に含まれておらず未取得 → 要対応 |
| **department** | complete-profile, 設定(*) | **dify/context** では未取得 → 要対応 |
| avatar_url | 設定(*), ダッシュボード, AppHeader, ChatArea, complete-profile | - |
| **plan_type** | 設定(select('*')), create-profile で保存 | ダッシュボードTOPは name, company_id, avatar_url のみなので未取得（現状プラン表示は設定のみで問題なし） |
| **monthly_chat_count, monthly_ocr_count** | なし | **どこからも参照・取得していない**（利用量表示をするなら取得が必要） |
| created_at, updated_at | select('*') のときのみ | 明示 select ではほぼ指定されていない（メタ情報のため省略されがち） |

---

## companies

| カラム | 取得している場所 | 取得していない／注意 |
|--------|------------------|------------------------|
| id, name, industry, website, business_description 等 | 各APIで必要分のみ取得、設定は select('*') | - |
| name_kana, corporate_number, postal_code, prefecture, city, address, phone, fax, email, employee_count, capital, annual_revenue, established_date, representative_name, fiscal_year_end, retrieved_info, documents_urls | 設定(select('*')) または 一部API | - |
| **main_products, main_clients, main_banks** | なし（明示 select に未登場） | select('*') の設定・ダッシュボードでは取れる。APIでは未使用。 |
| **current_challenges, growth_stage, it_maturity_level** | dify/context の companies  join | その他APIでは不要なら省略されている。 |
| **source, source_url, is_verified** | なし | 設定(select('*')) では取れる。他では未使用。 |

---

## 外部情報の保存先（main_products / source 等）

**結論: これらは「companies の独立カラム」には入っておらず、すべて `retrieved_info` (JSONB) に混在しています。**

| 項目 | companies テーブル | 実際のデータの場所 |
|------|--------------------|----------------------|
| main_products, main_clients, main_banks | カラムは存在するが **どこからも書き込んでいない**（常に NULL） | **retrieved_info** 内。company-intel が返すキーは **products**, **services**（main_products ではない） |
| source, source_url, is_verified | 同様に **未使用**（書き込み・参照なし） | 出典は **retrieved_info** や **meta**（company-intel のレスポンスの meta）に含まれる。companies.source 等には保存していない |

**データの流れ**
1. 設定の「会社情報を再取得」→ `POST /api/settings/company-refetch` → 内部で `POST /api/company-intel` を呼ぶ。
2. company-intel のレスポンス `data` の形: `industry`, `employeeCount`, `annualRevenue`, `products`, `services`, `branches`, `companyVision`, `extraBullets`, `summary`, `rawNotes` など（**main_products / main_clients / main_banks というキーは返していない**）。
3. company-refetch は `retrieved_info: data` で **data オブジェクト全体** を JSONB に保存。個別カラムには `name_kana`, `industry`, `employee_count`, `representative_name` 等だけマッピングして update。
4. SWOT 分析などは `company.retrieved_info.products`, `company.retrieved_info.services` を参照。`main_products` も読んでいるが、company-intel はそのキーを返さないため、実データは **products / services** で入っている。

**データ確認のしかた**
- **独立カラム**（main_products, main_clients, main_banks, source, source_url, is_verified）: アプリからは一切書き込んでいないため、DB 上は NULL の想定。
- **外部情報の実体**: `companies.retrieved_info` を確認する。設定画面の「取得済み外部情報」や、API で `company.retrieved_info` を返している箇所で中身（products, services, summary, rawNotes 等）を確認できる。

---

## 対応推奨

1. **dify/context**  
   profiles の `position`, `department` を select に追加し、Dify に役職・部署を渡す。
2. **monthly_chat_count / monthly_ocr_count**  
   利用量表示や制限チェックをするなら、該当API・画面で profiles 取得時に含める。
3. **companies の main_products 等**  
   分析やDifyで使う方針なら、必要なAPIの select に追加する。
