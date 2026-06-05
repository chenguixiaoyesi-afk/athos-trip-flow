# Design Review Request — Phase A{n}

From: Design Agent
To: Review Agent
Date: YYYY-MM-DD
Gate: **実装前ゲート（Design Review Gate）**

このファイルは Design Agent が起草した `design-handoff-A{n}.md` の **実装前レビュー** を依頼するためのものです。Review Agent は本ファイルと `design-handoff-A{n}.md` を読み、`design-review-verdict-A{n}.md` を返します。

---

## 1. レビュー対象

- 仕様正本: `.claude-team/handoff/design-handoff-A{n}.md`
- 関連ロードマップ箇所: `.claude-team/roadmap.md` の `A{n}` 行 + 補助ロードマップ該当軸
- /goal § 該当する制約・非ゴール

---

## 2. CURRENT PHASE

`A{n}` — （フェーズ名を1行で）

---

## 3. レビュー観点（Design Agent が Review Agent に確認してほしいこと）

以下を **明示的に列挙する**。Review Agent はこのチェックリストに対して逐一可否を返す。

### 3.1 ルール遵守
- [ ] REPOSITORY ISOLATION RULE（`goal.md §0`）違反なし（他プロジェクト由来の前提・命名・構造を含まない）
- [ ] CURRENT PHASE のみを対象としている（将来フェーズ先取りなし）
- [ ] 9 ブロック（CURRENT PHASE / OBJECTIVE / SCOPE / DO / DO NOT / FILES・AREAS / DONE CRITERIA / REVIEW POINTS / NEXT PHASE DEPENDENCY）が揃っている
- [ ] /goal の非ゴール・制約に違反していない

### 3.2 自リポ整合性
- [ ] DO 項目で言及する entity / route / feature / hook がすべて現リポジトリに実在する（実コードで grep 検証可能）
- [ ] HANDOFF.md 記載と実コードに乖離がある箇所を Design が認識している

### 3.3 スコープ妥当性
- [ ] DO のサイズが過大・過小でない
- [ ] DO NOT が DO と矛盾しない
- [ ] DONE CRITERIA が客観的に検証可能（曖昧表現なし）
- [ ] REVIEW POINTS が DONE CRITERIA をカバーしている

### 3.4 依存と影響
- [ ] NEXT PHASE DEPENDENCY が roadmap.md と矛盾しない
- [ ] 既存フェーズ成果物（前フェーズの baseline 等）への破壊的変更を含まない

---

## 4. Design Agent からの確認事項（任意）

設計判断で迷った点・Review Agent の判断を仰ぎたい点を箇条書きで記述する。なければ「なし」と書く。

- （例）DO 項目の粒度をこれ以上細かくすべきか？
- （例）DONE CRITERIA に lint warnings 0 を含めるべきか？

---

## 5. 期待する判定形式

Review Agent は `.claude-team/design-reviews/design-review-verdict-A{n}.md` に以下のいずれかを記録する。

### 合格
```
APPROVED_FOR_IMPLEMENTATION
```
+ 通過した観点の確認サマリ

### 不合格
```
REJECTED_DESIGN
```
+ 不合格理由（該当観点を引用）
+ Design Agent が修正すべき具体的箇所

### REPOSITORY ISOLATION 違反検出時（最優先）
```
REJECTED
FOREIGN CONTEXT DETECTED
```
+ 出典 / 検出箇所 / 不一致内容（`goal.md §0` 形式）

---

## 6. 制約

- 本レビューは **設計のみ**。実装の良し悪し（コード品質）は対象外
- Review Agent は本レビューで `PHASE COMPLETE` を絶対に宣言しない（実装すらしていないため）
- Review Agent は新しいコードを書かない・既存コードを変更しない
