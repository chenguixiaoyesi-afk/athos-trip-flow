# Design Review Request — Phase A6

From: Design Agent
To: Review Agent
Date: 2026-06-08
Gate: **実装前ゲート（Design Review Gate）**

本ファイルは `design-handoff-A6.md` の実装前レビュー依頼。Review Agent は本ファイルと `design-handoff-A6.md` を読み、`design-review-verdict-A6.md` を返す。

**MVP 達成後の最初の運用品質向上フェーズ。**

---

## 1. レビュー対象

- 仕様正本: `.claude-team/handoff/design-handoff-A6.md`
- 直近 verdict: `.claude-team/verdicts/verdict-A5.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A6 / **MVP COMPLETE**）
- A5 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A5.md`
- ロードマップ: `.claude-team/roadmap.md` A6 行（月次集計の自動配信、Base44 Automation、CSV 本文埋め込み、失敗時リトライ方針）
- /goal: `.claude-team/goal.md` §0 / 「A6〜A8 は MVP 完成後の運用品質向上」位置付け
- 運用ルール: `.claude-team/auto-handoff.md` §0 DESIGN AUTHORITY RULE
- HANDOFF.md「未実装」表「月次集計の自動レポート送信」

---

## 2. CURRENT PHASE

`A6` — 集計: 月次集計の自動配信

純粋関数集約（aggregation.js）+ 通知ヘルパー追加（notifyMonthlySummary）+ Summary.jsx の admin 手動配信ボタン + Base44 Automation 設定文書（baseline-A6.md）。コード側は callable な純粋関数を提供し、scheduler 設定は Owner 側ダッシュボード作業に委任。

---

## 3. レビュー観点

### 3.1 ルール遵守
- [ ] REPOSITORY ISOLATION RULE 違反なし
- [ ] CURRENT PHASE のみ対象（A7 への前倒しなし）
- [ ] 9 ブロックすべて記載
- [ ] `goal.md` 非ゴール（マルチテナント / IC 連携）に違反なし
- [ ] DESIGN AUTHORITY RULE に従い、人間判断を仰ぐ設計判断が含まれていない
- [ ] AUTO HANDOFF ORCHESTRATION RULE に従い、ファイルベース通信前提

### 3.2 verdict-A5 §6 改善提案の取り込み
- [ ] DO 8 で実機検証を Owner 分担と明示（§6.6 継続）
- [ ] DO 9-10 で commit 後検証と雛形逸脱明示の継承（§6.3 / verdict-A4 §7.1）
- [ ] `useCanEdit` 抽出（§6.1）/ lint warnings 処遇（§6.2）/ Design Agent プロセス順序（§6.3）/ バルク通知レート制限（§6.4）/ ペイロード組み立てユーティリティ化（§6.5）はすべて A6 スコープ外と明示
- [ ] §6.4 のバルク通知レート制限懸念は handoff DO NOT で「A6 スコープ外、A7 以降の判断」と明示

### 3.3 verdict-A5 §9.7 への忠実性
- [ ] verdict-A5 §9.7 が指定した「A6（月次自動集計）= 運用品質向上開始」を網羅
- [ ] roadmap.md A6 行の「完成」「非実装」「レビュー条件」と整合

### 3.4 自リポ整合性
- [ ] DO で言及する `Summary.jsx` の `exportCSV`（L105-123 周辺）が現コードに実在
- [ ] `Summary.jsx` の `isAdmin` 分岐、`status: '承認済'` filter が実在
- [ ] `notifications.js` の `safeSend` / `getAdminEmails`（A5 で確立）が再利用可能な状態
- [ ] `functions/` ディレクトリが不在で、Base44 Automation 設定は Owner 側ダッシュボード作業に限定される現実と整合
- [ ] `base44.integrations.Core.SendEmail` API が A5 で実用化済（A6 で再利用）

### 3.5 スコープ妥当性
- [ ] 2 改修 + 3 新規（aggregation.js / baseline-A6.md / review-package-A6.md）の粒度が A6 単一フェーズとして適切
- [ ] aggregation.js が純粋関数のみを export する設計（テスト容易性、Base44 Automation script からも呼出可能）
- [ ] CSV を **本文末尾埋め込み** で送信する判断（添付ファイル API 未検証のため最小実装）
- [ ] Summary.jsx の chart / table / 既存集計表示への touch を完全に避ける構造
- [ ] DONE CRITERIA が客観的に検証可能（grep / 構造照合 / 純粋関数性 grep）
- [ ] REVIEW POINTS 16 項目が DONE CRITERIA をカバー

### 3.6 設計判断の妥当性
- [ ] `aggregateMonthlySummary` の `month: 1-12`（人間直感的、date-fns 0 始まり変換は内部）設計が将来の API 拡張と整合
- [ ] `buildReportsCSV` の戻り値が **BOM なし** プレーン文字列で、BOM 付与 + Blob は Summary.jsx 側に残す責任分離
- [ ] `notifyMonthlySummary` が A5 の `safeSend` / `getAdminEmails` を再利用し、独自の SendEmail 呼出を新規追加しない DRY 原則
- [ ] 手動配信ボタンが「先月の集計」を対象とする設計（A6 の業務想定: 月初に前月分配信）
- [ ] success / fail UI フィードバックがあるが、実際の配信成否は SendEmail ログでしか確認できない曖昧性を許容（A6 最小実装）
- [ ] Base44 Automation の Custom JavaScript runtime API は本リポジトリで未検証のため、baseline-A6.md の script 例は **暫定案**として記述（Owner が実機で確認しながら確定）
- [ ] CSV 添付を本文埋め込みにする判断が、Base44 SendEmail の attachments サポート未検証状況下で安全な最小実装か

### 3.7 依存と影響
- [ ] NEXT PHASE DEPENDENCY（A7 への前提条件）が明確
- [ ] A1〜A5 の成果物（receipts state / 1日1件 / edit 経路 / receipt AI / notifications.js）への破壊変更なし
- [ ] A6 の aggregation.js / notifyMonthlySummary が A7 の CSV フォーマット改変・大量データ対応の足場となる構造
- [ ] A6 と A8（規程変更履歴）が独立しており、相互依存なし

---

## 4. Design Agent からの確認事項

Review Agent は判定書面 §3 で以下に回答すること:

1. **CSV を本文末尾に埋め込む判断**: Base44 SendEmail の attachments API サポートを現リポジトリで検証していないため、A6 では本文埋め込みで最小実装。MIME 添付化は A7 以降で API 検証後に検討、という運用でよいか。代替案「baseline-A6.md に「添付化は Owner が Base44 Automation script 内で実装する」と委ねる」も検討余地
2. **`functions/` 不在下での Base44 Automation 設定**: 本リポジトリには Deno backend functions 配備がないため、scheduled trigger は Base44 ダッシュボード経由の Custom JavaScript で構築する。コード側は純粋関数 + Summary.jsx 手動ボタンを提供し、scheduler 連携は Owner 実機担当とする責任分離でよいか
3. **`useCanEdit` 抽出を A6 で行わない判断**: verdict-A5 §6.1 が「強く推奨」とした DRY 抽出。本 A6 は「月次自動集計」テーマに集中し、別フェーズ（A6.x / A8 拡張 / 独立軽量フェーズ）で扱う方針。この判断が「verdict 推奨を実装フェーズで順次取り込む」原則と整合するか
4. **手動配信ボタンの対象期間**: 「先月」固定としているが、Owner が任意月を選択して送れる UI も A6 で実装すべきか。handoff §[DO NOT]「配信先カスタマイズ UI」と境界が曖昧
5. **`aggregation.js` のテスト要否**: 純粋関数なのでテスト可能だが、A6 ではテストを書かない設計（DONE CRITERIA に test 含まず）。HANDOFF.md「未実装」表に「テストの作成（未作成）」とあるが roadmap A0〜A8 にテスト整備は含まれない。テスト整備は roadmap 改訂判断と扱う方針でよいか
6. **`baseline-A6.md` の暫定 script 例**: Base44 Automation の Custom JavaScript runtime API は本リポジトリで検証不能。暫定案として記述し、Owner が実機で確定する運用でよいか。または baseline-A6.md は「Owner 確認待ち」とプレースホルダ表記すべきか
7. **集計値の正確性検証**: `aggregateMonthlySummary` の戻り値が Summary.jsx 既存表示と一致することを Review Package §4 でどう確認するか。論理確認（コード読解で同等性証明）vs 実機確認（admin で Summary 開いて手動配信ボタン押下 + 既存表示と数値比較）

---

## 5. 期待する判定形式

Review Agent は `.claude-team/design-reviews/design-review-verdict-A6.md` を `templates/design-review-verdict-template.md` に従って作成する。

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
- 修正後は `design-handoff-A6-r2.md` + `design-review-request-A6-r2.md` として Design Agent が自動再申請

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
