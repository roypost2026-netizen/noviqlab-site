# ClaudeCode 実装指示: Day 6 - バグ修正（アスペクト比連動・容量範囲比例追従）

**対象**: `E:\app\noviqlab\noviqlab-site`
**関連**: Phase 1 完成後、Royさんが実案件で使用中に発見したバグ2件
**所要時間**: 20〜30分
**前提**: Day 5.6 完了済み、Git push 済み

**ゴール**:
実案件で使用中に発見された以下2つのバグを修正する。

1. **バグ1**: シンプルモードで「アスペクト比を維持」ONの時、幅入力しても高さが自動追従しない
2. **バグ2**: バッチモードのプロファイル編集で、容量下限を手入力しても上限が連動して変化しない（比率が壊れる）

---

## 0. 事前準備

```bash
cd E:\app\noviqlab\noviqlab-site
git log --oneline -3
git status
```

### 作業対象ファイル

- `app/tools/image-resizer/SimpleMode.tsx`（バグ1修正）
- `app/tools/image-resizer/ProfileEditor.tsx`（バグ2修正）

**変更しないもの**:
- `types.ts` / `imageProcessor.ts` / `builtinPresets.ts`
- `descriptions.ts`（テキスト不変）
- 他のコンポーネント全般

---

## 1. バグ1: シンプルモード リサイズの高さ自動追従

### 1.1 現状の挙動

- 「リサイズ」ON、「アスペクト比を維持」ON
- 幅 `1200`、高さ `800` の状態
- 幅を `1600` に変更
- **高さが `800` のまま変わらない** ← バグ

### 1.2 期待される挙動

「アスペクト比を維持」チェック時：

**ケースA: 元画像がドロップされている場合**
- ドロップした画像の実際のアスペクト比を基準に、幅変更時に高さが自動計算される
- 例: 元画像が 4000×3000 (4:3) → 幅 1200 入力 → 高さ 900 自動

**ケースB: 画像がまだドロップされていない場合**
- 現在の幅:高さの比率を維持
- 例: 現在 1200×800 (3:2) → 幅 1600 入力 → 高さ 約1067 自動

### 1.3 実装方針

#### Step 1: 既存コードを view で確認

`app/tools/image-resizer/SimpleMode.tsx` を view し、以下を把握：

- 幅入力の `onChange` ハンドラ
- 高さ入力の `onChange` ハンドラ
- `settings.keepAspect` の参照箇所
- 画像ファイル（files[]）の状態管理
- 画像の元サイズ（`originalWidth`, `originalHeight` など）が state に保持されているか確認

#### Step 2: アスペクト比計算ロジック

```tsx
const calcAspectRatio = (settings: Settings, files: FileData[]): number | null => {
  if (!settings.keepAspect) return null;
  
  const firstFile = files.find(f => f.originalWidth && f.originalHeight);
  if (firstFile?.originalWidth && firstFile?.originalHeight) {
    return firstFile.originalWidth / firstFile.originalHeight;
  }
  
  const w = Number(settings.width);
  const h = Number(settings.height);
  if (w > 0 && h > 0) return w / h;
  
  return null;
};
```

**重要**: 既存の型と変数名を確認して適宜調整すること。

#### Step 3: 幅入力の onChange を修正

```tsx
onChange={(e) => {
  const newWidth = e.target.value;
  setSettings((s) => {
    const ar = calcAspectRatio(s, files);
    const newWidthNum = Number(newWidth);
    const newHeight = (ar && newWidthNum > 0)
      ? String(Math.round(newWidthNum / ar))
      : s.height;
    return { ...s, width: newWidth, height: newHeight, preset: "" };
  });
}}
```

#### Step 4: 高さ入力の onChange も同様に修正

```tsx
onChange={(e) => {
  const newHeight = e.target.value;
  setSettings((s) => {
    const ar = calcAspectRatio(s, files);
    const newHeightNum = Number(newHeight);
    const newWidth = (ar && newHeightNum > 0)
      ? String(Math.round(newHeightNum * ar))
      : s.width;
    return { ...s, width: newWidth, height: newHeight, preset: "" };
  });
}}
```

#### Step 5: 画像ドロップ時の originalWidth / originalHeight の保存を確認

既に実装されていればそのまま利用。未実装なら画像読み込み時に取得して state に保存。

### 1.4 「アスペクト比を維持」OFF 時の挙動

`keepAspect === false` の場合は現状通り（calcAspectRatio が null を返すため既存動作維持）。

---

## 2. バグ2: バッチモード プロファイル編集の容量範囲比例追従

### 2.1 現状の挙動

- プロファイル編集ダイアログでバリアントの容量下限を変更
- 上限が連動せず、比率が崩れる
- 例: 下限 80、上限 120 の状態で、下限を 200 に変更すると上限は 120 のまま

### 2.2 期待される挙動（案a: 比例追従）

**基本ロジック**: 下限と上限の比率を維持するように、片方を変更したらもう片方が比例的に追従。

**ケースA: 両方とも正の値がある状態からの変更**
- 下限 80 → 200（比率 2.5倍）
- 上限 120 → 120 × 2.5 = 300（自動計算）

**ケースB: 上限を変更**
- 下限 80、上限 120 → 上限を 300 に変更
- 比率 300/120 = 2.5倍
- 下限 = 80 × 2.5 = 200（自動計算）

**ケースC: 片方がゼロ or 未入力の場合**
- 比率計算不能（ゼロ除算）
- 連動しない、単純に入力値のみをセット

**ケースD: 初期状態（両方空欄）からの入力**
- 片方だけ入力される段階
- 連動しない

### 2.3 実装方針

#### Step 1: 既存コードを view で確認

`app/tools/image-resizer/ProfileEditor.tsx` を view し、以下を把握：

- バリアントの `minBytes` / `maxBytes` の入力欄
- `updateVariant` などの更新ハンドラ関数
- 既存のバリデーション警告（「容量下限が上限を超えています」など）

#### Step 2: 容量下限入力の onChange を修正

```tsx
<input
  type="number"
  placeholder="例: 150"
  value={v.minBytes ? Math.round(v.minBytes / 1024) : ""}
  onChange={(e) => {
    const newMinKB = e.target.value ? Number(e.target.value) : undefined;
    const newMinBytes = newMinKB !== undefined ? newMinKB * 1024 : undefined;
    
    const oldMinBytes = v.minBytes;
    const oldMaxBytes = v.maxBytes;
    
    if (newMinBytes && newMinBytes > 0 && 
        oldMinBytes && oldMinBytes > 0 && 
        oldMaxBytes && oldMaxBytes > 0) {
      const ratio = newMinBytes / oldMinBytes;
      const newMaxBytes = Math.round(oldMaxBytes * ratio);
      updateVariant(v.id, { minBytes: newMinBytes, maxBytes: newMaxBytes });
    } else {
      updateVariant(v.id, { minBytes: newMinBytes });
    }
  }}
/>
```

#### Step 3: 容量上限入力の onChange も同様に修正

```tsx
<input
  type="number"
  placeholder="例: 200"
  value={v.maxBytes ? Math.round(v.maxBytes / 1024) : ""}
  onChange={(e) => {
    const newMaxKB = e.target.value ? Number(e.target.value) : undefined;
    const newMaxBytes = newMaxKB !== undefined ? newMaxKB * 1024 : undefined;
    
    const oldMinBytes = v.minBytes;
    const oldMaxBytes = v.maxBytes;
    
    if (newMaxBytes && newMaxBytes > 0 && 
        oldMinBytes && oldMinBytes > 0 && 
        oldMaxBytes && oldMaxBytes > 0) {
      const ratio = newMaxBytes / oldMaxBytes;
      const newMinBytes = Math.round(oldMinBytes * ratio);
      updateVariant(v.id, { minBytes: newMinBytes, maxBytes: newMaxBytes });
    } else {
      updateVariant(v.id, { maxBytes: newMaxBytes });
    }
  }}
/>
```

### 2.4 既存の警告ロジックは保持

既存の「容量下限が上限を超えています」警告はそのまま残す。比例追従が正しく機能していれば通常は発動しないが、エッジケース用のセーフティネットとして有効。

### 2.5 既存の容量フィールドの型確認

- 既存コードが `Bytes` 単位か `KB` 単位かを確認
- 上記のサンプルコードでは「KB 表示 / Bytes 保存」を想定、違う場合は適宜調整

---

## 3. 動作確認（5分）

### 3.1 devサーバー起動

```bash
npm run dev -- --port 3100
```

### 3.2 バグ1の確認

1. シンプルモードを開く
2. 画像を1枚ドロップ（例: 4000×3000 の画像）
3. 「リサイズ」ON、「アスペクト比を維持」チェック済みを確認
4. 幅を `1200` から `1600` に変更
5. **高さが自動で `1200`（= 1600 × 3/4）になる**
6. 高さを `900` に変更
7. **幅が自動で `1200`（= 900 × 4/3）になる**

**画像なしの場合**:
1. 画像を全て削除
2. 現在の幅 `1200`、高さ `800` の状態
3. 幅を `1600` に変更
4. **高さが `1067` に自動計算される**（1600 × 800/1200）

### 3.3 バグ2の確認（比例追従）

1. バッチモードを開く
2. プロファイルの「編集」をクリック
3. バリアントの容量下限を `80` → `200` に変更（上限は `120` 状態）
4. **上限が自動的に `300` に変更される**（120 × 200/80 = 300）
5. 上限を `300` → `150` に変更
6. **下限が自動的に `100` に変更される**（200 × 150/300 = 100）

**エッジケース**:
1. バリアントを新規追加（下限・上限ともに空欄）
2. 下限に `80` を入力
3. **上限は空欄のまま**（比率計算不能なので連動しない）
4. 上限に `120` を入力
5. **下限は `80` のまま**（単純入力）

### 3.4 既存機能の退行テスト

- アスペクト比を維持 OFF → 幅と高さが独立して入力可能（従来通り）
- プリセット選択 → 幅/高さが上書きされる（従来通り）
- 画像変換・ZIP DL → 正常動作
- プロファイル保存・JSON エクスポート/インポート → 正常

---

## 4. ビルド確認

```bash
npm run build
```

エラー・警告なしを確認。

---

## 5. 完了報告フォーマット

```markdown
## Day 6 完了報告

### 実装項目
- [x] バグ1: シンプルモード リサイズの高さ自動追従
  - calcAspectRatio ヘルパー関数追加（画像優先、フォールバックで現在の比率）
  - 幅入力 onChange で高さ自動計算
  - 高さ入力 onChange で幅自動計算
- [x] バグ2: バッチモード 容量範囲比例追従
  - 容量下限 onChange で上限が比例追従
  - 容量上限 onChange で下限が比例追従
  - ゼロ除算・初期入力時は連動しない安全設計
- [x] ビルド成功
- [x] 動作確認（画像あり・なし両パターン、エッジケース含む）

### 変更ファイル
- app/tools/image-resizer/SimpleMode.tsx（バグ1）
- app/tools/image-resizer/ProfileEditor.tsx（バグ2）

### 動作確認結果
- [x] 画像ドロップ後の幅→高さ自動計算
- [x] 画像なし時の幅→高さ自動計算（現在比率維持）
- [x] 高さ→幅の逆方向も動作
- [x] アスペクト比維持 OFF 時は従来動作
- [x] 容量下限→上限 比例追従
- [x] 容量上限→下限 比例追従
- [x] 初期入力時（片方ゼロ）は連動しない
- [x] 既存機能退行なし

### 発見事項（あれば）
```

---

## 6. 禁止事項

### ❌ やってはいけないこと

- `types.ts` / `imageProcessor.ts` / `builtinPresets.ts` の変更
- 説明文（descriptions.ts）の変更
- バッチモードの既存アスペクト比連動ロジック（UX-09）を壊すこと
- シンプルモードの「アスペクト比を維持」チェックの位置や文言変更
- 既存の容量範囲バリデーション警告を消すこと（保持する）

### ⚠️ 判断が必要な場合

- 元画像サイズ（`originalWidth` / `originalHeight`）の保存箇所が見つからない場合
  - → 画像ドロップ処理で新規に取得する実装を追加
- 容量単位が Bytes か KB かで表示/保存ロジックが違う場合
  - → 既存の表示ロジックに合わせる

### ✅ 品質基準

- TypeScript strict エラーなし
- ビルド成功
- 画像の有無に関わらず、アスペクト比維持チェック時に幅↔高さが連動
- 容量下限↔上限が比例追従
- エッジケース（片方ゼロ、初期入力時）でエラーにならない

---

**以上。Day 6 タスク開始してください。**

**重要ポイント**:
1. **まず既存コードを view で把握**
2. **元画像サイズの取得方法を既存コードに揃える**
3. **ゼロ除算・初期入力時のエッジケース**を必ず考慮
4. **退行テスト必須**（プリセット・既存の画像変換が壊れていないか）
