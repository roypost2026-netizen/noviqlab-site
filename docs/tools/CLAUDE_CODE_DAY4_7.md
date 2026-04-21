# ClaudeCode 実装指示: Day 4.7 - バッチモードへの説明文追加

**対象**: `E:\app\noviqlab\noviqlab-site`
**関連**: Day 4.6 完了後、シンプルモードと同じ UI 設計思想をバッチモードにも適用する。
**所要時間**: 45〜60分
**前提**:
- Day 4.6 + UX-08改 完了済み
- シンプルモードに `UsageToggle` / `IntroToggle` が実装済み
- バッチモードはまだ説明文なし

**ゴール**:
バッチモードの6つの重要ポイントに [使い方] / [このモードについて] などの控えめなトグルリンクを追加し、**クリックした人だけが説明を見られる**設計で統一する（Jobs イズムの一貫性）。

---

## 0. 事前準備

### 0.1 現状確認

```bash
cd E:\app\noviqlab\noviqlab-site
git log --oneline -3
git status
```

### 0.2 作業対象ファイル

- `app/tools/image-resizer/descriptions.ts`（説明文追加）
- `app/tools/image-resizer/BatchMode.tsx`（説明UI統合）
- `app/tools/image-resizer/ProfileEditor.tsx`（モーダル内の説明UI統合）

**変更しないもの**:
- `UsageToggle.tsx` / `IntroToggle.tsx` / `InfoAccordion.tsx`（そのまま利用）
- `SimpleMode.tsx`（変更不要）
- ビジネスロジック（types.ts / imageProcessor.ts / builtinPresets.ts）

---

## 1. 全体方針

### 1.1 デフォルト表示（変更なし）

バッチモードのデフォルト表示は**現状のまま**。プロファイル一覧、画像割り当てエリア、各ボタンが見えるだけ。

### 1.2 説明トグルの配置（6箇所）

```
[シンプル] [Web制作バッチ]

[このモードについて ▼]  ← ①

                                    [+プロファイル追加] [プリセット読込 ▼] [プリセットの選び方 ▼]  ← ⑤

バッチプロファイル  [プロファイルとは? ▼]  ← ②
┌─ プロファイルカード ──────────────┐
│ ...                               │
└───────────────────────────────────┘

[プロファイルをJSONで保存] [JSONから読み込み] [使い方 ▼]  ← ⑥

画像を割り当てて生成  [使い方 ▼]  ← ③
┌─ 画像割当カード ──────────────────┐
│ ...                               │
└───────────────────────────────────┘

[全て生成（N ファイル）]
```

プロファイル編集モーダル内: **[バリアントと容量範囲について ▼]**  ← ④（バリアント欄の上）

### 1.3 各トグルの実装方式

- **ページ冒頭 ①**: `IntroToggle` を使用（シンプルモードと同じスタイル）
- **②③④⑤⑥**: `UsageToggle` を使用（ラベルと本文を紐付けるパターン）

ただし、`UsageToggle` は「ラベル」「ボタン」「children」の構造なので、場所によってはカスタマイズが必要。詳細は Task で説明。

---

## 2. 実装タスク

### Task 1: descriptions.ts にバッチモード用のエントリを追加（15分）

既存の `DESCRIPTIONS` オブジェクトに `batch` キーを追加する。

#### 1.1 追加するエントリ

`descriptions.ts` の末尾付近に以下を追加:

```typescript
export const DESCRIPTIONS = {
  // 既存のエントリ（intro, privacy, outputFormat, quality, bgColor, resize, preset, adjust, dropzone）
  // ...
  
  // ↓↓ ここから追加 ↓↓
  batch: {
    intro: {
      simple: `🎨 複数の画像を、決まったルールで一気にまとめて変換するモードです。

たとえば「Webサイト用の画像を12枚、それぞれPC用とスマホ用の2サイズで作る」
といった作業を、ボタン一発で全部終わらせられます。

一度作ったルール（プロファイル）は保存できるので、
次の案件でも同じルールを使い回せます。`,
      technical: `このモードはテンプレート駆動の画像変換エンジンです。

シンプルモードが「1枚ずつ手動で設定して変換」するのに対し、
バッチモードでは「プロファイル」という変換ルールを事前に定義し、
そのルールに画像を流し込んで一括処理します。

1プロファイル内には「バリアント」という複数の出力パターンを定義でき、
さらに各プロファイルに複数画像を割り当てられるので、
たとえば「4枚の画像 × 2サイズ × 3プロファイル = 24ファイル」のような
複雑な納品パッケージも1回の操作で生成できます。

プロファイル構成は JSON 形式で保存・読み込みができるので、
一度作れば次回からはテンプレートとして再利用可能です。`,
    },
    profile: {
      simple: `📋 プロファイルとは「変換ルールのひな形」のことです。

たとえば「このサイトのヒーロー画像は必ず16:9、1600×900px、200-300KBの範囲で作る」
というルールを登録しておけば、あとは画像を割り当てるだけで一気に変換できます。

上の「+ プロファイル追加」でゼロから作るか、
「プリセット読み込み」で用意された設定から選んで始められます。`,
      technical: `プロファイルは以下の要素で構成されます:

- プロファイル名 / ベースファイル名（出力ファイル名の土台）
- 比率（16:9 / 3:2 / 1:1 / カスタム）
- クロップ位置（中央 / 上 / 下）
- 出力形式（JPEG / PNG / WebP / AVIF）
- sRGB変換フラグ・メタデータ削除フラグ
- バリアント配列（複数サイズの出力設定）

各バリアントには、幅・高さ・容量下限・容量上限・サフィックスが設定され、
出力時は「ベースファイル名 + 画像サフィックス + バリアントサフィックス」
という組み合わせでファイル名が決定されます。

例: baseFilename="hero", 画像suffix="-a", バリアントsuffix="@2x"
→ hero-a@2x.jpg`,
    },
    imageAssign: {
      simple: `🖼 各プロファイルに画像をドロップして、まとめて変換するエリアです。

1つのプロファイルに何枚でも画像を追加できます。
複数枚ドロップすると、自動で -a / -b / -c / -d のように
識別用のサフィックスが付きます（後から自由に書き換え可能）。

全プロファイルへの画像割り当てが終わったら、
下の「全て生成」ボタンで一気に処理されます。`,
      technical: `画像追加時のサフィックス自動割当ロジック:

1. 既存の suffix を Set として収集
2. -a, -b, ..., -z の順に未使用のものを検索
3. アルファベットが枯渇したら -img1, -img2, ... にフォールバック

ユーザーが手動で suffix を変更した場合、重複検知が働き、
同一プロファイル内で同じ suffix が2つ以上あると
「全て生成」ボタンは無効化されます。
これは出力ファイル名の衝突を防ぐための仕様です。

1枚運用（profile.jpg のような）の場合は、suffix を手動で
空にすることでサフィックスなしの出力が可能です。`,
    },
    variant: {
      simple: `📐 「バリアント」とは、同じ画像を複数サイズで出力する設定のことです。

たとえば「PC用（@2x）」と「スマホ用」の2つのバリアントを設定すれば、
1枚の元画像から2種類のサイズの画像が自動で作られます。

「容量下限 / 上限」を設定すると、画質を自動調整して
その範囲に収まるようにファイルサイズを最適化します。
「迷ったら容量範囲は空欄のままでOK」。その場合は画質85で固定されます。`,
      technical: `容量範囲最適化の内部処理:

- 両方空欄: 品質0.85で固定エンコード
- 上限のみ: 二分探索で上限以下の最高品質を探索
- 下限のみ: 品質0.85→0.90→0.95→1.0と試行、下限を超えた時点で確定
- 範囲指定: 上限以下の最高品質を探索、下限未満なら「容量不足」警告

バリアントのサフィックスは "@2x" や "_mobile" など自由。
空文字を指定すれば、ベースファイル名だけのファイル名で出力されます
（例: profile.jpg / hero.jpg など、1サイズ運用時に活用）。

幅のみ入力して保存すると、プロファイルの比率から
高さが自動計算されます（Day 4 で追加された UX 改善）。`,
    },
    presetGuide: {
      simple: `🎁 よくあるWeb制作のパターンを、すぐに使える状態で用意しています。

・Web制作・ヒーロー用: トップページの大きな横長画像向け（16:9）
・Web制作・コンテンツ用: 記事内や商品紹介用（3:2）
・Web制作・プロフィール: スタッフ・顔写真向け（1:1）
・ブログ記事用: ブログのアイキャッチ画像向け（16:9 / WebP）
・EC商品写真: ECサイトの商品画像向け（1:1、大サムネ2種）
・OGP / SNS: SNSで記事リンクを貼った時のプレビュー画像（1200×630）

プリセットを選ぶと、その設定でプロファイルが追加されます。
追加後に「編集」から自由に調整できるので、「まず近いものを選んで後から微調整」
という使い方がおすすめです。`,
      technical: `各プリセットは builtinPresets.ts に定義されており、以下の仕様になっています:

プリセット | 比率 | @2x | mobile
ヒーロー用 | 16:9 | 1600×900, 200-300KB | 800×450, 80-120KB
コンテンツ用 | 3:2 | 1200×800, 150-200KB | 600×400, 60-90KB
プロフィール | 1:1 | 600×600, 50-80KB | -
ブログ | 16:9 (WebP) | 1600×900, 150-250KB | 800×450, 60-100KB
EC商品 | 1:1 | 1200×1200, 200-400KB | 300×300 (thumb), 20-50KB
OGP/SNS | (1200×630) | 1200×630, 150-250KB | -

プリセット由来のプロファイル名のうち、content / blog / product / ogp は
抽象的すぎるため、実案件では必ず具体的な名前に変更することをおすすめします
（💡 警告バナーが表示されます）。

hero / profile はそのまま実用的な命名なので警告対象外です。`,
    },
    jsonIO: {
      simple: `💾 作ったプロファイル構成を、JSONファイルとして保存・読み込みできます。

「プロファイルをJSONで保存」をクリックすると、
現在登録されている全プロファイルの設定が1つのJSONファイルとしてダウンロードされます。

次回、「JSONから読み込み」で同じファイルを選べば、プロファイル構成が一瞬で復元されます。
（ただし画像の割り当て状態は保存されないので、画像は毎回ドロップし直す必要があります）

案件ごとにJSONファイルを作っておけば、同じクライアントから追加案件が来た時に
「前回と同じ仕様で」を秒で再現できます。`,
      technical: `JSON スキーマ（v2.0）:

{
  "version": "2.0",
  "profiles": [
    {
      "id": "uuid",
      "name": "hero",
      "displayName": "ヒーロー画像",
      "baseFilename": "hero",
      "aspectRatio": { "type": "preset", "value": "16:9" },
      "cropPosition": "center",
      "format": "image/jpeg",
      "convertToSrgb": true,
      "stripMetadata": true,
      "variants": [
        {
          "id": "v1", "name": "@2x",
          "width": 1600, "height": 900,
          "minBytes": 204800, "maxBytes": 307200,
          "suffix": "@2x"
        }
      ]
    }
  ],
  "exportedAt": "2026-04-21T00:00:00.000Z"
}

保存されるのは「変換ルール（プロファイル構成）」のみで、
割り当てた画像データは含まれません（プライバシーとファイルサイズの理由）。

v1.0 形式のJSONも読み込み可能で、minBytes が未定義の場合は
undefined として扱われます（後方互換維持）。

.gitignore に追加しておけば、案件ごとのJSONをリポジトリ管理できます。`,
    },
  },
} as const;
```

**重要**:
- 既存の `intro`, `privacy`, `outputFormat` などのエントリは**絶対に削除しない**
- `batch` キーを既存エントリの下に追加するだけ

---

### Task 2: BatchMode.tsx への説明トグル統合（25分）

#### 2.1 import 追加

```tsx
import UsageToggle from "./UsageToggle";
import IntroToggle from "./IntroToggle";
import { DESCRIPTIONS } from "./descriptions";
```

（どれかが既に import されていればそのまま）

#### 2.2 ① ページ冒頭: [このモードについて ▼]

バッチモードの最上部（タブ切り替えの下、プロファイル一覧の上）に配置。

**実装**: シンプルモードと同じく `IntroToggle` を使用。

```tsx
return (
  <>
    {/* ページ冒頭: このモードについて */}
    <div className="mb-6">
      <IntroToggle
        buttonLabel="このモードについて"
        simpleText={DESCRIPTIONS.batch.intro.simple}
        technicalText={DESCRIPTIONS.batch.intro.technical}
      />
    </div>
    
    {/* 既存の「プロファイル管理セクション」以下がここから続く */}
    <div className="space-y-4 mb-8">
      {/* ... */}
    </div>
  </>
);
```

**注意**: 既存のセクション全体を囲む `<>` フラグメントなどの構造は維持する。`IntroToggle` をそのセクションの**上**に追加するだけ。

#### 2.3 ⑤ プリセット読み込みの隣: [プリセットの選び方 ▼]

現状のコード:

```tsx
<div className="flex gap-2">
  <button onClick={/* 新規追加 */} className="...">+ プロファイル追加</button>
  <div className="relative">
    <button onClick={/* プリセット展開 */} className="...">プリセット読み込み ▼</button>
    {/* ドロップダウン */}
  </div>
</div>
```

この部分に、プリセット読み込みボタンの**右隣に「プリセットの選び方」のトグル**を追加。ただし、`UsageToggle` は「ラベル + children」構造なので、このケースだと少しカスタマイズが必要。

**実装方針**: インライン実装（useState で開閉管理）

```tsx
// コンポーネント内で state 追加
const [showPresetGuide, setShowPresetGuide] = useState(false);

// JSX 内
<div className="flex gap-2 items-center">
  <button onClick={/* 新規追加 */} className="...">+ プロファイル追加</button>
  <div className="relative">
    <button onClick={/* プリセット展開 */} className="...">プリセット読み込み ▼</button>
    {/* ドロップダウン */}
  </div>
  <button
    onClick={() => setShowPresetGuide(!showPresetGuide)}
    className="text-xs text-white/40 hover:text-sky-400 transition-colors flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/5"
  >
    <span>{showPresetGuide ? "▲" : ""}</span>
    <span>プリセットの選び方</span>
  </button>
</div>

{/* トグル展開時の説明 */}
{showPresetGuide && (
  <div className="mt-3 bg-white/5 rounded-lg p-3 space-y-2 border border-white/10">
    <p className="text-sm text-white/85 leading-relaxed whitespace-pre-line">
      {DESCRIPTIONS.batch.presetGuide.simple}
    </p>
    <InfoAccordion>
      <p className="whitespace-pre-line">{DESCRIPTIONS.batch.presetGuide.technical}</p>
    </InfoAccordion>
  </div>
)}
```

**import** に `InfoAccordion` も追加してください（まだ入っていなければ）。

#### 2.4 ② バッチプロファイル見出しの隣: [プロファイルとは? ▼]

現状のコード:

```tsx
<div className="flex items-center justify-between">
  <h2 className="text-sm font-mono text-white/40 uppercase tracking-widest">バッチプロファイル</h2>
  <div className="flex gap-2">
    {/* + プロファイル追加、プリセット読み込みなど */}
  </div>
</div>
```

`<h2>` の横に [プロファイルとは? ▼] を追加。

**実装方針**: インライン実装

```tsx
// state 追加
const [showProfileGuide, setShowProfileGuide] = useState(false);

// JSX
<div className="flex items-center justify-between">
  <div className="flex items-center gap-2">
    <h2 className="text-sm font-mono text-white/40 uppercase tracking-widest">バッチプロファイル</h2>
    <button
      onClick={() => setShowProfileGuide(!showProfileGuide)}
      className="text-xs text-white/40 hover:text-sky-400 transition-colors flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/5"
    >
      <span>{showProfileGuide ? "▲" : ""}</span>
      <span>プロファイルとは?</span>
    </button>
  </div>
  <div className="flex gap-2 items-center">
    {/* + プロファイル追加、プリセット読み込み、プリセットの選び方 */}
  </div>
</div>

{/* 展開時 */}
{showProfileGuide && (
  <div className="bg-white/5 rounded-lg p-3 space-y-2 border border-white/10 mt-2">
    <p className="text-sm text-white/85 leading-relaxed whitespace-pre-line">
      {DESCRIPTIONS.batch.profile.simple}
    </p>
    <InfoAccordion>
      <p className="whitespace-pre-line">{DESCRIPTIONS.batch.profile.technical}</p>
    </InfoAccordion>
  </div>
)}
```

#### 2.5 ⑥ JSON保存/読み込みの隣: [使い方 ▼]

現状のコード（推定）:

```tsx
<div className="flex gap-2 flex-wrap">
  {profiles.length > 0 && (
    <button onClick={handleExportJson}>プロファイルをJSONで保存</button>
  )}
  <button onClick={() => jsonInputRef.current?.click()}>JSONから読み込み</button>
</div>
```

**実装方針**: 隣に [使い方] トグルを追加

```tsx
// state 追加
const [showJsonGuide, setShowJsonGuide] = useState(false);

<div className="flex gap-2 flex-wrap items-center">
  {profiles.length > 0 && (
    <button onClick={handleExportJson}>プロファイルをJSONで保存</button>
  )}
  <button onClick={() => jsonInputRef.current?.click()}>JSONから読み込み</button>
  <button
    onClick={() => setShowJsonGuide(!showJsonGuide)}
    className="text-xs text-white/40 hover:text-sky-400 transition-colors flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/5"
  >
    <span>{showJsonGuide ? "▲" : ""}</span>
    <span>使い方</span>
  </button>
</div>

{/* 展開時 */}
{showJsonGuide && (
  <div className="bg-white/5 rounded-lg p-3 space-y-2 border border-white/10 mt-2">
    <p className="text-sm text-white/85 leading-relaxed whitespace-pre-line">
      {DESCRIPTIONS.batch.jsonIO.simple}
    </p>
    <InfoAccordion>
      <p className="whitespace-pre-line">{DESCRIPTIONS.batch.jsonIO.technical}</p>
    </InfoAccordion>
  </div>
)}
```

#### 2.6 ③ 「画像を割り当てて生成」の見出し: [使い方 ▼]

現状のコード:

```tsx
<h2 className="text-sm font-mono text-white/40 uppercase tracking-widest mb-4">
  画像を割り当てて生成
</h2>
```

`<h2>` の右側に [使い方] トグルを追加。

```tsx
// state 追加
const [showAssignGuide, setShowAssignGuide] = useState(false);

<div className="flex items-center justify-between mb-4">
  <h2 className="text-sm font-mono text-white/40 uppercase tracking-widest">
    画像を割り当てて生成
  </h2>
  <button
    onClick={() => setShowAssignGuide(!showAssignGuide)}
    className="text-xs text-white/40 hover:text-sky-400 transition-colors flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/5"
  >
    <span>{showAssignGuide ? "▲" : ""}</span>
    <span>使い方</span>
  </button>
</div>

{/* 展開時 */}
{showAssignGuide && (
  <div className="bg-white/5 rounded-lg p-3 space-y-2 border border-white/10 mb-4">
    <p className="text-sm text-white/85 leading-relaxed whitespace-pre-line">
      {DESCRIPTIONS.batch.imageAssign.simple}
    </p>
    <InfoAccordion>
      <p className="whitespace-pre-line">{DESCRIPTIONS.batch.imageAssign.technical}</p>
    </InfoAccordion>
  </div>
)}
```

---

### Task 3: ProfileEditor.tsx への説明トグル統合（10分）

#### 3.1 import 追加

```tsx
import UsageToggle from "./UsageToggle";
import InfoAccordion from "./InfoAccordion";
import { DESCRIPTIONS } from "./descriptions";
```

（既に入っているものはそのまま）

#### 3.2 ④ バリアント欄の上: [バリアントと容量範囲について ▼]

バリアント一覧（`draft.variants.map(...)` の上）に追加。

現状のコード（推定）:

```tsx
<div>
  <p className="text-xs text-white/40 mb-2">バリアント</p>
  {draft.variants.map((v, i) => (
    <div key={v.id}>
      {/* バリアント編集UI */}
    </div>
  ))}
  <button onClick={addVariant}>+ バリアント追加</button>
</div>
```

**実装方針**: `UsageToggle` を使用（共通コンポーネントがそのまま使える構造）

```tsx
<UsageToggle
  label="バリアント"
  simpleText={DESCRIPTIONS.batch.variant.simple}
  technicalText={DESCRIPTIONS.batch.variant.technical}
>
  {draft.variants.map((v, i) => (
    <div key={v.id}>
      {/* バリアント編集UI（既存のまま） */}
    </div>
  ))}
  <button onClick={addVariant}>+ バリアント追加</button>
</UsageToggle>
```

**注意**: 既存の `<p className="text-xs text-white/40 mb-2">バリアント</p>` は、`UsageToggle` の `label` prop として渡されるので**削除**する。

---

### Task 4: ビルド確認（3分）

```bash
npm run build
```

エラー・警告なしを確認。

---

### Task 5: 動作確認（10分）

#### 5.1 デフォルト表示

1. バッチモードを開く
2. 以下がすべて**控えめに表示**されている:
   - [このモードについて ▼]（ページ上部）
   - バッチプロファイル見出しの横に [プロファイルとは? ▼]
   - 「+プロファイル追加」「プリセット読み込み」の隣に [プリセットの選び方 ▼]
   - 「プロファイルをJSONで保存」「JSONから読み込み」の隣に [使い方 ▼]
   - 「画像を割り当てて生成」見出しの横に [使い方 ▼]
3. **説明文カードは一切非表示**（クリックするまで見えない）

#### 5.2 展開動作

1. 各トグルをクリック → 説明カードが開く
2. もう一度クリック → 閉じる
3. 複数トグルを同時に開ける（独立動作）
4. [▶ 技術に興味のある方へ] もクリックで展開する

#### 5.3 プロファイル編集モーダル

1. 既存プロファイルの「編集」をクリック → モーダルが開く
2. バリアント欄の上に [使い方 ▼] が表示される
3. クリックで展開・閉じる

#### 5.4 既存機能の退行なし確認

- [ ] プロファイル新規作成 → 正常
- [ ] プリセット読み込み → 正常
- [ ] 画像割り当て → 正常
- [ ] 全て生成 → 正常
- [ ] JSON保存/読み込み → 正常
- [ ] プロファイル名警告バナー（content など）→ 正常表示
- [ ] シンプルモード → 何も変わっていない

---

## 3. 完了報告フォーマット

```markdown
## Day 4.7 完了報告

### 実装項目
- [x] Task 1: descriptions.ts に batch セクション追加（6サブエントリ）
- [x] Task 2: BatchMode.tsx に5つのトグルを統合
  - ① ページ冒頭 IntroToggle
  - ② プロファイル一覧見出し [プロファイルとは?]
  - ③ 画像割り当て見出し [使い方]
  - ⑤ プリセット読み込み隣 [プリセットの選び方]
  - ⑥ JSON保存/読み込み隣 [使い方]
- [x] Task 3: ProfileEditor.tsx バリアント欄に UsageToggle 統合（④）
- [x] Task 4: npm run build 成功
- [x] Task 5: 動作確認

### 退行テスト結果
- [x] シンプルモード: 変更なし、正常動作
- [x] バッチモード既存機能: すべて正常
- [x] プロファイル編集モーダル: バリアント編集機能は維持

### 変更ファイル
- app/tools/image-resizer/descriptions.ts（batch セクション追加）
- app/tools/image-resizer/BatchMode.tsx（5トグル統合）
- app/tools/image-resizer/ProfileEditor.tsx（UsageToggle 統合）
```

---

## 4. 禁止事項

### ❌ やってはいけないこと

- **説明文のテキスト改変**（本指示書の Task 1 の文章を一字も変えない）
- **既存のビジネスロジック変更**
- **シンプルモードの変更**
- **types.ts / imageProcessor.ts / builtinPresets.ts の変更**
- **UsageToggle / IntroToggle / InfoAccordion の変更**（そのまま使用）
- **プロファイル名警告バナーの変更**（先ほど修正した UX-08改 の挙動を維持）

### ⚠️ 判断が必要な場合

- BatchMode.tsx の state 追加（`showPresetGuide`, `showProfileGuide`, `showJsonGuide`, `showAssignGuide`）で既存の state と名前衝突しないか確認
- プロファイル編集モーダル内のバリアント欄が `<label>` や他の要素でラップされていて UsageToggle が入れにくい場合、既存構造を維持して UsageToggle の適用が不可能と判断したら報告

### ✅ 品質基準

- TypeScript strict エラーなし
- ビルド成功
- すべてのトグルがホバー時に `text-sky-400` に色変わり
- デフォルト表示でバッチモードの見た目が大きく変わらない（トグルが控えめに追加されるだけ）

---

**以上。Day 4.7 タスク開始してください。**

**最重要ポイント**: トグル追加による既存レイアウトの大崩れを避けること。各トグルは控えめに、既存UIに寄り添う形で追加してください。
