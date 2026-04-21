# ClaudeCode 実装指示: Image Splitter Day 1 - 骨格・共通化・機械分割

**対象**: `E:\app\noviqlab\noviqlab-site`
**ツール**: Image Splitter（画像分割ツール）
**URL**: `/tools/image-splitter`
**関連**: `docs/tools/REQUIREMENTS_SPLITTER.md`
**所要時間**: 3〜4時間
**前提**: Image Converter（Phase 1.5 + ブランド構築）完了済み、Day 6 バグ修正完了済み

**ゴール**:
Image Splitter の骨格を構築し、機械的な等分割で動作するMVPを完成させる。同時に、Image Converter と共有する UI コンポーネントを `components/tools/common/` に移動し、共通化する。

---

## 0. 事前準備

```bash
cd E:\app\noviqlab\noviqlab-site
git log --oneline -5
git status
```

### 作業範囲

1. **Task 0**: 共通コンポーネントの移動（リファクタリング）
2. **Task 1**: ページ骨格・レイアウト
3. **Task 2**: 型定義
4. **Task 3**: 画像読み込み
5. **Task 4**: サイドバー UI
6. **Task 5**: 機械分割ロジック
7. **Task 6**: 分割実行・個別ダウンロード
8. **Task 7**: Tools 一覧への追加
9. **Task 8**: ビルド・動作確認

### 本日対応しない（Day 2以降）

- スマート分割（余白検出アルゴリズム）← Day 2
- ZIP 一括ダウンロード ← Day 3
- 説明文（UsageToggle / IntroToggle）← Day 4

---

## 1. Task 0: 共通コンポーネント移動

### 1.1 目的

`UsageToggle` / `IntroToggle` / `InfoAccordion` は現在 `app/tools/image-resizer/` 配下にあるが、Image Splitter でも使用する。`components/tools/common/` に移動して共通化する。

### 1.2 手順

#### Step 1: フォルダ作成

```bash
mkdir components/tools/common
```

#### Step 2: ファイル移動

以下の3ファイルを移動：

- `app/tools/image-resizer/UsageToggle.tsx` → `components/tools/common/UsageToggle.tsx`
- `app/tools/image-resizer/IntroToggle.tsx` → `components/tools/common/IntroToggle.tsx`
- `app/tools/image-resizer/InfoAccordion.tsx` → `components/tools/common/InfoAccordion.tsx`

**注意**: 単純に新規作成＋元ファイル削除で実施（ClaudeCode の `create_file` → 元ファイル削除でOK）。

#### Step 3: image-resizer 配下の import パスを更新

以下のファイルで `./UsageToggle`, `./IntroToggle`, `./InfoAccordion` を参照している箇所を全て探し、import パスを `@/components/tools/common/...` に書き換える：

対象ファイル（view して確認）:

- `app/tools/image-resizer/SimpleMode.tsx`
- `app/tools/image-resizer/BatchMode.tsx`
- `app/tools/image-resizer/ProfileEditor.tsx`

**変更前（例）**:
```tsx
import InfoAccordion from "./InfoAccordion";
import IntroToggle from "./IntroToggle";
import UsageToggle from "./UsageToggle";
```

**変更後**:
```tsx
import InfoAccordion from "@/components/tools/common/InfoAccordion";
import IntroToggle from "@/components/tools/common/IntroToggle";
import UsageToggle from "@/components/tools/common/UsageToggle";
```

#### Step 4: ビルド確認（退行テスト）

```bash
npm run build
```

エラーなしを確認。Image Converter の機能が壊れていないか、この時点で `npm run dev` で動作確認してもよい。

---

## 2. Task 1: ページ骨格・レイアウト

### 2.1 ディレクトリ作成

```
app/tools/image-splitter/
├── layout.tsx
├── page.tsx
├── types.ts
├── ImageSplitter.tsx    (メインコンポーネント、Client Component)
└── splitLogic.ts        (分割計算ロジック)
```

### 2.2 `app/tools/image-splitter/layout.tsx` 新規作成

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Image Splitter",
  description:
    "ブラウザ内で完結する画像分割ツール。縦長キャプチャ画像を印刷やSlack共有に適したサイズに賢く分割。PNG / JPEG / WebP 対応、サーバー送信なし。",
  openGraph: {
    title: "Image Splitter | NoviqLab",
    description:
      "ブラウザ内で完結する画像分割ツール。縦長キャプチャ画像を印刷やSlack共有に適したサイズに賢く分割。",
    url: "https://www.noviqlab.com/tools/image-splitter",
  },
};

export default function ImageSplitterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

### 2.3 `app/tools/image-splitter/page.tsx` 新規作成

```tsx
import Breadcrumb from "@/components/tools/Breadcrumb";
import ImageSplitter from "./ImageSplitter";

export default function ImageSplitterPage() {
  return (
    <main className="min-h-screen bg-[#0a1628] text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Breadcrumb
          items={[
            { label: "NoviqLab", href: "/" },
            { label: "Tools", href: "/tools" },
            { label: "Image Splitter" },
          ]}
        />
        <ImageSplitter />
      </div>
    </main>
  );
}
```

---

## 3. Task 2: 型定義

### 3.1 `app/tools/image-splitter/types.ts` 新規作成

```typescript
export type SplitMode = "fixed" | "a4";

export type OutputFormat = "image/png" | "image/jpeg" | "image/webp";

export interface SplitSettings {
  mode: SplitMode;
  fixedHeight: number;       // 高さピクセル固定モード時の高さ
  smartSplit: boolean;       // スマート分割ON/OFF（Day 2 で実装）
}

export interface ImageFile {
  id: string;
  file: File;
  objectUrl: string;         // プレビュー表示用
  width: number;
  height: number;
  format: OutputFormat;      // 元画像の形式（同形式で出力するため）
}

export interface SplitResult {
  id: string;
  blob: Blob;
  url: string;               // ダウンロード用URL
  filename: string;          // 例: "capture-part01.png"
  width: number;
  height: number;
  size: number;              // バイト数
}

export interface SplitPosition {
  y: number;                 // 分割位置のY座標
}
```

### 3.2 補足

- `smartSplit` は Day 1 では UI 上にトグルを配置するのみ。実装は Day 2。
- `OutputFormat` は Image Converter の型と合わせた文字列形式（MIME type）。

---

## 4. Task 3: 画像読み込み

### 4.1 `app/tools/image-splitter/ImageSplitter.tsx` を新規作成（基本構造）

以下のような構造で作成：

```tsx
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ImageFile, SplitSettings, SplitResult, SplitPosition, OutputFormat } from "./types";
import { calcSplitPositions, splitImage } from "./splitLogic";

const ACCEPTED_FORMATS = "image/png,image/jpeg,image/webp";

const FORMAT_EXT: Record<OutputFormat, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export default function ImageSplitter() {
  const [imageFile, setImageFile] = useState<ImageFile | null>(null);
  const [settings, setSettings] = useState<SplitSettings>({
    mode: "fixed",
    fixedHeight: 1000,
    smartSplit: true,  // デフォルトON（Day 2実装予定）
  });
  const [splitPositions, setSplitPositions] = useState<SplitPosition[]>([]);
  const [results, setResults] = useState<SplitResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 画像読み込み処理
  const loadImage = useCallback((file: File) => {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      alert("対応形式: PNG / JPEG / WebP");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImageFile({
        id: crypto.randomUUID(),
        file,
        objectUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: file.type as OutputFormat,
      });
      setResults([]);  // 過去の結果をクリア
    };
    img.onerror = () => {
      alert("画像の読み込みに失敗しました");
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  }, []);

  // ドロップハンドラ
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) loadImage(file);
    },
    [loadImage]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadImage(file);
    },
    [loadImage]
  );

  // 画像削除（メモリ解放）
  const handleRemove = useCallback(() => {
    if (imageFile?.objectUrl) URL.revokeObjectURL(imageFile.objectUrl);
    results.forEach((r) => URL.revokeObjectURL(r.url));
    setImageFile(null);
    setResults([]);
    setSplitPositions([]);
  }, [imageFile, results]);

  // コンポーネントアンマウント時のメモリ解放
  useEffect(() => {
    return () => {
      if (imageFile?.objectUrl) URL.revokeObjectURL(imageFile.objectUrl);
      results.forEach((r) => URL.revokeObjectURL(r.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 分割位置の再計算（設定変更時）
  useEffect(() => {
    if (!imageFile) {
      setSplitPositions([]);
      return;
    }
    const positions = calcSplitPositions(imageFile, settings);
    setSplitPositions(positions);
  }, [imageFile, settings]);

  // 分割実行
  const handleSplit = useCallback(async () => {
    if (!imageFile) return;
    setProcessing(true);
    try {
      const splitResults = await splitImage(imageFile, splitPositions);
      // 既存の結果をクリーンアップ
      results.forEach((r) => URL.revokeObjectURL(r.url));
      setResults(splitResults);
    } catch (err) {
      console.error(err);
      alert("分割処理中にエラーが発生しました");
    } finally {
      setProcessing(false);
    }
  }, [imageFile, splitPositions, results]);

  // レンダリングはタスク4以降で追加
  return (
    <div className="mt-8 flex gap-6">
      {/* サイドバー（Task 4で実装） */}
      {/* メインエリア（Task 4で実装） */}
    </div>
  );
}
```

**ポイント**:
- `crypto.randomUUID()` でID生成（Node/ブラウザ両対応）
- `URL.createObjectURL` / `revokeObjectURL` で確実にメモリ解放
- `useEffect` のアンマウント時クリーンアップで漏れ防止

---

## 5. Task 4: サイドバー UI とメインエリア

### 5.1 レンダリング部分を実装

`ImageSplitter.tsx` の `return` 部分を以下のように実装：

```tsx
return (
  <div className="mt-8 flex flex-col lg:flex-row gap-6">
    {/* サイドバー */}
    <aside className="w-full lg:w-[360px] space-y-6 shrink-0">
      {/* 分割モード */}
      <div>
        <p className="text-xs text-white/40 uppercase tracking-widest mb-2">分割モード</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              checked={settings.mode === "fixed"}
              onChange={() => setSettings((s) => ({ ...s, mode: "fixed" }))}
              className="accent-sky-400"
            />
            <span className="text-sm text-white/85">高さピクセル指定</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              checked={settings.mode === "a4"}
              onChange={() => setSettings((s) => ({ ...s, mode: "a4" }))}
              className="accent-sky-400"
            />
            <span className="text-sm text-white/85">A4印刷用</span>
          </label>
        </div>
      </div>

      {/* 高さ px（fixed時のみ表示） */}
      {settings.mode === "fixed" && (
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest mb-2">高さ px</p>
          <input
            type="number"
            min={100}
            value={settings.fixedHeight}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                fixedHeight: Number(e.target.value) || 1000,
              }))
            }
            className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-sky-400"
          />
        </div>
      )}

      {/* A4 モードの説明（a4時のみ表示） */}
      {settings.mode === "a4" && imageFile && (
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-xs text-white/60 leading-relaxed">
            幅 {imageFile.width}px から、A4比率（1:√2）で
            <br />
            高さ {Math.round(imageFile.width * Math.SQRT2)}px ごとに分割します。
          </p>
        </div>
      )}

      {/* スマート分割トグル */}
      <div>
        <p className="text-xs text-white/40 uppercase tracking-widest mb-2">スマート分割</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.smartSplit}
            onChange={(e) =>
              setSettings((s) => ({ ...s, smartSplit: e.target.checked }))
            }
            className="accent-sky-400"
            disabled
          />
          <span className="text-sm text-white/50">
            余白行を検出して切る（Day 2 実装予定）
          </span>
        </label>
      </div>

      {/* 分割予定情報 */}
      {imageFile && splitPositions.length > 0 && (
        <div className="bg-sky-500/10 border border-sky-400/20 rounded-lg p-3">
          <p className="text-xs text-sky-300 leading-relaxed">
            分割予定: <strong>{splitPositions.length + 1} ピース</strong>
            <br />
            元画像: {imageFile.width} × {imageFile.height} px
          </p>
        </div>
      )}
    </aside>

    {/* メインエリア */}
    <section className="flex-1 min-w-0">
      {!imageFile ? (
        // ドロップゾーン
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-sky-400 bg-sky-500/10"
              : "border-white/20 hover:border-white/40 bg-white/5"
          }`}
        >
          <div className="text-6xl mb-4">🖼</div>
          <p className="text-white/85 font-semibold mb-2">
            画像をドロップ、またはクリックして選択
          </p>
          <p className="text-xs text-white/50">対応形式: PNG / JPEG / WebP</p>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FORMATS}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        // プレビュー + 分割結果
        <div className="space-y-4">
          {/* ファイル情報ヘッダー */}
          <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
            <div>
              <p className="text-sm text-white/85 truncate">{imageFile.file.name}</p>
              <p className="text-xs text-white/50">
                {imageFile.width} × {imageFile.height} px ·{" "}
                {(imageFile.file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={handleRemove}
              className="text-xs text-white/50 hover:text-red-400 transition-colors"
            >
              削除
            </button>
          </div>

          {/* プレビュー */}
          <div className="bg-white/5 rounded-xl p-4 overflow-auto max-h-[60vh]">
            <div className="relative inline-block">
              <img
                src={imageFile.objectUrl}
                alt="preview"
                className="block max-w-full"
                style={{ maxHeight: "unset" }}
              />
              {/* 分割線を赤線でオーバーレイ */}
              {splitPositions.map((pos, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-t-2 border-red-500 pointer-events-none"
                  style={{
                    top: `${(pos.y / imageFile.height) * 100}%`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* 分割実行ボタン */}
          <button
            onClick={handleSplit}
            disabled={processing || splitPositions.length === 0}
            className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-white/10 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {processing
              ? "処理中..."
              : splitPositions.length === 0
              ? "分割不要（画像サイズが十分小さい）"
              : `${splitPositions.length + 1} ピースに分割`}
          </button>

          {/* 分割結果 */}
          {results.length > 0 && (
            <div className="space-y-2 bg-white/5 rounded-xl p-4">
              <h3 className="text-xs text-white/40 uppercase tracking-widest mb-3">
                分割結果 ({results.length} ファイル)
              </h3>
              {results.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/85 truncate">{r.filename}</p>
                    <p className="text-xs text-white/50">
                      {r.width} × {r.height} px · {(r.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <a
                    href={r.url}
                    download={r.filename}
                    className="ml-3 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                  >
                    DL
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  </div>
);
```

**ポイント**:
- スマート分割チェックボックスは `disabled` にして「Day 2 実装予定」と明記
- プレビュー画像に絶対配置で赤線をオーバーレイ（%指定で画像のリサイズに追従）
- 分割数が0の場合は「分割不要」メッセージ表示

---

## 6. Task 5: 機械分割ロジック

### 6.1 `app/tools/image-splitter/splitLogic.ts` 新規作成

```typescript
import type {
  ImageFile,
  SplitSettings,
  SplitPosition,
  SplitResult,
  OutputFormat,
} from "./types";

/**
 * 分割位置を計算する（機械分割）
 * Day 2でスマート分割ロジックを追加予定
 */
export function calcSplitPositions(
  imageFile: ImageFile,
  settings: SplitSettings
): SplitPosition[] {
  const { height, width } = imageFile;

  // 分割単位の高さを決定
  let unitHeight: number;
  if (settings.mode === "fixed") {
    unitHeight = Math.max(100, settings.fixedHeight);
  } else {
    // A4モード: 幅 × √2 の高さで分割
    unitHeight = Math.round(width * Math.SQRT2);
  }

  // 分割位置を生成（最後の1ピースは余りを含む）
  const positions: SplitPosition[] = [];
  let currentY = unitHeight;
  while (currentY < height) {
    positions.push({ y: currentY });
    currentY += unitHeight;
  }

  return positions;
}

/**
 * 画像を指定位置で分割
 */
export async function splitImage(
  imageFile: ImageFile,
  positions: SplitPosition[]
): Promise<SplitResult[]> {
  const { file, format, width, height } = imageFile;

  // ファイルを画像として読み込み
  const img = await loadImageElement(URL.createObjectURL(file));

  // 分割境界を配列化（0 → pos1 → pos2 → ... → height）
  const boundaries = [0, ...positions.map((p) => p.y), height];

  // 元ファイル名から拡張子を除いたベース名
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const ext = FORMAT_EXT[format];
  const totalPieces = boundaries.length - 1;
  const padLength = String(totalPieces).length; // 10未満なら2桁（-part01）、100以上なら3桁

  const results: SplitResult[] = [];

  for (let i = 0; i < totalPieces; i++) {
    const top = boundaries[i];
    const bottom = boundaries[i + 1];
    const pieceHeight = bottom - top;

    // Canvas で切り出し
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = pieceHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context 取得失敗");

    ctx.drawImage(img, 0, top, width, pieceHeight, 0, 0, width, pieceHeight);

    // Blob化
    const blob = await canvasToBlob(canvas, format);
    const url = URL.createObjectURL(blob);

    const partNum = String(i + 1).padStart(Math.max(2, padLength), "0");
    const filename = `${baseName}-part${partNum}.${ext}`;

    results.push({
      id: crypto.randomUUID(),
      blob,
      url,
      filename,
      width,
      height: pieceHeight,
      size: blob.size,
    });
  }

  return results;
}

// ヘルパー: 画像要素の読み込み
function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ヘルパー: Canvas → Blob
function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Blob 生成失敗"));
      },
      format,
      format === "image/jpeg" || format === "image/webp" ? quality : undefined
    );
  });
}

const FORMAT_EXT: Record<OutputFormat, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
```

**ポイント**:
- 分割位置は「**分割境界のY座標の配列**」として持つ
- 最後の1ピースは必ず含まれる（`boundaries[length-1] = height`）
- ファイル名は `-part01` / `-part02` 形式、桁数は自動調整
- JPEG / WebP には quality 0.92 を指定（再エンコードの劣化最小化）
- PNG は無圧縮、quality 指定不要

---

## 7. Task 7: Tools 一覧への追加

### 7.1 `app/page.tsx` の Tools セクションに Image Splitter カードを追加

既存の Image Converter カードの**下**に、新しい ToolCard を追加：

```tsx
{/* 既存のImage Converter カード */}
<ToolCard
  href="/tools/image-resizer"
  name="Image Converter"
  icon="🖼"
  description="画像のリサイズ・形式変換。Web制作バッチ・容量自動調整対応。"
  tags={["PNG", "JPEG", "WebP"]}
/>

{/* ↓ 新規追加 ↓ */}
<ToolCard
  href="/tools/image-splitter"
  name="Image Splitter"
  icon="✂️"
  description="縦長キャプチャ画像を印刷やSlack共有に適したサイズに分割。ブラウザ内完結。"
  tags={["PNG", "JPEG", "WebP"]}
/>
```

### 7.2 `app/sitemap.ts` に URL を追加

既存の sitemap.ts に `/tools/image-splitter` を追加：

```tsx
{
  url: `${baseUrl}/tools/image-splitter`,
  lastModified: now,
  changeFrequency: "weekly",
  priority: 0.9,
},
```

---

## 8. Task 8: ビルド確認と動作確認

### 8.1 ビルド

```bash
npm run build
```

エラー・警告なしを確認。

### 8.2 devサーバー起動

```bash
npm run dev -- --port 3100
```

### 8.3 確認項目

**トップページ**:
- [ ] Tools セクションに Image Converter と Image Splitter の2カードが並ぶ
- [ ] Image Splitter カードをクリックで `/tools/image-splitter` に遷移

**Image Splitter ページ**:
- [ ] パンくずリスト「NoviqLab / Tools / Image Splitter」が表示
- [ ] ドロップゾーンが表示される
- [ ] PNG / JPEG / WebP をドロップ or クリック選択で読み込める
- [ ] 画像の幅・高さ・サイズが表示される
- [ ] 分割モード切替が機能（高さ指定 ↔ A4印刷用）
- [ ] 高さ指定モード: `1000` を変更すると分割位置が再計算
- [ ] A4モード: 画像の幅から高さが自動計算され、情報表示される
- [ ] プレビュー上に赤線で分割位置が表示される
- [ ] 分割ボタンで実行、結果一覧が表示
- [ ] 各ピースの「DL」ボタンで個別ダウンロード可能
- [ ] ダウンロードしたファイル名が `元名-part01.拡張子` 形式
- [ ] 画像削除 → メモリ解放（DevTools の Memory タブで確認でもOK）

**スマート分割トグル**:
- [ ] 「Day 2 実装予定」と表示されて disabled

**Image Converter 退行テスト**:
- [ ] `/tools/image-resizer` が正常動作（共通コンポーネント移動の影響なし）
- [ ] シンプルモード、バッチモードが正常動作
- [ ] [使い方] トグルが開閉する

**SEO**:
- [ ] `http://localhost:3100/sitemap.xml` に `/tools/image-splitter` が含まれる

---

## 9. 完了報告フォーマット

```markdown
## Image Splitter Day 1 完了報告

### 実装項目
- [x] Task 0: 共通コンポーネント移動（UsageToggle / IntroToggle / InfoAccordion）
  - components/tools/common/ に移動
  - image-resizer 側の import パス更新
- [x] Task 1: ページ骨格（layout.tsx / page.tsx）
- [x] Task 2: 型定義（types.ts）
- [x] Task 3: 画像読み込み（ドロップ・選択・メモリ管理）
- [x] Task 4: サイドバー UI（分割モード・高さ指定・スマート分割トグル）
- [x] Task 5: 機械分割ロジック（splitLogic.ts）
- [x] Task 6: 分割実行・個別ダウンロード
- [x] Task 7: Tools 一覧追加・sitemap.xml 更新
- [x] Task 8: ビルド成功・動作確認

### 変更ファイル
新規:
- components/tools/common/UsageToggle.tsx（移動）
- components/tools/common/IntroToggle.tsx（移動）
- components/tools/common/InfoAccordion.tsx（移動）
- app/tools/image-splitter/layout.tsx
- app/tools/image-splitter/page.tsx
- app/tools/image-splitter/ImageSplitter.tsx
- app/tools/image-splitter/types.ts
- app/tools/image-splitter/splitLogic.ts

修正:
- app/tools/image-resizer/SimpleMode.tsx（import パス更新）
- app/tools/image-resizer/BatchMode.tsx（import パス更新）
- app/tools/image-resizer/ProfileEditor.tsx（import パス更新）
- app/page.tsx（Tools カード追加）
- app/sitemap.ts（URL 追加）

削除:
- app/tools/image-resizer/UsageToggle.tsx
- app/tools/image-resizer/IntroToggle.tsx
- app/tools/image-resizer/InfoAccordion.tsx

### 動作確認結果
- [x] Image Splitter が動作（PNG/JPEG/WebP読み込み、機械分割、個別DL）
- [x] Image Converter に退行なし
- [x] ビルド成功（ゼロエラー）
- [x] sitemap.xml に URL 追加確認

### Day 2 予定
- スマート分割アルゴリズム（余白検出）実装
- splitLogic.ts に余白検出関数追加
- サイドバーのトグルを有効化
```

---

## 10. 禁止事項

### ❌ やってはいけないこと

- **Image Converter の既存機能を壊すこと**（特に共通コンポーネント移動時）
- **スマート分割アルゴリズムの実装**（Day 2 のスコープ）
- **ZIP ダウンロードの実装**（Day 3 のスコープ）
- **UsageToggle / IntroToggle の説明文追加**（Day 4 のスコープ）
- **types.ts の大幅変更**（将来の拡張性を考え、型をシンプルに保つ）

### ⚠️ 判断が必要な場合

- 共通コンポーネントの移動で `import` が複雑になる場合
  - → 絶対パス（`@/components/tools/common/...`）を使う
- 画像サイズが極端に大きい場合（Canvas 上限超過）
  - → Day 1 では明示的なエラー処理は不要、Day 2 以降で対応

### ✅ 品質基準

- TypeScript strict エラーなし
- ビルド成功
- Image Converter の機能に退行なし
- プレビュー赤線が分割位置と一致
- ファイル名規則が正確（`-part01.ext`）
- メモリリーク防止（URL.revokeObjectURL の適切な呼び出し）

---

**以上。Image Splitter Day 1 タスク開始してください。**

**重要ポイント**:
1. **Task 0（共通コンポーネント移動）は最優先**で慎重に実施（退行リスクあり）
2. **スマート分割は UI 上にプレースホルダーのみ**（disabled）
3. **既存の Image Converter の挙動を壊さない**（退行テスト必須）
4. **最後に `/tools/image-resizer` も動作確認**してから完了報告
