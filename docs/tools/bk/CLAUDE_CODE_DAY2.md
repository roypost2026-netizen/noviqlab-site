# ClaudeCode 実装指示: Day 2 - Web制作バッチモード

**対象プロジェクト**: `E:\app\noviqlab\noviqlab-site`
**関連ドキュメント**:
- `docs/tools/REQUIREMENTS.md`（v2.0）
- `docs/tools/CLAUDE_CODE_DAY1.md`（Day 1 実装記録）

**所要時間目安**: 5〜6時間
**前提**: Day 1 完了済み（`/tools/image-resizer` のシンプルモード動作確認済み）
**ゴール**: Web制作バッチモードが動作し、実際の顧客案件（hero-a / truck-a / tools-a / profile.jpg）を再現できる状態

---

## 事前準備

### 0.1 要件定義書の確認

実装前に必ず以下を読むこと：

- **`docs/tools/REQUIREMENTS.md`**
  - セクション 3.3.3, 3.3.4, 3.3.5（バッチモード画面設計・プロファイル編集モーダル・組み込みプリセット）
  - セクション 5.4, 5.5, 5.6（バッチモード機能・容量目標自動調整アルゴリズム・JSON形式）
  - セクション 10.2, 10.3（統合テスト項目）
  - セクション 12（リスクと対策）

### 0.2 Day 1 の成果物確認

以下のファイルが存在することを確認：

```
app/tools/image-resizer/
├── layout.tsx           ← Day 1作成（metadata）
├── page.tsx             ← Day 1作成（モード切替タブ、バッチタブは無効化済み）
└── SimpleMode.tsx       ← Day 1作成（バグ修正適用済み）
```

**重要**: Day 1 で `SimpleMode.tsx` に実装した画像処理ロジック（`processImage` 関数、AVIF 検出、メモリリーク対策）は**Day 2 で共通化して抽出**する。この時、Day 1 のシンプルモードが**引き続き正常動作する**ように注意。

### 0.3 Day 1 からの申し送り事項（前提情報）

- `page.tsx` に `"use client"` がある制約上、metadata は `layout.tsx` で分離する構成を採用済み
- `SimpleMode.tsx` 内の画像処理ロジックは、Day 2 で `imageProcessor.ts` に抽出する設計で書かれている
- モード切替タブで「Web制作バッチ」は現在**無効化状態**。Day 2 で有効化する

---

## 実装タスク

### Task 1: 型定義の作成（30分）

#### 1.1 `app/tools/image-resizer/types.ts`（新規）

バッチモードとシンプルモードで共有する型を定義。

**定義すべき型**:

```typescript
// 既存のシンプルモード由来の型
export type OutputFormat = "image/jpeg" | "image/png" | "image/webp" | "image/avif";
export type FileStatus = "waiting" | "processing" | "done" | "error";

// バッチモード用の型
export type AspectRatioPreset = "16:9" | "3:2" | "4:3" | "1:1" | "custom";
export type CropPosition = "center" | "top" | "bottom";

export interface AspectRatio {
  type: "preset" | "custom";
  value: AspectRatioPreset; // custom の場合は "custom"
  customWidth?: number;     // type === "custom" の場合のみ
  customHeight?: number;
}

export interface Variant {
  id: string;
  name: string;           // "@2x" / "mobile" など
  width: number;
  height: number;
  maxBytes?: number;      // 容量上限（指定時は自動調整）
  suffix: string;         // ファイル名に付けるサフィックス（"@2x" など、空でも可）
}

export interface Profile {
  id: string;
  name: string;                 // "hero" / "truck" など
  baseFilename: string;         // "hero-a" / "truck-a" など
  aspectRatio: AspectRatio;
  cropPosition: CropPosition;
  format: OutputFormat;
  convertToSrgb: boolean;       // sRGB変換（将来拡張用、現状 Canvas ベースでは自動）
  stripMetadata: boolean;       // メタデータ削除（Canvas 再描画で実現）
  variants: Variant[];
}

export interface BatchProfileAssignment {
  profileId: string;
  file: File | null;            // プロファイルに割り当てられたファイル
  previewUrl?: string;          // プレビュー表示用
  results?: BatchVariantResult[];
  status: FileStatus;
}

export interface BatchVariantResult {
  variantId: string;
  filename: string;             // 最終ファイル名
  blob: Blob;
  actualBytes: number;
  targetBytes?: number;
  warning?: string;             // 「目標容量に収まらなかった」等の警告
}

// JSONエクスポート用の全体構造
export interface BatchConfigJson {
  version: string;              // "1.0"
  profiles: Profile[];
  exportedAt: string;           // ISO8601
}
```

**注意**: シンプルモードの `ImageFile` / `Settings` インターフェースは**従来通り SimpleMode.tsx 内で定義**し、共通化しない（用途が異なるため）。

---

### Task 2: 画像処理ロジックの共通化（1時間）

#### 2.1 `app/tools/image-resizer/imageProcessor.ts`（新規）

シンプルモードの画像処理ロジックを抽出・再構成し、バッチモードでも使える形にする。

**必須関数**:

```typescript
// Day 1 の detectAvifSupport を移植
export async function detectAvifSupport(): Promise<boolean> { ... }

// Canvas → Blob の基本変換
export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  quality: number
): Promise<Blob | null> { ... }

// step-down 段階縮小（バグ修正後のロジック）
export function stepDownResize(
  img: HTMLImageElement,
  targetW: number,
  targetH: number
): HTMLCanvasElement { ... }

// クロップ + リサイズ処理（バッチモード用の新規機能）
export function cropAndResize(
  img: HTMLImageElement,
  aspectRatio: AspectRatio,
  cropPosition: CropPosition,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement { ... }

// 容量目標自動調整（要件 5.5 のアルゴリズム実装）
export async function encodeToTargetSize(
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  targetBytes: number,
  maxIterations?: number
): Promise<{ blob: Blob; quality: number; attempts: number }> { ... }

// JPEG背景色塗り（透過対応）
export function fillJpegBackground(
  canvas: HTMLCanvasElement,
  bgColor: string
): void { ... }
```

#### 2.2 クロップロジック詳細（`cropAndResize` 仕様）

**ステップ**:

1. 目標アスペクト比を計算（`16:9` → 1.778、`1:1` → 1.0 など）
2. 元画像のアスペクト比と比較
3. **元画像が目標より横長** → 左右を切る（cropPosition は影響しない、常に中央カット）
4. **元画像が目標より縦長** → 上下を切る（cropPosition で上/中央/下を選択）
5. クロップ後の領域を step-down で目標サイズに縮小

**クロップ位置の適用**:

```typescript
// 縦長画像を横長比率でクロップする場合
const excessHeight = img.height - targetAspectHeight;
let cropY: number;
switch (cropPosition) {
  case "top":    cropY = 0; break;
  case "bottom": cropY = excessHeight; break;
  case "center":
  default:       cropY = excessHeight / 2; break;
}
```

#### 2.3 容量目標自動調整の実装詳細

要件 5.5 のアルゴリズムをベースに、以下を追加：

- **PNGの扱い**: PNG は品質パラメータが効かないので、`targetBytes` が指定されていても品質調整せず一度変換して返す（ただし超過時は警告を返す）
- **初回85%で OK なら即返す**（よくあるケースの高速化）
- **超過し続ける場合**: 最低品質（0.1）でも超過なら、最終Blob + 警告メッセージを返す
- **戻り値**: `{ blob, quality, attempts }` の構造（デバッグ用に試行回数も返す）

#### 2.4 SimpleMode.tsx のリファクタ

`SimpleMode.tsx` 内で定義されていた以下を `imageProcessor.ts` の関数で置き換える：

- `detectAvifSupport` → import
- step-down while ループ部分 → `stepDownResize` に抽出
- `canvas.toBlob` のPromise化 → `canvasToBlob` に抽出
- JPEG背景色塗り → `fillJpegBackground` に抽出

**重要**: SimpleMode の**既存動作を壊さない**。リファクタ後、Day 1 で動作確認した12パターンが引き続き動くことを最終テストで確認する。

---

### Task 3: 組み込みプリセット定義（30分）

#### 3.1 `app/tools/image-resizer/builtinPresets.ts`（新規）

要件 3.3.5 の6種類を定義。

```typescript
import { Profile } from "./types";

export const BUILTIN_PRESETS: Array<{
  presetName: string;      // UI表示名
  description: string;     // 短い説明
  profiles: Omit<Profile, "id">[];  // プロファイル定義（idは読み込み時に生成）
}> = [
  {
    presetName: "Web制作・ヒーロー用",
    description: "16:9のヒーロー画像をPC用とモバイル用の2サイズで出力",
    profiles: [
      {
        name: "hero",
        baseFilename: "hero",
        aspectRatio: { type: "preset", value: "16:9" },
        cropPosition: "center",
        format: "image/jpeg",
        convertToSrgb: true,
        stripMetadata: true,
        variants: [
          {
            id: "v-hero-2x",
            name: "@2x",
            width: 1600,
            height: 900,
            maxBytes: 256000,  // 250KB
            suffix: "@2x",
          },
          {
            id: "v-hero-sp",
            name: "mobile",
            width: 800,
            height: 450,
            maxBytes: 102400,  // 100KB
            suffix: "",
          },
        ],
      },
    ],
  },
  // 残り5種類を同様に定義：
  // - "Web制作・コンテンツ用"（3:2、@2x 1200×800 200KB / mobile 600×400 90KB）
  // - "Web制作・プロフィール"（1:1、600×600 80KB）
  // - "ブログ記事用"（WebP、@2x 1600×900 200KB / mobile 800×450 80KB）
  // - "EC商品写真"（1:1、大 1200×1200 / サムネ 300×300）
  // - "OGP / SNS"（1200×630 JPEG 200KB）
];
```

**注意**:
- プリセット読み込み時、`id` は `crypto.randomUUID()` or `Math.random()+Date.now()` で新規生成
- プリセットは**参照用定数**。ユーザーが編集する場合、常にコピーを作る（プリセット本体は不変）

---

### Task 4: プロファイル編集モーダル（1.5時間）

#### 4.1 `app/tools/image-resizer/ProfileEditor.tsx`（新規）

要件 3.3.4 のダイアログを実装。

**Props**:

```typescript
interface ProfileEditorProps {
  profile: Profile | null;  // null の場合は新規作成
  isOpen: boolean;
  onSave: (profile: Profile) => void;
  onClose: () => void;
  avifSupported: boolean;   // AVIFボタン表示制御
}
```

**機能仕様**:

1. **モーダル表示**: `isOpen` で制御、背景クリック or Esc で閉じる
2. **プロファイル名・ベースファイル名**: テキスト入力
3. **比率選択**: セレクトボックス（16:9 / 3:2 / 4:3 / 1:1 / カスタム）
   - カスタム選択時のみ幅・高さ入力欄表示
4. **クロップ位置**: ラジオボタン（中央 / 上 / 下）
5. **出力形式**: セレクトボックス（JPEG / PNG / WebP / AVIF※対応時のみ）
6. **sRGB変換 / メタデータ削除**: チェックボックス（デフォルトON）
7. **バリアントリスト**:
   - 各バリアントを折り畳み可能なカード形式で表示
   - サイズ、容量上限、サフィックス、名前を編集可能
   - 「+ バリアント追加」で新規追加
   - 各バリアント右上に「削除」ボタン
8. **保存ボタン**:
   - バリデーション: 名前必須、ベースファイル名必須、バリアント1個以上
   - 保存時は `id` を割り当てて `onSave` コール

**UIデザイン**（要件 4.4 準拠）:

```
- モーダル背景: 半透明オーバーレイ (bg-black/60)
- モーダル本体: bg-[#0b1120] border border-white/10 rounded-2xl p-6 max-w-lg max-h-[90vh] overflow-y-auto
- 入力フィールド: bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-400
- バリアントカード: bg-white/5 rounded-xl p-3
```

**重要事項**:

- **容量上限入力の単位**: UI上は「KB」で入力させ、内部的には bytes で保持（×1024）
- **サイズプレビュー**: バリアント入力時、入力値に応じて「1600 × 900 px (250KB)」のような要約表示
- フォーム要素は HTML の `<form>` タグを**使わない**（onClick ハンドラで制御）

---

### Task 5: バッチモード本体（1.5時間）

#### 5.1 `app/tools/image-resizer/BatchMode.tsx`（新規）

要件 3.3.3 の画面を実装。

**状態管理**:

```typescript
const [profiles, setProfiles] = useState<Profile[]>([]);
const [assignments, setAssignments] = useState<BatchProfileAssignment[]>([]);
const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
const [isEditorOpen, setIsEditorOpen] = useState(false);
const [isProcessing, setIsProcessing] = useState(false);
const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
```

**主要機能**:

1. **プロファイル管理**:
   - 「+ プロファイル追加」→ `ProfileEditor` を新規モードで開く
   - 既存プロファイルの「編集」→ `ProfileEditor` を編集モードで開く
   - 「削除」→ 確認ダイアログ後に削除

2. **プリセット読み込み**:
   - ドロップダウンから `BUILTIN_PRESETS` を選択
   - 選択時、プロファイルを**追加**（既存を置き換えない）

3. **JSON Import/Export**:
   - **Export**: 現在のプロファイル構成を JSON ダウンロード（ファイル名 `batch-config-YYYY-MM-DD.json`）
   - **Import**: `<input type="file" accept=".json">` で受け取り、バリデーション後にプロファイルに反映
   - バリデーション: `version`, `profiles` 配列の存在、各プロファイルの必須フィールド確認
   - エラー時はアラート表示

4. **localStorage 自動保存**:
   - プロファイル構成が変わるたびに `localStorage.setItem("image-resizer-batch-profiles", JSON.stringify(profiles))`
   - マウント時に読み込み、失敗時は空配列で初期化
   - キー: `"image-resizer-batch-profiles"`

5. **画像割り当てUI**:
   - プロファイルごとにドロップゾーンカード表示
   - 各カード: プロファイル名、ベースファイル名、生成予定ファイル名プレビュー
   - ドロップ or クリックでファイル選択
   - ファイル割当後: サムネイル + ファイル名表示

6. **一括生成**:
   - 「全て生成」ボタン
   - 処理中はプログレスバー表示（done / total）
   - 各アサインメントについて、全バリアントを順次処理
   - 結果を `BatchVariantResult[]` として `assignments` に保存
   - 処理順序: プロファイル順 → バリアント順、ブラウザ負荷軽減のため各処理間に `await new Promise(r => setTimeout(r, 0))` 挿入

7. **結果表示**:
   - 各プロファイルカード内に結果一覧
   - ファイル名、実容量、警告（あれば）を表示
   - 目標容量達成: `text-sky-400`、超過: `text-amber-400` + 警告アイコン

8. **ZIP DL**:
   - 「ZIPでDL」ボタン（全結果を含む）
   - ファイル名ルール: `{baseFilename}{suffix}.{ext}`（例: `hero-a@2x.jpg`）
   - サフィックスが空なら `{baseFilename}.{ext}`
   - 同名ファイルがあった場合: 2つ目以降に `-2`, `-3` 付与

#### 5.2 ファイル名生成ロジック

```typescript
function generateFilename(
  profile: Profile,
  variant: Variant,
  existingFilenames: Set<string>
): string {
  const ext = FORMAT_EXT[profile.format]; // "jpg" / "png" / "webp" / "avif"
  const base = profile.baseFilename;
  const suffix = variant.suffix || "";
  let candidate = `${base}${suffix}.${ext}`;

  if (!existingFilenames.has(candidate)) return candidate;

  let counter = 2;
  while (existingFilenames.has(`${base}${suffix}-${counter}.${ext}`)) {
    counter++;
  }
  return `${base}${suffix}-${counter}.${ext}`;
}
```

---

### Task 6: モード切替の有効化（30分）

#### 6.1 `app/tools/image-resizer/page.tsx` の更新

Day 1 で無効化していた「Web制作バッチ」タブを**有効化**する。

**変更点**:

1. **`BatchMode` を import**
2. **タブの無効化を解除**（`disabled`, `opacity-40`, `cursor-not-allowed` を削除）
3. **アクティブタブに応じて `<SimpleMode />` or `<BatchMode />` を描画**
4. **localStorage でモード記憶**を実装:
   - キー: `"image-resizer-mode"`
   - 初期読み込み時に `localStorage` から復元
   - モード切替時に保存
   - SSR対応: `useEffect` 内で読み込み、初期値はデフォルト（"simple"）

**モード切替時の注意**:

- 切替時に**状態はクリアしない**（シンプル/バッチ間で状態は完全分離）
- ただし、SimpleMode側のObject URL等はアンマウント時にクリーンアップされること（Day 1 で実装済み）
- BatchMode も同様に、アンマウント時にObject URLをクリーンアップ

---

### Task 7: 動作確認（1時間）

#### 7.1 開発サーバー起動

```bash
npm run dev
```

→ `http://localhost:3001/tools/image-resizer` （もしくは3100、Royさんの環境に合わせる）

#### 7.2 シンプルモードの退行確認（リファクタ影響チェック）

**Day 1 で実施した12パターンのうち、以下4つを再テスト**（リファクタで壊れてないか確認）:

1. PNG透過 → JPEG 背景色白（要件10.1の#1）
2. 横長画像（3000×500）→ 幅800リサイズ（要件10.1の#3）
3. 複数ファイル（5枚）一括変換 + ZIP DL（要件10.1の#7,#8）
4. AVIF検出動作（要件10.1の#11）

いずれかが Day 1 と違う挙動をした場合、`imageProcessor.ts` への抽出時にロジック破損している可能性があるため、**必ず報告**して修正する。

#### 7.3 バッチモード統合テスト（要件10.2 の10パターン全て）

要件 10.2 の #13〜#22 を実施。特に重要なもの:

- **#16: 容量目標250KB設定で1600×900 JPEG生成 → 250KB以下か**
  - 容量目標自動調整アルゴリズムのコア検証
  - 256000バイト（要件5.6のJSON定義）以下に収まること

- **#17: 達成不可能な容量目標**
  - 例: 1600×900で `maxBytes: 5000`（5KB）を設定
  - 最低品質でも超過することを確認 → 警告表示

- **#20: JSON Export → Import で復元できる**
  - ファイルをダウンロード → プロファイル全削除 → Import → 完全復元

- **#21: localStorage による自動保存・復元**
  - プロファイル作成 → ブラウザリロード → 残っているか

#### 7.4 実依頼ケースの再現（要件11の最終判定項目）

以下をバッチモードで再現:

**プロファイル 1: hero**
- 比率: 16:9、ベースファイル名: `hero-a`
- バリアント:
  - `@2x`: 1600×900, maxBytes: 256000 (250KB), suffix: `@2x`
  - `mobile`: 800×450, maxBytes: 102400 (100KB), suffix: ``

**プロファイル 2: truck**
- 比率: 3:2、ベースファイル名: `truck-a`
- バリアント:
  - `@2x`: 1200×800, maxBytes: 204800 (200KB), suffix: `@2x`
  - `mobile`: 600×400, maxBytes: 92160 (90KB), suffix: ``

**プロファイル 3: tools**
- 比率: 3:2、ベースファイル名: `tools-a`
- バリアント: truckと同じ構成

**プロファイル 4: profile**
- 比率: 1:1、ベースファイル名: `profile`
- バリアント:
  - `single`: 600×600, maxBytes: 81920 (80KB), suffix: ``（出力名 `profile.jpg`）

**検証**:
- 画像を割り当てて一括生成
- 生成結果: 計7ファイル（hero 2 + truck 2 + tools 2 + profile 1）
- 全て容量目標以内に収まっているか
- ファイル名が依頼仕様通りか

このケースが成功すれば **Phase 1 のゴール達成**。

#### 7.5 ビルド確認

```bash
npm run build
```

- エラーなし、警告なし
- SSG ビルド成功

---

## 完了報告フォーマット

```markdown
## Day 2 完了報告

### 実装項目
- [x] Task 1: types.ts 作成
- [x] Task 2: imageProcessor.ts 共通化 + SimpleMode.tsx リファクタ
- [x] Task 3: builtinPresets.ts 作成（6プリセット）
- [x] Task 4: ProfileEditor.tsx 作成
- [x] Task 5: BatchMode.tsx 本体実装
- [x] Task 6: page.tsx モード切替有効化 + localStorage

### シンプルモード退行確認（Task 7.2）
- [x] Test 1 (#1) PNG透過 → JPEG白背景
- [x] Test 2 (#3) 横長画像リサイズ
- [x] Test 3 (#7,#8) 複数ファイル + ZIP
- [x] Test 4 (#11) AVIF検出

→ 全て Day 1 と同じ挙動を維持

### バッチモード統合テスト結果（10パターン）
13. ✅ プロファイル新規作成・編集・保存
14. ✅ バリアント追加・編集
15. ✅ 画像割り当て → 生成、ファイル名ルール正しい
16. ✅ 容量目標250KB以内に収まる（実測: XXX KB）
17. ✅ 達成不可能時の警告表示
18. ✅ 中央クロップ動作
19. ✅ 上クロップ・下クロップ動作
20. ✅ JSON Export/Import 復元
21. ✅ localStorage 自動保存・復元
22. ✅ 3プロファイル×2バリアント×画像3枚=18枚生成、ZIP正常

### 統合テスト（3パターン）
23. ✅ パンくず全方向動作
24. ✅ モバイル375px幅レイアウト
25. ✅ モード切替時のデータ干渉なし

### 実依頼ケース再現（要件11最終判定）
- [x] hero プロファイル（@2x 250KB以内、mobile 100KB以内）
- [x] truck プロファイル（@2x 200KB以内、mobile 90KB以内）
- [x] tools プロファイル（同上）
- [x] profile プロファイル（80KB以内）
- [x] 計7ファイル、全て容量目標達成

### ビルド確認
- `npm run build` 結果: 成功/警告あり+詳細

### 気づいた点・Phase 2 への申し送り
（あれば記載）

### 変更ファイル一覧
- app/tools/image-resizer/types.ts (新規)
- app/tools/image-resizer/imageProcessor.ts (新規)
- app/tools/image-resizer/builtinPresets.ts (新規)
- app/tools/image-resizer/ProfileEditor.tsx (新規)
- app/tools/image-resizer/BatchMode.tsx (新規)
- app/tools/image-resizer/page.tsx (修正: バッチタブ有効化)
- app/tools/image-resizer/SimpleMode.tsx (修正: 共通ロジック抽出)
```

---

## 注意事項・禁止事項

### ❌ やってはいけないこと

- **SimpleMode の挙動を壊さない**: リファクタ後も Day 1 の動作を維持すること
- **Phase 2 機能の先取り実装**: EXIFり剥がし、Before/Afterスライダー、顔検出自動クロップは**実装しない**（要件5.7参照）
- **独自UIデザインの追加**: 要件4のデザインガイドから外れない
- **外部APIの使用**: 全てブラウザ内完結（要件1.2 制約）
- **画像本体のlocalStorage保存**: 構成のみ。画像はブラウザセッション内のメモリのみに保持

### ⚠️ 判断が必要な場合

以下は**勝手に判断せず、実装を止めて報告**:

- 容量目標アルゴリズムで想定外の挙動（無限ループ、異常な反復回数等）
- `crypto.randomUUID()` 非対応ブラウザがあった場合（フォールバック策必要）
- JSON インポートでスキーマ不一致が頻発する場合
- バッチモードのメモリ使用量が異常に大きい場合（5枚×3バリアントで500MB超など）

### ✅ 品質基準

- TypeScript strict モードでエラー・警告なし
- `imageProcessor.ts` の各関数は純粋関数的（副作用最小）
- バッチモードで30ファイル生成時もUI応答性維持（setTimeout yield）
- `localStorage` 読み書きは try-catch で保護（プライベートブラウジング対応）
- Object URL メモリリーク対策はバッチモードでも徹底（Day 1 同様）

---

## Phase 2 予告（参考、本タスクでは対応不要）

Day 2 完了後、将来的に以下を検討:

- **EXIF剥がし + 可視化**（`exifr` ライブラリ使用）
- **Before/Afterスライダー比較**（CSS clip-path）
- **顔検出自動クロップ**（face-api.js or BlazeFace）
- **プロファイル共有URL**（JSON→URL safe base64）
- **WebWorker化**（処理並列化）

Day 2 の成果物はこれらの拡張を想定した構造になっているべき：

- `ProfileEditor.tsx` の `cropPosition` に将来「face-auto」追加を想定
- `imageProcessor.ts` のAPI設計は WebWorker 化しても通用する純粋関数
- JSON スキーマの `version` は将来のマイグレーション用

---

**以上。Day 2 タスク開始してください。**

実装順序はTask番号順を推奨。特に**Task 2（共通化）は Task 5（バッチモード本体）より先**に完了させること（依存関係）。
