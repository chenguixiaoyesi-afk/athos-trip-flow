# Design Review Request — Phase A1

From: Design Agent
To: Review Agent
Date: 2026-06-05
Re-issued: 2026-06-05（verdict-A0.1-r2 受領後の再発行。内容変更なし、`r2 verdict` 根拠を §1 に追記のみ）
Gate: **実装前ゲート（Design Review Gate）**

本ファイルは `design-handoff-A1.md` の実装前レビュー依頼。Review Agent は本ファイルと `design-handoff-A1.md` を読み、`design-review-verdict-A1.md` を返す。

---

## 1. レビュー対象

- 仕様正本: `.claude-team/handoff/design-handoff-A1.md`
- 直近 verdict（r1）: `.claude-team/verdicts/verdict-A0.1.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A1）
- 直近 verdict（r2 再判定）: `.claude-team/verdicts/verdict-A0.1-r2.md`（同 APPROVED / PHASE COMPLETE / NEXT PHASE: A1 を維持。Implementation Agent の reconciliation 突合済）
- A0.1 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A0.1.md`
- ロードマップ: `.claude-team/roadmap.md`（A1 行 + 補助ロードマップ）
- /goal: `.claude-team/goal.md`（§0 REPOSITORY ISOLATION RULE / MVP 達成定義の構成要素 #5）
- 運用ルール: `.claude-team/auto-handoff.md`（§0 DESIGN AUTHORITY RULE）

### 1.x verdict-A0.1-r2 受領後の補足
- `design-handoff-A1.md` の内容は本 r2 受領後も改訂不要（verdict-A0.1-r2 §6.2 も「`design-handoff-A1.md` が既に Design Agent から提出されている」と確認）
- `current-phase.txt` は r2 §6.4 の通り Owner 判断待ち（現値 `A0.1`）。Design Agent / Review Agent ともに改変しない
- 本 design-review-request の改訂は **§1 への r2 verdict 参照追記のみ**。レビュー観点・確認事項・期待判定形式は不変

---

## 2. CURRENT PHASE

`A1` — 社員入口の信頼性（受信データ整合性 + 認証エラー表示挙動確認）

業務フロー起点の社員レイヤを信頼可能な状態にする。既知不具合 #4（`FieldworkForm` の領収書並列添字ずれ）を構造的に解消し、A2 以降のベースラインとする。

---

## 3. レビュー観点

### 3.1 ルール遵守
- [ ] REPOSITORY ISOLATION RULE 違反なし（他プロジェクト由来の前提・命名・構造を含まない）
- [ ] CURRENT PHASE のみを対象（A2/A3/A4/A5 への前倒しなし）
- [ ] 9 ブロックすべて記載
- [ ] `goal.md` 非ゴール・制約に違反なし
- [ ] DESIGN AUTHORITY RULE に従い、人間判断を仰ぐ設計判断が含まれていない
- [ ] AUTO HANDOFF ORCHESTRATION RULE に従い、ファイルベース通信前提

### 3.2 verdict-A0.1 §8 改善提案の取り込み
- [ ] DONE CRITERIA に `grep -c "AUTO-FILL:" review-package-A1.md` = 0 が含まれる
- [ ] DO に `current-phase.txt` 確認ステップが含まれる（`A1` であることを確認）
- [ ] orchestrator 擬陽性回避のため、本 handoff の例示語彙が判定書面の検出対象になりにくい構成になっているか（任意観点）

### 3.3 verdict-A0.1 §9.4 への忠実性
- [ ] verdict-A0.1 が指定した A1 スコープ「`FieldworkForm.jsx` の receiptData 並列整合性 + `UserNotRegisteredError` の表示挙動確認」を網羅
- [ ] roadmap.md A1 行と整合（社員入口の信頼性 / 既知不具合 #4 / 認証エラー分岐確認）

### 3.4 自リポ整合性
- [ ] DO で言及する `FieldworkForm.jsx` の行番号・関数名（`handleReceiptUpload` / `removeReceipt`）が実コードに存在
- [ ] 3 つの state（`receiptFiles` / `receiptUrls` / `receiptData`）が L87-90 に実在
- [ ] AuthContext.jsx L55-71 の分岐が実在
- [ ] DayTrip / Overnight / Overseas / Fieldwork の 4 フォームが実コードに実在
- [ ] HANDOFF.md「🐛 既知の不具合 #4」と矛盾しない

### 3.5 スコープ妥当性
- [ ] 実装方針 3 案（A/B/C）の提示が Implementation Agent の裁量を残しつつ判断材料を与えている
- [ ] 「最も破壊的影響が小さい案」を推奨する Design 判断が妥当
- [ ] C 案（キュー化）の UX 劣化リスクが正しく抑制されている
- [ ] DO NOT が過剰でなく、必要な領域（A2/A3/A4/A5/A6/A7/A8 + 認証方式 + UI ライブラリ + 設定ファイル類）を網羅
- [ ] DONE CRITERIA が客観的に検証可能
- [ ] REVIEW POINTS 12 項目が DONE CRITERIA をカバーし、各侵食領域（A2〜A5）が独立観点として列挙されている

### 3.6 依存と影響
- [ ] NEXT PHASE DEPENDENCY（A2 への前提条件）が明確
- [ ] A0.1 の成果物（lint 緑ベースライン、初回コミット、`.claude-team/` tracking）への破壊変更なし
- [ ] コミット粒度（A1 は 1 コミット推奨、Implementation Agent の判断）が後続フェーズの差分追跡を阻害しない

### 3.7 認証検証の現実性
- [ ] 「招待されていないメールでの `UserNotRegisteredError` 到達」を手動確認できない可能性に対する代替検証手順（コード読解）が用意されているか
- [ ] 認証コードの変更を禁止しつつ検証のみ求めることが、検証可能性と整合するか

---

## 4. Design Agent からの確認事項

Review Agent は判定書面 §3 で以下に回答すること:

1. **実装方針 3 案の提示**: A/B/C のうち Implementation Agent に選択させ、選択理由を Review Package §2 に記述させる設計でよいか？ Design Agent が 1 案に確定すべきという指摘があれば、その案と根拠を提示
2. **金額 0 ガードを A1 で扱わない判断**: 既知不具合 #3（金額 0 反映）は A4 で扱うとロードマップに定めている。A1 で `FieldworkForm` を触る機会だが「ついでに修正」を禁止した判断は妥当か？
3. **共通フック化を A1 でしない判断**: A4 で `useReceiptParser` を抽出予定。A1 では `FieldworkForm` 内に閉じた修正に留める方針は妥当か？（A4 での抽出コストが増える可能性とのトレードオフ）
4. **認証エラー検証のコード変更禁止**: A1 では `AuthContext.jsx` と `UserNotRegisteredError.jsx` を読解検証のみとし、コード変更を禁止した。挙動確認結果が不十分な場合（招待外ユーザーを作れない等）の代替手段として「論理確認のみで合格」を許容する設計でよいか？
5. **コミット方針**: A0.1 は 1 コミット集約だったが、A1 は Implementation Agent の判断に委ねた（Review Package §7 にメッセージ案記載）。後続 A2 以降との一貫性として、A1 もコミット必須とすべきか、あるいは Review verdict 後の人間 commit でよいか？

---

## 5. 期待する判定形式

Review Agent は `.claude-team/design-reviews/design-review-verdict-A1.md` を `templates/design-review-verdict-template.md` に従って作成する。

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
- 修正後は `design-handoff-A1-r2.md` + `design-review-request-A1-r2.md` として Design Agent が自動再申請（DESIGN AUTHORITY RULE 自動継続ループ）

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
| 初版 | 2026-06-05 | `design-handoff-A1.md` の実装前レビュー依頼として初回発行 |
| 再発行 | 2026-06-05 | orchestrator dispatch（verdict-A0.1-r2 受領）に伴う再発行。§1 に r2 verdict 参照を追記、本 §7 履歴を追加。レビュー観点・確認事項は不変 |
