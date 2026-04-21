# ClaudeCode 実装指示: Day 4.5 - 可読性改善（色調・レイアウト）

**対象**: `E:\app\noviqlab\noviqlab-site`
**関連**: Day 4 で追加した説明文が「薄くて読みにくい」「サイドバー幅が狭い」「ドロップゾーンが大きすぎる」という指摘を受けての改善タスク。
**所要時間**: 30〜40分
**前提**: Day 4 完了済み。シンプルモードに説明文とアコーディオンが実装された状態。

**ゴール**:
- 説明文が「実際に読める」読みやすさになる
- サイドバー幅を拡大して縦長の読みにくさを解消
- ドロップゾーンを**縦長・大きく**して存在感を高める（説明文もドロップゾーン内に統合）

---

## 0. 事前準備

### 0.1 現状確認

```bash
cd E:\app\noviqlab\noviqlab-site
git log --oneline -3
git status
```

### 0.2 作業対象ファイル

本タスクは以下の3ファイルのみ修正:

- `app/tools/image-resizer/SimpleMode.tsx`（メイン、レイアウト改修）
- `app/tools/image-resizer/InfoAccordion.tsx`（文字色・サイズ調整）

**変更しないもの**:
- `descriptions.ts`（テキスト内容は一切変えない）
- `BatchMode.tsx`, `ProfileEditor.tsx`, `types.ts`, `imageProcessor.ts`
- ビジネスロジック

---

## 1. 全体方針

### 1.1 色調統一ルール

以下のルールで全ての text-white を整理:

| 用途 | カラー |
|---|---|
| メイン本文テキスト | `text-white/90` |
| 補足説明テキスト | `text-white/80` |
| 技術詳細テキスト | `text-white/75` |
| セクションラベル（UPPERCASE） | `text-white/50`（変更なし） |
| 入力欄プレースホルダ | `text-white/30`（変更なし） |
| フッター等 | `text-white/40`（変更なし） |

### 1.2 フォントサイズ統一ルール

| 用途 | サイズ |
|---|---|
| ページ冒頭本文 | `text-base` (16px) |
| プライバシー本文 | `text-base` (16px) |
| サイドバー各項目の説明本文 | `text-sm` (14px) |
| 技術者向け詳細 | `text-sm` (14px) |
| ドロップゾーン内のメイン文言 | `text-base` (16px) |
| ドロップゾーン内の補足 | `text-sm` (14px) |
| セクションラベル | `text-xs` (12px)（変更なし） |

### 1.3 レイアウト変更

- **サイドバー幅**: `300px → 360px`（約20%拡大）
- **ドロップゾーン**: 縦長に（最小高さ240px）、説明文を内包

---

## 2. 実装タスク

### Task 1: InfoAccordion.tsx の調整（5分）

アコーディオン展開後の本文テキストを読みやすく。

#### 1.1 変更箇所

```tsx
// 現状
<div className="mt-2 pl-4 py-2 border-l border-white/10 text-xs text-white/50 leading-relaxed space-y-2">
```

#### 1.2 変更後

```tsx
<div className="mt-2 pl-4 py-2 border-l border-white/10 text-sm text-white/75 leading-relaxed space-y-3">
```

変更点:
- `text-xs` → `text-sm` （14px化）
- `text-white/50` → `text-white/75`（明るく）
- `space-y-2` → `space-y-3`（段落間の余白拡大）

#### 1.3 summary（見出し部分）も調整

```tsx
// 現状
<summary className="cursor-pointer text-xs text-white/40 hover:text-white/60 ...">
```

#### 1.4 変更後

```tsx
<summary className="cursor-pointer text-xs text-white/60 hover:text-white/80 transition-colors select-none list-none flex items-center gap-1">
```

変更点:
- `text-white/40` → `text-white/60`（クリック可能な要素なので目立つように）
- hover色も `/60 → /80` に

---

### Task 2: SimpleMode.tsx のサイドバー幅拡大（2分）

#### 2.1 変更箇所

```tsx
// 現状
<div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
```

#### 2.2 変更後

```tsx
<div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
```

変更点: `300px → 360px`

---

### Task 3: ページ冒頭カードの調整（5分）

#### 3.1 紹介文カード

```tsx
// 現状
<div className="mb-6 bg-white/5 rounded-xl p-4">
  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">
    {DESCRIPTIONS.intro.simple}
  </p>
  <InfoAccordion>
    <p className="whitespace-pre-line">{DESCRIPTIONS.intro.technical}</p>
  </InfoAccordion>
</div>
```

#### 3.2 変更後

```tsx
<div className="mb-6 bg-white/5 rounded-xl p-5">
  <p className="text-base text-white/90 leading-relaxed whitespace-pre-line">
    {DESCRIPTIONS.intro.simple}
  </p>
  <InfoAccordion>
    <p className="whitespace-pre-line">{DESCRIPTIONS.intro.technical}</p>
  </InfoAccordion>
</div>
```

変更点:
- `p-4` → `p-5`（余白拡大）
- `text-sm` → `text-base`（16px化）
- `text-white/80` → `text-white/90`（明るく）

#### 3.3 プライバシーカード

同様に調整:

```tsx
<div className="mb-6 bg-sky-500/10 border border-sky-400/20 rounded-xl p-5">
  <p className="text-base text-white/95 leading-relaxed whitespace-pre-line">
    {DESCRIPTIONS.privacy.simple}
  </p>
  <InfoAccordion>
    <p className="whitespace-pre-line">{DESCRIPTIONS.privacy.technical}</p>
  </InfoAccordion>
</div>
```

変更点:
- `p-4` → `p-5`
- `text-sm` → `text-base`
- `text-white/80` → `text-white/95`（プライバシーは最重要なので最も明るく）

---

### Task 4: サイドバー各セクションの説明文の調整（10分）

サイドバーの各セクション（出力形式・画質・透過→背景色・リサイズ・プリセット・調整）内の**説明文 `<p>` タグ**を以下のように修正。

#### 4.1 対象パターン

```tsx
<p className="text-xs text-white/60 leading-relaxed whitespace-pre-line">
  {DESCRIPTIONS.xxx.simple}
</p>
```

#### 4.2 変更後

```tsx
<p className="text-sm text-white/85 leading-relaxed whitespace-pre-line">
  {DESCRIPTIONS.xxx.simple}
</p>
```

変更点:
- `text-xs` → `text-sm`（14px化）
- `text-white/60` → `text-white/85`（明るく）

**全セクション（少なくとも6箇所）で同じ変更を適用**:
- 出力形式 (`DESCRIPTIONS.outputFormat.simple`)
- 画質 (`DESCRIPTIONS.quality.simple`)
- 透過→背景色 (`DESCRIPTIONS.bgColor.simple`)
- リサイズ (`DESCRIPTIONS.resize.simple`)
- プリセット (`DESCRIPTIONS.preset.simple`)
- 調整 (`DESCRIPTIONS.adjust.simple`)

#### 4.3 ラベルの下マージン調整

既存のラベルと説明文の間にもう少し余白を:

```tsx
// 現状
<p className="text-xs text-white/40 uppercase tracking-widest mb-2">出力形式</p>
```

```tsx
// 変更後（mb-2 → mb-3）
<p className="text-xs text-white/40 uppercase tracking-widest mb-3">出力形式</p>
```

全6セクションで `mb-2 → mb-3` に変更。

---

### Task 5: ドロップゾーンの大改修（15分）

これが最大の変更。**説明文をドロップゾーン内に統合**、**縦長・大きく**する。

#### 5.1 現状の構造を削除

**削除対象**（Day 4 で追加した部分）:

```tsx
{/* ドロップゾーン説明 */}
<div className="mb-3">
  <p className="text-xs text-white/50 leading-relaxed whitespace-pre-line">
    {DESCRIPTIONS.dropzone.simple}
  </p>
  <InfoAccordion>
    <p className="whitespace-pre-line">{DESCRIPTIONS.dropzone.technical}</p>
  </InfoAccordion>
</div>
```

この `<div>` ブロックを**丸ごと削除**。説明文はドロップゾーン内に移す。

#### 5.2 既存ドロップゾーンの構造確認

既存のドロップゾーン（おおよそ以下の形）:

```tsx
<div
  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
  onDragLeave={() => setIsDragging(false)}
  onDrop={handleDrop}
  onClick={() => fileInputRef.current?.click()}
  className="border-2 border-dashed ... rounded-xl p-6 ..."
>
  {/* アイコン、文言 */}
</div>
```

#### 5.3 変更後のドロップゾーン

**改修のポイント**:
- 高さを縦長に（`min-h-[240px]`）
- アイコンサイズ拡大
- 説明文を内包（DESCRIPTIONS.dropzone.simple を活用）
- 技術者向け詳細のアコーディオンは**ドロップゾーン外の下**に配置（クリックでドロップゾーンを触らないため）

```tsx
{/* ドロップゾーン */}
<div
  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
  onDragLeave={() => setIsDragging(false)}
  onDrop={handleDrop}
  onClick={() => fileInputRef.current?.click()}
  className={`
    min-h-[240px]
    border-2 border-dashed rounded-xl
    flex flex-col items-center justify-center
    cursor-pointer transition-all
    px-6 py-8
    ${isDragging 
      ? "border-sky-400 bg-sky-400/10" 
      : "border-white/30 hover:border-white/50 hover:bg-white/5"
    }
  `}
>
  <div className="text-7xl mb-4">🖼️</div>
  <p className="text-base text-white/90 font-medium mb-2 text-center">
    画像をドロップ、またはクリックして選択
  </p>
  <p className="text-sm text-white/70 text-center leading-relaxed">
    一度に何枚でも選べます<br />
    対応形式: PNG / JPEG / WebP / AVIF
  </p>
  <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    multiple
    className="hidden"
    onChange={handleFileInput}
  />
</div>

{/* 技術者向け詳細はドロップゾーンの外・下 */}
<div className="mt-2">
  <InfoAccordion>
    <p className="whitespace-pre-line">{DESCRIPTIONS.dropzone.technical}</p>
  </InfoAccordion>
</div>
```

**重要**:
- **既存の `<input type="file">` と関連する ref・ハンドラは維持**すること
- 既存の `handleDrop` 関数、`fileInputRef` 変数、`isDragging` state はそのまま使う
- 既存のドロップゾーンのクラス名は上記を参考に「拡大・縦長化」した形に書き換える

#### 5.4 ボタンで説明を強調したい場合（任意・余裕あれば）

もっと存在感を出したいなら、こんな工夫も:

- アイコンを絵文字からSVGに変更（任意）
- テキストに軽いグラデーション（任意）
- ホバー時の背景色強調（上記 `hover:bg-white/5` で対応済み）

このへんは**既存の実装を大きく変えない範囲で**、Royさんのフィードバックを待つ。

---

### Task 6: ビルド確認（3分）

```bash
npm run build
```

エラー・警告なしを確認。

---

### Task 7: 動作確認（5分）

1. `http://localhost:3100/tools/image-resizer` を開く
2. シンプルモードで以下を目視確認:

**可読性**:
- [ ] ページ冒頭の紹介文が**はっきり読める**（薄くない）
- [ ] プライバシー説明が**太字まではいかないが明確**
- [ ] サイドバー各項目の説明が**読みやすいサイズ・色**
- [ ] アコーディオン展開後の技術詳細も**読みやすい**

**レイアウト**:
- [ ] サイドバー幅が広くなっている（360px）
- [ ] ドロップゾーンが**縦長で大きい**（最小240px）
- [ ] ドロップゾーン内に「🖼️」アイコン + 主文言 + 補足が並ぶ
- [ ] ドロップゾーン上には説明文がなくなっている
- [ ] 技術者向け詳細アコーディオンはドロップゾーンの**下**にある

**既存機能**:
- [ ] 画像ドロップ → 変換 → ZIP DL が正常動作
- [ ] アコーディオン全部の開閉が正常

---

## 3. 完了報告フォーマット

```markdown
## Day 4.5 完了報告

### 実装項目
- [x] Task 1: InfoAccordion.tsx の色・サイズ調整
- [x] Task 2: SimpleMode サイドバー幅 300→360px
- [x] Task 3: ページ冒頭カード（紹介文・プライバシー）の可読性向上
- [x] Task 4: サイドバー各セクション説明文の色・サイズ調整（6箇所）
- [x] Task 5: ドロップゾーン大改修（縦長・説明内包・240px高さ）
- [x] Task 6: ビルド成功
- [x] Task 7: 動作確認

### 退行テスト結果
- [x] 画像ドロップ・変換・DL 正常
- [x] ZIP DL 正常
- [x] アコーディオン開閉 正常

### 変更ファイル
- app/tools/image-resizer/InfoAccordion.tsx（色・サイズ）
- app/tools/image-resizer/SimpleMode.tsx（レイアウト全般）

### 気づき・改善提案
（あれば記載）
```

---

## 4. 禁止事項

### ❌ やってはいけないこと

- **descriptions.ts の内容変更**: テキストは一字も変えない（Royさん推敲済み）
- **BatchMode.tsx / ProfileEditor.tsx の変更**: 本タスクの範囲外
- **ビジネスロジックの変更**: 画像処理、バリデーション、localStorage などは触らない
- **既存の state / ハンドラ名の変更**: `fileInputRef`, `handleDrop`, `isDragging` など既存の命名はそのまま使う
- **新しい依存パッケージの追加**

---

**以上。Day 4.5 タスク開始してください。**

Task 5（ドロップゾーン大改修）が一番慎重に進める必要があります。既存のD&Dハンドラとref構造を維持しつつ、見た目だけ縦長・大きく変えてください。
