# Design Handoff — Phase A2

From: Design Agent
To: Implementation Agent（※ Design Review Gate 通過後のみ起動可）
Date: 2026-06-05
Goal 正本: `.claude-team/goal.md`
Roadmap 正本: `.claude-team/roadmap.md`
直近 verdict: `.claude-team/verdicts/verdict-A1.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A2）
A1 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A1.md`

本 handoff は roadmap.md の A2 行と verdict-A1 §10.5 の指示を 9 ブロック仕様に整形したもの。verdict-A1 §8 改善提案 1（`current-phase.txt` 不整合の本フェーズ補正）、2（DONE CRITERIA の `.claude-team/` メタファイル許容）、3（commit 実行タイミング統一）を反映済み。

---

## 【CURRENT PHASE】

**A2 — 4 フォーム 1 日 1 件チェック展開（既知不具合 #1 解消）**

業務フローの「レポート作成」レイヤで、`FieldworkForm` のみに実装されている重複申請防止ロジックを、残り 3 フォーム（DayTrip / Overnight / Overseas）に展開する。新規ルート・新規エンティティ・新規 AI 機能なし。

---

## 【OBJECTIVE】

1. `DayTripForm.jsx` / `OvernightTripForm.jsx` / `OverseasTripForm.jsx` の 3 フォームに、`FieldworkForm.jsx` L231-244 と同等の 1 日 1 件チェックを追加する
2. 既知不具合 #1（HANDOFF.md「🐛 既知の不具合」のうち「宿泊・海外フォームの 1 日 1 件チェック未実装」、A0 baseline で確認済の実コード状況では日帰りにも未実装）を再現不能にする
3. `FieldworkForm` の既存重複検証動作に regression を生じさせない
4. 4 フォームすべてで同一日 2 件目作成試行が拒否されるベースラインを A3（編集経路）に渡す

---

## 【SCOPE】

A2 の作業範囲は以下に **厳密に限定**:

| カテゴリ | 内容 |
|---|---|
| コード変更 | `DayTripForm.jsx` / `OvernightTripForm.jsx` / `OverseasTripForm.jsx` の `handleGenerate` 関数に重複検証ロジックを追加 |
| 参照モデル（変更しない） | `FieldworkForm.jsx` L231-244 の既存重複検証ロジック |
| 文書化 | `review-package-A2.md` に実装方針（特に start_date 単独 vs 期間重複の判断）と検証結果を記録 |
| 共通化 | **行わない**。3 つの素朴複製で OK。共通フック抽出は A4（領収書 AI 共通化）と同時期に整理する方が文脈的に自然 |

---

## 【DO】

### 1. 現状確認

各フォームの `handleGenerate` を読み、参照モデルと挿入点を Review Package §1 に転記:

| フォーム | 参照行 | report_type | date key |
|---|---|---|---|
| `FieldworkForm.jsx`（参照モデル、変更しない） | L231-244 | `'外出作業'` | `travel_date` |
| `DayTripForm.jsx`（変更対象） | L66 付近の `handleGenerate` 関数 | `'日帰り出張'` | `travel_date` |
| `OvernightTripForm.jsx`（変更対象） | L66 付近の `handleGenerate` 関数 | `'宿泊出張'` | `start_date` |
| `OverseasTripForm.jsx`（変更対象） | L53 付近の `handleGenerate` 関数 | `'海外出張'` | `start_date` |

行番号は A1 完了時点（c097d20 以降）の状態を起点とする。A2 開始時に grep で再確認すること。

### 2. 重複検証ロジックを 3 フォームに追加

各 `handleGenerate` で、`validate()` 直後・`setGenerating(true)` 直前に重複検証を挿入する。`FieldworkForm.jsx` の既存パターンを各フォームの `report_type` と date key に置き換える形で複製する。

**DayTripForm.jsx** — `validate()` の直後に以下を挿入:
```js
if (form.travel_date) {
  const existing = await base44.entities.Report.filter({
    created_by_id: user?.id,
    report_type: '日帰り出張',
    travel_date: form.travel_date,
  });
  const conflicting = existing.filter(r => r.status !== '差戻し');
  if (conflicting.length > 0) {
    setErrors(prev => ({ ...prev, travel_date: '同一日に既に日帰り出張レポートが存在します（1日1件まで）' }));
    return;
  }
}
```

**OvernightTripForm.jsx** — `validate()` の直後に以下を挿入:
```js
if (form.start_date) {
  const existing = await base44.entities.Report.filter({
    created_by_id: user?.id,
    report_type: '宿泊出張',
    start_date: form.start_date,
  });
  const conflicting = existing.filter(r => r.status !== '差戻し');
  if (conflicting.length > 0) {
    setErrors(prev => ({ ...prev, start_date: '同一開始日に既に宿泊出張レポートが存在します（1日1件まで）' }));
    return;
  }
}
```

**OverseasTripForm.jsx** — `validate()` の直後に以下を挿入:
```js
if (form.start_date) {
  const existing = await base44.entities.Report.filter({
    created_by_id: user?.id,
    report_type: '海外出張',
    start_date: form.start_date,
  });
  const conflicting = existing.filter(r => r.status !== '差戻し');
  if (conflicting.length > 0) {
    setErrors(prev => ({ ...prev, start_date: '同一開始日に既に海外出張レポートが存在します（1日1件まで）' }));
    return;
  }
}
```

挿入位置の判断:
- `validate()` の同期チェックを通過してから DB 問い合わせに入る（既存 FieldworkForm パターン踏襲）
- `setGenerating(true)` より前に置き、重複拒否時に loading 状態を起動しない

### 3. 期間重複検出の意図的非対応

宿泊・海外は date range（`start_date` + `end_date`）だが、本フェーズでは **同一 `start_date`** のみを重複条件とする。理由を Review Package §3 に記録:

- `FieldworkForm` の既存パターン（単一 date key）と整合
- HANDOFF.md「🐛 既知の不具合」の指示は「他フォームに同様のチェック追加」であり、overlap 検出を要求していない
- 期間重複検出（`start_date ≤ 既存期間 ≤ end_date` 等）は意味論的拡張であり、roadmap に明示されない範囲

将来 overlap 検出を要件化する場合は、roadmap 改訂時に Design Agent が別フェーズとして起案する。

### 4. `current-phase.txt` の確認と自動補正（verdict-A1 §8 改善提案 1 反映）

実装着手時に `current-phase.txt` の内容を確認:
- `A2` の場合: そのまま継続
- `A1` のままの場合: **本 DO の範疇で `A2` に更新**（前 verdict 公示後の revert に対する自動補正、Owner 介入を待たない）
- `A3` 以降の場合: **作業中断**、Review Agent に状態異常を報告

A2 → A3 への更新は本フェーズの責務ではない（Review Agent verdict-A2 の責任）。

### 5. 既存挙動の温存

- `FieldworkForm.jsx` の既存重複検証（L231-244 相当）に touch しない（grep で diff=0 を確認）
- 4 フォームの `handleGenerate` 以外の部分は変更しない
- 共通フック抽出は行わない（A4 で `useReceiptParser` と一緒に整理する判断、3 度目の重複が出るまで素朴複製で良い）
- `lib/reportGenerator.js` の AI プロンプトに触れない（A4 スコープ）

### 6. ビルド / lint 検証

- `npm run lint` の結果を Review Package §5 に転記
- A1 完了時点（verdict-A1 §2.5）の warnings 3 件（`Login.jsx err` / `ReportDetail.jsx isAdmin` / `ReportNew.jsx navigate`）から増加していないことを確認
- `npm run build` の結果を Review Package §5 に転記

### 7. Regression 検証

4 フォームすべてで:
- フォーム表示 → 必須項目入力 → 下書き保存
- 申請ボタン → status 遷移確認
- A2 で追加した重複検証が DayTrip/Overnight/Overseas で動作することを確認
- FieldworkForm の既存重複検証が依然として動作することを確認（regression なし）

結果を Review Package §4 に種別ごとに記録する。手動 UI 確認が困難な場合（Base44 sandbox に複数日のテストデータを作れない等）は、コード上のロジック存在を grep で示し、論理確認として §4 に明記する。

### 8. Commit 方針（verdict-A1 §8 改善提案 3 反映）

実コミットは **Review verdict 後の Owner 操作**で実行する（A0.1 / A1 と同パターン）。Implementation Agent は以下を Review Package §7 に記載:

- ステージング対象ファイル一覧
- コミットメッセージ案
- 注意事項（`git push` 禁止、`--no-verify` 禁止、`--amend` 禁止）

---

## 【DO NOT】

- `FieldworkForm.jsx` への変更（既存重複検証ロジック含む）
- 期間重複検出（start_date / end_date の overlap）の実装
- 共通フック化（`useDuplicateReportCheck` 等の抽出）
- 領収書 AI ロジックの他フォーム展開（A4）
- AI 精算書見出し安定化、金額 0 ガード強化（A4）
- レポート編集経路 `/reports/:id/edit` の追加（A3）
- 4 フォームの `mode` prop 対応（A3 で扱う、A2 ではしない）
- メール通知の追加（A5）
- 新規ルート / 新規ページ / 新規エンティティ / 新規フックの作成
- `src/lib/reportGenerator.js` の変更
- `src/lib/policyContext.jsx` の変更
- `src/lib/AuthContext.jsx` の変更
- `src/api/base44Client.js` の変更
- `src/components/ui/*` の変更
- `src/App.jsx` の変更
- `package.json` / `package-lock.json` の変更
- `eslint.config.js` / `vite.config.js` / `tailwind.config.js` の変更
- `npm run lint:fix` の実行（手動で修正する）
- `.claude-team/goal.md` / `.claude-team/roadmap.md` / `.claude-team/auto-handoff.md` / `.claude-team/README.md` / `.claude-team/templates/*` の変更
- `current-phase.txt` を `A3` 以降に更新
- `git push`
- `git commit` の実行（Review verdict 後の Owner 操作）
- `git commit --amend`
- `--no-verify` / `--no-gpg-sign` 等の hook スキップ
- `review-package-A2.md` でのプレースホルダ未充填での Review 起動

---

## 【FILES / AREAS】

### 変更可能
- `src/components/forms/DayTripForm.jsx`（`handleGenerate` のみ）
- `src/components/forms/OvernightTripForm.jsx`（`handleGenerate` のみ）
- `src/components/forms/OverseasTripForm.jsx`（`handleGenerate` のみ）

### 新規作成
- `.claude-team/review-packages/review-package-A2.md`

### メタ更新（任意、verdict-A1 §8 改善提案 2 反映）
- `.claude-team/current-phase.txt`（`A1` のままなら `A2` に更新可。`A3` 以降への更新は禁止）

### 参照のみ（変更しない）
- `src/components/forms/FieldworkForm.jsx`（参照モデル）
- `.claude-team/verdicts/verdict-A1.md`
- `.claude-team/handoff/design-handoff-A1.md`
- `.claude-team/review-packages/review-package-A1.md`
- `.claude-team/roadmap.md` A2 行
- `src/pages/ReportDetail.jsx`（regression 確認時）
- HANDOFF.md「🐛 既知の不具合 #1」

### 触れてはいけない
- 上記「変更可能」以外の `src/**`
- `src/api/base44Client.js`
- `src/components/ui/*`
- `src/lib/reportGenerator.js`
- `src/lib/policyContext.jsx`
- `src/lib/AuthContext.jsx`
- `src/App.jsx`
- 設定ファイル類
- `.claude-team/` の goal / roadmap / auto-handoff / README / templates / 過去 verdict / 過去 handoff

---

## 【DONE CRITERIA】

Review Agent はこの順で確認する:

- [ ] `npm run lint` errors=0、warnings は A1 完了時点（3 件）から増加していない
- [ ] `npm run build` 成功（`dist/index.html` 生成）
- [ ] `git diff --stat` の変更ファイルが以下に限定:
  - `src/components/forms/DayTripForm.jsx`
  - `src/components/forms/OvernightTripForm.jsx`
  - `src/components/forms/OverseasTripForm.jsx`
  - `.claude-team/review-packages/review-package-A2.md`
  - `.claude-team/current-phase.txt`（任意、`A1` → `A2` 補正のみ許容）
- [ ] 3 フォーム（DayTrip / Overnight / Overseas）の `handleGenerate` に `base44.entities.Report.filter` 呼び出しが存在（grep で確認）
- [ ] 拒否時のエラーメッセージが各種別に応じて表示される（DayTrip: travel_date キー、Overnight/Overseas: start_date キー）
- [ ] 「差戻し」状態のレポートは重複判定から除外される（`r.status !== '差戻し'` フィルタ存在）
- [ ] `FieldworkForm.jsx` の既存重複検証ロジック（L231-244 相当）に変更なし（`git diff src/components/forms/FieldworkForm.jsx` が空）
- [ ] 4 フォームすべてで単件作成→申請の動作確認が `review-package-A2.md` §4 に記録されている
- [ ] `review-package-A2.md` の必須セクション（§1 現状把握 / §2 実装方針 / §3 期間重複の扱いに関する判断 / §4 regression / §5 lint/build / §6 Review 質問 / §7 commit 方針）すべて存在
- [ ] `grep -c "AUTO-FILL:" .claude-team/review-packages/review-package-A2.md` = `0`
- [ ] `current-phase.txt` の内容が `A2`
- [ ] `git push` 未実行（`git rev-list --count @{u}..HEAD` が増加していない）
- [ ] **commit 未実行**（Review verdict 後の Owner 操作を想定、Implementation Agent は §7 に staging + メッセージ案を記述）

---

## 【REVIEW POINTS】

Review Agent は以下を確認:

1. **スコープ厳守**: 変更が DayTrip / Overnight / Overseas の `handleGenerate` に限定されているか
2. **既知不具合 #1 の解消**: 3 フォームすべてで重複検証ロジックが追加され、grep で確認できる
3. **FieldworkForm 不変**: 既存重複検証ロジックに touch していない（diff=0）
4. **期間重複の意図的非対応**: `start_date` 単独での検出を採用した設計判断が Review Package §3 で説明されている
5. **A3 領域への侵食なし**: `/edit` ルート / `ReportEdit.jsx` / フォームの `mode` prop 追加なし
6. **A4 領域への侵食なし**: 共通フック抽出 / 領収書 AI 展開 / プロンプト変更 / 金額 0 ガード変更 / CATEGORY_MAP 変更なし
7. **A5 領域への侵食なし**: SendEmail / 通知機構の追加なし
8. **既存機能の不変性**: 単件作成・申請の動作劣化なし、3 フォームの他関数（`validate` / `handleSubmit` 等）に touch なし
9. **REPOSITORY ISOLATION RULE 違反なし**: 差分・review-package に参照禁止語彙が**参照前提として**出現しないか
10. **プレースホルダ完全充填**: `grep -c "AUTO-FILL:" review-package-A2.md` = 0
11. **`git push` 未実行**
12. **commit 未実行**: Review verdict 後の Owner 操作を待つ、Review Package §7 に staging 対象とメッセージ案が完備されている

判定:
- 合格時: `.claude-team/verdicts/verdict-A2.md` に
  ```
  APPROVED
  PHASE COMPLETE
  NEXT PHASE: A3
  ```
  + `current-phase.txt` を `A3` に更新
- 不合格時: `REJECTED` + 修正要求
- 違反時: `REJECTED / FOREIGN CONTEXT DETECTED`

---

## 【NEXT PHASE DEPENDENCY】

A3（レポート編集経路の追加）は以下を A2 に依存:

- 4 フォームすべてに重複検証ロジックが揃っていること（A3 で `mode === 'create'` の条件分岐を A2 のロジックに付加する必要があるため、A2 でロジックの所在が明確になっていることが前提）
- A1 で確立した `FieldworkForm` の領収書 state 整合性が依然 regression していないこと
- 4 フォームの `handleGenerate` のシグネチャ・呼び出し位置が安定していること（A3 で edit モード時に handleGenerate の挙動を分岐させる）

A3 の設計詳細は **A2 の Verdict（実装後ゲート）が APPROVED となった後に Design Agent が作成する**。本 handoff の時点では描かない。
