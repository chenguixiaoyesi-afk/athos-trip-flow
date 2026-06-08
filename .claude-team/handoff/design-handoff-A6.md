# Design Handoff — Phase A6

From: Design Agent
To: Implementation Agent（※ Design Review Gate 通過後のみ起動可）
Date: 2026-06-08
Goal 正本: `.claude-team/goal.md`
Roadmap 正本: `.claude-team/roadmap.md`
直近 verdict: `.claude-team/verdicts/verdict-A5.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A6 / **MVP COMPLETE**）
A5 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A5.md`

本 handoff は roadmap.md の A6 行と verdict-A5 §9.7 の指示を 9 ブロック仕様に整形したもの。verdict-A5 §6 改善提案のうち、A6 関連項目を反映（§6.4 バルク通知レート制限対応の検討、§6.5 ペイロード組み立てユーティリティ化）。§6.1 `useCanEdit` 抽出 / §6.2 lint warnings / §6.3 Design Agent プロセス順序徹底は A6 スコープ外（roadmap 次回改訂時に Design Agent 判断）。

**MVP 達成済。A6 は運用品質向上フェーズの最初。**

---

## 【CURRENT PHASE】

**A6 — 集計: 月次集計の自動配信**

業務フローの「集計」レイヤを自動化する。現状 `Summary.jsx` は admin が画面を開いた時点で集計を表示・CSV ダウンロードできるが、月次レポーティングは管理者の手作業（毎月確認 → CSV ダウンロード → 経理へ転送）に依存している。本フェーズで:
1. 集計ロジックを `Summary.jsx` から **純粋関数として抽出** し、UI 非依存で再利用可能にする
2. `notifications.js` に **月次集計配信ヘルパー** を追加し、A5 で確立した SendEmail パターンを再利用
3. Summary.jsx に **admin 向けの手動配信ボタン** を追加（Owner が実機テスト + Base44 Automation の callable として使用）
4. Base44 Automation（毎月 1 日のスケジュール起動）の設定手順を `baseline-A6.md` に文書化（実設定は Owner 側ダッシュボード操作）

A6 は roadmap.md A6 行の「完成」「非実装」「レビュー条件」に厳密準拠。

---

## 【OBJECTIVE】

1. `src/lib/aggregation.js` を新規作成し、Summary.jsx の集計ロジックを純粋関数として抽出:
   - `aggregateMonthlySummary(reports, { year, month })` — 指定月の集計を返す（合計金額、件数、種別別、ユーザー別小計）
   - `formatSummaryForEmail(aggregate)` — 集計データをメール本文用 plain text に整形
2. Summary.jsx の `exportCSV` ロジックを `src/lib/aggregation.js` 内に `buildReportsCSV(reports)` として抽出（browser 依存の Blob 操作は Summary.jsx 側に残す）
3. `src/lib/notifications.js` に `notifyMonthlySummary({ year, month, summary, csvContent })` を追加（A5 の `safeSend` / `getAdminEmails` を再利用）
4. `Summary.jsx` に admin 向けの「先月の集計を管理者へ送信」ボタンを追加（手動トリガ + Base44 Automation 用エンドポイント）
5. `.claude-team/baseline-A6.md` に Base44 Automation 設定手順と失敗時リトライ方針を文書化

---

## 【SCOPE】

A6 の作業範囲は以下に **厳密に限定**:

| カテゴリ | 内容 |
|---|---|
| 新規ファイル | `src/lib/aggregation.js`（純粋集計関数 + CSV ビルダ）、`.claude-team/baseline-A6.md`（Base44 設定文書） |
| 改修 1 | `src/pages/Summary.jsx` — 既存 `exportCSV` を `buildReportsCSV` 経由に書き換え（挙動完全等価）+ admin 手動配信ボタン追加 |
| 改修 2 | `src/lib/notifications.js` — `notifyMonthlySummary` を追加（A5 の safeSend / getAdminEmails を再利用） |
| 文書化 | `review-package-A6.md` に設計判断（aggregation 関数のシグネチャ / Base44 Automation の callable 方式 / 失敗時リトライ方針）と検証手順 |

### 非対象（DO NOT で詳述）
- `Summary.jsx` の UI 表示構造変更（既存 chart / table の見た目に touch なし）
- 年次自動配信（roadmap 外、将来要件）
- 配信履歴の DB 永続化（roadmap 外、新規エンティティ禁止）
- 配信先カスタマイズ UI（roadmap 外）
- Base44 Automation の実設定（Owner 側ダッシュボード作業、本フェーズはコード + 文書のみ）
- `useCanEdit` / `useDuplicateReportCheck` 抽出（verdict-A5 §6.1、A6 スコープ外）
- バルク通知のレート制限対応（verdict-A5 §6.4、A6 スコープ外）
- ペイロード組み立てユーティリティ化（verdict-A5 §6.5、A6 スコープ外）
- A7 領域（CSV フォーマット固定 + 大量データ）
- A8 領域（規程履歴）

---

## 【DO】

### 1. 現状把握（A6 開始時の grep で行番号確定）

実装着手前に以下を grep / Read で確認し、Review Package §1 に転記:

| 観点 | 確認方法 | 期待 |
|---|---|---|
| Summary の集計対象データ取得 | `grep -n "Report.filter" src/pages/Summary.jsx` | `status: '承認済'` でフィルタ |
| Summary の exportCSV | `grep -n "exportCSV\|csv" src/pages/Summary.jsx` | L105-123 周辺、headers / rows / BOM 付き UTF-8 |
| Summary の admin 分岐 | `grep -n "isAdmin" src/pages/Summary.jsx` | `user?.role === 'admin'` |
| Summary の月次計算 | `grep -n "getMonth\|currentMonth\|prevMonth" src/pages/Summary.jsx` | date-fns 使用、month index は 0 始まり |
| notifications.js 既存構造 | `grep -n "export" src/lib/notifications.js` | A5 で確立した 3 ヘルパー + safeSend + getAdminEmails |
| functions/ ディレクトリ存在 | `ls functions/` | **不在**（Deno backend は本リポジトリでは未配備）|

本リポジトリには `functions/` ディレクトリが存在しないため、A6 の Base44 Automation 設定は **ダッシュボード経由** のみとなる。コードレベルでは callable な純粋関数を提供することに留め、scheduler 自体は Base44 側で構築する設計。

### 2. `src/lib/aggregation.js` 新規作成

純粋関数（UI 非依存、`window` / DOM / `localStorage` 不使用）として以下を export:

```js
import { format, getYear, getMonth } from 'date-fns';

/**
 * 指定年月の集計を計算する純粋関数
 * @param {Array} reports - Report.filter({ status: '承認済' }) で取得したレポート配列
 * @param {{ year: number, month: number }} options - month は 1-12 (人間直感的)
 * @returns {{
 *   year: number,
 *   month: number,
 *   totalAmount: number,
 *   reportCount: number,
 *   byType: { [type: string]: { count: number, amount: number } },
 *   byUser: { [name: string]: { count: number, amount: number } },
 *   reports: Array, // 該当月のレポート配列
 * }}
 */
export function aggregateMonthlySummary(reports, { year, month }) {
  const monthIdx = month - 1; // date-fns getMonth は 0 始まり
  const monthReports = (reports || []).filter(r => {
    const d = new Date(r.created_date);
    return getYear(d) === year && getMonth(d) === monthIdx;
  });

  const totalAmount = monthReports.reduce((s, r) => s + (r.total_amount || 0), 0);

  const byType = {};
  for (const r of monthReports) {
    const k = r.report_type || '不明';
    if (!byType[k]) byType[k] = { count: 0, amount: 0 };
    byType[k].count += 1;
    byType[k].amount += (r.total_amount || 0);
  }

  const byUser = {};
  for (const r of monthReports) {
    const k = r.created_by_name || '不明';
    if (!byUser[k]) byUser[k] = { count: 0, amount: 0 };
    byUser[k].count += 1;
    byUser[k].amount += (r.total_amount || 0);
  }

  return {
    year,
    month,
    totalAmount,
    reportCount: monthReports.length,
    byType,
    byUser,
    reports: monthReports,
  };
}

/**
 * 集計データをメール本文用 plain text に整形する純粋関数
 * @param {ReturnType<typeof aggregateMonthlySummary>} aggregate
 * @returns {string} plain text body
 */
export function formatSummaryForEmail(aggregate) {
  const { year, month, totalAmount, reportCount, byType, byUser } = aggregate;
  const typeLines = Object.entries(byType)
    .map(([k, v]) => `  ${k}: ${v.count} 件 / ¥${v.amount.toLocaleString()}`)
    .join('\n');
  const userLines = Object.entries(byUser)
    .map(([k, v]) => `  ${k}: ${v.count} 件 / ¥${v.amount.toLocaleString()}`)
    .join('\n');

  return `${year}年${month}月の旅費精算集計レポート

合計支給額: ¥${totalAmount.toLocaleString()}
承認済レポート件数: ${reportCount} 件

【種別別小計】
${typeLines || '  （該当なし）'}

【ユーザー別小計】
${userLines || '  （該当なし）'}

詳細はシステムの「集計」画面でご確認ください。
CSV は本メールに添付しています（または別途配信されています）。`;
}

/**
 * レポート配列を CSV 文字列に変換する純粋関数（Summary.jsx の exportCSV ロジックを抽出、browser 依存なし）
 * @param {Array} reports
 * @returns {string} CSV 文字列（BOM なし、UTF-8 想定）
 */
export function buildReportsCSV(reports) {
  const headers = ['レポートID', '種別', '作成者', '年月', '日付', '目的地', 'ステータス', '合計金額'];
  const rows = (reports || []).map(r => [
    r.report_number || r.id?.slice(-6) || '',
    r.report_type || '',
    r.created_by_name || '',
    r.created_date ? format(new Date(r.created_date), 'yyyy/MM') : '',
    r.travel_date || r.start_date || (r.created_date ? format(new Date(r.created_date), 'yyyy-MM-dd') : ''),
    r.destination_name || `${r.country_name || ''} ${r.city_name || ''}`.trim() || '',
    r.status || '',
    r.total_amount || 0,
  ]);
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}
```

**重要な設計判断**:
- すべて **純粋関数**（副作用なし、外部 IO なし、`Date` のみ依存）→ Base44 Automation の callable としても browser 側からも同じ関数を使える
- `month` 引数は **1-12**（人間直感的）、内部で date-fns の 0 始まりに変換
- `byType` / `byUser` の集計はソートしない（呼出元で必要に応じてソート）
- `buildReportsCSV` の戻り値は **BOM なし** プレーン CSV 文字列。BOM 付与 + Blob 化 + Download トリガは Summary.jsx 側に残す（browser 依存ロジックは UI 層に閉じる原則）

### 3. `src/lib/notifications.js` への `notifyMonthlySummary` 追加

A5 で確立した `safeSend` / `getAdminEmails` を再利用:

```js
// 既存 imports に追加なし（base44 はすでに使われている）

/**
 * 月次集計メール（システム → 全管理者）
 * @param {{ year: number, month: number, summary: object, csvContent: string }} args
 * @returns {Promise<void>}
 */
export async function notifyMonthlySummary({ year, month, summary, csvContent }) {
  const adminEmails = await getAdminEmails();
  const subject = `[月次集計] ${year}年${month}月 旅費精算サマリ`;
  // body は formatSummaryForEmail 由来の整形文字列を期待
  const body = summary || `${year}年${month}月の集計データを送信します。`;
  // CSV は本文末尾に「--- CSV データ ---」セパレータで埋め込む（A6 最小実装。
  // 添付ファイル化は Base44 SendEmail の添付サポート確認後に A7 以降で検討）
  const bodyWithCsv = csvContent
    ? `${body}

--- CSV データ（コピーしてファイル保存可） ---
${csvContent}`
    : body;
  await safeSend({ to: adminEmails, subject, body: bodyWithCsv });
}
```

**重要な設計判断**:
- `safeSend` / `getAdminEmails` を再利用 → A5 で確立した「失敗時は呼出元を破壊しない」原則を継承
- CSV を **本文末尾埋め込み** で送信（A6 最小実装）
  - 理由: Base44 SendEmail の添付ファイルサポートは現リポジトリで検証されていない。確認 + 実装拡張は A7 以降の判断
  - 本文末尾「--- CSV データ ---」セパレータで区切り、ユーザーが手動でファイル保存可能な形式に
- 件名プレフィックス `[月次集計]` で他通知（`[申請] / [承認] / [差戻し]`）と識別容易
- `summary` 引数が空でもフォールバック body で送信は試みる（getAdminEmails が空配列なら safeSend が skip する）

### 4. `src/pages/Summary.jsx` の改修

#### 4.1 既存 `exportCSV` を `buildReportsCSV` 経由に書き換え

挙動は完全等価。

```js
import { buildReportsCSV, aggregateMonthlySummary, formatSummaryForEmail } from '@/lib/aggregation';

// 既存の exportCSV を以下に置換
const exportCSV = () => {
  const csv = buildReportsCSV(yearReports);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `旅費精算_${year}年_経理用.csv`;
  link.click();
};
```

ヘッダ・行構造・BOM・ファイル名形式すべて維持。Browser 依存処理は Summary.jsx 側に残る。

#### 4.2 admin 向け手動配信ボタンの追加

import 追加:
```js
import { notifyMonthlySummary } from '@/lib/notifications';
```

Summary 関数内に新規ハンドラ:
```js
const [sendingMonthly, setSendingMonthly] = useState(false);
const [sendResult, setSendResult] = useState(null); // 'success' | 'fail' | null

const sendPreviousMonthSummary = async () => {
  setSendingMonthly(true);
  setSendResult(null);
  try {
    const now = new Date();
    const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const targetMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // 1-12

    // 集計データを生成（reports は state 上の承認済レポート全体）
    const aggregate = aggregateMonthlySummary(reports, { year: targetYear, month: targetMonth });
    const summaryBody = formatSummaryForEmail(aggregate);
    const csvContent = buildReportsCSV(aggregate.reports);

    await notifyMonthlySummary({
      year: targetYear,
      month: targetMonth,
      summary: summaryBody,
      csvContent,
    });
    setSendResult('success');
  } catch (e) {
    // 通常 notifyMonthlySummary は throw しないが、念のため fail を表示
    console.warn('[Summary] sendPreviousMonthSummary error', e);
    setSendResult('fail');
  } finally {
    setSendingMonthly(false);
  }
};
```

ボタン JSX（既存 CSV エクスポートボタン横に追加、admin のみ表示）:
```jsx
{isAdmin && (
  <Button
    variant="outline"
    onClick={sendPreviousMonthSummary}
    disabled={sendingMonthly}
    className="gap-2"
  >
    {sendingMonthly ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
    {sendingMonthly ? '送信中...' : '先月の集計を管理者に送信'}
  </Button>
)}
{sendResult === 'success' && (
  <span className="text-xs text-green-600">✓ 送信トリガ完了（実際の配信は SendEmail ログを確認）</span>
)}
{sendResult === 'fail' && (
  <span className="text-xs text-red-600">⚠ 送信トリガでエラーが発生しました（コンソール確認）</span>
)}
```

`Loader2` / `Mail` アイコンは `lucide-react` から import。`useState` 既存使用済。

#### 4.3 触れない箇所

- chart / table 既存 JSX
- 月次計算ロジック L48-62 周辺（既存表示用、本フェーズは触らない）
- `localStorage` 利用（`annualBudget`）
- `yearReports` / `prevYearReports` / `currentMonthReports` などの既存変数

### 5. `.claude-team/baseline-A6.md` 新規作成

Base44 Automation 設定手順を Owner 向けに文書化:

```markdown
# Baseline A6 — Base44 Automation 設定手順

策定日: 2026-06-08
保持者: Design Agent / 実機設定担当: Owner

## 目的
A6 で実装した `notifyMonthlySummary` ヘルパー + Summary.jsx の手動配信ボタンを、Base44 Automation の scheduled trigger と接続し、毎月 1 日に管理者へ自動配信する。

## Base44 ダッシュボード設定手順
1. Base44 ダッシュボード → Automations セクションへ移動
2. 新規 Automation 作成: "Monthly Summary Email"
3. Trigger: Scheduled、cron 式 `0 9 1 * *`（毎月 1 日 9:00 JST、Owner の運用時刻に調整可）
4. Action: Custom JavaScript（Base44 が提供する script editor）
5. Script 内容: ……（暫定案。Base44 Automation の JavaScript runtime API 仕様は Owner 側で確認、本フェーズはダッシュボード設定の枠組みのみ提示）

## 失敗時リトライ方針
- SendEmail が一時的に失敗した場合、Base44 Automation の組み込みリトライ機構（標準提供）に委任
- 連続失敗の場合は Owner にメール通知（Base44 Automation の error notification 設定）
- 30 日間の手動配信失敗が継続した場合、Owner が Summary 画面の手動配信ボタンでバックアップ送信
- 月次配信に「対象月の前月確定」を待つ運用（前月 1 日に当月分送信、月末締めの 9 日後など）の選択肢は Owner 判断

## 検証手順（Owner 実機分担）
1. Summary 画面の手動配信ボタンで送信テスト → 管理者宛にメール受信を確認
2. Base44 Automation の手動トリガで送信テスト → 同上
3. cron 設定後、翌月 1 日（または短期 cron `*/5 * * * *` で 5 分後テスト）で発火確認
4. 失敗時のリトライ動作確認

## 開発者ノート
- `src/lib/aggregation.js` の `aggregateMonthlySummary` / `formatSummaryForEmail` / `buildReportsCSV` は純粋関数。
  Base44 Automation の Custom JavaScript からも同等の処理を呼出せる（SDK 経由で entities を取得後に同様のロジックを実行）。
- 実コード `src/pages/Summary.jsx` の `sendPreviousMonthSummary` 関数を **参考実装** として Base44 Automation script に組み込むことを推奨。
```

### 6. `current-phase.txt` の確認と自動補正

実装着手時に `current-phase.txt = A6` であることを確認。`A5` のままなら本 DO で `A6` に更新。`A7` 以降への更新は禁止。

### 7. ビルド / lint 検証

- `npm run lint` errors=0
- A5 完了時点（3 warnings: `Login.jsx err` / `ReportDetail.jsx isAdmin` / `ReportNew.jsx navigate`）から増加していないこと
- 新規 `aggregation.js` で新たな warning が出ないこと（純粋関数のみで `unused-vars` 等が出ない設計）
- `npm run build` 成功

### 8. Regression 検証

#### 8.1 既存 Summary.jsx の動作
- chart / table 表示の見た目に変化なし
- CSV エクスポートボタンの動作が既存と完全一致（headers, 列順, BOM, ファイル名形式）
- admin / user の表示分岐に regression なし

#### 8.2 新規手動配信ボタンの動作
- admin で表示、user で非表示
- ボタン押下 → loading → success / fail 結果表示
- notifyMonthlySummary がコール → safeSend 経由で SendEmail（失敗しても UI が崩れない）

#### 8.3 集計値の正確性
- `aggregateMonthlySummary` の戻り値が既存 Summary.jsx 表示の月次集計と一致（小計、種別別、ユーザー別）

検証結果は Review Package §4 に記録。手動 UI 確認が困難な場合は、コードロジックの存在と論理確認として §4 に明記する。

### 9. Commit 方針（verdict-A1 §8 改善提案 3 継続適用）

実コミットは **Review verdict 後の Owner 操作**で実行する。Implementation Agent は Review Package §7 に以下を記載:
- ステージング対象ファイル一覧
- コミットメッセージ案（例: `feat(A6): add monthly summary auto-delivery helpers and admin trigger`）
- 注意事項

### 10. handoff 雛形からの逸脱明示（verdict-A4 §7.1 改善継続）

本 handoff §2-§4 の雛形コードは設計参考。Implementation Agent が等価機能を別構造で実装する場合は Review Package §2 / §3 に逸脱と理由を明示。

---

## 【DO NOT】

- `Summary.jsx` の UI 表示構造変更（chart / table の見た目への touch）
- 年次自動配信
- 配信履歴の DB 永続化（新規エンティティ作成禁止）
- 配信先カスタマイズ UI
- Base44 Automation の実設定（Owner 側ダッシュボード作業）
- 添付ファイル形式での CSV 送信（Base44 SendEmail の添付サポート未検証、本文末尾埋め込みで最小実装）
- `useCanEdit` / `useDuplicateReportCheck` の抽出（roadmap 改訂判断）
- バルク通知のレート制限対応（A6 スコープ外、verdict-A5 §6.4）
- `buildReportPayload` 等の form ペイロードユーティリティ化（A6 スコープ外、verdict-A5 §6.5）
- A7 領域（CSV フォーマット固定 / 大量データ対応 / Web Worker 化）
- A8 領域（規程変更履歴 / 影響範囲追跡）
- 既存 A5 の notifications.js の 3 ヘルパー（`notifySubmitted` / `notifyApproved` / `notifyRejected`）への変更
- 既存 A4 の `useReceiptParser` / `ReceiptUploaderSection` / `reportGenerator.js` への touch
- 既存 A3 の `ReportEdit.jsx` / `App.jsx` Routes への touch
- 既存 4 form への touch（receipt_urls 送信は A5 で確立済）
- 既存 ReportDetail.jsx / Approval.jsx への touch
- 新規ルート / 新規ページ / 新規エンティティ / 新規 hook
- `src/api/base44Client.js` の変更
- `src/components/ui/*` の変更
- `lib/policyContext.jsx` / `lib/AuthContext.jsx` の変更
- `package.json` / `package-lock.json` の変更
- `eslint.config.js` / `vite.config.js` / `tailwind.config.js` の変更
- `npm run lint:fix` の実行
- `.claude-team/goal.md` / `.claude-team/roadmap.md` / `.claude-team/auto-handoff.md` / `.claude-team/README.md` / `.claude-team/templates/*` の変更
- `current-phase.txt` を `A7` 以降に更新
- `git push`
- `git commit` の実行（Review verdict 後の Owner 操作）
- `git commit --amend`
- `--no-verify` 等の hook スキップ
- `review-package-A6.md` でのプレースホルダ未充填での Review 起動

---

## 【FILES / AREAS】

### 変更可能
- `src/pages/Summary.jsx`（exportCSV 内部を buildReportsCSV 経由に + admin 手動配信ボタン追加。chart / table / 既存集計表示には touch しない）
- `src/lib/notifications.js`（`notifyMonthlySummary` 追加のみ、既存 3 ヘルパーには touch しない）

### 新規作成
- `src/lib/aggregation.js`
- `.claude-team/baseline-A6.md`
- `.claude-team/review-packages/review-package-A6.md`

### メタ更新（任意）
- `.claude-team/current-phase.txt`（`A5` のままなら `A6` に更新可。`A7` 以降への更新は禁止）

### 参照のみ（変更しない）
- `.claude-team/verdicts/verdict-A5.md`
- `.claude-team/handoff/design-handoff-A5.md`
- `.claude-team/review-packages/review-package-A5.md`
- `.claude-team/roadmap.md` A6 行
- HANDOFF.md「未実装」表の「月次集計の自動レポート送信」
- `src/api/base44Client.js`（SendEmail 呼出元として）

### 触れてはいけない
- 上記「変更可能」以外の `src/**`
- `src/api/base44Client.js`
- `src/components/ui/*`
- `src/components/forms/*`
- `src/hooks/useReceiptParser.js`
- `src/lib/reportGenerator.js`
- `src/lib/policyContext.jsx`
- `src/lib/AuthContext.jsx`
- `src/pages/Approval.jsx`
- `src/pages/PolicyManagement.jsx`
- `src/pages/ReportDetail.jsx`
- `src/pages/ReportEdit.jsx`
- `src/pages/ReportNew.jsx`
- `src/pages/ReportList.jsx`
- `src/pages/Dashboard.jsx`
- `src/App.jsx`
- 設定ファイル類
- `.claude-team/` の goal / roadmap / auto-handoff / README / templates / 過去 verdict / 過去 handoff

---

## 【DONE CRITERIA】

Review Agent はこの順で確認する:

- [ ] `npm run lint` errors=0、warnings は A5 完了時点（3 件）から増加していない
- [ ] `npm run build` 成功
- [ ] 新規 `src/lib/aggregation.js` が存在
- [ ] `aggregation.js` に `aggregateMonthlySummary` / `formatSummaryForEmail` / `buildReportsCSV` の 3 export が存在
- [ ] `aggregateMonthlySummary` が `month: 1-12` 引数を受け、戻り値に `totalAmount` / `reportCount` / `byType` / `byUser` / `reports` を含む
- [ ] `aggregation.js` 内に `window` / `document` / `localStorage` / `Blob` / `URL.createObjectURL` の使用がない（純粋関数性）
- [ ] `notifications.js` に `notifyMonthlySummary` export が追加されている
- [ ] `notifyMonthlySummary` が `safeSend` と `getAdminEmails` を再利用している（DRY）
- [ ] 件名に `[月次集計]` プレフィックスが含まれる
- [ ] `Summary.jsx` の `exportCSV` が `buildReportsCSV` を呼出に置換されている
- [ ] `Summary.jsx` の CSV 出力ファイル名・BOM・headers・列構造が既存と完全等価
- [ ] `Summary.jsx` に admin 専用「先月の集計を管理者に送信」ボタンが追加されている
- [ ] 手動配信ボタンが `aggregateMonthlySummary` / `formatSummaryForEmail` / `buildReportsCSV` / `notifyMonthlySummary` を順に呼ぶ
- [ ] 手動配信ボタンが loading / success / fail 表示を持つ
- [ ] `.claude-team/baseline-A6.md` が新規作成され、Base44 Automation 設定手順 + 失敗時リトライ方針 + 検証手順が含まれている
- [ ] `git diff --stat` の変更ファイルが許容範囲（2 改修 + 3 新規 + 任意 current-phase.txt）
- [ ] Summary.jsx の chart / table / 既存集計表示への touch がない（外形 regression なし）
- [ ] notifications.js の既存 3 ヘルパー（`notifySubmitted` / `notifyApproved` / `notifyRejected`）への touch がない
- [ ] `review-package-A6.md` の必須セクション（§1〜§7）すべて存在
- [ ] **プレースホルダ完全充填**: `grep -c "AUTO-""FILL:" review-package-A6.md` = `0`（分割表記）
- [ ] `current-phase.txt` の内容が `A6`
- [ ] `git push` 未実行
- [ ] commit 未実行（Review verdict 後の Owner 操作）

---

## 【REVIEW POINTS】

Review Agent は以下を確認:

1. **スコープ厳守**: 変更が「変更可能」リスト 2 ファイル + 新規 3 ファイル + メタ任意の範囲
2. **`aggregation.js` の純粋性**: 副作用なし、browser 依存なし、テスト容易性が確保されている
3. **既存 `exportCSV` の挙動等価**: ファイル名・BOM・headers・列構造が一字一句同一
4. **手動配信ボタンの admin 限定**: `isAdmin` 真のときのみ表示、user では非表示
5. **`notifyMonthlySummary` の throw 非伝播**: A5 で確立した `safeSend` / `getAdminEmails` を再利用、失敗時も UI 崩壊なし
6. **件名・本文の Report 値埋め込み**: `[月次集計]` プレフィックス + 集計フィールド（合計金額・件数・種別別・ユーザー別）+ CSV 末尾埋め込み
7. **baseline-A6.md の充実度**: Base44 ダッシュボード設定手順 + 失敗時リトライ方針 + Owner 検証手順が記載されている
8. **A5 成果物の不変性**: notifications.js の既存 3 ヘルパー、4 form の SendEmail 呼出、Approval の通知ロジックへの touch なし
9. **A4 / A3 成果物の不変性**: hook / form / edit ルート / reportGenerator 変更なし
10. **A7 領域への侵食なし**: CSV フォーマット改変 / 大量データ最適化 / Web Worker 化 なし
11. **A8 領域への侵食なし**: 規程変更履歴 / 影響範囲追跡 / PolicyManagement.jsx 変更なし
12. **REPOSITORY ISOLATION RULE 違反なし**
13. **handoff 雛形からの逸脱明示**: Implementation Agent が雛形から構造変更した場合、Review Package §2 / §3 に理由が記載
14. **プレースホルダ完全充填**: `grep -c "AUTO-""FILL:" review-package-A6.md` = 0
15. **`git push` 未実行**
16. **commit 未実行**: Review verdict 後の Owner 操作、Review Package §7 に staging + メッセージ案完備

判定:
- 合格時: `.claude-team/verdicts/verdict-A6.md` に
  ```
  APPROVED
  PHASE COMPLETE
  NEXT PHASE: A7
  ```
  + `current-phase.txt` を `A7` に更新
- 不合格時: `REJECTED` + 修正要求
- 違反時: `REJECTED / FOREIGN CONTEXT DETECTED`

---

## 【NEXT PHASE DEPENDENCY】

A7（CSV 出力フォーマット固定 + 大量データ対応）は以下を A6 に依存:

- A6 で抽出した `buildReportsCSV` の純粋関数性により、A7 で出力フォーマット改変 / 大量データ最適化（Web Worker 化等）を**ロジック層に閉じて**実装できる
- A6 の `aggregation.js` が UI 非依存なので、A7 で出力対象の絞り込み（任意期間 / ユーザー別 / 種別別）を集計関数の引数追加で表現可能
- A6 の `notifyMonthlySummary` 構造（本文 + CSV 埋め込み）が、A7 で「監査要件に沿った列構成」に拡張される際の足場になる

A7 の設計詳細は **A6 の Verdict（実装後ゲート）が APPROVED となった後に Design Agent が作成する**。本 handoff の時点では描かない。
