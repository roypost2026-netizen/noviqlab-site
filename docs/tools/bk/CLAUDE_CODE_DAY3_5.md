# ClaudeCode 実装指示: Day 3.5 - suffix 自動割当（UX改善）

**対象**: `E:\app\noviqlab\noviqlab-site`
**関連**: Day 3 実装済み。本タスクは BatchMode.tsx のみを修正する軽量な UX 改善。
**所要時間**: 15〜20分
**背景**: Day 3 のテスト中、複数画像追加時にsuffix欄のplaceholder（`-a`）が実値と誤認されやすく、かつ空suffix複数で重複エラーが出てしまう問題が判明。画像追加時に自動でsuffixを割り当てることで解決する。

---

## 1. 変更範囲

**修正ファイル**:
- `app/tools/image-resizer/BatchMode.tsx` のみ

**変更しないもの**:
- types.ts / imageProcessor.ts / ProfileEditor.tsx / builtinPresets.ts
- 既存のバリデーションロジック（サフィックス文字制限、重複チェック）
- UI レイアウト

---

## 2. 実装仕様

### 2.1 suffix 自動割当ルール

画像追加時、以下のルールで自動的に suffix を設定する：

**ルール**:
1. 既存の画像の suffix を集めて「使用済み set」を作る
2. 新規追加する各画像について、**`-a`, `-b`, `-c`, `-d`, ..., `-z`** の順に使用済みでない最初のものを割り当てる
3. 26文字（`-z`）を超える場合は `-img1`, `-img2`, ... でフォールバック

**例**:

- **初めて1枚追加**: suffix = `-a`
- **2枚目追加**: suffix = `-b`（既存 `-a` を避ける）
- **3枚目追加**: suffix = `-c`
- **1枚目を削除後、追加**: suffix = `-a`（`-a`が空いたので再利用）
- **ユーザーが `-a` を `-pro` に変更後、新規追加**: suffix = `-a`（`-a`が空いている）
- **1枚運用（profile.jpg）の場合**: 1枚追加 → `-a` が入る → **ユーザーが手動で空にする**

### 2.2 実装詳細

`BatchMode.tsx` の `handleAddImages` 関数を以下のように修正する。

**現状のコード**（参考、実際は ClaudeCode が view で確認）:

```typescript
const handleAddImages = (profileId: string, files: FileList | File[]) => {
  const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
  if (arr.length === 0) return;

  setAssignments((prev) => prev.map((a) => {
    if (a.profileId !== profileId) return a;
    const remaining = MAX_IMAGES_PER_PROFILE - a.images.length;
    const toAdd = arr.slice(0, remaining);
    const newImages: AssignedImage[] = toAdd.map((file) => ({
      id: genId(),
      file,
      imageSuffix: "",   // ← ここを自動割当に変更
      previewUrl: URL.createObjectURL(file),
      status: "waiting",
    }));
    return { ...a, images: [...a.images, ...newImages], status: "waiting" };
  }));
};
```

**修正版**:

```typescript
/**
 * 次に使える suffix を返す。既存 suffix を避けて -a, -b, -c, ..., -z を試し、
 * すべて埋まっていたら -img1, -img2, ... でフォールバック。
 */
function findNextSuffix(used: Set<string>): string {
  for (let i = 0; i < 26; i++) {
    const candidate = `-${String.fromCharCode(97 + i)}`; // -a, -b, ..., -z
    if (!used.has(candidate)) return candidate;
  }
  let n = 1;
  while (used.has(`-img${n}`)) n++;
  return `-img${n}`;
}

const handleAddImages = (profileId: string, files: FileList | File[]) => {
  const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
  if (arr.length === 0) return;

  setAssignments((prev) => prev.map((a) => {
    if (a.profileId !== profileId) return a;
    const remaining = MAX_IMAGES_PER_PROFILE - a.images.length;
    const toAdd = arr.slice(0, remaining);

    // 既存 + 追加中の suffix を集めて重複回避
    const used = new Set(a.images.map((img) => img.imageSuffix));

    const newImages: AssignedImage[] = toAdd.map((file) => {
      const suffix = findNextSuffix(used);
      used.add(suffix);
      return {
        id: genId(),
        file,
        imageSuffix: suffix,  // 自動割当
        previewUrl: URL.createObjectURL(file),
        status: "waiting",
      };
    });
    return { ...a, images: [...a.images, ...newImages], status: "waiting" };
  }));
};
```

### 2.3 placeholder 文言の調整（軽微）

自動割当になったことで、placeholder は **「空にすると suffix なし」** のヒントにする：

**現状**:
```tsx
<input type="text" placeholder="-a" ... />
```

**修正後**:
```tsx
<input type="text" placeholder="（空 = suffixなし）" ... />
```

これにより、ユーザーは「空にしたら suffix が消える」ことを理解できる。

### 2.4 1枚運用（profile.jpg）への配慮

このロジックだと、profile.jpg 用に1枚追加した場合も `-a` が自動で入る。
**ユーザーは suffix 欄の `-a` を削除**して空文字にする必要がある。

この挙動は UX的に許容可能（1枚運用時は手動で空にする、という明示的な操作）。
ただし、**このことを placeholder で示唆**する修正（2.3）は必須。

---

## 3. 動作確認

### 3.1 基本確認

1. `npm run dev`（または既に起動中）
2. バッチモードに切り替え → プリセット「Web制作・ヒーロー用」読込
3. 画像を**4枚まとめてドロップ**
4. 各画像の suffix 欄に自動で `-a`, `-b`, `-c`, `-d` が入っているか
5. 「サフィックスが重複しています」のエラーが**出ていない**こと
6. 「全て生成（8ファイル）」ボタンが**有効**になっていること
7. 生成予定リストに `hero-a.jpg`, `hero-a@2x.jpg`, `hero-b.jpg`, ... が表示されていること

### 3.2 個別動作

- **1枚削除**: 2枚目（`-b`）を削除 → 再度追加すると `-b` が割り当てられる（空きを再利用）
- **手動変更**: 1枚目の `-a` を `-pro` に手動で書き換え → 新規追加時は `-a` が割り当てられる
- **1枚運用**: profile相当のプロファイルで1枚だけ追加 → `-a` が入る → 手動で空にすれば `profile.jpg` として生成される

### 3.3 ビルド確認

```bash
npm run build
```

エラー・警告なし。

---

## 4. 完了報告フォーマット

```markdown
## Day 3.5 完了報告

### 実装項目
- [x] findNextSuffix 関数追加
- [x] handleAddImages で自動 suffix 割当
- [x] placeholder 文言変更

### 動作確認結果
- [x] 4枚一括ドロップで -a, -b, -c, -d 自動割当
- [x] 重複エラー発生せず
- [x] 8ファイル生成予定がリアルタイム表示
- [x] 削除後の再追加で空きsuffix再利用
- [x] 手動変更後の追加で正しく空きsuffix割当
- [x] 1枚運用（手動空化）の動作確認

### ビルド確認
- `npm run build`: 成功/警告の有無

### 変更ファイル
- app/tools/image-resizer/BatchMode.tsx（findNextSuffix 追加、handleAddImages 修正、placeholder 変更）
```

---

## 5. 注意事項

### ❌ やってはいけないこと

- 他ファイル（types.ts, imageProcessor.ts など）の変更
- 既存のバリデーションロジック変更
- placeholder 以外のUI変更

### ✅ 保持すべき挙動

- サフィックス重複時のエラー表示（ユーザーが手動で重複させた場合）
- サフィックス文字制限（`/^[a-zA-Z0-9_-]*$/`）のバリデーション
- 空 suffix が1枚だけの場合は重複エラーを出さない（profile.jpg 対応）

---

**以上。Day 3.5 タスク開始してください。**
