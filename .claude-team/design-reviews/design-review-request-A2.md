# Design Review Request — Phase A2

From: Design Agent
To: Review Agent
Date: 2026-06-05
Gate: **実装前ゲート（Design Review Gate）**

本ファイルは `design-handoff-A2.md` の実装前レビュー依頼。Review Agent は本ファイルと `design-handoff-A2.md` を読み、`design-review-verdict-A2.md` を返す。

---

## 1. レビュー対象

- 仕様正本: `.claude-team/handoff/design-handoff-A2.md`
- 直近 verdict: `.claude-team/verdicts/verdict-A1.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A2）
- A1 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A1.md`
- ロードマップ: `.claude-team/roadmap.md` A2 行 + 補助ロードマップ
- /goal: `.claude-team/goal.md` §0 / MVP 達成定義 #2
- 運用ルール: `.claude-team/auto-handoff.md` §0 DESIGN AUTHORITY RULE
- HANDOFF.md「🐛 既知の不具合 #1」

---

## 2. CURRENT PHASE

`A2` — 4 フォーム 1 日 1 件チェック展開（既知不具合 #1 解消）

業務フロー「レポート作成」レイヤで、`FieldworkForm` のみに実装されている重複申請防止ロジックを 3 フォームに展開。共通化はしない。期間重複検出はしない。

---

## 3. レビュー観点

### 3.1 ルール遵守
- [ ] REPOSITORY ISOLATION RULE 違反なし
- [ ] CURRENT PHASE のみを対象（A3/A4/A5 への前倒しなし）
- [ ] 9 ブロックすべて記載
- [ ] `goal.md` 非ゴール・制約に違反なし
- [ ] DESIGN AUTHORITY RULE に従い、人間判断を仰ぐ設計判断が含まれていない
- [ ] AUTO HANDOFF ORCHESTRATION RULE に従い、ファイルベース通信前提

### 3.2 verdict-A1 §8 改善提案の取り込み
- [ ] DO 4 に「`current-phase.txt` 不整合時の本フェーズ補正」が明文化（改善提案 1）
- [ ] DONE CRITERIA の「変更ファイル限定」に `.claude-team/current-phase.txt` がメタファイルとして許容（改善提案 2）
- [ ] DO 8 / DONE CRITERIA / REVIEW POINTS で「commit は Review verdict 後の Owner 操作」を統一明示（改善提案 3）
- [ ] lint warnings 3 件の扱いを「A1 完了時点から増加していない」基準で記述（改善提案 4 を中庸に反映）

### 3.3 verdict-A1 §10.5 への忠実性
- [ ] verdict-A1 §10.5 が指定した「A2（4 フォーム 1 日 1 件チェック展開）」を網羅
- [ ] roadmap.md A2 行と整合

### 3.4 自リポ整合性
- [ ] DO で言及する 3 フォームの `handleGenerate` 位置（DayTrip L66 / Overnight L66 / Overseas L53）が現コードに存在（A1 完了 c097d20 時点を起点とし、A2 開始時に Implementation Agent が grep 再確認することを要求）
- [ ] FieldworkForm L231-244 の重複検証ロジックが参照モデルとして実在する
- [ ] HANDOFF.md「🐛 既知の不具合 #1」と整合
- [ ] base44.entities.Report の filter API（`created_by_id`, `report_type`, `travel_date`, `start_date` キー）が現コードで使用されている

### 3.5 スコープ妥当性
- [ ] 重複検証ロジックの素朴複製（共通フック抽出なし）が「3 度目の重複が出るまで共通化しない」原則と整合
- [ ] 期間重複検出を意図的に非対応とする判断が、最小修正原則と整合
- [ ] DO NOT が A3/A4/A5 領域を網羅
- [ ] DONE CRITERIA が客観的に検証可能（grep / 行番号 / 文字列照合で機械検証可能）
- [ ] REVIEW POINTS 12 項目が DONE CRITERIA をカバー

### 3.6 依存と影響
- [ ] NEXT PHASE DEPENDENCY（A3 への前提条件）が明確
- [ ] A1 の成果物（`FieldworkForm` 領収書整合性）への破壊変更なし
- [ ] A2 のロジック追加が A3 の `mode === 'create'` 分岐実装を阻害しない構造（A3 で `mode==='edit'` 時にスキップ可能な位置への挿入）

---

## 4. Design Agent からの確認事項

Review Agent は判定書面 §3 で以下に回答すること:

1. **期間重複検出を A2 で扱わない判断**: 宿泊・海外は date range だが、`start_date` 単独での重複検出を採用した。HANDOFF.md「🐛 既知の不具合 #1」の「他フォームに同様のチェック追加」要求の解釈として妥当か？ overlap 検出を別フェーズに切り出す方針でよいか？
2. **共通フック化を A2 でしない判断**: A4 で `useReceiptParser` を抽出する際に、`useDuplicateReportCheck` も同時に整理する想定。A2 では素朴 3 複製とする方針が「3 度目の重複が出るまで共通化しない」原則と整合するか？（実質的には A2 で 3 度目の複製が発生するが、現時点では「4 フォーム 4 複製」として継続し、A4 で 4 → 1 共通化する方が文脈整理が一回で済む）
3. **エラーメッセージのキー設計**: DayTrip は `travel_date` キー、Overnight/Overseas は `start_date` キーに設定する。各フォームの `errors` 表示が対応するフィールドにバインドされている前提だが、DO で明示的に「既存 errors キーバインドを変更しない」と書くべきか？
4. **`current-phase.txt` 自動補正の責務分離**: verdict-A1 §8 改善提案 1 を採用し、A2 では「`A1` のままなら本 DO で `A2` に更新」を許容した。これは前 verdict 公示後の revert に対する自動補正であり、Owner 介入を待たない設計でよいか？
5. **lint warnings 3 件の扱い**: A2 では A1 完了時点（3 件）からの非増加のみ要求し、解消は別フェーズに委ねた。verdict-A1 §8 改善提案 4 は「roadmap で `A1.5` or `A8` で扱うか別途判断」と提示。本 Design Review で「A2 では解消対象外、Design Agent が roadmap 次回改訂時に検討」とする運用判断でよいか？

---

## 5. 期待する判定形式

Review Agent は `.claude-team/design-reviews/design-review-verdict-A2.md` を `templates/design-review-verdict-template.md` に従って作成する。

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
- 修正後は `design-handoff-A2-r2.md` + `design-review-request-A2-r2.md` として Design Agent が自動再申請

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
