# ClaudeCode 実装指示: Image Splitter Day 3 - ZIP一括DL + UI調整

**対象**: `E:\app\noviqlab\noviqlab-site`
**関連**: Day 2 完了済み（スマート分割動作確認済み）
**所要時間**: 20〜30分
**前提**: Day 2 のコミット済み、ビルドオールグリーン

**ゴール**:
Image Splitter に ZIP 一括ダウンロード機能を追加し、UI を最終的なブラッシュアップ。これで Image Splitter はツールとしての機能完成形になる（説明文追加は Day 4）。

---

## 0. 事前準備

```bash
cd E:\app\noviqlab\noviqlab-site
git log --oneline -3
git status
```

### JSZip がインストール済みか確認

```bash
# package.json で jszip が存在するか確認
# Image Converter で既に使用中のため、インストール済みのはず
```

もし未インストールなら：
```bash
npm install jszip
```

### 作業対象ファイル

- `app/tools/image-splitter/splitLogic.ts` - ZIP 生成関数追加
- `app/tools/image-splitter/ImageSplitter.tsx` - ZIP DLボタン追加・UI調整

**変更しないもの**:
- `types.ts`
- `layout.tsx` / `page.tsx`
- Image Converter 側のファイル

---

## 1. Task 1: splitLogic.ts に ZIP 生成関数追加

### 1.1 関数の追加

既存の `app/tools/image-splitter/splitLogic.ts` の末尾（または適切な位置）に、以下の関数を追加：

```typescript
import JSZip from "jszip";

/**
 * 分割結果を ZIP ファイルにまとめる
 */
export async function createSplitZip(
  results: SplitResult[],
  originalFilename: string
): Promise<Blob> {
  const zip = new JSZip();

  for (const result of results) {
    zip.file(result.filename, result.blob);
  }

  return await zip.generateAsync({ type: "blob" });
}

/**
 * 元ファイル名から拡張子を除いたベース名を取得
 * 例: "capture.png" → "capture"
 */
export function getBaseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}
```

**ポイント**:
- Image Converter と同じ `JSZip` を使用（既存依存関係の流用）
- `generateAsync({ type: "blob" })` で Blob として生成（ダウンロードしやすい）
- `getBaseName` は ZIP ファイル名生成のためのヘルパー（例: `capture-split.zip`）

---

## 2. Task 2: ImageSplitter.tsx に ZIP DL 機能を統合

### 2.1 import 追加

```tsx
import { calcSplitPositions, splitImage, calcSmartSplitPositions, createSplitZip, getBaseName } from "./splitLogic";
```

### 2.2 ZIP DL ハンドラ関数を追加

既存の `handleSplit` の近くに、以下の関数を追加：

```tsx
const handleZipDownload = useCallback(async () => {
  if (!imageFile || results.length === 0) return;

  try {
    const zipBlob = await createSplitZip(results, imageFile.file.name);
    const baseName = getBaseName(imageFile.file.name);
    const zipFilename = `${baseName}-split.zip`;

    // ダウンロードトリガー
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = zipFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("ZIP 生成エラー:", err);
    alert("ZIP ファイルの生成に失敗しました");
  }
}, [imageFile, results]);
```

**ポイント**:
- 一時的な `<a>` 要素を作ってクリックトリガー（ブラウザ共通のダウンロード手法）
- `URL.revokeObjectURL` でメモリ解放
- エラー時は alert でユーザー通知

### 2.3 結果表示エリアに ZIP DL ボタンを追加

既存の「分割結果」ブロックを確認：

```tsx
{/* 分割結果 */}
{results.length > 0 && (
  <div className="space-y-2 bg-white/5 rounded-xl p-4">
    <h3 className="text-xs text-white/40 uppercase tracking-widest mb-3">
      分割結果 ({results.length} ファイル)
    </h3>
    {results.map((r) => (
      // ... 個別DL
    ))}
  </div>
)}
```

**修正後**（h3 と map の間に ZIP ボタン追加）:

```tsx
{/* 分割結果 */}
{results.length > 0 && (
  <div className="space-y-2 bg-white/5 rounded-xl p-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-xs text-white/40 uppercase tracking-widest">
        分割結果 ({results.length} ファイル)
      </h3>
      <button
        onClick={handleZipDownload}
        className="text-xs bg-sky-500 hover:bg-sky-400 text-white font-semibold px-3 py-1.5 rounded transition-colors"
      >
        ZIP で一括DL
      </button>
    </div>
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
```

**変更点**:
- h3 の右隣に **「ZIP で一括DL」ボタン**を配置
- `flex justify-between` で左右に配置
- ボタンのスタイルは個別DLボタンと同じ（一貫性）

---

## 3. Task 3: ビルド確認

```bash
npm run build
```

エラー・警告なしを確認。

---

## 4. Task 4: 動作確認（10分）

### 4.1 devサーバー起動

```bash
npm run dev -- --port 3100
```

### 4.2 ZIP ダウンロード機能の確認

1. 画像をドロップ
2. 分割実行
3. 「分割結果」の右上に **[ZIP で一括DL] ボタン**が表示される
4. ボタンクリックで ZIP ファイルがダウンロードされる
5. ZIP ファイル名: `元名-split.zip`
6. ZIP を解凍すると、個別DLと同じ複数ファイルが入っている
7. 各ファイルのファイル名規則: `元名-part01.ext` 形式

### 4.3 退行テスト

- [ ] 個別DLボタンがまだ機能する
- [ ] スマート分割 ON/OFF 切替が機能
- [ ] Image Converter（/tools/image-resizer）正常動作

---

## 5. 完了報告フォーマット

```markdown
## Image Splitter Day 3 完了報告

### 実装項目
- [x] Task 1: splitLogic.ts に ZIP 生成関数追加
  - createSplitZip: JSZip で複数 Blob を 1 つの ZIP に
  - getBaseName: ファイル名から拡張子を除去するヘルパー
- [x] Task 2: ImageSplitter.tsx 統合
  - handleZipDownload ハンドラ追加
  - 結果エリアに「ZIP で一括DL」ボタン配置
  - エラー時は alert 通知
- [x] Task 3: ビルド成功
- [x] Task 4: 動作確認

### 変更ファイル
- app/tools/image-splitter/splitLogic.ts（ZIP 関数追加）
- app/tools/image-splitter/ImageSplitter.tsx（ZIP DL 統合）

### 動作確認結果
- [x] ZIP で一括DL が機能
- [x] ZIP ファイル名: 元名-split.zip
- [x] 個別DLも引き続き機能
- [x] Image Converter 退行なし
```

---

## 6. 禁止事項

### ❌ やってはいけないこと

- **既存の個別DLボタンを削除**しない
- **スマート分割ロジックを変更**しない（Day 2 完成状態を維持）
- **ZIP 名を複雑化**しない（`元名-split.zip` でシンプルに）
- **UsageToggle / IntroToggle の追加**（Day 4 のスコープ）

### ⚠️ 判断が必要な場合

- ZIP 生成が極端に遅い場合（10秒以上）
  - → alert でユーザー通知、処理続行は可能
- JSZip が package.json にない場合
  - → `npm install jszip` でインストール

### ✅ 品質基準

- TypeScript strict エラーなし
- ビルド成功
- ZIP 内のファイル構成が個別DLと完全一致
- 日本語ファイル名も正常に扱える（元ファイル名が日本語でも動く）

---

**以上。Image Splitter Day 3 タスク開始してください。**

**重要ポイント**:
1. **JSZip の流用**（Image Converter と同じパターン）
2. **既存 UI を壊さない**（個別DL も併存）
3. **ZIP ファイル名は `元名-split.zip`** でシンプルに
