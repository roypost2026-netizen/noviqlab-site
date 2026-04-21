# ClaudeCode 実装指示: Day 5.5 - スクロール誘導アイコン追加

**対象**: `E:\app\noviqlab\noviqlab-site`
**関連**: Day 5 完了後、「ファーストビューで下にコンテンツがあることが分からない」というパートナー（実ユーザー視点）からのフィードバック対応
**所要時間**: 10〜15分
**前提**: Day 5 完了済み

**ゴール**:
トップページのヒーロー下に、控えめな**スクロール誘導アイコン**を追加。訪問者が「下にスクロールすると何かある」と直感的に理解できるようにする。ただし、現状の「Less, but better.」という哲学を崩さない控えめな表現にする。

---

## 0. 事前準備

### 0.1 現状確認

```bash
cd E:\app\noviqlab\noviqlab-site
git log --oneline -3
git status
```

---

## 1. 実装方針

### 1.1 デザイン要件

- **控えめ**: 主張せず、ヒーローの余白の一部として存在
- **アニメーション**: ゆっくり上下にバウンス（「ここに注目」のサイン）
- **クリック可能**: クリックで `#activities` セクションにスムーズスクロール
- **モバイル対応**: 画面サイズに応じてサイズ調整

### 1.2 表示位置

ヒーローセクション（「NoviqLab（ノヴィックラボ）は…」の説明文）の**下**、区切り線の**上**に配置。

### 1.3 テキスト

下の小さい補助テキストは**英語・大文字**で「SCROLL」とだけ表示。日本語に比べてミニマルな見た目になる。

矢印アイコンは SVG（↓）で表現。

---

## 2. 実装タスク

### Task 1: `app/page.tsx` にスクロール誘導を追加（10分）

#### 1.1 実装箇所

既存のヒーローセクションの説明文（`NoviqLab（ノヴィックラボ）は...`）の**直後**、区切り線の**上**。

#### 1.2 既存コードの確認

まず `app/page.tsx` を view で確認し、以下のような構造を確認:

```tsx
<p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-2xl">
  NoviqLab（ノヴィックラボ）は、AI技術の活用・DX支援・システム開発を手がける日本のプロジェクトです。
</p>

{/* ↑ 直後に追加 */}

{/* ここから下、区切り線などの既存コード */}
```

#### 1.3 追加するコード

上記の説明文 `<p>` タグの**直後**に以下を追加:

```tsx
{/* スクロール誘導 */}
<div className="mt-16 mb-8 flex flex-col items-center">
  <a
    href="#activities"
    className="group flex flex-col items-center gap-2 text-slate-500 hover:text-sky-400 transition-colors"
    aria-label="下のセクションへスクロール"
  >
    <span className="text-xs font-mono tracking-widest uppercase">Scroll</span>
    <svg
      className="w-5 h-5 animate-bounce-slow"
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

#### 1.4 「主な活動」セクションに ID を付与

スクロール先として、既存の「主な活動」セクションに `id="activities"` を付与する。

**探し方**: `<section>` タグで「主な活動」や `activities` が記述されている箇所を探す。

**変更例**:

```tsx
{/* 変更前 */}
<section className="...">
  <p className="...">主な活動</p>
  ...
</section>

{/* 変更後 */}
<section id="activities" className="scroll-mt-8 ...">
  <p className="...">主な活動</p>
  ...
</section>
```

**ポイント**:
- `id="activities"` を追加
- `scroll-mt-8` でスクロール時のヘッダー分の余白を確保（ヘッダーの高さによっては `scroll-mt-16` など調整）

---

### Task 2: `animate-bounce-slow` アニメーション定義（3分）

Tailwind のデフォルト `animate-bounce` は少し速すぎるので、少しゆっくりした独自アニメーションを追加する。

#### 2.1 `app/globals.css` の修正

ファイル末尾（`@theme inline` ブロックなどの外）に以下を追加:

```css
@keyframes bounce-slow {
  0%, 100% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  50% {
    transform: translateY(8px);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
}

.animate-bounce-slow {
  animation: bounce-slow 2s infinite;
}
```

**ポイント**:
- 2秒周期のゆったりしたバウンス
- 8px の振幅（控えめ）
- 無限ループ

---

### Task 3: スムーズスクロールの適用（2分）

#### 3.1 `app/globals.css` の html セレクタに `scroll-behavior: smooth` を追加

**確認**: 既存の CSS に `html { ... }` セレクタがあるか確認。ない場合は追加。

```css
html {
  scroll-behavior: smooth;
}
```

既存のルールがある場合、その中に `scroll-behavior: smooth;` を追加するだけ。

**注意**: Tailwind v4 を使っている場合、`@layer base` 内に書くことを推奨。

---

### Task 4: ビルド確認（2分）

```bash
npm run build
```

エラー・警告なしを確認。

---

### Task 5: 動作確認（5分）

#### 5.1 devサーバー起動

```bash
npm run dev -- --port 3100
```

#### 5.2 確認項目

**トップページ `http://localhost:3100/`**:
- [ ] ヒーロー下（「NoviqLab（ノヴィックラボ）は...」の下）に **SCROLL** テキスト + **↓矢印** が表示
- [ ] 矢印が**ゆっくり上下にバウンス**している
- [ ] 矢印にマウスオーバーすると **sky-400 色**に変わる
- [ ] クリックすると **「主な活動」セクションに滑らかにスクロール** する
- [ ] スクロールがカクつかず、スムーズに動く

**モバイル表示確認**:
- DevTools でモバイルビュー（iPhone 14 等）に切り替え
- スクロール誘導が崩れていないか
- タップで正常にスクロールするか

---

## 3. 完了報告フォーマット

```markdown
## Day 5.5 完了報告

### 実装項目
- [x] Task 1: app/page.tsx にスクロール誘導を追加
  - ヒーロー下に SCROLL + ↓矢印 配置
  - 「主な活動」セクションに id="activities" 付与
- [x] Task 2: globals.css に animate-bounce-slow 定義
- [x] Task 3: globals.css にスムーズスクロール適用
- [x] Task 4: npm run build 成功
- [x] Task 5: 動作確認

### 変更ファイル
- app/page.tsx（スクロール誘導UI追加 + activities id 付与）
- app/globals.css（animate-bounce-slow + smooth scroll）

### 動作確認結果
- [x] スクロール誘導アイコン表示・バウンス動作
- [x] クリックで主な活動セクションにスムーズスクロール
- [x] ホバーで色変化
- [x] モバイル表示正常
```

---

## 4. 禁止事項

### ❌ やってはいけないこと

- **既存のヒーローコピーを変更しない**（「NoviqLab（ノヴィックラボ）は、AI技術の活用・DX支援・システム開発を手がける日本のプロジェクトです。」はそのまま）
- **「Less, but better.」の表示位置や装飾を変更しない**
- **ヘッダーやフッター、Tools セクションを変更しない**
- **About ページ、sitemap、robots、Cloudflare Analytics などの Day 5 成果物を破壊しない**

### ⚠️ 判断が必要な場合

- 既存の「主な活動」セクションが `<section>` 以外のタグで実装されている場合 → 適切な場所に `id="activities"` を付与
- `animate-bounce` で十分な場合 → 独自アニメーションを使わず Tailwind 標準で OK（判断はビルド後の見た目で）

### ✅ 品質基準

- TypeScript エラーなし
- ビルド成功
- スクロールアニメーションがカクつかない
- モバイルでも崩れない
- アクセシビリティ: `aria-label` 付与、キーボードでも操作可能

---

**以上。Day 5.5 タスク開始してください。**

軽いタスクですが、「控えめさ」と「ちゃんと気づく」の両立が大事です。
