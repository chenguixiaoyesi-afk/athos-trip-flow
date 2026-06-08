# Design Review Request — Phase A3

From: Design Agent
To: Review Agent
Date: 2026-06-05
Gate: **実装前ゲート（Design Review Gate）**

本ファイルは `design-handoff-A3.md` の実装前レビュー依頼。Review Agent は本ファイルと `design-handoff-A3.md` を読み、`design-review-verdict-A3.md` を返す。

---

## 1. レビュー対象

- 仕様正本: `.claude-team/handoff/design-handoff-A3.md`
- 直近 verdict: `.claude-team/verdicts/verdict-A2.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A3）
- A2 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A2.md`
- ロードマップ: `.claude-team/roadmap.md` A3 行 + 補助ロードマップ（UI: `pages/ReportEdit.jsx` + 編集ボタン）
- /goal: `.claude-team/goal.md` §0 / MVP 達成定義 #2（4 種別「下書き → 編集 → 申請 → 承認/差戻し」）
- 運用ルール: `.claude-team/auto-handoff.md` §0 DESIGN AUTHORITY RULE
- HANDOFF.md P0 #1（レポート編集機能）

---

## 2. CURRENT PHASE

`A3` — レポート編集経路の追加（HANDOFF.md P0 #1 解消）

新規ルート `/reports/:id/edit`、新規ページ `ReportEdit.jsx`、4 form の `mode` prop 対応、`ReportDetail` の編集ボタン追加。create モードの完全不変性が前提。

---

## 3. レビュー観点

### 3.1 ルール遵守
- [ ] REPOSITORY ISOLATION RULE 違反なし
- [ ] CURRENT PHASE のみ対象（A4/A5 への前倒しなし）
- [ ] 9 ブロックすべて記載
- [ ] `goal.md` 非ゴール（編集履歴 / 楽観ロック等）に違反なし
- [ ] DESIGN AUTHORITY RULE に従い、人間判断を仰ぐ設計判断が含まれていない
- [ ] AUTO HANDOFF ORCHESTRATION RULE に従い、ファイルベース通信前提

### 3.2 verdict-A2 §6 改善提案の取り込み
- [ ] DO 1 で「handoff 起草時点の行番号ではなく、A3 開始時の grep 結果を Review Package §1 に転記」を明示（改善提案 1）
- [ ] lint warnings 3 件の処遇は本フェーズでも「A2 完了時点から非増加」のみ要求（改善提案 2 を保留判断）
- [ ] DO 8 で手動 UI 検証の代替（コード grep + 論理確認）を許容（改善提案 3）
- [ ] メタファイル commit は引き続き Owner 運用判断、本フェーズで仕様変更しない（改善提案 4）

### 3.3 verdict-A2 §8.6 への忠実性
- [ ] verdict-A2 §8.6 が指定した「A3（レポート編集経路の追加）」を網羅
- [ ] roadmap.md A3 行（新規 `/edit` ルート / `ReportEdit.jsx` / mode prop / 編集ボタン）と整合
- [ ] roadmap.md「非実装」項目（申請中・承認済の編集 / 編集履歴 / 楽観ロック / 通知）を DO NOT で明示

### 3.4 自リポ整合性
- [ ] DO で言及する `App.jsx` の Routes 構造（L44-54）が現コードに実在
- [ ] `ReportDetail.jsx` の `canEdit` ロジック（L66）と編集ボタン挿入位置（L103-118 ブロック）が現コードに実在
- [ ] 4 form の現状シグネチャ `({ onBack })`、`useState` 初期値オブジェクト、`handleSubmit(status)` の構造が現コードに実在
- [ ] FieldworkForm の単一 `receipts` state（A1 で導入）が現コードに実在
- [ ] `base44.entities.Report.update(id, data)` API が `ReportDetail.jsx` L70 で既に使用されている（API 実在の根拠）

### 3.5 スコープ妥当性
- [ ] 6 ファイル改修 + 1 新規ファイルが A3 の単一フェーズとして適切な粒度か（A1 1 ファイル / A2 3 ファイルよりは大きいが、業務的に不可分）
- [ ] 4 form の改修方式が prop 追加 + handleSubmit 分岐 + 重複検証自己除外の 3 点に限定され、構造変更を最小化
- [ ] 共通化（共通 hook 抽出 / 共通 wrapper 化）を行わない判断が「3 度目の重複が出るまで素朴」原則と整合（4 form の edit 対応は素朴複製）
- [ ] DONE CRITERIA が客観的に検証可能（grep / 構造照合）
- [ ] REVIEW POINTS 15 項目が DONE CRITERIA をカバー

### 3.6 設計判断の妥当性
- [ ] `canEdit` ロジックの `ReportDetail` / `ReportEdit` 二重化（DRY ではなく素朴複製）が将来の共通化余地を残しつつ A3 のスコープを限定する判断として妥当
- [ ] `report_number` / `created_by_*` を edit モードで維持する設計が、業務上の identity 保持と整合
- [ ] `rejection_reason` を edit 時に明示的にクリアしない設計（Approval.jsx の次回差戻しで上書きを待つ）が、A5 の通知設計と矛盾しない
- [ ] AI 生成テキスト（`generated_report_text` / `generated_settlement_text`）の引継方式（`generatedReport?.x || initialReport?.x || ''`）が再生成しない edit 時の表示を維持
- [ ] 領収書 receipts の復元（`receipt_urls` → `{id, url, status: 'done'}[]`）が A1 で確立した state 構造と整合
- [ ] 重複検証自己除外の式（`r.id !== initialReport?.id`）が edit モードで自分自身との衝突を起こさない

### 3.7 依存と影響
- [ ] NEXT PHASE DEPENDENCY（A4 への前提条件）が明確
- [ ] A1（receipts state）/ A2（重複検証ロジック）の成果物への破壊変更なし
- [ ] A3 のフォーム改修が A4 で `useReceiptParser` 抽出する際の阻害要因にならない構造
- [ ] A3 で導入する `mode` / `initialReport` prop が、将来 A4 で hook 化されても両モードで動作可能

---

## 4. Design Agent からの確認事項

Review Agent は判定書面 §3 で以下に回答すること:

1. **`canEdit` ロジックの二重化**: `ReportDetail.jsx` と `ReportEdit.jsx` で同一の `canEdit = isOwner && (status==='下書き' || status==='差戻し')` を独立に記述する設計でよいか？ 共通化（`lib/permissions.js` 等の抽出）を A3 で行わない判断が「3 度目の重複が出るまで素朴」原則と整合するか
2. **`rejection_reason` の edit 時の扱い**: edit モードで差戻し → 再申請するとき、`rejection_reason` を明示的にクリアしない設計（既存値が保持される）でよいか？ Approval.jsx の次回差戻しで上書きされる前提だが、再申請後の `差戻し理由` 表示が混乱を招く可能性があるか
3. **AI 生成テキストの再生成判断**: edit 時に「AI 生成」ボタンを押さなくても、initialReport の `generated_report_text` を維持する設計が UX として妥当か？ 値変更後に再生成を強制すべきか、ユーザーの明示操作（既存「AI 生成」ボタン）に任せる現状方針で OK か
4. **領収書の AI 解析結果の非復元**: `parsed` を復元せず、金額フィールドが initialReport から既に正しい値を保持する前提で済ます設計（DO 4.2）が、edit 中に領収書を追加した場合の整合と矛盾しないか
5. **`canEdit` 判定外の `/edit` 直アクセス時の挙動**: 404 ではなく「編集できません」テキスト表示としているが、`<Navigate to={...} />` でリダイレクトする方が UX として優れているか？ もしリダイレクト推奨なら遷移先（`/reports/:id` / `/reports` / `/`）の指定が必要
6. **A3 のサイズ感**: 6 ファイル改修 + 1 新規ファイルは過去フェーズ（A1: 1 ファイル / A2: 3 ファイル）より大きい。Review Agent から「A3a（ルート + ReportEdit + ReportDetail ボタン）/ A3b（4 form mode 対応）」のような分割が推奨されるか
7. **edit モードでの `localStorage` 初期化スキップ**: Fieldwork の `STORAGE_KEY` パターンや、Overnight / Overseas にあるかもしれない localStorage 読み込みを edit モード時にスキップする設計（initialReport を優先）が、ユーザーの期待と整合するか

---

## 5. 期待する判定形式

Review Agent は `.claude-team/design-reviews/design-review-verdict-A3.md` を `templates/design-review-verdict-template.md` に従って作成する。

### 合格
```
APPROVED_FOR_IMPLEMENTATION
```
+ §2 観点別チェック結果
+ §3 質問への回答

### 不合格
```
REJECTED_DESIGN
```
+ §4 修正要求（具体的箇所）
- 修正後は `design-handoff-A3-r2.md` + `design-review-request-A3-r2.md` として Design Agent が自動再申請

### 違反
```
REJECTED
FOREIGN CONTEXT DETECTED
```
+ §5 出典 / 検出箇所 / 不一致内容

---

## 6. DESIGN AUTHORITY RULE 注記

本 Design Review Gate は `APPROVED_FOR_IMPLEMENTATION` まで自動継続する。途中の人間通知は禁止。Review Agent が `REJECTED_DESIGN` を返した場合、Design Agent は人間の指示なしで改訂版を作成し再申請する。

`APPROVED_FOR_IMPLEMENTATION` 到達後、人間が `templates/implementation-go-template.md` を使って Implementation Agent を起動した場合のみ Implementation Phase へ移行する。
