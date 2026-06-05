# .claude-team/ — Team Development System 正本ディレクトリ

3Agent 体制（Design / Implementation / Review）のハンドオフファイル正本置き場。
**チャットは補助、ここのファイルが正本。**

---

## ⚠ 全 Agent 共通の最優先ルール

### REPOSITORY ISOLATION RULE
本プロジェクトは **Athos TravelMate 専用**。Agent は以下のみを参照できる:
- 現在の Git リポジトリ / 作業ディレクトリ
- `.claude-team/` 配下
- `src/HANDOFF.md`
- `README.md`（リポジトリ直下）

**参照禁止**: 他リポジトリ / 過去プロジェクト / `order-system` / `proxyhub-platform` / 代理店プラットフォーム / 補助金システム / `Priority9` / HQ・Agency・Sales 構造 / `viewAs` 構造

**違反検出時**: 当該 Agent は直ちに停止し、以下を出力する:
```
FOREIGN CONTEXT DETECTED

出典: ...
検出箇所: ...
不一致内容: ...
```
- Implementation Agent は **コード変更を一切行わない**
- Review Agent は **PHASE COMPLETE を宣言してはならず**、`REJECTED + FOREIGN CONTEXT DETECTED` のみ出力
- Design Agent は **原因除去後にのみ** 新しい Design Handoff を発行できる

詳細正本: `goal.md` §0

---

## 構成

| パス | 役割 | 生成者 |
|---|---|---|
| `goal.md` | プロジェクト不変ゴール（§0 REPOSITORY ISOLATION RULE） | Design Agent（初回のみ） |
| `roadmap.md` | A0〜A8 全体ロードマップ | Design Agent |
| `auto-handoff.md` | **AUTO HANDOFF ORCHESTRATION RULE 正本** | Design Agent |
| `current-phase.txt` | 現在フェーズ（例: `A0`） | Implementation→Review |
| `handoff/design-handoff-A{n}.md` | Design → Implementation 仕様（9 ブロック） | Design Agent |
| `design-reviews/design-review-request-A{n}.md` | Design → Review 設計レビュー依頼 | Design Agent |
| `design-reviews/design-review-verdict-A{n}.md` | Review → Design 設計レビュー判定 | Review Agent |
| `review-packages/review-package-A{n}.md` | Implementation → Review 実装証跡 | Implementation Agent |
| `verdicts/verdict-A{n}.md` | Review → Design 実装判定 | Review Agent |
| `templates/design-review-request-template.md` | 設計レビュー依頼ひな形 | Design Agent |
| `templates/design-review-verdict-template.md` | 設計レビュー判定ひな形 | Review Agent |
| `templates/implementation-go-template.md` | 人間→Implementation 起動の最小文面 | 人間 |

---

## AUTO HANDOFF ORCHESTRATION RULE（要旨）

詳細正本: `auto-handoff.md`

### 進行ループ（二段ゲート）

```
[人間] フェーズ開始指示
   ↓
Design Agent
   ├ design-handoff-A{n}.md 起草
   └ design-review-request-A{n}.md 作成
   ↓
🛑 実装前ゲート（Design Review Gate）
Review Agent
   └ design-review-verdict-A{n}.md
      ├ APPROVED_FOR_IMPLEMENTATION → 通過
      └ REJECTED_DESIGN → Design に戻る
   ↓
[人間] 実装 GO（templates/implementation-go-template.md）
   ↓
Implementation Agent
   ├ CURRENT PHASE のみ実装
   └ review-package-A{n}.md 作成
   ↓
🛑 実装後ゲート（Implementation Verdict Gate）
Review Agent
   └ verdict-A{n}.md
      ├ APPROVED / PHASE COMPLETE / NEXT PHASE: A{n+1}
      └ REJECTED → Implementation 再実施
   ↓
Design Agent: 次フェーズへ（Design Review からやり直し）
```

---

## 人間がやること（DESIGN AUTHORITY RULE 適用後）

| シーン | やること |
|---|---|
| プロジェクト最初 | 目的（/goal）の指示。以後は変更しない |
| 設計レビュー中 | **何もしない**（Design ↔ Review が `APPROVED_FOR_IMPLEMENTATION` まで自動継続。途中通知なし） |
| 各フェーズの実装 GO | `APPROVED_FOR_IMPLEMENTATION` 通知後、`templates/implementation-go-template.md` をコピペして Implementation Agent を起動 |
| 各フェーズの実装完了後 | `npm run dev` で localhost を画面確認 / preview / production を画面確認 |
| エラー時 | ログをチャットに貼って Agent に共有 |
| Deploy 時 | Deploy 承認の合図のみ |

**人間がやってはいけないこと**:
- Review 内容を要約して Implementation に伝える
- Implementation 結果を要約して Review に伝える
- ファイル正本を経由せず Agent 間を口頭で中継する
- Design Review 承認前に Implementation を起動する
- **設計内容の判断（採否・方針・粒度）に介入する**（決定権は Design ↔ Review の自動ループ）
- **Design Agent / Review Agent に「進めてよいか」を聞き返されたら、それ自体が DESIGN AUTHORITY RULE 違反として指摘する**

---

## Agent が自動でやること（人間の手を介さず）

| Agent | 自動で生成するファイル | 自動で読むファイル |
|---|---|---|
| Design | `design-handoff-A{n}.md`, `design-review-request-A{n}.md` | `goal.md`, `roadmap.md`, `verdict-A{n-1}.md`, `src/HANDOFF.md`, 実コード |
| Review（実装前） | `design-review-verdict-A{n}.md` | 左記 + `design-handoff-A{n}.md`, `design-review-request-A{n}.md` |
| Implementation | `review-package-A{n}.md`, （A0 のみ）`.env.example`, `current-phase.txt`, `baseline-A0.md` | 左記 + `design-handoff-A{n}.md`, `design-review-verdict-A{n}.md`, 実コード |
| Review（実装後） | `verdict-A{n}.md`, `current-phase.txt` 更新 | 左記 + `review-package-A{n}.md`, 差分 |

Agent 間で **チャット本文の引用・要約は一切行わない**。ファイル正本のみが情報源。

---

## 実装前ゲート（Design Review Gate）

- Design Agent は `design-handoff-A{n}.md` 起草と同時に `design-review-request-A{n}.md` を保存する
- Review Agent は `design-review-verdict-A{n}.md` に `APPROVED_FOR_IMPLEMENTATION` または `REJECTED_DESIGN` を出力
- `APPROVED_FOR_IMPLEMENTATION` が出るまで **Implementation Agent を起動してはいけない**
- 起動された Implementation Agent はまずこのファイルを確認し、未承認なら `MISSING DESIGN REVIEW APPROVAL` で停止

## 実装後レビューゲート（Implementation Verdict Gate）

- Implementation Agent は `review-package-A{n}.md` を保存して終了
- Review Agent は `verdict-A{n}.md` に判定を記録
  - 合格: `APPROVED` / `PHASE COMPLETE` / `NEXT PHASE: A{n+1}`
  - 不合格: `REJECTED`
  - 違反: `REJECTED` / `FOREIGN CONTEXT DETECTED`（`PHASE COMPLETE` 宣言禁止）
- 合格時のみ次フェーズの Design Review に進める
