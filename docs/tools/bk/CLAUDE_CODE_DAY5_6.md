# ClaudeCode 実装指示: Day 5.6 - ナビゲーション日本語化とスクロール誘導拡充

**対象**: `E:\app\noviqlab\noviqlab-site`
**関連**: Day 5/5.5 完了後、パートナー（実ユーザー視点）からのフィードバック対応
- 「日本語サイトなのに英語のラベルやめて」
- 「セクション間にも誘導を入れろ」

**所要時間**: 15分
**前提**: Day 5.5 完了済み

**ゴール**:
日本語サイトとして一貫した UX に整える。

1. ヘッダーナビの英語を日本語に（`About` → `運営理念`、`Contact` → `お問い合わせ`）
2. About ページ内の英語表記を日本語に（パンくずリスト、メタタグ title）
3. 既存のヒーロー下スクロール誘導の文言を英語→日本語に
4. 主な活動セクション末尾に「ツールへ」誘導を追加
5. Tools セクション末尾に「問い合わせる」誘導を追加

**原則**:
- URL パス（`/about`、`#contact` 等）は変更しない（SEO・外部リンク・sitemap 影響を避けるため）
- あくまで**表示されるテキスト**のみの変更
- スクロール誘導のセクション間配置は**ヒーロー下より控えめなサイズ**で統一

---

## 0. 事前準備

```bash
cd E:\app\noviqlab\noviqlab-site
git log --oneline -3
git status
```

### 作業対象ファイル

- `app/page.tsx`（ヘッダーナビ・ヒーロー誘導文言変更・2箇所の誘導追加・各セクション id 付与）
- `app/about/page.tsx`（パンくずリスト日本語化）
- `app/about/layout.tsx`（メタタグ title 日本語化）

**変更しないもの**:
- URL パス（`/about` は維持）
- アンカー ID（`#contact` など）
- `app/globals.css`（Day 5.5 のアニメーション定義をそのまま利用）
- その他のビジネスロジック

---

## 1. 実装タスク

### Task 1: ヘッダーナビゲーションを日本語化（2分）

#### 1.1 `app/page.tsx` のヘッダーナビ

**変更前**:
```tsx
<nav className="flex items-center gap-6">
  <Link
    href="/about"
    className="text-sm text-slate-400 hover:text-white transition-colors"
  >
    About
  </Link>
  <Link
    href="/contact"
    className="text-sm text-slate-400 hover:text-white transition-colors"
  >
    Contact
  </Link>
</nav>
```

**変更後**:
```tsx
<nav className="flex items-center gap-6">
  <Link
    href="/about"
    className="text-sm text-slate-400 hover:text-white transition-colors"
  >
    運営理念
  </Link>
  <Link
    href="/contact"
    className="text-sm text-slate-400 hover:text-white transition-colors"
  >
    お問い合わせ
  </Link>
</nav>
```

**ポイント**:
- URL（`/about`、`/contact`）はそのまま
- 表示文言のみ変更

---

### Task 2: About ページのパンくずリストを日本語化（1分）

#### 2.1 `app/about/page.tsx` のパンくずリスト

**変更前**:
```tsx
<Breadcrumb items={[{ label: "NoviqLab", href: "/" }, { label: "About" }]} />
```

**変更後**:
```tsx
<Breadcrumb items={[{ label: "NoviqLab", href: "/" }, { label: "運営理念" }]} />
```

---

### Task 3: About ページのメタタグを日本語化（1分）

#### 3.1 `app/about/layout.tsx` のメタタグ

**変更前**:
```tsx
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
```

**変更後**:
```tsx
export const metadata: Metadata = {
  title: "運営理念",
  description:
    "Less, but better. NoviqLab は有志による少人数のチームで、ブラウザ内完結のプライバシー配慮型ツールを開発しています。",
  openGraph: {
    title: "運営理念 | NoviqLab",
    description:
      "Less, but better. NoviqLab は有志による少人数のチームで、ブラウザ内完結のプライバシー配慮型ツールを開発しています。",
    url: "https://www.noviqlab.com/about",
    siteName: "NoviqLab",
    type: "website",
  },
};
```

**ポイント**:
- `title` は `"運営理念"` 単独。親 layout の template `%s | NoviqLab` が自動で `"運営理念 | NoviqLab"` に整形してくれる
- `openGraph.title` は template が効かないので `"運営理念 | NoviqLab"` を明示

---

### Task 4: ヒーロー下の誘導文言を日本語化（2分）

既存のヒーロー下の誘導（Day 5.5 で追加したもの）の **`Scroll`** を **`下へスクロール`** に変更。

#### 4.1 `app/page.tsx` 内で探す

```tsx
<span className="text-xs font-mono tracking-widest uppercase">Scroll</span>
```

#### 4.2 変更後

```tsx
<span className="text-xs font-mono tracking-widest">下へスクロール</span>
```

**変更点**:
- `uppercase` を削除（日本語には不要）
- `Scroll` → `下へスクロール`

---

### Task 5: Tools セクションに id="tools" を付与（1分）

#### 5.1 探し方

`app/page.tsx` 内で「TOOLS」ヘッダーを持つセクションを探す。

#### 5.2 変更前

```tsx
<section className="max-w-4xl mx-auto px-6 py-16 w-full">
  <h2 className="font-mono text-xs text-slate-500 tracking-widest uppercase mb-10">
    TOOLS
  </h2>
  ...
</section>
```

#### 5.3 変更後

```tsx
<section id="tools" className="scroll-mt-8 max-w-4xl mx-auto px-6 py-16 w-full">
  <h2 className="font-mono text-xs text-slate-500 tracking-widest uppercase mb-10">
    TOOLS
  </h2>
  ...
</section>
```

`id="tools"` と `scroll-mt-8` を追加。

---

### Task 6: Contact セクションに id="contact" を付与（1分）

#### 6.1 探し方

`app/page.tsx` 内で「プロジェクトへのご相談・ご連絡はこちらから」や「お問い合わせ」ボタンを含むセクションを探す。

#### 6.2 変更後

既存の `<section>` タグに `id="contact"` と `scroll-mt-8` を追加:

```tsx
<section id="contact" className="scroll-mt-8 ...">
  ...
</section>
```

---

### Task 7: 「主な活動」セクション末尾に「ツールへ」誘導を追加（3分）

#### 7.1 追加位置

`app/page.tsx` の「主な活動」セクション（`<section id="activities" ...>`）の**閉じタグ直前**。

**構造イメージ**:
```tsx
<section id="activities" className="scroll-mt-8 ...">
  <h2 ...>主な活動</h2>
  <ul>
    {activities.map(...)}
  </ul>
  
  {/* ↓ ここに追加 ↓ */}
  
</section>
```

#### 7.2 追加コード

```tsx
{/* 次セクションへの誘導 */}
<div className="mt-12 mb-4 flex flex-col items-center">
  <a
    href="#tools"
    className="group flex flex-col items-center gap-2 text-slate-500 hover:text-sky-400 transition-colors"
    aria-label="ツールセクションへスクロール"
  >
    <span className="text-xs font-mono tracking-widest">ツールへ</span>
    <svg
      className="w-4 h-4 animate-bounce-slow"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 14l-7 7m0 0l-7-7m7 7V3"
      />
    </svg>
  </a>
</div>
```

**ポイント**:
- `mt-12 mb-4` でヒーロー下 (`mt-16 mb-8`) より控えめ
- アイコンサイズ `w-4 h-4`（ヒーロー下 `w-5 h-5` より小さめ）
- `tracking-widest` は維持（UI 一貫性）
- `aria-label` 付き

---

### Task 8: 「Tools」セクション末尾に「問い合わせる」誘導を追加（3分）

#### 8.1 追加位置

`<section id="tools" ...>` の**閉じタグ直前**。

**構造イメージ**:
```tsx
<section id="tools" className="scroll-mt-8 ...">
  <h2>TOOLS</h2>
  <p>ブラウザ内で完結する開発者向けユーティリティ。全て無料公開。</p>
  <div>
    <ToolCard ... />
  </div>
  
  {/* ↓ ここに追加 ↓ */}
  
</section>
```

#### 8.2 追加コード

```tsx
{/* 次セクションへの誘導 */}
<div className="mt-12 mb-4 flex flex-col items-center">
  <a
    href="#contact"
    className="group flex flex-col items-center gap-2 text-slate-500 hover:text-sky-400 transition-colors"
    aria-label="お問い合わせセクションへスクロール"
  >
    <span className="text-xs font-mono tracking-widest">問い合わせる</span>
    <svg
      className="w-4 h-4 animate-bounce-slow"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 14l-7 7m0 0l-7-7m7 7V3"
      />
    </svg>
  </a>
</div>
```

---

### Task 9: ビルド確認（2分）

```bash
npm run build
```

エラー・警告なしを確認。

---

### Task 10: 動作確認（5分）

#### 10.1 devサーバー起動

```bash
npm run dev -- --port 3100
```

#### 10.2 確認項目

**トップページ `http://localhost:3100/`**:
- [ ] ヘッダーに「運営理念」「お問い合わせ」のリンク（英語から変更）
- [ ] ヒーロー下に「下へスクロール」+ ↓矢印（`Scroll` から変更）
- [ ] 主な活動セクション末尾に「ツールへ」+ ↓矢印（新規追加、控えめサイズ）
- [ ] Tools セクション末尾に「問い合わせる」+ ↓矢印（新規追加、控えめサイズ）
- [ ] 各誘導クリックでスムーズスクロール:
  - 下へスクロール → 主な活動
  - ツールへ → Tools
  - 問い合わせる → Contact

**運営理念ページ `http://localhost:3100/about`**:
- [ ] パンくずリストが「NoviqLab / 運営理念」に変更
- [ ] ブラウザタブのタイトルが「運営理念 | NoviqLab」

**既存機能の退行テスト**:
- [ ] 「お問い合わせはこちら」ボタン（運営理念ページ内）が `/#contact` に遷移する
- [ ] シンプルモード、バッチモードが正常動作
- [ ] sitemap.xml、robots.txt が正常取得

---

## 2. 完了報告フォーマット

```markdown
## Day 5.6 完了報告

### 実装項目
- [x] Task 1: ヘッダーナビを日本語化（About → 運営理念、Contact → お問い合わせ）
- [x] Task 2: About ページパンくずリスト日本語化
- [x] Task 3: About ページメタタグ日本語化
- [x] Task 4: ヒーロー下誘導文言変更（Scroll → 下へスクロール）
- [x] Task 5: Tools セクションに id="tools" 付与
- [x] Task 6: Contact セクションに id="contact" 付与
- [x] Task 7: 主な活動セクション末尾に「ツールへ」誘導追加
- [x] Task 8: Tools セクション末尾に「問い合わせる」誘導追加
- [x] Task 9: npm run build 成功
- [x] Task 10: 動作確認

### 変更ファイル
- app/page.tsx（ヘッダーナビ、ヒーロー誘導、2セクションの id 付与、2つの誘導追加）
- app/about/page.tsx（パンくずリスト日本語化）
- app/about/layout.tsx（メタタグ日本語化）

### 動作確認結果
- [x] ナビゲーション全て日本語表示
- [x] 3箇所のスクロール誘導が期待通り動作
- [x] スムーズスクロール正常
- [x] 既存機能の退行なし
```

---

## 3. 禁止事項

### ❌ やってはいけないこと

- **URL パスの変更**（`/about` は維持、`/contact` も維持）
- **既存の本文テキスト変更**（「NoviqLab（ノヴィックラボ）は...」等は一切変えない）
- **About ページ内本文の変更**（Royさん推敲済み、Day 5 で確定）
- **ヒーローの `Less, but better.` 表示の変更**
- **Day 5.5 で定義した animate-bounce-slow の変更**
- **sitemap.xml / robots.txt / Cloudflare Analytics の破壊**

### ⚠️ 判断が必要な場合

- もし `/contact` ページが別途存在する場合:
  - ヘッダーの「お問い合わせ」リンク先は `/contact`（別ページ）のまま
  - Tools セクション末尾の「問い合わせる」誘導は `#contact`（トップページ内アンカー）
  - この2つは別物として扱う

### ✅ 品質基準

- TypeScript エラーなし
- ビルド成功
- スクロール誘導が期待通り動作
- モバイル表示でレイアウト崩れなし

---

**以上。Day 5.6 タスク開始してください。**

**重要ポイント**:
1. **URL パスは変更しない**（SEO 影響を避ける）
2. **表示文言のみ**日本語化
3. **既存の Day 5.5 のアニメーション定義はそのまま利用**
4. **セクション間の誘導は控えめサイズ**（ヒーロー下より小さく）
