# Review Package — Phase A8 ⭐ ロードマップ最終フェーズ

From: Implementation Agent
To: Review Agent（実装後ゲート、PROJECT COMPLETE 判定）
Date: 2026-06-08
Phase: A8 — 旅費規程監査: 規程変更履歴 + 影響範囲追跡
Handoff 正本: `.claude-team/handoff/design-handoff-A8.md`
Design Review Gate Verdict: `.claude-team/design-reviews/design-review-verdict-A8.md`（APPROVED_FOR_IMPLEMENTATION、§4 Q1 で `activePolicy` 命名指摘あり）
直近 verdict（前フェーズ）: `.claude-team/verdicts/verdict-A7.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A8）

---

## 0. 実装前ゲート確認

| 項目 | 結果 |
|---|---|
| REPOSITORY ISOLATION RULE | ✅ handoff・実コード差分・本 review-package すべて Athos TravelMate のみ、禁止語彙混入なし |
| IMPLEMENTATION SAFETY RULE | ✅ 既存 `src/pages/PolicyManagement.jsx` 実在、新規 3 ファイル不在を事前確認後に作成 |
| 9 ブロック仕様 | ✅ 揃い |
| Design Review Gate | ✅ `APPROVED_FOR_IMPLEMENTATION`（§4 Q1 `activePolicy` 指摘は実コード L155 既存変数で対応、§2.1 で明示） |
| 直近フェーズ PHASE COMPLETE | ✅ A7 APPROVED / PHASE COMPLETE / NEXT PHASE: A8 |
| handoff DO 5（current-phase.txt = A8） | ✅ 着手時点で既に `A8`、本 Agent は変更せず |

---

## 1. 現状把握（A8 開始時の grep / Read 結果）

### 1.1 PolicyManagement.jsx 既存構造（A7 完了状態）

| 観点 | 行 | 内容 |
|---|---|---|
| imports | L1-10 | React, base44, usePolicy, Button, Input, Label, Card 系, Textarea, Badge, lucide-react (Upload/Loader2/CheckCircle/FileText) |
| `usePolicy()` 戻り値 | L13 | `const { policy, setPolicy } = usePolicy();` |
| `policies` state | L14 | TravelPolicyMaster 一覧 |
| `handlePdfUpload` | L38-108 | PDF AI 解析 + diff 表示用 mapped policy |
| `handleActivate` | L110-120 | is_active 切替 |
| `handleSaveNew` | L122-141 | 新規 TravelPolicyMaster 作成 |
| `FIELD_LABELS` | L143-153 | 9 規程値フィールドの日本語ラベル |
| **`activePolicy` 既存変数** | **L155** | **`const activePolicy = policies.find(p => p.is_active);`** ✅ |
| 規程履歴一覧 JSX | L284-325 | 各 policy 行に「PDF」リンク + 「適用する」ボタン |

### 1.2 `activePolicy` の Design Review §4 Q1 指摘への対応

**Design Review の懸念**:
> handoff §3.3 / §3.4 / §3.5 で `activePolicy` を使用しているが、`PolicyManagement.jsx` L13 の実コードは `const { policy, setPolicy } = usePolicy();` で **変数名は `policy`**。雛形通り実装すると **`ReferenceError: activePolicy is not defined`** が発生（実行時 / lint で検出可能）。

**実コード再調査結果**:
PolicyManagement.jsx L155 に `const activePolicy = policies.find(p => p.is_active);` が **既存で定義済**。Design Review は L13 の `policy`（usePolicy 戻り値）のみを確認し、L155 の存在を見落とした可能性。

**本実装での対応**:
- handoff 雛形 `activePolicy` を **そのまま使用**（L155 既存変数を参照）
- 追加 alias / rename / destructure 変更は **不要**
- 雛形からの逸脱なし

→ §[REVIEW POINTS] 5「変数シャドー回避」遵守。`activePolicy` は handoff 雛形通り、`policy` とは別の変数として既存定義されている。

### 1.3 Report スキーマフィールド存在確認（HANDOFF.md L177-231）

A8 で `recomputeReportPolicyValues` が参照する全フィールドが Report スキーマに実在:
- `report_type`, `num_days`, `num_nights`, `driving_distance_km`
- 実費 10 種: `highway_fee`, `parking_fee`, `taxi_fee`, `other_transport_fee`, `flight_fee`, `airport_transport_fee`, `coworking_fee`, `wifi_fee`, `meal_fee`, `other_work_fee`

### 1.4 TravelPolicyMaster スキーマフィールド存在確認（HANDOFF.md L234-252）

A8 で `recomputeReportPolicyValues` が参照する全規程値フィールドが実在:
- `daily_allowance_daytrip`, `daily_allowance_overnight`, `daily_allowance_overseas`
- `accommodation_domestic`, `accommodation_overseas`
- `car_allowance_per_km`

---

## 2. 設計判断

### 2.1 ✅ Design Review §4 Q1 `activePolicy` 命名対応

§1.2 で詳述した通り、PolicyManagement.jsx L155 に `activePolicy` が **既存定義済**。

handoff 雛形 §3.3 / §3.4 / §3.5 の `activePolicy` 参照は L155 の変数を使うため:
- Design Review 推奨 (a) alias 化 → **不要**（既存変数で動作）
- Design Review 推奨 (b) 全置換 → **不要**
- Design Review 推奨 (c) destructure rename → **不要**

handoff 雛形のまま実装し、追加変更なしで `ReferenceError` を回避。Review Package §2 で「Design Review §4 Q1 は L155 を見落とした懸念であり、実コード上は活用可能」を明示。

### 2.2 handoff 雛形からの逸脱なし

handoff §[DO] 2-3 提示の雛形を **完全踏襲**:
- `recomputeReportPolicyValues` / `computeImpact` のシグネチャ・実装ロジック
- 引数名 `currentPolicy` / `sourcePolicy` / `targetPolicy`（`policy` シャドー回避、verdict-A7 §6.2 改善反映済）
- state 4 つ（`showImpactDialog` / `impactTarget` / `impactResult` / `impactLoading`）
- `handleShowImpact` のロジック（Report.filter 500 件 + computeImpact + state 更新）
- Dialog JSX 構造（タイトル + 3 KPI + テーブル + 業務ルールフッター + 閉じるボタン）

逸脱なし。

### 2.3 `policyImpactAnalyzer.js` の純粋性

| 観点 | 結果 |
|---|---|
| 副作用なし | ✅ 引数のみ参照、戻り値で結果返却 |
| 外部 IO なし | ✅ `fetch` / `console.*` / `localStorage` / `Blob` / `URL.*` / `window` / `document` 不使用 |
| Date 演算 | ✅ 使用なし（A6 aggregation.js とは異なり Date 演算自体も不要） |
| 引数 null/undefined ガード | ✅ `if (!report || !currentPolicy)` / `if (!sourcePolicy || !targetPolicy)` |

`grep -nE "window|document|localStorage|Blob|URL\.|fetch|console\." src/lib/policyImpactAnalyzer.js` → ヒット 0 ✅

handoff DONE CRITERIA #8 / REVIEW POINTS #2 遵守。

### 2.4 4 種別の再計算分岐

| 種別 | daily_allowance | accommodation_fee | car_allowance | 業務的妥当性 |
|---|---|---|---|---|
| 日帰り出張 | `daily_allowance_daytrip`（1日分） | 0 | `driving_distance_km × car_allowance_per_km` | 1 日分日当 + マイカー手当（宿泊なし） |
| 宿泊出張 | `daily_allowance_overnight × num_days` | `accommodation_domestic × num_nights` | `driving_distance_km × car_allowance_per_km` | 日数比例日当 + 泊数比例宿泊 + マイカー手当 |
| 海外出張 | `daily_allowance_overseas × num_days` | `accommodation_overseas × num_nights` | **0**（車手当なし） | 公共交通機関想定で車手当発生せず |
| 外出作業 | **0**（日当なし） | **0**（宿泊費なし） | `driving_distance_km × car_allowance_per_km` | 短時間業務で日当・宿泊費発生せず |

handoff DONE CRITERIA #5 遵守。

### 2.5 実費項目の規程非依存性

`recomputeReportPolicyValues` 内で `actuals` として 10 実費を合算するが、`currentPolicy` の値は使わず **report 値そのまま**:

```js
const actuals =
  (report.highway_fee || 0) +
  (report.parking_fee || 0) +
  (report.taxi_fee || 0) +
  (report.other_transport_fee || 0) +
  (report.flight_fee || 0) +
  (report.airport_transport_fee || 0) +
  (report.coworking_fee || 0) +
  (report.wifi_fee || 0) +
  (report.meal_fee || 0) +
  (report.other_work_fee || 0);
```

業務ルール「実費は規程変更影響対象外」遵守。handoff DONE CRITERIA #6 遵守。

### 2.6 `computeImpact` の戻り値構造

```js
{
  totalReports: number,       // 評価対象件数（全 reports）
  affectedCount: number,      // 差分 ≠ 0 の件数
  totalDiff: number,          // items の diff 合計
  items: Array<{
    report,                   // Report エンティティ参照
    oldTotal: number,         // sourcePolicy 適用時の total_amount
    newTotal: number,         // targetPolicy 適用時の total_amount
    diff: number,             // newTotal - oldTotal
  }>,
}
```

`items` は `diff !== 0` のレポートのみ含む（handoff DONE CRITERIA #7）。「全レポートが影響を受ける」場合は `totalReports === affectedCount`、「規程変更が業務上の影響なし」場合は `affectedCount === 0`。

### 2.7 業務ルール「DB 書き戻しなし」の実装保証

`handleShowImpact` 内に `Report.update` / `Report.create` 呼出が **一切存在しない** ことを grep で保証:

```
$ awk '/handleShowImpact/,/^  };/' src/pages/PolicyManagement.jsx | grep -nE "Report\.update"
（出力なし、exit=1）
```

→ Dialog 表示はメモリ上の `impactResult` state のみで完結、DB に書き戻しが発生しない。handoff REVIEW POINTS #6 遵守。

### 2.8 「影響範囲」ボタンの表示条件

```jsx
{!p.is_active && activePolicy && (
  <Button ... onClick={() => handleShowImpact(p)} ...>
    <Eye className="w-3.5 h-3.5" />影響範囲
  </Button>
)}
```

- `!p.is_active`: 適用中の規程に対しては表示しない（自己比較を防ぐ）
- `activePolicy`: 比較元の現行規程が存在する場合のみ表示（規程ゼロ件時の安全性）

挿入位置: 既存「適用する」ボタンの直前、同じ `<div className="flex items-center gap-2">` 内。handoff §[DO] 3.4 通り。

handoff DONE CRITERIA #10-11 / REVIEW POINTS #8-9 遵守。

### 2.9 Dialog UI の整合性

A7 Summary.jsx + A5 Approval.jsx の Dialog パターンを踏襲:
- `<Dialog open={...} onOpenChange={...}>`
- `<DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">`（長いリスト対応）
- `<DialogHeader>` + `<DialogTitle>` で比較対象 version 明示
- ローディング状態 → 結果表示の 2 段階
- 3 KPI カード（色分け）+ テーブル + 業務ルール明示フッター
- `<DialogFooter>` + 「閉じる」ボタン

handoff REVIEW POINTS #10 遵守。

---

## 3. ファイル別改修詳細

### 3.1 新規: `src/lib/policyImpactAnalyzer.js`（純粋関数モジュール、約 120 行）

| 関数 | 行 | 内容 |
|---|---|---|
| `recomputeReportPolicyValues(report, currentPolicy)` | L29-78 | 4 種別分岐で規程依存項目（daily_allowance / accommodation_fee / car_allowance）再計算 + 実費非依存集計 → 戻り値 4 フィールド |
| `computeImpact(reports, sourcePolicy, targetPolicy)` | L93-118 | 全 reports を `recomputeReportPolicyValues` × 2 回呼出し、diff 計算、`diff !== 0` のみ items に含める → 戻り値 4 フィールド |

`Date` 演算も使用しないシンプルな純粋関数。

### 3.2 改修: `src/pages/PolicyManagement.jsx`

#### imports 追加（3 行）
```diff
- import { Upload, Loader2, CheckCircle, FileText } from 'lucide-react';
+ import { Upload, Loader2, CheckCircle, FileText, Eye } from 'lucide-react';
+ import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
+ import { computeImpact } from '@/lib/policyImpactAnalyzer';
```

#### state 追加（4 つ）
```diff
+ const [showImpactDialog, setShowImpactDialog] = useState(false);
+ const [impactTarget, setImpactTarget] = useState(null);
+ const [impactResult, setImpactResult] = useState(null);
+ const [impactLoading, setImpactLoading] = useState(false);
```

#### handler 追加（1 つ、約 18 行）
- `handleShowImpact(targetPolicy)`: setImpactTarget → showImpactDialog → Report.filter (500 件) → computeImpact → setImpactResult。try-catch でエラー時フォールバック

#### ボタン追加（1 箇所、約 10 行）
既存「適用する」ボタンの **直前** に「影響範囲」ボタン挿入。表示条件 `!p.is_active && activePolicy`。

#### Dialog JSX 追加（1 箇所、約 90 行）
規程履歴 Card の直後、`</div>` の直前に挿入:
- DialogTitle で比較対象明示
- impactLoading → Loader2 アニメ
- impactResult.error → 赤メッセージ
- 3 KPI カード（評価対象件数 / 影響件数 / 合計差額）色分け
- 影響レポート一覧テーブル（6 列）
- 業務ルール明示フッター（太字強調）
- DialogFooter で「閉じる」ボタン

#### 触れていない箇所
- 現行規程表示 Card
- PDF アップロード + AI 解析 + AI 解析後 diff 表示
- 規程内容メモ / 新規規程保存
- 規程履歴の既存表示要素（version, 施行日, 適用中バッジ, PDF リンク, 適用するボタン）
- `handlePdfUpload` / `handleActivate` / `handleSaveNew` 関数
- `FIELD_LABELS` 定義
- `usePolicy` hook の利用方法

handoff DO NOT「既存機能への変更」遵守。

### 3.3 新規: `.claude-team/baseline-A8.md`（業務ルール文書、約 230 行）

| セクション | 内容 |
|---|---|
| 業務ルール 4 つ | 過去レポート遡及禁止 / 実費非依存 / 比較範囲 / 4 種別計算差 |
| 業務シナリオ 3 つ | 規程変更前確認 / 履歴追跡 / CSV 連携 |
| 検証手順 5 つ | 基本動作 / 計算正確性 (4 例) / 業務ルール / 境界条件 / UI 整合性 |
| 既存機能への影響 | A0-A7 不変 + PolicyManagement.jsx 内不変項目 + A8 追加項目 |
| 監査要件マッピング | 8 観点（Who/What/How much/Why/When/Where/Reproducibility/Non-destructiveness） |
| **ロードマップ完了サマリ** | 全 9 フェーズ完走 + 各フェーズ成果物表 + 業務フロー完成 |

handoff DONE CRITERIA #19 / REVIEW POINTS 全般遵守。

---

## 4. Regression 検証

### 4.1 既存 PolicyManagement.jsx 機能の不変性

| 機能 | 結果 |
|---|---|
| 現行規程表示 Card | ✅ JSX 不変 |
| PDF アップロード + AI 解析 | ✅ `handlePdfUpload` 不変 |
| AI 解析後 diff 表示（`analyzedPolicy && showDiff` ブロック） | ✅ JSX 不変 |
| 規程内容メモ / 新規規程保存 | ✅ `handleSaveNew` 不変 |
| 規程履歴の既存表示（version, 施行日, PDF リンク, 適用するボタン） | ✅ JSX 既存要素不変、Eye ボタン追加のみ |
| `handleActivate` | ✅ 不変 |
| `FIELD_LABELS` | ✅ 不変 |
| `usePolicy` hook 利用 | ✅ L13 不変 |

handoff DONE CRITERIA #17 / REVIEW POINTS #7 遵守。

### 4.2 新規「影響範囲」機能の動作（静的・grep 確認）

| 観点 | 結果 |
|---|---|
| admin 限定アクセス | ✅ `/policy` ルート自体が既存 admin 限定（Layout 制御） |
| ボタン表示条件 `!p.is_active && activePolicy` | ✅ grep で条件式確認 |
| 適用中規程に非表示 | ✅ `!p.is_active` で除外 |
| `activePolicy` 不在時に非表示 | ✅ `activePolicy &&` で除外 |
| ボタン押下 → handleShowImpact 呼出 | ✅ `onClick={() => handleShowImpact(p)}` |
| Dialog 表示 | ✅ `setShowImpactDialog(true)` |
| Loader2 表示中 | ✅ `impactLoading ?` 分岐 |
| 3 KPI + テーブル + フッター | ✅ JSX 各要素存在 |
| 0 件影響時の「該当なし」表示 | ✅ `impactResult.items.length > 0 ? <table> : <div>該当なし</div>` |
| エラー時の赤メッセージ | ✅ `impactResult.error && <div>...</div>` |
| 「閉じる」で Dialog 閉じる | ✅ `onClick={() => setShowImpactDialog(false)}` |

handoff DONE CRITERIA #10-16 遵守。

### 4.3 計算正確性（4 種別の論理確認）

| 種別 | テストケース | 期待挙動 |
|---|---|---|
| 日帰り出張 | `daily_allowance_daytrip: 5000 → 6000`、driving_distance_km=0 | `+1000` 差分 |
| 宿泊出張 | `accommodation_domestic: 15000 → 20000`、num_nights=1 | `+5000` 差分（日当・車手当不変） |
| 海外出張 | `car_allowance_per_km: 30 → 50`、driving_distance_km=10 | **0** 差分（海外は車手当なし、業務ルール） |
| 外出作業 | `daily_allowance_overnight: 5000 → 6000` | **0** 差分（外出作業は日当なし、業務ルール） |
| 全種別 | 規程変更で実費に touch なし | 実費分は再計算結果に影響しない |

ロジックは `recomputeReportPolicyValues` 内の if-else 分岐で正しく実装。

### 4.4 業務ルール「DB 書き戻しなし」の検証

```
$ awk '/handleShowImpact/,/^  };/' src/pages/PolicyManagement.jsx | grep -nE "Report\.update|Report\.create|Report\.delete"
（出力なし、exit=1）
```

→ `handleShowImpact` 内に Report.* 書き込み API 呼出が **一切存在しない** ことを確認。handoff REVIEW POINTS #6 遵守。

### 4.5 境界条件

| ケース | 動作 |
|---|---|
| 承認済レポートが 0 件 | `Report.filter` が空配列 → `computeImpact` が `affectedCount=0, items=[]` → Dialog で「該当なし」表示 |
| `activePolicy` 不在（規程ゼロ件） | ボタン自体が表示されない（`activePolicy &&` ガード） |
| 500 件超 | `Report.filter({status:'承認済'}, '-created_date', 500)` で上位 500 件のみ評価対象（A6/A7 と整合） |
| エラー時 | try-catch で `impactResult = { ..., error: true }` 設定 → Dialog で赤メッセージ |
| 規程値が null/undefined | `recomputeReportPolicyValues` 内の `|| 0` フォールバックで安全処理 |
| `report` 自体が null | `if (!report || !currentPolicy)` で空オブジェクト返却 |

### 4.6 A1〜A7 成果物の不変性

| フェーズ | 成果物 | A8 での touch | 結果 |
|---|---|---|---|
| A1 | FieldworkForm receipts SOT | なし | ✅ |
| A2 | 4 form 1日1件チェック | なし | ✅ |
| A3 | ReportEdit.jsx / App.jsx Routes / 4 form mode/initialReport / ReportDetail 編集ボタン | なし | ✅ |
| A4 | useReceiptParser / ReceiptUploaderSection / reportGenerator | なし | ✅ |
| A5 | notifications.js 4 ヘルパー / 4 form + Approval + ReportDetail 通知呼出 | なし | ✅ |
| A6 | aggregation.js / 月次配信 / Summary 手動ボタン | なし | ✅ |
| A7 | aggregation.js 拡張（escape/audit/async）/ Summary audit dialog | なし | ✅ |

handoff REVIEW POINTS #11 遵守。

---

## 5. ビルド / lint 検証

### 5.1 `npm run lint`

```
$ npm run lint
> base44-app@0.0.0 lint
> eslint . --quiet

exit=0
```

→ errors=0。

### 5.2 `npx eslint .`（warnings）

```
/Users/taaa_14/Desktop/システム開発/athos-trip-flow/src/pages/Login.jsx
  23:14  warning  'err' is defined but never used  unused-imports/no-unused-vars

/Users/taaa_14/Desktop/システム開発/athos-trip-flow/src/pages/ReportDetail.jsx
  66:9  warning  'isAdmin' is assigned a value but never used. Allowed unused vars must match /^_/u  unused-imports/no-unused-vars

/Users/taaa_14/Desktop/システム開発/athos-trip-flow/src/pages/ReportNew.jsx
  46:9  warning  'navigate' is assigned a value but never used. Allowed unused vars must match /^_/u  unused-imports/no-unused-vars

✖ 3 problems (0 errors, 3 warnings)

exit=0
```

→ errors=0, warnings=**3**（A7 完了時点と完全一致、handoff DONE CRITERIA #1 を満たす）。

A8 で新規導入したコード（policyImpactAnalyzer.js、PolicyManagement.jsx の handleShowImpact + Dialog）には warning は発生していない。

### 5.3 `npm run build`

```
$ npm run build
> base44-app@0.0.0 build
> vite build

[base44] Proxy not enabled (VITE_BASE44_APP_BASE_URL not set)
exit=0

$ ls -la dist/index.html
-rw-r--r--  1 taaa_14  staff  1508  6  8 16:49 dist/index.html
```

→ build 成功、1508 bytes。

### 5.4 `policyImpactAnalyzer.js` 純粋性確認

```
$ grep -nE "window|document|localStorage|Blob|URL\.|fetch|console\." src/lib/policyImpactAnalyzer.js
（出力なし、exit=1）
```

→ ヒット 0。handoff DONE CRITERIA #8 / REVIEW POINTS #2 遵守。

### 5.5 業務ルール「DB 書き戻しなし」確認

```
$ awk '/handleShowImpact/,/^  };/' src/pages/PolicyManagement.jsx | grep -nE "Report\.update|Report\.create|Report\.delete"
（出力なし、exit=1）
```

→ `handleShowImpact` 内に書き込み API 呼出 0 件。handoff REVIEW POINTS #6 遵守。

### 5.6 `git diff --stat`（A7 commit 待ち + A8 由来）

```
src/pages/PolicyManagement.jsx        | +135  (imports + state + handler + button + Dialog 追加)
```

A8 新規作成:
```
src/lib/policyImpactAnalyzer.js                       (新規、約 120 行)
.claude-team/baseline-A8.md                           (新規、約 230 行)
.claude-team/review-packages/review-package-A8.md     (本ファイル、新規)
```

累積（A3 / A4 / A5 / A6 / A7 / A8）が commit 待ち。§7 で 1 commit 集約案を提示。

---

## 6. Review Agent への質問・申し送り

### 1. ✅ Design Review §4 Q1 `activePolicy` 命名対応

L155 既存 `const activePolicy = policies.find(p => p.is_active);` を活用、handoff 雛形通り実装。Design Review が指摘した `ReferenceError` リスクは L155 を見落とした懸念。本実装は追加 alias / rename なしで動作。§2.1 で詳述。

### 2. ロードマップ完了視野での累積 commit 集約

A8 = ロードマップ最終フェーズ。A3-A8 が累積で commit 待ち（6 フェーズ分）。

選択肢:
- (a) **A3-A8 を 1 commit に集約**（ロードマップ完成 commit、§7 はこの方針）
- (b) A5 まで（MVP）/ A6-A7（運用品質）/ A8（規程監査） の 3 commits 節目分割
- (c) フェーズごと独立 6 commits

A8 が PROJECT COMPLETE を宣言する判定が予定されているため、**(a) ロードマップ完成 commit** が節目として論理的明確。Owner / Review Agent 判断。

### 3. handoff 雛形からの逸脱なし

§2.2 通り、handoff §[DO] 2-3 雛形を完全踏襲。`activePolicy` の使用も L155 既存変数で対応するため逸脱に該当しない。

### 4. 純粋関数性 + 業務ルール「DB 書き戻しなし」の二重保証

| 観点 | 保証手段 |
|---|---|
| `policyImpactAnalyzer.js` 純粋性 | `grep -nE "window\|document\|localStorage\|Blob\|URL.\|fetch\|console\." src/lib/policyImpactAnalyzer.js` ヒット 0 |
| `handleShowImpact` 内 DB 書き戻しなし | `awk '/handleShowImpact/,/^  };/' ... \| grep -nE "Report\.update\|Report\.create\|Report\.delete"` ヒット 0 |

業務ルール遵守を grep で機械検証可能。

### 5. 実機検証手順は Owner 分担

§4 の Regression 検証は静的・grep ベース。baseline-A8.md「検証手順」に Owner 向け実機検証フロー（4 種別の計算正確性 + 境界条件 + UI 整合性）を記載。Base44 sandbox での実機検証は Owner 実施。

### 6. lint warnings 3 件は A7 baseline 不変

`Login.jsx err` / `ReportDetail.jsx isAdmin` / `ReportNew.jsx navigate` の 3 件は A0.1 から継続。A8 で導入したファイルには warning なし。

### 7. ⭐ ロードマップ完了（PROJECT COMPLETE）視野

A8 は handoff §[CURRENT PHASE] / §[NEXT PHASE DEPENDENCY] 通り、**ロードマップ最終フェーズ**。本 verdict APPROVED で全 9 フェーズ完走:

```
A0 → A0.1 → A1 → A2 → A3 → A4 → A5（MVP COMPLETE） → A6 → A7 → A8（PROJECT COMPLETE）
```

業務フロー完成: 社員 → レポート作成 → AI 補完 → 承認 → 集計 → CSV → 旅費規定監査

Review Agent verdict 形式（handoff §[REVIEW POINTS] 判定欄）:
```
APPROVED
PHASE COMPLETE
PROJECT COMPLETE
```

`current-phase.txt` は `DONE` または同等の終端値に更新（A9 は存在しない）。

### 8. A9 以降は存在せず

handoff §[NEXT PHASE DEPENDENCY] 通り、A9 以降は **ロードマップ外**。バグ対応 / 機能追加要望は新規 roadmap 策定（A9-A16 等）または独立タスク管理として Design Agent + Owner で協議。本フェーズ範囲外。

### 9. `activePolicy` 参照タイミングの安全性

`handleShowImpact` 関数定義位置は `activePolicy` 変数宣言（L155）より **前** に位置しているが、関数式（function expression）のため、定義時点では本体は実行されない。実際の呼出は user click 時で、その時点では `activePolicy` は初期化済み（function closure で同一 component scope のため）。

各 render で `handleShowImpact` と `activePolicy` の両方が同時に再生成され、closure は最新の `activePolicy` を捕捉。

---

## 7. コミット方針

handoff §[DO] 8 / §[DO NOT]「`git commit` の実行（Review verdict 後の Owner 操作）」遵守、**本 Implementation Agent は commit を実行しない**。

§6 Q2 通り、A3 + A4 + A5 + A6 + A7 + A8 を 1 commit に集約する **ロードマップ完成 commit** を提案。

### 7.1 ステージング対象ファイル一覧

```bash
git add \
  src/App.jsx \
  src/pages/ReportEdit.jsx \
  src/pages/ReportDetail.jsx \
  src/pages/Approval.jsx \
  src/pages/Summary.jsx \
  src/pages/PolicyManagement.jsx \
  src/components/forms/DayTripForm.jsx \
  src/components/forms/OvernightTripForm.jsx \
  src/components/forms/OverseasTripForm.jsx \
  src/components/forms/FieldworkForm.jsx \
  src/components/forms/ReceiptUploaderSection.jsx \
  src/hooks/useReceiptParser.js \
  src/lib/reportGenerator.js \
  src/lib/notifications.js \
  src/lib/aggregation.js \
  src/lib/policyImpactAnalyzer.js \
  .claude-team/current-phase.txt \
  .claude-team/baseline-A6.md \
  .claude-team/baseline-A7.md \
  .claude-team/baseline-A8.md \
  .claude-team/review-packages/review-package-A3.md \
  .claude-team/review-packages/review-package-A4.md \
  .claude-team/review-packages/review-package-A5.md \
  .claude-team/review-packages/review-package-A6.md \
  .claude-team/review-packages/review-package-A7.md \
  .claude-team/review-packages/review-package-A8.md
```

合計 26 ファイル（A3-A8 累積）。

### 7.2 コミットメッセージ案

```
feat(A3+A4+A5+A6+A7+A8): roadmap complete — MVP + ops + audit

⭐ Roadmap complete: A0 -> A0.1 -> A1 -> A2 -> A3 -> A4 -> A5 (MVP) ->
A6 -> A7 -> A8 (PROJECT COMPLETE)

A3 — Report edit route (P0 #1, MVP item #3)
- new src/pages/ReportEdit.jsx + route in App.jsx
- ReportDetail: 「編集する」 button in canEdit block
- 4 forms gain { mode, initialReport } props

A4 — Receipts AI all forms + heading + amount guard
(P0 #2, known #2 #3, MVP items #1 #4)
- new src/hooks/useReceiptParser.js + ReceiptUploaderSection
- reportGenerator: SETTLEMENT_HEADING_RE + STYLE_RULES

A5 — Lifecycle email notifications (P0 #3, MVP item #2, MVP COMPLETE)
- new src/lib/notifications.js: safeSend / getAdminEmails /
  notifySubmitted / notifyApproved / notifyRejected
- 4 forms + ReportDetail + Approval call helpers

A6 — Monthly summary auto-delivery
- new src/lib/aggregation.js: pure functions
  aggregateMonthlySummary / formatSummaryForEmail / buildReportsCSV
- notifications.js: notifyMonthlySummary
- Summary.jsx: admin manual delivery button
- new .claude-team/baseline-A6.md (Base44 Automation setup)

A7 — Audit CSV + chunked async
- aggregation.js: escapeCsvCell / getHeaders / buildRow / rowToCsvLine
  helpers; buildReportsCSV refactored (RFC 4180 escape added)
- new buildReportsCSVAsync(reports, { format, chunkSize, onProgress })
- formatName param rename (avoid date-fns format shadow, per
  design-review-verdict-A7 §4 Q1)
- Summary.jsx: admin-only 「監査用 CSV 出力」 + filter dialog
- new .claude-team/baseline-A7.md (CSV format spec, 33 audit cols)

A8 — Policy change impact analyzer (PROJECT COMPLETE)
- new src/lib/policyImpactAnalyzer.js: pure functions
  recomputeReportPolicyValues + computeImpact (4 type branches:
  日帰り / 宿泊 / 海外 / 外出作業; actuals are policy-independent)
- PolicyManagement.jsx: admin-only 「影響範囲」 button per inactive
  policy row + Dialog (3 KPIs + impact list + business-rule footer)
- Business rule enforced: simulation only, no DB writeback
  (grep verified: no Report.update in handleShowImpact)
- new .claude-team/baseline-A8.md (business rules + scenarios +
  audit requirement mapping)

MVP 達成 (A1-A5): goal.md 4 requirements all satisfied.
A6-A8: post-MVP operational quality + audit features.

Business flow complete: 社員 -> レポート作成 -> AI 補完 -> 承認
                                                  -> 集計 -> CSV -> 旅費規定監査

current-phase.txt: A2 -> A8 (set by Review Agents at each verdict;
included to match working tree)

Phase: A8 (Implementation Verdict Gate pending, PROJECT COMPLETE)
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### 7.3 注意事項

| 項目 | 遵守 |
|---|---|
| `git push` 禁止 | ✅ Owner 操作時も push しない |
| `--no-verify` 禁止 | ✅ |
| `--amend` 禁止 | ✅ |
| `lint:fix` 禁止 | ✅ |
| 1 commit のみ（集約方針） | ✅ A3-A8 を 1 件に集約（ロードマップ完成 commit） |

### 7.4 commit 後の検証コマンド（プレースホルダ自己マッチ回避: 分割表記）

```bash
git log --oneline | head -5
git status --short
git rev-list --count origin/main..HEAD
npm run lint
npm run build
# プレースホルダ充填チェック（変数化で文字列分割、自己マッチ回避）
TOKEN="AUTO-""FILL:"; grep -c "$TOKEN" .claude-team/review-packages/review-package-A8.md  # 期待値: 0
# A8 純粋性確認
grep -nE "window|document|localStorage|Blob|URL\.|fetch|console\." src/lib/policyImpactAnalyzer.js  # 期待: ヒット 0
# A8 業務ルール「DB 書き戻しなし」確認
awk '/handleShowImpact/,/^  };/' src/pages/PolicyManagement.jsx | grep -nE "Report\.update|Report\.create|Report\.delete"  # 期待: ヒット 0
# A8 ボタン表示条件確認
grep -n "!p.is_active && activePolicy" src/pages/PolicyManagement.jsx  # 期待: ヒット 1
```
