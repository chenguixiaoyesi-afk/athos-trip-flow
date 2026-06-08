# Design Handoff — Phase A5

From: Design Agent
To: Implementation Agent（※ Design Review Gate 通過後のみ起動可）
Date: 2026-06-08
Goal 正本: `.claude-team/goal.md`
Roadmap 正本: `.claude-team/roadmap.md`
直近 verdict: `.claude-team/verdicts/verdict-A4.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A5）
A4 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A4.md`

本 handoff は roadmap.md の A5 行と verdict-A4 §10.6 の指示を 9 ブロック仕様に整形したもの。verdict-A4 §7.1（Review Package で handoff 雛形からの逸脱明示）、§7.2（実機検証 Owner 分担）、§7.3〜§7.5（lint warnings / `useCanEdit` / CATEGORY_MAP 共通化はスコープ外、roadmap 改訂判断）を反映済み。

**A5 = MVP 達成最終フェーズ**（goal.md MVP 達成定義 #2 を達成）。

---

## 【CURRENT PHASE】

**A5 — 承認: メール通知（申請/承認/差戻し）**

業務フローの「承認」レイヤで、ライフサイクル変化（申請/承認/差戻し）を当事者にメール通知する。これまでは UI 上のステータス変化のみで、承認者・申請者ともにポーリング前提となっていた。本フェーズで `base44.integrations.Core.SendEmail` を使った非同期通知を組み込み、通知失敗が status 遷移をブロックしない構造で実装する。

**MVP 達成定義 #2 を本フェーズで達成。A1〜A4 で達成済の #1 #3 #4 と合わせて MVP 4 要件すべて完了する。**

---

## 【OBJECTIVE】

1. `src/lib/notifications.js` を新規作成し、3 つの通知ヘルパーを集約:
   - `notifySubmitted({ report })` — 申請者 → 全管理者
   - `notifyApproved({ report, approverName })` — 承認者 → 申請者
   - `notifyRejected({ report, approverName, rejectionReason })` — 承認者 → 申請者
2. 3 つのトリガー経路に通知呼出を組み込む:
   - 申請（4 form の `handleSubmit` で `status='申請中'` 時 + `ReportDetail.handleSubmit` の status 遷移時）
   - 承認（`Approval.handleApprove` + `Approval.handleBulkApprove`）
   - 差戻し（`Approval.handleReject`）
3. メール送信失敗時もレポートの status 遷移は **必ず成立** する（ヘルパー内 try-catch で失敗を吸収）
4. 件名・本文に `report_number` / `report_type` / `total_amount` / `created_by_name` / `approver_name`（該当時）/ `rejection_reason`（該当時）を埋め込む
5. 管理者宛通知の宛先は `base44.entities.User.filter({ role: 'admin' })` で動的取得

---

## 【SCOPE】

A5 の作業範囲は以下に **厳密に限定**:

| カテゴリ | 内容 |
|---|---|
| 新規ファイル | `src/lib/notifications.js`（3 通知ヘルパー） |
| 改修 1: 申請 trigger | 4 form の `handleSubmit` 内、`status === '申請中'` 時に `notifySubmitted` 呼出 |
| 改修 2: 申請 trigger | `ReportDetail.jsx` の `handleSubmit` 内、Report.update 後に `notifySubmitted` 呼出 |
| 改修 3: 承認 trigger | `Approval.jsx` の `handleApprove` / `handleBulkApprove` 内、Report.update 後に `notifyApproved` 呼出 |
| 改修 4: 差戻し trigger | `Approval.jsx` の `handleReject` 内、Report.update 後に `notifyRejected` 呼出 |
| 文書化 | `review-package-A5.md` に設計判断（管理者宛先の動的取得 / 失敗時の挙動 / 件名・本文の I18N 配慮なし）と検証手順 |

### 非対象（DO NOT で詳述）
- 多段階承認（HANDOFF.md P2 #8、ロードマップ外）
- メール通知 ON/OFF UI 切替
- メール送信履歴の DB 永続化
- 通知テンプレ管理 UI
- Slack / Teams / Web Push 連携
- 通知失敗時の status 遷移ブロック
- 通知の i18n 対応

---

## 【DO】

### 1. 現状把握（A5 開始時の grep で行番号確定 / verdict-A3 §6.1 改善提案 1 継続適用）

実装着手前に以下を grep / Read で確認し、Review Package §1 に転記:

| 観点 | 確認方法 | 期待 |
|---|---|---|
| 4 form の handleSubmit | `grep -n "const handleSubmit" src/components/forms/*.jsx` | 各 form で `handleSubmit(status)` シグネチャ、`Report.create` / `Report.update` 分岐（A3 成果）が存在 |
| ReportDetail の handleSubmit | `grep -n "const handleSubmit" src/pages/ReportDetail.jsx` | L68 周辺の `Report.update(id, { status: '申請中' })` |
| Approval の 3 handler | `grep -n "const handle" src/pages/Approval.jsx` | L39 `handleApprove` / L51 `handleReject` / L65 `handleBulkApprove` |
| `base44.integrations.Core.SendEmail` API | `grep -rn "SendEmail" src/` | ヒット 0（A5 で初導入） |
| `base44.entities.User` API | `grep -rn "entities.User" src/` | ヒット 0 もしくは `auth.me()` のみ |

行番号は本 handoff 起草時点（A4 commit 前）の状態。A5 開始時に grep 再確認すること（verdict-A3 §6.1 継続）。

### 2. `src/lib/notifications.js` 新規作成

完全実装ではなく **シグネチャと内部構造** を以下のように設計:

```js
import { base44 } from '@/api/base44Client';

// 共通: 管理者一覧の取得（失敗時は空配列を返し、呼出元の status 遷移をブロックしない）
async function getAdminEmails() {
  try {
    const admins = await base44.entities.User.filter({ role: 'admin' });
    return (admins || [])
      .map(u => u?.email)
      .filter(email => typeof email === 'string' && email.includes('@'));
  } catch (e) {
    console.warn('[notifications] Failed to fetch admin emails', e);
    return [];
  }
}

// 共通: 安全な SendEmail 呼出（throw しない、log のみ）
async function safeSend({ to, subject, body }) {
  if (!to || (Array.isArray(to) && to.length === 0)) {
    console.warn('[notifications] Skipped: empty recipient list');
    return;
  }
  try {
    await base44.integrations.Core.SendEmail({ to, subject, body });
  } catch (e) {
    console.warn('[notifications] SendEmail failed', e);
    // 意図的に rethrow しない（呼出元の status 遷移を守る）
  }
}

// 申請通知（申請者 → 全管理者）
export async function notifySubmitted({ report }) {
  const adminEmails = await getAdminEmails();
  const subject = `[申請] ${report.report_number} ${report.report_type} - ${report.created_by_name}`;
  const body = `${report.created_by_name} さんから ${report.report_type} の申請がありました。

報告書番号: ${report.report_number}
種別: ${report.report_type}
申請者: ${report.created_by_name}
合計支給額: ¥${(report.total_amount || 0).toLocaleString()}

承認管理画面でご確認ください。`;
  await safeSend({ to: adminEmails, subject, body });
}

// 承認通知（承認者 → 申請者）
export async function notifyApproved({ report, approverName }) {
  const to = report?.created_by_email;
  const subject = `[承認] ${report.report_number} ${report.report_type}`;
  const body = `${report.created_by_name} さん

${report.report_type}（${report.report_number}）の申請が承認されました。

承認者: ${approverName || '（不明）'}
合計支給額: ¥${(report.total_amount || 0).toLocaleString()}

詳細は申請詳細画面でご確認ください。`;
  await safeSend({ to, subject, body });
}

// 差戻し通知（承認者 → 申請者、差戻し理由を本文に含む）
export async function notifyRejected({ report, approverName, rejectionReason }) {
  const to = report?.created_by_email;
  const subject = `[差戻し] ${report.report_number} ${report.report_type}`;
  const body = `${report.created_by_name} さん

${report.report_type}（${report.report_number}）の申請が差戻されました。

差戻し理由:
${rejectionReason || '（理由未指定）'}

承認者: ${approverName || '（不明）'}
合計支給額: ¥${(report.total_amount || 0).toLocaleString()}

申請詳細画面から内容を修正し、再申請してください。`;
  await safeSend({ to, subject, body });
}
```

**重要な設計判断**:
- ヘルパーは **throw しない**（safeSend 内で try-catch、log のみ）
- 呼出元は `await notifyXxx(...)` するが、戻り値や例外を待たない（fire-and-forget セマンティクスを log 経由で実現）
- `getAdminEmails` も失敗時は空配列フォールバック → SendEmail がスキップされる → log のみ残る
- 件名は `[申請] / [承認] / [差戻し]` プレフィックスで一覧での識別を容易化
- 本文は plain text で改行入り。HTML body は使わない（A5 スコープ最小化）

### 3. 申請 trigger の組み込み（4 form）

各 form の `handleSubmit` 関数末尾、`navigate(...)` の **直前** に以下を挿入:

```js
import { notifySubmitted } from '@/lib/notifications';

// （既存の handleSubmit 内）
const handleSubmit = async (status) => {
  setSaving(true);
  try {
    const data = { /* 既存 */ };
    let saved;
    if (mode === 'edit') {
      await base44.entities.Report.update(initialReport.id, data);
      saved = { id: initialReport.id };
    } else {
      saved = await base44.entities.Report.create(data);
    }
    // ↓ 追加: 申請時のみ通知
    if (status === '申請中') {
      await notifySubmitted({ report: { ...data, id: saved.id } });
    }
    navigate(`/reports/${saved.id}`);
  } finally {
    setSaving(false);
  }
};
```

注意点:
- `await notifySubmitted` は **失敗しない**（ヘルパー内 try-catch）。`finally` の `setSaving(false)` と `navigate` は必ず実行される
- `status === '下書き'` 時は通知しない（業務上、下書き保存で通知は不要）
- 4 form すべてで同じ pattern。`{ report }` に渡すオブジェクトは送信した `data` + `saved.id` を merge

### 4. 申請 trigger の組み込み（`ReportDetail.jsx`）

`ReportDetail.jsx` L68 の `handleSubmit` 関数:

```js
import { notifySubmitted } from '@/lib/notifications';

const handleSubmit = async () => {
  setSubmitting(true);
  await base44.entities.Report.update(id, { status: '申請中' });
  setReport(prev => ({ ...prev, status: '申請中' }));
  // ↓ 追加: 申請通知
  if (report) {
    await notifySubmitted({ report: { ...report, status: '申請中', id } });
  }
  setSubmitting(false);
};
```

注意点:
- 既存ロジックの `setReport(prev => ...)` の **後** に通知（state 更新後の最新 report を使う）
- `id` は `useParams` 由来、`report` は state 由来
- `await` するが失敗しない（ヘルパー内吸収）

### 5. 承認 trigger の組み込み（`Approval.jsx` の `handleApprove`）

```js
import { notifyApproved, notifyRejected } from '@/lib/notifications';

const handleApprove = async (reportId) => {
  setProcessing(true);
  // 通知のため、対象 report を事前に確保
  const target = reports.find(r => r.id === reportId);
  await base44.entities.Report.update(reportId, {
    status: '承認済',
    approver_name: user?.full_name,
    approved_date: new Date().toISOString().split('T')[0],
  });
  // ↓ 追加: 承認通知
  if (target) {
    await notifyApproved({ report: target, approverName: user?.full_name });
  }
  await loadReports();
  setSelected(null);
  setProcessing(false);
};
```

### 6. 承認 trigger の組み込み（`Approval.jsx` の `handleBulkApprove`）

```js
const handleBulkApprove = async () => {
  if (!confirm(`選択した${selectedIds.length}件を一括承認しますか？`)) return;
  setProcessing(true);
  // 通知のため、対象 reports を事前に確保
  const targets = reports.filter(r => selectedIds.includes(r.id));
  for (const id of selectedIds) {
    await base44.entities.Report.update(id, {
      status: '承認済',
      approver_name: user?.full_name,
      approved_date: new Date().toISOString().split('T')[0],
    });
  }
  // ↓ 追加: 承認通知（各 report に対して並列発火）
  await Promise.all(
    targets.map(target =>
      notifyApproved({ report: target, approverName: user?.full_name })
    )
  );
  setSelectedIds([]);
  await loadReports();
  setProcessing(false);
};
```

注意点:
- `Promise.all` の `notifyApproved` 呼出はすべて失敗しない（ヘルパー内吸収）。`Promise.all` が reject することはない
- 大量一括承認時の SendEmail 並列実行は Base44 側のレート制限に到達する可能性があるが、A5 スコープではシリアル化しない（最小実装、A6+ で必要に応じて再検討）

### 7. 差戻し trigger の組み込み（`Approval.jsx` の `handleReject`）

```js
const handleReject = async () => {
  if (!rejectionReason.trim()) return;
  setProcessing(true);
  // 通知のため、対象 report を事前に確保（selected は state、永続性あり）
  const target = selected;
  await base44.entities.Report.update(selected.id, {
    status: '差戻し',
    rejection_reason: rejectionReason,
  });
  // ↓ 追加: 差戻し通知
  if (target) {
    await notifyRejected({
      report: target,
      approverName: user?.full_name,
      rejectionReason: rejectionReason,
    });
  }
  await loadReports();
  setSelected(null);
  setShowRejectDialog(false);
  setRejectionReason('');
  setProcessing(false);
};
```

### 8. `current-phase.txt` の確認と自動補正

実装着手時に `current-phase.txt = A5` であることを確認。`A4` のままなら本 DO で `A5` に更新。`A6` 以降への更新は禁止。

### 9. ビルド / lint 検証

- `npm run lint` errors=0
- A4 完了時点の warnings 3 件（`Login.jsx err` / `ReportDetail.jsx isAdmin` / `ReportNew.jsx navigate`）から増加していないこと
- 新規 `notifications.js` で新たな warning が出ないこと
- `npm run build` 成功

### 10. Regression 検証

#### 10.1 通知失敗時の status 遷移維持
- `SendEmail` が失敗するモック条件（network エラー / 不正な to / etc.）でも、Report.update が完了し、UI 上の status 遷移が成立する
- 検証方法: ヘルパーの try-catch 構造をコード読解で確認 + Review Package §4 に論理確認として記録

#### 10.2 既存 4 form の動作
- create モード: 下書き保存（通知なし） / 申請保存（通知あり） → どちらも save → navigate
- edit モード: 下書き保存（通知なし） / 申請（通知あり） / 再申請（通知あり） → どちらも update → navigate

#### 10.3 既存 ReportDetail の動作
- 下書きから「申請する」 → status='申請中' + notifySubmitted
- 差戻しから「再申請する」 → 同上

#### 10.4 既存 Approval の動作
- 単件承認 / 単件差戻し / 一括承認 → status 更新後に notify 呼出
- 差戻し時のダイアログ入力 → rejection_reason がメール本文に含まれる

検証結果は Review Package §4 に記録（3 trigger × 状況の組み合わせで論理確認）。手動 UI 確認が困難な場合（Base44 サンドボックスで SendEmail を実発火させない場合）は、コードロジックの存在を grep で示し論理確認として §4 に明記する。

### 11. Commit 方針（verdict-A1 §8 改善提案 3 継続適用）

実コミットは **Review verdict 後の Owner 操作**で実行する。Implementation Agent は Review Package §7 に以下を記載:

- ステージング対象ファイル一覧
- コミットメッセージ案（例: `feat(A5): notify on report submission, approval, rejection`）
- 注意事項

### 12. verdict-A4 §7.1 改善提案: handoff 雛形からの逸脱明示

本 handoff に提示した雛形コード（§2 notifications.js / §3-§7 各 trigger）は **設計参考**。Implementation Agent が同等の機能を別構造（例: subject/body を form 別にカスタマイズ、ヘルパー名変更等）で実装する場合は、**Review Package §2 / §3 で「handoff 雛形からの変更点と理由」を明示** すること。

### 13. verdict-A4 §7.3-§7.5 改善提案: ロードマップ改訂判断はスコープ外

以下は A5 で扱わず、本 verdict 後の roadmap 改訂タイミングで Design Agent が判断する:
- lint warnings 3 件の処遇（A8 拡張 / 別軽量フェーズ / 放置）
- `useCanEdit` 抽出の独立フェーズ化
- CATEGORY_MAP_TRIP 共通化

A5 ではこれらに touch しない。

---

## 【DO NOT】

- 多段階承認（HANDOFF.md P2 #8、roadmap 外）
- メール通知 ON/OFF UI 切替
- メール送信履歴の DB 永続化（新規エンティティ作成禁止）
- 通知テンプレ管理 UI
- Slack / Teams / Web Push / SMS 連携
- 通知失敗時に Report.update を rollback すること
- 通知失敗時に throw / reject すること（呼出元の `try` / `finally` を破壊しない）
- 通知の i18n / 多言語対応
- 通知本文を HTML body にすること
- ヘルパー外（form / Approval / ReportDetail 内）で `base44.integrations.Core.SendEmail` を直接呼出すこと（DRY、ヘルパー経由のみ）
- ヘルパー外で `base44.entities.User.filter` を呼出すこと（getAdminEmails 経由のみ）
- 通知件名・本文に Report の `business_content` や AI 生成テキストを含めること（情報漏洩防止、A5 では概要のみ）
- A6 領域への侵食（月次自動集計の Base44 Automation 設定 / scheduled trigger）
- A8 領域への侵食（規程 PDF 関連）
- `useCanEdit` の抽出（roadmap 改訂判断）
- CATEGORY_MAP の共通化（roadmap 改訂判断）
- 新規ルート / 新規ページ / 新規エンティティ / 新規 hook
- `lib/reportGenerator.js` / `lib/policyContext.jsx` / `lib/AuthContext.jsx` の変更
- `src/api/base44Client.js` の変更
- `src/components/ui/*` の変更
- `src/components/forms/ReceiptUploaderSection.jsx` の変更（A4 成果物）
- `src/hooks/useReceiptParser.js` の変更（A4 成果物）
- `src/App.jsx` の変更
- `package.json` / `package-lock.json` の変更
- `eslint.config.js` / `vite.config.js` / `tailwind.config.js` の変更
- `npm run lint:fix` の実行
- `.claude-team/goal.md` / `.claude-team/roadmap.md` / `.claude-team/auto-handoff.md` / `.claude-team/README.md` / `.claude-team/templates/*` の変更
- `current-phase.txt` を `A6` 以降に更新
- `git push`
- `git commit` の実行（Review verdict 後の Owner 操作）
- `git commit --amend`
- `--no-verify` 等の hook スキップ
- `review-package-A5.md` でのプレースホルダ未充填での Review 起動

---

## 【FILES / AREAS】

### 変更可能
- `src/components/forms/DayTripForm.jsx`（import + handleSubmit に notifySubmitted 呼出 1 行）
- `src/components/forms/OvernightTripForm.jsx`（同）
- `src/components/forms/OverseasTripForm.jsx`（同）
- `src/components/forms/FieldworkForm.jsx`（同）
- `src/pages/ReportDetail.jsx`（import + handleSubmit に notifySubmitted 呼出 1 行）
- `src/pages/Approval.jsx`（import + handleApprove / handleReject / handleBulkApprove に notifyApproved / notifyRejected 呼出）

### 新規作成
- `src/lib/notifications.js`
- `.claude-team/review-packages/review-package-A5.md`

### メタ更新（任意）
- `.claude-team/current-phase.txt`（`A4` のままなら `A5` に更新可。`A6` 以降への更新は禁止）

### 参照のみ（変更しない）
- `.claude-team/verdicts/verdict-A4.md`
- `.claude-team/handoff/design-handoff-A4.md`
- `.claude-team/review-packages/review-package-A4.md`
- `.claude-team/roadmap.md` A5 行
- HANDOFF.md P0 #3
- `src/api/base44Client.js`（SendEmail / Users API の呼出元として）

### 触れてはいけない
- 上記「変更可能」以外の `src/**`
- `src/api/base44Client.js`
- `src/components/ui/*`
- `src/components/forms/ReceiptUploaderSection.jsx`
- `src/hooks/useReceiptParser.js`
- `src/lib/reportGenerator.js`
- `src/lib/policyContext.jsx`
- `src/lib/AuthContext.jsx`
- `src/pages/Summary.jsx`
- `src/pages/PolicyManagement.jsx`
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

- [ ] `npm run lint` errors=0、warnings は A4 完了時点（3 件）から増加していない
- [ ] `npm run build` 成功
- [ ] 新規 `src/lib/notifications.js` が存在
- [ ] `notifications.js` に `notifySubmitted` / `notifyApproved` / `notifyRejected` の 3 export が存在
- [ ] `notifications.js` 内で `base44.integrations.Core.SendEmail` が try-catch 内で呼ばれている
- [ ] `notifications.js` 内で `base44.entities.User.filter({ role: 'admin' })` または等価な管理者取得が try-catch 内で呼ばれている
- [ ] 4 form すべてに `notifySubmitted` の import が存在
- [ ] 4 form すべての `handleSubmit` で `status === '申請中'` 条件下に `notifySubmitted` 呼出が存在
- [ ] `ReportDetail.jsx` に `notifySubmitted` の import + `handleSubmit` 内呼出が存在
- [ ] `Approval.jsx` に `notifyApproved` / `notifyRejected` の import が存在
- [ ] `Approval.jsx` の `handleApprove` / `handleBulkApprove` / `handleReject` の Report.update **後** に対応する notify 呼出が存在
- [ ] 通知ヘルパーが throw しない構造（呼出元の status 遷移を破壊しない）が Review Package §4 で論理確認されている
- [ ] form 側 / Approval 側 / ReportDetail 側で `SendEmail` の直接呼出がない（grep で `SendEmail` のヒットが `notifications.js` のみ）
- [ ] `git diff --stat` の変更ファイルが許容範囲（6 改修 + 2 新規 + 任意の current-phase.txt）
- [ ] 件名に `[申請]` / `[承認]` / `[差戻し]` プレフィックスが含まれる
- [ ] 本文に `report_number` / `report_type` / `created_by_name` / `total_amount` が含まれる
- [ ] 差戻し本文に `rejectionReason` が含まれる
- [ ] 承認本文に `approverName` が含まれる
- [ ] 3 trigger × 状況の組み合わせが Review Package §4 に論理確認として記録されている
- [ ] `review-package-A5.md` の必須セクション（§1〜§7）すべて存在
- [ ] **プレースホルダ完全充填**: `grep -c "AUTO-""FILL:" review-package-A5.md` = `0`（分割表記）
- [ ] `current-phase.txt` の内容が `A5`
- [ ] `git push` 未実行
- [ ] commit 未実行（Review verdict 後の Owner 操作）

---

## 【REVIEW POINTS】

Review Agent は以下を確認:

1. **スコープ厳守**: 変更が「変更可能」リスト 6 ファイル + 新規 2 ファイル + メタ任意の範囲
2. **通知ヘルパーの集約**: 3 ヘルパーが `notifications.js` のみに存在し、呼出元（6 ファイル）で `SendEmail` 直接呼出がない
3. **失敗時の status 維持**: `safeSend` / `getAdminEmails` の try-catch 構造で、`SendEmail` / `User.filter` のいずれが失敗しても呼出元の `try/finally` が正常完了する
4. **3 trigger 経路の網羅**:
   - 申請: 4 form の `handleSubmit` (status='申請中') + `ReportDetail.handleSubmit` → 計 5 箇所
   - 承認: `Approval.handleApprove` + `Approval.handleBulkApprove`
   - 差戻し: `Approval.handleReject`
5. **件名・本文の Report 値埋め込み**: 4 主要フィールド + 該当時の approver / rejection_reason
6. **管理者宛先の動的取得**: `getAdminEmails` で `User.filter({ role: 'admin' })` 経由、ハードコード禁止
7. **A6 領域への侵食なし**: scheduled trigger / Base44 Automation 設定 / 月次集計関連の変更がない
8. **A8 領域への侵食なし**: `PolicyManagement.jsx` / 規程関連の変更がない
9. **A4 成果物の不変性**: `useReceiptParser` / `ReceiptUploaderSection` / `reportGenerator.js` への touch なし
10. **A3 成果物の不変性**: `ReportEdit.jsx` / `App.jsx` Routes / 4 form の edit モード分岐への touch なし
11. **REPOSITORY ISOLATION RULE 違反なし**: 差分・新規ファイル・review-package に参照禁止語彙が **参照前提として** 出現しないか
12. **handoff 雛形からの逸脱明示**: Implementation Agent が雛形（§2 notifications.js / §3-§7 各 trigger）から構造変更した場合、Review Package §2 / §3 にその理由が記載されている（verdict-A4 §7.1 改善反映）
13. **プレースホルダ完全充填**: `grep -c "AUTO-""FILL:" review-package-A5.md` = 0（分割表記）
14. **`git push` 未実行**
15. **commit 未実行**: Review verdict 後の Owner 操作を待つ、Review Package §7 に staging + メッセージ案完備

判定:
- 合格時: `.claude-team/verdicts/verdict-A5.md` に
  ```
  APPROVED
  PHASE COMPLETE
  NEXT PHASE: A6
  ```
  + `current-phase.txt` を `A6` に更新
  + **MVP 達成宣言**（goal.md MVP 達成定義 4 要件すべて完了）
- 不合格時: `REJECTED` + 修正要求
- 違反時: `REJECTED / FOREIGN CONTEXT DETECTED`

---

## 【NEXT PHASE DEPENDENCY】

A6（集計: 月次集計の自動配信）は以下を A5 に依存:

- A5 で確立した `notifications.js` の `safeSend` / SendEmail 呼出パターンを再利用する（A6 でも Base44 SendEmail を使うため、ヘルパー追加の形で拡張）
- A5 の getAdminEmails パターンが A6 の月次集計配信先取得の参考になる
- A5 の「失敗時もメイン処理を破壊しない」設計原則が A6 の scheduled trigger でも継承される

A6 の設計詳細は **A5 の Verdict（実装後ゲート）が APPROVED となった後に Design Agent が作成する**。本 handoff の時点では描かない（CURRENT PHASE のみ仕様化）。

---

## 【MVP 達成（参考、Review Agent はこのブロックを実装後ゲート判定時に確認）】

A5 完了時点で goal.md MVP 達成定義 4 要件すべてが満たされる:

| # | 達成定義 | 達成フェーズ |
|---|---|---|
| 1 | 全 4 種別フォームで領収書 AI 仕分けが使える | A4 ✅ |
| 2 | 申請・承認・差戻しのライフサイクル変化が当事者にメール通知される | **A5（本フェーズ）** |
| 3 | 申請中/承認済レポートを申請者が編集できる | A3 ✅ |
| 4 | 既知の `receiptData` 並列不整合が解消されている | A1 ✅ |

Review Agent は A5 の verdict に「MVP 達成」を明記することが望ましい。A6〜A8 は MVP 後の運用品質向上として位置づけられる。
