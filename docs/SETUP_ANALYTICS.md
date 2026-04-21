# Analytics & Search Console セットアップ手順

## 1. Cloudflare Web Analytics

### 手順
1. https://dash.cloudflare.com/ → 対象アカウント → Web Analytics
2. 「Add a site」で `noviqlab.com` を追加
3. ドメインを入力、「Free」プランを選択
4. 生成される JavaScript Snippet から **token 文字列**（`data-cf-beacon` の token）をコピー
5. `E:\app\noviqlab\noviqlab-site\.env.local` に追記:
   ```
   NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN=あなたのトークン
   ```
6. Vercel ダッシュボードの環境変数にも同じトークンを設定
7. Vercel で再デプロイ（または次回の push で自動反映）

### 確認
- 本番サイトで DevTools を開き、Network タブで `beacon.min.js` が読み込まれていることを確認
- Cloudflare ダッシュボードで数分後にデータ表示されることを確認

---

## 2. Google Search Console

### 手順
1. https://search.google.com/search-console/ にアクセス
2. 「プロパティを追加」→「ドメイン」を選択
3. `noviqlab.com` を入力
4. 表示される TXT レコードの値をコピー
5. Cloudflare ダッシュボードで noviqlab.com → DNS
6. 「Add record」で TXT レコードを追加
   - Type: TXT
   - Name: @ (or noviqlab.com)
   - Content: Google から指定された値
   - TTL: Auto
7. Google Search Console に戻って「確認」をクリック
8. 所有権が確認されたら、サイドバーから「Sitemaps」を選択
9. サイトマップを送信: `https://www.noviqlab.com/sitemap.xml`

### 確認
- 数日後、インデックス登録されたページが Search Console に表示される
- 検索クエリレポートにデータが蓄積される（通常1〜2週間かかる）
