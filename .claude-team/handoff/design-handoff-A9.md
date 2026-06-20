# Design Handoff — Phase A9 ｜ テスト基盤 + lint 掃除 + 運用前安定化

From: Design Agent
To: Implementation Agent（※ Design Review Gate 通過後のみ起動可）
Date: 2026-06-20
Goal 正本: `.claude-team/goal.md`
Roadmap 正本: `.claude-team/roadmap.md`（A0〜A8。A9 はロードマップ完走後の **拡張フェーズ**）
直近 verdict: `.claude-team/verdicts/verdict-A8.md`（APPROVED / PHASE COMPLETE / **PROJECT COMPLETE**）
現在フェーズ: `.claude-team/current-phase.txt` = `DONE`

本 handoff は verdict-A8 §9.6「PROJECT COMPLETE 後の運用フェーズ設計（バグ対応 / 機能追加要望は新規 roadmap または独立タスク）」を受け、Owner 指示「A9 = テスト基盤 + lint 掃除 + 運用前安定化、新機能を追加せず A1〜A8 の回帰防止を優先」を 9 ブロック仕様に整形したもの。

**A9 = 守りのフェーズ**。完成済み Athos TravelMate を壊さず、実運用前に品質を固定する。新機能ゼロ、回帰防止が最優先。

---

## 【CURRENT PHASE】

**A9 — テスト基盤導入 + lint warning 解消 + 運用前安定化**

A0〜A8 で業務フロー（社員 → レポート作成 → AI 補完 → 承認 → 集計 → CSV → 旅費規定監査）は完成済み。しかし:

- 自動テストが **0 件**（`__tests__/` 未作成）。A1〜A8 の純粋ロジックを守る回帰テストが存在しない。
- lint warning が **3 件** 残存（`Login.jsx` `err` / `ReportDetail.jsx` `isAdmin` / `ReportNew.jsx` `navigate`）。

本フェーズで:
1. **Vitest** を最小構成で導入（node 環境、Base44 プラグイン非依存の独立 `vitest.config.js`）
2. `src/lib/aggregation.js`（A6/A7）の純粋関数に回帰テストを追加（月次集計 + CSV 列固定 + RFC 4180）
3. `src/lib/policyImpactAnalyzer.js`（A8）の純粋関数に回帰テストを追加（4 種別再計算 + 影響集計）
4. lint warning 3 件を **挙動不変** の最小修正で解消
5. すべて `feature/a9-quality-stabilization` ブランチで作業。**main へ直接 commit しない**

**重要な制約**: 既存の `aggregation.js` / `policyImpactAnalyzer.js` は **一切変更しない**（export を増やさない）。テストは **公開 API 経由でのみ** 検証する。

---

## 【OBJECTIVE】

1. **ブランチ分離**: `feature/a9-quality-stabilization` を `origin/main` 起点で作成し、A9 の全変更をそこに閉じる。
2. **Vitest 導入**: `package.json` に `vitest` devDependency と `test` scripts を追加。新規 `vitest.config.js`（`environment: 'node'`、Base44 プラグインを含めない）を作成。
3. **`aggregation.js` テスト**（`src/lib/__tests__/aggregation.test.js` 新規）:
   - `aggregateMonthlySummary(reports, { year, month })` — 月フィルタ / `byType` / `byUser` / `totalAmount` / 空入力
   - `formatSummaryForEmail(aggregate)` — 通常 + 「該当なし」分岐
   - `buildReportsCSV(reports)` — simple 8 列ヘッダ固定 + RFC 4180 エスケープ（公開 API 経由）
   - `buildReportsCSVAsync(reports, options)` — audit 33 列ヘッダ固定 / simple との等価 / `onProgress` 呼出 / chunk 分割 / RFC 4180 エスケープ
4. **`policyImpactAnalyzer.js` テスト**（`src/lib/__tests__/policyImpactAnalyzer.test.js` 新規）:
   - `recomputeReportPolicyValues(report, currentPolicy)` — 4 種別（日帰り / 宿泊 / 海外 / 外出作業）分岐 / 実費の規程非依存性 / null ガード
   - `computeImpact(reports, sourcePolicy, targetPolicy)` — `diff !== 0` のみ `items` / `totalDiff` / `affectedCount` / null ガード / 空入力
5. **lint warning 3 件解消**（挙動不変・UI 変更なし）。
6. **検証**: `npm run lint`（0 errors / **0 warnings**）、`npm test`（全 green）、`npm run build`（成功）。
7. **`.claude-team/baseline-A9.md`** を新規作成（テスト方針 + カバレッジ範囲 + 実行手順 + 「公開 API 経由検証」原則を文書化）。

---

## 【SCOPE】

A9 の作業範囲は以下に **厳密に限定**:

| カテゴリ | 内容 |
|---|---|
| ブランチ | `feature/a9-quality-stabilization`（`origin/main` 起点） |
| 新規ファイル | `vitest.config.js`（root、node 環境、プラグインなし） |
| 新規ファイル | `src/lib/__tests__/aggregation.test.js` |
| 新規ファイル | `src/lib/__tests__/policyImpactAnalyzer.test.js` |
| 新規ファイル | `.claude-team/baseline-A9.md` |
| 新規ファイル | `.claude-team/review-packages/review-package-A9.md` |
| 改修（最小） | `package.json`（`vitest` devDependency + `test` / `test:run` scripts 追加のみ） |
| 改修（挙動不変） | `src/pages/Login.jsx`（catch バインディング 1 行） |
| 改修（挙動不変） | `src/pages/ReportDetail.jsx`（未使用変数 1 行削除） |
| 改修（挙動不変） | `src/pages/ReportNew.jsx`（未使用変数 1 行削除 + import 整理） |
| メタ更新（任意） | `.claude-team/current-phase.txt`（`DONE` → `A9`。実装着手時のみ） |

### 非対象（DO NOT で詳述）
- **新機能の追加**（テスト・品質固定のみ）
- `aggregation.js` / `policyImpactAnalyzer.js` 本体の変更（export 追加を含む）
- 4 form / pages / components の UI・挙動変更（lint 3 ファイルの挙動不変修正を除く）
- React コンポーネントのテスト（@testing-library 等の追加。今回は純粋関数のみ対象）
- カバレッジ閾値の CI ゲート化
- `vite.config.js` / `eslint.config.js` / `tailwind.config.js` への変更
- `main` ブランチへの直接 commit / push
- Base44 デプロイ・Automation 設定

---

## 【DO】

### 1. 現状把握（A9 開始時の確認）

| 観点 | 確認方法 | 期待 |
|---|---|---|
| 作業ツリー clean | `git status` | clean（`.claude-team/orchestrator/` の未追跡のみ許容、A9 では触らない） |
| リモート同期 | `git fetch origin && git status` | `origin/main` との差分を把握 |
| `aggregation.js` の export | `grep -nE "^export (function|async function)" src/lib/aggregation.js` | `aggregateMonthlySummary` / `formatSummaryForEmail` / `buildReportsCSV` / `buildReportsCSVAsync` の 4 つ。内部ヘルパー（`escapeCsvCell` / `getHeaders` / `buildRow` / `rowToCsvLine`）は **非 export** |
| `policyImpactAnalyzer.js` の export | `grep -nE "^export function" src/lib/policyImpactAnalyzer.js` | `recomputeReportPolicyValues` / `computeImpact` の 2 つ |
| 現状の lint warning | `npx eslint .` | `0 errors / 3 warnings`（下記 7 の 3 件） |
| 既存テストの不在 | `find src -name "*.test.*"` | ヒット 0（新規導入の確認） |
| vitest 未導入 | `grep -n "vitest" package.json` | ヒット 0 |

### 2. ブランチ作成（main 隔離）

```bash
git fetch origin
# origin/main と diverge していないこと（fast-forward 可能）を確認。diverge していたら STOP し Owner に報告。
git checkout main
git pull --ff-only origin main          # merge commit を作らない。ff 不可なら中断して報告
git checkout -b feature/a9-quality-stabilization
```

- 以降の **全 commit は feature ブランチのみ**。`main` には commit しない。
- Base44 2-way sync の競合を避けるため、A9 作業ファイル（テスト / 設定 / lint 3 ファイル）と同じ箇所を Base44 UI 側で同時編集しない前提（Owner 確認事項）。

### 3. Vitest 導入（最小・非侵襲）

#### 3.1 `package.json`（追加のみ）

- `devDependencies` に `"vitest": "^3.x"`（最新安定。`@vitejs/plugin-react` v4 / vite v6 と互換のメジャーを採用）を追加。
- `scripts` に追加:
  ```json
  "test": "vitest run",
  "test:watch": "vitest"
  ```
- **既存 dependencies / 既存スクリプト / 既存パッケージのバージョンは変更しない。** ランタイム依存は一切追加しない。
- `npm install` で `package-lock.json` が更新されるのは許容（vitest とその依存のみ）。

#### 3.2 `vitest.config.js`（新規・root）

Base44 vite-plugin を **含めない** 独立設定にする（テスト対象は純粋関数のみで DOM 不要、プラグイン副作用を回避）:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
    globals: false,
  },
});
```

- `globals: false` とし、テストでは `import { describe, it, expect } from 'vitest'` を明示する（`eslint.config.js` に global 追加が不要 → 設定ファイル無改変）。
- テストは相対 import（`../aggregation.js`）で書き、`@/` エイリアス設定を不要にする。

### 4. `src/lib/__tests__/aggregation.test.js`（新規）

`import { describe, it, expect, vi } from 'vitest';` + `import { aggregateMonthlySummary, formatSummaryForEmail, buildReportsCSV, buildReportsCSVAsync } from '../aggregation.js';`

最低限カバーするケース:

**`aggregateMonthlySummary`**
- 2 か月にまたがる reports を渡し、対象月（`{ year, month }`、month は 1-12）のみ集計される（`created_date` 基準フィルタ）
- `byType` が種別ごとの `{ count, amount }` を正しく積算
- `byUser` が `created_by_name` ごとの `{ count, amount }` を正しく積算
- `totalAmount` = 対象月レポートの `total_amount` 合計、`reportCount` = 件数
- 空配列 / `null` 入力で `{ totalAmount: 0, reportCount: 0, byType: {}, byUser: {}, reports: [] }`
- `total_amount` 欠損レポートは 0 として扱う（`(r.total_amount || 0)`）

**`formatSummaryForEmail`**
- 通常入力で年月・合計・件数・種別別・ユーザー別の各行が本文に含まれる
- `byType` / `byUser` が空のとき「（該当なし）」が出力される

**`buildReportsCSV`（simple 8 列・列固定）**
- 1 行目ヘッダが厳密に `レポートID,種別,作成者,年月,日付,目的地,ステータス,合計金額`
- 行数 = ヘッダ 1 + レポート件数
- **RFC 4180**: `created_by_name` や `destination_name` にカンマを含むセルが `"..."` で引用符化される（例: 目的地 `"東京, 日本"`）

**`buildReportsCSVAsync`（audit 33 列・大量データ）**
- `{ format: 'audit' }` のヘッダが監査用 33 列（`getHeaders('audit')` の順）と厳密一致
- `{ format: 'simple' }` の出力が `buildReportsCSV` と等価（同一データで文字列一致）
- `onProgress` が `{ done, total }` 形で呼ばれる（`vi.fn()` で検証、`chunkSize` をデータ件数より小さく設定）
- audit 列の `business_content` に改行・ダブルクォートを含むセルが RFC 4180 で引用符化（`"a""b"` / 改行セルの引用符化）
- 空配列でヘッダ行のみ返る

### 5. `src/lib/__tests__/policyImpactAnalyzer.test.js`（新規）

`import { describe, it, expect } from 'vitest';` + `import { recomputeReportPolicyValues, computeImpact } from '../policyImpactAnalyzer.js';`

テスト用の固定 policy（例）:
```js
const policy = {
  daily_allowance_daytrip: 5000, daily_allowance_overnight: 5000, daily_allowance_overseas: 10000,
  accommodation_domestic: 15000, accommodation_overseas: 20000, car_allowance_per_km: 30,
};
```

最低限カバーするケース:

**`recomputeReportPolicyValues`**
- `日帰り出張`: `daily_allowance = daily_allowance_daytrip`、`car_allowance = driving_distance_km * car_allowance_per_km`、宿泊費 0
- `宿泊出張`: 日当 = `daily_allowance_overnight * num_days`、宿泊費 = `accommodation_domestic * num_nights`、車手当あり
- `海外出張`: 日当 = `daily_allowance_overseas * num_days`、宿泊費 = `accommodation_overseas * num_nights`、**車手当 0**（規程に距離があっても 0）
- `外出作業`: **日当 0 / 宿泊費 0**、車手当のみ
- **実費の規程非依存性**: `highway_fee` 等 10 項目が policy を変えても `total_amount` に同額で加算される（実費は再計算されない）
- `report` / `currentPolicy` が `null`/`undefined` で全項目 0 のフォールバック

**`computeImpact`**
- 規程差で `total_amount` が変わるレポートのみ `items` に入る（`diff === 0` は除外）
- `totalDiff` = `items` の `diff` 合計、`affectedCount` = `items.length`、`totalReports` = 入力件数
- `sourcePolicy` / `targetPolicy` が `null` で `{ totalReports: 0, affectedCount: 0, totalDiff: 0, items: [] }`
- 空 reports で `affectedCount: 0`
- 同一 policy 同士の比較で `affectedCount: 0`（差分なし）

### 6. lint warning 3 件の解消（挙動不変・UI 変更なし）

| ファイル:行 | 現状 | 修正 | 根拠 |
|---|---|---|---|
| `src/pages/Login.jsx:23` | `} catch (err) {`（`err` 未使用） | `} catch {`（任意 catch バインディング, ES2019+） | catch 本体は固定文言を `setError` するのみで `err` を参照しない |
| `src/pages/ReportDetail.jsx:66` | `const isAdmin = user?.role === 'admin';`（未使用） | 当該 1 行を削除 | eslint が未使用と判定。他箇所参照なしを grep 確認後に削除 |
| `src/pages/ReportNew.jsx:46` | `const navigate = useNavigate();`（未使用） | 当該 1 行を削除し、`useNavigate` が他で未使用なら import からも除去 | eslint が未使用と判定。import を残すと `unused-imports` が再発するため要整理 |

- いずれも **表示・挙動を変えない**。JSX / スタイル / ロジックに変更を加えない。
- 削除前に各シンボルの全ファイル内参照を `grep` し、本当に未使用であることを確認してから削除する。
- `eslint --fix` の一括適用は行わない（意図しない自動変更を避け、上記 3 箇所のみ手動修正）。

### 7. `.claude-team/baseline-A9.md`（新規作成）

以下を文書化:
- A9 の目的（回帰防止 / 運用前安定化、新機能ゼロ）
- テスト方針: **公開 API 経由検証**（内部ヘルパーを export 化しない理由 = 既存実装を凍結したまま守る）
- カバレッジ範囲: `aggregation.js`（A6/A7）/ `policyImpactAnalyzer.js`（A8）の純粋関数。**未カバー領域**（React コンポーネント / Base44 SDK 呼出 / `reportGenerator.js` の LLM 依存部分）を明示
- 実行手順: `npm test` / `npm run test:watch` / `npm run lint` / `npm run build`
- ブランチ運用: `feature/a9-quality-stabilization`、main 直 commit 禁止
- lint 3 件修正の挙動不変性の根拠

### 8. 検証

- `npm test`（= `vitest run`）: 全テスト green、失敗 0
- `npm run lint`: **0 errors / 0 warnings**（3 → 0）
- `npm run build`: 成功
- `git status`: feature ブランチ上。`main` に commit が乗っていないこと（`git log main..feature/a9-quality-stabilization --oneline` で差分確認）

### 9. Commit / Push 方針

- 実 commit は **Review verdict 後の Owner 操作**。Implementation Agent は Review Package §7 に staging 一覧 + コミットメッセージ案（例: `test(A9): add regression tests for aggregation & policy impact; clean lint warnings`）+ 注意事項を記載するに留める。
- **push は行わない**（Owner が feature ブランチを push、PR 作成を判断）。
- `main` への commit / merge は A9 では一切行わない。

---

## 【DO NOT】

- **新機能の追加**（A9 は品質固定のみ。プロダクト挙動を変える変更は禁止）
- `src/lib/aggregation.js` の変更（**内部ヘルパーの export 化を含む**。テストは公開 API 経由のみ）
- `src/lib/policyImpactAnalyzer.js` の変更
- `src/lib/reportGenerator.js` / `notifications.js` / `policyContext.jsx` / `AuthContext.jsx` の変更
- 4 form / `ReportEdit` / `Approval` / `Summary` / `PolicyManagement` / `Dashboard` / `ReportList` の挙動・UI 変更
- lint 3 ファイル（`Login.jsx` / `ReportDetail.jsx` / `ReportNew.jsx`）での **挙動を変える** 修正（指定の最小修正のみ）
- `src/api/base44Client.js` の変更（Base44 SDK 初期化）
- `src/components/ui/*` の変更
- `vite.config.js` / `eslint.config.js` / `tailwind.config.js` / `postcss.config.js` / `jsconfig.json` の変更
- `package.json` の `vitest` devDependency + `test` scripts **以外** の変更（既存依存のバージョン変更・ランタイム依存追加の禁止）
- `eslint --fix` / `lint:fix` の一括実行
- React コンポーネントテスト用の追加依存（`@testing-library/*`, `jsdom` 等）の導入
- カバレッジ閾値による CI 失敗ゲートの追加
- `main` への直接 commit / merge / push
- `git push`（Owner 判断）
- `git commit`（Review verdict 後の Owner 操作）
- `git commit --amend` / `--no-verify` 等の hook スキップ
- `.claude-team/goal.md` / `roadmap.md` / `auto-handoff.md` / `README.md` / `templates/*` / 過去 verdict / 過去 handoff / baseline-A0〜A8 の変更
- `.claude-team/orchestrator/` への変更（A9 対象外）
- Base44 デプロイ / Automation 設定（Owner 分担）
- 他プロジェクト参照（REPOSITORY ISOLATION RULE。違反時 `FOREIGN CONTEXT DETECTED` で停止）

---

## 【FILES / AREAS】

### 新規作成
- `vitest.config.js`（root）
- `src/lib/__tests__/aggregation.test.js`
- `src/lib/__tests__/policyImpactAnalyzer.test.js`
- `.claude-team/baseline-A9.md`
- `.claude-team/review-packages/review-package-A9.md`

### 改修（限定）
- `package.json`（`vitest` devDependency + `test` / `test:watch` scripts のみ）
- `src/pages/Login.jsx`（L23 catch バインディングのみ）
- `src/pages/ReportDetail.jsx`（L66 未使用変数削除のみ）
- `src/pages/ReportNew.jsx`（L46 未使用変数削除 + `useNavigate` import 整理）

### 自動更新（許容）
- `package-lock.json`（`npm install vitest` による更新のみ）

### メタ更新（任意）
- `.claude-team/current-phase.txt`（`DONE` → `A9`。実装着手時のみ）

### 参照のみ（変更しない）
- `src/lib/aggregation.js`（公開 API シグネチャの確認）
- `src/lib/policyImpactAnalyzer.js`（公開 API シグネチャの確認）
- `src/HANDOFF.md`（Report / TravelPolicyMaster スキーマ）
- `.claude-team/verdicts/verdict-A8.md`（PROJECT COMPLETE 申し送り §9）
- `.claude-team/baseline-A6.md` / `baseline-A7.md`（集計 / CSV 仕様の根拠）

### 触れてはいけない
- 上記「改修（限定）」以外の `src/**`
- `src/api/base44Client.js`
- `src/components/ui/*`
- `src/components/forms/*`
- `vite.config.js` / `eslint.config.js` / `tailwind.config.js` / `postcss.config.js` / `jsconfig.json`
- `main` ブランチ
- `.claude-team/` の goal / roadmap / auto-handoff / README / templates / 過去 verdict / 過去 handoff / baseline-A0〜A8 / orchestrator

---

## 【DONE CRITERIA】

Review Agent はこの順で確認する:

- [ ] 作業が `feature/a9-quality-stabilization` ブランチ上で行われている（`git branch --show-current`）
- [ ] `main` に A9 由来の commit が乗っていない（`git log origin/main..HEAD` は feature ブランチでのみ差分、main は不変）
- [ ] `vitest` が `package.json` の `devDependencies` に追加され、`test` / `test:watch` scripts が存在
- [ ] `package.json` の既存 dependencies / 既存 scripts / 既存バージョンが不変（vitest + 2 scripts 以外の差分なし）
- [ ] `vitest.config.js` が存在し、`environment: 'node'` かつ Base44 プラグインを含まない
- [ ] `src/lib/__tests__/aggregation.test.js` 存在、§[DO] 4 の全ケースを含む
- [ ] `src/lib/__tests__/policyImpactAnalyzer.test.js` 存在、§[DO] 5 の全ケースを含む
- [ ] テストは公開 API（4 + 2 export）のみを import（内部ヘルパーを import していない）
- [ ] `src/lib/aggregation.js` / `src/lib/policyImpactAnalyzer.js` に **差分なし**（`git diff` で確認、export 追加もなし）
- [ ] `npm test`（`vitest run`）が全 green（失敗 0）
- [ ] `npm run lint` が **0 errors / 0 warnings**（3 → 0）
- [ ] lint 3 ファイルの修正が指定の最小修正のみで、JSX / 挙動に変更がない（`git diff` で確認）
- [ ] `npm run build` 成功
- [ ] `.claude-team/baseline-A9.md` にテスト方針 + カバレッジ範囲 + 未カバー領域 + 実行手順が記載
- [ ] `review-package-A9.md` の必須セクション（§1〜§7）すべて存在
- [ ] **プレースホルダ完全充填**: `grep -c "AUTO-""FILL:" review-package-A9.md` = `0`
- [ ] `git push` 未実行
- [ ] commit 未実行（Review verdict 後の Owner 操作。Review Package §7 に staging + メッセージ案完備）
- [ ] REPOSITORY ISOLATION RULE 違反なし

---

## 【REVIEW POINTS】

Review Agent は以下を確認:

1. **ブランチ隔離**: 全変更が `feature/a9-quality-stabilization` に閉じ、`main` が不変。
2. **既存実装の凍結**: `aggregation.js` / `policyImpactAnalyzer.js` が完全不変（export 追加なし）。テストは挙動を **観測** するだけで、実装を変えていない。
3. **公開 API 経由検証**: CSV エスケープ（`escapeCsvCell`）や列定義（`getHeaders`）は非 export のため、`buildReportsCSV` / `buildReportsCSVAsync` 経由で間接検証されている。内部ヘルパーの直接 import や export 化が行われていない。
4. **テストの実効性**: 単なる smoke ではなく、4 種別分岐 / 列固定 / RFC 4180 / 月フィルタ / null ガードなど A6〜A8 の要件が assert されている（回帰検知力がある）。
5. **lint 修正の挙動不変性**: 3 箇所が未使用シンボルの除去 / catch バインディング変更のみで、表示・分岐・副作用に影響しない。削除前に参照ゼロを確認している。
6. **新機能ゼロ**: プロダクト挙動を変える変更が混入していない。
7. **依存最小性**: `package.json` 追加が `vitest` + 2 scripts のみ。ランタイム依存・既存バージョン変更なし。`vite.config.js` / `eslint.config.js` 無改変。
8. **設定の非侵襲性**: `vitest.config.js` が独立し、Base44 vite-plugin を巻き込まない（テストが本番ビルド構成に副作用を与えない）。
9. **lint クリーン化**: warnings が 3 → 0。テストファイル自身が新たな lint error/warning を出していない（`globals: false` + 明示 import で global 未定義エラーが出ない）。
10. **baseline-A9.md の未カバー領域明示**: テストが守らない範囲（React/SDK/LLM 依存）が誠実に記録され、運用判断に使える。
11. **A0〜A8 成果物の不変性**: lint 3 ファイル以外の `src/**` に touch がない。
12. **REPOSITORY ISOLATION RULE 違反なし**。
13. **プレースホルダ完全充填**、`git push` 未実行、commit 未実行。

判定:
- 合格時: `.claude-team/verdicts/verdict-A9.md` に
  ```
  APPROVED
  PHASE COMPLETE
  NEXT PHASE: （Owner 判断 — A10 候補は §[NEXT PHASE DEPENDENCY]）
  ```
  + `current-phase.txt` の終端値（`A9` 固定 or `DONE` 復帰）を Owner 判断で設定
- 不合格時: `REJECTED` + 修正要求
- 違反時: `REJECTED / FOREIGN CONTEXT DETECTED`

---

## 【NEXT PHASE DEPENDENCY】

A9 は A0〜A8 完走後の **拡張フェーズ（守り）**。本フェーズ APPROVED により:

- `aggregation.js`（A6/A7）/ `policyImpactAnalyzer.js`（A8）の純粋ロジックが回帰テストで保護される。
- lint warnings が 0 になり、クリーンなベースラインが確立。
- 以降の機能追加・リファクタが「テストで守られた状態」で着手可能になる。

**A9 が前提を満たす後続候補（Owner 判断、A9 範囲外）**:
- **運用受け入れ（A10 候補）**: verdict-A8 §9.4-§9.5 の Owner 実機検証 + A6 の Base44 Automation（cron `0 9 1 * *`）設定。コードよりも Base44 / Owner 作業中心。
- **テスト拡張（任意）**: React コンポーネント / `reportGenerator.js` の整形ロジックへテスト範囲を広げる（`@testing-library` 等の追加が必要なため別フェーズ）。
- **新機能ロードマップ（A10+ 候補）**: スコープ外だった多段階承認 / 一括申請 UI / PWA を新規 roadmap として Design Agent + Owner で策定。

NEXT PHASE は Owner が決定する。A9 単体は「品質固定」で完結し、後続を強制しない。
