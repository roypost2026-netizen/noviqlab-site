# NoviqLab Tools 要件定義書 v3.0

**作成日**: 2026-04-20
**改訂履歴**:
- v1.0 (2026-04-20): 初版（MVP機能のみ）
- v2.0 (2026-04-20): Web制作バッチモード・容量目標自動調整を追加
- **v3.0 (2026-04-20): Day 1・2実装反映、複数画像対応（Day 3）を追加、実依頼ケース分析を明確化**

**対象**: noviqlab.com への Tools セクション追加 & 画像変換ツール実装
**配置先**: `E:\app\noviqlab\noviqlab-site\`

---

## 0. 実装進捗（2026-04-20 時点）

### ✅ Day 1（完了）

- Tools インフラ整備（`/tools`、`/tools/image-resizer`）
- トップページにToolsセクション追加
- シンプルモード実装（Geminiコード由来のバグ8項目全修正）
- 12パターン統合テスト：実画像12枚で動作確認済み
- Gitコミット: `5843890`

### ✅ Day 2（完了）

- バッチモード基盤実装
- 共通ロジック抽出（`imageProcessor.ts`）
- プロファイル編集モーダル
- 組み込みプリセット6種
- 容量目標自動調整（二分探索、実測で「上限ギリギリ最適化」を確認）
- JSON import/export + localStorage
- Gitコミット: `3495097`

### ⏳ Day 3（未実装、本要件追加分）

- **1プロファイルに複数画像割り当て機能**
- **画像ごとのサフィックス手動入力**（a/b/c/d 展開用）
- 容量範囲指定（minBytes / maxBytes）
- sRGB変換（createImageBitmap）

### 📋 Phase 2（将来）

- EXIF可視化・剥がし
- Before/Afterスライダー比較
- 顔検出自動クロップ（profile画像用）

---

## 1. プロジェクト概要

### 1.1 目的

- **主**: Roy個人の実用ツール置き場（Web制作業務・ブログ画像処理など）
- **主**: 顧客納品時の画像最適化作業の自動化
- **副**: NoviqLab のポートフォリオ・技術デモ
- **副**: 将来ツールを増やしていく基盤整備

### 1.2 制約

- **静的配信前提**（Vercel Hobby / Next.js App Router）
- サーバーサイド処理なし、全てブラウザ内完結
- 非商用・無料公開

### 1.3 スコープ

- **Phase 1（本要件、Day 1〜3完了時点）**:
  - Tools インフラ整備
  - 画像変換ツール v1（シンプル + Web制作バッチ + 複数画像対応 + 容量自動調整）
- **Phase 2（将来）**: EXIF可視化・Before/Afterスライダー・顔検出クロップ
- **Phase 3（将来）**: 2本目以降のツール追加

### 1.4 想定ユースケース

| ユースケース | 想定モード |
|---|---|
| ブログ記事の画像1枚をサッと変換 | シンプルモード |
| SNS投稿用に画像を一括リサイズ | シンプルモード（プリセット利用） |
| **Web制作納品: 1案件で複数のヒーロー案(a/b/c/d) × 複数サイズ一括生成** | **バッチモード + 複数画像対応** |
| **容量制約あり（「250KB以下で」等）の最適化** | **バッチモード + 容量自動調整** |

---

## 2. 実依頼ケース分析（Day 3 設計の根拠）

### 2.1 依頼仕様

軽トラ運送サービスのWeb制作で、以下の画像納品を要求された：

**共通方針**:
- 形式: JPG
- 品質: 80〜85%
- カラープロファイル: sRGB
- メタデータ削除（EXIF等）

**画像種別と仕様**:

| 種別 | 比率 | PC用 (@2x) | スマホ用 |
|---|---|---|---|
| hero（ヒーロー） | 16:9 | 1600×900px, 200-300KB | 800×450px, 80-120KB |
| truck（荷台） | 3:2 | 1200×800px, 150-200KB | 600×400px, 60-90KB |
| tools（装備品） | 3:2 | 1200×800px, 150-200KB | 600×400px, 60-90KB |
| profile（顔写真） | 1:1 | 600×600px, 50-80KB（1サイズのみ） | - |

**ファイル名ルール**:

```
hero-a.jpg / hero-a@2x.jpg   ← a案
hero-b.jpg / hero-b@2x.jpg   ← b案
hero-c.jpg / hero-c@2x.jpg
hero-d.jpg / hero-d@2x.jpg
（truck, toolsも同様）
profile.jpg                  ← 1枚のみ
```

### 2.2 元画像の命名規則

依頼元から提供された元画像（12枚）の命名パターン：

```
[アスペクト比タグ]ー[コンセプト].png

例:
横ープロフェッショナル・信頼感.png    (16:9)  → hero-a 候補
横ー職人の誠実さ・広告感ゼロ.png      (16:9)  → hero-b 候補
横ー職人の手仕事・和の素材感.png      (16:9)  → hero-c 候補
横ー親しみ＋引き締め・CTA強め.png     (16:9)  → hero-d 候補

後ープロフェッショナル・信頼感.png    (3:2)   → truck-a 候補
後ー職人の誠実さ・広告感ゼロ.png      (3:2)   → truck-b 候補
...

袋ープロフェッショナル・信頼感.png    (3:2)   → tools-a 候補
袋ー職人の誠実さ・広告感ゼロ.png      (3:2)   → tools-b 候補
...
```

**重要な意味**:
- 「横 / 後 / 袋」はアスペクト比タグ（**物理情報**）
- 「プロフェッショナル / 誠実さ / 和の素材感 / 親しみ」は**コンセプトバリエーション**
- **どのコンセプトがa/b/c/dになるかはユーザー（Roy）が判断**

### 2.3 Day 3 設計への示唆

現状（Day 2 完了時点）では**1プロファイル = 1画像 = 1ファイル名**の制約があるため、実依頼を処理しようとすると：

- hero プロファイルを4つ（hero-a, hero-b, hero-c, hero-d）作成する必要
- 合計13プロファイル管理が必要 → **面倒、非現実的**

**Day 3 で追加する機能**:
1. **1プロファイルに複数画像を割り当て可能**に
2. **画像ごとのサフィックス手動入力**（`-a`, `-b`, `-c`, `-d` など自由）
3. **自動ファイル名生成**: `{baseFilename}{imageSuffix}{variantSuffix}.{ext}` = `hero-a@2x.jpg`

これにより、hero プロファイル1つに4画像を割り当てるだけで8ファイル一括生成できる。

### 2.4 運用フロー（Day 3 完成後）

```
1. JSON 構成ファイル読み込み（1回だけ作れば使い回し可能）
   → hero / truck / tools / profile の4プロファイル復元

2. 各プロファイルに画像を割り当て
   hero  ← 横ー*.png を4枚ドロップ、a/b/c/d と suffix 入力
   truck ← 後ー*.png を4枚ドロップ、a/b/c/d と suffix 入力
   tools ← 袋ー*.png を4枚ドロップ、a/b/c/d と suffix 入力
   profile ← 田村さん写真を1枚ドロップ

3. 「全て生成」クリック
   → 合計 8+8+8+1 = 25ファイル生成
     （依頼仕様の13ファイルを含む完全セット）

4. ZIP でDL → 納品
```

---

## 3. 情報設計

### 3.1 サイトマップ

```
noviqlab.com/
├── /                    ← トップ（Toolsセクション追加済み）
├── /contact             ← 既存
└── /tools               ← ツール一覧（Day 1実装済み）
    └── /image-resizer   ← 画像変換ツール（Day 1-3で完成予定）
```

### 3.2 URL設計ルール

- `/tools/{kebab-case-slug}` 形式で統一
- 将来 `/tools/exif-cleaner`, `/tools/ogp-generator` など追加可能

### 3.3 SEO方針

- `/tools` と `/tools/image-resizer`: `index, follow`
- メタタグは `layout.tsx` で設定（`"use client"` 制約のため page.tsx から分離済み）

---

## 4. 画面設計

### 4.1 トップページ（Day 1実装済み）

既存「主な活動」の下に「Tools」セクション追加完了。
`ToolCard` コンポーネントを使用。

### 4.2 `/tools` 一覧ページ（Day 1実装済み）

パンくず + Toolsリード文 + ツールカードリスト。

### 4.3 `/tools/image-resizer` ツール本体

#### 4.3.1 モード切替UI（Day 1実装済み）

- 「シンプル」タブ + 「Web制作バッチ」タブ
- localStorage でモード記憶（Day 2実装済み）
- SSR対応（hydration前は非表示）

#### 4.3.2 シンプルモード（Day 1実装済み、Day 2でリファクタ済み）

- 汎用リサイズ・形式変換
- 画質スライダー、リサイズ、調整（明るさ・コントラスト・彩度）
- SNSプリセット、ZIP一括DL

#### 4.3.3 Web制作バッチモード（Day 2実装済み、Day 3で拡張）

**現状（Day 2完了時点）**:
- プロファイル作成・編集・削除
- 組み込みプリセット6種
- 容量目標自動調整（動作確認済み、上限ギリギリの最適化を実現）
- JSON import/export + localStorage
- 1プロファイル = 1画像 = 複数バリアント

**Day 3 で追加する画像割り当てUI**:

```
┌─ hero プロファイル ──────────[編集][削除]──┐
│ 16:9 · JPEG                                  │
│ hero-*@2x.jpg — 1600×900px / 200-300KB      │
│ hero-*.jpg   —  800×450px /  80-120KB       │
│                                              │
│ 画像を割り当てて生成:                        │
│ ┌──────────────────────────────────────┐    │
│ │ [画像を一括ドロップ or クリック選択] │    │
│ └──────────────────────────────────────┘    │
│                                              │
│ 割当済み（4枚）:                             │
│ ┌─────────────────────────────────────┐     │
│ │ [thumb] 横ープロフェッショナル.png   │     │
│ │ suffix: [-a          ]   [削除]      │     │
│ ├─────────────────────────────────────┤     │
│ │ [thumb] 横ー職人の誠実さ.png         │     │
│ │ suffix: [-b          ]   [削除]      │     │
│ ├─────────────────────────────────────┤     │
│ │ [thumb] 横ー職人の手仕事.png         │     │
│ │ suffix: [-c          ]   [削除]      │     │
│ ├─────────────────────────────────────┤     │
│ │ [thumb] 横ー親しみ＋引き締め.png     │     │
│ │ suffix: [-d          ]   [削除]      │     │
│ └─────────────────────────────────────┘     │
│                                              │
│ 生成予定: 8ファイル                          │
│ → hero-a.jpg (目標 80-120KB)                 │
│ → hero-a@2x.jpg (目標 200-300KB)             │
│ → hero-b.jpg (目標 80-120KB)                 │
│ → hero-b@2x.jpg (目標 200-300KB)             │
│ → hero-c.jpg, hero-c@2x.jpg                  │
│ → hero-d.jpg, hero-d@2x.jpg                  │
└──────────────────────────────────────────────┘
```

**サフィックスの扱い**:
- 画像追加時は**デフォルトで空**
- ユーザーが手動入力（`-a`, `-b`, `-c`, `-d` でも `-pro`, `-v1` でも自由）
- **同じsuffixが複数あるとバリデーションエラー**（ファイル名衝突回避）
- 1枚だけ割り当て時は空文字でもOK（profile.jpg ケース）

#### 4.3.4 プロファイル編集ダイアログ（Day 2実装済み、Day 3で一部拡張）

**Day 3 追加項目**:
- バリアントに `minBytes`（容量下限）入力欄追加
- 既存の `maxBytes` と合わせて「200-300KB」の範囲指定が可能に

#### 4.3.5 組み込みプリセット（Day 2実装済み、Day 3で仕様調整）

**プリセットのベースファイル名変更**:

Day 2 現状のプリセットは `baseFilename: "hero"` などだが、Day 3 では:
- `hero` プロファイルのデフォルト baseFilename = `hero`（変更なし）
- 画像割当時に**suffix を追加することで `hero-a.jpg` に展開**
- サフィックス未入力なら `hero.jpg`（1枚運用時の互換性維持）

| プリセット名 | 内容 |
|---|---|
| Web制作・ヒーロー用 | 16:9 / @2x 1600×900 200-300KB / mobile 800×450 80-120KB |
| Web制作・コンテンツ用 | 3:2 / @2x 1200×800 150-200KB / mobile 600×400 60-90KB |
| Web制作・プロフィール | 1:1 / 600×600 50-80KB |
| ブログ記事用 | WebP / @2x 1600×900 200KB / mobile 800×450 80KB |
| EC商品写真 | 1:1 / 大 1200×1200 / サムネ 300×300 |
| OGP / SNS | 1200×630 JPEG 200KB |

**Day 3 での変更**: 各プリセットに `minBytes` を追加（例: heroの@2xは200KB下限）

---

## 5. デザインガイド（Day 1-2で確立、Day 3も踏襲）

### 5.1 カラーパレット

| 用途 | カラー |
|---|---|
| 背景 | `#0b1120` |
| カード | `bg-white/5` |
| カードホバー | `bg-white/10` |
| アクセント | `sky-400` / `sky-500` |
| エラー | `red-400` |
| 警告 | `amber-400` |

### 5.2 コンポーネント統一ルール

- カード: `bg-white/5 rounded-xl p-4`
- プライマリボタン: `bg-sky-500 hover:bg-sky-400 text-white rounded-xl`
- セクションラベル: `text-xs uppercase tracking-widest text-white/40`

### 5.3 Day 3 新規UI要素

- **画像カード（割当済み）**: サムネ + ファイル名 + サフィックス入力 + 削除ボタン
- **生成予定リスト**: `text-xs text-white/50` でファイル名を一覧表示
- **サフィックス衝突警告**: 入力欄下に `text-xs text-red-400` で表示

---

## 6. 機能要件

### 6.1 シンプルモード機能（Day 1実装済み）

S-01〜S-16（v2.0と同じ、変更なし）

### 6.2 Web制作バッチモード基本機能（Day 2実装済み）

B-01〜B-17（v2.0と同じ、変更なし）

### 6.3 Day 3 追加機能

| No | 機能 | 優先度 |
|---|---|---|
| D-01 | **1プロファイルに複数画像割り当て** | 必須 |
| D-02 | **画像ごとのサフィックス手動入力** | 必須 |
| D-03 | **サフィックス重複バリデーション** | 必須 |
| D-04 | **元ファイル名表示**（どの画像がどのsuffixか分かる） | 必須 |
| D-05 | 容量下限指定（minBytes） | 必須 |
| D-06 | 容量範囲（minBytes〜maxBytes）での自動調整 | 必須 |
| D-07 | sRGB変換（createImageBitmap使用） | 推奨 |
| D-08 | 画像ごとのサムネイルプレビュー | 必須 |
| D-09 | 画像の並べ替え（ドラッグで順序変更） | 任意 |
| D-10 | 生成予定ファイル名プレビュー（実時間更新） | 必須 |

### 6.4 ファイル名生成ロジック（Day 3 改訂版）

```typescript
function generateFilename(
  baseFilename: string,      // "hero"
  imageSuffix: string,       // "-a" (画像ごと、空でもOK)
  variantSuffix: string,     // "@2x" (バリアントごと、空でもOK)
  ext: string                // "jpg"
): string {
  return `${baseFilename}${imageSuffix}${variantSuffix}.${ext}`;
}

// 例:
// baseFilename="hero", imageSuffix="-a", variantSuffix="@2x" → "hero-a@2x.jpg"
// baseFilename="hero", imageSuffix="-a", variantSuffix=""    → "hero-a.jpg"
// baseFilename="profile", imageSuffix="", variantSuffix=""   → "profile.jpg"
```

### 6.5 容量範囲自動調整アルゴリズム（Day 3 改訂版）

```typescript
async function encodeToTargetRange(
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  minBytes: number | undefined,
  maxBytes: number | undefined,
  maxIterations = 8
): Promise<{ blob: Blob; quality: number; warning?: string }> {
  // minBytes/maxBytes 両方あり: 範囲内で最高品質
  // maxBytesのみ: 従来通り、上限以下で最高品質
  // minBytesのみ: 下限以上でできるだけ低品質（容量節約）
  // 両方なし: 品質85%固定

  if (!minBytes && !maxBytes) {
    return encodeAtQuality(canvas, format, 0.85);
  }

  if (!minBytes) {
    // 従来のmaxBytesのみアルゴリズム
    return encodeToTargetSize(canvas, format, maxBytes!, maxIterations);
  }

  // 範囲指定の場合: 二分探索で maxBytes 以下の最大品質を探し、
  // それが minBytes 以上なら成功、未満なら「軽量すぎ」の警告
  const result = await encodeToTargetSize(canvas, format, maxBytes!, maxIterations);
  if (result.blob.size < minBytes) {
    return {
      ...result,
      warning: `容量が下限(${minBytes}B)を下回っています (${result.blob.size}B)`,
    };
  }
  return result;
}
```

### 6.6 バリデーション要件

Day 3 で追加するバリデーション：

- **サフィックスの一意性**: 同一プロファイル内で重複不可
- **サフィックスの文字制限**: 半角英数 + `-`, `_` のみ（ファイル名セーフ）
- **プロファイル名の表示名 vs baseFilename**: 明確に区別（編集UIで両方編集可）
- **割り当てファイル数の上限**: 50枚（実用上十分、メモリ保護）

### 6.7 sRGB 変換の実装方針（D-07）

```typescript
// 画像読み込み時に createImageBitmap を使用してsRGBに正規化
async function loadImageAsSrgb(file: File): Promise<ImageBitmap> {
  return await createImageBitmap(file, {
    colorSpaceConversion: "default", // sRGBに正規化
    imageOrientation: "from-image",  // EXIF回転を適用
  });
}
```

- 既存の `HTMLImageElement` ベース処理と**両方サポート**する抽象化層が必要
- フォールバック: `createImageBitmap` 非対応環境では `HTMLImageElement` 使用（Canvas再描画で近似sRGB）
- `imageProcessor.ts` の `processImage` シグネチャを拡張

---

## 7. 非機能要件

### 7.1 パフォーマンス

- バッチモードで**複数プロファイル × 複数画像 × 複数バリアント**の処理時もUI応答性維持
- 例: 3プロファイル × 4画像 × 2バリアント = 24ファイル生成でも30秒以内
- `setTimeout(0)` または `requestIdleCallback` で yield

### 7.2 互換性

- Chrome / Edge / Safari / Firefox 最新2バージョン
- AVIFエンコード非対応ブラウザでは UI除外
- `createImageBitmap` 非対応時のフォールバック動作

### 7.3 セキュリティ・プライバシー

- 全てブラウザ内処理
- `localStorage` には構成のみ保存（画像本体は保存しない）
- Cookieなし、トラッキングなし

### 7.4 メンテナンス性

- `imageProcessor.ts` を中心に共通処理を集約（Day 2で確立）
- 型定義は `types.ts` に集約
- プリセットは `builtinPresets.ts` に分離

---

## 8. ファイル構成（Day 3 完了時点）

```
E:\app\noviqlab\noviqlab-site\
├── app/
│   ├── page.tsx                        ← Day 1改修済み
│   ├── contact/page.tsx                ← 既存
│   ├── tools/
│   │   ├── page.tsx                    ← Day 1実装済み
│   │   ├── layout.tsx                  ← Day 1実装済み
│   │   └── image-resizer/
│   │       ├── page.tsx                ← Day 1実装、Day 2でlocalStorage追加
│   │       ├── layout.tsx              ← Day 1実装（metadata用）
│   │       ├── SimpleMode.tsx          ← Day 1実装、Day 2でリファクタ
│   │       ├── BatchMode.tsx           ← Day 2実装、Day 3で拡張
│   │       ├── ProfileEditor.tsx       ← Day 2実装、Day 3で拡張
│   │       ├── types.ts                ← Day 2実装、Day 3で拡張
│   │       ├── imageProcessor.ts       ← Day 2実装、Day 3で拡張（sRGB対応）
│   │       └── builtinPresets.ts       ← Day 2実装、Day 3で調整
│   └── layout.tsx                      ← 既存
├── components/tools/
│   ├── Breadcrumb.tsx                  ← Day 1実装済み
│   └── ToolCard.tsx                    ← Day 1実装済み
├── docs/tools/
│   ├── REQUIREMENTS.md                 ← 本文書（v3.0）
│   ├── CLAUDE_CODE_DAY1.md             ← Day 1指示書
│   ├── CLAUDE_CODE_DAY2.md             ← Day 2指示書
│   └── CLAUDE_CODE_DAY3.md             ← Day 3指示書（次に作成）
└── E:\app\noviqlab\page.tsx            ← Geminiオリジナル雛形（参考用）
```

---

## 9. Geminiコード由来のバグ修正（Day 1で全適用済み、Day 2でさらに統合）

全項目、Day 1 実装時に適用完了。Day 2 で共通関数化してさらに一元管理。

1. ✅ JSZip npm 化
2. ✅ step-down resize `&&` → `||` 修正
3. ✅ AVIF エンコード対応検出
4. ✅ Object URL メモリリーク対策（6箇所）
5. ✅ 未使用 import 整理
6. ✅ non-null assertion 除去

---

## 10. 実装順序とマイルストーン

### ✅ Day 1（完了、4時間）

### ✅ Day 2（完了、約5時間）

### ⏳ Day 3（予定、2〜3時間）

1. **型定義拡張**（30分）
   - `types.ts` に `AssignedImage` 追加、`BatchProfileAssignment.images` を配列化
   - `Variant.minBytes` 追加

2. **imageProcessor.ts 拡張**（30分）
   - `encodeToTargetRange` 追加（minBytes対応）
   - `loadImageAsSrgb` 追加（createImageBitmap）
   - 既存関数の後方互換性維持

3. **BatchMode.tsx UI改修**（1〜1.5時間）
   - 画像割当UI複数化
   - サフィックス入力欄追加
   - 重複バリデーション
   - 生成予定ファイル名リアルタイムプレビュー

4. **ProfileEditor.tsx 拡張**（30分）
   - バリアントに minBytes 入力欄

5. **builtinPresets.ts 調整**（15分）
   - 各プリセットに minBytes を実依頼仕様通りに設定

6. **動作確認**（30〜60分）
   - 実依頼ケース13ファイル再現テスト

---

## 11. 統合テスト項目（Day 3 追加分）

### 11.1 シンプルモード退行テスト（最低4パターン）

Day 1 の12パターンのうち、主要4つを再実施：
1. PNG透過 → JPEG白背景
2. 横長画像リサイズ
3. 複数ファイル + ZIP
4. AVIF検出

### 11.2 バッチモード退行テスト（最低5パターン）

Day 2 の10パターンのうち、重要5つを再実施：
1. プロファイル作成・編集
2. 容量目標250KB達成
3. 達成不可能時の警告
4. JSON Export/Import
5. localStorage 復元

### 11.3 Day 3 新機能テスト（10パターン）

1. **1プロファイルに4画像割当 → 8ファイル生成**
2. **サフィックス重複時のバリデーションエラー表示**
3. **サフィックス未入力（空）での1枚運用**
4. **元ファイル名が画像カードに表示される**
5. **生成予定ファイル名が入力に応じてリアルタイム更新**
6. **サフィックス削除後の再入力**
7. **minBytes設定（200-300KB範囲）での容量調整**
8. **範囲未達時（容量軽すぎ）の警告表示**
9. **sRGB 変換動作（`createImageBitmap` 使用の確認）**
10. **画像の割当順序がファイル名展開順に反映される**

### 11.4 実依頼ケース完全再現（Phase 1 完了判定）

**テストシナリオ**:

```
1. JSON 構成ファイルを事前に作成・保存
   （hero / truck / tools / profile の4プロファイル）

2. JSON読込 → 4プロファイル復元

3. 各プロファイルに画像割当:
   - hero: 横ー*.png 4枚、suffix a/b/c/d
   - truck: 後ー*.png 4枚、suffix a/b/c/d
   - tools: 袋ー*.png 4枚、suffix a/b/c/d
   - profile: 田村さん写真1枚、suffix 空

4. 「全て生成」

5. 生成結果確認:
   - hero-a.jpg (~100KB) / hero-a@2x.jpg (~250KB) ← 200-300KB範囲
   - hero-b.jpg / hero-b@2x.jpg
   - hero-c.jpg / hero-c@2x.jpg
   - hero-d.jpg / hero-d@2x.jpg
   - truck-a.jpg (~70KB) / truck-a@2x.jpg (~170KB)
   - ... (truck-b, c, d 同様)
   - tools-a.jpg ~ tools-d@2x.jpg
   - profile.jpg (~65KB)

   合計: 25ファイル（依頼の13ファイルを含む完全セット）

6. ZIP DL → 納品用パッケージ完成
```

**合格基準**:
- 全25ファイル生成成功
- **依頼仕様の容量範囲を全て達成**（±10%の許容）
- ファイル名が依頼仕様と完全一致
- メモリリークなし

---

## 12. 完了判定基準（Phase 1 全体）

### ✅ Day 1 完了基準（達成済み）

- [x] `/` からToolsセクションが見え、`/tools` へ遷移できる
- [x] `/tools` から `/tools/image-resizer` へ遷移できる
- [x] シンプルモード12パターン全合格
- [x] `npm run build` エラー・警告なし

### ✅ Day 2 完了基準（達成済み）

- [x] バッチモード10パターン全合格
- [x] 容量自動調整が上限ギリギリで最適化
- [x] JSON import/export 動作
- [x] localStorage 自動保存・復元

### ⏳ Day 3 完了基準（Phase 1 全体の合格ライン）

- [ ] 複数画像割当機能が動作
- [ ] サフィックス手動入力・重複バリデーション
- [ ] minBytes 範囲指定での容量調整
- [ ] 新機能10パターン全合格
- [ ] **実依頼ケース25ファイル生成、依頼仕様通りの容量・ファイル名**
- [ ] `npm run build` 成功
- [ ] Lighthouse Performance 90+ / Accessibility 90+

---

## 13. リスクと対策（Day 3 追加分）

| リスク | 対策 |
|---|---|
| 複数画像処理時のメモリ消費 | 50枚上限、逐次処理、Object URL 即時解放 |
| サフィックス入力の操作性 | デフォルト空、TAB移動で連続入力しやすく |
| `createImageBitmap` 非対応ブラウザ | 検出して `HTMLImageElement` にフォールバック |
| バリデーションの煩わしさ | リアルタイムバリデーション、エラーは分かりやすく |
| 既存JSON構成との後方互換 | `version` フィールドでマイグレーション、v1.0（単一画像）は読み込めるように |

---

## 14. JSONスキーマ v2.0（Day 3 対応版）

```json
{
  "version": "2.0",
  "profiles": [
    {
      "id": "uuid-1",
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
          "id": "v1",
          "name": "@2x",
          "width": 1600,
          "height": 900,
          "minBytes": 204800,
          "maxBytes": 307200,
          "suffix": "@2x"
        },
        {
          "id": "v2",
          "name": "mobile",
          "width": 800,
          "height": 450,
          "minBytes": 81920,
          "maxBytes": 122880,
          "suffix": ""
        }
      ]
    }
  ],
  "exportedAt": "2026-04-20T21:30:00.000Z"
}
```

**v1.0 からの変更点**:
- `Variant.minBytes` 追加（オプショナル）
- `Profile.displayName` 追加（UIでの表示名、任意）
- `version` を `"1.0"` → `"2.0"` に更新

**互換性**:
- v1.0 のJSONも読み込み可能（`minBytes` 未定義として扱う）
- v2.0 エクスポート時は必ず `version: "2.0"` で出力

---

## 15. Phase 2 候補機能（本要件外、メモ）

- **EXIF剥がし + 可視化**（`exifr` ライブラリ）
- **Before/Afterスライダー比較**（CSS clip-path）
- **顔検出自動クロップ**（face-api.js or BlazeFace）→ profile画像用
- **プロファイル共有URL**（JSON→URL safe base64）
- **WebWorker化**（処理並列化）

---

**以上**
