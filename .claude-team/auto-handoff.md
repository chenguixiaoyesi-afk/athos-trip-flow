# AUTO HANDOFF ORCHESTRATION RULE

策定日: 2026-06-05
保持者: Design Agent
適用: **全 Agent 共通・即時発効**
優先度: `goal.md §0`（REPOSITORY ISOLATION RULE）> **DESIGN AUTHORITY RULE（§0 を参照）** > **本ルール** > `feedback_team_dev_system.md` > その他

---

## §0. DESIGN AUTHORITY RULE（設計決定権・自動継続ループ）

### 決定権の所在
設計内容の決定権は **人間ではなく** Design Agent と Review Agent の設計会議で決定する。
- Design Agent（Claude）: `goal.md` / `roadmap.md` / **直近の verdict** を根拠に設計を作成
- Review Agent（ChatGPT）: 設計を判定（`APPROVED_FOR_IMPLEMENTATION` / `REJECTED_DESIGN`）
- 人間: 「実装 GO」「画面確認」「Deploy 承認」「エラーログ共有」のみ。設計内容の判断は行わない

### 自動継続ループ
Design Review Gate は `APPROVED_FOR_IMPLEMENTATION` が出るまで以下を **自動継続** する:

```
Design Agent
   ↓ design-handoff-A{n}.md + design-review-request-A{n}.md 保存
Review Agent
   ↓ design-review-verdict-A{n}.md 保存
      ├ APPROVED_FOR_IMPLEMENTATION → 人間に通知、実装 GO 待ち
      └ REJECTED_DESIGN → Design Agent が改訂 → 再申請
Design Agent（改訂）
   ↓ design-handoff-A{n}-r{k}.md + design-review-request-A{n}-r{k}.md
Review Agent
   ↓ design-review-verdict-A{n}-r{k}.md
   ↓ (loop)
```

### 人間への通知ポリシー
- **通知禁止**: Design ↔ Review の途中イテレーション（`REJECTED_DESIGN` → Design 改訂 → Review 再判定 のサイクル中）
- **通知可能**: `APPROVED_FOR_IMPLEMENTATION` 到達時のみ
- Design Agent / Review Agent の各イテレーションは **ファイル保存のみ** で進捗を残す。チャット出力は最小限（"DESIGN ITERATION SAVED" / "REVIEW VERDICT SAVED" 等）

### 実装 GO トリガー
- `APPROVED_FOR_IMPLEMENTATION` 到達後、**人間が `templates/implementation-go-template.md` で Implementation Agent を起動** した場合のみ Implementation Phase へ移行
- 人間が GO を出さない限り Implementation は始動しない（Design Review 通過後の一時停止）

### Design Agent への禁止事項（本ルール由来）
- 人間に設計判断を仰ぐこと（「進めてよいか」「この方針でよいか」など）
- 設計イテレーション完了時に内容要約を人間にチャット出力すること
- 自身の判断で Review Agent を飛ばして Implementation 起動指示を出すこと

### Review Agent への禁止事項（本ルール由来）
- 人間の意見を引用して判定すること（判定根拠は `goal.md` / `roadmap.md` / 設計handoff / 既存 verdict のみ）
- `APPROVED_FOR_IMPLEMENTATION` 出力後に人間の承認を別途待つこと（Review Agent の責務は判定書面のみで完結）

---

---

## 目的

Agent 間のコピペを最小化し、人間は以下のみを担当する半自動運用に移行する。

- 最初の目的指示
- Design Review 通過後の実装 GO / STOP
- localhost / preview / production の画面確認
- エラー発生時のログ共有
- Deploy 承認

それ以外（Agent 間の内容中継、要約、再述）は **すべて禁止**。

---

## 基本方針

1. **正本は常に `.claude-team/` 配下の保存済みファイル**。チャット本文は補助。
2. Agent は次 Agent が読むためのファイルを生成する。前 Agent のチャット本文を引用・再述しない。
3. ファイルが存在しない場合、それは **未着手** を意味する。チャット内の言質は履行と見做さない。

---

## ファイルベース通信プロトコル

| 経路 | 産出ファイル | 配置 | 生成 Agent | 読者 Agent |
|---|---|---|---|---|
| Design → **Design Review** | `design-review-request-A{n}.md` | `.claude-team/design-reviews/` | Design | Review |
| Design Review → Design | `design-review-verdict-A{n}.md` | `.claude-team/design-reviews/` | Review | Design |
| Design → Implementation | `design-handoff-A{n}.md` | `.claude-team/handoff/` | Design（**Design Review 通過後のみ**） | Implementation |
| Implementation → Review | `review-package-A{n}.md` | `.claude-team/review-packages/` | Implementation | Review |
| Review → Design | `verdict-A{n}.md` | `.claude-team/verdicts/` | Review | Design |

`A{n}` の `n` は現在フェーズ番号。同フェーズで複数イテレーションが必要な場合、サフィックスを付ける（例: `design-review-request-A1-r2.md`）。古いファイルは削除せず履歴として残す。

---

## 標準ループ（実装前ゲート + 実装後ゲートの二段ゲート）

```
[人間] フェーズ開始指示
   │
   ▼
Design Agent
   ├─ design-handoff-A{n}.md を起草（CURRENT PHASE のみ・9ブロック）
   └─ design-review-request-A{n}.md を作成
      ↓ ファイル保存のみで遷移
Review Agent（実装前ゲート）
   ├─ 設計レビューを実施
   └─ design-review-verdict-A{n}.md を作成
       ├─ APPROVED_FOR_IMPLEMENTATION → 次へ
       └─ REJECTED_DESIGN → Design に戻る（再起草）
      ↓
[人間] 実装 GO トリガー（templates/implementation-go-template.md を貼り付け）
      ↓
Implementation Agent
   ├─ CURRENT PHASE のみ実装
   └─ review-package-A{n}.md を作成
      ↓ ファイル保存のみで遷移
Review Agent（実装後ゲート）
   └─ verdict-A{n}.md を作成
       ├─ APPROVED / PHASE COMPLETE / NEXT PHASE: A{n+1} → 次フェーズへ
       └─ REJECTED → Implementation 再実施
      ↓
Design Agent
   └─ 次フェーズの設計を起草（Design Review からやり直し）
```

---

## 実装前ゲート（Design Review Gate）

### Design Agent の責務
- `design-handoff-A{n}.md` を 9 ブロックで起草する
- **続いて** `design-review-request-A{n}.md` を作成し、Review Agent に渡す
- `APPROVED_FOR_IMPLEMENTATION` が `design-review-verdict-A{n}.md` に出力されるまで、Implementation Agent への引き渡しは **発生しない**

### Review Agent の責務（設計レビュー時）
- `design-handoff-A{n}.md` および `design-review-request-A{n}.md` を読む
- `design-review-verdict-A{n}.md` を出力する。判定は以下のみ:
  ```
  APPROVED_FOR_IMPLEMENTATION
  ```
  または
  ```
  REJECTED_DESIGN
  ```
- `REJECTED_DESIGN` の場合は理由・修正要求を verdict 本文に明記
- 設計レビュー段階では `PHASE COMPLETE` を絶対に宣言しない（フェーズはまだ実装すらしていない）

### 禁止
- `APPROVED_FOR_IMPLEMENTATION` 前に Implementation Agent を起動すること
- 人間が Review 内容を要約して Implementation Agent に伝えること

---

## 実装後ゲート（Implementation Verdict Gate）

### Implementation Agent の責務
- `design-handoff-A{n}.md` の DO/DO NOT に従って CURRENT PHASE のみ実装
- `review-package-A{n}.md` を作成して終了

### Review Agent の責務（実装レビュー時）
- `review-package-A{n}.md` および差分を確認
- `verdict-A{n}.md` を出力。判定は以下のみ:
  - 合格:
    ```
    APPROVED
    PHASE COMPLETE
    NEXT PHASE: A{n+1}
    ```
  - 不合格:
    ```
    REJECTED
    ```
- `FOREIGN CONTEXT DETECTED` の場合は **`REJECTED + FOREIGN CONTEXT DETECTED` のみ** を出力し、`PHASE COMPLETE` を絶対に宣言しない（`goal.md §0`）

---

## 人間の役割（半自動運用）

人間が行う **唯一の操作**:

| シチュエーション | 操作 | 使用テンプレート |
|---|---|---|
| 最初の目的指示 | フェーズ A0 開始の合図 | （自由文） |
| Design Review 通過後の実装 GO | Implementation Agent を起動 | `templates/implementation-go-template.md` |
| 各フェーズ完了後の画面確認 | `npm run dev` で動作確認 | — |
| エラー発生時 | ログをチャットに貼る | — |
| Deploy 承認 | 本番反映の合図 | — |

### 人間がやってはいけないこと
- Review 内容を要約して Implementation に伝える
- Implementation 結果を要約して Review に伝える
- ファイル正本を経由せず口頭/チャットで Agent 間を中継する
- Design Review 承認前に Implementation に進める

---

## A0 への遡及適用

本ルール発効時点で `.claude-team/handoff/design-handoff-A0.md` は既に存在する。よって A0 の処理順序は以下となる:

1. Design Agent: `design-review-request-A0.md` を新規作成（実装前ゲート発動）
2. Review Agent: 設計レビュー実施 → `design-review-verdict-A0.md` 作成
3. `APPROVED_FOR_IMPLEMENTATION` が出てから人間が実装 GO を出す
4. その後は標準ループに従う

**Implementation Agent は `design-review-verdict-A0.md` に `APPROVED_FOR_IMPLEMENTATION` が存在することを起動時に確認する。なければ起動しない。**

---

## 失敗時の挙動（要点）

| 状況 | Agent の挙動 |
|---|---|
| 9 ブロック欠落 | Design/Implementation: `DESIGN INCOMPLETE` 出力で停止 |
| 自リポ内に entity/route/feature 不在 | Implementation: `ASSUMPTION DETECTED` 出力で停止 |
| 他プロジェクト由来の前提を検出 | 全 Agent: `FOREIGN CONTEXT DETECTED` 出力で停止 |
| Design Review 未通過なのに Implementation 起動 | Implementation: 起動拒否、`MISSING DESIGN REVIEW APPROVAL` を出力 |
| 実装ゲートで `REJECTED` | Implementation: 同フェーズ番号で再実装 |
| 設計ゲートで `REJECTED_DESIGN` | Design: 同フェーズの handoff を改訂し再申請 |

---

## 関連
- `goal.md §0` — REPOSITORY ISOLATION RULE（最優先・全ルールに勝る）
- `roadmap.md` — A0〜A8 全体像
- `templates/design-review-request-template.md`
- `templates/design-review-verdict-template.md`
- `templates/implementation-go-template.md`
- 記憶: `feedback_team_dev_system.md`, `feedback_repository_isolation_rule.md`, `feedback_implementation_safety_rule.md`
