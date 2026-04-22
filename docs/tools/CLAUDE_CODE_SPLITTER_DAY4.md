# ClaudeCode 実装指示: Image Splitter Day 4 - 説明文追加・UI統一

**対象**: `E:\app\noviqlab\noviqlab-site`
**関連**: Day 3 完了済み（機能面は完成、ZIP DL 実装済み）
**所要時間**: 30〜40分
**前提**: Day 3 のコミット済み、ビルドオールグリーン

**ゴール**:
Image Splitter に、Image Converter と同じJobsイズムの2層構造説明文を追加する。これで Image Splitter は**機能 + ブランドデザイン**として完成形になる。

---

## 0. 事前準備

```bash
cd E:\app\noviqlab\noviqlab-site
git log --oneline -3
git status
```

### 作業対象ファイル

- **新規**: `app/tools/image-splitter/descriptions.ts` - 説明文定義
- **修正**: `app/tools/image-splitter/ImageSplitter.tsx` - 説明文トグルの配置

**変更しないもの**:
- `types.ts`
- `splitLogic.ts`
- `layout.tsx` / `page.tsx`
- Image Converter 側のファイル

---

## 1. 実装方針

### 1.1 既存資産の流用

Image Converter で作った共通コンポーネントをそのまま使う：

- `@/components/tools/common/IntroToggle.tsx` - ページ冒頭用
- `@/components/tools/common/UsageToggle.tsx` - サイドバー各セクション用
- `@/components/tools/common/InfoAccordion.tsx` - 技術者向け詳細用（内部参照）

### 1.2 配置計画

#### ページ冒頭（2つのボタン式トグル）
1. `[このツールについて ▼]`（IntroToggle）
2. `[個人情報保護について ▼]`（IntroToggle, variant="privacy"）

#### サイドバー各セクション（3つの `[使い方]` トグル）
3. 分割モード `[使い方]`（UsageToggle）
4. 高さ px `[使い方]`（UsageToggle） ※ fixed モード時のみ表示
5. スマート分割 `[使い方]`（UsageToggle）

### 1.3 Image Converter シンプルモードとの UI 一貫性

基本的に `SimpleMode.tsx` と同じデザイン言語：
- サイドバー幅 360px
- トグルボタンの配置
- 余白・色・フォント

---

## 2. Task 1: descriptions.ts の新規作成

### 2.1 ファイル作成

`app/tools/image-splitter/descriptions.ts` を以下の内容で新規作成。

**この内容は Royさん推敲済みのため、一字一句変更しないこと。**

```typescript
export const DESCRIPTIONS = {
  intro: {
    simple: `🖼 縦に長い画像を、印刷や共有にちょうどいいサイズに「賢く」分割するツールです。

たとえばWebサイトを画面キャプチャした時、縦に長くなりすぎて
印刷すると文字が豆粒みたいになった経験、ありませんか?

このツールは、そういう縦長画像を
複数の読みやすいサイズに切り分けてくれます。
しかも、文字や図表の途中で切れないように
「余白のあるところ」を自動で探して切るので、
単純な等分とは違う、自然な分割ができます。

分割された画像はPNG/JPEG/WebPのまま、個別にでもZIPでもダウンロードできます。
PDFにしないので、そのままSlackやチャットで共有したり、
別の画像編集ソフトで加工したりも自由自在です。`,
    technical: `ブラウザ内完結型の画像分割ツール（Image Splitter）です。

Canvas API と ImageData を使って、
サーバーに画像を送信することなく全ての処理をブラウザ内で実行します。
アップロードしたスクリーンショットに機密情報が含まれる場合でも安全です。

主な特徴:
- 入力: PNG / JPEG / WebP（1枚ずつ）
- 分割モード: 高さ固定(px) / A4比率自動計算(幅×√2)
- スマート分割: 余白行検出による自然な切断位置の自動選定
- 出力形式: 元画像と同じ形式で出力（可逆性保持）
- ファイル名: 元ファイル名-part01, -part02... の連番
- ダウンロード: 個別 + ZIP 一括対応（JSZip）

類似ツールとの差別化:
- オンラインサービス: 画像をサーバーに送信する必要があり、機密情報を含むキャプチャには不向き
- ImageMagick (CLI): 機械的な等分のみ、文字が泣き別れする
- GoFullPage 等のブラウザ拡張: PDF出力が主、画像形式での分割には対応していない

本ツールは「画像のまま・ブラウザ完結・スマート分割」という
市場に空白があった組み合わせを実装しています。`,
  },
  privacy: {
    simple: `🔒 あなたがアップロードした画像は、サーバーに送信されません。

このツールは、あなたのブラウザの中だけで画像を処理しています。
画像データが NoviqLab のサーバーに送られることも、
他のどこかに送信されることもありません。

サイトのキャプチャ画像には、
管理画面や社内情報など機密情報が含まれることもあります。
そういうケースでも安心して使えるように設計しました。

心配な方は、ブラウザの開発者ツール（F12 → ネットワークタブ）で
画像がどこにも送信されていないことを確認できます。`,
    technical: `本ツールは完全なクライアントサイド処理で実装されています。

実装上の保証:
- 画像ファイルは File API で読み込み後、Blob / ObjectURL としてブラウザメモリ内で保持
- Canvas API と ImageData によるピクセル操作もブラウザ内で実行
- XHR / Fetch API を使った外部通信は画像処理ロジックに一切含まれません
- アクセス解析には Cloudflare Web Analytics のみ使用（Cookie / IP 記録なし）
- Google Analytics / Meta Pixel / その他トラッカーは Tools ページでは一切読み込まれません

DevTools の Network タブで確認できる通信:
- ページ自体の HTML / JS / CSS の読み込み
- Cloudflare Analytics のビーコン（画像データは含まない）
- 以上の範囲に限定されます

ユーザーの画像データ・ファイル名・分割設定などが外部に送信されることはありません。
NoviqLab Tools 共通のプライバシー方針に準拠しています。`,
  },
  splitMode: {
    simple: `📐 画像の分割方法を選びます。

「高さピクセル指定」は、指定したピクセル数ごとに画像を切っていく方法です。
たとえば「1000」と入れれば、1000px ごとに区切られます。

「A4印刷用」は、A4用紙の縦横比（1:√2）に合わせて自動で計算する方法です。
画像の幅から最適な高さが自動で決まるので、
印刷時にちょうどA4用紙に収まるサイズになります。

迷ったら、まず「高さピクセル指定」で試してみるのがおすすめです。
プレビューの赤線を見ながら調整できます。`,
    technical: `2種類のモードで内部計算ロジックが異なります。

高さピクセル指定モード (mode: "fixed"):
- ユーザー指定の fixedHeight を分割単位として使用
- 最小100px (それ以下はバリデーションで拒否)
- 理想分割位置 = n × fixedHeight (n = 1, 2, 3, ...)
- 画像の height を超えたら終了、残りを最後のピースに

A4印刷用モード (mode: "a4"):
- unitHeight = Math.round(width × Math.SQRT2)
- 幅1200px の場合、高さ約1697px ごとに分割
- 印刷時にA4用紙 (210 × 297mm, 比率 1:√2) にフィットする
- 画像の縦横比は維持され、余計な余白追加はしない

どちらのモードでも、次の「スマート分割」を ON にすると
理想位置の±50px 範囲で余白を探索し、切断位置を微調整します。`,
  },
  height: {
    simple: `🔢 1ピースあたりの高さをピクセル単位で指定します。

デフォルトは 1000px。
一般的なWebサイトのスクリーンショットなら、この値がちょうど良いサイズです。

小さくするほど、たくさんのピースに分割されます。
大きくするほど、少ないピースになりますが、1ピースが大きくなって印刷時に小さく見えます。

目安:
・印刷用なら 800〜1200px
・Slack共有用なら 600〜1000px
・細かく区切りたい時は 500〜700px

変更するとすぐにプレビューの赤線が更新されるので、
ちょうど良いサイズを視覚的に見つけられます。`,
    technical: `単位は px、内部的には整数として扱います。

バリデーション:
- 最小値: 100 (それ以下は強制的に 1000 に戻す)
- 最大値: 明示的な上限なし (画像の height を超えると実質1ピースになる)
- 空欄 / 非数値: 1000 にフォールバック

推奨値の根拠:
- 1000px = A4用紙 (縦297mm = 約842pt) を 150dpi で想定した場合のざっくり基準
- ディスプレイでの可読性と印刷時のディテール保持のバランス
- 実用上、この値前後で調整すれば大きな問題は起きません

スマート分割 ON 時はこの値はあくまで「理想位置」であり、
実際の分割位置は余白行検出により ±50px の範囲で調整されます。`,
  },
  smartSplit: {
    simple: `✨ 「文字の途中」や「図の途中」で画像が切れるのを自動で防ぎます。

機械的に決まったピクセルで切ると、
ちょうど文字の真ん中や、図の中央で泣き別れになることがあります。
読みにくいし、印刷資料としても見栄えがよくありません。

このスイッチをONにすると、
「このあたりで切れればいいな」という位置の前後を自動でチェックして、
文字や図がない「余白のあるところ」を見つけて、そこで切ります。

OFFにすると、機械的に正確なピクセルで分割されます。
規則的に切りたい特殊なケース以外は、基本ONがおすすめです。

デフォルトはONです。`,
    technical: `余白行検出アルゴリズムによる動的な切断位置調整機能です。

アルゴリズム:
1. 機械分割の理想位置を計算 (calcSplitPositions)
2. 画像全体を Canvas の ImageData に変換
3. 各行について「余白行」判定:
   - 行の最初のピクセルを基準色とする
   - 行の全ピクセルが基準色±10 (RGB各値) 以内なら余白行
   - 1ピクセルでも外れたら非余白 (早期リターンで高速化)
4. 連続する余白行を「ブロック」としてまとめる (start / end / size / center)
5. 各理想位置の前後±50px 範囲にあるブロックを探索
6. スコアリング: size × 2 - |center - idealY|
   - ブロックサイズが大きいほど高スコア
   - 理想位置に近いほど高スコア
7. 最高スコアのブロック中央を実際の切断位置に採用
8. 複数の理想位置が同じブロックに吸着した場合は重複削除

フォールバック:
- ±50px 範囲に余白ブロックがない場合、理想位置のまま切断
- 画像データ取得失敗などエラー時は機械分割にフォールバック

内部固定値:
- WHITESPACE_TOLERANCE = 10 (RGB各値の許容差)
- SEARCH_RANGE = 50 (探索範囲 px)

これらはユーザー公開せず、大半のケースで適切に動作するよう調整済みです。`,
  },
} as const;
```

---

## 3. Task 2: ImageSplitter.tsx に説明文トグルを統合

### 3.1 import 追加

```tsx
import IntroToggle from "@/components/tools/common/IntroToggle";
import UsageToggle from "@/components/tools/common/UsageToggle";
import { DESCRIPTIONS } from "./descriptions";
```

### 3.2 ページ冒頭に 2 つの IntroToggle 配置

メインの `return` の `<div className="mt-8 flex ...">` の**直前**に、以下のブロックを追加：

```tsx
{/* ページ冒頭: 2つのトグルボタン */}
<div className="flex flex-wrap gap-3 mt-6 mb-2">
  <IntroToggle
    buttonLabel="このツールについて"
    simpleText={DESCRIPTIONS.intro.simple}
    technicalText={DESCRIPTIONS.intro.technical}
  />
  <IntroToggle
    buttonLabel="個人情報保護について"
    variant="privacy"
    simpleText={DESCRIPTIONS.privacy.simple}
    technicalText={DESCRIPTIONS.privacy.technical}
  />
</div>
```

### 3.3 サイドバーの各セクションを UsageToggle でラップ

#### 分割モードセクション

**変更前**:
```tsx
<div>
  <p className="text-xs text-white/40 uppercase tracking-widest mb-2">分割モード</p>
  <div className="space-y-2">
    {/* ラジオボタン2つ */}
  </div>
</div>
```

**変更後**:
```tsx
<UsageToggle
  label="分割モード"
  simpleText={DESCRIPTIONS.splitMode.simple}
  technicalText={DESCRIPTIONS.splitMode.technical}
>
  <div className="space-y-2">
    {/* ラジオボタン2つ */}
  </div>
</UsageToggle>
```

**ポイント**:
- UsageToggle は内部で `<p className="text-xs text-white/40 uppercase tracking-widest mb-2">` 相当のラベルを自動で描画する
- なので元の `<p>` タグは削除する
- `<div className="space-y-2">` は `UsageToggle` の children として渡す

#### 高さ px セクション（fixed モード時のみ表示）

**変更前**:
```tsx
{settings.mode === "fixed" && (
  <div>
    <p className="text-xs text-white/40 uppercase tracking-widest mb-2">高さ px</p>
    <input type="number" ... />
  </div>
)}
```

**変更後**:
```tsx
{settings.mode === "fixed" && (
  <UsageToggle
    label="高さ px"
    simpleText={DESCRIPTIONS.height.simple}
    technicalText={DESCRIPTIONS.height.technical}
  >
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
  </UsageToggle>
)}
```

#### A4モードの説明ボックス（変更不要）

A4モード選択時に出る説明ボックス（幅から高さを自動計算する旨）はそのまま残す。モード固有の動的情報なので、UsageToggle にラップする必要なし。

#### スマート分割セクション

**変更前**:
```tsx
<div>
  <p className="text-xs text-white/40 uppercase tracking-widest mb-2">スマート分割</p>
  <label className="flex items-center gap-2 cursor-pointer">
    <input type="checkbox" ... />
    <span className="text-sm text-white/85">余白行を検出して切る</span>
  </label>
</div>
```

**変更後**:
```tsx
<UsageToggle
  label="スマート分割"
  simpleText={DESCRIPTIONS.smartSplit.simple}
  technicalText={DESCRIPTIONS.smartSplit.technical}
>
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={settings.smartSplit}
      onChange={(e) =>
        setSettings((s) => ({ ...s, smartSplit: e.target.checked }))
      }
      className="accent-sky-400"
    />
    <span className="text-sm text-white/85">余白行を検出して切る</span>
  </label>
</UsageToggle>
```

### 3.4 分割予定情報・エラー表示は変更なし

「分割予定: N ピース」の情報ボックスや、「分割不要」メッセージは動的な表示のため、UsageToggle にラップしない。

---

## 4. Task 3: ビルド確認

```bash
npm run build
```

エラー・警告なしを確認。

---

## 5. Task 4: 動作確認（10分）

### 5.1 devサーバー起動

```bash
npm run dev -- --port 3100
```

### 5.2 確認項目

**ページ冒頭**:
- [ ] `[このツールについて ▼]` ボタン表示
- [ ] `[個人情報保護について ▼]` ボタン表示（variant="privacy" なので色が若干異なる）
- [ ] クリックで展開、絵文字付きの文章が表示される
- [ ] `[▶ 技術に興味のある方へ]` でさらに展開、技術詳細が表示される

**サイドバー各セクション**:
- [ ] 分割モード右横に `[使い方]` ボタン表示
- [ ] 高さ px 右横に `[使い方]` ボタン表示（fixed モード時のみ）
- [ ] スマート分割 右横に `[使い方]` ボタン表示
- [ ] 各トグルで展開、独立して開閉できる（他のトグルを閉じずに複数同時表示可能）

**動作確認**:
- [ ] 画像ドロップ → プレビュー → 分割実行まで通常動作
- [ ] スマート分割 ON/OFF 切替 → 赤線位置が変わる
- [ ] A4モード ↔ fixed モード切替 → 高さ px トグルの表示/非表示が切り替わる

**退行テスト**:
- [ ] Image Converter 正常動作
- [ ] シンプルモード [使い方] トグルも正常（共通コンポーネント破壊なし）

---

## 6. 完了報告フォーマット

```markdown
## Image Splitter Day 4 完了報告

### 実装項目
- [x] Task 1: descriptions.ts 新規作成
  - intro, privacy, splitMode, height, smartSplit の 5セクション × 2層
- [x] Task 2: ImageSplitter.tsx に説明文トグル統合
  - ページ冒頭: IntroToggle 2個（このツール / 個人情報保護）
  - サイドバー: UsageToggle 3個（分割モード / 高さ px / スマート分割）
- [x] Task 3: ビルド成功
- [x] Task 4: 動作確認

### 変更ファイル
- app/tools/image-splitter/descriptions.ts（新規作成）
- app/tools/image-splitter/ImageSplitter.tsx（統合）

### 動作確認結果
- [x] ページ冒頭 2トグル 正常表示・展開
- [x] サイドバー各セクション 3トグル 正常表示・展開
- [x] 複数トグル独立開閉
- [x] 画像処理機能に影響なし
- [x] Image Converter 退行なし
```

---

## 7. 禁止事項

### ❌ やってはいけないこと

- **descriptions.ts のテキストを変更**しない（一字一句そのまま）
- **UsageToggle / IntroToggle / InfoAccordion の実装を変更**しない（共通コンポーネント）
- **splitLogic.ts を変更**しない（ロジックに手を入れない）
- **分割予定情報ボックスを UsageToggle でラップ**しない（動的情報なので常時表示）

### ⚠️ 判断が必要な場合

- UsageToggle に既に `<p>` タグでラベルが描画される場合、元のラベル `<p>` は削除する
- トグル配置で既存のレイアウトが崩れる場合、`space-y-6` などの既存の余白クラスを活用する

### ✅ 品質基準

- TypeScript strict エラーなし
- ビルド成功
- 説明文が Image Converter の UI と同じ体験で開閉できる
- 絵文字が正常表示される
- モバイル表示でレイアウト崩れなし

---

**以上。Image Splitter Day 4 タスク開始してください。**

**重要ポイント**:
1. **descriptions.ts は一字一句そのまま**
2. **共通コンポーネント（UsageToggle / IntroToggle）の既存仕様を尊重**
3. **ロジックは触らない**（純粋に UI 説明文の追加のみ）
4. **Image Converter のシンプルモードと同じ UX 体験**を再現
