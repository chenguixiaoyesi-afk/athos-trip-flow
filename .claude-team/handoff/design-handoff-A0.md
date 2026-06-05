# Design Handoff — Phase A0

From: Design Agent
To: Implementation Agent
Date: 2026-06-05
Goal 正本: `.claude-team/goal.md`
Roadmap 正本: `.claude-team/roadmap.md`

---

## 【CURRENT PHASE】
**A0 — Foundation: 環境凍結 + チーム開発インフラ確立**

3Agent ループの最初のフェーズ。新規機能は追加しない。既存実装を凍結し、ハンドオフ運用と最小限のベースライン文書を整える。

---

## 【OBJECTIVE】
1. ローカル開発環境がクリーンに起動し、ビルド/lint が緑であることを Implementation Agent が確認する
2. `.claude-team/` 配下のハンドオフ運用を稼働状態にする
3. 現状の実装ベースラインを「凍結ドキュメント」として残し、以後の差分根拠とする
4. A1 以降の Design Agent が判断に使える最小限の事実台帳を整備する

---

## 【SCOPE】

A0 の作業範囲は以下に限定する。

| カテゴリ | 内容 |
|---|---|
| インフラ | `.claude-team/current-phase.txt` の新規作成（内容: `A0`） |
| 文書 | `.claude-team/baseline-A0.md` の新規作成（ビルド結果・依存バージョン・現状の実装インベントリを記録） |
| 環境検証 | `npm install` / `npm run lint` / `npm run build` の実行と結果記録 |
| `.env` 整備 | `.env.example` をリポジトリ直下に新規作成（README に書かれている `VITE_BASE44_APP_ID`, `VITE_BASE44_APP_BASE_URL` の2変数のみ。値はプレースホルダ） |
| Review Package | `.claude-team/review-packages/review-package-A0.md` を作成し、上記の証跡を添付 |

これ以外のファイルは変更しない。

---

## 【DO】

1. **環境検証を実行する**
   - `npm install`（依存解決のログを保存）
   - `npm run lint`（出力を保存。warnings は許容、errors は赤）
   - `npm run build`（成功すること。`dist/` が生成される）
   - 失敗した場合は **修正試行を A0 で行わず、Review Package にエラーをそのまま転記して停止する**

2. **`.env.example` を新規作成**
   - 配置: リポジトリ直下 `/.env.example`
   - 内容（README に準拠、値はダミー）:
     ```
     VITE_BASE44_APP_ID=your_base44_app_id_here
     VITE_BASE44_APP_BASE_URL=https://your-app.base44.app
     ```
   - 既存値・秘密情報は書かない

3. **`.claude-team/current-phase.txt` を新規作成**
   - 内容: 1行で `A0`

4. **`.claude-team/baseline-A0.md` を新規作成**
   - 含める章:
     - `## 1. ビルド検証結果`（lint/build/install のサマリと完了時刻）
     - `## 2. 主要依存バージョン`（`package.json` の dependencies から、`@base44/sdk`, `react`, `vite`, `tailwindcss`, `@tanstack/react-query`, `react-router-dom` の version 行を抜粋）
     - `## 3. 現状実装インベントリ`（HANDOFF.md の「✅ 実装済み」表をそのまま引用し、出典 `src/HANDOFF.md` を明記）
     - `## 4. 既知の不具合`（HANDOFF.md の「🐛 既知の不具合」表をそのまま引用）
     - `## 5. Base44 SDK 呼び出し一覧`（`grep -rn "base44\." src` の結果を、ファイル単位で集計した表）
   - 自分で解釈や提案を加えない。事実台帳に徹する。

5. **Review Package を作成**
   - 配置: `.claude-team/review-packages/review-package-A0.md`
   - 含める章:
     - `## 実施した DO 項目` のチェックリスト
     - `## 変更ファイル一覧`（`git status` 結果）
     - `## ビルド/lint 出力サマリ`（最終行 + エラー有無）
     - `## 添付`：上記新規4ファイルへのリンク（相対パス）
     - `## Review Agent への質問` セクション（任意、空でも可）

---

## 【DO NOT】

- 新規機能の実装をしない（M1〜M6 含む。これらは A1 以降で扱う）
- 既存 `src/**` のコード変更をしない（型・JSX いずれも）
- `package.json` / `package-lock.json` を変更しない（`npm install` の自動更新を除く）
- `src/components/ui/*` には**触らない**（shadcn 生成物）
- `src/api/base44Client.js` を変更しない
- `HANDOFF.md` / `README.md` を変更しない
- lint エラーの自動修正（`npm run lint:fix`）を実行しない
- 新しい依存パッケージを追加しない
- ハンドオフ運用以外のディレクトリを新設しない
- A1 以降の準備実装（ファイル雛形作成等）をしない
- ロードマップ（`.claude-team/roadmap.md`）を編集しない

---

## 【FILES / AREAS】

### 新規作成（Implementation Agent が作るファイル）
- `/.env.example`
- `/.claude-team/current-phase.txt`
- `/.claude-team/baseline-A0.md`
- `/.claude-team/review-packages/review-package-A0.md`

### 参照のみ（読むが変更しない）
- `package.json`
- `README.md`
- `src/HANDOFF.md`
- `src/**`（インベントリ作成のための grep のみ）

### 触れてはいけない
- `src/**` の全コード
- `package.json`, `package-lock.json`, `vite.config.js`, `tailwind.config.js`
- `base44/**`, `node_modules/**`
- `.claude-team/goal.md`, `.claude-team/roadmap.md`

---

## 【DONE CRITERIA】

以下を全て満たすこと（Review Agent はこの順で確認する）:

- [ ] `npm install` が成功し、警告以外のエラーがない
- [ ] `npm run lint` の **errors が 0**（warnings は許容）
- [ ] `npm run build` が成功し、`dist/index.html` が生成される
- [ ] `/.env.example` が存在し、2変数のみ、ダミー値である
- [ ] `/.claude-team/current-phase.txt` の内容が `A0`（trailing newline 1個まで許容）
- [ ] `/.claude-team/baseline-A0.md` に 5 章すべてが存在する
- [ ] `/.claude-team/review-packages/review-package-A0.md` が作成され、添付リンクが有効
- [ ] `git status` で上記4ファイル以外の **modified が 0**
- [ ] コミットはしない（Review Agent が判断する）

---

## 【REVIEW POINTS】

Review Agent は以下の観点で判定する。

1. **スコープ厳守**: `src/**` に1行も変更が入っていないか
2. **環境検証の真正性**: lint/build 出力が Review Package に貼られており、改竄痕跡がないか
3. **ベースライン文書の事実性**: `baseline-A0.md` が自分の解釈を含まず、HANDOFF.md と grep 結果の引用のみで構成されているか
4. **`.env.example` の安全性**: 実値・秘密情報・既存 token を含んでいないか
5. **ハンドオフ運用準備**: `current-phase.txt` と Review Package が次フェーズ起動に必要な情報を持っているか
6. **禁止事項違反の有無**: `lint:fix` を走らせていないか、依存を増やしていないか

判定後、Review Agent は以下を実施:
- 合格時: `.claude-team/verdicts/verdict-A0.md` を作成し、本文に
  ```
  APPROVED
  PHASE COMPLETE
  NEXT PHASE: A1
  ```
  を含めて保存する。`current-phase.txt` を `A1` に更新する。
- 不合格時: 同 verdict ファイルに `REJECTED` と差し戻し理由を列挙する。`current-phase.txt` は変更しない。

---

## 【NEXT PHASE DEPENDENCY】

A1（データ整合性: M5 receiptData 並列安全化 + M4 1日1件チェック展開）は以下を A0 に依存する:

- `baseline-A0.md` の「現状実装インベントリ」「既知の不具合」が A1 設計の根拠となる
- ビルド/lint 緑のベースラインが、A1 の差分検証の起点となる
- ハンドオフ運用が稼働していること（A1 設計仕様も `design-handoff-A1.md` として配置）

A1 の設計詳細は **A0 の Verdict が APPROVED となった後に Design Agent が作成する**。本ファイル時点では描かない。
