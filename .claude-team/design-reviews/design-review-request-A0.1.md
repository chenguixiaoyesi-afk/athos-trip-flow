# Design Review Request — Phase A0.1

From: Design Agent
To: Review Agent
Date: 2026-06-05
Re-issued: 2026-06-05（同内容の再発行。修正版ではない）
Gate: **実装前ゲート（Design Review Gate）**

本ファイルは `design-handoff-A0.1.md` の実装前レビューを依頼するもの。Review Agent は本ファイルと `design-handoff-A0.1.md` を読み、`design-review-verdict-A0.1.md` を返す。

---

## 1. レビュー対象

- 仕様正本: `.claude-team/handoff/design-handoff-A0.1.md`
- 直近 verdict: `.claude-team/verdicts/verdict-A0.md`（A0.1 の根拠）
- ロードマップ: `.claude-team/roadmap.md`（A0 行の括弧内補記として A0.1 を扱う / Verdict A0 の指示により改変禁止）
- /goal: `.claude-team/goal.md`（§0 REPOSITORY ISOLATION RULE）
- 運用ルール: `.claude-team/auto-handoff.md`（§0 DESIGN AUTHORITY RULE）

---

## 2. CURRENT PHASE

`A0.1` — A0 の最終整合化（lint クリーン + `.env.example` tracking + 初回コミット + README 確定）

新規機能ゼロ。Verdict A0 の NEXT ACTION 指示を 9 ブロック化したもの。

---

## 3. レビュー観点

### 3.1 ルール遵守
- [ ] REPOSITORY ISOLATION RULE 違反なし（他プロジェクト由来の前提・命名・構造を含まない）
- [ ] CURRENT PHASE のみを対象（A1 領域への前倒しなし）
- [ ] 9 ブロックすべて記載
- [ ] `goal.md` 非ゴール・制約に違反なし
- [ ] DESIGN AUTHORITY RULE に従い、人間判断を仰ぐ設計判断が含まれていない
- [ ] AUTO HANDOFF ORCHESTRATION RULE に従い、ファイルベース通信前提

### 3.2 Verdict A0 への忠実性（本フェーズ固有）
- [ ] Verdict A0 「A0.1 で対応すべきこと」4 項目を**漏れなく**含む（lint / `.env.example` tracking / `.claude-team/` tracking / README 確定）
- [ ] Verdict A0 「A0.1 §[DO NOT]」4 項目（新規機能 / 新規依存 / `src/**` 機能変更 / lint ルール変更）を反映
- [ ] Verdict A0 「A0.1 §[DONE CRITERIA]」4 項目（lint=0 / `.env.example` No match / `.claude-team/` tracked / `git status` clean）を反映
- [ ] Verdict A0 「ロードマップ改変禁止」を遵守（`roadmap.md` を変更する DO を含まない）
- [ ] Verdict A0 §5 の判断（README 採用）が明示されている

### 3.3 自リポ整合性
- [ ] DO で言及する 5 ファイル（`DayTripForm.jsx` / `Approval.jsx` / `Dashboard.jsx` / `PolicyManagement.jsx` / `ReportNew.jsx`）が実コードに実在する
- [ ] HANDOFF.md / 既存 `baseline-A0.md` と矛盾しない
- [ ] grep / `git ls-files` / `git check-ignore` 等の検証コマンドが正しい構文

### 3.4 スコープ妥当性
- [ ] DO のサイズが過大でない（小フェーズとして妥当）
- [ ] DO NOT が DO と矛盾しない
- [ ] DONE CRITERIA が客観的に検証可能
- [ ] REVIEW POINTS が DONE CRITERIA をカバー

### 3.5 依存と影響
- [ ] NEXT PHASE DEPENDENCY（A1 への前提条件）が明確
- [ ] A0 で作成済みの成果物（`.env.example`, `.claude-team/`, `README.md` 追記）への破壊変更なし
- [ ] コミット粒度（A0 + A0.1 を 1 コミット）が Verdict A0 の指示と整合
- [ ] `git push` 未実行（人間の Deploy 承認前）

---

## 4. Design Agent からの確認事項

Review Agent は判定書面 §3 で以下に回答すること:

1. **`lint:fix` の例外許可**: 本 handoff は `lint:fix` を 1 回のみ実行と明示。Verdict A0 §1 の例外許可と整合する判断でよいか？
2. **`README.md` の採用**: Verdict A0 §5 の「推奨: コミット採用」に従い、追加変更なしで採用する判断でよいか？
3. **コミット 1 件への集約**: A0 + A0.1 を分割せず 1 コミットにまとめる方針が、Verdict A0「履歴の純度」要件と整合するか？
4. **`current-phase.txt` の責務分離**: Design Agent が `A0.1` まで更新し、`A1` への更新は Review Agent verdict-A0.1 のタイミングで行う設計でよいか？

---

## 5. 期待する判定形式

Review Agent は `.claude-team/design-reviews/design-review-verdict-A0.1.md` を `templates/design-review-verdict-template.md` に従って作成する。

### 合格
```
APPROVED_FOR_IMPLEMENTATION
```
+ §2 観点別チェック結果（全項目 ✅）
+ §3 質問への回答

### 不合格
```
REJECTED_DESIGN
```
+ §4 修正要求（具体的箇所）
- 修正後は `design-handoff-A0.1-r2.md` + `design-review-request-A0.1-r2.md` として Design Agent が自動再申請（DESIGN AUTHORITY RULE 自動継続ループ）

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

---

## 7. 再発行履歴

| 版 | 日時 | 内容 |
|---|---|---|
| 初版 | 2026-06-05 | 初回発行 |
| 再発行 | 2026-06-05 | 同内容の再発行（修正なし） |
