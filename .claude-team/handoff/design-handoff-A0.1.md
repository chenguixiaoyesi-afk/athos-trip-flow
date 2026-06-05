# Design Handoff — Phase A0.1

From: Design Agent
To: Implementation Agent（※ Design Review Gate 通過後のみ起動可）
Date: 2026-06-05
Goal 正本: `.claude-team/goal.md`
Roadmap 正本: `.claude-team/roadmap.md`
直近 verdict: `.claude-team/verdicts/verdict-A0.md`

本 handoff は Verdict A0 「Design Agent への指示（NEXT ACTION）」を 9 ブロック仕様に整形したもの。

---

## 【CURRENT PHASE】

**A0.1 — A0 の最終整合化（lint クリーン + `.env.example` tracking + 初回コミット + README 確定）**

A0 は完了済（verdict-A0.md APPROVED）だが `PHASE COMPLETE` 未宣言。本フェーズは A0 を完了状態に到達させるための短期整合化作業に限定する。新規機能は一切含まない。

---

## 【OBJECTIVE】

Verdict A0 が指摘した 4 項目を解消し、A1 開始の前提条件を整える:

1. `npm run lint` errors=0 / warnings=0 を達成（A0 で残った 12 件の未使用 import を削除）
2. `.env.example` を git tracked にする
3. `.claude-team/` 配下を git tracked にし、リモート同期可能にする
4. `README.md` の REPOSITORY ISOLATION RULE 追記を採用するか復元するかの意思決定（Verdict A0 §5 の最終判断）

---

## 【SCOPE】

Verdict A0 「A0.1 で対応すべきこと」4 項目に **厳密に限定**。新機能・新ルート・新エンティティ・依存追加は一切含まない。

| カテゴリ | 内容 |
|---|---|
| lint クリーンアップ | `src/components/forms/DayTripForm.jsx`, `src/pages/Approval.jsx`, `src/pages/Dashboard.jsx`, `src/pages/PolicyManagement.jsx`, `src/pages/ReportNew.jsx` の未使用 import 削除（合計 12 件） |
| `.gitignore` 整備 | `.env.example` を例外化する 1 行追加 |
| README.md 確定 | Verdict A0 §5 より「採用」を確定（理由: `goal.md §0` と整合する強化追記であり、他プロジェクト由来語彙は禁止リストとして列挙されているのみ） |
| 初回コミット | A0 + A0.1 の成果物を 1 コミットに集約 |

---

## 【DO】

### 1. lint クリーンアップ
- 作業ディレクトリで `npm run lint:fix` を **1 回のみ実行**（A0 の `lint:fix` 禁止に対する Verdict A0 §1 の例外許可）
- 実行後、`git diff` を **手動レビュー** し、削除された import がすべて実際に未使用であることを確認
- 誤検出があれば該当箇所のみ `git restore` で復元し、Review Package に誤検出の詳細を記録
- 期待される変更ファイル（Verdict A0 §1 で特定済）:
  - `src/components/forms/DayTripForm.jsx`
  - `src/pages/Approval.jsx`
  - `src/pages/Dashboard.jsx`
  - `src/pages/PolicyManagement.jsx`
  - `src/pages/ReportNew.jsx`
- 上記 5 ファイル以外に `lint:fix` が変更を加えた場合、その差分は **意図せざる変更** とみなし手動レビュー対象とする
- 完了後 `npm run lint` で errors=0 / warnings=0 を確認

### 2. `.gitignore` の整備
- `.gitignore` の既存 `.env.*` 行の **直下** に `!.env.example` を追加
- 追加後 `git check-ignore -v .env.example` が **No match** を返すことを確認
- `.gitignore` への変更は本 1 行のみ。他の ignored パターンには触れない

### 3. README.md の採用確定
- 現状の `README.md` 冒頭の REPOSITORY ISOLATION RULE 追記（27 行）を **採用** する
- 確定理由を `review-package-A0.1.md` に明記:
  - `goal.md §0` と整合する強化追記である
  - 他プロジェクト由来語彙は禁止リストとしてのみ列挙されており、参照前提ではない
  - Verdict A0 §5「推奨: 内容が `goal.md §0` と整合するため **コミット採用**」と一致
- ファイルへの追加変更は **行わない**（現状の追記をそのまま採用）

### 4. 初回コミット（A0 + A0.1）
コミット対象:
- `.env.example`（A0 で作成済）
- `.gitignore`（A0.1 で 1 行追記）
- `README.md`（外部編集された A0 期間の追記を採用）
- `.claude-team/` 配下すべて（`goal.md`, `roadmap.md`, `auto-handoff.md`, `README.md`, `current-phase.txt`, `baseline-A0.md`, `handoff/design-handoff-A0.md`, `handoff/design-handoff-A0.1.md`, `review-packages/review-package-A0.md`, `verdicts/verdict-A0.md`, `design-reviews/`（あれば）, `templates/*.md`）
- A0.1 lint クリーンアップで変更された `src/` の 5 ファイル

コミットメッセージ:
```
chore: bootstrap team development infrastructure (A0 + A0.1)

- Add REPOSITORY ISOLATION RULE to README and goal.md §0
- Set up .claude-team/ team development directory
- Add A0 baseline documentation
- Clean up unused imports in src/ (12 items in 5 files)
- Add .env.example with placeholder values
- Whitelist .env.example in .gitignore

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

ステージング:
- `git add .gitignore .env.example README.md .claude-team src/components/forms/DayTripForm.jsx src/pages/Approval.jsx src/pages/Dashboard.jsx src/pages/PolicyManagement.jsx src/pages/ReportNew.jsx`
- `git status` で intended files のみが staged になっていることを確認してから commit

### 5. 完了確認
- `git log -1` で 1 コミットが作成されていること
- `git status` が clean（HEAD = working tree）
- `git push` は **行わない**（人間の Deploy 承認待ち）

---

## 【DO NOT】

- `git push`（リモート反映は人間の Deploy 承認後）
- 新規機能の追加（A1 以降の前倒し禁止）
- 新規依存パッケージの追加
- `src/**` の機能変更（未使用 import 削除のみ許可）
- lint ルール（`eslint.config.js`）の変更
- `package.json` / `package-lock.json` の変更
- `vite.config.js` / `tailwind.config.js` / `postcss.config.js` の変更
- `src/api/base44Client.js` の変更
- `src/components/ui/*` の変更
- ロードマップ（`.claude-team/roadmap.md`）の改変
- `.claude-team/goal.md` の改変
- `.claude-team/auto-handoff.md` の改変
- `.claude-team/README.md` の改変
- `lint:fix` を 2 回以上実行
- 新規ルート / 新規ページ / 新規エンティティ
- `.env.local` の作成
- 任意の API キー・実トークン・実 URL の記載
- 複数コミットへの分割（A0 + A0.1 は 1 コミット）
- `--no-verify` などの hook スキップ
- `--amend` で既存コミットを書き換え（リポジトリは初回コミットのため amend 対象なし）
- `current-phase.txt` を `A1` に更新（A1 への遷移は Review Agent の verdict-A0.1 が行う）

---

## 【FILES / AREAS】

### 変更可能
- `src/components/forms/DayTripForm.jsx`（未使用 import 削除のみ）
- `src/pages/Approval.jsx`（同）
- `src/pages/Dashboard.jsx`（同）
- `src/pages/PolicyManagement.jsx`（同）
- `src/pages/ReportNew.jsx`（同）
- `.gitignore`（1 行追加のみ）

### 新規作成
- `.claude-team/review-packages/review-package-A0.1.md`

### 参照のみ（変更しない）
- `.claude-team/verdicts/verdict-A0.md`（本 handoff の根拠）
- `.claude-team/handoff/design-handoff-A0.1.md`（本ファイル）
- `.env.example`
- `README.md`（採用判断のみ。追加変更なし）
- `.claude-team/baseline-A0.md`

### 触れてはいけない
- 上記「変更可能」以外の `src/**`
- `package.json`, `package-lock.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `eslint.config.js`
- `src/api/base44Client.js`
- `src/components/ui/*`
- `.claude-team/goal.md`, `.claude-team/roadmap.md`, `.claude-team/auto-handoff.md`, `.claude-team/README.md`
- `.claude-team/templates/*.md`
- `node_modules/**`, `dist/**`, `base44/**`

---

## 【DONE CRITERIA】

Review Agent はこの順で確認する:

- [ ] `npm run lint` errors=0 / warnings=0
- [ ] `npm run build` 成功（`dist/index.html` 生成）
- [ ] `git check-ignore -v .env.example` が **No match** を返す
- [ ] `git ls-files .env.example` が出力を返す（tracked になっている）
- [ ] `git ls-files .claude-team/ | wc -l` が 10 以上（主要ファイル全部 tracked）
- [ ] 特に以下が tracked: `goal.md`, `roadmap.md`, `auto-handoff.md`, `current-phase.txt`, `baseline-A0.md`, `handoff/design-handoff-A0.md`, `handoff/design-handoff-A0.1.md`, `review-packages/review-package-A0.md`, `verdicts/verdict-A0.md`
- [ ] `git log --oneline` の HEAD が A0 + A0.1 まとめコミット 1 件
- [ ] `git status` が clean
- [ ] `git push` の実行履歴がない（`git log @{u}..` がエラーまたは空）
- [ ] `current-phase.txt` の内容が `A0.1`（A1 への更新は Review Agent が verdict-A0.1 で行う）
- [ ] `review-package-A0.1.md` に以下が記録されている:
  - `lint:fix` の差分一覧（5 ファイル名 + 削除された import の合計 12 件）
  - 誤検出の有無と対応
  - `git check-ignore -v .env.example` の出力
  - `git ls-files .claude-team/` の出力
  - `git log -1 --stat` の出力
  - `README.md` 採用判断の理由

---

## 【REVIEW POINTS】

Review Agent は以下を確認:

1. **スコープ厳守**: Verdict A0 「A0.1 で対応すべきこと」4 項目に限定されているか。A1 領域（receiptData 同期化 / `UserNotRegisteredError` 確認等）への前倒しがないか
2. **lint クリーンアップの正当性**: `lint:fix` が削除した import が実際に未使用であったか。Review Package の手動レビュー記録を確認
3. **`.env.example` の tracking 成立**: `git ls-files .env.example` で確認
4. **`.claude-team/` の tracking 完全性**: 重要ファイルが網羅されているか（DONE CRITERIA リスト準拠）
5. **コミット粒度**: A0 + A0.1 が 1 コミットにまとまっているか（履歴の純度）。複数コミットなら REJECTED
6. **`README.md` 採用判断**: Review Package に判断と理由が記録されているか
7. **REPOSITORY ISOLATION RULE 違反なし**: 差分に他プロジェクト由来の痕跡がないか（`goal.md §0`）
8. **`src/**` 機能変更なし**: 削除された import が機能を破壊していないこと（5 ファイルを通読して影響範囲を確認）
9. **`git push` 未実行**: 人間の Deploy 承認前にリモート反映していないか

判定:
- 合格時: `.claude-team/verdicts/verdict-A0.1.md` に
  ```
  APPROVED
  PHASE COMPLETE
  NEXT PHASE: A1
  ```
  + `current-phase.txt` を `A1` に更新
- 不合格時: `REJECTED` + 理由
- 違反時: `REJECTED / FOREIGN CONTEXT DETECTED`（`goal.md §0` 違反）

---

## 【NEXT PHASE DEPENDENCY】

A1（社員入口の信頼性）は以下を A0.1 に依存:

- `npm run lint` 緑のベースライン（A1 で `FieldworkForm.jsx` を改修する際の regression 検出基準）
- `.claude-team/` が tracked（A1 の handoff/review-package/verdict を Review Agent が確実に読める）
- `.env.example` が tracked（開発環境再現性）
- 初回コミットが存在（A1 の差分が clean diff として識別可能）

A1 の設計詳細は **A0.1 の Verdict が APPROVED となった後に Design Agent が作成する**。本 handoff の時点では描かない（CURRENT PHASE のみ仕様化）。
