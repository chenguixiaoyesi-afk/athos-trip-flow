# Review Package — Phase A5

From: Implementation Agent
To: Review Agent（実装後ゲート）
Date: 2026-06-08
Phase: A5 — 承認: メール通知（申請/承認/差戻し）— **MVP 達成最終フェーズ**
Handoff 正本: `.claude-team/handoff/design-handoff-A5.md`
Design Review Gate Verdict: `.claude-team/design-reviews/design-review-verdict-A5.md`（APPROVED_FOR_IMPLEMENTATION）
直近 verdict（前フェーズ）: `.claude-team/verdicts/verdict-A4.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A5）

---

## 0. 実装前ゲート確認

| 項目 | 結果 |
|---|---|
| REPOSITORY ISOLATION RULE | ✅ handoff・実コード差分・本 review-package すべて Athos TravelMate のみ、禁止語彙混入なし |
| IMPLEMENTATION SAFETY RULE | ✅ 既存 6 ファイル実在（4 form + ReportDetail.jsx + Approval.jsx）、新規 `src/lib/notifications.js` 不在を事前確認後に作成、SendEmail / entities.User 使用箇所が事前ゼロ（HANDOFF.md docs 言及のみ） |
| 9 ブロック仕様 | ✅ 揃い |
| Design Review Gate | ✅ `APPROVED_FOR_IMPLEMENTATION` |
| 直近フェーズ PHASE COMPLETE | ✅ A4 APPROVED / PHASE COMPLETE / NEXT PHASE: A5 |
| handoff DO 8（current-phase.txt = A5） | ✅ 着手時点で既に `A5`、本 Agent は変更せず |

---

## 1. 現状把握（A5 開始時の grep / Read 結果）

### 1.1 4 form の handleSubmit（A4 commit 後の状態）

| Form | handleSubmit シグネチャ | create/update 分岐 |
|---|---|---|
| `DayTripForm.jsx` | L114 `const handleSubmit = async (status) => {` | A3 で導入の `if (mode === 'edit') Report.update / else Report.create` パターン、`receipt_urls: receiptUrls` (A4) 送信 |
| `OvernightTripForm.jsx` | L94 同 | 同 |
| `OverseasTripForm.jsx` | L82 同 | 同 |
| `FieldworkForm.jsx` | L296 同 | 同 |

### 1.2 ReportDetail.handleSubmit

```
L68-73:
const handleSubmit = async () => {
  setSubmitting(true);
  await base44.entities.Report.update(id, { status: '申請中' });
  setReport(prev => ({ ...prev, status: '申請中' }));
  setSubmitting(false);
};
```

### 1.3 Approval.jsx の 3 handler

```
L39 handleApprove(reportId)   → Report.update({status:'承認済', approver_name, approved_date})
L51 handleReject()             → Report.update({status:'差戻し', rejection_reason})
L65 handleBulkApprove()        → for-loop Report.update({status:'承認済', ...})
```

### 1.4 `base44.integrations.Core.SendEmail` 既存使用

`grep -rn "SendEmail" src/` 結果（HANDOFF.md docs 言及のみ、コードでの呼出 0）:
```
src/HANDOFF.md:44  メール通知（申請・承認・差戻し時） | 高 | `base44.integrations.Core.SendEmail` で実装可
src/HANDOFF.md:320  ...
src/HANDOFF.md:331  ...
```

→ A5 で初導入される。

### 1.5 `base44.entities.User` 既存使用

`grep -rn "entities.User" src/` 結果: ヒット 0。`AuthContext.jsx` で `base44.auth.me()` 経由の単独ユーザー取得は存在するが、`User.filter` は未使用。

→ A5 で初導入される。

---

## 2. 設計判断

### 2.1 handoff 雛形からの逸脱なし（verdict-A4 §7.1 改善反映）

`src/lib/notifications.js` は handoff §[DO] 2 雛形を **完全踏襲**:
- 関数名: `getAdminEmails` / `safeSend` / `notifySubmitted` / `notifyApproved` / `notifyRejected`
- シグネチャ: handoff §[DO] 2 提示通り
- 件名フォーマット: `[申請]` / `[承認]` / `[差戻し]` プレフィックス
- 本文構造: 4 主要フィールド埋め込み、改行入り plain text
- try-catch 構造: ヘルパー内で吸収、throw しない

逸脱なし。

### 2.2 `safeSend` / `getAdminEmails` の throw 不在の論拠

| 関数 | try-catch | catch 内動作 | 呼出元への影響 |
|---|---|---|---|
| `getAdminEmails` | あり | `console.warn` + 空配列 return | safeSend 側で「empty recipient list」として skip、SendEmail 呼ばれず |
| `safeSend` | あり | `console.warn` のみ | 呼出元に例外伝播しない |
| `notifySubmitted` | なし（getAdminEmails + safeSend のみ呼出） | - | 内部関数が throw しないので外に出ない |
| `notifyApproved` | なし（safeSend のみ呼出） | - | 同 |
| `notifyRejected` | なし（safeSend のみ呼出） | - | 同 |

→ 4 form / ReportDetail / Approval の `try / finally` を破壊しない構造を二重ガード（getAdminEmails + safeSend）で保証。

### 2.3 呼出元の await セマンティクス

handoff §[DO] 3-7 通り、呼出元はすべて `await notifyXxx(...)` する。これは:
- ヘルパー内のロジック（log 出力含む）が呼出元の次の処理（`navigate` / `setSelected(null)` / `loadReports`）より前に完了することを保証
- ただしヘルパーが throw しないため、実質「待つだけで失敗ハンドリングは不要」
- fire-and-forget セマンティクスを log のみで実現

代案として `void notifyXxx(...)` で完全 fire-and-forget にする選択肢もあるが、handoff 雛形が `await` を採用しており、ログ出力タイミングの予測可能性のため採用しない。

### 2.4 一括承認時の Promise.all

handoff §[DO] 6 通り、`Promise.all(targets.map(t => notifyApproved({...})))`。

- 各 `notifyApproved` は throw しないため `Promise.all` は reject しない
- 大量一括承認時の SendEmail 並列実行は Base44 レート制限に到達する可能性があるが、A5 スコープではシリアル化しない（最小実装）
- 並列化により、N 件の通知が SendEmail RTT × 1（ベスト）〜 N×RTT（ワースト）で完了

### 2.5 一括承認 / 単件承認の target 事前確保

`loadReports()` 後は `reports` state が新しい配列で置換されるため、承認した report は `status='申請中'` 一覧から消える。通知のために事前確保が必要:

| Handler | target 取得 |
|---|---|
| `handleApprove(reportId)` | `reports.find(r => r.id === reportId)` を Report.update 前に取得 |
| `handleBulkApprove` | `reports.filter(r => selectedIds.includes(r.id))` を Report.update 前に取得 |
| `handleReject` | `selected` state は handler 開始時の参照を変数 `target` にコピー |
| `ReportDetail.handleSubmit` | `report` state + `id` (useParams) で構築。Report.update / setReport 後でも `id` は不変、`report` state は新しいオブジェクトに置換されるが旧参照が `if (report)` ガードで使える |

### 2.6 申請通知の対象 trigger（4 form + ReportDetail）

- 4 form `handleSubmit(status='申請中')`: フォームから「申請する」を直接押下した経路（create or edit）
- ReportDetail.handleSubmit: 一度「下書き」保存後にレポート詳細画面から「申請する」を押下した経路（または差戻し後の「再申請する」）

両経路で `notifySubmitted` を呼ぶことで、ユーザーの操作経路に依存しない通知保証。

### 2.7 件名・本文に含めない情報（情報漏洩防止）

handoff DO NOT「通知件名・本文に Report の `business_content` や AI 生成テキストを含めること」遵守。本実装の件名・本文には:

- 含む: `report_number` / `report_type` / `created_by_name` / `total_amount` / `approver_name`（該当時）/ `rejection_reason`（該当時）
- 含めない: `business_content` / `generated_report_text` / `generated_settlement_text` / `destination_*` / 領収書 URL / その他自由記述

メール本文の概要レベルに留め、詳細は申請詳細画面で確認させる設計。

### 2.8 HTML body 不使用

handoff DO NOT「通知本文を HTML body にすること」遵守。plain text の改行入り。

---

## 3. trigger 別の改修詳細

### 3.1 4 form（DayTripForm / OvernightTripForm / OverseasTripForm / FieldworkForm）

各 form に共通の追加パターン:

**import 追加（1 行）:**
```js
import { notifySubmitted } from '@/lib/notifications';
```

**handleSubmit 内の Report.create/update 後・navigate 前（3 行追加）:**
```js
if (status === '申請中') {
  await notifySubmitted({ report: { ...data, id: saved.id } });
}
```

詳細:
- 挿入位置は handoff §[DO] 3 通り、create/update 分岐の **後**・`navigate(...)` の **直前**
- `status === '下書き'` の場合は通知しない（業務上、下書き保存で通知不要）
- `{ ...data, id: saved.id }` で送信した data に `saved.id` を merge してヘルパーに渡す
- 4 form すべて同一パターン（DRY ではなく素朴複製、handoff DO NOT「ヘルパー外で SendEmail 直接呼出」遵守のための統一）

### 3.2 ReportDetail.jsx

**import 追加（1 行）:**
```js
import { notifySubmitted } from '@/lib/notifications';
```

**handleSubmit 内、setReport 後・setSubmitting 前（3 行追加）:**
```js
if (report) {
  await notifySubmitted({ report: { ...report, status: '申請中', id } });
}
```

詳細:
- `report` は state 由来（更新前の旧参照を `if (report)` ガードで使う）
- `id` は `useParams` 由来（不変）
- `status: '申請中'` を明示的に merge（state 更新は setReport で完了しているが、旧参照を使うため明示）

### 3.3 Approval.jsx

**import 追加（1 行）:**
```js
import { notifyApproved, notifyRejected } from '@/lib/notifications';
```

**handleApprove 改修:**
```diff
- const handleApprove = async (reportId) => {
-   setProcessing(true);
-   await base44.entities.Report.update(reportId, { ... });
-   await loadReports();
-   setSelected(null);
-   setProcessing(false);
- };

+ const handleApprove = async (reportId) => {
+   setProcessing(true);
+   const target = reports.find(r => r.id === reportId);   // ← 通知のため事前確保
+   await base44.entities.Report.update(reportId, { ... });
+   if (target) {
+     await notifyApproved({ report: target, approverName: user?.full_name });
+   }
+   await loadReports();
+   setSelected(null);
+   setProcessing(false);
+ };
```

**handleReject 改修:**
```diff
+ const target = selected;                  // ← state 由来、handler 内で変更前に確保
+ const reason = rejectionReason;           // ← 同
  await base44.entities.Report.update(selected.id, { ... });
+ if (target) {
+   await notifyRejected({
+     report: target,
+     approverName: user?.full_name,
+     rejectionReason: reason,
+   });
+ }
  await loadReports();
  setSelected(null);
  setShowRejectDialog(false);
  setRejectionReason('');                   // ← この後で reset されても変数 reason は不変
  setProcessing(false);
```

**handleBulkApprove 改修:**
```diff
+ const targets = reports.filter(r => selectedIds.includes(r.id));   // ← 通知のため事前確保
  for (const id of selectedIds) {
    await base44.entities.Report.update(id, { ... });
  }
+ await Promise.all(
+   targets.map(target =>
+     notifyApproved({ report: target, approverName: user?.full_name })
+   )
+ );
  setSelectedIds([]);
  await loadReports();
  setProcessing(false);
```

---

## 4. Regression 検証

### 4.1 通知失敗時の status 遷移維持（論理確認）

ヘルパー内 try-catch 構造によるガード:

| 失敗ケース | 発生箇所 | 影響範囲 |
|---|---|---|
| `User.filter` が throw | `getAdminEmails` 内 try-catch | catch で空配列 return → safeSend が「empty recipient list」で skip → notifySubmitted 正常完了 → 呼出元の `navigate` 実行 ✅ |
| `User.filter` が空配列 / null 返却 | `getAdminEmails` のフィルタ | 空配列 return → 上記同経路 ✅ |
| `SendEmail` が throw | `safeSend` 内 try-catch | catch で console.warn のみ → 呼出元に例外伝播せず → `try / finally` 正常完了 ✅ |
| `created_by_email` が undefined / null | `notifyApproved` / `notifyRejected` の `to` | safeSend の `!to` ガードで skip → 呼出元正常完了 ✅ |
| Promise.all 内のいずれかが reject | `handleBulkApprove` | 各 notifyApproved が throw しないため Promise.all 自体が reject しない → 全件 status 更新後に正常完了 ✅ |

### 4.2 4 form の動作（静的・grep 確認）

| Form | `import notifySubmitted` | `if (status === '申請中')` 内呼出 | create/update 分岐の **後**・navigate **前** |
|---|---|---|---|
| DayTripForm | ✅ L16 | ✅ | ✅ |
| OvernightTripForm | ✅ L17 | ✅ | ✅ |
| OverseasTripForm | ✅ L16 | ✅ | ✅ |
| FieldworkForm | ✅ L15 | ✅ | ✅ |

| Form | 下書き保存（通知なし） | 申請保存（通知あり） | edit→下書き（通知なし） | edit→申請（通知あり） |
|---|---|---|---|---|
| DayTrip | ✅ 条件式により skip | ✅ 呼出 | ✅ skip | ✅ 呼出 |
| Overnight | ✅ | ✅ | ✅ | ✅ |
| Overseas | ✅ | ✅ | ✅ | ✅ |
| Fieldwork | ✅ | ✅ | ✅ | ✅ |

### 4.3 ReportDetail.jsx の動作（静的・grep 確認）

| ケース | 動作 |
|---|---|
| 下書きから「申請する」 | `handleSubmit` → Report.update → setReport → `if (report)` ガード通過 → notifySubmitted ✅ |
| 差戻しから「再申請する」 | 同経路（ボタン label のみ異なる） ✅ |
| 申請中（canEdit=false） | `handleSubmit` 自体が呼ばれない（UI 上ボタン非表示） |
| 承認済（canEdit=false） | 同 |

### 4.4 Approval.jsx の動作（3 trigger）

| Handler | 通知 | grep 確認 |
|---|---|---|
| `handleApprove` | `notifyApproved` | ✅ Report.update **後** に存在 |
| `handleReject` | `notifyRejected` (with rejectionReason) | ✅ Report.update **後** に存在、`rejectionReason` を本文に渡す |
| `handleBulkApprove` | `Promise.all(notifyApproved)` | ✅ for-loop Report.update **後** に存在 |

### 4.5 件名・本文の Report 値埋め込み（grep 確認）

| 通知 | 件名 | 本文必須項目 |
|---|---|---|
| notifySubmitted | `[申請] {report_number} {report_type} - {created_by_name}` | `created_by_name`, `report_number`, `report_type`, `total_amount` |
| notifyApproved | `[承認] {report_number} {report_type}` | `created_by_name`, `report_type`, `report_number`, `approverName`, `total_amount` |
| notifyRejected | `[差戻し] {report_number} {report_type}` | `created_by_name`, `report_type`, `report_number`, `rejectionReason`, `approverName`, `total_amount` |

handoff DONE CRITERIA #14-16 すべて満たす。

### 4.6 SendEmail / entities.User の DRY 確認

`grep -rnE "SendEmail|entities\.User" src/` 実測:

```
src/HANDOFF.md:44, 320, 331       (markdown docs 言及、コード呼出ではない)
src/lib/notifications.js:6, 8, 23, 30, 32   (SendEmail コメント + 呼出 1 + log 2)
src/lib/notifications.js:13       (entities.User.filter 呼出 1)
```

→ コード上の SendEmail 呼出は `src/lib/notifications.js` の 1 箇所のみ、`entities.User` 呼出も同 1 箇所のみ。handoff DO NOT「ヘルパー外で SendEmail / User.filter を呼出」完全遵守。

### 4.7 A4 / A3 成果物の不変性

| 成果物 | A5 での touch | 結果 |
|---|---|---|
| `src/hooks/useReceiptParser.js`（A4） | なし | ✅ git diff 出力空 |
| `src/components/forms/ReceiptUploaderSection.jsx`（A4） | なし | ✅ git diff 出力空 |
| `src/lib/reportGenerator.js`（A4 強化） | なし | ✅（A4 commit 待ちで working tree に残存、本 A5 では touch なし） |
| `src/pages/ReportEdit.jsx`（A3） | なし | ✅（A3 commit 待ち、本 A5 では touch なし） |
| `src/App.jsx` の Routes（A3） | なし | ✅（A3 commit 待ち、本 A5 では touch なし） |
| 4 form の edit モード分岐（A3） | なし、handleSubmit に通知ロジックのみ追加 | ✅ 既存分岐温存 |

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

→ errors=0, warnings=**3**（A4 完了時点と完全一致、handoff DONE CRITERIA #1 を満たす）。

注: ReportDetail.jsx の warning 行番号が L65 → L66 にシフト（A5 で `import notifySubmitted` 行を追加したため）。`isAdmin` 自体は不変、warning メッセージも不変。

A5 で新規導入したコード（notifications.js、4 form / ReportDetail / Approval の通知呼出）には warning は発生していない。

### 5.3 `npm run build`

```
$ npm run build
> base44-app@0.0.0 build
> vite build

[base44] Proxy not enabled (VITE_BASE44_APP_BASE_URL not set)
exit=0

$ ls -la dist/index.html
-rw-r--r--  1 taaa_14  staff  1508  6  8 14:50 dist/index.html
```

→ build 成功、1508 bytes。

### 5.4 `git diff --stat`

```
.claude-team/current-phase.txt             |   2 +-
src/App.jsx                                |   2 +    (A3 由来、未 commit)
src/components/forms/DayTripForm.jsx       | 118 +++++++++++---   (A3 + A4 + A5)
src/components/forms/FieldworkForm.jsx     | 254 +++++++++++------ (A4 + A5)
src/components/forms/OvernightTripForm.jsx | 114 ++++++++++---   (A3 + A4 + A5)
src/components/forms/OverseasTripForm.jsx  | 101 ++++++++++--   (A3 + A4 + A5)
src/lib/reportGenerator.js                 |  25 ++-   (A4 由来、未 commit)
src/pages/Approval.jsx                     |  26 +++   (A5)
src/pages/ReportDetail.jsx                 |  15 +-   (A3 編集ボタン + A5 通知)
```

加えて untracked:
```
src/lib/notifications.js                          (A5 新規)
src/components/forms/ReceiptUploaderSection.jsx   (A4 未 commit)
src/hooks/useReceiptParser.js                     (A4 未 commit)
src/pages/ReportEdit.jsx                          (A3 未 commit)
.claude-team/review-packages/review-package-A3.md (A3 未 commit)
.claude-team/review-packages/review-package-A4.md (A4 未 commit)
.claude-team/review-packages/review-package-A5.md (本ファイル)
```

A3 / A4 / A5 がすべて累積で working tree に残存（A2 commit 以降 commit なし）。§7 で 1 commit 集約方針を提示。

---

## 6. Review Agent への質問・申し送り（MVP 達成所感を含む）

### 1. A3 + A4 + A5 を 1 commit に集約する判断（前 review-package-A4 §6 Q1 継承）

A3 / A4 / A5 が累積で commit 待ち。各フェーズの verdict は APPROVED 済だが、Implementation Agent は handoff §[DO NOT]「`git commit` の実行」遵守で commit していない。

選択肢:
- (a) A3 + A4 + A5 を 1 commit に集約（提案、§7 はこの方針で staging 案）
- (b) A3 → A4 → A5 の独立 3 commits に分割（A4 review-package §6 Q1 (b) と同方針）
- (c) A4 までと A5 で分割（A4 で MVP 5 要件 4 達成 → A5 で MVP 全完了の節目で分ける）

A5 が MVP 達成最終フェーズであり、commit を 1 件に集約する場合は「MVP 完成 commit」として節目を明示できる。判定は Owner に委ねる。

### 2. `Promise.all` の SendEmail レート制限懸念

handoff §[DO] 6 通り、`handleBulkApprove` 内で `Promise.all(targets.map(notifyApproved))` で並列発火。大量一括承認時（例: 100 件）に Base44 SendEmail のレート制限に到達する可能性がある。

選択肢:
- (a) 現状維持（A5 最小実装、レート制限到達は notify 失敗として log のみ）
- (b) チャンク化（例: 10 件並列 × 複数回）
- (c) 完全シリアル化（for-loop で await）

handoff §[DO] 6 注「シリアル化しない（最小実装、A6+ で必要に応じて再検討）」を遵守。本フェーズでは (a)。

### 3. handoff 雛形からの逸脱なし

verdict-A4 §7.1 改善反映として handoff §[DO] 12「雛形からの変更点と理由を明示」を確認。本実装は雛形を完全踏襲しており **逸脱なし**。§2.1 で明示。

### 4. `entities.User` の戻り値仕様依存

`getAdminEmails` は `await base44.entities.User.filter({ role: 'admin' })` の戻り値が `[{email: 'xxx@yyy.zz', ...}, ...]` 形式であることを前提に `.map(u => u?.email).filter(...)` する。

- Base44 SDK の User entity schema が `email` フィールドを持つ前提は HANDOFF.md L259 で確認済
- 戻り値が `null` / `undefined` / 例外時は try-catch + `(admins || [])` で空配列フォールバック

Review Agent が SDK 仕様の詳細確認を希望する場合は別途指示願う。

### 5. lint warnings 3 件（A4 baseline 不変、ReportDetail 行番号のみシフト）

`Login.jsx err` / `ReportDetail.jsx isAdmin`（L65 → L66 にシフト、内容不変）/ `ReportNew.jsx navigate` の 3 件は A0.1 から不変。A5 では DO NOT「ReportDetail 以外への touch なし」「import 追加のみ」遵守のため対応せず。次フェーズ判断対象。

### 6. 実機検証は Owner 分担（verdict-A4 §7.2 継承）

ブラウザ + Base44 sandbox での SendEmail 実発火検証は本 Implementation Agent のスコープ外。Owner / Review Agent が実機検証する場合の手順:

1. 申請者ロールで 4 form のいずれかから「申請する」→ 管理者宛 `[申請]` 件名メール受信を確認
2. 管理者ロールで Approval から単件「承認」→ 申請者宛 `[承認]` 件名メール受信を確認
3. 管理者ロールで Approval から「差戻し」→ 申請者宛 `[差戻し]` 件名メール受信（差戻し理由含む）を確認
4. ReportDetail から「申請する」→ 管理者宛 `[申請]` 件名メール受信を確認
5. Approval から複数選択 → 「一括承認」→ 申請者各々に `[承認]` 件名メール受信を確認

### 7. MVP 達成所感

handoff 末尾「MVP 達成」セクション通り、A5 完了で goal.md MVP 達成定義 4 要件すべて満たされる:

| # | 達成定義 | 達成フェーズ | 実装場所 |
|---|---|---|---|
| 1 | 全 4 種別フォームで領収書 AI 仕分けが使える | A4 ✅ | `src/hooks/useReceiptParser.js` + `src/components/forms/ReceiptUploaderSection.jsx` + 4 form |
| 2 | 申請・承認・差戻しのライフサイクル変化が当事者にメール通知される | **A5（本フェーズ）** ✅ | `src/lib/notifications.js` + 6 trigger 経路 |
| 3 | 申請中/承認済レポートを申請者が編集できる | A3 ✅ | `src/pages/ReportEdit.jsx` + `src/App.jsx` route + 4 form の mode prop |
| 4 | 既知の `receiptData` 並列不整合が解消されている | A1 ✅ | `src/components/forms/FieldworkForm.jsx` の receipts 単一 SOT（A4 で hook 化） |

加えて A0/A0.1（チーム開発インフラ）と A2（4 form 1日1件チェック）がベースラインとして寄与。

A6〜A8 は MVP 後の運用品質向上（月次自動集計 / 多段階承認 / PWA 化）として roadmap 通り進める。

### 8. Approval.jsx の `handleReject` で `rejectionReason` を変数化した理由

handoff §[DO] 7 雛形では `rejectionReason: rejectionReason` を直接渡しているが、本実装では `const reason = rejectionReason` と先に変数化してから渡している。

理由: `handleReject` 末尾の `setRejectionReason('')` が `await notifyRejected` 完了より先に走る可能性（同期 setState のため）はないが、可読性のため「ヘルパー呼出時の `rejectionReason` 値」と「ヘルパー完了後にリセットされる state」を変数で明確に分離した。

機能的には等価。Review Agent が雛形完全準拠を望む場合は `const reason = ...` を削除して `rejectionReason: rejectionReason` に戻すことが可能。

---

## 7. コミット方針

handoff §[DO] 11 / §[DO NOT]「`git commit` の実行（Review verdict 後の Owner 操作）」遵守、**本 Implementation Agent は commit を実行しない**。

§6 Q1 の通り A3 / A4 / A5 が累積で commit 待ち。本提案は **A3 + A4 + A5 を 1 commit に集約**（MVP 完成 commit）。

### 7.1 ステージング対象ファイル一覧

```bash
git add \
  src/App.jsx \
  src/pages/ReportEdit.jsx \
  src/pages/ReportDetail.jsx \
  src/pages/Approval.jsx \
  src/components/forms/DayTripForm.jsx \
  src/components/forms/OvernightTripForm.jsx \
  src/components/forms/OverseasTripForm.jsx \
  src/components/forms/FieldworkForm.jsx \
  src/components/forms/ReceiptUploaderSection.jsx \
  src/hooks/useReceiptParser.js \
  src/lib/reportGenerator.js \
  src/lib/notifications.js \
  .claude-team/current-phase.txt \
  .claude-team/review-packages/review-package-A3.md \
  .claude-team/review-packages/review-package-A4.md \
  .claude-team/review-packages/review-package-A5.md
```

合計 16 ファイル:
- A3 由来: App.jsx, ReportEdit.jsx, ReportDetail.jsx, review-package-A3.md（4 ファイル）
- A4 由来: ReceiptUploaderSection.jsx, useReceiptParser.js, reportGenerator.js, review-package-A4.md（4 ファイル）+ 4 form 改修（A3 と一部重複）
- A5 由来: notifications.js, Approval.jsx, ReportDetail.jsx 追記, 4 form 通知呼出追加, review-package-A5.md（重複含む）
- メタ: current-phase.txt（A2 → A5、各 verdict で Review Agent が更新済）

### 7.2 コミットメッセージ案

```
feat(A3+A4+A5): MVP complete — edit, receipts AI, notifications

A3 — Report edit route /reports/:id/edit (P0 #1)
- new src/pages/ReportEdit.jsx mounts the matching form in
  mode='edit' with initialReport
- new route in App.jsx; ReportDetail.jsx gains 「編集する」 button
- 4 forms get { mode='create', initialReport=null } props with
  useState initializer branch, handleGenerate self-exclude,
  handleSubmit create/update branch
- FieldworkForm restores receipts from initialReport.receipt_urls

A4 — Receipts AI rolled out + settlement-heading + amount-zero
- new src/hooks/useReceiptParser.js: single-SOT receipts +
  UploadFile→InvokeLLM pipeline; amount guard upgraded to
  typeof === 'number' && Number.isFinite && > 0
- new src/components/forms/ReceiptUploaderSection.jsx extracts
  the receipt UI; capture="environment" preserved
- FieldworkForm refactored to consume hook + section
- DayTrip / Overnight (CATEGORY_MAP_TRIP, fallback
  other_transport_fee) and Overseas (CATEGORY_MAP_OVERSEAS, fallback
  other_transport_fee) gain receipt AI via the hook + section
- reportGenerator.js: STYLE_RULES gain explicit settlement-heading
  fix-form directives; split logic replaced by
  SETTLEMENT_HEADING_RE = /^##\s*(旅費精算書|経費精算書)\s*$/m
- 3 forms send receipt_urls in handleGenerate's reportData,
  handleSubmit's data, and ReportPreview's prop

A5 — Lifecycle email notifications (P0 #3, MVP item #2)
- new src/lib/notifications.js with safeSend / getAdminEmails /
  notifySubmitted / notifyApproved / notifyRejected; all helpers
  swallow SendEmail and User.filter failures via try-catch so the
  caller's status transition is never blocked
- 4 forms call notifySubmitted in handleSubmit when status==='申請中'
  (covers both create and edit modes via mode-aware data merge)
- ReportDetail.handleSubmit calls notifySubmitted after Report.update
- Approval.handleApprove / handleBulkApprove call notifyApproved
  (bulk version uses Promise.all over targets captured pre-update)
- Approval.handleReject calls notifyRejected with rejection_reason
- subject prefixes [申請] / [承認] / [差戻し]; body contains
  report_number, report_type, created_by_name, total_amount, and
  approver_name / rejection_reason when applicable
- no business_content, AI-generated text, or receipt URLs in
  email body (information leak prevention, plain text only)

MVP達成: goal.md 4 requirements all satisfied
  #1 receipts AI for all 4 form types (A4)
  #2 email notification on submit/approve/reject (A5)
  #3 edit drafts and rejected reports (A3)
  #4 receiptData parallel integrity resolved (A1)

current-phase.txt: A2 -> A5 (set by Review Agents at A3/A4/A5
verdicts; included to match working tree)

Phase: A5 (Implementation Verdict Gate pending)
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### 7.3 注意事項

| 項目 | 遵守 |
|---|---|
| `git push` 禁止 | ✅ Owner 操作時も push しない（handoff §[DO NOT]「`git push`」） |
| `--no-verify` 禁止 | ✅ pre-commit hook はそのまま走らせる |
| `--amend` 禁止 | ✅ 既存 4 コミット（`d5d65a0`/`c097d20`/`70b44f6`/`cba5861`）への amend しない |
| `lint:fix` 禁止 | ✅ 実行していない |
| 1 commit のみ | ✅ A3+A4+A5 を 1 件に集約（§6 Q1 (a)） |

### 7.4 commit 後の検証コマンド（プレースホルダ自己マッチ回避: 分割表記、handoff §[DO] 12 / verdict-A3 §6.1 改善反映）

```bash
git log --oneline | head -5
git status --short
git rev-list --count origin/main..HEAD
npm run lint
npm run build
# プレースホルダ充填チェック（変数化で文字列分割、自己マッチ回避）
TOKEN="AUTO-""FILL:"; grep -c "$TOKEN" .claude-team/review-packages/review-package-A5.md  # 期待値: 0
# A5 で新規導入の SendEmail / entities.User が notifications.js のみで使われているか
grep -rn "SendEmail" src/ --include="*.js" --include="*.jsx"
grep -rn "entities.User" src/ --include="*.js" --include="*.jsx"
```
