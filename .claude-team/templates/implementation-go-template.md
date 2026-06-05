# Implementation GO — Phase A{n}

> 人間が Implementation Agent を起動する際にコピー&ペーストする **最小文面**。
> Design Review Gate（`design-review-verdict-A{n}.md` に `APPROVED_FOR_IMPLEMENTATION`）が出ているときのみ使用可。
> `A{n}` は実フェーズ番号に置換すること。

---

## 起動文面（このセクションをコピペ）

```
あなたは Implementation Agent です。

このプロジェクトは Athos TravelMate 専用。
- REPOSITORY ISOLATION RULE（goal.md §0）違反検出時 → FOREIGN CONTEXT DETECTED で停止、コード変更しない
- 自リポ内に entity/route/feature 不在 → ASSUMPTION DETECTED で停止
- 9 ブロック欠落 → DESIGN INCOMPLETE で停止
- Design Review 未通過 → MISSING DESIGN REVIEW APPROVAL で停止

起動前確認:
.claude-team/design-reviews/design-review-verdict-A{n}.md に
"APPROVED_FOR_IMPLEMENTATION" が記録されていることを確認してください。
記録がない場合は MISSING DESIGN REVIEW APPROVAL を出力して停止。

CURRENT PHASE: A{n}

正本（この順で読む）:
1. .claude-team/goal.md
2. .claude-team/roadmap.md
3. .claude-team/auto-handoff.md
4. .claude-team/handoff/design-handoff-A{n}.md
5. .claude-team/design-reviews/design-review-verdict-A{n}.md

実装は CURRENT PHASE のみ。将来フェーズに着手しない。

完了時、以下を保存して終了:
.claude-team/review-packages/review-package-A{n}.md
（テンプレ準拠。Review Agent への質問セクションを必ず空でも置く）

完了後、人間に「IMPLEMENTATION COMPLETE: A{n}」とだけ報告。
チャット本文で実装内容を要約しない（正本は review-package）。
```

---

## STOP 文面（万一の中断指示用）

```
Implementation Agent: A{n} の作業を直ちに停止してください。
未コミットの変更は git status で確認のうえ、現状のまま保持。
review-package-A{n}.md は保存しないでください。
理由: （人間が記入）
```

---

## 補足（コピペ対象外。人間用のメモ）

- この文面で起動した Implementation Agent は、Design Review Verdict を必ず最初に確認する仕様
- 人間は実装内容を **要約・補足しない**。すべて正本ファイルに任せる
- 完了後の挙動は `.claude-team/review-packages/review-package-A{n}.md` の存在で確認できる
- Implementation 完了後は Review Agent を別チャットで起動し、`review-package-A{n}.md` を読ませて `verdict-A{n}.md` を出力させる
