# Review Package — Phase A9 ｜ テスト基盤 + lint 掃除 + 運用前安定化

From: Implementation Agent
To: Review Agent（実装後ゲート）
Date: 2026-06-20
Phase: A9 — テスト基盤導入 + lint warning 解消 + 運用前安定化（A0〜A8 完走後の拡張フェーズ＝守り）
Handoff 正本: `.claude-team/handoff/design-handoff-A9.md`
直近 verdict（前フェーズ）: `.claude-team/verdicts/verdict-A8.md`（APPROVED / PHASE COMPLETE / **PROJECT COMPLETE**）
着手時フェーズ: `.claude-team/current-phase.txt` = `DONE`

---

## 0. 実装前ゲート確認

| 項目 | 結果 |
|---|---|
| REPOSITORY ISOLATION RULE | ✅ handoff・実コード差分・本 review-package すべて Athos TravelMate のみ。禁止語彙（order-system / 代理店 / Priority9 等）混入なし |
| IMPLEMENTATION SAFETY RULE | ✅ 対象 entity/関数（`aggregation.js` 4 export / `policyImpactAnalyzer.js` 2 export）の実在を Read で確認後にテスト作成。lint 3 シンボルの未使用を grep 確認後に修正 |
| Design Handoff 9 ブロック | ✅ design-handoff-A9.md に CURRENT/OBJECTIVE/SCOPE/DO/DO NOT/FILES/DONE CRITERIA/REVIEW POINTS/NEXT PHASE 揃い |
| 既存実装の凍結方針 | ✅ `aggregation.js` / `policyImpactAnalyzer.js` 本体無変更（公開 API 経由テスト） |
| 新機能ゼロ | ✅ プロダクト挙動を変える変更なし（テスト追加 + lint 3 件挙動不変修正のみ） |

---

## 1. 現状把握（A9 開始時の確認）

handoff §[DO] 1 の通り確認:

| 観点 | 確認 | 結果 |
|---|---|---|
| 作業ツリー | `git status` | clean（`.claude-team/orchestrator/` 未追跡のみ、A9 では触らない） |
| `aggregation.js` の export | `grep -nE "^export (function\|async function)"` | `aggregateMonthlySummary` / `formatSummaryForEmail` / `buildReportsCSV` / `buildReportsCSVAsync` の 4 つ。内部ヘルパー（`escapeCsvCell` / `getHeaders` / `buildRow` / `rowToCsvLine`）は **非 export** |
| `policyImpactAnalyzer.js` の export | `grep -nE "^export function"` | `recomputeReportPolicyValues` / `computeImpact` の 2 つ |
| 現状の lint warning | `npx eslint .` | `0 errors / 3 warnings`（Login.jsx `err` / ReportDetail.jsx `isAdmin` / ReportNew.jsx `navigate`） |
| 既存テストの不在 | `find src -name "*.test.*"` | ヒット 0（新規導入） |
| vitest 未導入 | `grep -n "vitest" package.json` | ヒット 0（着手時点） |

### 1.1 公開 API シグネチャ（凍結対象、Read で確認）

**`aggregation.js`**
- `aggregateMonthlySummary(reports, { year, month })` → `{ year, month, totalAmount, reportCount, byType, byUser, reports }`（month は 1-12、`created_date` 基準フィルタ、`byType` は `report_type||'不明'` キー、`byUser` は `created_by_name||'不明'` キー、金額は `total_amount||0`）
- `formatSummaryForEmail(aggregate)` → plain text（金額は `toLocaleString()`、空の `byType`/`byUser` は `'  （該当なし）'`）
- `buildReportsCSV(reports)` → simple 8 列 CSV
- `buildReportsCSVAsync(reports, { format='simple', chunkSize=200, onProgress })` → `Promise<CSV>`（chunk ごとに `onProgress({done,total})`、最終 chunk 後は待機なし）

**`policyImpactAnalyzer.js`**
- `recomputeReportPolicyValues(report, currentPolicy)` → `{ daily_allowance, accommodation_fee, car_allowance, total_amount }`（4 種別分岐、実費 10 項目は規程非依存、null ガードで全 0）
- `computeImpact(reports, sourcePolicy, targetPolicy)` → `{ totalReports, affectedCount, totalDiff, items }`（`items` は `diff!==0` のみ、null ガードで全 0）

---

## 2. 設計判断

### 2.1 公開 API 経由検証（内部ヘルパーを export 化しない）

CSV のエスケープ（`escapeCsvCell`）・列定義（`getHeaders`）・行整形（`buildRow` / `rowToCsvLine`）は **非 export の内部ヘルパー**。handoff §[REVIEW POINTS] 3 / §[DO NOT]「内部ヘルパーの export 化を含む変更禁止」を遵守し、これらを **公開 API 経由で間接検証**する:

| 内部挙動 | 経由 API | テスト |
|---|---|---|
| RFC 4180 カンマ引用符化 | `buildReportsCSV` | `destination_name:'東京, 日本'` → `"東京, 日本"` を含む、列数 8 維持 |
| RFC 4180 引用符・改行 | `buildReportsCSVAsync({format:'audit'})` | `business_content:'a"b\nc'` → `"a""b\nc"` |
| simple 8 列固定 | `buildReportsCSV` | 1 行目 = `レポートID,種別,作成者,年月,日付,目的地,ステータス,合計金額` |
| audit 33 列固定 | `buildReportsCSVAsync({format:'audit'})` | 1 行目 = 監査 33 列、列数 33 |
| chunk 分割・進捗 | `buildReportsCSVAsync({chunkSize:2})` | `vi.fn()` で `onProgress` 3 回・引数検証 |

→ `aggregation.js` / `policyImpactAnalyzer.js` に export 追加なし（§5.4 で `git diff` ゼロを証明）。

### 2.2 ロケール・タイムゾーン非依存の assert 設計

- **金額**: 実装が `toLocaleString()` を使うため、期待値も実行時に `` `¥${(42000).toLocaleString()}` `` で生成して突き合わせる。`"42,000"` のハードコードを避け ICU/ロケール差の flakiness を排除。
- **日付**: `aggregateMonthlySummary` の月フィルタ（`getYear`/`getMonth`）テストは `created_date` を正午ローカル（`'2026-03-15T12:00:00'`）にし、タイムゾーン境界での月跨ぎを防止。

### 2.3 Vitest 独立設定（Base44 プラグイン非依存）

`vitest.config.js` は `vite.config.js`（Base44 vite-plugin 含む）と分離した独立設定とし、`environment: 'node'`・`globals: false`・`plugins` なし。テスト対象は純粋関数のみで DOM 不要のため、本番ビルド構成への副作用を回避（handoff §[REVIEW POINTS] 8）。

`globals: false` のため各テストは `import { describe, it, expect, vi } from 'vitest'` を明示 → `eslint.config.js` への global 追加が不要（設定ファイル無改変）。さらに `eslint.config.js` の `ignores: ["src/lib/**/*"]` によりテストファイル自身は lint 対象外で、新たな warning を生まない（§5.2 で 0 warnings を証明）。

### 2.4 lint 3 件は挙動不変の最小修正のみ

handoff §[DO] 6 指定通り、3 箇所のみ手動修正（`eslint --fix` 一括は不使用）。削除前に各シンボルの参照を grep し、当該宣言 1 箇所のみ（未使用）を確認後に削除。詳細は §3.2。

### 2.5 handoff 雛形からの逸脱

`package.json` scripts は handoff 内に `test`/`test:run`（§SCOPE L67）と `test`/`test:watch`（§3.1 L120-121・§FILES L276・§DONE CRITERIA L311）の 2 表記が混在。**支配的かつ DONE CRITERIA が参照する `test` + `test:watch`** を採用した（`test:watch` は `vitest`（watch）の慣用名で、Owner の開発時ウォッチ実行に対応）。これ以外の逸脱なし。

---

## 3. ファイル別改修詳細

### 3.1 新規ファイル

| ファイル | 行数 | 内容 |
|---|---|---|
| `vitest.config.js`（root） | 12 | node 環境・`include: ['src/**/*.test.{js,jsx}']`・`globals: false`・プラグインなし |
| `src/lib/__tests__/aggregation.test.js` | 170 | 13 テスト（下記 §3.3） |
| `src/lib/__tests__/policyImpactAnalyzer.test.js` | 129 | 11 テスト（下記 §3.4） |
| `.claude-team/baseline-A9.md` | — | テスト方針 + カバレッジ範囲 + 未カバー領域 + 実行手順 + lint 挙動不変根拠 |
| `.claude-team/review-packages/review-package-A9.md` | — | 本ファイル |

### 3.2 改修ファイル（最小・挙動不変）

#### `package.json`（追加のみ）
```diff
     "preview": "vite preview"
+    "preview": "vite preview",
+    "test": "vitest run",
+    "test:watch": "vitest"
   ...
-    "vite": "^6.1.0"
+    "vite": "^6.1.0",
+    "vitest": "^3.2.6"
```
既存 dependencies / 既存 scripts / 既存バージョンは不変。ランタイム依存追加なし。`package-lock.json` は `npm install` による vitest とその依存の追加のみ（+465 行）。

#### `src/pages/Login.jsx`（catch バインディング 1 行）
```diff
-    } catch (err) {
+    } catch {
       setError('メールアドレスまたはパスワードが正しくありません');
```
catch 本体は固定文言を `setError` するのみで `err` 不参照。state の `error`（L14/81/82）とは別物。表示・分岐・副作用に変化なし。

#### `src/pages/ReportDetail.jsx`（未使用変数 1 行削除）
```diff
   const isOwner = report?.created_by_id === user?.id;
-  const isAdmin = user?.role === 'admin';
   const canEdit = isOwner && (report?.status === '下書き' || report?.status === '差戻し');
```
`grep -n "isAdmin"` で参照が当該宣言 1 箇所のみと確認後に削除。JSX/分岐に未使用のため挙動不変。

#### `src/pages/ReportNew.jsx`（未使用変数 + import 整理）
```diff
 import { useState } from 'react';
-import { useNavigate } from 'react-router-dom';
 import { Plane, BedDouble, Globe, MapPin, ChevronRight } from 'lucide-react';
 ...
   const [selectedType, setSelectedType] = useState(null);
-  const navigate = useNavigate();
```
`grep -n "navigate"` で参照が当該宣言 1 箇所のみと確認。import を残すと `no-unused-imports`（error）が再発するため import 行も同時除去。描画・遷移に `navigate` 不使用のため挙動不変。

### 3.3 `aggregation.test.js` のテストケース（13）

| describe | it | 検証 |
|---|---|---|
| `aggregateMonthlySummary` | 月フィルタ | 2026-03 の 2 件のみ集計、2026-02 除外、`reportCount=2` / `totalAmount=15000` |
| | byType/byUser 積算 | `日帰り出張:{count:2,amount:30000}` / `田中:{count:2,amount:15000}` 等 |
| | 欠損フォールバック | `report_type`/`created_by_name` 欠落 → `不明`、`total_amount` 欠落 → 0 |
| | 空/null 入力 | `reportCount:0` / `byType:{}` / `byUser:{}` / `reports:[]` |
| `formatSummaryForEmail` | 通常 | `2026年3月`・`¥${(42000).toLocaleString()}`・`承認済レポート件数: 3 件`・種別別・ユーザー別行を含む |
| | 該当なし | 集計 0 件で `（該当なし）`・`¥0`・`0 件` |
| `buildReportsCSV` | 8 列ヘッダ固定 | 1 行目が `SIMPLE_HEADER` と厳密一致 |
| | 空配列 | ヘッダ行のみ（1 行） |
| | RFC 4180 カンマ | `"東京, 日本"` を含む、ヘッダ列数 8 維持 |
| `buildReportsCSVAsync` | simple≡sync | `buildReportsCSV` と文字列完全一致 |
| | audit 33 列固定 | 1 行目が `AUDIT_HEADER` と一致、列数 33 |
| | onProgress | `chunkSize:2` × 5 件 → 3 回（`{2,5}`/`{4,5}`/`{5,5}`） |
| | RFC 4180 引用符・改行 | `business_content:'a"b\nc'` → `"a""b\nc"` |

### 3.4 `policyImpactAnalyzer.test.js` のテストケース（11）

固定 policy: `{ daily_allowance_daytrip:5000, daily_allowance_overnight:5000, daily_allowance_overseas:10000, accommodation_domestic:15000, accommodation_overseas:20000, car_allowance_per_km:30 }`

| describe | it | 検証 |
|---|---|---|
| `recomputeReportPolicyValues` | 日帰り出張 | `daily=5000, accom=0, car=300, total=5300` |
| | 宿泊出張 | `daily=15000(×3日), accom=30000(×2泊), car=300, total=45300` |
| | 海外出張 | `daily=30000, accom=40000, car=0(車手当なし), total=70000` |
| | 外出作業 | `daily=0, accom=0, car=300, total=300` |
| | 実費の規程非依存性 | 日帰り+実費 2500 → `total=7500`、`car=0` |
| | 未知種別 | 規程値 0、実費のみ `total=1000` |
| | null ガード | `report=null` / `currentPolicy=null` で全 0 |
| `computeImpact` | diff!==0 フィルタ | 5000→6000 の 1 件のみ items、差分 0 の外出作業を除外、`affectedCount=1` / `totalDiff=1000` / `items[0].report` 同一参照 |
| | 同一 policy | `affectedCount=0` / `totalDiff=0` / `items=[]` |
| | 空 reports | `{totalReports:0,affectedCount:0,totalDiff:0,items:[]}` |
| | null ガード | `sourcePolicy=null` / `targetPolicy=null` で全 0 |

---

## 4. Regression 検証

### 4.1 既存実装の凍結（最重要）

```
$ git diff --stat HEAD -- src/lib/aggregation.js src/lib/policyImpactAnalyzer.js
（出力なし）
```
→ **両ファイル差分ゼロ**。export 追加なし。handoff DONE CRITERIA「`aggregation.js` / `policyImpactAnalyzer.js` に差分なし」遵守。

### 4.2 A0〜A8 成果物の不変性

| フェーズ | 成果物 | A9 での touch | 結果 |
|---|---|---|---|
| A1 | FieldworkForm receipts SOT | なし | ✅ |
| A2 | 4 form 1日1件チェック | なし | ✅ |
| A3 | ReportEdit.jsx / App.jsx Routes / ReportDetail 編集ボタン | ReportDetail は未使用 `isAdmin` 削除のみ（編集ボタン/canEdit 不変） | ✅ |
| A4 | useReceiptParser / ReceiptUploaderSection / reportGenerator | なし | ✅ |
| A5 | notifications.js 4 ヘルパー / 通知呼出 | なし | ✅ |
| A6 | aggregation.js 集計 / 月次配信 / Summary 手動ボタン | **本体不変**（テストで観測のみ） | ✅ |
| A7 | aggregation.js CSV 拡張（escape/audit/async） | **本体不変**（テストで観測のみ） | ✅ |
| A8 | policyImpactAnalyzer.js / PolicyManagement Dialog | **本体不変**（テストで観測のみ） | ✅ |

lint 3 ファイル（Login/ReportDetail/ReportNew）以外の `src/**` に touch なし（handoff §[REVIEW POINTS] 11）。

### 4.3 触れていない設定ファイル

`vite.config.js` / `eslint.config.js` / `tailwind.config.js` / `postcss.config.js` / `jsconfig.json` / `src/api/base44Client.js` / `src/components/ui/*` / `src/components/forms/*` — すべて無改変。

---

## 5. ビルド / lint / test 検証

### 5.1 `npm test`（= `vitest run`）

```
 ✓ src/lib/__tests__/policyImpactAnalyzer.test.js (11 tests)
 ✓ src/lib/__tests__/aggregation.test.js (13 tests)

 Test Files  2 passed (2)
      Tests  24 passed (24)
```
→ **全 24 テスト green、失敗 0**。handoff DONE CRITERIA「`npm test` 全 green」遵守。

### 5.2 `npm run lint` / `npx eslint .`

```
$ npm run lint        # eslint . --quiet
（出力なし、exit=0）

$ npx eslint .        # warnings 込み
（出力なし、exit=0）
```
→ **0 errors / 0 warnings**（3 → 0）。handoff DONE CRITERIA「`npm run lint` 0 errors / 0 warnings」遵守。テストファイル自身も新規 warning なし（`src/lib/**` は `eslint.config.js` で ignore）。

### 5.3 `npm run build`（= `vite build`）

```
$ npm run build
> base44-app@0.0.0 build
> vite build
[base44] Proxy enabled: /api -> https://athos-trip-flow.base44.app
exit=0

$ ls -la dist/
-rw-r--r--  index.html              1523 bytes  (Jun 20 23:11)
dist/assets/index-8K7vV6na.js    1152264 bytes
dist/assets/index-DCFfaNTD.css     74345 bytes
```
→ **build 成功**、`dist/` 生成確認。

### 5.4 既存実装凍結の再確認（grep）

```
$ git diff HEAD -- src/lib/aggregation.js src/lib/policyImpactAnalyzer.js
（出力なし）
```
→ 公開 API 経由検証の原則が守られ、本体は 1 文字も変わっていない。

### 5.5 `git diff --stat HEAD`（A9 由来の全変更）

```
 package-lock.json          | 465 +++++++++  (vitest + 依存の追加のみ)
 package.json               |   7 +-          (test/test:watch scripts + vitest devDep)
 src/pages/Login.jsx        |   2 +-          (catch バインディング)
 src/pages/ReportDetail.jsx |   1 -           (未使用 isAdmin 削除)
 src/pages/ReportNew.jsx    |   2 -           (未使用 navigate + import 削除)
 5 files changed, 470 insertions(+), 7 deletions(-)
```

未追跡（新規）:
```
?? vitest.config.js
?? src/lib/__tests__/                                  (aggregation.test.js / policyImpactAnalyzer.test.js)
?? .claude-team/handoff/design-handoff-A9.md
?? .claude-team/baseline-A9.md                         (§7 staging に含む)
?? .claude-team/review-packages/review-package-A9.md   (本ファイル)
?? .claude-team/orchestrator/                          (A9 対象外、staging しない)
```

### 5.6 ブランチ隔離確認

```
$ git branch --show-current
feature/a9-quality-stabilization
```
→ 全変更が feature ブランチ上。`main` に A9 由来 commit なし（commit 自体を未実行）。

---

## 6. Review Agent への申し送り

### 1. 既存実装の完全凍結（§4.1 / §5.4）
`aggregation.js` / `policyImpactAnalyzer.js` は `git diff` 差分ゼロ。CSV エスケープ・列定義は非 export のまま、`buildReportsCSV` / `buildReportsCSVAsync` 経由で間接検証。export 化・直接 import なし。

### 2. テストの回帰検知力（§3.3 / §3.4）
smoke ではなく、4 種別計算分岐 / 列固定（8・33）/ RFC 4180（カンマ・引用符・改行）/ 月フィルタ / null ガード / 実費の規程非依存性 / `diff!==0` フィルタを assert。A6〜A8 要件の破壊を検知できる。

### 3. lint 3 件の挙動不変性（§3.2）
未使用シンボル除去（`isAdmin` / `navigate` + import）と catch バインディング変更（`err` 除去）のみ。削除前に grep で参照ゼロ確認。表示・分岐・副作用に影響なし。`eslint --fix` 一括不使用。

### 4. 新機能ゼロ・依存最小（§2 / §5.5）
プロダクト挙動を変える変更なし。`package.json` 追加は `vitest` + 2 scripts のみ。ランタイム依存・既存バージョン変更なし。`vite.config.js` / `eslint.config.js` 無改変。

### 5. 設定の非侵襲性（§2.3）
`vitest.config.js` は Base44 vite-plugin を巻き込まない独立設定。`globals: false` + 明示 import + `src/lib/**` ignore で、テストが本番ビルド構成にも lint にも副作用を与えない。

### 6. 未カバー領域の明示（baseline-A9.md）
React コンポーネント / Base44 SDK 呼出 / `reportGenerator.js` の LLM 依存 / `notifications.js` / CSV ブラウザ層 / Base44 Automation は本フェーズ非カバーと baseline に誠実に記録。「テスト green = 全機能保証」ではない。

### 7. 実機検証は Owner 分担
本 §4 は静的 + 自動テスト + grep ベース。Base44 sandbox での UI 実機検証（`npm run dev`）は Owner 実施（verdict-A8 §9 の運用受け入れと併せて A10 候補）。

### 8. プレースホルダ・commit・push 状態
本 review-package にプレースホルダ（AUTO-FILL トークン）残存なし（§DONE CRITERIA 検証コマンドは §7.4）。commit / push いずれも **未実行**。

### 9. handoff scripts 表記ゆれへの対応（§2.5）
`test:run` vs `test:watch` の表記ゆれは、DONE CRITERIA / FILES / §3.1 が参照する `test` + `test:watch` を採用。

---

## 7. コミット方針

handoff §[DO] 9 / §[DO NOT]「`git commit` は Review verdict 後の Owner 操作」遵守。**本 Implementation Agent は commit / push を実行しない**。

### 7.1 ステージング対象ファイル一覧

```bash
git add \
  package.json \
  package-lock.json \
  vitest.config.js \
  src/lib/__tests__/aggregation.test.js \
  src/lib/__tests__/policyImpactAnalyzer.test.js \
  src/pages/Login.jsx \
  src/pages/ReportDetail.jsx \
  src/pages/ReportNew.jsx \
  .claude-team/handoff/design-handoff-A9.md \
  .claude-team/baseline-A9.md \
  .claude-team/review-packages/review-package-A9.md
```

合計 11 ファイル。`.claude-team/orchestrator/` は A9 対象外のため **staging しない**。`current-phase.txt` は着手時 `DONE` のまま（Review verdict で Owner が `A9` 固定 or `DONE` 復帰を判断）。

### 7.2 コミットメッセージ案

```
test(A9): add regression tests for aggregation & policy impact; clean lint warnings

A9 = quality stabilization (no new features). Protect A6-A8 pure
logic with Vitest and clear all lint warnings before operation.

Tests (public API only, frozen impl):
- vitest.config.js (node env, no Base44 plugin, globals:false)
- src/lib/__tests__/aggregation.test.js (13): monthly aggregate
  filter / byType / byUser / formatSummaryForEmail / CSV 8-col &
  33-col header fixity / simple===async / onProgress / RFC 4180
- src/lib/__tests__/policyImpactAnalyzer.test.js (11): 4 trip-type
  branches (overseas car=0, fieldwork daily/accom=0) / actuals
  policy-independence / null guards / computeImpact diff filtering

Lint warnings 3 -> 0 (behavior-preserving):
- Login.jsx: catch (err) -> catch (unused binding)
- ReportDetail.jsx: remove unused isAdmin
- ReportNew.jsx: remove unused navigate + useNavigate import

package.json: add vitest devDep + test/test:watch scripts only.
aggregation.js / policyImpactAnalyzer.js: zero diff (frozen).

Verified: npm test 24 passed / npm run lint 0e0w / npm run build ok.

Phase: A9 (Implementation Verdict Gate pending)
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

### 7.3 注意事項

| 項目 | 遵守 |
|---|---|
| `main` 直 commit 禁止 | ✅ feature ブランチのみ |
| `git push` 禁止 | ✅ Owner 判断 |
| `--amend` / `--no-verify` 禁止 | ✅ |
| `lint:fix` 一括禁止 | ✅ 3 箇所手動修正 |
| `aggregation.js` / `policyImpactAnalyzer.js` 無変更 | ✅ diff ゼロ |
| 1 commit に集約 | ✅ A9 単一 commit を提案 |

### 7.4 commit 後の検証コマンド（Owner / Review Agent 用）

```bash
git branch --show-current                       # 期待: feature/a9-quality-stabilization
git log origin/main..HEAD --oneline             # 期待: A9 commit のみ（main 不変）
npm test                                        # 期待: 24 passed
npm run lint                                    # 期待: exit 0（0 errors）
npx eslint .                                    # 期待: 0 errors / 0 warnings
npm run build                                   # 期待: exit 0、dist 生成
git diff HEAD~1 -- src/lib/aggregation.js src/lib/policyImpactAnalyzer.js  # 期待: 出力なし（凍結）
# プレースホルダ充填チェック（変数化で自己マッチ回避）
TOKEN="AUTO-""FILL:"; grep -c "$TOKEN" .claude-team/review-packages/review-package-A9.md  # 期待: 0
```

---

## 判定欄（Review Agent 記入）

handoff §[REVIEW POINTS] 判定形式:
- 合格時: `.claude-team/verdicts/verdict-A9.md` に `APPROVED` / `PHASE COMPLETE` / `NEXT PHASE: （Owner 判断）` + `current-phase.txt` 終端値（`A9` 固定 or `DONE` 復帰）を Owner 判断で設定
- 不合格時: `REJECTED` + 修正要求
- 違反時: `REJECTED / FOREIGN CONTEXT DETECTED`
