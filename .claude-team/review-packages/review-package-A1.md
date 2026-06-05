# Review Package — Phase A1

From: Implementation Agent
To: Review Agent（実装後ゲート）
Date: 2026-06-05
Phase: A1 — 社員入口の信頼性（受信データ整合性 + 認証エラー表示挙動確認）
Handoff 正本: `.claude-team/handoff/design-handoff-A1.md`
Design Review Gate Verdict: `.claude-team/design-reviews/design-review-verdict-A1.md`（APPROVED_FOR_IMPLEMENTATION）
直近 verdict（実装後ゲート、前フェーズ）: `.claude-team/verdicts/verdict-A0.1.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A1）+ `verdict-A0.1-r2.md`

---

## 0. 実装前ゲート確認

| 項目 | 結果 |
|---|---|
| REPOSITORY ISOLATION RULE | ✅ handoff・実コード差分・本 review-package すべてに参照禁止語彙なし |
| IMPLEMENTATION SAFETY RULE | ✅ handoff 対象は全て `test -f` / Read で実在確認（`FieldworkForm.jsx`、`AuthContext.jsx`、`UserNotRegisteredError.jsx`、4 フォーム、`ProtectedRoute.jsx`） |
| 9 ブロック仕様 | ✅ 揃い |
| Design Review Gate | ✅ `APPROVED_FOR_IMPLEMENTATION` |
| 直近フェーズ PHASE COMPLETE | ✅ A0.1 APPROVED / PHASE COMPLETE / NEXT PHASE: A1 |
| handoff DO 6（current-phase.txt = A1） | ⚠ Implementation Agent 着手時点で `A0.1`。**Owner 判断により `A1` へ更新して実装続行**（§6.1 参照）。経緯は §1.5 / §6.1 で詳細記録 |

---

## 1. 現状把握（コード変更前）

`src/components/forms/FieldworkForm.jsx` の修正前構造（handoff DO 1 指定）:

### 1.1 3 state 宣言（L87-92、A0+A0.1 lint クリーンアップ後の現行行）

```jsx
const [receiptFiles, setReceiptFiles] = useState([]);
const [receiptUrls, setReceiptUrls] = useState([]);
// AI仕分け結果: [{url, name, parsed: {category, amount, store, date}}]
const [receiptData, setReceiptData] = useState([]);
const [uploadingIdx, setUploadingIdx] = useState(null);
const [analyzingIdx, setAnalyzingIdx] = useState(null);
```

3 つの配列状態が独立で、各々に添字で対応付けされていた。`uploadingIdx` / `analyzingIdx` は単一値（複数並列を表現できない）。

### 1.2 `handleReceiptUpload`（L139-184）の構造

```jsx
const handleReceiptUpload = async (e) => {
  const files = Array.from(e.target.files);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const idx = receiptUrls.length + i;  // ★ クロージャ参照
    setUploadingIdx(idx);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setReceiptUrls(prev => [...prev, file_url]);
      setReceiptFiles(prev => [...prev, file.name]);
      setUploadingIdx(null);
      setAnalyzingIdx(idx);
      try {
        const parsed = await base44.integrations.Core.InvokeLLM({ ... });
        setReceiptData(prev => [...prev, { url: file_url, name: file.name, parsed }]);
        if (parsed.amount && parsed.amount > 0) {
          const matchedKey = Object.entries(CATEGORY_MAP)...
          setForm(prev => ({ ...prev, [matchedKey]: (prev[matchedKey] || 0) + parsed.amount }));
        }
      } catch {
        setReceiptData(prev => [...prev, { url: file_url, name: file.name, parsed: null }]);
      }
      setAnalyzingIdx(null);
    } catch (err) { console.error(err); setUploadingIdx(null); setAnalyzingIdx(null); }
  }
  setUploadingIdx(null);
};
```

### 1.3 `removeReceipt`（L186-190）

```jsx
const removeReceipt = (idx) => {
  setReceiptUrls(prev => prev.filter((_, i) => i !== idx));
  setReceiptFiles(prev => prev.filter((_, i) => i !== idx));
  setReceiptData(prev => prev.filter((_, i) => i !== idx));
};
```

### 1.4 L143 `const idx = receiptUrls.length + i;` のクロージャ依存

`receiptUrls` は関数定義時点（クロージャ生成時）の値を参照。React state 更新は非同期かつ batched で行われるため、後続 iteration では既に append された分が `receiptUrls.length` に反映されていない可能性があり、また 2 回目以降の `handleReceiptUpload` 呼び出しでもクロージャの `receiptUrls` は古い値となる。

加えて 3 配列を別々に functional updater で append しているため、何らかのタイミングで一方の更新だけが先行すると 3 配列の長さがずれ、`receiptData[idx]` の参照が他配列と食い違うリスクがある（HANDOFF.md 「🐛 既知の不具合 #4」原文: 「receiptData が receiptFiles と添字ずれする可能性 / 複数ファイルを同時アップロードした際の非同期競合 / 現状は順次処理だが並列になると崩れる」）。

### 1.5 着手時の `current-phase.txt` 状態

handoff DO 6 は `current-phase.txt = A1` を要求し、`A0.1` のままなら **「作業中断・コード変更禁止・Review Agent に dispatch 漏れ報告」** を指示している。Implementation Agent 着手時点で実測値は `A0.1`。

経緯（verdict-A0.1-r2.md §2.4 で Review Agent 自身が記述した内容を引用）:
> ただし `current-phase.txt` の `M` 状態は Owner / linter により直前に `A0.1` へ revert された（前ターンで Review Agent が `A1` へ更新後の動作）。**これは Owner 主導の運用判断であり、Review Agent はこれを尊重して本 r2 verdict では `current-phase.txt` を変更しない**。

Owner（人間）判断:
- 提示選択肢: (a) DO 6 厳格遵守で中断 / (b) `current-phase.txt` を `A1` へ更新して進める / (c) 触らず進める
- Owner 選択: **(b) `current-phase.txt` を `A1` に更新して進める**
- 実施: `.claude-team/current-phase.txt` を `A0.1` → `A1` に 1 行更新

これに伴い、handoff DONE CRITERIA #3「`git diff --stat` の変更ファイルが `FieldworkForm.jsx` と `review-package-A1.md` の 2 ファイルのみ」は外形的に **未達**（`current-phase.txt` も差分に出現）。Review §6.2 で判定を仰ぐ。

---

## 2. 実装方針の選択と実装内容

### 2.1 選択した案: **A 案（3 state を単一 state にまとめる）**

handoff §[DO] 2 が提示する 3 案から **A 案** を採用。

```jsx
const [receipts, setReceipts] = useState([]);
// each receipt: { id: string, url: string|null, name: string, parsed: object|null, status: 'uploading'|'analyzing'|'done'|'failed' }
```

derived 値:
```jsx
const receiptUrls = receipts.map(r => r.url).filter(Boolean);  // 既存 handleGenerate / handleSubmit / ReportPreview への互換維持
const isUploading = receipts.some(r => r.status === 'uploading');
const isAnalyzing = receipts.some(r => r.status === 'analyzing');
```

### 2.2 選択理由

| 評価軸 | A | B | C |
|---|---|---|---|
| 既知不具合 #4 の **構造的解消** | ✅ 3 系列が物理的に存在せず添字ずれが発生し得ない | ✅ id ベース照合で添字非依存 | △ 順次化で偶発回避するのみ、UX 劣化 |
| 並列 `handleReceiptUpload` 呼び出し耐性 | ✅ 独立 entry が同居可能 | ✅ 同 | △ 同一呼出は順次だが複数呼出は同様の問題残存 |
| JSX 機械的追従の単純さ | ✅ `receiptFiles.map((name, idx) => receiptData[idx])` が `receipts.map(r => ...)` の 1 ループに集約 | △ Map にすると JSX 側で `Array.from(map.values())` 等が必要 | ✅ 既存構造維持 |
| A4 `useReceiptParser` 抽出時の interface | ✅ `{ receipts, addReceipts, removeReceipt }` で自然 | △ Map インスタンスを露出すると不自然 | ✅ |
| 想定差分量（handoff 表） | 中（既存参照箇所の全置換） | 中 | 小 |
| UX への影響 | なし（並列性は維持。実装は順次 await ループだが同期化は構造で保証） | なし | 並列性犠牲 → UX 劣化リスク |

決定軸: **「最も破壊的影響が小さい案」を優先**（handoff DO 2 推奨）+ **A4 抽出時の interface 設計の明瞭性**（Design Review §3 Q1 任意観点）。

C 案は handoff で「A・B いずれも不可能と判断した場合のみ採用可」と条件付きであり、本ケースは A・B 双方が可能のため対象外。A と B を比較し、JSX 機械追従の単純さで A を採用。

### 2.3 構造的に「添字ずれが起こり得ない」ことの論拠

| 観点 | 論拠 |
|---|---|
| 3 系列の物理的存在 | A 案では 3 配列が存在せず、`receipts: Array<{id, url, name, parsed, status}>` という単一配列。「3 系列の同期」概念自体が消滅 |
| 添字依存の消滅 | 全 setState は `prev.map(r => r.id === id ? {...r, ...} : r)` または `prev.filter(r => r.id !== id)`。インデックスを一切参照しない |
| 並列 batched setState 耐性 | functional updater + id 一致更新のため、複数 setState が任意順序で実行されても結果が一致 |
| 並列 `handleReceiptUpload` 呼出耐性 | 2 つの picker event が並行に走っても、各々が発行する id は `Date.now() + index + random` で衝突確率ほぼ 0。各々が独立に append → 順次更新する |
| クロージャ問題の消滅 | 旧 `receiptUrls.length + i` のような閉包参照は不要。id は invoke 時に発行し以後 invoke スコープ内で完結 |
| アップロード失敗時の整合 | catch で `setReceipts(prev => prev.filter(r => r.id !== id))`。元実装と同様に失敗 entry を消去（status='failed' で残す案も検討したが既存挙動を保つことを優先） |

### 2.4 並列 3 枚アップロード時の再現手順と期待挙動（Review Agent 検証用）

**再現手順**:
1. `FieldworkForm` を表示
2. ファイル選択ダイアログで 3 枚の画像を一括選択（`<input multiple capture="environment">` で複数選択可能）
3. アップロード処理を観察

**期待挙動（構造的保証）**:
- ステップ A: 3 entry が同時に `setReceipts` で append される（status='uploading'、3 つの一意 id 付き）
- ステップ B: `for` ループで順次処理。各 entry は自身の id でのみ state 更新
- ステップ C: アップロード完了時 status='analyzing' に遷移
- ステップ D: AI 解析完了時 status='done' に遷移、`parsed` が設定される
- ステップ E: amount > 0 の場合のみ `setForm` で対応する経費フィールドに加算
- ステップ F: いずれの時点でも 3 entry の `name` / `url` / `parsed` の対応が崩れない（id 一致更新のため）

**負例（旧実装で起こり得たケース）**:
- 旧実装で 1 枚目アップロード中に 2 枚目を別 picker event でアップロード開始 → 両 invoke のクロージャが `receiptUrls.length = 0` を見る → 1 枚目完了 / 2 枚目完了の append 順序により `receiptData[0]` と `receiptFiles[1]` が指す論理 entry が食い違う
- 新実装ではこの状況でも各 id が独立しており、`receipts.find(r => r.id === X)` で正しい entry を取得可能

### 2.5 触らなかった範囲（handoff DO 3 修正範囲外の遵守）

| 範囲 | 遵守状況 |
|---|---|
| AI 解析プロンプト（`InvokeLLM` の `prompt` 文字列、`response_json_schema`） | ✅ 完全一致で温存。`prompt` は ``この領収書画像を読み取り、以下のJSON形式で情報を抽出してください。\nカテゴリは「コワーキング」「貸会議室」「Wi-Fi」「駐車場」「飲食」「その他」のいずれかに分類してください。`` のまま |
| 金額 0 ガード（`if (parsed.amount && parsed.amount > 0)`） | ✅ 条件式と分岐先処理を完全温存 |
| `CATEGORY_MAP`（L131-137） | ✅ オブジェクトリテラルそのまま、touched なし |
| カテゴリ→フィールドマッピング（`Object.entries(CATEGORY_MAP).find...`） | ✅ ロジック完全温存 |
| 他フォームへの波及 | ✅ DayTrip / Overnight / Overseas は変更ゼロ（A4 で扱う） |

### 2.6 JSX の機械的追従（handoff DO 3「state 構造を変更する場合のみ表示側の参照を機械的に追従」許容範囲）

| 旧 | 新 |
|---|---|
| `(uploadingIdx !== null \|\| analyzingIdx !== null)` | `(isUploading \|\| isAnalyzing)` |
| `analyzingIdx !== null` | `isAnalyzing` |
| `receiptFiles.length > 0` | `receipts.length > 0` |
| `receiptFiles.map((name, idx) => { const rd = receiptData[idx]; ... })` | `receipts.map((r) => ...)` |
| `<div key={idx} ...>` | `<div key={r.id} ...>`（より安定なキー） |
| `{name}` | `{r.name}` |
| `onClick={() => removeReceipt(idx)}` | `onClick={() => removeReceipt(r.id)}` |
| `rd?.parsed` | `r.parsed` |
| `rd.parsed.store/category/amount/date` | `r.parsed.store/category/amount/date` |
| `rd && !rd.parsed` | `r.status === 'done' && !r.parsed`（旧条件「解析が試行された && parsed なし」を保持） |

JSX の **見た目（DOM 構造・class・ラベル）は完全に温存**。ロジック変数のみが id ベースに切り替わっている。

---

## 3. 認証エラー分岐の検証（コード変更なし）

handoff DO 4 に従い、`AuthContext.jsx` / `UserNotRegisteredError.jsx` / `ProtectedRoute.jsx` をコード変更せず**論理確認のみ**で実施。

### 3.1 手動確認の実現可能性

Base44 サンドボックスに「招待外ユーザー」を作成して `user_not_registered` 分岐を発火させるには、Base44 ダッシュボード側でのユーザー操作権限が必要。本 Implementation Agent はランタイム外操作（ブラウザ操作 + Base44 ダッシュボード操作）の実行手段を持たない。

→ **論理確認モード**（handoff DO 4 で許容）で実施。

### 3.2 コード読解による分岐の論理確認

#### 3.2.1 `AuthContext.jsx` L50-71（`auth_required` / `user_not_registered` 分岐）

`checkAppState` 関数内、`/api/apps/public` への GET が 403 を返した場合の分岐:

```jsx
if (appError.status === 403 && appError.data?.extra_data?.reason) {
  const reason = appError.data.extra_data.reason;
  if (reason === 'auth_required') {
    setAuthError({ type: 'auth_required', message: 'Authentication required' });
  } else if (reason === 'user_not_registered') {
    setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
  } else {
    setAuthError({ type: reason, message: appError.message });
  }
}
```

論理:
- 403 + `extra_data.reason === 'auth_required'` → `authError.type = 'auth_required'`
- 403 + `extra_data.reason === 'user_not_registered'` → `authError.type = 'user_not_registered'`
- 403 + その他 reason → `authError.type = reason`（pass-through）
- 403 だが `extra_data.reason` なし → 上位 else 節（L72-77）で `authError.type = 'unknown'`
- 非 403 → 上位 else 節で `authError.type = 'unknown'`

→ 仕様通り 2 つの分岐が独立に発火し、後続 UI に渡される。

#### 3.2.2 `ProtectedRoute.jsx`（`authError.type` による表示分岐）

```jsx
if (authError) {
  if (authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }
  return unauthenticatedElement;
}

if (!isAuthenticated) {
  return unauthenticatedElement;
}

return <Outlet />;
```

論理:
- `authError.type === 'user_not_registered'` → `<UserNotRegisteredError />` を表示
- それ以外の `authError`（`auth_required` 含む） → `unauthenticatedElement`（`App.jsx` で `<Navigate to="/login" />` を渡している想定）
- `authError` なし + `!isAuthenticated` → 同上 `unauthenticatedElement`
- 認証成功 → `<Outlet />` で子ルートを描画

→ `auth_required` は `unauthenticatedElement` 経由で `/login` リダイレクトされる。`user_not_registered` のみが `UserNotRegisteredError` を表示。

#### 3.2.3 `UserNotRegisteredError.jsx`（表示コンポーネント）

純粋な表示コンポーネント。props なし、副作用なし。「Access Restricted」見出しと案内 UI を描画する。コード読解で異常箇所なし。

### 3.3 検証結果

| 経路 | 期待挙動 | 論理確認結果 |
|---|---|---|
| 招待外メールでログイン → `/api/apps/public` 403 + reason='user_not_registered' | `<UserNotRegisteredError />` 表示 | ✅ `AuthContext.jsx` L61-65 で `authError.type = 'user_not_registered'` を set、`ProtectedRoute.jsx` L26-28 で `<UserNotRegisteredError />` 返却 |
| token 不在で保護ルートにアクセス | `/login` リダイレクト | ✅ `AuthContext.jsx` L42-48 で token 不在分岐: `setIsAuthenticated(false)` のみ、authError は set されない。`ProtectedRoute.jsx` L32-34 の `!isAuthenticated` 経路で `unauthenticatedElement` 返却 |
| token あり + auth expired → `checkUserAuth` で 401/403 | `authError.type = 'auth_required'` → `unauthenticatedElement` で `/login` | ✅ `AuthContext.jsx` L108-113 で 401/403 → `authError.type = 'auth_required'` を set、`ProtectedRoute.jsx` L29 で `unauthenticatedElement` 返却 |

### 3.4 制約と限界

- 手動確認は実施していないため、ブラウザ実機での UI 描画確認・遷移挙動の確認は本 Implementation Agent のスコープ外
- Base44 SDK 側の `extra_data.reason` フィールド命名がドキュメント通りであることを前提（実コードはこの命名で受け取っている）
- A1 では認証機構を**変更しない**ことが OBJECTIVE 2 / DO 4 で明示されているため、検証範囲は分岐ロジックの論理確認に留める

---

## 4. 既存 4 フォームの Regression 検証（コード変更なし）

handoff DO 5 に従い、4 フォームの単件作成→申請経路を静的確認。

### 4.1 検証方針

ブラウザ実機操作（フォーム表示・入力・送信）は本 Implementation Agent のスコープ外（dev server の起動は可能だが、Base44 sandbox auth + LLM credit 消費が必要）。本 A1 の変更が `FieldworkForm.jsx` のみに閉じており他 3 フォームへの波及がないことを **静的解析で確認**する。

### 4.2 4 フォーム共通の create / submit パス

各フォーム file の `Report.create` 呼び出し箇所を grep:

| ファイル | `report_type` 値 | `Report.create` 行 | `navigate` 行 |
|---|---|---|---|
| `src/components/forms/DayTripForm.jsx` | `'日帰り出張'` | L104 | L105 `navigate(\`/reports/${saved.id}\`)` |
| `src/components/forms/OvernightTripForm.jsx` | `'宿泊出張'` | L90 | L91 |
| `src/components/forms/OverseasTripForm.jsx` | `'海外出張'` | L75 | L76 |
| `src/components/forms/FieldworkForm.jsx`（A1 改修対象） | `'外出作業'` | L274 | L275 |

4 フォームすべて同一パターン: `handleSubmit(status)` → 必要に応じて validate → `data` 構築 → `base44.entities.Report.create(data)` → `navigate('/reports/:id')`。

### 4.3 種別ごとの動作確認

| 種別 | 静的確認結果 | 備考 |
|---|---|---|
| 日帰り出張（DayTripForm） | ✅ 本フェーズで変更なし。`git diff src/components/forms/DayTripForm.jsx` で diff 0 | A0+A0.1 で確立した状態と同一 |
| 宿泊出張（OvernightTripForm） | ✅ 本フェーズで変更なし。`git diff` で diff 0 | 同上 |
| 海外出張（OverseasTripForm） | ✅ 本フェーズで変更なし。`git diff` で diff 0 | 同上 |
| 外出作業（FieldworkForm） | ✅ A1 で receipt state 管理を改修。`handleSubmit`（L260-）の `receipt_urls: receiptUrls` 参照は **derived 値**として temporary 互換性を保持。`receiptUrls = receipts.map(r => r.url).filter(Boolean)` は status≠'done' でも url を持つ entry を含めるため、現状の `receipts.map(r => r.url).filter(Boolean)` は実質「アップロード成功して url 確定済の entry のみ」を返し、旧実装 `receiptUrls` と同等。`handleGenerate`（L235-）も同じ derived 経由 | submit 時点で進行中のアップロードがある場合は url 未設定 entry が除外され、旧実装と同等以下の挙動 |

### 4.4 FieldworkForm 内変更箇所の Regression 担保

- `handleGenerate` / `handleSubmit` / `<ReportPreview ... receiptUrls={receiptUrls} />` は変数 `receiptUrls` を参照。これは新実装で derived 値（`receipts.map(r => r.url).filter(Boolean)`）として常時計算される
- 領収書 0 件時: `receipts = []` → `receiptUrls = []`（旧実装と同一）
- 領収書 N 件アップロード完了後: `receipts = [{id, url, name, parsed, status: 'done'}, ...]` → `receiptUrls = [url1, url2, ..., urlN]`（旧実装と同一順序）
- 領収書アップロード中（一部未完了）: `receiptUrls` は完了済のみ。旧実装は失敗時 entry が消えるため同等の挙動

`removeReceipt(id)` は旧 `removeReceipt(idx)` と等価（同一 entry を削除）。JSX 側の呼出は機械的に `r.id` 渡しに更新済。

---

## 5. ビルド / lint 検証

### 5.1 `npm run lint`（handoff 検証コマンド、`--quiet` 経由）

```
$ npm run lint
> base44-app@0.0.0 lint
> eslint . --quiet

exit=0
```

→ errors=0。`--quiet` で warnings は suppress。

### 5.2 `npx eslint .`（warnings 含む実態確認）

```
$ npx eslint .

/Users/taaa_14/Desktop/システム開発/athos-trip-flow/src/pages/Login.jsx
  23:14  warning  'err' is defined but never used  unused-imports/no-unused-vars

/Users/taaa_14/Desktop/システム開発/athos-trip-flow/src/pages/ReportDetail.jsx
  65:9  warning  'isAdmin' is assigned a value but never used. Allowed unused vars must match /^_/u  unused-imports/no-unused-vars

/Users/taaa_14/Desktop/システム開発/athos-trip-flow/src/pages/ReportNew.jsx
  46:9  warning  'navigate' is assigned a value but never used. Allowed unused vars must match /^_/u  unused-imports/no-unused-vars

✖ 3 problems (0 errors, 3 warnings)

exit=0
```

→ errors=0, warnings=3。**A0.1 baseline の warnings 数（3 件）と同一**。handoff DONE CRITERIA #1「warnings は A0.1 から増加していない」を満たす。

本 A1 改修で導入した `FieldworkForm.jsx` の新コードには warning は発生していない。

### 5.3 `npm run build`

```
$ npm run build
> base44-app@0.0.0 build
> vite build

[base44] Proxy not enabled (VITE_BASE44_APP_BASE_URL not set)
exit=0

$ ls -la dist/index.html
-rw-r--r--  1 taaa_14  staff  1508  6  5 20:54 dist/index.html
```

→ build 成功、`dist/index.html` 生成（1508 bytes）。

### 5.4 `git diff --stat`

```
.claude-team/current-phase.txt         |   2 +-
src/components/forms/FieldworkForm.jsx | 119 +++++++++++++++++++--------------
```

(`review-package-A1.md` 新規追加は本ファイル staging 後に diff に出現)

handoff DONE CRITERIA #3「変更ファイルが `FieldworkForm.jsx` と `review-package-A1.md` の 2 ファイルのみ」と比較:

| 変更ファイル | 想定 | 実態 | 整合 |
|---|---|---|---|
| `src/components/forms/FieldworkForm.jsx` | ✅ 想定通り | 変更あり | ✅ |
| `.claude-team/review-packages/review-package-A1.md` | ✅ 想定通り | 新規作成 | ✅ |
| `.claude-team/current-phase.txt` | ❌ 想定外 | A0.1 → A1（Owner 判断） | ⚠ |

`current-phase.txt` の追加変更は §1.5 / §6.1 で経緯記録済。

---

## 6. Review Agent への質問・申し送り

### 1. `current-phase.txt` の追加変更の扱い（DONE CRITERIA #3 部分未達）

§1.5 の通り、handoff DO 6 の前提条件（`current-phase.txt = A1`）が着手時点で `A0.1` だった。Owner 判断で `A1` に更新して進めたため、`git diff --stat` に `current-phase.txt` が追加で出現する。

DONE CRITERIA #3 は 2 ファイル限定を要求しているため、形式的に未達。Review Agent / Owner の判定を仰ぐ。

候補案:
- (a) 「Owner 主導の運用判断」として例外許容、APPROVED
- (b) `current-phase.txt` の更新を Implementation Agent が行うことは原則 DO NOT 違反 → REJECTED、別フェーズ A1.1 で正規化
- (c) handoff のテンプレ改善: `current-phase.txt` 確認＆必要に応じ更新の DO ステップを今後の handoff に明示

### 2. `removeReceipt` 関数 handoff の行番号オフセット（軽微）

Design Review Verdict §2.4 で指摘済の通り、handoff L186-190 表記は A0+A0.1 lint クリーンアップ後の実コード L188-192 と 2 行オフセット。本フェーズの改修で L186-190 を削除し新実装で置換しているため、最終状態では handoff 行番号は無効。本フェーズの判定には影響しない。

### 3. アップロード失敗時の entry 取り扱い

旧実装は UploadFile 失敗時に 3 配列のいずれにも entry を追加しなかった（失敗が痕跡を残さなかった）。本改修ではアップロード開始時に status='uploading' で entry を append し、失敗時に当該 id を filter で除去している（旧挙動と等価）。

代替案として status='failed' で entry を残し UI で警告表示する選択肢もあるが、handoff DO 3 が「UI 表示（既存 JSX）→ 触らない（state 構造を変更する場合のみ、表示側の参照を機械的に追従させる）」と既存 UX 温存を要求しているため、本実装では旧挙動に揃えた。

### 4. lint warnings 3 件（A0.1 から不変）

§5.2 の通り、`Login.jsx` の `err` / `ReportDetail.jsx` の `isAdmin` / `ReportNew.jsx` の `navigate` の 3 件は A0.1 から残存。本 A1 では `src/components/forms/FieldworkForm.jsx` 以外の `src/**` 変更が DO NOT で禁止されているため対応不可。次フェーズ以降の Design Agent 判断（roadmap への明示またはついで修正の許容判断）に委ねる。

### 5. 認証エラー検証の論理確認のみでの合格妥当性

§3 の通り、Base44 sandbox での「招待外ユーザー作成 → ログイン試行」は本 Implementation Agent のスコープ外。handoff DO 4 が「手動確認が現実的に困難な場合は論理確認許容」を明示しており、これに従って読解ベースで論理を確認した。Review Agent が手動確認を必須とする場合は手順を指示願う。

### 6. アップロード中の `receiptUrls` derived 値の取り扱い

§4.4 の通り、新実装の `receiptUrls = receipts.map(r => r.url).filter(Boolean)` はアップロード未完了 entry（`url=null`）を除外する。これは旧実装と同等の挙動（旧実装も `setReceiptUrls(prev => [...prev, file_url])` が UploadFile 成功後にしか呼ばれない）。submit 時点で進行中のアップロードがあれば、その分は `receiptUrls` に含まれず DB に保存される `receipt_urls` も同様に欠落する。これは旧実装と同等の制約であり、A1 のスコープでは扱わない。

---

## 7. コミット方針 + 提案コミットメッセージ

handoff DONE CRITERIA #14: 「コミットは Implementation Agent の判断で行う。コミットする場合は 1 件のみ、メッセージ案を Review Package §7 に記載する」

Implementation Agent 判断: **1 件コミットを作成する**。理由:
- Design Review §3 Q5 で「Implementation Agent が commit する方が (a) Review Package §7 でコミット内容を事前に Review Agent に明示できる (b) `git status` / `git log` ベースの DONE CRITERIA 検証が完結する (c) Owner の後工程操作を減らせる」と判定されている
- A0+A0.1 の bootstrap commit `d5d65a0` + remediation commit `c097d20` に続く 3 commit 目として、A1 単独で完結する単位

### 7.1 提案コミットメッセージ

```
fix(A1): synchronize FieldworkForm receipt state via stable ids

Resolve known bug #4 (HANDOFF.md): the 3 separate state arrays
(receiptFiles / receiptUrls / receiptData) could lose alignment when
multiple files are uploaded in parallel, due to closure capture of
receiptUrls.length and async batched setState ordering.

- Replace 3 arrays with single receipts state of
  { id, url, name, parsed, status: 'uploading'|'analyzing'|'done'|'failed' }
- All state updates use id-based matching (no index-based access)
- handleReceiptUpload allocates stable ids upfront, processes sequentially,
  failures filter the entry (preserves prior UX)
- removeReceipt now takes id
- JSX mechanically updated to iterate receipts.map(r => ...) with r.id key
- AI prompt, CATEGORY_MAP, amount > 0 guard, JSX visual structure preserved
- Out of scope for A1 (deferred to A4): hook extraction for other forms,
  amount=0 robustness, generated settlement heading stability

Also includes:
- current-phase.txt: A0.1 -> A1 (Owner-instructed prerequisite for DO 6)
- review-package-A1.md: A1 evidence and reasoning

Phase: A1 (Implementation Verdict Gate pending)
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### 7.2 staging 対象

- `src/components/forms/FieldworkForm.jsx`（modified）
- `.claude-team/current-phase.txt`（modified）
- `.claude-team/review-packages/review-package-A1.md`（新規）

未トラックで scope 外（commit には含めない）:
- `.claude-team/orchestrator/`（マシン固有 runtime 状態、A0.1 と同じ判断）

### 7.3 push 方針

`git push` は **未実行**。handoff §[DO NOT]「`git push`」遵守。検証は `git log @{u}..` で 3 件（bootstrap + remediation + 本 commit）が表示されること、または `git rev-list --count origin/main..HEAD` = 3 で確認。
