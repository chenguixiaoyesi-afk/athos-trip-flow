# Design Review Request — Phase A8 ⭐ ロードマップ最終フェーズ

From: Design Agent
To: Review Agent
Date: 2026-06-08
Gate: **実装前ゲート（Design Review Gate）**

本ファイルは `design-handoff-A8.md` の実装前レビュー依頼。Review Agent は本ファイルと `design-handoff-A8.md` を読み、`design-review-verdict-A8.md` を返す。

**A8 = ロードマップ最終フェーズ。本ゲート + 実装後ゲートの両方を通過すると PROJECT COMPLETE 宣言が可能。**

---

## 1. レビュー対象

- 仕様正本: `.claude-team/handoff/design-handoff-A8.md`
- 直近 verdict: `.claude-team/verdicts/verdict-A7.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A8）
- A7 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A7.md`
- ロードマップ: `.claude-team/roadmap.md` A8 行（規程変更履歴 + 影響範囲追跡 + 業務シナリオ完結）
- A7 baseline: `.claude-team/baseline-A7.md`
- /goal: `.claude-team/goal.md` §0 / A6-A8 運用品質向上位置付け / 監査業務シナリオ
- 運用ルール: `.claude-team/auto-handoff.md` §0 DESIGN AUTHORITY RULE

---

## 2. CURRENT PHASE

`A8` — 旅費規程監査: 規程変更履歴 + 影響範囲追跡

`policyImpactAnalyzer.js`（純粋関数）を新規追加し、`PolicyManagement.jsx` に admin 限定「影響範囲」ボタン + Dialog を追加。業務ルール「過去レポートへの遡及反映禁止」を厳守し、シミュレーション表示のみで DB への書き戻しを行わない。

---

## 3. レビュー観点

### 3.1 ルール遵守
- [ ] REPOSITORY ISOLATION RULE 違反なし
- [ ] CURRENT PHASE のみ対象（次フェーズは存在しない、A9 への前倒し論なし）
- [ ] 9 ブロックすべて記載
- [ ] `goal.md` 非ゴール（過去レポート遡及反映 / 多段階規程承認 / 外部公開）に違反なし
- [ ] DESIGN AUTHORITY RULE に従い、人間判断を仰ぐ設計判断が含まれていない
- [ ] AUTO HANDOFF ORCHESTRATION RULE に従い、ファイルベース通信前提

### 3.2 verdict-A7 §6 改善提案の取り込み
- [ ] DO §2 / §9 で変数シャドー回避を明示適用（`currentPolicy` / `sourcePolicy` / `targetPolicy` 引数、`impactTarget` / `impactResult` state 名）（§6.2 改善実装）
- [ ] DO 8 で「逸脱明示」を継続適用（§4 Q3 同形式の Review Package 要求）
- [ ] lint warnings 3 件は本フェーズも非増加要求のみ、確定は §4 Q5 で問う（§6.5 改善判断）
- [ ] Design Agent プロセス順序の徹底（§6.4）は本 design-review-request 提出のタイミング自体で改善実証（A2-A7 で 6 連続遅延、A8 は最終フェーズで dispatch 即応）

### 3.3 verdict-A7 §8.6 への忠実性
- [ ] verdict-A7 §8.6 が指定した「A8（ロードマップ最終、規程変更履歴 + 影響範囲追跡）」を網羅
- [ ] roadmap.md A8 行の「完成」（4 項目）/「非実装」（4 項目）/「レビュー条件」（5 項目）と整合

### 3.4 自リポ整合性
- [ ] DO で言及する `PolicyManagement.jsx` の構造（`loadPolicies` / `handlePdfUpload` / `handleActivate` / `handleSaveNew` / `analyzedPolicy && showDiff` ブロック / `FIELD_LABELS` / `activePolicy` / 規程履歴一覧）が現コードに実在
- [ ] `usePolicy` hook が `src/lib/policyContext.jsx` で `policy` を返す既存実装と整合
- [ ] HANDOFF.md Report スキーマ（L177-231）の `report_type` / `num_days` / `num_nights` / `driving_distance_km` / 実費 10 フィールドが A8 再計算ロジックで参照可能
- [ ] HANDOFF.md TravelPolicyMaster スキーマ（L234-252）の 9 規程値フィールドが `recomputeReportPolicyValues` で参照可能

### 3.5 スコープ妥当性
- [ ] 1 改修 + 3 新規（policyImpactAnalyzer.js / baseline-A8.md / review-package-A8.md）の粒度が A8 単一フェーズとして適切
- [ ] `policyImpactAnalyzer.js` の責務（4 種別再計算 + 全 report 比較集計）が単一責任原則と整合
- [ ] `PolicyManagement.jsx` の既存機能への touch を完全に避ける構造
- [ ] 業務ルール「過去レポート遡及反映禁止」を `Report.update` 呼出を一切含めない設計で構造的に保証
- [ ] DONE CRITERIA が客観的に検証可能（grep / 構造照合 / 純粋性 grep）
- [ ] REVIEW POINTS 16 項目が DONE CRITERIA をカバー

### 3.6 設計判断の妥当性
- [ ] 4 種別の規程依存項目分岐（日帰り: 日当+車手当 / 宿泊: 日当×days+宿泊×nights+車手当 / 海外: 日当×days+宿泊×nights、車手当なし / 外出作業: 車手当のみ）が業務的に正しい
- [ ] 実費 10 項目を再計算対象外とする判断が業務ルール「実費は規程値非依存」と整合
- [ ] `affectedCount` を `diff !== 0` のみカウントする設計が「影響を受けるレポート」の業務的意味と整合
- [ ] 比較元を **現行 `activePolicy`** に固定し、比較先を一覧から選ぶ設計が、監査担当の典型的ユースケース（「この過去/未適用規程に切り替えたらどうなる？」）と整合
- [ ] 影響評価対象を `status='承認済'` のみとする判断が、A6/A7 の集計対象と整合
- [ ] 上限 500 件が A6/A7 と整合（明示は不要、内部一貫性）
- [ ] Dialog UI の 3 KPI + テーブル + 業務ルール明示フッターが、監査担当の意思決定に必要十分
- [ ] 「影響なし」「エラー時」のフォールバック表示が UX として親切

### 3.7 業務ルール厳守の構造的保証
- [ ] `recomputeReportPolicyValues` / `computeImpact` のどちらも **戻り値のみ返し**、副作用なし（DB 書き戻しなし）
- [ ] `handleShowImpact` 内で `base44.entities.Report.update` を **呼出していない**
- [ ] Dialog 表示が「シミュレーションのみ」である旨を **UI 上にも明示**（業務ルール明示フッター）
- [ ] baseline-A8.md が業務ルールを **3 項目明確に列挙**（遡及反映禁止 / 実費非依存 / 承認済のみ）

### 3.8 依存と影響
- [ ] A8 が **ロードマップ最終フェーズ** であり、次フェーズが存在しない判定形式（`PROJECT COMPLETE`）が明示
- [ ] A1〜A7 すべての成果物（4 form / ReportEdit / Approval / ReportDetail / Summary / aggregation.js / notifications.js / hook / receipt UI / reportGenerator.js / App.jsx Routes）への破壊変更なし
- [ ] A6 / A7 で確立した「`Summary.jsx` の admin 機能」と本 A8 の「`PolicyManagement.jsx` の admin 機能」が業務的に連携可能（baseline-A8.md シナリオ 3）

---

## 4. Design Agent からの確認事項

Review Agent は判定書面 §3 で以下に回答すること:

1. **`recomputeReportPolicyValues` の 4 種別計算ロジックの妥当性**: handoff §2.2 で提示した分岐（特に「海外は車手当なし」「外出作業は日当・宿泊費なし」）が HANDOFF.md スキーマと業務的に正しいか。既存 form の handleSubmit の計算ロジックを参照して妥当性確認を依頼
2. **実費 10 項目を再計算対象外とする判断**: 業務ルールとして妥当か。`coworking_fee` / `wifi_fee` / `meal_fee` 等は規程の「外出作業費上限（`max_work_expense`）」と関連するが、A8 では総額計算のみで上限超過判定は扱わない。これは roadmap A8 スコープと整合するか
3. **比較元を現行 `activePolicy` に固定する判断**: 「`sourcePolicy` を任意選択可能にする」案もあるが、A8 は最小実装で「現行 vs 履歴」のみ。Review Agent から「任意比較対応」を推奨される場合は受け入れ可能か
4. **`affectedCount` の定義**: `diff !== 0` の件数とした。`diff > 0` のみ（支給増加レポート）や `Math.abs(diff) > threshold` などの代替もあるが、A8 では最小実装で「差分ありはすべて影響」とする。これでよいか
5. **lint warnings 3 件の最終処遇**: A1〜A8 通算 9 フェーズで「baseline 不変」扱い。本 A8 = ロードマップ最終フェーズで処遇を確定すべき。Review Agent の推奨を仰ぐ:
   - (a) 本 A8 完了時に Owner 判断で別 commit で対応（unused-vars 削除）
   - (b) A8 完了後の運用フェーズで対応
   - (c) 「意図的 unused 保持」として明示放置
6. **`PolicyManagement.jsx` への影響範囲ボタンの表示位置**: 既存「適用する」ボタンの直前に挿入。`is_active=true` の規程には表示しないが、PDF リンクと「適用する」ボタンの間に配置することで視覚的バランスが取れているか
7. **業務シナリオ 3（A7 audit CSV との連携）**: baseline-A8.md でシナリオ 3 として記載。実装上のリンク（PolicyManagement → Summary へのナビゲーション）は本 A8 では追加していない。リンク追加すべきか、文書化のみで十分か
8. **PROJECT COMPLETE 宣言の Review Agent 責務**: handoff の最終判定形式で `PROJECT COMPLETE` を提案。これは A5 の MVP COMPLETE 宣言と同様の Design Agent → Review Agent 依頼として妥当か、それとも Review Agent の判定形式に Design Agent が干渉すべきでないか
9. **handoff §2 雛形コードの詳細度**: 過去フェーズ（特に A5）と同様に詳細な雛形を提示。これは Implementation Agent の裁量を縮小するが、変数シャドー（verdict-A7 §6.2）等の致命バグを設計段階で抑止する利点もある。A8 のサイズ感（1 改修 + 3 新規）で詳細雛形を提供する設計判断は妥当か

---

## 5. 期待する判定形式

Review Agent は `.claude-team/design-reviews/design-review-verdict-A8.md` を `templates/design-review-verdict-template.md` に従って作成する。

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
- 修正後は `design-handoff-A8-r2.md` + `design-review-request-A8-r2.md` として Design Agent が自動再申請

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

実装後ゲートが APPROVED + PROJECT COMPLETE 宣言となった時点で、ロードマップ全 9 フェーズ完走となる。
