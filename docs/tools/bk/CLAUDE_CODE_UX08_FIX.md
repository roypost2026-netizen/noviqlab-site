# ClaudeCode 実装指示: UX-08改 - プロファイル名警告判定の修正

**対象**: `E:\app\noviqlab\noviqlab-site`
**関連**: Day 4 で実装した UX-08（プロファイル名編集誘導バナー）の判定条件を修正。
**所要時間**: 5〜10分
**前提**: Day 4.6 完了済み。バッチモードに警告バナーが表示される状態。

**ゴール**:
現状、`profile` プロファイルと `hero` プロファイルにも警告が表示されているが、これらは **そのまま使うのが正しい命名** である。警告対象から除外する。

---

## 1. 問題の背景

### 現状の挙動

`BatchMode.tsx` 内の判定：

```typescript
const PRESET_DEFAULT_NAMES = new Set([
  "hero", "content", "profile", "blog", "product", "ogp"
]);

function isDefaultPresetName(profile: Profile): boolean {
  return PRESET_DEFAULT_NAMES.has(profile.name) && profile.name === profile.baseFilename;
}
```

この判定により、以下のプロファイルにすべて警告が出てしまう：

| プロファイル名 | 実用性 | 現状の警告 | 正しい挙動 |
|---|---|---|---|
| hero | ✅ 実依頼で使用 | ⚠️警告あり | ❌警告不要 |
| profile | ✅ profile.jpg で正しい | ⚠️警告あり | ❌警告不要 |
| content | ❌ 改名すべき | ⚠️警告あり | ✅警告必要 |
| blog | ❌ 改名すべき | ⚠️警告あり | ✅警告必要 |
| product | ❌ 改名すべき | ⚠️警告あり | ✅警告必要 |
| ogp | ❌ 改名すべき | ⚠️警告あり | ✅警告必要 |

### 実例で考える

- **`hero`**: Web制作で「ヒーロー画像」という標準用語。`hero-a.jpg` `hero-b.jpg` として実依頼で使用されるので正しい。
- **`profile`**: `profile.jpg` が1枚出力される。プロフィール写真の定番命名で、そのまま使うのが自然。
- **`content` / `blog` / `product` / `ogp`**: 抽象的すぎる名前。実案件では必ず何か具体的な名前（例: `article-thumbnail`, `recipe-image` 等）に変えるべき。

---

## 2. 修正内容

### 2.1 `app/tools/image-resizer/BatchMode.tsx` の修正

#### 変更前

```typescript
const PRESET_DEFAULT_NAMES = new Set(["hero", "content", "profile", "blog", "product", "ogp"]);
```

#### 変更後

```typescript
// 警告対象: 抽象的すぎて改名すべきプリセット名のみ
// hero / profile は標準的な命名なので警告しない
const PRESET_DEFAULT_NAMES = new Set(["content", "blog", "product", "ogp"]);
```

**これだけ**。他の実装は一切触らない。

---

## 3. 動作確認（5分）

### 3.1 開発サーバー起動確認

```bash
npm run dev -- --port 3100
```

### 3.2 バッチモードで目視確認

`http://localhost:3100/tools/image-resizer` → バッチモードタブ

#### テスト1: hero プロファイル

1. 「プリセット読み込み ▼」→「Web制作・ヒーロー用」
2. 追加された hero プロファイルに **💡警告バナーが表示されない** ✅

#### テスト2: profile プロファイル

1. 「プリセット読み込み ▼」→「Web制作・プロフィール」
2. 追加された profile プロファイルに **💡警告バナーが表示されない** ✅

#### テスト3: content プロファイル（警告対象）

1. 「プリセット読み込み ▼」→「Web制作・コンテンツ用」
2. 追加された content プロファイルに **💡警告バナー表示** ✅
3. プロファイル名を `truck` に変更して保存 → 警告バナーが消える ✅

### 3.3 ビルド確認

```bash
npm run build
```

エラー・警告なし。

---

## 4. 完了報告フォーマット

```markdown
## UX-08改 完了報告

### 実装項目
- [x] PRESET_DEFAULT_NAMES から "hero" と "profile" を除外

### 動作確認
- [x] hero プロファイル: 警告非表示 ✅
- [x] profile プロファイル: 警告非表示 ✅
- [x] content プロファイル: 警告表示 ✅
- [x] npm run build: 成功

### 変更ファイル
- app/tools/image-resizer/BatchMode.tsx（1行のみ変更）
```

---

## 5. 禁止事項

### ❌ やってはいけないこと

- **判定ロジック自体の変更**（`isDefaultPresetName` 関数は変えない）
- **警告バナーのUI変更**（文言・デザインは維持）
- **他のセットや配列の変更**

### ✅ やるべきこと

- **1行の変更**のみ
- ビルド確認
- 3つのテストケースで動作確認

---

**以上。すぐ完了する軽いタスクです。**
