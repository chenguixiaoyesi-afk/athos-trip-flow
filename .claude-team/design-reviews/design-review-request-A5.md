# Design Review Request — Phase A5

From: Design Agent
To: Review Agent
Date: 2026-06-08
Gate: **実装前ゲート（Design Review Gate）**

本ファイルは `design-handoff-A5.md` の実装前レビュー依頼。Review Agent は本ファイルと `design-handoff-A5.md` を読み、`design-review-verdict-A5.md` を返す。

**A5 = MVP 達成最終フェーズ。本ゲート通過 → 実装 GO → 実装後ゲート APPROVED で MVP 達成宣言。**

---

## 1. レビュー対象

- 仕様正本: `.claude-team/handoff/design-handoff-A5.md`
- 直近 verdict: `.claude-team/verdicts/verdict-A4.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A5）
- A4 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A4.md`
- ロードマップ: `.claude-team/roadmap.md` A5 行（メール通知 / SendEmail / 失敗時 status 維持）
- /goal: `.claude-team/goal.md` §0 / MVP 達成定義 #2（本フェーズで達成）
- 運用ルール: `.claude-team/auto-handoff.md` §0 DESIGN AUTHORITY RULE
- HANDOFF.md P0 #3（申請・承認時のメール通知）

---

## 2. CURRENT PHASE

`A5` — 承認: メール通知（申請/承認/差戻し）/ MVP 達成最終フェーズ

新規ファイル 1（`src/lib/notifications.js`）、6 改修（4 form + ReportDetail + Approval）。3 trigger × 3 ヘルパーで MVP 4 要件のうち最後の 1 件を達成する。

---

## 3. レビュー観点

### 3.1 ルール遵守
- [ ] REPOSITORY ISOLATION RULE 違反なし
- [ ] CURRENT PHASE のみ対象（A6 への前倒しなし、scheduled trigger / Automation 設定なし）
- [ ] 9 ブロックすべて記載
- [ ] `goal.md` 非ゴール（多段階承認 / 通知 ON/OFF UI / 履歴 DB / テンプレ管理 UI / Slack 連携）に違反なし
- [ ] DESIGN AUTHORITY RULE に従い、人間判断を仰ぐ設計判断が含まれていない
- [ ] AUTO HANDOFF ORCHESTRATION RULE に従い、ファイルベース通信前提

### 3.2 verdict-A4 §7 改善提案の取り込み
- [ ] DO 12 で「handoff 雛形からの逸脱を Review Package §2 / §3 に明示」を要求（改善提案 1）
- [ ] DO 10 で手動 UI 検証の Owner 分担を明示（改善提案 2）
- [ ] DO 13 で「lint warnings / `useCanEdit` / CATEGORY_MAP 共通化は A5 スコープ外、roadmap 改訂判断」と明示（改善提案 3-5）

### 3.3 verdict-A4 §10.6 への忠実性
- [ ] verdict-A4 §10.6 が指定した「A5（メール通知）= MVP 達成最終」を網羅
- [ ] roadmap.md A5 行の「完成」「非実装」「レビュー条件」と整合
- [ ] roadmap.md「非実装」項目（多段階 / ON/OFF UI / 履歴 DB / テンプレ管理 / Slack / 失敗時の status ブロック）を DO NOT で明示

### 3.4 自リポ整合性
- [ ] DO で言及する 4 form の `handleSubmit`（A3 で確立した create/edit 分岐 + A4 で receipt_urls 追加された構造）が現コードに実在
- [ ] DO で言及する `ReportDetail.jsx` L68 の `handleSubmit` が現コードに実在
- [ ] DO で言及する `Approval.jsx` の 3 handler（L39 handleApprove / L51 handleReject / L65 handleBulkApprove）が現コードに実在
- [ ] `base44.integrations.Core.SendEmail` API が Base44 SDK で利用可能（HANDOFF.md「外部API」表で言及）
- [ ] `base44.entities.User.filter({ role: 'admin' })` API が利用可能（User entity は built-in、HANDOFF.md 認証方式で言及）

### 3.5 スコープ妥当性
- [ ] 6 改修 + 1 新規（notifications.js）は A5 の単一フェーズとして適切な粒度（A3 7 ファイル / A4 7 ファイル に対し A5 7 ファイル）
- [ ] 各改修箇所の差分が `import + 数行` の小さい変更に限定
- [ ] notifications.js の責務（3 ヘルパー + 内部ユーティリティ）が単一責任原則と整合
- [ ] 「ヘルパーが throw しない」設計が「失敗時 status 維持」レビュー条件と整合
- [ ] 件名・本文のテンプレート設計（件名プレフィックス、本文 plain text、4 主要フィールド + 該当時の補助フィールド）が業務要件と整合
- [ ] DONE CRITERIA が客観的に検証可能（grep / 構造照合）
- [ ] REVIEW POINTS 15 項目が DONE CRITERIA をカバー

### 3.6 設計判断の妥当性
- [ ] 管理者宛先の動的取得（`User.filter` 経由）vs ハードコード設計選択（動的を採用）が、複数管理者対応の業務要件と整合
- [ ] `getAdminEmails` 失敗時の空配列フォールバック（SendEmail スキップ）が、「Report.update は完了するが通知は失敗ログのみ」の設計と整合
- [ ] 一括承認時の `Promise.all` 並列発火（A5 では rate limit を考慮しない）が「最小実装」原則と整合
- [ ] 「本文に business_content / AI 生成テキストを含めない」判断（情報漏洩防止）が業務要件と整合
- [ ] HTML body を使わず plain text のみとする判断（最小実装）が業務要件と整合
- [ ] 件名プレフィックス `[申請] / [承認] / [差戻し]` が「メーラー側での識別容易性」と整合
- [ ] 「下書き保存時は通知しない」判断が業務要件と整合

### 3.7 依存と影響
- [ ] NEXT PHASE DEPENDENCY（A6 への前提条件）が明確
- [ ] A1（receipts state）/ A2（重複検証）/ A3（edit モード）/ A4（領収書 AI / 見出し regex）の成果物への破壊変更なし
- [ ] 4 form の `handleSubmit` への追加が A3 の create/edit 分岐 + A4 の receipt_urls 追加と整合
- [ ] `Approval.jsx` への追加が既存の一括承認・差戻しダイアログと整合

---

## 4. Design Agent からの確認事項

Review Agent は判定書面 §3 で以下に回答すること:

1. **管理者宛先の動的取得 vs 固定リスト**: `User.filter({ role: 'admin' })` で実行時に管理者を取得する設計を採用。管理者が増減する将来要件への耐性は得られるが、Base44 SDK の User API が想定通り動作するか未検証。代替案として「Report に approver_email フィールドを追加してハードコード」「環境変数で管理者リストを管理」も考えられる。A5 の動的取得設計でよいか
2. **一括承認時の通知並列発火**: `Promise.all` で並列発火しているが、Base44 SendEmail のレート制限に到達する可能性。A5 では最小実装としシリアル化しない設計だが、Review Agent から「シリアル化（for-of with await）を推奨」される場合は受け入れ可能か
3. **本文の情報範囲**: business_content / AI 生成テキストを含めないことで情報漏洩を防いでいるが、その分メール本文の情報量が概要レベルに留まる。承認者が詳細を判断するには結局承認画面を開く必要があり、メールはトリガーのみ。この設計でユーザーペインを十分軽減できるか
4. **失敗時の通知有無の可視化**: 通知失敗時は console.warn のみで、ユーザー UI には何も表示されない。「申請完了」UI 上は成功表示だが、メール実際には届かなかったケースが発生し得る。この曖昧性を A5 で許容するか（A8 以降で「通知履歴」「失敗時の再送」を別フェーズ化する余地あり）
5. **handoff §2 で雛形コードを詳細に提示した判断**: 過去フェーズ（A2/A3/A4）と比較して A5 handoff は notifications.js / 各 trigger 改修コードを詳細に雛形提示している。これにより Implementation Agent の裁量が縮小するが、A5 の「ヘルパー throw しない」「DRY」要件を構造的に保証する利点もある。Design Agent の役割として handoff にここまで詳細なコード雛形を含めることが妥当か（過去フェーズより一歩踏み込んでいる）
6. **MVP 達成宣言の Review Agent 責務**: handoff §[MVP 達成（参考）] ブロックで「Review Agent は A5 verdict に MVP 達成を明記」を提案。これは Design Agent から Review Agent への依頼として適切か、それとも Review Agent の判定形式に Design Agent が干渉すべきでないか
7. **`Approval.handleBulkApprove` での通知タイミング**: `for` ループ内で各 update 直後に notify するか、全 update 完了後に `Promise.all` で一斉 notify するか。handoff §[DO] 6 では後者を選択（DB 更新と通知を分離、エラー伝播の局所化）。これでよいか

---

## 5. 期待する判定形式

Review Agent は `.claude-team/design-reviews/design-review-verdict-A5.md` を `templates/design-review-verdict-template.md` に従って作成する。

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
- 修正後は `design-handoff-A5-r2.md` + `design-review-request-A5-r2.md` として Design Agent が自動再申請

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

実装後ゲートが APPROVED となった時点で、MVP 達成宣言が可能となる。
