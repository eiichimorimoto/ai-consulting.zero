# n8n セットアップガイド

**最終更新**: 2026-01-12  
**推奨バージョン**: n8n v1.78.0+ (CVE-2026-21858対応済み)

---

## 🚨 セキュリティ重要事項

### CVE-2026-21858 脆弱性について

**発覚日**: 2026-01-12  
**深刻度**: 高  
**影響**: n8n v1.77.0以前

**対策**: 
- ✅ **必ず v1.78.0 以降を使用すること**
- ❌ v1.77.0以前のバージョンは使用禁止

---

## 📦 Docker Composeでのセットアップ

### 推奨構成

```yaml
# Docker Compose v2 対応（versionフィールドは非推奨のため削除）
# 参考: https://docs.docker.com/compose/compose-file/04-version-and-name/

services:
  n8n:
    image: n8nio/n8n:latest  # ← 必ず最新版を指定
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      - WEBHOOK_URL=https://${N8N_HOST}/
      - GENERIC_TIMEZONE=Asia/Tokyo
      # PostgreSQL接続
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=${POSTGRES_DB}
      - DB_POSTGRESDB_USER=${POSTGRES_USER}
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres
    networks:
      - n8n-network

  postgres:
    image: postgres:16-alpine
    container_name: n8n-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - n8n-network

volumes:
  n8n_data:
  postgres_data:

networks:
  n8n-network:
    driver: bridge
```

---

## 🔐 環境変数設定

### .env ファイル作成

```bash
# n8n設定
N8N_USER=admin
N8N_PASSWORD=<強力なパスワード>
N8N_HOST=n8n.yourdomain.com

# PostgreSQL設定
POSTGRES_DB=n8n
POSTGRES_USER=n8n_user
POSTGRES_PASSWORD=<強力なパスワード>
```

---

## 🚀 起動手順

### 1. バージョン確認（重要）

```bash
# 最新版を取得
docker pull n8nio/n8n:latest

# バージョン確認
docker run --rm n8nio/n8n:latest n8n --version

# ✅ v1.78.0以降であることを確認
```

### 2. 起動

```bash
docker-compose up -d
```

### 3. 動作確認

```bash
# ログ確認
docker logs -f n8n

# アクセステスト
curl -I https://n8n.yourdomain.com
```

---

## 🔒 セキュリティチェックリスト

### 導入前の必須確認

- [ ] **n8n v1.78.0以降を使用**（CVE-2026-21858対策）
- [ ] Basic認証を有効化
- [ ] HTTPS接続を設定
- [ ] 強力なパスワードを設定
- [ ] PostgreSQLを外部公開しない
- [ ] ファイアウォール設定
- [ ] 定期的なバックアップ設定
- [ ] 定期的なバージョン更新

---

## 📊 Supabase連携

### Webhookエンドポイント

n8nのワークフローで以下のエンドポイントを使用：

```
POST https://n8n.yourdomain.com/webhook/<workflow-id>
```

### Supabase Database関数から呼び出す例

```sql
-- n8nにWebhookを送信
CREATE OR REPLACE FUNCTION trigger_n8n_workflow(workflow_id TEXT, payload JSON)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT content::JSON INTO result
  FROM http((
    'POST',
    'https://n8n.yourdomain.com/webhook/' || workflow_id,
    ARRAY[http_header('Content-Type', 'application/json')],
    'application/json',
    payload::TEXT
  )::http_request);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🔄 定期メンテナンス

### 月次チェック

```bash
# 1. 最新版の確認
docker pull n8nio/n8n:latest

# 2. バージョン比較
docker images | grep n8n

# 3. 更新が必要な場合
docker-compose down
docker-compose pull
docker-compose up -d

# 4. ログ確認
docker logs -f n8n
```

---

## 📚 参考リンク

- [n8n公式ドキュメント](https://docs.n8n.io/)
- [n8n Docker設定](https://docs.n8n.io/hosting/installation/docker/)
- [n8n セキュリティ](https://docs.n8n.io/hosting/security/)
- [CVE-2026-21858詳細](https://nvd.nist.gov/vuln/detail/CVE-2026-21858)

---

## ⚠️ トラブルシューティング

### バージョンが古い場合

```bash
# 古いイメージを削除
docker rmi n8nio/n8n:<old-version>

# 最新版を再取得
docker pull n8nio/n8n:latest

# 再起動
docker-compose up -d
```

### データベース接続エラー

```bash
# PostgreSQLログ確認
docker logs n8n-postgres

# 接続テスト
docker exec -it n8n-postgres psql -U n8n_user -d n8n
```

---

## 📝 補足

このガイドは **CVE-2026-21858** 脆弱性を考慮して作成されています。
導入時は必ず最新のセキュリティ情報を確認してください。

**作成日**: 2026-01-12  
**プロジェクト**: ai-consulting-zero
