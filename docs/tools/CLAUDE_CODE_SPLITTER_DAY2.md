# ClaudeCode 実装指示: Image Splitter Day 2 - スマート分割アルゴリズム

**対象**: `E:\app\noviqlab\noviqlab-site`
**関連**: Day 1 完了済み（機械分割MVP）
**所要時間**: 40〜60分
**前提**: Day 1 のコミット済み、ビルドオールグリーン

**ゴール**:
Image Splitter にスマート分割アルゴリズム（余白行検出）を実装する。理想分割位置の前後 ±50px 範囲で余白を探し、文字や図表を避けた自然な切断位置を選ぶ。

---

## 0. 事前準備

```bash
cd E:\app\noviqlab\noviqlab-site
git log --oneline -3
git status
```

### 作業対象ファイル

- `app/tools/image-splitter/splitLogic.ts` - スマート分割関数追加
- `app/tools/image-splitter/ImageSplitter.tsx` - スマート分割 ON/OFF トグル有効化・プログレス表示

**変更しないもの**:
- `types.ts`（既に Day 1 で定義済み）
- `layout.tsx` / `page.tsx`
- その他全ファイル

---

## 1. アルゴリズム設計

### 1.1 基本フロー

```
機械分割の理想位置を計算（既存 calcSplitPositions の結果）
    ↓
各理想位置について、前後 ±50px の範囲で余白ブロックを検索
    ↓
見つかった余白ブロックを「ブロックサイズ × 2 - 距離」でスコアリング
    ↓
最高スコアのブロックの中央を実際の分割位置とする
    ↓
範囲内に余白ブロックがなければ、理想位置のままフォールバック
```

### 1.2 余白行の判定

**基準**: 各行の最初のピクセルを基準色とし、同じ行の他のピクセルが全て基準色から ±10（RGB各値）以内にあれば「余白行」と判定。

**擬似コード**:
```
function isWhitespaceRow(imageData, y, width, tolerance = 10):
  baseR = pixel(0, y).R
  baseG = pixel(0, y).G
  baseB = pixel(0, y).B
  
  for x = 1 to width - 1:
    if |pixel(x,y).R - baseR| > tolerance OR
       |pixel(x,y).G - baseG| > tolerance OR
       |pixel(x,y).B - baseB| > tolerance:
      return false  // 1ピクセルでも外れたら即終了（早期リターン）
  
  return true
```

### 1.3 余白ブロックの抽出

連続した余白行をグルーピング：

```
入力: whitespaceRows = [120, 121, 122, 123, 200, 201, 350]
出力: blocks = [
  { start: 120, end: 123, size: 4, center: 121 },  // 4行連続
  { start: 200, end: 201, size: 2, center: 200 },  // 2行連続
  { start: 350, end: 350, size: 1, center: 350 },  // 1行のみ
]
```

### 1.4 最適な分割位置の選定

**スコアリング式**: `score = blockSize * 2 - |blockCenter - idealY|`

- ブロックサイズが大きいほど高スコア
- 理想位置に近いほど高スコア
- 「×2」でブロックサイズを重視（小さな1ピクセル余白より大きなブロックを優先）

**探索範囲**: 理想位置の前後 ±50px（`SEARCH_RANGE = 50`）

**フォールバック**: 範囲内に余白ブロックがなければ、理想位置（`idealY`）をそのまま使う。

### 1.5 内部固定値

```typescript
const WHITESPACE_TOLERANCE = 10;  // RGB各値の許容差
const SEARCH_RANGE = 50;          // 探索範囲（理想位置±50px）
```

これらはユーザーに公開しない（Jobsイズム、Phase 1 のスコープ通り）。

---

## 2. Task 1: splitLogic.ts にスマート分割関数を追加

### 2.1 既存コードを view

まず既存の `app/tools/image-splitter/splitLogic.ts` を view し、現状の関数構造を把握する。

### 2.2 追加する関数

既存の `calcSplitPositions` を**機械分割専用**として残し、**新規関数**としてスマート分割版を追加する。

#### 追加関数 1: `detectWhitespaceBlocks`

```typescript
interface WhitespaceBlock {
  start: number;   // ブロック開始行
  end: number;     // ブロック終了行
  size: number;    // ブロックのサイズ（= end - start + 1）
  center: number;  // ブロックの中央行
}

/**
 * 画像全体から余白行を検出し、連続ブロックにまとめる
 */
function detectWhitespaceBlocks(
  imageData: ImageData,
  tolerance: number = 10
): WhitespaceBlock[] {
  const { data, width, height } = imageData;
  const blocks: WhitespaceBlock[] = [];
  let currentStart: number | null = null;

  for (let y = 0; y < height; y++) {
    // その行の最初のピクセルを基準色とする
    const rowStart = y * width * 4;
    const baseR = data[rowStart];
    const baseG = data[rowStart + 1];
    const baseB = data[rowStart + 2];

    let isWhitespace = true;
    for (let x = 1; x < width; x++) {
      const i = rowStart + x * 4;
      if (
        Math.abs(data[i] - baseR) > tolerance ||
        Math.abs(data[i + 1] - baseG) > tolerance ||
        Math.abs(data[i + 2] - baseB) > tolerance
      ) {
        isWhitespace = false;
        break; // 早期リターン（パフォーマンス重要）
      }
    }

    if (isWhitespace) {
      if (currentStart === null) currentStart = y;
    } else {
      if (currentStart !== null) {
        blocks.push({
          start: currentStart,
          end: y - 1,
          size: y - currentStart,
          center: Math.floor((currentStart + y - 1) / 2),
        });
        currentStart = null;
      }
    }
  }

  // 最後のブロックを閉じる
  if (currentStart !== null) {
    blocks.push({
      start: currentStart,
      end: height - 1,
      size: height - currentStart,
      center: Math.floor((currentStart + height - 1) / 2),
    });
  }

  return blocks;
}
```

**重要**: 早期リターン（`break`）により、ほとんどの行は数ピクセル走査で判定される。1600×4000 程度の画像で数百ms以内に完了する想定。

#### 追加関数 2: `findBestCutPosition`

```typescript
/**
 * 理想位置の前後 ±searchRange で、最適な余白ブロックを探す
 * @returns 調整された分割位置、余白がなければ idealY をそのまま返す
 */
function findBestCutPosition(
  idealY: number,
  blocks: WhitespaceBlock[],
  searchRange: number = 50
): number {
  const minY = idealY - searchRange;
  const maxY = idealY + searchRange;

  // 探索範囲内のブロックを絞り込み
  const candidates = blocks.filter(
    (b) => b.center >= minY && b.center <= maxY
  );

  if (candidates.length === 0) {
    // フォールバック: 余白なし → 理想位置のまま
    return idealY;
  }

  // スコアリング: size * 2 - |center - idealY|
  let bestBlock = candidates[0];
  let bestScore =
    candidates[0].size * 2 - Math.abs(candidates[0].center - idealY);

  for (let i = 1; i < candidates.length; i++) {
    const score =
      candidates[i].size * 2 - Math.abs(candidates[i].center - idealY);
    if (score > bestScore) {
      bestScore = score;
      bestBlock = candidates[i];
    }
  }

  return bestBlock.center;
}
```

#### 追加関数 3: `calcSmartSplitPositions`

```typescript
/**
 * スマート分割の分割位置を計算
 * 機械分割の理想位置を計算後、各位置を余白ブロックで調整する
 */
export async function calcSmartSplitPositions(
  imageFile: ImageFile,
  settings: SplitSettings
): Promise<SplitPosition[]> {
  // まず機械分割の理想位置を取得
  const idealPositions = calcSplitPositions(imageFile, settings);
  if (idealPositions.length === 0) return [];

  // 画像を Canvas に描画して ImageData を取得
  const img = await loadImageElement(URL.createObjectURL(imageFile.file));
  const canvas = document.createElement("canvas");
  canvas.width = imageFile.width;
  canvas.height = imageFile.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context 取得失敗");

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, imageFile.width, imageFile.height);

  // 余白ブロック検出
  const blocks = detectWhitespaceBlocks(imageData, WHITESPACE_TOLERANCE);

  // 各理想位置を調整
  const adjustedPositions: SplitPosition[] = idealPositions.map((p) => ({
    y: findBestCutPosition(p.y, blocks, SEARCH_RANGE),
  }));

  // 重複削除（同じ余白ブロックに複数の理想位置が吸い寄せられる場合があるため）
  const uniqueYs = new Set<number>();
  const deduped: SplitPosition[] = [];
  for (const p of adjustedPositions) {
    if (!uniqueYs.has(p.y)) {
      uniqueYs.add(p.y);
      deduped.push(p);
    }
  }

  return deduped;
}

const WHITESPACE_TOLERANCE = 10;
const SEARCH_RANGE = 50;
```

**重要**: 
- `Promise<SplitPosition[]>` を返す（ImageData 取得が非同期のため）
- 重複削除処理で、同じ位置に複数の理想位置が吸着される問題を回避

### 2.3 既存の `loadImageElement` ヘルパーを再利用

`splitImage` 関数の中に既にある `loadImageElement` を `calcSmartSplitPositions` からも呼び出せるように、関数の配置順に注意。既にヘルパーがファイル末尾にあるなら、それを使える。

---

## 3. Task 2: ImageSplitter.tsx のスマート分割統合

### 3.1 import 追加

```tsx
import { calcSplitPositions, splitImage, calcSmartSplitPositions } from "./splitLogic";
```

### 3.2 分割位置計算の useEffect を修正

既存の useEffect:
```tsx
useEffect(() => {
  if (!imageFile) {
    setSplitPositions([]);
    return;
  }
  const positions = calcSplitPositions(imageFile, settings);
  setSplitPositions(positions);
}, [imageFile, settings]);
```

**修正後**:
```tsx
const [calculating, setCalculating] = useState(false);

useEffect(() => {
  if (!imageFile) {
    setSplitPositions([]);
    return;
  }

  let cancelled = false;

  async function calculate() {
    setCalculating(true);
    try {
      let positions: SplitPosition[];
      if (settings.smartSplit) {
        positions = await calcSmartSplitPositions(imageFile!, settings);
      } else {
        positions = calcSplitPositions(imageFile!, settings);
      }
      if (!cancelled) {
        setSplitPositions(positions);
      }
    } catch (err) {
      console.error("分割位置計算エラー:", err);
      if (!cancelled) {
        // エラー時は機械分割にフォールバック
        setSplitPositions(calcSplitPositions(imageFile!, settings));
      }
    } finally {
      if (!cancelled) setCalculating(false);
    }
  }

  calculate();

  return () => {
    cancelled = true;
  };
}, [imageFile, settings]);
```

**ポイント**:
- `cancelled` フラグで設定が連続変更された時の古い計算結果を無視
- エラー時は機械分割にフォールバック（ツールが使えなくなることを避ける）
- `calculating` state でローディング表示可能に

### 3.3 スマート分割トグルを有効化

現状（Day 1）:
```tsx
<input
  type="checkbox"
  checked={settings.smartSplit}
  onChange={(e) =>
    setSettings((s) => ({ ...s, smartSplit: e.target.checked }))
  }
  className="accent-sky-400"
  disabled  // ← これを削除
/>
<span className="text-sm text-white/50">
  余白行を検出して切る（Day 2 実装予定）  // ← 文言変更
</span>
```

**修正後**:
```tsx
<input
  type="checkbox"
  checked={settings.smartSplit}
  onChange={(e) =>
    setSettings((s) => ({ ...s, smartSplit: e.target.checked }))
  }
  className="accent-sky-400"
/>
<span className="text-sm text-white/85">
  余白行を検出して切る
</span>
```

**変更点**:
- `disabled` 属性削除
- 文言を「余白行を検出して切る」のみに（「Day 2 実装予定」削除）
- テキスト色を `text-white/50` → `text-white/85` に（アクティブ状態を示す）

### 3.4 計算中インジケーター表示

分割予定情報のボックスに、計算中の状態を表示。

既存（Day 1）:
```tsx
{imageFile && splitPositions.length > 0 && (
  <div className="bg-sky-500/10 border border-sky-400/20 rounded-lg p-3">
    <p className="text-xs text-sky-300 leading-relaxed">
      分割予定: <strong>{splitPositions.length + 1} ピース</strong>
      <br />
      元画像: {imageFile.width} × {imageFile.height} px
    </p>
  </div>
)}
```

**修正後**:
```tsx
{imageFile && (
  <div className="bg-sky-500/10 border border-sky-400/20 rounded-lg p-3">
    {calculating ? (
      <p className="text-xs text-sky-300 leading-relaxed flex items-center gap-2">
        <span className="inline-block w-3 h-3 border-2 border-sky-300 border-t-transparent rounded-full animate-spin"></span>
        <span>分割位置を計算中...</span>
      </p>
    ) : splitPositions.length > 0 ? (
      <p className="text-xs text-sky-300 leading-relaxed">
        分割予定: <strong>{splitPositions.length + 1} ピース</strong>
        {settings.smartSplit && <span className="ml-1">（スマート分割）</span>}
        <br />
        元画像: {imageFile.width} × {imageFile.height} px
      </p>
    ) : (
      <p className="text-xs text-sky-300 leading-relaxed">
        分割不要: 画像の高さが十分小さいため、このままでOKです
      </p>
    )}
  </div>
)}
```

**変更点**:
- 計算中は**スピナー付きメッセージ**表示
- スマート分割 ON 時は「（スマート分割）」を追記
- 分割不要の場合もメッセージ表示

### 3.5 分割実行ボタンの disabled 制御

```tsx
<button
  onClick={handleSplit}
  disabled={processing || calculating || splitPositions.length === 0}
  // ...
>
```

計算中も disabled にする（**分割位置が確定してから実行**）。

---

## 4. Task 3: ビルド確認

```bash
npm run build
```

エラー・警告なしを確認。

---

## 5. Task 4: 動作確認（15分）

### 5.1 devサーバー起動

```bash
npm run dev -- --port 3100
```

### 5.2 基本動作確認

**1. スマート分割 ON（デフォルト）で画像ドロップ**:
- [ ] プレビュー表示
- [ ] 計算中スピナーが一瞬表示される（小さい画像ではすぐ消える）
- [ ] 「分割予定: N ピース（スマート分割）」表示
- [ ] 赤線が余白位置に吸着される（文字の上にかからない）

**2. スマート分割 OFF に切り替え**:
- [ ] スピナー一瞬表示、その後機械的な等分位置に赤線が移動
- [ ] 「分割予定: N ピース」（「（スマート分割）」なし）

**3. 再度 ON に切り替え**:
- [ ] 余白位置に吸着する

### 5.3 実画像での確認

Day 1 で分割した`/about` ページのキャプチャ画像で再テスト：

- 機械分割では「これは法律上の義務ではありません」の途中で切れていた
- スマート分割ONにすると、**見出しや見出し間の余白で切れる**ようになるはず

### 5.4 エッジケース確認

- [ ] 1000 px × 500 px 程度の小さい画像 → 分割不要メッセージ
- [ ] 10000 px 超の縦長画像 → 計算時間1秒以内で完了（目安）
- [ ] 画像を削除 → メモリ解放

### 5.5 退行テスト

- [ ] Image Converter 正常動作
- [ ] Image Converter のシンプル/バッチモードのリサイズが壊れていないか

---

## 6. 完了報告フォーマット

```markdown
## Image Splitter Day 2 完了報告

### 実装項目
- [x] Task 1: splitLogic.ts にスマート分割関数追加
  - detectWhitespaceBlocks: 余白行を検出・連続ブロック化
  - findBestCutPosition: ブロックスコアリングで最適位置選定
  - calcSmartSplitPositions: 機械分割位置 → 余白調整
- [x] Task 2: ImageSplitter.tsx 統合
  - useEffect を async 対応（cancelled フラグ付き）
  - スマート分割トグル有効化
  - 計算中スピナー表示
  - 分割ボタンの disabled 制御
- [x] Task 3: ビルド成功
- [x] Task 4: 動作確認

### 変更ファイル
- app/tools/image-splitter/splitLogic.ts（関数追加）
- app/tools/image-splitter/ImageSplitter.tsx（統合）

### 動作確認結果
- [x] スマート分割 ON: 赤線が余白位置に吸着
- [x] スマート分割 OFF: 機械的等分位置
- [x] 計算中スピナー表示
- [x] エラー時は機械分割にフォールバック
- [x] Image Converter 退行なし

### パフォーマンス
- 1600 × 4000 px 程度の画像: 計算時間 _____ ms（実測値）
- エッジケース（小さい画像・巨大画像）正常動作確認

### 気づき（あれば）
（例: 特定の色構成の画像で余白判定が厳しかった、など）
```

---

## 7. 禁止事項

### ❌ やってはいけないこと

- **既存の `calcSplitPositions`（機械分割）を変更**しない（新規関数として追加）
- **types.ts の拡張**（既存の型で十分）
- **ZIP ダウンロード実装**（Day 3 のスコープ）
- **UI の大幅変更**（既存レイアウトに最小限の追加のみ）

### ⚠️ 判断が必要な場合

- 計算時間が想定より長い場合
  - → Day 2 では許容、Day 3 以降で Web Worker 化検討
- 重複削除で分割数が大きく減る場合
  - → 正常動作（複数の理想位置が同じ余白に吸着される場合あり）
- 画像が非常に大きくメモリエラーになる場合
  - → alert でユーザー通知、処理続行は中止

### ✅ 品質基準

- TypeScript strict エラーなし
- ビルド成功
- スマート分割で文字が途中で切れる問題が解消
- スピナー表示が自然（一瞬で消える場合は点滅しない）
- エラー時もツールが使える状態を維持（機械分割へフォールバック）

---

**以上。Image Splitter Day 2 タスク開始してください。**

**重要ポイント**:
1. **早期リターン**（break）で余白検出を高速化
2. **非同期処理**（Promise）を useEffect で安全に扱う（cancelled フラグ）
3. **フォールバック設計**（エラー時も機械分割で使える）
4. **既存機能を壊さない**（calcSplitPositions は別関数として残す）
