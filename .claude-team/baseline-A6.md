# Baseline A6 — Base44 Automation 月次集計自動配信 設定手順

策定日: 2026-06-08
保持者: Design Agent
実機設定担当: Owner
コード実装フェーズ: A6（Implementation Agent 完了）

---

## 目的

A6 で実装した以下のコード層を、Base44 Automation の scheduled trigger と接続し、**毎月 1 日に管理者へ自動配信** する。

- `src/lib/aggregation.js` — 純粋集計関数（`aggregateMonthlySummary` / `formatSummaryForEmail` / `buildReportsCSV`）
- `src/lib/notifications.js` — `notifyMonthlySummary({ year, month, summary, csvContent })`
- `src/pages/Summary.jsx` — admin 向け「先月の集計を管理者に送信」ボタン（手動トリガ、Base44 Automation 設定前のテスト用 + 障害時のバックアップ）

本フェーズ（A6）は **コード + 文書**まで。Base44 Automation の**実設定は Owner 側ダッシュボード作業**として本ファイルに手順を残す。

---

## Base44 ダッシュボード設定手順（Owner 操作）

### 1. Automation の新規作成

1. Base44 ダッシュボードにログイン
2. 左メニュー「Automations」セクションへ移動
3. 「New Automation」ボタンクリック
4. 名前: `Monthly Summary Email`
5. 説明: `毎月 1 日 09:00 JST、前月の旅費精算集計を全管理者宛に送信`

### 2. Trigger 設定

- Type: **Scheduled**
- Cron expression: `0 9 1 * *`（毎月 1 日 09:00 JST）
- Timezone: `Asia/Tokyo`
- 代替候補:
  - `0 9 2 * *`（毎月 2 日 09:00、前月末締めの余裕を取る場合）
  - `0 18 28 * *`（毎月 28 日 18:00、月途中で先取り送信したい場合）

Owner 運用方針に合わせて選択。本 baseline では `0 9 1 * *` を推奨デフォルトとする。

### 3. Action 設定

Type: **Custom JavaScript**（Base44 が提供する script editor）

Base44 Automation の JavaScript runtime API は Owner 側で実装する。以下はロジック構造の擬似コード（Base44 SDK / runtime の正確な API は Owner 確認・調整）:

```javascript
// 擬似コード（Base44 Automation runtime での実行を想定）
// 実際の SDK 呼出構文は Base44 ドキュメント参照

const now = new Date();
const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
const targetMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // 1-12

// 承認済レポート取得（直近 500 件で当該月をカバー想定。
// 件数が増えたら A7 でページネーション化）
const reports = await base44.entities.Report.filter({ status: '承認済' }, '-created_date', 500);

// aggregation.js の関数を Automation 内に同等実装する
// （Frontend ファイルを直接 import できない場合は同ロジックをコピペ）
const monthIdx = targetMonth - 1;
const monthReports = reports.filter(r => {
  const d = new Date(r.created_date);
  return d.getFullYear() === targetYear && d.getMonth() === monthIdx;
});

const totalAmount = monthReports.reduce((s, r) => s + (r.total_amount || 0), 0);
const reportCount = monthReports.length;

// ... formatSummaryForEmail / buildReportsCSV と同等のロジック ...
const summaryBody = `${targetYear}年${targetMonth}月の旅費精算集計レポート\n\n合計支給額: ¥${totalAmount.toLocaleString()}\n承認済レポート件数: ${reportCount} 件\n...`;
const csvLines = [['レポートID', '種別', ...]].concat(monthReports.map(r => [...]));
const csvContent = csvLines.map(row => row.join(',')).join('\n');

// 全管理者取得
const admins = await base44.entities.User.filter({ role: 'admin' });
const adminEmails = admins.map(u => u.email).filter(e => typeof e === 'string' && e.includes('@'));

// SendEmail
const subject = `[月次集計] ${targetYear}年${targetMonth}月 旅費精算サマリ`;
const body = `${summaryBody}\n\n--- CSV データ（コピーしてファイル保存可） ---\n${csvContent}`;
await base44.integrations.Core.SendEmail({ to: adminEmails, subject, body });
```

**重要**:
- frontend の `src/lib/aggregation.js` / `src/lib/notifications.js` は本リポジトリの `functions/` ディレクトリ（Base44 backend）が未配備のため、**直接 import 不可**。
- Base44 Automation script に**ロジックをコピペ**するか、または将来 `functions/` ディレクトリを配備した際に shared module 化を検討。
- 本フェーズ（A6）スコープではコード分離のみ完了し、Automation 設定は Owner 判断。

---

## 失敗時リトライ方針

### Base44 Automation 標準リトライ
- SendEmail が一時的に失敗した場合、Base44 Automation の組み込みリトライ機構（標準提供、設定可能）に委任
- 推奨設定:
  - リトライ回数: 3 回
  - 間隔: 5 分 / 30 分 / 2 時間（指数バックオフ）

### 連続失敗時の Owner 通知
- 3 回連続失敗した場合、Base44 Automation の `error_notification` 機能で Owner にメール通知
- Owner 通知先: Base44 ダッシュボード「Automations → Monthly Summary Email → Error Settings」で設定

### バックアップ運用
- 30 日連続で自動配信失敗が継続した場合、Owner は以下のバックアップ手段を実施:
  1. Summary 画面（`/summary`、admin ログイン）の「先月の集計を管理者に送信」ボタンを手動押下
  2. ブラウザコンソールで `[notifications]` / `[Summary]` ログを確認
  3. SendEmail 失敗が継続する場合、Base44 サポートに問い合わせ

### Frontend 経由の手動送信
- A6 で Summary.jsx に追加した admin 向けボタンは、Base44 Automation 障害時のバックアップ + 設定前のテスト + 任意タイミングでの再送信の 3 用途に使用可能
- 手動送信時の対象月は常に「実行日時から見た先月」（月またぎ補正済、1 月実行時は前年 12 月）

---

## Owner 検証手順（実機）

### A6 完了直後（Automation 設定前）の検証

1. Frontend 起動: `npm run dev`
2. admin ロールでログイン
3. `/summary` ページを開く
4. 「先月の集計を管理者に送信」ボタンが表示されることを確認
5. ボタンクリック → loading 表示 → success 表示を確認
6. 全管理者のメールボックスを確認 → `[月次集計]` 件名のメール受信
7. 本文に以下が含まれることを確認:
   - 「YYYY年M月の旅費精算集計レポート」見出し
   - 合計支給額・承認済レポート件数
   - 種別別小計・ユーザー別小計
   - `--- CSV データ ---` セパレータ + CSV 文字列

### Automation 設定後の検証

1. Base44 ダッシュボード「Automations」で Monthly Summary Email の「Manual Trigger」を押下
2. ログで Automation 実行成功を確認
3. 管理者宛にメール受信を確認（上記と同内容）
4. cron 設定の動作確認:
   - 短期 cron `*/5 * * * *`（5 分おき）で一時的にテスト
   - 5 分後にメール受信を確認
   - テスト後に `0 9 1 * *` に戻す

### 失敗パターンの検証

1. 一時的に invalid な admin email を仕掛ける → SendEmail 失敗 → リトライログ確認
2. 連続失敗 → Owner 通知メール受信を確認
3. invalid email 修正 → 次回自動実行で正常配信を確認

---

## 開発者ノート

### 純粋関数の再利用性

`src/lib/aggregation.js` の以下 3 関数はすべて純粋関数（副作用なし、`Date` のみ依存）:
- `aggregateMonthlySummary(reports, { year, month })`
- `formatSummaryForEmail(aggregate)`
- `buildReportsCSV(reports)`

これらは:
- ✅ Frontend（Summary.jsx）で使用
- ✅ 将来 Base44 backend（`functions/` 配備時）で shared module として import 可能
- ✅ Unit test 容易（reports を fixture として渡すだけ）

### `src/pages/Summary.jsx` の `sendPreviousMonthSummary` を参考実装に

Base44 Automation script を書く際は、Summary.jsx の以下関数を**参考実装**として使用:

```javascript
const sendPreviousMonthSummary = async () => {
  const now = new Date();
  const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const targetMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const aggregate = aggregateMonthlySummary(reports, { year: targetYear, month: targetMonth });
  const summaryBody = formatSummaryForEmail(aggregate);
  const csvContent = buildReportsCSV(aggregate.reports);
  await notifyMonthlySummary({ year: targetYear, month: targetMonth, summary: summaryBody, csvContent });
};
```

Automation script は同じロジック構造で書ける（reports は Automation runtime 経由で取得）。

### A6 で意図的に扱わなかった項目（A7+ で再検討）

- **添付ファイル形式での CSV 送信**: Base44 SendEmail の添付サポートが未検証のため、本フェーズは「本文末尾埋め込み」で最小実装
- **大量データ対応**: 500 件超のレポートを月次集計する場合のページネーション / Web Worker 化（A7 スコープ）
- **CSV フォーマット監査対応**: 経理向け列構成の固定 / カラム順固定 / 区切り文字エスケープ（A7 スコープ）
- **配信履歴の DB 永続化**: 新規エンティティ作成は roadmap 外、必要時に Design Agent 判断
- **配信先カスタマイズ UI**: 「特定の admin のみ」「user 自身にも CC」等、配信ルール UI は roadmap 外

---

## 参照

- Implementation コード: `src/lib/aggregation.js` / `src/lib/notifications.js` / `src/pages/Summary.jsx`
- Handoff 正本: `.claude-team/handoff/design-handoff-A6.md`
- Review Package: `.claude-team/review-packages/review-package-A6.md`
- HANDOFF.md「未実装」表「月次集計の自動レポート送信」
- roadmap.md A6 行
