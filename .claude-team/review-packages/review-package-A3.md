# Review Package — Phase A3

From: Implementation Agent
To: Review Agent（実装後ゲート）
Date: 2026-06-06
Phase: A3 — レポート編集経路の追加（HANDOFF.md P0 #1 解消）
Handoff 正本: `.claude-team/handoff/design-handoff-A3.md`
Design Review Gate Verdict: `.claude-team/design-reviews/design-review-verdict-A3.md`（APPROVED_FOR_IMPLEMENTATION）
直近 verdict（前フェーズ）: `.claude-team/verdicts/verdict-A2.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A3）

---

## 0. 実装前ゲート確認

| 項目 | 結果 |
|---|---|
| REPOSITORY ISOLATION RULE | ✅ handoff・実コード差分・本 review-package すべて Athos TravelMate のみ参照、禁止語彙混入なし |
| IMPLEMENTATION SAFETY RULE | ✅ 言及対象すべて実在: `App.jsx`, `ReportDetail.jsx`, 4 forms, entity `Report`, `Report.filter/create/update/delete`, hooks `useAuth/useParams/useNavigate`、`ReportEdit.jsx` および route `/reports/:id/edit` は不在を確認後に新規追加 |
| 9 ブロック仕様 | ✅ 揃い（DESIGN INCOMPLETE 不該当） |
| Design Review Gate | ✅ `APPROVED_FOR_IMPLEMENTATION` |
| 直近フェーズ PHASE COMPLETE | ✅ A2 APPROVED / PHASE COMPLETE / NEXT PHASE: A3、HEAD `cba5861` push 済 |
| handoff DO 6（current-phase.txt = A3） | ✅ 着手時点で既に `A3`、本 Agent は変更せず |

---

## 1. 現状把握（A3 開始時の実コード grep 結果）

handoff §[DO] 1 の指示「行番号は handoff 起草時点のものではなく **A3 開始時の grep 結果を Review Package §1 に転記**」に従う。

### 1.1 ルート定義（`src/App.jsx`）

A3 開始時:
```
L44-56  <Routes>
L45     <Route path="/login" element={<Login />} />
L46     <Route element={<Layout />}>
L47       <Route path="/" element={<Dashboard />} />
L48       <Route path="/reports" element={<ReportList />} />
L49       <Route path="/reports/new" element={<ReportNew />} />
L50       <Route path="/reports/:id" element={<ReportDetail />} />
L51       <Route path="/approval" element={<Approval />} />
L52       <Route path="/summary" element={<Summary />} />
L53       <Route path="/policy" element={<PolicyManagement />} />
L54     </Route>
L55     <Route path="*" element={<PageNotFound />} />
L56   </Routes>
```
→ `/reports/:id/edit` 不在を確認。

### 1.2 `canEdit` 定義（`src/pages/ReportDetail.jsx`）

A3 開始時:
```jsx
L64    const isOwner = report?.created_by_id === user?.id;
L65    const isAdmin = user?.role === 'admin';      // 既存の lint warning (A2 baseline)
L66    const canEdit = isOwner && (report?.status === '下書き' || report?.status === '差戻し');
```

### 1.3 既存編集ボタンの不在

ReportDetail.jsx `canEdit` 真ブロック L104-117 に「申請する/再申請する」「削除」のみ存在、「編集する」不在を確認。

### 1.4 Form mount パターン（`src/pages/ReportNew.jsx`）

```jsx
return <XxxForm onBack={...} />
```
→ create 時は `onBack` のみ渡す既存パターン。`mode` / `initialReport` props は新規追加。

### 1.5 4 form の handleGenerate 重複検証

A3 開始時の行番号（A1/A2 改修後）:

| Form | handleGenerate 行 | 重複検証 grep 結果 |
|---|---|---|
| `DayTripForm.jsx` | L66 | L68-79 `if (form.travel_date) { ... Report.filter ... .filter(r => r.status !== '差戻し') ... }` |
| `OvernightTripForm.jsx` | L66 | L68-79 同パターン（`report_type: '宿泊出張'`, `start_date`） |
| `OverseasTripForm.jsx` | L53 | L55-66 同パターン（`report_type: '海外出張'`, `start_date`） |
| `FieldworkForm.jsx` | L225 (元 L213) | L227-238 同パターン（`report_type: '外出作業'`, `travel_date`） |

### 1.6 4 form の handleSubmit

| Form | handleSubmit 行 | Report.create 呼出行 |
|---|---|---|
| `DayTripForm.jsx` | L98 | L116 |
| `OvernightTripForm.jsx` | L78 | L90 |
| `OverseasTripForm.jsx` | L65 | L87 |
| `FieldworkForm.jsx` | L260 | L274 |

すべて `Report.create(data)` 呼出 + `RPT-${Date.now()}` で report_number 生成。

### 1.7 FieldworkForm の receipts state（A1 改修後）

```jsx
L91-105   const [receipts, setReceipts] = useState([]);  // 単一 SOT
L96       const receiptUrls = receipts.map(r => r.url).filter(Boolean);
```
→ A3 では edit モード時に `initialReport.receipt_urls` から復元する初期化に拡張。

---

## 2. 設計判断

### 2.1 `mode` / `initialReport` props の対称性

4 form すべてで **完全に同一の prop 追加方式**:

```jsx
export default function XxxForm({ onBack, mode = 'create', initialReport = null }) { ... }
```

- デフォルト値で create モード時の既存挙動を完全保証
- `mode` は文字列リテラル（`'create'` / `'edit'`）で boolean より意図が明示的
- `initialReport = null` で undefined 参照を防止

### 2.2 useState 初期化の分岐方式

`useState(() => { ... })` の遅延初期化を採用。3 案を比較した上で:

| 案 | 評価 |
|---|---|
| **A 案（採用）**: useState 内で `mode === 'edit' && initialReport` を判定して分岐 | ✅ 初期化が 1 度だけ実行される、再レンダリングで再初期化が走らない、useEffect が不要 |
| B 案: 既存初期値で create し、useEffect で edit モード時に setForm を呼ぶ | ❌ 初回レンダリングで空 form が一瞬表示される、副作用が増える |
| C 案: 親（ReportEdit）で initialReport から data を組み立てて props で渡す | ❌ 4 form ごとに data shape を組み立てる重複ロジックが ReportEdit に集中、handoff §[SCOPE] 「フォーム改修: useState 初期化」と整合しない |

### 2.3 `canEdit` の DRY 不採用（敢えて複製）

handoff §[DO] 3「`canEdit` のロジックは `ReportDetail.jsx` のそれと **完全に同一の真理値式** にする（DRY ではなく敢えて複製。共通化は将来）」遵守。

`ReportEdit.jsx` 内に:
```jsx
const isOwner = report.created_by_id === user?.id;
const canEdit = isOwner && (report.status === '下書き' || report.status === '差戻し');
```
を ReportDetail.jsx L64-66 と同一形式で記述。共通フック抽出は A4 以降の Design Agent 判断対象とする。

### 2.4 `report_number` / `created_by_*` の維持

handoff DO NOT「編集時の `report_number` 再生成」「編集時の `created_by_*` 上書き」遵守。`handleSubmit` で edit モード時に `initialReport.report_number` / `initialReport.created_by_name` / `initialReport.created_by_email` を保持。

### 2.5 AI 生成テキストの引継

handoff §[DO] 4.5 の指針:
```js
generated_report_text: generatedReport?.reportText || initialReport?.generated_report_text || '',
generated_settlement_text: generatedReport?.settlementText || initialReport?.generated_settlement_text || '',
```

- 編集中に「レポートを生成する」を押せば再生成（既存 generatedReport を優先）
- 押さなければ initialReport の値を維持
- 両方なければ空文字（既存 create モードと同等）

### 2.6 FieldworkForm の `receipts` 復元

handoff §[DO] 4.2 雛形に従い、status='done' / parsed=null で復元:
```jsx
return initialReport.receipt_urls.map((url, i) => ({
  id: `existing-${i}`,
  url,
  name: `領収書${i + 1}`,
  parsed: null,
  status: 'done',
}));
```

- `parsed` を復元しない理由（handoff 明示）: AI 解析結果は元 Report の金額フィールドに既に反映済、再復元すると二重カウントになる
- `id: 'existing-N'` は新規アップロード時の `${baseId}-N-${random}` と衝突しない（前者は `existing-` prefix）
- `name: '領収書N'` はファイル名情報が DB に保存されていないための代替表示

### 2.7 FieldworkForm の `localStorage` 読み込み回避

handoff §[DO] 4.1「edit モード時には行わない」に従い、`savedDefaults` 関数を `mode === 'edit'` 時に `{}` を返すよう改修:

```jsx
const savedDefaults = (() => {
  if (mode === 'edit') return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
})();
```

注: localStorage **書き込み**（useEffect で form 変更を保存）は handoff で言及されておらず、変更していない。edit モード中の form 値が localStorage に書かれることで、次回 create 時のデフォルトが edit 時の値で上書きされる軽微な UX drift があるが、handoff DO スコープ外。§6 で Review に申し送り。

### 2.8 重複検証の自己除外

handoff §[DO] 4.3 の「可読性のため」二段 filter パターンを採用:
```js
const conflicting = existing
  .filter(r => r.id !== initialReport?.id)  // edit 時は自身を除外
  .filter(r => r.status !== '差戻し');
```

- create モード時: `initialReport?.id` は undefined、`r.id !== undefined` は常に true → 既存挙動と完全同等
- edit モード時: 自身（initialReport.id）を conflicting から除外

### 2.9 `Report.create` / `Report.update` 分岐

`handleSubmit` 内で:
```js
let saved;
if (mode === 'edit') {
  await base44.entities.Report.update(initialReport.id, data);
  saved = { id: initialReport.id };
} else {
  saved = await base44.entities.Report.create(data);
}
navigate(`/reports/${saved.id}`);
```

- `Report.update` の戻り値仕様が SDK によって異なる可能性に備え、`saved = { id: initialReport.id }` で明示的に navigate 先 id を保証
- navigate 先は `/reports/:id`（編集前と同じ詳細画面、status だけ更新される）

---

## 3. 4 form 改修要点

### 3.1 改修サマリ表

| Form | useState 分岐 | handleGenerate 自己除外 | handleSubmit create/update 分岐 | その他 |
|---|---|---|---|---|
| `DayTripForm.jsx` | ✅ 12 フィールド初期化 | ✅ `r.id !== initialReport?.id` | ✅ update 分岐 + report_number / created_by_* 維持 + AI text fallback | - |
| `OvernightTripForm.jsx` | ✅ 15 フィールド初期化 | ✅ 同 | ✅ 同 | - |
| `OverseasTripForm.jsx` | ✅ 10 フィールド初期化 | ✅ 同 | ✅ 同 | - |
| `FieldworkForm.jsx` | ✅ 14 フィールド初期化 + receipts 復元 | ✅ 同 | ✅ 同 | savedDefaults を edit 時に `{}` 化 |

### 3.2 各 form の初期化フィールド一覧（実コード由来）

#### DayTripForm（12 フィールド）
`travel_date, destination_name, destination_address, one_way_distance_km, business_content, transport_methods, driving_distance_km, highway_fee, parking_fee, taxi_fee, other_transport_fee, remarks`

#### OvernightTripForm（15 フィールド）
`start_date, end_date, destination_name, destination_address, one_way_distance_km, num_nights, business_content, transport_methods, driving_distance_km, highway_fee, parking_fee, taxi_fee, other_transport_fee, shinkansen_reason, remarks`

#### OverseasTripForm（10 フィールド）
`start_date, end_date, country_name, city_name, num_nights, business_content, flight_fee, airport_transport_fee, other_transport_fee, remarks`

#### FieldworkForm（14 フィールド + receipts）
`travel_date, destination_name, destination_address, work_start_time, work_end_time, business_content, transport_methods, driving_distance_km, coworking_fee, wifi_fee, parking_fee, meal_fee, other_work_fee, remarks` + `receipts`（`{id, url, name, parsed, status}[]`）

### 3.3 ReportEdit.jsx 新規ファイル構造

```jsx
1   import { useState, useEffect } from 'react';
2   import { useParams, useNavigate } from 'react-router-dom';
3   import { base44 } from '@/api/base44Client';
4   import { useAuth } from '@/lib/AuthContext';
5-8 import 4 forms
10  export default function ReportEdit() {
11    const { id } = useParams();
12    const navigate = useNavigate();
13    const { user } = useAuth();
14    const [report, setReport] = useState(null);
15    const [loading, setLoading] = useState(true);

17    useEffect(() => {
18      base44.entities.Report.filter({ id }).then(results => {
19        setReport(results?.[0] || null);
20        setLoading(false);
21      });
22    }, [id]);

24    if (loading) return <div className="p-8 text-center text-muted-foreground">読み込み中...</div>;
25    if (!report) return <div className="p-8 text-center text-muted-foreground">レポートが見つかりません</div>;

27-37 canEdit 判定（ReportDetail と同一真理値式）→ 不可時メッセージ
39    const onBack = () => navigate(`/reports/${id}`);

41-44 種別判定で 4 form のいずれかを mode="edit" initialReport={report} で mount
46-50 未知 report_type のフォールバック
51  }
```

### 3.4 App.jsx の変更（2 行のみ）

```diff
+ import ReportEdit from '@/pages/ReportEdit';

         <Route path="/reports/:id" element={<ReportDetail />} />
+        <Route path="/reports/:id/edit" element={<ReportEdit />} />
         <Route path="/approval" element={<Approval />} />
```

挿入位置は handoff §[DO] 2 指定「`<Route path="/reports/:id" ...>` の **直後**」遵守。

### 3.5 ReportDetail.jsx の変更（編集ボタン追加）

import 追加:
```diff
- import { ArrowLeft, Send, Trash2, Loader2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
+ import { ArrowLeft, Send, Trash2, Loader2, Clock, CheckCircle, XCircle, AlertCircle, Pencil } from 'lucide-react';
```

ボタン追加:
```jsx
{canEdit && (
  <>
+   <Button
+     variant="outline"
+     onClick={() => navigate(`/reports/${id}/edit`)}
+     className="gap-2"
+   >
+     <Pencil className="w-4 h-4" />
+     編集する
+   </Button>
    {(report.status === '下書き' || report.status === '差戻し') && (
      <Button onClick={handleSubmit} ...> ... </Button>
    )}
    <Button variant="outline" onClick={handleDelete} ...> ... </Button>
  </>
)}
```

挿入位置は handoff §[DO] 5 指定「「申請する」ボタンの **直前**」遵守。`variant="outline"` + `Pencil` アイコンで既存 UI と視覚的に調和。

---

## 4. Regression 検証（4 種別 × 4 観点 = 16 ケース）

### 4.1 検証方針

ブラウザ実機での「下書き作成 → 編集 → 申請」「差戻し → 編集 → 再申請」「他人の Report への直接アクセス」「重複検出の自己除外」のフルサイクル確認は本 Implementation Agent のスコープ外（Base44 sandbox + 認証 + テストデータ投入が必要）。

handoff §[DO] 8「手動 UI 確認が困難な場合は、コードのロジック存在を grep で示し、論理確認として §4 に明記する」に従い、**静的・grep 確認** で 16 ケースを記録。

### 4.2 16 ケース表（4 種別 × 4 観点）

#### 観点 A: create モードの不変性（既存 ReportNew 経由）

| Form | 確認方法 | 結果 |
|---|---|---|
| DayTrip | `mode = 'create'` デフォルト時、`useState` 分岐は else 節（既存初期値）、`handleGenerate` の `r.id !== initialReport?.id` は `r.id !== undefined` で常に true、`handleSubmit` は `Report.create(data)` 呼出 | ✅ create モード時の振る舞いは A2 完了時点と論理的に同一 |
| Overnight | 同上、15 フィールド初期化分岐の else 節 | ✅ |
| Overseas | 同上、10 フィールド初期化分岐の else 節 | ✅ |
| Fieldwork | 同上、14 フィールド + receipts=[]、savedDefaults は mode='create' で localStorage 読み | ✅ A1 / A2 完了時点と論理的に同一 |

#### 観点 B: edit モードのサイクル（下書き → 編集 → 申請、差戻し → 編集 → 再申請）

| Form | 確認方法 | 結果 |
|---|---|---|
| DayTrip | `mode='edit'` で 12 フィールドが initialReport から prefill、`handleSubmit('下書き')` → `Report.update(id, data)` → navigate `/reports/${id}`、`handleSubmit('申請中')` も同経路 | ✅ |
| Overnight | 15 フィールド prefill、同経路 | ✅ |
| Overseas | 10 フィールド prefill、同経路 | ✅ |
| Fieldwork | 14 フィールド + receipts 復元（`{id:'existing-N', url, name:'領収書N+1', parsed:null, status:'done'}`）、同経路 | ✅ |

#### 観点 C: 編集権限の境界（ReportEdit.jsx の canEdit 判定）

| ケース | 動作 | 結果 |
|---|---|---|
| 他人の Report の `/edit` 直接アクセス | `isOwner = false` → `canEdit = false` → 「このレポートは編集できません」表示 | ✅ |
| 申請中の `/edit` 直接アクセス | `canEdit = false`（status !== 下書き/差戻し）→ 同表示 | ✅ |
| 承認済の `/edit` 直接アクセス | 同上 | ✅ |
| 存在しない id | `Report.filter({id})` 空配列 → `report = null` → 「レポートが見つかりません」表示 | ✅ |

→ 4 種別すべて同一の判定（ReportEdit.jsx 内で報告書種別判定の前に canEdit 判定）。

#### 観点 D: 重複検証の edit 自己除外

| Form | 確認方法 | 結果 |
|---|---|---|
| DayTrip | edit モード、travel_date 不変で「申請」→ `existing` に自身のみ → `r.id !== initialReport?.id` で除外 → conflicting=[] → 通過 | ✅ |
| Overnight | edit モード、start_date 不変で「申請」→ 同経路 | ✅ |
| Overseas | edit モード、start_date 不変で「申請」→ 同経路 | ✅ |
| Fieldwork | edit モード、travel_date 不変で「申請」→ 同経路 | ✅ |
| 4 種別共通: edit 中に日付を変更して既存他レポートと衝突 | `existing` に他レポートが含まれ、自身（initialReport.id）は除外、他は `r.status !== '差戻し'` で残る → conflicting.length > 0 → 拒否メッセージ表示 | ✅ |

### 4.3 既存機能への regression なし確認

| 既存機能 | 確認方法 | 結果 |
|---|---|---|
| ReportDetail 「申請する/再申請する」ボタン | 既存 onClick / handleSubmit に変更なし、編集ボタンを直前に追加したのみ | ✅ |
| ReportDetail 「削除」ボタン | 変更なし | ✅ |
| ReportDetail 差戻し理由表示 / Meta info / 支給額内訳 / レポート内容 / 領収書表示 | 変更なし | ✅ |
| A2 で導入の 4 フォーム 1 日 1 件チェック（create モード） | `r.id !== initialReport?.id` 分岐は `initialReport=null` で常に true → A2 挙動と論理的に同一 | ✅ |
| A1 で導入の FieldworkForm receipts 単一 SOT | useState 分岐の else 節は `[]`（A1 完了時点と同一）、edit モードのみ受信 entry 復元 | ✅ |
| ReportNew 経路（種別選択 → form mount） | 変更なし、4 form のシグネチャ拡張は backward compatible | ✅ |
| 他ルート（`/`, `/reports`, `/approval`, `/summary`, `/policy`, `/login`） | App.jsx の他 Route 定義変更なし | ✅ |

---

## 5. ビルド / lint 検証

### 5.1 `npm run lint`（handoff 検証コマンド、`--quiet` 経由）

```
$ npm run lint
> base44-app@0.0.0 lint
> eslint . --quiet

exit=0
```

→ errors=0。

### 5.2 `npx eslint .`（warnings 含む実態）

```
/Users/taaa_14/Desktop/システム開発/athos-trip-flow/src/pages/Login.jsx
  23:14  warning  'err' is defined but never used  unused-imports/no-unused-vars

/Users/taaa_14/Desktop/システム開発/athos-trip-flow/src/pages/ReportDetail.jsx
  65:9  warning  'isAdmin' is assigned a value but never used. Allowed unused vars must match /^_/u  unused-imports/no-unused-vars

/Users/taaa_14/Desktop/システム開発/athos-trip-flow/src/pages/ReportNew.jsx
  46:9  warning  'navigate' is assigned a value but never used. Allowed unused vars must match /^_/u  unused-imports/no-unused-vars

✖ 3 problems (0 errors, 3 warnings)

exit=0
```

→ errors=0, warnings=**3**（A2 完了時点と完全一致、handoff DONE CRITERIA #1 を満たす）。

A3 改修で新たに導入したコード（ReportEdit.jsx、4 form の mode/initialReport 分岐、ReportDetail の編集ボタン）には warning は発生していない。

### 5.3 `npm run build`

```
$ npm run build
> base44-app@0.0.0 build
> vite build

[base44] Proxy not enabled (VITE_BASE44_APP_BASE_URL not set)
exit=0

$ ls -la dist/index.html
-rw-r--r--  1 taaa_14  staff  1508  6  6 12:30 dist/index.html
```

→ build 成功、`dist/index.html` 生成（1508 bytes）。

### 5.4 `git diff --stat`

```
src/App.jsx                                |  2 +
src/components/forms/DayTripForm.jsx       | 69 +++++++++++++++--------
src/components/forms/FieldworkForm.jsx     | 89 ++++++++++++++++++++++--------
src/components/forms/OvernightTripForm.jsx | 64 +++++++++++++++------
src/components/forms/OverseasTripForm.jsx  | 51 ++++++++++++-----
src/pages/ReportDetail.jsx                 | 10 +++-
6 files changed, 209 insertions(+), 76 deletions(-)
```

加えて新規ファイル:
```
src/pages/ReportEdit.jsx           (untracked, A3 で新規作成、51 行)
.claude-team/review-packages/review-package-A3.md  (本ファイル、新規)
```

handoff DONE CRITERIA #3 との対応:
| 変更ファイル | 想定 | 実態 |
|---|---|---|
| `src/App.jsx` | ✅ | 変更あり（2 行） |
| `src/pages/ReportDetail.jsx` | ✅ | 変更あり（編集ボタン追加） |
| `src/components/forms/DayTripForm.jsx` | ✅ | 変更あり |
| `src/components/forms/OvernightTripForm.jsx` | ✅ | 変更あり |
| `src/components/forms/OverseasTripForm.jsx` | ✅ | 変更あり |
| `src/components/forms/FieldworkForm.jsx` | ✅ | 変更あり |
| `src/pages/ReportEdit.jsx`（新規） | ✅ | 新規作成 |
| `.claude-team/review-packages/review-package-A3.md`（新規） | ✅ | 新規作成 |
| `.claude-team/current-phase.txt`（任意） | ✅ | 着手時点で既に `A3`、本 Agent は変更していない |

→ handoff DONE CRITERIA #3 の許容範囲内に完全に収まる。

---

## 6. Review Agent への質問・申し送り

### 1. FieldworkForm の localStorage 書き込みの edit モード時挙動

handoff §[DO] 4.1 は「localStorage **読み込み**」のみ edit モード時に行わないと指示。`useEffect` による書き込み（form 変更時に savedDefaults を localStorage に保存）は handoff で言及されておらず、本実装では既存挙動を温存している。

結果として: edit モード中に form 値を変更すると、次回 create モード（ReportNew 経由の新規作成）時の savedDefaults が edit 時の値で上書きされる軽微な UX drift がある。

選択肢:
- (a) 現状維持（軽微なため許容）
- (b) `useEffect` も edit モード時はスキップ（追加コミット）
- (c) 次フェーズ Design Agent 判断

### 2. A2 baseline lint warnings 3 件は不変

`Login.jsx err` / `ReportDetail.jsx isAdmin` / `ReportNew.jsx navigate` の 3 件は A0.1 から不変。本 A3 では DO NOT 「`src/**` の対象 7 ファイル以外への変更」遵守のため対応せず。

特に `ReportDetail.jsx` L65 `isAdmin` は本 A3 で同ファイルを編集したが、`isAdmin` 行自体に touch していないため warning も解消されていない。次フェーズ以降の Design Agent 判断に委ねる。

### 3. Regression は静的・grep 確認のみ

§4.1 の通り、ブラウザ実機での 16 ケース検証は本スコープ外。コードロジック存在の論理確認で十分と判断したが、手動確認が必須の場合は指示願う。

### 4. AI 生成テキストの引継仕様

handoff §[DO] 4.5 の `generatedReport?.reportText || initialReport?.generated_report_text || ''` パターンを採用。

edit モードで「レポートを生成する」を押さずに「申請する」を押した場合、initialReport の値が保持される。「レポートを生成する」を押した場合は新しい値で上書きされる。

注意点: 編集中にフォーム値（例: 距離・経費）を変更したまま「申請する」を押し（再生成なし）、initialReport の AI テキスト（旧値ベース）が保存されるケースが起こる。これは UX 観点では「ユーザーが明示的に再生成しない限り旧テキスト保持」という挙動で、handoff §[DO] 4.5 指針通り。

### 5. `report_number` 維持の妥当性

handoff DO NOT「編集時の `report_number` 再生成」遵守。edit モードで「下書き」→「申請中」遷移時も report_number は同一を維持。

→ Approval 画面で承認者が同一 report_number のレポートを見ることになる（編集前後で番号変わらず識別可）。

### 6. `Report.update` の戻り値 dependency

`base44.entities.Report.update(id, data)` の戻り値が SDK によって `{id, ...}` を返すか void かは未確認のため、edit モード時は `saved = { id: initialReport.id }` で明示的に navigate 先を保証している。Review Agent が Base44 SDK の実 update 戻り値仕様を把握している場合、より簡潔な実装に置換可能。

### 7. ReportEdit の loading UI

ReportEdit は loading 中に「読み込み中...」のテキストのみを表示。ReportDetail と同一パターン（L81）。スピナー等の追加は handoff スコープ外。

---

## 7. コミット方針（handoff §[DO NOT]「`git commit` の実行」遵守）

handoff §[DO] 9「実コミットは Review verdict 後の Owner 操作で実行する」および §[DO NOT]「`git commit` の実行（Review verdict 後の Owner 操作）」に従い、**本 Implementation Agent は commit を実行しない**。

### 7.1 ステージング対象ファイル一覧（Owner 操作時の参考）

```bash
git add src/App.jsx \
        src/pages/ReportEdit.jsx \
        src/pages/ReportDetail.jsx \
        src/components/forms/DayTripForm.jsx \
        src/components/forms/OvernightTripForm.jsx \
        src/components/forms/OverseasTripForm.jsx \
        src/components/forms/FieldworkForm.jsx \
        .claude-team/review-packages/review-package-A3.md
```

合計 8 ファイル:
- 1 modified（App.jsx）
- 1 new（ReportEdit.jsx）
- 1 modified（ReportDetail.jsx）
- 4 modified（4 forms）
- 1 new（review-package-A3.md）

`.claude-team/current-phase.txt` は本 Agent では touch していないため staging 不要。

### 7.2 コミットメッセージ案

```
feat(A3): add report edit route /reports/:id/edit

Resolve HANDOFF.md P0 #1 ("レポート編集機能"): users had to "delete
and recreate" a report to fix errors. Now drafts and rejected reports
can be edited via a dedicated /reports/:id/edit route that mounts the
appropriate form in edit mode.

- New page src/pages/ReportEdit.jsx: fetches Report by :id, validates
  canEdit (same truthy expression as ReportDetail; DRY deferred), then
  mounts the 4-form by report_type with mode="edit" + initialReport
- New route in App.jsx: <Route path="/reports/:id/edit" element=...>
- ReportDetail.jsx: add 「編集する」 outline button (Pencil icon) in
  the canEdit block, navigates to /reports/:id/edit
- 4 forms (DayTrip / Overnight / Overseas / Fieldwork) get
  { mode = 'create', initialReport = null } props:
  * useState initializer branches on mode/initialReport; create mode
    keeps the exact existing initial values (backward compat)
  * handleGenerate duplicate-check excludes self by id when editing
  * handleSubmit:
    - mode === 'edit' calls Report.update(initialReport.id, data)
    - report_number / created_by_name / created_by_email kept from
      initialReport
    - generated_report_text / generated_settlement_text fall back to
      initialReport when not regenerated
- FieldworkForm additionally:
  * receipts state restored from initialReport.receipt_urls as
    { id: 'existing-N', url, name: '領収書N', parsed: null, status: 'done' }
  * localStorage savedDefaults are skipped in edit mode
    (write-side useEffect left as-is; see review-package §6 Q1)

Out of scope for A3 (per handoff DO NOT):
- Editing while 申請中 / 承認済 (canEdit guards both directions)
- Edit history / diff visualization / optimistic locking
- Mail notifications (A5)
- Common-hook extraction for forms / receipts (A4)

Phase: A3 (Implementation Verdict Gate pending)
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### 7.3 注意事項

| 項目 | 遵守 |
|---|---|
| `git push` 禁止 | ✅ Owner 操作時も push しない（handoff §[DO NOT]「`git push`」） |
| `--no-verify` 禁止 | ✅ pre-commit hook はそのまま走らせる |
| `--no-gpg-sign` 禁止 | ✅ 既存設定通り |
| `--amend` 禁止 | ✅ 既存 4 コミットへの amend しない |
| `lint:fix` 禁止 | ✅ 実行していない |
| 1 commit のみ | ✅ A3 単独 1 件 |

### 7.4 commit 後の検証コマンド（Owner 操作時の参考）

```bash
git log --oneline | head -5            # HEAD が A3 commit
git status --short                      # tracked-modified = 0
git rev-list --count origin/main..HEAD  # 1 を期待（A3 がローカル先行）
git diff --stat HEAD~1 HEAD             # A3 の 8 ファイル変更
npm run lint                            # exit 0
npm run build                           # exit 0
grep -c "placeholder-marker" .claude-team/review-packages/review-package-A3.md  # 0 (handoff DONE CRITERIA 規定のプレースホルダトークン残存数チェック、本ファイルは充填済)
```
