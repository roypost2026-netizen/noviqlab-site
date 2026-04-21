# ClaudeCode 実装指示: Day 4 - シンプルモード説明文追加 + UX改善

**対象**: `E:\app\noviqlab\noviqlab-site`
**関連**: Phase 1 完了済み。本タスクは UX 改善パッケージの一部（UX-08, UX-09, UX-10, UX-11）を対象とする。
**所要時間**: 3〜4時間
**前提**:
- Day 1〜3.5 完了済み
- Git 最新コミット: `2798a85 Phase 1 完全クリア`
- シンプルモード・バッチモード両方の基本動作確認済み

**ゴール**:
シンプルモードに**中学生向け説明文 + 技術者向け詳細アコーディオン**を追加し、「なにもわからない訪問者」から「技術に興味のあるエンジニア」まで快適に使えるツールにする。加えて、Phase 5 テスト中に発見された UX 課題（UX-08 プロファイル名編集導線、UX-09 比率変更時の自動サイズ提案）も解消する。

---

## 0. 事前準備

### 0.1 必読ドキュメント

- `docs/tools/REQUIREMENTS.md` v3.0
- `docs/tools/CLAUDE_CODE_DAY1.md` 〜 `DAY3_5.md`（参考）
- **本指示書の「4. 説明文テキスト」セクション全文**

### 0.2 現状確認

```bash
cd E:\app\noviqlab\noviqlab-site
git log --oneline -3
git status
```

期待: 最新コミット `2798a85`、working tree clean。

### 0.3 開発サーバー起動

```bash
npm run dev -- --port 3100
```

---

## 1. 全体方針

### 1.1 変更範囲

**修正ファイル**:
- `app/tools/image-resizer/SimpleMode.tsx` - 説明文追加（最大のタスク）
- `app/tools/image-resizer/BatchMode.tsx` - UX-08 対応
- `app/tools/image-resizer/ProfileEditor.tsx` - UX-09 対応

**新規ファイル**:
- `app/tools/image-resizer/InfoAccordion.tsx` - 技術者向け詳細のアコーディオンコンポーネント（共通化）
- `app/tools/image-resizer/descriptions.ts` - 説明文テキストを分離管理

**変更しないもの**:
- `types.ts`, `imageProcessor.ts`, `builtinPresets.ts`
- 既存のビジネスロジック、バリデーション
- レイアウト骨格（新しい説明セクションを追加するだけ）

### 1.2 後方互換性

- 既存機能の挙動は一切変更しない
- 追加 CSS・DOM のみで対応
- localStorage / JSON スキーマも変更なし

### 1.3 デザイン方針

- 説明文は**中学生向け**と**技術者向け詳細（アコーディオン）**の二層構造
- 絵文字を適度に使用（中学生向けのみ）、技術者向け詳細はテキストのみ
- 背景: `bg-white/5`、区切り: `border-white/10`
- アコーディオンは `<details>` 要素で実装（アクセシビリティ対応、JavaScriptなしでも動作）
- すべて**です・ます調**で統一

---

## 2. 実装タスク

### Task 1: InfoAccordion コンポーネント作成（20分）

#### 1.1 `app/tools/image-resizer/InfoAccordion.tsx` を新規作成

```tsx
"use client";

import { ReactNode } from "react";

interface InfoAccordionProps {
  title?: string; // デフォルト: "▶ 技術に興味のある方へ"
  children: ReactNode;
}

export default function InfoAccordion({
  title = "技術に興味のある方へ",
  children,
}: InfoAccordionProps) {
  return (
    <details className="mt-2 group">
      <summary className="cursor-pointer text-xs text-white/40 hover:text-white/60 transition-colors select-none list-none flex items-center gap-1">
        <span className="transition-transform group-open:rotate-90 inline-block">▶</span>
        <span>{title}</span>
      </summary>
      <div className="mt-2 pl-4 py-2 border-l border-white/10 text-xs text-white/50 leading-relaxed space-y-2">
        {children}
      </div>
    </details>
  );
}
```

**ポイント**:
- `<details>` + `<summary>` でJavaScriptなしでも動作
- `group-open:rotate-90` で開閉時の三角アイコン回転
- 左側のボーダーで視覚的な階層表現
- 中の文章は `space-y-2` で段落間隔を保つ

---

### Task 2: descriptions.ts 作成（30分）

#### 2.1 `app/tools/image-resizer/descriptions.ts` を新規作成

説明文テキストを一箇所に集約。本指示書の**「4. 説明文テキスト」セクション**をそのまま TypeScript オブジェクトに落とし込む。

```tsx
export const DESCRIPTIONS = {
  intro: {
    simple: `📸 画像のサイズを小さくしたり、写真の保存形式を変えたりできるツールです。
スマホで撮った重い写真も、このツールでサクッと『スマホ用』のサイズに変換できます。
「アップロードした画像は保存されませんし、個人情報は丸ごと消えるように設計」しましたので、だれでも安全に利用できます。`,
    technical: `このツールはブラウザ完結型で動いています。

通常の Web サービスは、アップロードした画像をサーバーに送って処理しますが、このツールはあなたのブラウザ自身が画像を処理します。具体的には Canvas API（ブラウザに標準で備わっている、画像を描いたり加工したりする機能）を使っています。

そのため、ネットワーク通信は一切発生しません。最初にこのページを開いたとき、ブラウザは HTML・JavaScript・CSS のファイルを受け取りますが、その後は画像データがサーバーに流れることはありません。

対応している形式は JPEG / PNG / WebP / AVIF の4種類。ただし AVIF は書き出し（エンコード）に対応していないブラウザがあるため、起動時に自動検出して対応していなければ選択肢から外しています。

また、大きな画像を小さくする際は step-down（段階的縮小）というアルゴリズムを使っています。これは画像を一気に小さくすると画質が荒くなる問題を防ぐため、まず半分に、さらに半分に…と段階的に縮めていく方法です。`,
  },
  // privacy, outputFormat, quality, bgColor, resize, preset, adjust, dropzone も同様に
  // 本指示書の「4. 説明文テキスト」からコピー
} as const;
```

**重要**:
- 本指示書の「4. 説明文テキスト」セクションの**全ての文章をそのままコピー**する
- バックスラッシュ + n での改行を正しく保持する
- 絵文字も含めて完全にコピー

---

### Task 3: SimpleMode.tsx に説明文を追加（1〜1.5時間）

#### 3.1 既存コードの理解

**最初に必ず view で読む**：
- `app/tools/image-resizer/SimpleMode.tsx` 全体
- どこに説明文を追加するかを把握してから編集

#### 3.2 追加する説明文の配置

以下の順序で追加：

```
┌─ パンくず・タブ ─────────────┐ (既存、変更なし)
├─ 【NEW】ページ冒頭の紹介文 ──┤
│   中学生向け本文             │
│   ▶ 技術に興味のある方へ     │
├─ 【NEW】プライバシー説明 ───┤
│   中学生向け本文             │
│   ▶ 技術に興味のある方へ     │
├─ サイドバー設定エリア ─────┤ (既存)
│   ├ 出力形式               │
│   │  【NEW】説明文 + 詳細   │
│   ├ 画質                   │
│   │  【NEW】説明文 + 詳細   │
│   ├ 透過→背景色            │
│   │  【NEW】説明文 + 詳細   │
│   ├ リサイズ               │
│   │  【NEW】説明文 + 詳細   │
│   ├ プリセット             │
│   │  【NEW】説明文 + 詳細   │
│   └ 調整                   │
│      【NEW】説明文 + 詳細   │
├─ メインエリア ──────────────┤
│   ├ ドロップゾーン         │
│   │  【NEW】説明文 + 詳細   │
│   └ ファイルリスト         │ (既存)
└──────────────────────────────┘
```

#### 3.3 ページ冒頭の紹介文の実装

パンくず直後、モード切替タブの直後あたりに配置：

```tsx
{/* ページ冒頭の紹介文 */}
<div className="mb-6 bg-white/5 rounded-xl p-4">
  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">
    {DESCRIPTIONS.intro.simple}
  </p>
  <InfoAccordion>
    <p className="whitespace-pre-line">{DESCRIPTIONS.intro.technical}</p>
  </InfoAccordion>
</div>
```

**ポイント**:
- `whitespace-pre-line` で改行を反映
- 背景カードで明確に区切る

#### 3.4 プライバシー説明の配置

紹介文の直後、同じくカード形式で：

```tsx
{/* プライバシー説明 */}
<div className="mb-6 bg-sky-500/10 border border-sky-400/20 rounded-xl p-4">
  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">
    {DESCRIPTIONS.privacy.simple}
  </p>
  <InfoAccordion>
    <p className="whitespace-pre-line">{DESCRIPTIONS.privacy.technical}</p>
  </InfoAccordion>
</div>
```

**ポイント**:
- プライバシーは重要なので `sky-500/10` で少し目立たせる
- 枠も `sky-400/20` で軽く付ける

#### 3.5 各設定項目への説明追加

サイドバーの各セクション（出力形式・画質・背景色・リサイズ・プリセット・調整）の**既存のラベルの直後に**、小さめの説明文と詳細アコーディオンを挿入。

例: 「出力形式」セクションの場合

**現状（推定）**:
```tsx
<section className="bg-white/5 rounded-xl p-4 space-y-3">
  <p className="text-xs text-white/40 uppercase tracking-widest">出力形式</p>
  {/* 既存のボタン群 */}
</section>
```

**変更後**:
```tsx
<section className="bg-white/5 rounded-xl p-4 space-y-3">
  <div>
    <p className="text-xs text-white/40 uppercase tracking-widest mb-2">出力形式</p>
    <p className="text-xs text-white/60 leading-relaxed whitespace-pre-line">
      {DESCRIPTIONS.outputFormat.simple}
    </p>
    <InfoAccordion>
      <p className="whitespace-pre-line">{DESCRIPTIONS.outputFormat.technical}</p>
    </InfoAccordion>
  </div>
  {/* 既存のボタン群（ここは変更しない） */}
</section>
```

**全項目で同様の対応**:
- 出力形式
- 画質
- 透過→背景色
- リサイズ
- プリセット（リサイズONの時に表示される既存のプリセットボタン群の前に）
- 調整

#### 3.6 ドロップゾーン周辺

ドロップゾーンの上（もしくは下）に配置。メインエリアなので目立たせすぎず、小さく。

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
{/* 既存のドロップゾーン */}
```

---

### Task 4: UX-09 比率変更時のバリアント自動サイズ提案（30分）

#### 4.1 `app/tools/image-resizer/ProfileEditor.tsx` の修正

**現状の課題**（再掲）:
- プロファイル編集で比率を `3:2` → `16:9` に変えても、バリアントの幅・高さは元のまま
- ユーザーが手動で全バリアントの幅・高さを計算し直す必要がある

**実装方針**:

比率を変更した瞬間、**既存の各バリアントの高さを自動で再計算**する。ただし「幅は維持する」方針とする（幅は画像表示サイズに直結するため、ユーザーの意図した値を保つ）。

```tsx
// 比率変更時のハンドラを修正
const handleAspectRatioChange = (newRatio: AspectRatio) => {
  const targetAR = resolveAspectRatioValue(newRatio); // 既存のヘルパー関数を利用
  
  // 既存のバリアントの幅を維持して高さを再計算
  const updatedVariants = variants.map(v => {
    if (!v.width) return v; // 幅が未入力なら何もしない
    return {
      ...v,
      height: Math.round(v.width / targetAR),
    };
  });
  
  setAspectRatio(newRatio);
  setVariants(updatedVariants);
};
```

**既存の比率 select の onChange を上記に差し替え**。

**import 追加**:
```tsx
import { resolveAspectRatioValue } from "./imageProcessor";
```

注: `resolveAspectRatioValue` が imageProcessor.ts にエクスポートされていない場合、エクスポート追加する必要あり。既存コードを view で確認すること。

#### 4.2 カスタム比率対応

「カスタム」選択時や「カスタム幅・高さ」を変更した場合も同様に再計算する必要がある。

```tsx
const handleCustomRatioChange = (customW: number, customH: number) => {
  const targetAR = customW / customH;
  const updatedVariants = variants.map(v => {
    if (!v.width) return v;
    return { ...v, height: Math.round(v.width / targetAR) };
  });
  setAspectRatio({ type: "custom", value: "custom", customWidth: customW, customHeight: customH });
  setVariants(updatedVariants);
};
```

#### 4.3 バリアントの幅変更時も高さを自動追従

**追加対応**: バリアントの幅入力を変更した時、現在の比率に基づいて高さを自動計算する。

```tsx
const handleVariantWidthChange = (variantId: string, newWidth: number) => {
  const targetAR = resolveAspectRatioValue(aspectRatio);
  updateVariant(variantId, {
    width: newWidth,
    height: Math.round(newWidth / targetAR),
  });
};
```

ただし、**ユーザーが意図的に高さだけ変えたい場合**もある。そのため：
- 幅を変更 → 高さ自動計算（現状の比率に合わせる）
- **高さを直接変更**した場合は、**比率との不一致を警告表示**（赤枠・警告文）

```tsx
// バリアント編集UIの中で
{v.width && v.height && (
  const expectedHeight = Math.round(v.width / resolveAspectRatioValue(aspectRatio));
  Math.abs(v.height - expectedHeight) > 1 && (
    <p className="text-xs text-amber-400">
      ⚠️ 高さが比率と一致していません（期待値: {expectedHeight}px）
    </p>
  )
)}
```

---

### Task 5: UX-08 プロファイル追加直後の名前編集導線（30分）

#### 5.1 現状の課題（再掲）

- プリセット「Web制作・コンテンツ用」を読み込むと、プロファイル名が `content` で追加される
- ユーザーはこのプロファイル名を変更せずに画像を割り当ててしまい、`content-a.jpg` などの意図しないファイル名で生成される

#### 5.2 実装方針

**案A**: プリセット読み込み直後、自動で編集ダイアログを開く
**案B**: プロファイル名がデフォルト値（プリセット由来）の場合、プロファイルカード上に警告バナーを表示

**推奨**: **案B**（案Aはユーザーの操作を強制するので UX が微妙、案Bはソフトな誘導）

#### 5.3 具体実装

`BatchMode.tsx` のプロファイルカード表示部分に警告を追加。

**判定ロジック**:
- プリセット由来のプロファイル名（`content`, `hero`, `profile`, `blog`, `product`, `ogp`）かつ
- baseFilename が同名の場合

```tsx
const PRESET_DEFAULT_NAMES = new Set([
  "hero", "content", "profile", "blog", "product", "ogp"
]);

const isDefaultPresetName = (profile: Profile): boolean => {
  return PRESET_DEFAULT_NAMES.has(profile.name) && profile.name === profile.baseFilename;
};
```

**UI**:

プロファイルカード内の「編集」ボタンの近くに：

```tsx
{isDefaultPresetName(profile) && (
  <div className="mt-2 bg-amber-500/10 border border-amber-400/30 rounded-lg p-2">
    <p className="text-xs text-amber-300">
      💡 プロファイル名が「{profile.name}」のままです。
      用途に合わせた名前（例: truck / tools など）に変更することをおすすめします。
      このまま使うと <span className="font-mono">{profile.name}-a.jpg</span> のような一般的な名前で出力されます。
    </p>
    <button
      onClick={() => handleEditProfile(profile)}
      className="mt-1 text-xs text-amber-400 hover:text-amber-300 underline"
    >
      今すぐ編集
    </button>
  </div>
)}
```

**ポイント**:
- Amber 色で注意喚起するが、強制しない（無視できる）
- 「今すぐ編集」ボタンで編集ダイアログを開くショートカット提供
- 文言は親しみやすく（「💡」「おすすめします」）

---

### Task 6: ビルド確認（10分）

```bash
npm run build
```

エラー・警告なしを確認。

TypeScript エラー対応:
- `DESCRIPTIONS` の型推論が期待通りか確認
- `as const` を付けているので、型エラーが出たら適宜 `typeof` などで調整

---

### Task 7: 動作確認（30分）

#### 7.1 シンプルモードの説明文確認（重要）

1. `http://localhost:3100/tools/image-resizer` を開く
2. **シンプルモードで**以下を確認:
   - ページ冒頭に紹介文が表示されているか
   - 「▶ 技術に興味のある方へ」が展開できるか
   - プライバシー説明が目立つ色（sky）で表示されているか
   - サイドバーの各項目（出力形式・画質・背景色・リサイズ・プリセット・調整）それぞれに説明文が入っているか
   - 各項目のアコーディオンが独立して開閉できるか
   - ドロップゾーンの上に簡単な説明があるか

3. **既存機能の動作確認**:
   - 画像をドロップして変換できるか（退行なし）
   - ZIP DL できるか

#### 7.2 UX-09 比率変更の確認

1. バッチモードへ切り替え
2. プロファイル新規作成または既存プロファイル編集
3. **比率を 3:2 → 16:9 に変更**
4. バリアントの高さが自動的に更新されるか確認
   - 期待: 幅1200 のままなら高さが 675 になる
   - 幅800 のままなら高さが 450 になる
5. **バリアントの幅を 1600 に変更**
6. 高さが 900 に自動更新されるか
7. **高さを手動で 800 に変更**
8. 警告「⚠️ 高さが比率と一致していません」が表示されるか

#### 7.3 UX-08 警告バナーの確認

1. バッチモードでプリセット「Web制作・コンテンツ用」を読み込む
2. 追加された content プロファイルに**💡 警告バナー**が表示されるか
3. 「今すぐ編集」ボタンをクリック→編集ダイアログが開くか
4. 名前を `content` → `truck` に変更して保存
5. **警告バナーが消える**か

#### 7.4 技術者向け詳細の読みやすさ

- いくつかのアコーディオンを開いて、**注釈（〜とは）**が適切に入っているか
- 長すぎず、読み切れる長さか
- 中学生向けと統一感があるか

#### 7.5 モバイル表示（簡易チェック）

DevToolsでモバイルビューに切り替えて：
- 説明文が崩れないか
- アコーディオンがタップしやすいか
- レイアウトが破綻しないか

---

## 3. 完了報告フォーマット

```markdown
## Day 4 完了報告

### 実装項目
- [x] Task 1: InfoAccordion コンポーネント新規作成
- [x] Task 2: descriptions.ts 新規作成（全10セクション）
- [x] Task 3: SimpleMode.tsx に説明文追加
  - ページ冒頭紹介文
  - プライバシー説明
  - 各設定項目（出力形式/画質/背景色/リサイズ/プリセット/調整）
  - ドロップゾーン説明
- [x] Task 4: UX-09 比率変更時のバリアント自動サイズ提案
  - 比率変更時、既存バリアントの高さ自動再計算
  - バリアント幅変更時の高さ自動追従
  - 比率不一致時の警告表示
- [x] Task 5: UX-08 プロファイル名編集誘導バナー
  - プリセットデフォルト名検知ロジック
  - 💡 警告バナー + 「今すぐ編集」ショートカット
- [x] Task 6: ビルド成功
- [x] Task 7: 動作確認

### 退行テスト結果
- [x] シンプルモード: 画像変換・ZIP DL 正常
- [x] バッチモード: プロファイル作成・編集・画像割当・生成・ZIP DL 正常
- [x] localStorage 復元: 正常

### 気づき・改善提案
（あれば記載）

### 変更ファイル
- app/tools/image-resizer/InfoAccordion.tsx（新規）
- app/tools/image-resizer/descriptions.ts（新規）
- app/tools/image-resizer/SimpleMode.tsx（修正）
- app/tools/image-resizer/BatchMode.tsx（修正）
- app/tools/image-resizer/ProfileEditor.tsx（修正）
```

---

## 4. 説明文テキスト（コピー用）

**重要: 以下のテキストを `descriptions.ts` に忠実にコピーすること。改行、絵文字、句読点を変えないこと。**

### 4.1 ページ冒頭の紹介文

**simple**:
```
📸 画像のサイズを小さくしたり、写真の保存形式を変えたりできるツールです。
スマホで撮った重い写真も、このツールでサクッと『スマホ用』のサイズに変換できます。
「アップロードした画像は保存されませんし、個人情報は丸ごと消えるように設計」しましたので、だれでも安全に利用できます。
```

**technical**:
```
このツールはブラウザ完結型で動いています。

通常の Web サービスは、アップロードした画像をサーバーに送って処理しますが、このツールはあなたのブラウザ自身が画像を処理します。具体的には Canvas API（ブラウザに標準で備わっている、画像を描いたり加工したりする機能）を使っています。

そのため、ネットワーク通信は一切発生しません。最初にこのページを開いたとき、ブラウザは HTML・JavaScript・CSS のファイルを受け取りますが、その後は画像データがサーバーに流れることはありません。

対応している形式は JPEG / PNG / WebP / AVIF の4種類。ただし AVIF は書き出し（エンコード）に対応していないブラウザがあるため、起動時に自動検出して対応していなければ選択肢から外しています。

また、大きな画像を小さくする際は step-down（段階的縮小）というアルゴリズムを使っています。これは画像を一気に小さくすると画質が荒くなる問題を防ぐため、まず半分に、さらに半分に…と段階的に縮めていく方法です。
```

### 4.2 プライバシーについて

**simple**:
```
🔒 画像に隠れている個人情報を、このツールが自動でキレイに消します。

スマホで撮った写真には「いつ」「どこで」「どんなカメラで」撮ったかという情報（位置情報を含む）が、目に見えない形で埋め込まれています。
これをそのままSNSに投稿すると、自宅の場所が特定されてしまうことがあります。
このツールで画像を変換すれば、こうした情報は必ず取り除かれます。安心してお使いください。
```

**technical**:
```
EXIF（イグジフ）とは「Exchangeable Image File Format」の略で、デジタルカメラやスマホが写真に自動で埋め込むメタデータ（画像に付随する隠れた情報）のことです。撮影日時・カメラ機種・露出設定・そして GPS 座標などが含まれます。

このツールで変換した画像から EXIF が消える仕組みは、実は「意図して消している」わけではありません。

ブラウザの Canvas（画像を描くための仮想キャンバス）に画像を描き直すと、そのキャンバスから出力される画像には元のメタデータが引き継がれない、という仕様があります。このツールは必ず Canvas を経由するので、結果として EXIF が消えるのです。

ちなみに JPEG に加えて IPTC・XMP（いずれも画像に情報を埋め込むための別の仕組み）も同時に消えます。

逆に「EXIF を残したい」場合、このツールは使えません。将来的に「EXIF を保持するオプション」を追加することも検討しています。
```

### 4.3 出力形式

**simple**:
```
📤 保存する形式（ファイルの種類）を選びます。

・JPG: 写真・イラストに最適。ファイルが軽く、ほぼすべての場所で使えます。迷ったらこれ。
・PNG: 透明な部分を残したい時に。ロゴやアイコン向きです。
・WebP: JPGより軽いのに美しい最新の形式。ブログやWebサイト向き。
・AVIF: さらに軽くて美しい最新形式。対応しているブラウザのみ選べます。
```

**technical**:
```
各形式の特徴を少し詳しく：

JPEG（JPG）: 1992年から使われている古い標準規格。「非可逆圧縮」といって、一度圧縮すると元に戻せない（ただし人間の目には分からない範囲で捨てられる）。写真向き。透過は表現できません。

PNG: 「可逆圧縮」で、画質を一切損なわずに保存できます。そのぶんファイルは大きくなりがち。透過（アルファチャンネル）に対応しているのでロゴやアイコン向き。

WebP: Google が 2010 年に発表した形式。JPEG より 25〜35% 軽いのに同じくらい綺麗。透過にも対応しています。ほぼすべての最新ブラウザで表示可能です。

AVIF: さらに新しい形式で、JPEG より約 50% 軽い。ただし「書き出し」に対応しているブラウザがまだ少なく、Chrome は一部バージョンから対応、Safari は Tahoe から、Firefox は未対応（2026年4月時点）。そのためこのツールでは起動時に対応を自動検出し、書き出しに対応していないブラウザでは選択肢から自動的に外しています。
```

### 4.4 画質

**simple**:
```
🎨 写真の美しさを保つかファイルを軽くするかを調整できます。

・数字を大きくするほど美しくなり、ファイルも大きくなります。
・数字を小さくするほどファイルが軽くなり、画像はやや粗くなります。
・迷ったら 85 をおすすめします。目立った劣化もなく、十分な軽さを保てます。
```

**technical**:
```
JPEG / WebP / AVIF を書き出すとき、「品質」という 1〜100 の数値を指定できます。これは「どれくらいの情報を捨てるか」の度合いです。

・数値が大きいほど捨てる情報が少なく、綺麗だがファイルは大きい
・数値が小さいほど大胆に情報を捨てるので、軽いけど粗くなる

人間の目は意外と鈍感で、85〜90 あたりから見た目の違いをほとんど感じないようになります。これが「迷ったら 85」の根拠です。

ちなみに PNG は「可逆圧縮」といって情報を一切捨てないので、この数値を変えても何も変わりません。そのため PNG 選択時はスライダー自体を非表示にしています。

Web制作バッチモードでは「容量範囲指定」という機能があり、「200〜300KBの範囲に収まるように品質を自動調整」することもできます。これは内部的に二分探索（品質を上げ下げして目標容量に収束させる方法）で実現しています。
```

### 4.5 透過→背景色

**simple**:
```
🎨 透明な部分をどんな色で埋めるかを選びます。

JPGは「透明」を表現できないので、透明な背景のPNG画像をJPGに変えると、透明部分を何かの色で埋める必要があります。
白が無難ですが、ロゴが白いなら黒、サイトの背景色に合わせるのもアリです。
```

**technical**:
```
JPEG は技術的に「透明な部分を表現できない」形式です（PNGのようなアルファチャンネルに対応していない）。

そのため、透過PNG（背景が透明なPNG）をJPEGに変換するには、透明部分を何かの色で塗りつぶす必要があります。

実は Canvas（画像を描くキャンバス）は初期状態が黒です。何の設定もせず透過PNGを JPEG に変換すると、透明部分が黒くなってしまいます。

このツールではそれを避けるため、JPEG 出力を選んだときだけ「まず指定色で Canvas を塗りつぶし、その上に画像を描く」という処理を行っています。デフォルトは白（#ffffff）にしていますが、サイトの背景色に合わせて自由に変更できます。
```

### 4.6 リサイズ

**simple**:
```
📐 画像の大きさ（縦横のピクセル数）を変えます。

たとえば 4000×3000 の重い写真を 800×600 に小さくしたいときに使います。
「アスペクト比を維持」にチェックを入れておくと、画像が潰れたり伸びたりせず、縦横のバランスが保たれます。
拡大はできません。縮小専用です。
```

**technical**:
```
Canvas API の drawImage という命令で画像を縮小できますが、実装によっては画質が荒くなるという問題があります。

ブラウザによっては「nearest-neighbor（ニアレストネイバー）」という最も単純な計算方法を使うことがあり、これだと大幅に縮小したときにギザギザ（エイリアシング）が発生します。

そこでこのツールでは「step-down（段階的縮小）」という手法を採用しています：

1. まず画像を半分に縮小
2. さらに半分に縮小
3. これを目標サイズに近づくまで繰り返す
4. 最後に目標サイズに合わせる

こうすることで各段階でブラウザが適切に補間してくれるため、一気に縮小するよりも綺麗な結果が得られます。

ちなみに拡大には対応していません。ピクセル情報がない状態で無理に引き伸ばしても画質が悪化するだけなので、縮小専用の設計にしています。
```

### 4.7 プリセット

**simple**:
```
📱 よく使うサイズをワンクリックで設定できます。

・X (旧Twitter): 1200×675 - タイムラインで綺麗に表示される比率
・Instagram: 1080×1080 - 正方形の投稿用
・OGP: 1200×630 - SNSで記事リンクを貼った時のプレビュー用
・フルHD / 4K: モニター解像度に合わせた大きめサイズ
```

**technical**:
```
各プリセットの数字は、主要プラットフォームが「この比率・サイズで表示するよ」と公表している推奨仕様に基づいています。

・X (旧Twitter): 1200×675 ... タイムライン上で16:9比率で表示される
・Instagram: 1080×1080 ... フィード投稿の正方形標準
・OGP: 1200×630 ... Open Graph Protocol（Facebook、LinkedIn、X などSNSで記事リンクを貼ったときのプレビュー画像の標準規格）
・フルHD: 1920×1080 ... 一般的なモニターの標準解像度
・4K: 3840×2160 ... 高解像度モニター向け

いずれも「仕様」というよりは「このサイズにしておけば綺麗に表示される」という実用的なガイドラインです。
```

### 4.8 調整（明るさ・コントラスト・彩度）

**simple**:
```
🎚 画像の見た目を微調整できます。

・明るさ: プラスで明るく、マイナスで暗くなります
・コントラスト: プラスでメリハリがつき、マイナスで柔らかくなります
・彩度: プラスで色鮮やかに、マイナスで色あせた感じになります

全部ゼロのままなら、元の画像の色そのままです。
```

**technical**:
```
これはCSSの filter プロパティと同じ処理を Canvas に適用しています。

・brightness(X): 明るさ（1.0 が標準、1.5 で 1.5倍の明るさ）
・contrast(Y): コントラスト（色のメリハリ）
・saturate(Z): 彩度（色の鮮やかさ）

このツールでは ±100 の範囲で調整できるようにしていて、内部的には ±100 を 1.0 ± 1.0 の値に変換しています。

シンプルな調整なので、色温度の調整やトーンカーブなど写真編集ソフト（Photoshop や Lightroom）のような高度な処理はできません。「ちょっと明るく」「少し色鮮やかに」といった簡単な補正向けの機能です。
```

### 4.9 ドロップゾーン

**simple**:
```
画像をこのエリアにドラッグするか、クリックしてファイルを選んでください。

一度に何枚でも選べます。選んだあとに下のリストから1枚ずつ削除することもできます。
対応形式: PNG / JPEG / WebP / AVIF など
```

**technical**:
```
このエリアは HTML5 の標準機能である「Drag and Drop API」と「File API」を組み合わせて実装しています。

画像を受け取ると、ブラウザのメモリ上に画像を配置し、URL.createObjectURL という仕組みで一時的なURLを発行します。このURLはメモリ上の画像を指す一時的なもので、ネットワーク上には存在しません。

変換処理が終わってダウンロードしたあと、あるいはファイルを削除したとき、このツールは自動的に URL.revokeObjectURL でメモリを解放します。これを忘れると「メモリリーク」といって、ブラウザのメモリを無駄に使い続けてしまう問題が発生します（一般的なツールでも意外と忘れられがちな処理です）。
```

---

## 5. 注意事項・禁止事項

### ❌ 絶対にやってはいけないこと

- **既存機能の挙動変更**: 変換ロジック、バリデーション、localStorage周りは触らない
- **説明文の書き換え**: 本指示書の「4. 説明文テキスト」から一言一句変えない（Royさんが推敲した文章）
- **バッチモードに説明文を追加**: 今回はシンプルモードのみ（バッチモードの説明追加は Day 5 で対応予定）
- **新しい依存パッケージの追加**: React と既存のライブラリだけで実装
- **デザインの大幅変更**: 既存の色・フォント・余白を守る

### ⚠️ 判断が必要な場合

以下のケースでは実装を止めて報告：
- `resolveAspectRatioValue` のエクスポートが必要な場合（imageProcessor.ts を触る必要がある）
- 説明文の追加でレイアウトが大きく崩れる場合
- UX-09 の自動サイズ提案で既存のプロファイル編集挙動に影響が出る場合

### ✅ 品質基準

- TypeScript strict モードでエラーなし
- `npm run build` 成功
- モバイル表示でレイアウト崩れなし
- アコーディオンが独立して開閉する（1つ開いたら他が閉じる、みたいなのではなく、個別に開閉可能）
- Lighthouse Accessibility スコア維持（90+）

---

## 6. Phase 1.5 残タスク（Day 4 対象外）

Day 4 完了後も以下は残ります（優先度順）:

| # | 項目 | 優先度 | 工数 |
|---|---|---|---|
| UX-12 | モード切替の説明 | 中 | 15分 |
| UX-13 | 設定項目のツールチップ追加 | 中 | 30分 |
| UX-03 | プリセット読込時の重複チェック | 中 | 30分 |
| UX-06 | プリセット読込時の名前編集ダイアログ | 中 | 20分 |
| UX-07 | 「+バリアント追加」誤クリック防止 | 中 | 15分 |
| UX-14 | 処理の仕組み表示（プロ向け） | 低 | 30分 |
| UX-01 | リサイズ高さ自動計算表示 | 低 | 20分 |
| UX-02 | リサイズ後実サイズ表示 | 低 | 15分 |
| UX-04 | プリセットドロップダウン幅 | 低 | 5分 |

Day 5 でバッチモードの説明追加と合わせて対応予定。

---

**以上。Day 4 タスク開始してください。**

実装順序: Task 1 → 2 → 3 → 4 → 5 → 6 → 7。

**Task 3（SimpleMode.tsx の説明文追加）が最大のタスク**です。既存コードを壊さないよう、必ず view で現状把握してから編集してください。
