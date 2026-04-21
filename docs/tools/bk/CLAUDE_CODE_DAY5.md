# ClaudeCode 実装指示: Day 5 - SEO・Analytics・理念ページ

**対象**: `E:\app\noviqlab\noviqlab-site`
**関連**: Phase 1 (Tools完成) + Phase 2 (UI統一 Day 4.6/4.7) 完了後のブランド構築フェーズ
**所要時間**: 1.5〜2時間（Royさんの手動作業=Cloudflare・GSC設定含まず）
**前提**:
- Day 4.7 完了済み
- NoviqLab トップページ既存（AI×DX×システム開発、主な活動5項目、Tools セクション）
- Cloudflare DNS 使用中

**ゴール**:
NoviqLab を「**Less, but better.** を掲げるブランド」として確立する。SEO 対応・プライバシー配慮型アクセス解析導入・理念ページ新設を一括で行う。

---

## 0. 事前準備

### 0.1 現状確認

```bash
cd E:\app\noviqlab\noviqlab-site
git log --oneline -5
git status
```

Phase 1.5 の UI統一コミット（Day 4.6/4.7）がプッシュ済みであること。

### 0.2 作業対象ファイル

**新規作成**:
- `app/about/page.tsx` — 理念ページ
- `app/about/layout.tsx` — About セクション用レイアウト（メタタグ）
- `app/sitemap.ts` — サイトマップ自動生成
- `app/robots.ts` — robots.txt 自動生成
- `components/CloudflareAnalytics.tsx` — Cloudflare Web Analytics 組み込み

**修正**:
- `app/page.tsx` — トップページ（「Less, but better.」追加、Tools カードから AVIF 削除、フッター刷新）
- `app/layout.tsx` — Cloudflare Analytics 組み込み、メタタグ強化
- `components/Header.tsx` or ヘッダー部分 — `About` ナビリンク追加
- `app/tools/image-resizer/page.tsx` or layout.tsx — メタタグ強化

**変更しないもの**:
- `app/tools/image-resizer/` 配下のツール本体（SimpleMode, BatchMode など）
- `app/tools/page.tsx`（Tools 一覧、既に存在する場合）
- ビジネスロジック全般

---

## 1. 全体方針

### 1.1 NoviqLab のブランドポリシー

この Day 5 の実装は、以下のブランドポリシーを貫く。

- **Tools ページ**: トラッカー一切なし・プライバシー最優先
- **それ以外**: Cloudflare Web Analytics（Cookie/IPトラッキングなし）のみ使用
- **Google Analytics / Meta Pixel**: 現時点では全ページで使用しない
- **理念**: 「Less, but better.」を前面に、有志チームによる開発体制を示す

### 1.2 Cloudflare Web Analytics を選ぶ理由

- Cookie を使用しない
- IP アドレスを記録しない
- GDPR / 個人情報保護法に完全対応
- 「ツールはブラウザ内完結」宣言と矛盾しない
- 設定簡単、既存 Cloudflare 契約で無料

---

## 2. 実装タスク

### Task 1: 理念ページ `/about` の新規作成（30分）

#### 1.1 `app/about/page.tsx` を新規作成

**以下の本文を一字一句変えずにそのまま実装すること。** Royさんが推敲済みの文章。

```tsx
import Breadcrumb from "@/components/tools/Breadcrumb";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#0a1628] text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Breadcrumb items={[{ label: "NoviqLab", href: "/" }, { label: "About" }]} />

        {/* ヒーロー */}
        <section className="mt-10 mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">NoviqLab について</h1>
          <p className="text-2xl md:text-3xl text-sky-400 font-semibold italic">
            Less, but better.
          </p>
          <p className="text-base text-white/70 mt-4 leading-relaxed">
            NoviqLab のツールは、機能の多さを競いません。
            <br />
            そのかわり、<strong className="text-white/90">一つひとつの機能を、深く考えて作っています</strong>。
          </p>
        </section>

        <hr className="border-white/10 my-12" />

        {/* 私たちについて */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">私たちについて</h2>
          <p className="text-base text-white/80 leading-relaxed">
            NoviqLab は、有志による少人数のチームで開発・運営しています。
            <br />
            大企業のような組織構造はなく、日々の実務感覚を持ったメンバーが、
            <strong className="text-white/95">自分たちが本当に使いたい道具</strong>を形にしています。
          </p>
        </section>

        <hr className="border-white/10 my-12" />

        {/* なぜ NoviqLab を始めたか */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">なぜ NoviqLab を始めたか</h2>
          <p className="text-base text-white/80 leading-relaxed mb-4">
            きっかけはとてもシンプルでした。
            <br />
            「自分たちが毎日使うツールを、自分たちが気に入る形で作りたい」。
            <br />
            ただそれだけです。
          </p>
          <p className="text-base text-white/80 leading-relaxed">
            でも「自分たちのため」に作っていたら、自然とこだわりが出てきました。
            <br />
            そのこだわりを、少しだけ言葉にしてみます。
          </p>
        </section>

        <hr className="border-white/10 my-12" />

        {/* ツール開発で大切にしていること */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">ツール開発で大切にしていること</h2>
          <p className="text-base text-white/80 leading-relaxed mb-8">
            NoviqLab の各ツールは、以下の考え方で作られています。
          </p>

          <div className="space-y-10">
            <div>
              <h3 className="text-xl font-bold mb-3">説明書を読まなくても使える</h3>
              <p className="text-base text-white/80 leading-relaxed mb-3">
                良いツールには、使い方の説明はほとんど必要ないはずです。
                <br />
                画面を見て、触って、わかる。
                <br />
                私たちはそれを理想だと考えています。
              </p>
              <p className="text-base text-white/80 leading-relaxed mb-3">
                もちろん、仕組みを詳しく知りたい方もいます。
                <br />
                そのため、NoviqLab のツールには「使い方」というリンクを目立たない場所に置いています。
              </p>
              <div className="bg-white/5 border-l-2 border-sky-400 pl-4 py-2 my-4">
                <p className="text-base text-white/90 leading-relaxed">
                  <strong>知りたい人だけが、掘り下げられる。</strong>
                  <br />
                  <strong>知りたくない人には、見えない。</strong>
                </p>
              </div>
              <p className="text-base text-white/80 leading-relaxed">
                この「階層」こそが、シンプルさと親切さを両立する方法だと信じています。
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-3">機能を足すより、削ることを先に考える</h3>
              <p className="text-base text-white/80 leading-relaxed mb-3">
                ツールに機能を追加するのは、とても簡単です。
                <br />
                でも、使う人にとって「選択肢が増える」ことは、必ずしも嬉しいことではありません。
                <br />
                迷う時間、探す時間、学ぶ時間。それらは確実に増えます。
              </p>
              <p className="text-base text-white/80 leading-relaxed mb-3">
                だから、新しい機能を作るたびに自問しています。
                <br />
                「これは本当に必要か？ 別の方法で解決できないか？」
              </p>
              <p className="text-base text-white/80 leading-relaxed">
                <strong className="text-white/95">
                  「作らない」という判断が、最も勇気のいる設計判断
                </strong>
                だと考えています。
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-3">ツール利用時、使う人を追跡しない</h3>
              <p className="text-base text-white/80 leading-relaxed mb-3">
                Web 上には、画像をアップロードした瞬間にサーバーに送られたり、
                クリックするたびに広告企業にデータが送られたりするツールがたくさんあります。
              </p>
              <p className="text-base text-white/80 leading-relaxed mb-3">
                私たちはそういうツールを使いたくありません。
                <br />
                だから、NoviqLab の<strong className="text-white/95">ツールページ</strong>にはそれらを一切入れていません。
              </p>
              <p className="text-base text-white/80 leading-relaxed">
                自分たちが使いたくないものを、他の人に使わせるわけにはいかない。
                <br />
                それは当たり前のことだと思っています。
              </p>
            </div>
          </div>
        </section>

        <hr className="border-white/10 my-12" />

        {/* プライバシー方針 (id="privacy" でアンカー対応) */}
        <section className="mb-12" id="privacy">
          <h2 className="text-2xl font-bold mb-4">ツール利用時のプライバシー方針</h2>
          <p className="text-base text-white/80 leading-relaxed mb-6">
            NoviqLab の<strong className="text-white/95">各種ツール（/tools 配下）</strong>では、以下のポリシーを
            <strong className="text-white/95">例外なく</strong>守っています。
          </p>

          <ul className="space-y-6">
            <li className="bg-white/5 rounded-xl p-5">
              <p className="text-lg font-bold mb-2">🔒 画像や入力データはサーバーに送信されません</p>
              <p className="text-base text-white/80 leading-relaxed">
                すべての処理はお使いのブラウザ内で完結します。
              </p>
            </li>
            <li className="bg-white/5 rounded-xl p-5">
              <p className="text-lg font-bold mb-2">🚫 ツール利用時に追跡 Cookie は使用していません</p>
              <p className="text-base text-white/80 leading-relaxed">
                ログインも、ユーザー識別もありません。
              </p>
            </li>
            <li className="bg-white/5 rounded-xl p-5">
              <p className="text-lg font-bold mb-2">
                ⛔ ツールページでは Google Analytics / Meta Pixel などのトラッカーを一切読み込みません
              </p>
              <p className="text-base text-white/80 leading-relaxed">
                データ収集の有無を、ページを開くだけで DevTools で確認できます。
              </p>
            </li>
          </ul>

          <p className="text-base text-white/70 leading-relaxed mt-6 italic">
            これは法律上の義務ではありません。
            <br />
            ただ、<strong className="text-white/85">自分たちが使いたいツールの条件</strong>
            として、私たちがそう決めているだけです。
          </p>
        </section>

        <hr className="border-white/10 my-12" />

        {/* サイト全体の運営について */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">サイト全体の運営について</h2>
          <p className="text-base text-white/80 leading-relaxed mb-4">
            ツールページ以外（トップページ、お知らせ、ブログ等）では、
            将来的にアクセス解析や広告機能を導入する可能性があります。
            <br />
            その場合は、このページで明示的にお知らせします。
          </p>
          <p className="text-base text-white/80 leading-relaxed">
            ただし、<strong className="text-white/95">ツールページそのものには影響させません</strong>。
            <br />
            上記のプライバシー方針は、NoviqLab のツールを使う限り、変わりません。
          </p>
          <div className="mt-6 bg-sky-500/10 border border-sky-400/20 rounded-xl p-4">
            <p className="text-sm text-white/80 leading-relaxed">
              <strong className="text-sky-300">現在のアクセス解析状況:</strong>
              <br />
              サイト全体で Cloudflare Web Analytics を使用しています。
              Cookie や IP アドレスは記録されません。
            </p>
          </div>
        </section>

        <hr className="border-white/10 my-12" />

        {/* これから */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">これから</h2>
          <p className="text-base text-white/80 leading-relaxed mb-4">
            NoviqLab はまだ始まったばかりのプロジェクトです。
            <br />
            少しずつツールを増やしながら、試行錯誤の記録を共有していきます。
          </p>
          <p className="text-base text-white/80 leading-relaxed mb-4">
            多機能だけれど誰にも最適化されていないものより、
            <br />
            <strong className="text-white/95">シンプルだけれど本当に使える道具</strong>を届けていきたいと思っています。
          </p>
          <p className="text-base text-white/80 leading-relaxed">
            気になる点や、こうだったら嬉しいという要望があれば、
            <br />
            ぜひお気軽にご連絡ください。
          </p>
        </section>

        {/* Contact */}
        <section className="mb-12 text-center">
          <a
            href="/#contact"
            className="inline-block bg-sky-500 hover:bg-sky-400 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            お問い合わせはこちら
          </a>
        </section>

        {/* フッター帯 */}
        <hr className="border-white/10 my-12" />
        <p className="text-center text-sm text-white/40 italic">
          NoviqLab · Tokyo · 2026
        </p>
      </div>
    </main>
  );
}
```

#### 1.2 `app/about/layout.tsx` を新規作成（メタタグ用）

```tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | NoviqLab",
  description:
    "Less, but better. NoviqLab は有志による少人数のチームで、ブラウザ内完結のプライバシー配慮型ツールを開発しています。",
  openGraph: {
    title: "About | NoviqLab",
    description:
      "Less, but better. NoviqLab は有志による少人数のチームで、ブラウザ内完結のプライバシー配慮型ツールを開発しています。",
    url: "https://www.noviqlab.com/about",
    siteName: "NoviqLab",
    type: "website",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

---

### Task 2: トップページ改修（15分）

#### 2.1 「Less, but better.」追加

既存の `app/page.tsx` を編集。ヒーロー部分の「AI × DX × システム開発」見出しの**直下**に以下を追加:

```tsx
{/* ヒーローの既存の h1 の下に追加 */}
<p className="text-lg md:text-xl text-sky-400 font-semibold italic mt-3 mb-4">
  Less, but better.
</p>
```

※ 既存の h1 や説明文の直前・直後関係を壊さないように、既存の構造を **view** でしっかり確認してから追加すること。

#### 2.2 Tools カードから AVIF 削除

Tools セクションの Image Converter カードから `AVIF` バッジを削除する。

**探し方**: `PNG / JPEG / WebP / AVIF` のような4つのバッジが並んでいる箇所を探し、`AVIF` だけを削除。

**期待される変更後**:
```
[PNG] [JPEG] [WebP]  [開く →]
```

#### 2.3 ヘッダーに About ナビリンク追加

既存のヘッダー（おそらく `components/Header.tsx` または `app/layout.tsx` 内）で、現状 `Contact` リンクだけが右上にある。その **左隣に `About` リンク**を追加。

```tsx
<nav className="flex items-center gap-6">
  <a href="/about" className="text-white/70 hover:text-white transition-colors">
    About
  </a>
  <a href="/#contact" className="text-white/70 hover:text-white transition-colors">
    Contact
  </a>
</nav>
```

※ 既存の Contact リンクのスタイルクラスに合わせる。

#### 2.4 フッターにプライバシー簡易メッセージ

`© 2026 NoviqLab` の**上**に、プライバシー簡易メッセージを追加:

```tsx
<div className="mt-12 pt-6 border-t border-white/10">
  <p className="text-sm text-white/60 text-center leading-relaxed mb-2">
    🔒 NoviqLab のツールは、アップロードデータをサーバーに送信しません。
  </p>
  <p className="text-xs text-white/40 text-center">
    <a href="/about#privacy" className="underline hover:text-sky-400 transition-colors">
      プライバシー方針について
    </a>
  </p>
</div>

{/* 既存の © 2026 NoviqLab */}
<p className="text-center text-xs text-white/30 mt-6">© 2026 NoviqLab</p>
```

---

### Task 3: sitemap.xml 自動生成（5分）

#### 3.1 `app/sitemap.ts` を新規作成

```tsx
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.noviqlab.com";
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tools/image-resizer`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
```

※ Next.js App Router 標準機能。ビルド時に `/sitemap.xml` で自動配信される。

---

### Task 4: robots.txt 設定（3分）

#### 4.1 `app/robots.ts` を新規作成

```tsx
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: "https://www.noviqlab.com/sitemap.xml",
  };
}
```

---

### Task 5: Cloudflare Web Analytics 組み込み（15分）

#### 5.1 `components/CloudflareAnalytics.tsx` を新規作成

```tsx
"use client";

import Script from "next/script";

export default function CloudflareAnalytics() {
  const token = process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN;

  if (!token) return null;

  return (
    <Script
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={`{"token": "${token}"}`}
      strategy="afterInteractive"
      defer
    />
  );
}
```

#### 5.2 `app/layout.tsx` を修正

既存の `<body>` タグ内に `CloudflareAnalytics` コンポーネントを追加:

```tsx
import CloudflareAnalytics from "@/components/CloudflareAnalytics";

// ...

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="...">
        {children}
        <CloudflareAnalytics />
      </body>
    </html>
  );
}
```

#### 5.3 `.env.local` へのトークン設定手順を記載

`.env.example` を確認し、以下を追加（存在しなければ作成）:

```
# Cloudflare Web Analytics (optional)
# Get your token from https://dash.cloudflare.com/?to=/:account/web-analytics
NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN=
```

`.env.local` にはトークンを設定（Royさんが Cloudflare ダッシュボードから取得）。

`.env.local` は `.gitignore` に含まれていることを確認。

---

### Task 6: メタタグ強化（10分）

#### 6.1 `app/layout.tsx` のデフォルトメタタグ強化

既存の `metadata` を以下で上書き（値をマージ）:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.noviqlab.com"),
  title: {
    default: "NoviqLab — AI × DX × システム開発",
    template: "%s | NoviqLab",
  },
  description:
    "NoviqLab（ノヴィックラボ）は、AI技術の活用・DX支援・システム開発を手がける有志チーム。Less, but better. ブラウザ内で完結するプライバシー配慮型ツールを公開中。",
  keywords: [
    "AI",
    "DX",
    "システム開発",
    "画像変換",
    "画像リサイズ",
    "プライバシー",
    "Web制作",
    "NoviqLab",
  ],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://www.noviqlab.com",
    title: "NoviqLab — AI × DX × システム開発",
    description:
      "Less, but better. ブラウザ内で完結するプライバシー配慮型ツールを公開中。",
    siteName: "NoviqLab",
  },
  twitter: {
    card: "summary_large_image",
    title: "NoviqLab — AI × DX × システム開発",
    description:
      "Less, but better. ブラウザ内で完結するプライバシー配慮型ツールを公開中。",
  },
  robots: {
    index: true,
    follow: true,
  },
};
```

#### 6.2 `app/tools/image-resizer/layout.tsx` のメタタグ強化

既存の layout.tsx に以下を追加（または既存 metadata を上書き）:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Image Converter",
  description:
    "ブラウザ内で完結する画像リサイズ・形式変換ツール。サーバー送信なし、個人情報自動削除。PNG / JPEG / WebP 対応。Web制作バッチモードで複数サイズ一括生成も可能。",
  openGraph: {
    title: "Image Converter | NoviqLab",
    description:
      "ブラウザ内で完結する画像リサイズ・形式変換ツール。サーバー送信なし、個人情報自動削除。",
    url: "https://www.noviqlab.com/tools/image-resizer",
  },
};

export default function ImageResizerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

---

### Task 7: ビルド確認（3分）

```bash
npm run build
```

エラー・警告なしを確認。

生成物の確認:
- `/sitemap.xml` が生成されることを確認（ビルドログで確認可能）
- `/robots.txt` が生成されることを確認

---

### Task 8: 動作確認（15分）

#### 8.1 devサーバー起動

```bash
npm run dev -- --port 3100
```

#### 8.2 確認項目

**トップページ `http://localhost:3100/`**:
- [ ] 「AI × DX × システム開発」の下に `Less, but better.` が表示されている
- [ ] ヘッダーに `About` リンクがある
- [ ] Tools カードのバッジが `PNG / JPEG / WebP` のみ（AVIF なし）
- [ ] フッターに「🔒 NoviqLab のツールは...」メッセージが表示
- [ ] フッターの「プライバシー方針について」リンクが `/about#privacy` に飛ぶ

**About ページ `http://localhost:3100/about`**:
- [ ] ページが開く
- [ ] ヒーローに「Less, but better.」表示
- [ ] 全セクションが表示されている
- [ ] `/about#privacy` でプライバシーセクションに飛ぶ
- [ ] Contact リンクがトップページに遷移する

**SEO ファイル**:
- [ ] `http://localhost:3100/sitemap.xml` が表示される（XML が返る）
- [ ] `http://localhost:3100/robots.txt` が表示される

**Tools ページ `http://localhost:3100/tools/image-resizer`**:
- [ ] 正常に動作する（メタタグが変わっても機能影響なし）
- [ ] ヘッダーに About リンクが表示されている

**Cloudflare Analytics**:
- [ ] `.env.local` にトークン設定前: `<script>` が出力されない
- [ ] トークン設定後: `<script>` が `<body>` 末尾に挿入される
- [ ] DevTools で `static.cloudflareinsights.com/beacon.min.js` が読み込まれる

---

### Task 9: Royさん手動作業手順のドキュメント化（5分）

プロジェクトに `docs/SETUP_ANALYTICS.md` を新規作成（新規でない場合は追記）。内容は Royさん向け手順書:

```markdown
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
```

---

## 3. 完了報告フォーマット

```markdown
## Day 5 完了報告

### 実装項目
- [x] Task 1: /about ページ新規作成（理念文書、プライバシー方針含む）
- [x] Task 2: トップページ改修
  - 「Less, but better.」をヒーロー下に追加
  - Tools カードから AVIF バッジ削除
  - ヘッダーに About ナビリンク追加
  - フッターにプライバシー簡易メッセージ
- [x] Task 3: app/sitemap.ts 新規作成
- [x] Task 4: app/robots.ts 新規作成
- [x] Task 5: Cloudflare Web Analytics 組み込み
  - components/CloudflareAnalytics.tsx 新規作成
  - app/layout.tsx に組み込み
  - .env.example にトークン記載例
- [x] Task 6: メタタグ強化（トップ、About、image-resizer）
- [x] Task 7: ビルド成功（sitemap.xml / robots.txt 生成確認）
- [x] Task 8: 動作確認
- [x] Task 9: docs/SETUP_ANALYTICS.md 作成

### 退行テスト結果
- [x] シンプルモード / バッチモード 正常動作
- [x] トップページ 既存機能正常
- [x] Contact ボタン正常

### 変更ファイル
新規:
- app/about/page.tsx
- app/about/layout.tsx
- app/sitemap.ts
- app/robots.ts
- components/CloudflareAnalytics.tsx
- docs/SETUP_ANALYTICS.md

修正:
- app/page.tsx（ヒーロー、Tools カード、フッター）
- app/layout.tsx（メタタグ、Analytics 組み込み）
- ヘッダーコンポーネント（About ナビリンク追加）
- app/tools/image-resizer/layout.tsx（メタタグ強化）
- .env.example（トークン記載例、新規作成の場合もあり）

### Royさん手動作業（別途）
- Cloudflare Web Analytics トークン取得 → .env.local / Vercel 環境変数 設定
- Google Search Console で所有権確認（Cloudflare DNS TXT レコード）
- Search Console に sitemap.xml 送信
```

---

## 4. 禁止事項

### ❌ やってはいけないこと

- **About ページの本文テキスト改変**（Royさん推敲済み、一字も変えない）
- **Tools ページ（/tools/image-resizer）内への Cloudflare Analytics 等の組み込み**
  - → `app/layout.tsx` に組み込んだ時点で全ページに適用されるが、Tools 本体（SimpleMode.tsx / BatchMode.tsx）内にトラッキング系処理を一切追加しないこと
  - **Cloudflare Analytics は全ページ対象**（Cookie不使用なので許容範囲）だが、**個別のユーザー行動トラッキング（クリックイベント収集等）は絶対に追加しない**
- **Google Analytics / Meta Pixel の組み込み**
- **ビジネスロジック変更**
- **Tools の既存挙動を壊す変更**
- **モバイル対応を後回しにする**（About ページはレスポンシブ必須）

### ⚠️ 判断が必要な場合

- 既存のヘッダー構造が想定と大きく違う場合 → 現状把握して報告
- トップページのヒーロー構造が想定と違う場合 → 現状把握して報告
- Breadcrumb コンポーネントの参照パスが異なる場合 → 正しいパスを確認して修正

### ✅ 品質基準

- TypeScript strict エラーなし
- ビルド成功（`next build`）
- sitemap.xml / robots.txt 正常生成
- 既存機能の退行なし
- About ページがモバイルで崩れない
- Cloudflare Analytics トークン未設定時もエラーにならない（`if (!token) return null`）

---

**以上。Day 5 タスク開始してください。**

**最重要ポイント**:
1. About ページの本文は**一字一句変えない**（Royさん推敲済み）
2. Tools ページには**個別トラッキング処理を追加しない**（ブランドポリシー）
3. 既存のトップページ構造を破壊せず、必要な部分だけ追加する
