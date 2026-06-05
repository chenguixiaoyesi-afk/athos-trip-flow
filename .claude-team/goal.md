# /goal — athos-trip-flow（旅費規定レポート自動生成システム）

策定日: 2026-06-05
策定者: Design Agent
変更: **目的・MVP・非ゴール・制約は書き換え禁止**（A0〜A8 完走まで不変）
改訂: 2026-06-05 REPOSITORY ISOLATION RULE を追記（追加であり目的の書き換えではない）

---

## 0. REPOSITORY ISOLATION RULE（全 Agent 共通・絶対・最優先）

このプロジェクトは **Athos TravelMate 専用** である。Design / Implementation / Review すべての Agent は以下のみを参照できる。

### 参照許可対象
- 現在の Git リポジトリ（`/Users/taaa_14/Desktop/システム開発/athos-trip-flow/`）
- 現在の作業ディレクトリ配下
- `.claude-team/` 配下（`goal.md`, `roadmap.md`, `handoff/`, `review-packages/`, `verdicts/`, `current-phase.txt`, `README.md`）
- `src/HANDOFF.md`
- `README.md`（リポジトリ直下）

### 参照禁止対象
- 他リポジトリ
- 過去プロジェクト
- `order-system`
- `proxyhub-platform`
- 代理店プラットフォーム
- 補助金システム
- `Priority9`
- HQ / Agency / Sales 構造
- `viewAs` 構造

### 不一致検出時の動作（全 Agent 共通）

現在のコードベースと一致しない前提（他リポジトリ由来の entity / role / table / route / feature / 構造）を検出した場合、当該 Agent は **直ちに作業を停止** し、以下を出力する。

```
FOREIGN CONTEXT DETECTED

出典: 参照しようとした前提（例: viewAs / Agency.role / proxyhub の table 名 など）
検出箇所: ファイル名や handoff のブロック名
不一致内容: 現在リポジトリで存在しない・定義が異なる点
```

停止後は **Review Agent の判定を待つ**。

### Agent ごとの行動規範

#### Design Agent
- handoff（`design-handoff-A{n}.md`）に他プロジェクト由来の前提を一切含めない
- 既存ロードマップを参照する際も、本ルールに違反する記載があれば修正する
- `FOREIGN CONTEXT DETECTED` の **原因が除去されたあと** にのみ新しい Design Handoff を発行できる

#### Implementation Agent — 実装前チェックリスト（必須）
着手前に以下を満たすことを確認する。1つでも違反したら `FOREIGN CONTEXT DETECTED` で停止。

- [ ] 他プロジェクト参照禁止（コード・命名・設計パターンともに）
- [ ] 現在リポジトリに存在しない **entity** の仮定禁止（`base44.entities.*` で grep して実在確認）
- [ ] 現在リポジトリに存在しない **role** の仮定禁止（`AuthContext` / `Layout.jsx` で grep）
- [ ] 現在リポジトリに存在しない **table / collection** の仮定禁止
- [ ] 現在リポジトリに存在しない **route** の仮定禁止（`src/App.jsx` で確認）
- [ ] 現在リポジトリに存在しない **feature / hook / component** の仮定禁止
- [ ] 不一致を検出した場合、コード変更を **一切行わず** `FOREIGN CONTEXT DETECTED` を出力して停止
- [ ] 関連: [[feedback-implementation-safety-rule]]（`ASSUMPTION DETECTED` ルール）と併用

#### Review Agent
- 差分に他プロジェクト由来の痕跡（命名・コメント・構造）がないか確認
- `FOREIGN CONTEXT DETECTED` を検出した場合、判定は以下のみとし **PHASE COMPLETE を宣言してはならない**:
  ```
  REJECTED
  FOREIGN CONTEXT DETECTED
  ```
  Verdict ファイル（`verdicts/verdict-A{n}.md`）に出典・検出箇所・不一致内容を記録する

---

## 1. 目的

株式会社 Athos 社内向け **旅費規定レポート自動生成システム** を、Claude Code Team Development System（Design / Implementation / Review の3Agent体制）で A0〜A8 を通して完成させる。

社員が出張・外出作業のレポートをスマホ/PC から作成 → 申請 → 承認まで完結し、管理者が月次集計を CSV 出力できる業務システムとする。AI（Base44 InvokeLLM / GPT-4o-mini）がレポート文章・領収書・旅費規程 PDF を解析し、人の手作業を最小化する。

---

## MVP 達成定義（業務フロー軸・A1〜A5 完了時点）

業務フロー「**社員 → レポート作成 → AI 補完 → 承認 → 集計 → CSV → 旅費規定監査**」のうち、**社員 → 承認** までが全 4 種別レポートで手作業介入ゼロで完結する状態を MVP とする。

1. 招待された社員がログインし、自分のレポートのみにアクセスできる（既存）
2. 全 4 種別フォームで「下書き → 編集 → 申請 → 承認/差戻し」が通る（A2, A3）
3. 全 4 種別で領収書 AI 仕分けと AI 本文生成が動作する（A4）
4. 申請/承認/差戻しの 3 イベントでメール通知が当事者に届く（A5）
5. 上記が既知不具合 4 件の影響を受けずに動作する（A1, A2, A4 で全件解消）

集計（A6）/ CSV 監査品質（A7）/ 規程履歴（A8）は **MVP 完成後の運用品質向上** に位置づける。

> 改訂: 2026-06-05 ユーザー指示により業務フロー軸で再定義。旧 MVP（領収書 AI 全展開 + メール通知 + 編集 + 並列整合性の 4 項目）はフェーズ A1〜A5 の達成として吸収。

---

## 非ゴール（今期はやらない）

- 多段階承認 / マルチテナント / Base44 以外への移行
- 新規 LLM プロバイダ追加 / 課金機能
- リファクタ目的のアダプタ層導入（A8 で検討）

---

## 制約

- Base44 と GitHub の 2-way sync を壊さない（同一ファイルの同時編集禁止）
- `src/api/base44Client.js` および `src/components/ui/*` は変更しない
- 旅費規程の値はマスター（`TravelPolicyMaster`）経由で参照し、フォームに直書きしない
- 個人開発禁止、必ず3Agent ループで進行

---

## 成功シグナル

- 1サイクル（申請→承認→集計→CSV）が管理者の手作業ゼロで完了
- 領収書アップロードから経費欄反映まで < 30 秒/枚
- 申請者が「下書き削除 → 再作成」する運用が消える

---

## 運用ルール（Forbidden Actions / Core Principle）

最重要ループ:
```
Review承認 → Design仕様 → Implementation実装 → Review判定
```
この順以外で進めてはいけない。詳細は記憶ファイル `feedback_team_dev_system.md` と本リポジトリの `.claude-team/roadmap.md` を参照。

加えて、**§0 REPOSITORY ISOLATION RULE は全 Agent・全フェーズに優先する絶対ルール** とする。本 §0 と他の §が矛盾する場合、§0 を優先する。

設計判断は **DESIGN AUTHORITY RULE**（`auto-handoff.md §0`）に従う:
- 設計内容の決定権は人間ではなく Design Agent ↔ Review Agent の自動継続ループにある
- Design Review Gate は `APPROVED_FOR_IMPLEMENTATION` まで自動継続、途中の人間通知は禁止
- `APPROVED_FOR_IMPLEMENTATION` 到達後に人間が「実装 GO」を出した場合のみ Implementation Phase へ移行
