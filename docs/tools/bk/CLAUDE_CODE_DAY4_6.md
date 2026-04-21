# ClaudeCode 実装指示: Day 4.6 - 説明文をアコーディオン化（UI設計の根本修正）

**対象**: `E:\app\noviqlab\noviqlab-site`
**関連**: Day 4 / Day 4.5 で追加した説明文が「常時表示されて邪魔」という根本的な設計ミスへの対応。
**所要時間**: 30〜40分
**前提**: Day 4.5 完了済み。シンプルモードに説明文が常時表示されている状態。

**ゴール**:
- デフォルト表示は**シンプルでスッキリ**したレイアウト（Day 3.5 時点の状態に近い）
- 説明文は**[使い方]リンクをクリックした時だけ展開**
- 技術者向け詳細はさらに**入れ子アコーディオン**で開閉

**設計思想**:
- **必要な人だけ見る** = 見たくない人の視界に入らない
- 常時表示の長文はノイズ、能動的に見に行く設計が正しい UX

---

## 0. 事前準備

### 0.1 現状確認

```bash
cd E:\app\noviqlab\noviqlab-site
git log --oneline -3
git status
```

### 0.2 作業対象ファイル

- `app/tools/image-resizer/SimpleMode.tsx`（メイン改修）
- `app/tools/image-resizer/InfoAccordion.tsx`（そのまま使用、変更なし）

**変更しないもの**:
- `descriptions.ts`（テキスト内容）
- `BatchMode.tsx`, `ProfileEditor.tsx`, `types.ts`, `imageProcessor.ts`
- ビジネスロジック

---

## 1. 全体方針

### 1.1 デフォルト表示（理想形）

Royさんが提示した理想形：

```
┌─ サイドバー ──────┐  ┌─ メインエリア ──────────┐
│ 出力形式 [使い方] │  │                         │
│ [JPG][PNG][WEBP]  │  │ [ドロップゾーン]        │
│                   │  │                         │
│ 画質 [使い方]     │  │                         │
│ [スライダー]      │  │                         │
│                   │  │                         │
│ 透過→背景色[使い方│  │                         │
│ [カラーピッカー]  │  │                         │
│                   │  │                         │
│ リサイズ [使い方] │  │                         │
│ [トグル]          │  │                         │
│                   │  │                         │
│ 調整 [使い方]     │  │                         │
│ [スライダー3つ]   │  │                         │
└───────────────────┘  └─────────────────────────┘
```

**ポイント**:
- 各セクションのラベル横に控えめな「[使い方]」リンク
- 説明文カードは完全に非表示（通常時）
- ドロップゾーン周辺の説明も非表示
- ページ冒頭の紹介文とプライバシー説明は**折りたたみ可能**

### 1.2 ページ冒頭エリアの設計

```
NoviqLab / Tools / Image Converter
[シンプル] [Web制作バッチ]

[このツールについて▼] [個人情報保護について▼]
                      （↑ クリックで展開可能なボタン）

（サイドバーとメインエリアに進む）
```

**クリック時**:

```
[このツールについて▲]  ← アクティブ
┌──────────────────────────────────────┐
│ 📸 画像のサイズを小さくしたり、...    │
│ [▶ 技術に興味のある方へ]              │
└──────────────────────────────────────┘

[個人情報保護について▼]  ← 閉じたまま
```

### 1.3 各セクションの「使い方」リンク

```
[通常時]
出力形式                              [使い方]
[JPG][PNG][WEBP]

↓ [使い方]クリック ↓

[展開時]
出力形式                              [▲使い方]
┌──────────────────────────────────┐
│ 📤 保存する形式（ファイルの種類）  │
│ を選びます。                        │
│ ・JPG: 写真・イラストに最適。      │
│ ・...                              │
│                                    │
│ [▶ 技術に興味のある方へ]          │
└──────────────────────────────────┘
[JPG][PNG][WEBP]
```

**ポイント**:
- [使い方] は右端配置、ホバー時に明確に目立つ
- 展開時は `[使い方]` → `[▲使い方]` または色が変わるなどで状態表示
- 複数のセクションが同時に開ける（独立動作）
- 展開エリアは既存の説明文 + 技術者向けアコーディオン

---

## 2. 実装タスク

### Task 1: UsageToggle コンポーネント新規作成（10分）

「使い方」トグル付きセクションを抽象化するコンポーネント。

#### 1.1 `app/tools/image-resizer/UsageToggle.tsx` 新規作成

```tsx
"use client";

import { useState, ReactNode } from "react";
import InfoAccordion from "./InfoAccordion";

interface UsageToggleProps {
  label: string;                    // セクションラベル（例: "出力形式"）
  labelClassName?: string;          // ラベルの追加クラス（任意）
  simpleText: string;               // 中学生向け説明文
  technicalText: string;            // 技術者向け詳細
  children: ReactNode;              // セクションのメインUI（ボタン群・スライダー等）
}

export default function UsageToggle({
  label,
  labelClassName = "text-xs text-white/40 uppercase tracking-widest",
  simpleText,
  technicalText,
  children,
}: UsageToggleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className={labelClassName}>{label}</p>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-white/40 hover:text-sky-400 transition-colors flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/5"
          aria-expanded={expanded}
        >
          <span>{expanded ? "▲" : ""}</span>
          <span>使い方</span>
        </button>
      </div>
      {expanded && (
        <div className="bg-white/5 rounded-lg p-3 space-y-2 border border-white/10">
          <p className="text-sm text-white/85 leading-relaxed whitespace-pre-line">
            {simpleText}
          </p>
          <InfoAccordion>
            <p className="whitespace-pre-line">{technicalText}</p>
          </InfoAccordion>
        </div>
      )}
      {children}
    </div>
  );
}
```

**ポイント**:
- `useState` で各セクション独立した開閉状態
- ホバー時に `hover:text-sky-400` で目立つ
- 展開時のみ説明カードを表示
- 既存の InfoAccordion を内包（2段階目の技術詳細）

---

### Task 2: IntroToggle コンポーネント新規作成（10分）

ページ冒頭の「このツールについて」「個人情報保護について」用のコンポーネント。

#### 2.1 `app/tools/image-resizer/IntroToggle.tsx` 新規作成

```tsx
"use client";

import { useState } from "react";
import InfoAccordion from "./InfoAccordion";

interface IntroToggleProps {
  buttonLabel: string;              // ボタンのラベル
  simpleText: string;
  technicalText: string;
  variant?: "default" | "privacy";  // privacy の場合は sky カラー
}

export default function IntroToggle({
  buttonLabel,
  simpleText,
  technicalText,
  variant = "default",
}: IntroToggleProps) {
  const [expanded, setExpanded] = useState(false);

  const bgClass = variant === "privacy"
    ? "bg-sky-500/10 border border-sky-400/20"
    : "bg-white/5";

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
          variant === "privacy"
            ? "bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 border border-sky-400/20"
            : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
        }`}
        aria-expanded={expanded}
      >
        {buttonLabel} {expanded ? "▲" : "▼"}
      </button>
      {expanded && (
        <div className={`mt-3 ${bgClass} rounded-xl p-5`}>
          <p className="text-base text-white/90 leading-relaxed whitespace-pre-line">
            {simpleText}
          </p>
          <InfoAccordion>
            <p className="whitespace-pre-line">{technicalText}</p>
          </InfoAccordion>
        </div>
      )}
    </div>
  );
}
```

---

### Task 3: SimpleMode.tsx の大改修（15〜20分）

Day 4/4.5 で追加した説明文カードを**すべてコンポーネント化された形に置き換える**。

#### 3.1 import 追加

```tsx
import UsageToggle from "./UsageToggle";
import IntroToggle from "./IntroToggle";
```

既存の `import InfoAccordion from "./InfoAccordion";` はそのまま残す（技術者向けアコーディオン単体で使う場合があるかもしれないため）。

#### 3.2 ページ冒頭の書き換え

**削除対象**:

```tsx
{/* ページ冒頭の紹介文 */}
<div className="mb-6 bg-white/5 rounded-xl p-5">
  <p className="text-base text-white/90 leading-relaxed whitespace-pre-line">
    {DESCRIPTIONS.intro.simple}
  </p>
  <InfoAccordion>
    <p className="whitespace-pre-line">{DESCRIPTIONS.intro.technical}</p>
  </InfoAccordion>
</div>
{/* プライバシー説明 */}
<div className="mb-6 bg-sky-500/10 border border-sky-400/20 rounded-xl p-5">
  <p className="text-base text-white/95 leading-relaxed whitespace-pre-line">
    {DESCRIPTIONS.privacy.simple}
  </p>
  <InfoAccordion>
    <p className="whitespace-pre-line">{DESCRIPTIONS.privacy.technical}</p>
  </InfoAccordion>
</div>
```

**変更後**:

```tsx
{/* ページ冒頭: このツールについて + 個人情報保護 */}
<div className="mb-6 flex flex-wrap gap-2">
  <IntroToggle
    buttonLabel="このツールについて"
    simpleText={DESCRIPTIONS.intro.simple}
    technicalText={DESCRIPTIONS.intro.technical}
  />
  <IntroToggle
    buttonLabel="個人情報保護について"
    simpleText={DESCRIPTIONS.privacy.simple}
    technicalText={DESCRIPTIONS.privacy.technical}
    variant="privacy"
  />
</div>
```

#### 3.3 サイドバー各セクションの書き換え

**出力形式セクション**

**変更前（Day 4.5 の状態）**:

```tsx
<section className="bg-white/5 rounded-xl p-4 space-y-3">
  <div>
    <p className="text-xs text-white/40 uppercase tracking-widest mb-3">出力形式</p>
    <p className="text-sm text-white/85 leading-relaxed whitespace-pre-line">
      {DESCRIPTIONS.outputFormat.simple}
    </p>
    <InfoAccordion>
      <p className="whitespace-pre-line">{DESCRIPTIONS.outputFormat.technical}</p>
    </InfoAccordion>
  </div>
  <div className="grid grid-cols-2 gap-2">
    {availableFormats.map((fmt) => (
      // ... JPG/PNG/WebP ボタン群
    ))}
  </div>
  {/* AVIF非対応表示 */}
</section>
```

**変更後**:

```tsx
<section className="bg-white/5 rounded-xl p-4">
  <UsageToggle
    label="出力形式"
    simpleText={DESCRIPTIONS.outputFormat.simple}
    technicalText={DESCRIPTIONS.outputFormat.technical}
  >
    <div className="grid grid-cols-2 gap-2">
      {availableFormats.map((fmt) => (
        // ... JPG/PNG/WebP ボタン群（既存のまま）
      ))}
    </div>
    {/* AVIF非対応表示（既存のまま） */}
  </UsageToggle>
</section>
```

**画質セクション（`{settings.format !== "image/png" && ()}` の中）**

**変更前**:

```tsx
<section className="bg-white/5 rounded-xl p-4 space-y-3">
  <div>
    <p className="text-xs text-white/40 uppercase tracking-widest mb-3">画質</p>
    <p className="text-sm text-white/85 leading-relaxed whitespace-pre-line">
      {DESCRIPTIONS.quality.simple}
    </p>
    <InfoAccordion>
      <p className="whitespace-pre-line">{DESCRIPTIONS.quality.technical}</p>
    </InfoAccordion>
  </div>
  <div className="flex items-center gap-3">
    {/* 画質スライダー */}
  </div>
</section>
```

**変更後**:

```tsx
<section className="bg-white/5 rounded-xl p-4">
  <UsageToggle
    label="画質"
    simpleText={DESCRIPTIONS.quality.simple}
    technicalText={DESCRIPTIONS.quality.technical}
  >
    <div className="flex items-center gap-3">
      {/* 画質スライダー（既存のまま） */}
    </div>
  </UsageToggle>
</section>
```

**透過→背景色セクション（`{settings.format === "image/jpeg" && ()}` の中）**

同様に UsageToggle でラップ:

```tsx
<section className="bg-white/5 rounded-xl p-4">
  <UsageToggle
    label="透過→背景色"
    simpleText={DESCRIPTIONS.bgColor.simple}
    technicalText={DESCRIPTIONS.bgColor.technical}
  >
    <div className="flex items-center gap-3">
      {/* カラーピッカー等（既存のまま） */}
    </div>
  </UsageToggle>
</section>
```

**リサイズセクション**

リサイズは少し複雑です（現状のコードではトグルとラベルが同じ行にある）。以下のように再構成:

```tsx
<section className="bg-white/5 rounded-xl p-4">
  <UsageToggle
    label="リサイズ"
    simpleText={DESCRIPTIONS.resize.simple}
    technicalText={DESCRIPTIONS.resize.technical}
  >
    {/* リサイズのトグルボタン */}
    <div className="flex items-center justify-end">
      <button
        onClick={() => setSettings((s) => ({ ...s, resizeEnabled: !s.resizeEnabled }))}
        // 既存のトグルボタン実装
      >
        {/* 既存のトグル */}
      </button>
    </div>

    {settings.resizeEnabled && (
      <div className="space-y-3 mt-3">
        {/* 幅・高さ入力、アスペクト比維持、プリセット等（既存のまま） */}
      </div>
    )}
  </UsageToggle>
</section>
```

**注意**: 現在のリサイズセクションは `<section>` 直下に `<div className="flex items-center justify-between">` があり、そこに **リサイズラベルとトグルボタン**が並んでいる可能性があります。UsageToggle を使う場合、ラベルは UsageToggle 内部で管理するため、既存のラベル表示は削除し、トグルボタンだけ右寄せで配置する必要があります。

**プリセットの説明文**

プリセットエリア（リサイズONかつ `{settings.resizeEnabled && ()}` の中にある）には、**現状では別途 DESCRIPTIONS.preset.simple が表示**されています。これは UsageToggle でラップしなおす:

```tsx
{settings.resizeEnabled && (
  <div className="space-y-3 mt-3">
    {/* 幅・高さ入力 */}
    {/* アスペクト比維持チェックボックス */}
    
    {/* プリセット部分 */}
    <div>
      <UsageToggle
        label="プリセット"
        labelClassName="text-xs text-white/30"
        simpleText={DESCRIPTIONS.preset.simple}
        technicalText={DESCRIPTIONS.preset.technical}
      >
        <div className="grid grid-cols-1 gap-1">
          {PRESETS.map((p) => (
            // ... プリセットボタン（既存のまま）
          ))}
        </div>
      </UsageToggle>
    </div>
  </div>
)}
```

**注**: プリセットのラベルは小さめ（`text-xs text-white/30`）なので、`labelClassName` で指定。

**調整セクション**

```tsx
<section className="bg-white/5 rounded-xl p-4">
  <UsageToggle
    label="調整"
    simpleText={DESCRIPTIONS.adjust.simple}
    technicalText={DESCRIPTIONS.adjust.technical}
  >
    {(["brightness", "contrast", "saturation"] as const).map((key) => {
      const labels = { brightness: "明るさ", contrast: "コントラスト", saturation: "彩度" };
      return (
        // 既存のスライダー実装
      );
    })}
  </UsageToggle>
</section>
```

#### 3.4 ドロップゾーン周辺の書き換え

**削除対象（Day 4.5 で追加したドロップゾーン下のアコーディオン）**:

```tsx
{/* 技術者向け詳細はドロップゾーンの外・下 */}
<div className="mt-2">
  <InfoAccordion>
    <p className="whitespace-pre-line">{DESCRIPTIONS.dropzone.technical}</p>
  </InfoAccordion>
</div>
```

→ **削除**する。ドロップゾーンは**そのままシンプルに**保つ（ドロップゾーン内のテキストは維持）。

もしドロップゾーンに「使い方」を追加したい場合は、右上あたりに小さく配置（任意）。ただし、**ドロップゾーンは見た目で使い方が分かる**ので、デフォルトは追加しないほうがスッキリする。

→ **推奨: ドロップゾーンの説明は削除。説明は各設定セクションに集中させる。**

---

### Task 4: ビルド確認（3分）

```bash
npm run build
```

エラー・警告なしを確認。

---

### Task 5: 動作確認（5〜10分）

#### 5.1 デフォルト表示の確認

1. `http://localhost:3100/tools/image-resizer` を開く
2. シンプルモードで以下を目視確認:
   - [ ] ページ上部に **[このツールについて▼] [個人情報保護について▼]** ボタンが横並び
   - [ ] サイドバーの各セクションに **[使い方]** リンクが右端に配置
   - [ ] **説明文カードが非表示**（スッキリしたレイアウト）
   - [ ] メインエリアのドロップゾーンもシンプル（下のアコーディオンなし）

#### 5.2 展開動作の確認

1. 「このツールについて」クリック → 紹介文が展開される
2. さらに「▶ 技術に興味のある方へ」クリック → 技術詳細が展開される
3. 「個人情報保護について」クリック → プライバシー説明が展開される（独立して）
4. サイドバーの「出力形式」の **[使い方]** クリック → 説明カードが開く
5. 複数のセクションを同時に開ける（アコーディオンではなく独立動作）
6. もう一度 [使い方] クリックで閉じる

#### 5.3 ホバー効果の確認

- **[使い方]** にマウスオーバー → `text-sky-400` に変わる
- 背景に薄い色（`hover:bg-white/5`）が付く

#### 5.4 既存機能の退行確認

- [ ] 画像ドロップ → 変換 → DL が正常動作
- [ ] 画質スライダー、リサイズ、プリセット、調整、全て動作
- [ ] バッチモードは変更していないので、そのまま動作

---

## 3. 完了報告フォーマット

```markdown
## Day 4.6 完了報告

### 実装項目
- [x] Task 1: UsageToggle.tsx 新規作成
- [x] Task 2: IntroToggle.tsx 新規作成
- [x] Task 3: SimpleMode.tsx 大改修
  - ページ冒頭: 2つのボタン式トグルに変更
  - サイドバー各セクション: UsageToggle でラップ
  - ドロップゾーン下のアコーディオン削除
- [x] Task 4: ビルド成功
- [x] Task 5: 動作確認

### 主な変更点
- 説明文の常時表示を廃止、[使い方] クリックで展開する方式に
- ページ冒頭は2つの独立ボタン（このツールについて / 個人情報保護について）
- 各セクション独立して開閉（アコーディオンではない）

### 退行テスト結果
- [x] 画像変換・DL 正常
- [x] アコーディオン開閉 正常
- [x] バッチモード 正常（変更なし）

### 変更ファイル
- app/tools/image-resizer/UsageToggle.tsx（新規）
- app/tools/image-resizer/IntroToggle.tsx（新規）
- app/tools/image-resizer/SimpleMode.tsx（大改修）
```

---

## 4. 禁止事項

### ❌ やってはいけないこと

- **descriptions.ts のテキスト変更**（一字も変えない）
- **BatchMode.tsx / ProfileEditor.tsx の変更**（今回の範囲外）
- **ビジネスロジックの変更**
- **既存の state や ハンドラ名の変更**
- **InfoAccordion.tsx の変更**（そのまま内部で使用）

### ⚠️ 判断が必要な場合

- リサイズセクションのラベル・トグルボタンの配置で詰まる場合 → 一旦 UsageToggle なしで既存維持し、報告する
- プリセットのラベルサイズ調整で `labelClassName` の指定がうまくいかない場合 → 既存のスタイルに戻して報告

### ✅ 品質基準

- TypeScript strict でエラーなし
- ビルド成功
- 各セクション独立して開閉動作
- ホバー時に [使い方] が明確に目立つ

---

**以上。Day 4.6 タスク開始してください。**

**最重要ポイント**: **デフォルト表示を Day 3.5 時点の「スッキリしたレイアウト」に戻す**こと。説明文は完全に隠し、[使い方] クリック時のみ展開する設計です。Royさんが提示したスクショ（シンプルなサイドバー + 大きなドロップゾーン）が理想形です。
