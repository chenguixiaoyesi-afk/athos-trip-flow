# Review Package — Phase A7

From: Implementation Agent
To: Review Agent（実装後ゲート）
Date: 2026-06-08
Phase: A7 — CSV 出力フォーマット固定 + 大量データ対応
Handoff 正本: `.claude-team/handoff/design-handoff-A7.md`
Design Review Gate Verdict: `.claude-team/design-reviews/design-review-verdict-A7.md`（APPROVED_FOR_IMPLEMENTATION、§4 Q1 で致命バグ指摘あり）
直近 verdict（前フェーズ）: `.claude-team/verdicts/verdict-A6.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A7）

---

## 0. 実装前ゲート確認

| 項目 | 結果 |
|---|---|
| REPOSITORY ISOLATION RULE | ✅ handoff・実コード差分・本 review-package すべて Athos TravelMate のみ、禁止語彙混入なし |
| IMPLEMENTATION SAFETY RULE | ✅ 既存 2 ファイル（`src/lib/aggregation.js` + `src/pages/Summary.jsx`）実在、新規 2 ファイル不在を事前確認後に作成 |
| 9 ブロック仕様 | ✅ 揃い |
| Design Review Gate | ✅ `APPROVED_FOR_IMPLEMENTATION`（§4 Q1 で `buildRow(r, format)` の変数シャドー指摘あり、本 review-package §2.1 で対応明示） |
| 直近フェーズ PHASE COMPLETE | ✅ A6 APPROVED / PHASE COMPLETE / NEXT PHASE: A7 |
| handoff DO 5（current-phase.txt = A7） | ✅ 着手時点で既に `A7`、本 Agent は変更せず |

---

## 1. 現状把握（A7 開始時の grep / Read 結果）

### 1.1 既存 `buildReportsCSV`（A6 完了状態、`src/lib/aggregation.js`）

```
L88-105 export function buildReportsCSV(reports)
  - headers 8 列インライン定義（'レポートID', '種別', ...）
  - rows は reports.map で 8 セル展開
  - 戻り値: [headers, ...rows].map(row => row.join(',')).join('\n')
  - BOM なし、エスケープなし
```

### 1.2 aggregation.js 純粋性（A6 完了状態）

`grep -nE "window|document|localStorage|Blob|URL\." src/lib/aggregation.js` → ヒット 0 ✅

### 1.3 Summary.jsx 既存 (A6 完了状態)

| 観点 | 行 | 内容 |
|---|---|---|
| imports | L1-16 | React, base44, useAuth, Button, Card, Select, Input, Label, lucide-react（Download, TrendingUp, TrendingDown, Minus, Settings, Mail, Loader2）, date-fns（getYear, getMonth）, recharts, aggregation 3 関数, notifications |
| exportCSV | L110-120 | `buildReportsCSV(yearReports)` 経由、BOM + Blob + Download |
| sendPreviousMonthSummary | L122-150 | A6 完了状態、`buildReportsCSV` 呼出 |
| Dialog 既存使用 | ヒット 0 | Summary.jsx には未使用、Approval.jsx パターンを参考にする |

### 1.4 Approval.jsx の Dialog import パターン（参考）

```
L7  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
```

→ A7 で Summary.jsx に同じ pattern で導入。

### 1.5 Report スキーマフィールド（HANDOFF.md L177-231 抜粋）

audit format で参照する全フィールドが実在することを確認:
- `report_number`, `report_type`, `status`, `created_by_name`, `created_by_email`, `created_date`, `approved_date`, `approver_name`
- `travel_date`, `start_date`, `end_date`, `num_nights`, `num_days`
- `destination_name`, `destination_address`, `country_name`, `city_name`, `business_content`
- `one_way_distance_km`, `driving_distance_km`
- `daily_allowance`, `accommodation_fee`, `car_allowance`
- `highway_fee`, `parking_fee`, `taxi_fee`, `other_transport_fee`, `flight_fee`, `airport_transport_fee`
- `coworking_fee`, `wifi_fee`, `meal_fee`, `other_work_fee`, `total_amount`

すべて HANDOFF.md スキーマに存在。

---

## 2. 設計判断

### 2.1 ⚠️ handoff 雛形の `buildRow(r, format)` 変数シャドー修正

**Design Review §4 Q1 で指摘された致命的バグへの対応**:

handoff §[DO] 2.1 雛形の `buildRow(r, format)` は、引数名 `format` が date-fns の `format` 関数をシャドーし、`format(new Date(...), 'yyyy-MM-dd')` 呼出で実行時 `TypeError: format is not a function` を発生させる重大なバグ。

**採用した修正案: Design Review §4 Q1 の推奨選択肢 (a) `formatName` リネーム**:

```js
// 修正前（handoff 雛形のまま、バグあり）:
function buildRow(r, format) {       // ← 引数名 'format' がシャドー
  if (format === 'audit') {
    return [..., format(new Date(...), 'yyyy-MM-dd'), ...]; // ❌ TypeError
  }
}

// 修正後（本 A7 実装）:
function buildRow(r, formatName) {   // ← formatName で date-fns format を温存
  if (formatName === 'audit') {
    return [..., format(new Date(...), 'yyyy-MM-dd'), ...]; // ✅ date-fns format が利用可能
  }
}
```

一貫性のため `getHeaders(formatName)` でも同じリネーム適用。

`buildReportsCSVAsync` の外部 API は `options.format` のまま維持（呼出元との互換性）し、内部で `const { format: formatName = 'simple', ... } = options;` と分割代入で rename:

```js
export async function buildReportsCSVAsync(reports, options = {}) {
  const { format: formatName = 'simple', chunkSize = 200, onProgress } = options;
  // 以後 formatName を使用
}
```

→ 呼出側（Summary.jsx）は `buildReportsCSVAsync(filtered, { format: 'audit', ... })` のまま、変更不要。

**handoff 雛形からの逸脱明示** (handoff §[DO] 9 / verdict-A4 §7.1 改善継続):
- 場所: `aggregation.js` の `getHeaders` / `buildRow` 関数定義、`buildReportsCSVAsync` 内の分割代入
- 理由: design-review-verdict-A7.md §4 Q1 で指摘された致命バグ回避
- 影響: 外部 API（`buildReportsCSVAsync({ format: ... })`）は不変、呼出側 Summary.jsx には影響なし

### 2.2 `escapeCsvCell` の正規表現実装

`/[",\n\r]/.test(s)` で判定、ヒット時のみ `"` で囲む + 内部 `"` を `""` にエスケープ。

handoff §[DO] 2.1 雛形通り。`indexOf` 連鎖等の代替実装は採用せず（正規表現の方が可読性高）。

### 2.3 `chunkSize = 200` デフォルト値

handoff §[DO] 2.3 設計判断通り。経験的に UI thread 解放と速度のバランス、1000 件で 5 chunk (5 × setTimeout(0)) → 数秒で完了想定。

代替値（100 or 500）も handoff §[DO] 9 で許容範囲だが、handoff 雛形値 200 をそのまま採用（変更理由なし）。

### 2.4 `buildReportsCSVAsync` 内の `onProgress` callback throw 吸収

```js
if (onProgress) {
  try { onProgress({ done, total }); } catch { /* ignore caller errors */ }
}
```

呼出元の `setAuditProgress` が React の state 更新で throw する可能性は低いが、ユーザー任意 callback の安全性のため try-catch でガード。aggregate 処理は継続。

### 2.5 BOM 付与の責務分離（A6 確立を継承）

| 層 | 責務 |
|---|---|
| `aggregation.js` | BOM なしのプレーン CSV 文字列を返す（`buildReportsCSV` / `buildReportsCSVAsync` ともに） |
| `Summary.jsx` UI 層 | `'﻿' + csv` で BOM 付与、`Blob` + `URL.createObjectURL` + `link.click()` のブラウザ依存処理 |

これは A6 で確立した純粋関数性原則を A7 で継承。`aggregation.js` の純粋性は維持される（`grep -nE "window|document|localStorage|Blob|URL\." src/lib/aggregation.js` → ヒット 0、handoff DONE CRITERIA #12）。

### 2.6 既存 `buildReportsCSV` 書換後の外形等価性

```js
// A6 旧実装
const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

// A7 新実装
const csv = [headers, ...rows].map(rowToCsvLine).join('\n');
// where rowToCsvLine(cells) = cells.map(escapeCsvCell).join(',')
```

**通常データ（カンマ・改行・引用符を含まないセル）では**:
- `escapeCsvCell(value)` が判定式 `/[",\n\r]/.test(s)` で false → そのまま return s
- 結果: `cells.map(escapeCsvCell).join(',')` ≡ `cells.map(String).join(',')` ≡ A6 出力

**特殊データ（カンマ・改行・引用符を含むセル）では**:
- A6: `'東京都, 渋谷'` がそのまま `,` 連結に挿入され、CSV が壊れる
- A7: `'"東京都, 渋谷"'` で正しく引用符化される（RFC 4180 準拠）

→ 通常データの A6 互換性を完全維持しつつ、特殊データでの破壊を改善。回帰ではなく **CSV 規格準拠の改善**。

### 2.7 audit format の 33 列（baseline-A7.md と一致）

`getHeaders('audit')` の列数を数えると:
- (3) レポートID, 種別, ステータス
- (2) 作成者, 作成者メール
- (3) 作成日, 承認日, 承認者
- (4) 出張日_開始, 出張日_終了, 泊数, 日数
- (4) 目的地, 住所, 国, 都市
- (1) 業務内容
- (2) 片道距離_km, 走行距離_km
- (3) 日当, 宿泊費, 車手当
- (4) 高速道路料金, 駐車場料金, タクシー料金, その他交通費
- (2) 航空券代, 空港送迎費
- (4) コワーキング_会議室, WiFi_通信費, 食事代, その他業務費
- (1) 合計金額

= **33 列** ✓ baseline-A7.md と一致。`buildRow(r, 'audit')` の row 配列も 33 要素で揃う。

### 2.8 絞り込みダイアログの `__all__` センチネル値

Design Review §4 Q2 で確認された通り、shadcn/ui Select の `value=""` 不許容制約への標準的ワークアラウンド。`onValueChange` で `'__all__'` → `''` に変換し、内部 state は空文字列で保持。

### 2.9 `r.created_date.slice(0, 10)` の null ガード

Design Review §4 Q3 で確認された通り、`r.created_date ? r.created_date.slice(0, 10) : ''` で null/undefined ガード済（handoff §[DO] 3.3 雛形のまま）。

### 2.10 `Summary.jsx` で既存「CSV 出力」ボタンと A7 の「監査用 CSV 出力」ボタンの並び

- 既存「予算設定」「CSV 出力」「先月の集計を管理者に送信」（A6）に加えて、admin 限定「監査用 CSV 出力」（A7）を追加
- 並び順: 予算設定 → CSV 出力 → （admin のみ）先月の集計を管理者に送信 → （admin のみ）監査用 CSV 出力
- 既存 3 ボタンの動作は完全不変

---

## 3. ファイル別改修詳細

### 3.1 改修: `src/lib/aggregation.js`

#### 追加: 内部ヘルパー 4 つ（L19-110、L139-142、約 90 行）
| 関数 | スコープ | 内容 |
|---|---|---|
| `escapeCsvCell(value)` | module-private | RFC 4180 エスケープ |
| `getHeaders(formatName)` | module-private | format 別ヘッダ配列（simple: 8 列 / audit: 33 列） |
| `buildRow(r, formatName)` | module-private | format 別セル配列、`formatName` で date-fns `format` シャドー回避 |
| `rowToCsvLine(cells)` | module-private | `cells.map(escapeCsvCell).join(',')` |

#### 改修: 既存 `buildReportsCSV` を内部ヘルパー使用に書換（L143-153、約 10 行）

```diff
- const headers = ['レポートID', '種別', ...];  // 8 列インライン
- const rows = (reports || []).map(r => [
-   r.report_number || ..., r.report_type || ..., ...
- ]);
- return [headers, ...rows].map(row => row.join(',')).join('\n');
+ const headers = getHeaders('simple');
+ const rows = (reports || []).map(r => buildRow(r, 'simple'));
+ return [headers, ...rows].map(rowToCsvLine).join('\n');
```

外形挙動: 通常データで A6 と完全同一、特殊データのみ RFC 4180 準拠で改善。

#### 追加: 新規 `buildReportsCSVAsync`（L160-184、約 25 行）

handoff §[DO] 2.3 雛形通り。`options.format` を内部で `formatName` に分割代入 rename して date-fns シャドー回避。

### 3.2 改修: `src/pages/Summary.jsx`

#### imports 追加（3 行）
```diff
- import { Download, ..., Mail, Loader2 } from 'lucide-react';
+ import { Download, ..., Mail, Loader2, Filter } from 'lucide-react';
+ import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
- import { aggregateMonthlySummary, formatSummaryForEmail, buildReportsCSV } from '@/lib/aggregation';
+ import { aggregateMonthlySummary, formatSummaryForEmail, buildReportsCSV, buildReportsCSVAsync } from '@/lib/aggregation';
```

#### state 追加（4 つ、合計約 10 行）
- `showAuditDialog: boolean` — Dialog 開閉
- `auditFilter: { startDate, endDate, userName, reportType }` — 絞り込み条件
- `auditExporting: boolean` — エクスポート中フラグ
- `auditProgress: { done, total }` — chunk progress

#### handler 追加（2 つ、約 35 行）
- `filterReportsForAudit(allReports, filter)` — 純粋計算、4 観点 AND フィルタ
- `exportAuditCSV()` — async ハンドラ、`buildReportsCSVAsync` を `format: 'audit'` で呼出 + BOM + Blob + Download

#### admin button 追加（1 箇所、約 7 行）
既存「先月の集計を管理者に送信」ボタンの **直後**:
```jsx
{isAdmin && (
  <Button variant="outline" onClick={() => setShowAuditDialog(true)} className="gap-2">
    <Filter className="w-4 h-4" />
    監査用 CSV 出力
  </Button>
)}
```

#### Dialog JSX 追加（1 箇所、約 75 行）
ファイル末尾 `</div>` 直前に挿入:
- `<DialogTitle>` で「監査用 CSV 出力 — 絞り込み」
- 期間（開始日・終了日）`<Input type="date">` × 2
- ユーザー `<Select>` + `__all__` センチネル
- 種別 `<Select>` + `__all__` センチネル
- 生成中の progress 表示（auditExporting 中のみ）
- `<DialogFooter>` で キャンセル / ダウンロード ボタン

#### 触れていない箇所
- chart / table 既存 JSX（BarChart, PieChart, 月別集計表, ユーザー別月間支給額表）
- KPI Card 既存（年間合計 / 今月の支給額 / 年間レポート総数 / 予算消化率）
- Budget input + saveBudget
- 既存「CSV 出力」ボタン（変更なし、ファイル名 `旅費精算_${year}年_経理用.csv` 維持）
- A6 「先月の集計を管理者に送信」ボタン + sendPreviousMonthSummary（変更なし）
- localStorage / annualBudget / showBudgetInput
- 月次・年次計算ロジック L51-65

handoff DO NOT「chart / table / KPI Card / 既存ボタン挙動の変更」遵守。

### 3.3 新規: `.claude-team/baseline-A7.md`（約 175 行）

| セクション | 内容 |
|---|---|
| simple フォーマット | A6 から不変の 8 列定義 |
| audit フォーマット | A7 で導入の 33 列定義（観点別マッピング含む） |
| エスケープ仕様 | RFC 4180 準拠、6 ケース例 |
| エンコーディング | UTF-8 with BOM、責務分離（aggregation = BOM なし / UI 層 = BOM 付与） |
| chunked async 仕様 | chunkSize=200, onProgress, setTimeout(0), 戻り値 |
| 大量データ動作確認手順 | 500 件 / 1000 件 / Excel 開封 / フィルタ動作の 4 セクション |
| simple vs audit 使い分け | 3 用途マッピング |
| 既存挙動への影響 | A6 → A7 移行時の差分 |
| 監査要件マッピング | Who/When/Where/What/How much/Approval/Traceability の 7 観点 |
| A7 で扱わなかった項目 | A8+ へ deferred の 6 項目 |

handoff DONE CRITERIA #22 / REVIEW POINTS #6 遵守。

---

## 4. Regression 検証

### 4.1 既存 `buildReportsCSV` の外形不変性

| 観点 | 結果 |
|---|---|
| headers 8 列の順序・内容 | ✅ `getHeaders('simple')` が A6 と完全同一 |
| rows のセル順序・データソース | ✅ `buildRow(r, 'simple')` が A6 と完全同一 8 セル |
| 通常データの出力（`,` / `"` / 改行を含まないセル） | ✅ `escapeCsvCell` が判定式で false → A6 と完全同一 |
| カンマを含むセル（destination_address 等）の出力 | ✅ A7 で初めて `"..."` 引用符化（RFC 4180 準拠改善） |

### 4.2 A6「先月の集計を管理者に送信」ボタンへの影響

| 観点 | 結果 |
|---|---|
| `sendPreviousMonthSummary` ハンドラ本体 | ✅ touch なし |
| `notifyMonthlySummary` 呼出 | ✅ touch なし |
| ボタン JSX | ✅ touch なし |
| `buildReportsCSV(aggregate.reports)` 経由の出力 | ✅ 通常データで A6 完全同一、特殊データのみ引用符化（メール本文末尾埋め込みの可読性は向上） |

### 4.3 既存 Summary.jsx の動作

| 観点 | 結果 |
|---|---|
| chart 表示（BarChart / PieChart） | ✅ JSX 変更なし |
| KPI Card 4 枚 | ✅ 変更なし |
| 月別集計表 | ✅ 変更なし |
| ユーザー別月間支給額表（admin） | ✅ 変更なし |
| 既存「CSV 出力」ボタン | ✅ ファイル名・列構造・BOM・年フィルタすべて維持 |
| Budget input | ✅ 変更なし |
| admin/user 表示分岐 | ✅ 不変 |

### 4.4 新規「監査用 CSV 出力」の動作（静的・grep 確認）

| 観点 | 結果 |
|---|---|
| admin で表示 / user で非表示 | ✅ `{isAdmin && (...)}` でガード |
| ボタン押下 → ダイアログ表示 | ✅ `onClick={() => setShowAuditDialog(true)}` |
| 期間絞り込み（開始日・終了日） | ✅ `<Input type="date">` × 2、`filterReportsForAudit` 内で `rDate < startDate` / `rDate > endDate` 比較 |
| ユーザー絞り込み | ✅ `<Select>` + `__all__` センチネル、`r.created_by_name !== filter.userName` で除外 |
| 種別絞り込み | ✅ `<Select>` + `__all__` センチネル、`r.report_type !== filter.reportType` で除外 |
| `buildReportsCSVAsync` 呼出 | ✅ `{ format: 'audit', chunkSize: 200, onProgress }` |
| progress 表示 | ✅ `auditExporting && <div>生成中: ... 件...</div>` |
| 0 件絞り込み時のアラート | ✅ `if (filtered.length === 0) { alert(...); return; }` |
| ファイル名形式 | ✅ `旅費精算_監査用_${start || 'all'}_${end || 'all'}.csv` |
| audit format 33 列出力 | ✅ §2.7 で列数確認 |

### 4.5 `buildReportsCSVAsync` の chunked async 動作

| 観点 | 結果 |
|---|---|
| `format: 'simple' / 'audit'` の切替 | ✅ `getHeaders(formatName)` + `buildRow(r, formatName)` で対応 |
| `chunkSize = 200` デフォルト | ✅ `const { chunkSize = 200 } = options;` |
| `onProgress` callback 呼出 | ✅ chunk ごとに `{ done, total }` |
| UI thread 解放 | ✅ `await new Promise(r => setTimeout(r, 0))`（最後の chunk 後はスキップ） |
| callback throw 吸収 | ✅ try-catch でラップ |
| 戻り値 BOM なし | ✅ `lines.join('\n')` のみ |
| 純粋関数性 | ✅ `window` / `document` / `localStorage` / `Blob` / `URL.` 不使用、grep ヒット 0 |

### 4.6 RFC 4180 エスケープ正確性

`escapeCsvCell` の挙動を 6 ケースで論理確認:

| 入力 | 判定式 `/[",\n\r]/.test(s)` | 出力 |
|---|---|---|
| `'山田太郎'` | false | `山田太郎`（変更なし） |
| `'東京都港区, 渋谷'` | true（`,` ヒット） | `"東京都港区, 渋谷"` |
| `'前年度比 "+10%" 増'` | true（`"` ヒット） | `"前年度比 ""+10%"" 増"`（`"` → `""`） |
| `'第一行\n第二行'` | true（`\n` ヒット） | `"第一行\n第二行"` |
| `null` / `undefined` | (skip、L99 で `return ''`) | `''` |
| `12345` | false | `12345` |

handoff REVIEW POINTS #6 遵守。

### 4.7 A6 / A5 / A4 / A3 成果物の不変性

| フェーズ成果物 | A7 での touch | 結果 |
|---|---|---|
| A6 `aggregateMonthlySummary` / `formatSummaryForEmail` | なし | ✅ aggregation.js 内でこれらの export は変更なし |
| A6 `notifyMonthlySummary` | なし | ✅ notifications.js 不変 |
| A6 「先月の集計を管理者に送信」ボタン | なし | ✅ Summary.jsx JSX 該当箇所不変 |
| A5 `notifications.js` の 4 ヘルパー | なし | ✅ notifications.js 全体不変 |
| A5 4 form + Approval + ReportDetail の通知呼出 | なし | ✅ 不変 |
| A4 `useReceiptParser.js` / `ReceiptUploaderSection.jsx` | なし | ✅ |
| A4 `reportGenerator.js` の見出し固定 + regex 分割 | なし | ✅ |
| A3 `ReportEdit.jsx` / App.jsx Routes / 4 form の mode/initialReport | なし | ✅ |

handoff DONE CRITERIA #20 / REVIEW POINTS #8-9 遵守。

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

→ errors=0, warnings=**3**（A6 完了時点と完全一致、handoff DONE CRITERIA #1 を満たす）。

A7 で新規導入したコード（aggregation.js の 4 ヘルパー + buildReportsCSVAsync、Summary.jsx の audit dialog + handler）には warning は発生していない。`buildRow(r, formatName)` のシャドー回避により date-fns `format` を正常に参照できる。

### 5.3 `npm run build`

```
$ npm run build
> base44-app@0.0.0 build
> vite build

[base44] Proxy not enabled (VITE_BASE44_APP_BASE_URL not set)
exit=0

$ ls -la dist/index.html
-rw-r--r--  1 taaa_14  staff  1508  6  8 15:59 dist/index.html
```

→ build 成功、1508 bytes。

### 5.4 `aggregation.js` 純粋性確認

```
$ grep -nE "window|document|localStorage|Blob|URL\." src/lib/aggregation.js
（出力なし、exit=1）
```

→ ヒット 0。handoff DONE CRITERIA #12 / REVIEW POINTS #3 遵守。

### 5.5 `git diff --stat`

A6 commit 待ち + A7 由来:
```
src/pages/Summary.jsx | 214 ++++++++++++++++++++++++++++++++++++++++++++++----
```

注: `src/lib/aggregation.js` は A6 で新規作成され untracked のため git diff に出ない。A7 で +90 行（ヘルパー追加） + buildReportsCSV 書換 + buildReportsCSVAsync 追加（+25 行）= 約 115 行追加されている。

A7 新規作成:
```
.claude-team/baseline-A7.md                          (新規、約 175 行)
.claude-team/review-packages/review-package-A7.md    (本ファイル、新規)
```

累積（A3 / A4 / A5 / A6 / A7）が commit 待ち。§7 で 1 commit 集約 or 段階 commit の選択肢を提示。

---

## 6. Review Agent への質問・申し送り

### 1. ⚠️ Design Review §4 Q1 シャドー問題対応の明示

Design Review が指摘した `buildRow(r, format)` の変数シャドー致命バグに対し、選択肢 (a) `formatName` リネームで対応（§2.1）。

逸脱箇所:
- `aggregation.js` の `getHeaders(formatName)` / `buildRow(r, formatName)` 関数引数名
- `buildReportsCSVAsync` 内の `const { format: formatName = 'simple', ... } = options;` 分割代入

外部 API（`buildReportsCSVAsync({ format: 'audit', ... })`）は完全不変、呼出側 Summary.jsx には影響なし。

### 2. 累積 commit 待ち（A3 + A4 + A5 + A6 + A7）の集約判断（継続）

A3 以降ずっと commit していないため、working tree に 5 フェーズ分の差分が累積。

選択肢（前 review-packages §6 から継承）:
- (a) A3+A4+A5+A6+A7 を 1 commit に集約
- (b) A5 まで（MVP）と A6+A7（運用品質） で 2 commit
- (c) A3 → A4 → A5 → A6 → A7 の独立 5 commits

§7 は (a) 方針で staging 案を記載。Owner / Review Agent 判断に委ねる。

### 3. handoff §[DO] 9「逸脱明示」の他項目

- `escapeCsvCell` の正規表現実装: handoff 雛形通り、逸脱なし
- `chunkSize = 200`: handoff 雛形通り、逸脱なし
- ダイアログ UI 構造: handoff §[DO] 3.6 雛形通り、逸脱なし
- **唯一の逸脱は §1 の `formatName` リネーム**（Design Review 指摘対応）

### 4. lint warnings 3 件は A6 baseline 不変

`Login.jsx err` / `ReportDetail.jsx isAdmin` / `ReportNew.jsx navigate` の 3 件は A0.1 から継続。A7 で導入したファイルには warning なし。

### 5. `aggregation.js` 純粋性検証

`grep -nE "window|document|localStorage|Blob|URL\." src/lib/aggregation.js` ヒット 0。handoff DONE CRITERIA #12 / REVIEW POINTS #3 遵守。

### 6. 大量データ実機検証は Owner 分担

§4 の Regression 検証はロジック存在確認の静的レベル。500/1000 件の実 UI 動作（progress 更新 / ブラウザフリーズ確認 / Excel 開封）は Owner 実機検証で確認（baseline-A7.md「大量データ動作確認手順」参照）。

### 7. `__all__` センチネルの shadcn/ui Select 制約対応

Design Review §4 Q2 で確認済。`value=""` を Select に渡せない制約を回避する標準ワークアラウンド。`onValueChange` で `'__all__'` → `''` に変換し、内部 state は空文字列。

### 8. `r.created_date.slice(0, 10)` null ガード

Design Review §4 Q3 で確認済。`r.created_date ? r.created_date.slice(0, 10) : ''` で null/undefined を空文字列にフォールバック。

### 9. メール添付化 deferred

Design Review §4 Q4 / handoff DO NOT 通り、A7 では扱わず。A6 月次メール本文末尾埋め込みのまま。roadmap 改訂時に独立フェーズで判断。

---

## 7. コミット方針

handoff §[DO] 8 / §[DO NOT]「`git commit` の実行（Review verdict 後の Owner 操作）」遵守、**本 Implementation Agent は commit を実行しない**。

§6 Q2 通り、A3 + A4 + A5 + A6 + A7 を 1 commit に集約する提案。

### 7.1 ステージング対象ファイル一覧

```bash
git add \
  src/App.jsx \
  src/pages/ReportEdit.jsx \
  src/pages/ReportDetail.jsx \
  src/pages/Approval.jsx \
  src/pages/Summary.jsx \
  src/components/forms/DayTripForm.jsx \
  src/components/forms/OvernightTripForm.jsx \
  src/components/forms/OverseasTripForm.jsx \
  src/components/forms/FieldworkForm.jsx \
  src/components/forms/ReceiptUploaderSection.jsx \
  src/hooks/useReceiptParser.js \
  src/lib/reportGenerator.js \
  src/lib/notifications.js \
  src/lib/aggregation.js \
  .claude-team/current-phase.txt \
  .claude-team/baseline-A6.md \
  .claude-team/baseline-A7.md \
  .claude-team/review-packages/review-package-A3.md \
  .claude-team/review-packages/review-package-A4.md \
  .claude-team/review-packages/review-package-A5.md \
  .claude-team/review-packages/review-package-A6.md \
  .claude-team/review-packages/review-package-A7.md
```

合計 22 ファイル（A3-A7 累積）。

### 7.2 コミットメッセージ案

```
feat(A3+A4+A5+A6+A7): MVP + monthly summary + audit CSV

A3 — Report edit route (P0 #1, MVP item #3)
- new src/pages/ReportEdit.jsx + route
- ReportDetail: 「編集する」 button
- 4 forms gain { mode, initialReport } props

A4 — Receipts AI for all forms + heading + amount guard
(P0 #2, known #2 #3, MVP items #1 #4)
- new src/hooks/useReceiptParser.js + ReceiptUploaderSection.jsx
- 4 forms consume hook + section
- reportGenerator: SETTLEMENT_HEADING_RE + STYLE_RULES

A5 — Lifecycle email notifications (P0 #3, MVP item #2)
- new src/lib/notifications.js: safeSend / getAdminEmails /
  notifySubmitted / notifyApproved / notifyRejected
- 4 forms + ReportDetail + Approval call helpers

A6 — Monthly summary auto-delivery (HANDOFF 未実装)
- new src/lib/aggregation.js: pure functions
  aggregateMonthlySummary / formatSummaryForEmail / buildReportsCSV
- notifications.js: notifyMonthlySummary added
- Summary.jsx: admin button + sendPreviousMonthSummary
- new .claude-team/baseline-A6.md

A7 — Audit CSV format + chunked async (roadmap A7)
- aggregation.js: escapeCsvCell / getHeaders / buildRow / rowToCsvLine
  helpers added; buildReportsCSV refactored to use them (RFC 4180
  escape added, A6 output identical on normal data)
- new buildReportsCSVAsync with chunkSize=200 + setTimeout(0) +
  onProgress callback
- ⚠️ formatName parameter rename to avoid shadowing date-fns format
  (per design-review-verdict-A7 §4 Q1 critical bug fix)
- Summary.jsx: new admin-only 「監査用 CSV 出力」 button with filter
  dialog (date/user/type), 33-column audit format, progress display
- new .claude-team/baseline-A7.md with CSV format spec

MVP 達成: goal.md 4 requirements all satisfied (A1-A5).
A6 + A7: post-MVP operational-quality work.

current-phase.txt: A2 -> A7 (set by Review Agents at each verdict;
included to match working tree)

Phase: A7 (Implementation Verdict Gate pending)
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### 7.3 注意事項

| 項目 | 遵守 |
|---|---|
| `git push` 禁止 | ✅ Owner 操作時も push しない |
| `--no-verify` 禁止 | ✅ |
| `--amend` 禁止 | ✅ |
| `lint:fix` 禁止 | ✅ |
| 1 commit のみ（集約方針）| ✅ A3-A7 を 1 件に集約 |

### 7.4 commit 後の検証コマンド（プレースホルダ自己マッチ回避: 分割表記）

```bash
git log --oneline | head -5
git status --short
git rev-list --count origin/main..HEAD
npm run lint
npm run build
# プレースホルダ充填チェック（変数化で文字列分割、自己マッチ回避）
TOKEN="AUTO-""FILL:"; grep -c "$TOKEN" .claude-team/review-packages/review-package-A7.md  # 期待値: 0
# A7 純粋性確認
grep -nE "window|document|localStorage|Blob|URL\." src/lib/aggregation.js  # 期待: ヒット 0
# A7 シャドー回避確認（buildRow の引数名）
grep -n "function buildRow" src/lib/aggregation.js  # 期待: function buildRow(r, formatName)
# A7 audit 列数確認
grep -cE "^      '[^']+'," src/lib/aggregation.js  # 概算カウント
```
