# Design Handoff — Phase A1

From: Design Agent
To: Implementation Agent（※ Design Review Gate 通過後のみ起動可）
Date: 2026-06-05
Goal 正本: `.claude-team/goal.md`
Roadmap 正本: `.claude-team/roadmap.md`
直近 verdict: `.claude-team/verdicts/verdict-A0.1.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A1）
A0.1 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A0.1.md`

本 handoff は roadmap.md の A1 行と verdict-A0.1 §9.4 の指示を 9 ブロック仕様に整形したもの。verdict-A0.1 §8 の改善提案（DONE CRITERIA に `grep -c AUTO-FILL` 追加、`current-phase.txt` 確認ステップの DO 明示）を反映済み。

---

## 【CURRENT PHASE】

**A1 — 社員入口の信頼性（受信データ整合性 + 認証エラー表示挙動確認）**

業務フロー「社員 → レポート作成 → AI 補完 → 承認 → 集計 → CSV → 旅費規定監査」のうち、起点である **社員レイヤの入口** を信頼できる状態にする。後続 A2〜A8 がこの上に積み上がる前提として、既知不具合 #4（`FieldworkForm` の領収書並列添字ずれ）を再現不能にする。

---

## 【OBJECTIVE】

1. `FieldworkForm.jsx` の領収書アップロード処理で、**並列に複数枚アップロードしても 3 つの state（`receiptFiles` / `receiptUrls` / `receiptData`）の添字が崩れない** ことを構造的に保証する
2. 認証エラー時のユーザー表示分岐（`UserNotRegisteredError` / `auth_required` リダイレクト）が破綻なく動作することを **コード変更なしで** 確認する
3. 既存 4 フォームの単件作成・申請に regression がないことを確認する
4. A2 以降のフェーズが依拠できる入口のベースラインを確立する

---

## 【SCOPE】

A1 の作業範囲は以下に **厳密に限定**:

| カテゴリ | 内容 |
|---|---|
| コード変更 | `src/components/forms/FieldworkForm.jsx` のみ。領収書 state 管理の同期化 |
| 検証（コード変更なし） | `src/lib/AuthContext.jsx` の認証エラー分岐 / `src/components/UserNotRegisteredError.jsx` の表示 |
| Regression 検証 | DayTrip / Overnight / Overseas / Fieldwork の 4 フォームで単件作成→申請が通ること |
| 文書化 | `review-package-A1.md` に実装方針の選択理由と検証手順・結果を記録 |

これ以外のファイルは変更しない。新規ファイルは Review Package 以外作らない。

---

## 【DO】

### 1. 現状把握（コード変更前）

`src/components/forms/FieldworkForm.jsx` の以下を読み、現状の構造を Review Package §1 に転記:

- L87-90 の 3 つの state 宣言（`receiptFiles` / `receiptUrls` / `receiptData`）
- L139-184 の `handleReceiptUpload` 関数
- L186-190 の `removeReceipt` 関数
- L143 の `const idx = receiptUrls.length + i;` のクロージャ変数参照

### 2. 実装方針の選択と記録

3 つの state 配列の同期化方法として以下 3 案のいずれかを Implementation Agent が選択する。**`review-package-A1.md` §2 に選択理由を記載する**。

| 案 | 概要 | 想定差分量 |
|---|---|---|
| A | 3 state を単一 state にまとめる: `receipts: Array<{url, name, parsed}>` + `uploadingIds: Set<id>` + `analyzingIds: Set<id>` | 中（既存参照箇所の全置換） |
| B | 各受信に stable な `id` を発行し、Map ベースで更新（既存 3 配列構造を維持しつつ、id 付きで添字非依存に） | 中 |
| C | アップロードキュー化（`for...of` で `await` 順次処理） | 小（並列性を犠牲） |

選択は Implementation Agent の裁量。**「最も破壊的影響が小さい案」を優先する** ことを推奨する（A or B）。C は UX 劣化が懸念されるため、A・B いずれも不可能と判断した場合のみ採用可。

### 3. 領収書 state の同期化を実装

選択した案に従い `FieldworkForm.jsx` のみを修正する。**他フォームには波及させない**（共通フック化は A4 で扱う）。

修正対象関数:
- `handleReceiptUpload`（並列アップロード時の添字整合性を構造的に保証）
- `removeReceipt`（同一 entity の削除が 3 配列／state 構造に対して整合的に行われること）

修正範囲外:
- AI 解析プロンプト（`InvokeLLM` の `prompt` 文字列、`response_json_schema`）→ 触らない
- 金額 0 ガード（L171 `if (parsed.amount && parsed.amount > 0)`）→ A4 で扱う、A1 では触らない
- `CATEGORY_MAP`（L131-137）→ 触らない
- カテゴリ→フィールドマッピング → 触らない
- UI 表示（既存 JSX）→ 触らない（state 構造を変更する場合のみ、表示側の参照を機械的に追従させる）

### 4. 認証エラー分岐の表示挙動確認（コード変更なし）

以下を **検証のみ** 実施し、`review-package-A1.md` §3 に手順と結果を記録:

- `src/lib/AuthContext.jsx` L55-71 の `auth_required` / `user_not_registered` 分岐
- 「招待されていないメール」で `/login` 経由で進んだ場合に `<UserNotRegisteredError />` に到達するか（手動確認 1 パス）
- token 不在で `/login` リダイレクトが発生するか（手動確認 1 パス）

手動確認が現実的に困難な場合（Base44 サンドボックスに招待外ユーザーを作れない等）は、その制約と代替検証手順（コード読解による分岐の論理確認）を `review-package-A1.md` §3 に明記する。

### 5. 既存 4 フォームの Regression 検証（コード変更なし）

DayTripForm / OvernightTripForm / OverseasTripForm / FieldworkForm の各々で:
- フォーム表示
- 必須項目入力 → 下書き保存
- 申請ボタン → status 遷移確認

を行い、結果を `review-package-A1.md` §4 に種別ごとに記録する。

### 6. `current-phase.txt` 確認（Verdict A0.1 §8 改善提案反映）

実装開始時点で `current-phase.txt` の内容が `A1` であることを確認する。`A0.1` のままなら **作業を中断し** Review Agent に dispatch 漏れを報告する（コード変更しない）。`A1` への更新は前 verdict 公示時点で Review Agent が実施済。

### 7. ビルド / lint 検証

実装完了後:
- `npm run lint` の結果を `review-package-A1.md` §5 に転記
- `npm run build` の結果を `review-package-A1.md` §5 に転記

---

## 【DO NOT】

- 1 日 1 件チェックの他フォーム展開（A2 スコープ）
- 領収書 AI ロジックの抽出・他フォーム展開（A4 スコープ）
- レポート編集経路 `/reports/:id/edit` の追加（A3 スコープ）
- メール通知の追加（A5 スコープ）
- AI 精算書見出し安定化（A4 スコープ）
- 金額 0 ガード強化（A4 スコープ）
- 新規ルートの追加（`src/App.jsx` への `<Route>` 追加禁止）
- 新規ページ / 新規エンティティ / 新規フックの作成
- 共通フックの抽出（A4 の `useReceiptParser` で行う、A1 では行わない）
- `lib/reportGenerator.js` のプロンプト変更
- `lib/policyContext.jsx` の変更
- 認証方式の変更（Base44 Auth を維持）
- `src/lib/AuthContext.jsx` のコード変更（読解と検証のみ）
- `src/components/UserNotRegisteredError.jsx` の変更
- `src/api/base44Client.js` の変更
- `src/components/ui/*` の変更
- `package.json` / `package-lock.json` への依存追加・削除
- `eslint.config.js` / `vite.config.js` / `tailwind.config.js` の変更
- `npm run lint:fix` の実行（手動で修正する）
- `.claude-team/goal.md` / `.claude-team/roadmap.md` / `.claude-team/auto-handoff.md` の変更
- `roadmap.md` の改変
- `current-phase.txt` を `A2` 以降に更新（Review Agent verdict-A1 のタイミングで Review Agent が更新する）
- `git push`（人間の Deploy 承認後のみ）
- `git commit --amend`（A0+A0.1 コミットへの改ざん）
- `--no-verify` / `--no-gpg-sign` 等の hook スキップ
- `review-package-A1.md` 内のプレースホルダ未充填での Review 起動

---

## 【FILES / AREAS】

### 変更可能
- `src/components/forms/FieldworkForm.jsx`（領収書 state 同期化のみ）

### 新規作成
- `.claude-team/review-packages/review-package-A1.md`

### 参照のみ（変更しない）
- `.claude-team/verdicts/verdict-A0.1.md`（本 handoff の根拠の一部）
- `.claude-team/handoff/design-handoff-A1.md`（本ファイル）
- `.claude-team/roadmap.md`（A1 行）
- `src/lib/AuthContext.jsx`（認証エラー分岐の検証）
- `src/components/UserNotRegisteredError.jsx`（表示の検証）
- `src/components/forms/DayTripForm.jsx`（regression 検証）
- `src/components/forms/OvernightTripForm.jsx`（regression 検証）
- `src/components/forms/OverseasTripForm.jsx`（regression 検証）
- `src/pages/ReportDetail.jsx`（申請後の状態確認）

### 触れてはいけない
- 上記「変更可能」以外の `src/**`
- `src/api/base44Client.js`
- `src/components/ui/*`
- `src/lib/reportGenerator.js`
- `src/lib/policyContext.jsx`
- `src/App.jsx`
- `package.json`, `package-lock.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `eslint.config.js`
- `.claude-team/goal.md`, `.claude-team/roadmap.md`, `.claude-team/auto-handoff.md`, `.claude-team/README.md`, `.claude-team/templates/*`
- `node_modules/**`, `dist/**`, `base44/**`

---

## 【DONE CRITERIA】

Review Agent はこの順で確認する:

- [ ] `npm run lint` errors=0 / warnings は A0.1 から増加していない
- [ ] `npm run build` 成功（`dist/index.html` 生成）
- [ ] `git diff --stat` の変更ファイルが **`src/components/forms/FieldworkForm.jsx`** と **`.claude-team/review-packages/review-package-A1.md`** の 2 ファイルのみ
- [ ] `FieldworkForm` の領収書 3 系列（`receiptFiles` / `receiptUrls` / `receiptData`、または同等構造）が常に同期している
- [ ] 並列 3 枚アップロード時に添字（または id ベース対応）が崩れないことが、`review-package-A1.md` §2 に**再現手順と期待挙動**として記録されている
- [ ] `removeReceipt` 操作で 3 系列または単一構造が同一 entity の削除として整合する
- [ ] 既存 4 フォームの単件作成→申請が動作する（`review-package-A1.md` §4 に種別ごとの結果記録）
- [ ] 認証エラー分岐の挙動が `review-package-A1.md` §3 に手動確認手順または論理確認として記録されている
- [ ] `review-package-A1.md` §2 に実装方針（A/B/C）の選択理由が記録されている
- [ ] `review-package-A1.md` が `templates/` 系統のひな形に従い、必須セクションすべて存在する（§1 現状把握 / §2 実装方針 / §3 認証検証 / §4 regression / §5 lint/build / §6 Review への質問）
- [ ] `grep -c "AUTO-FILL:" .claude-team/review-packages/review-package-A1.md` の出力が **`0`**（プレースホルダ完全充填）
- [ ] `current-phase.txt` の内容が `A1`（`A2` への更新は Review Agent が verdict-A1 で行う）
- [ ] `git push` 未実行（`git log @{u}..` で確認）
- [ ] コミットは Implementation Agent の判断で行う。コミットする場合は 1 件のみ、メッセージ案を Review Package §7 に記載する

---

## 【REVIEW POINTS】

Review Agent は以下を確認:

1. **スコープ厳守**: 変更が `FieldworkForm.jsx` の領収書 state 管理に限定されているか
2. **既知不具合 #4 の構造的解消**: 並列アップロードでの添字ずれが、選択された方針（A/B/C）の構造で**論理的に発生し得ない**ことが Review Package §2 で説明されているか
3. **A2 領域への侵食なし**: 1 日 1 件チェックロジックを他フォームに展開していないか
4. **A3 領域への侵食なし**: `/reports/:id/edit` ルートや `ReportEdit.jsx` を作成していないか
5. **A4 領域への侵食なし**: 領収書 AI ロジックの抽出・共通フック化、`reportGenerator.js` のプロンプト変更、金額 0 ガード強化、CATEGORY_MAP 変更を行っていないか
6. **A5 領域への侵食なし**: SendEmail 呼び出し追加・通知機構の作成をしていないか
7. **既存機能の不変性**: 単件アップロード時の挙動（既存 UX）が劣化していないか
8. **認証検証の妥当性**: `AuthContext.jsx` を読解した上で分岐ロジックの論理を Review Package §3 が説明できているか（手動確認できなかった場合の代替検証）
9. **Regression の網羅**: 4 フォームすべてが §4 に記録されているか
10. **REPOSITORY ISOLATION RULE 違反なし**: 差分・コメント・命名に他プロジェクト由来語彙が**参照前提として**出現しないか
11. **プレースホルダ完全充填**: `grep -c "AUTO-FILL:" review-package-A1.md` = 0
12. **`git push` 未実行**: HEAD と upstream の関係が unpushed のみ

判定:
- 合格時: `.claude-team/verdicts/verdict-A1.md` に
  ```
  APPROVED
  PHASE COMPLETE
  NEXT PHASE: A2
  ```
  + `current-phase.txt` を `A2` に更新（Review Agent の責任）
- 不合格時: `REJECTED` + 修正要求
- 違反時: `REJECTED / FOREIGN CONTEXT DETECTED`（`goal.md §0` 違反）

---

## 【NEXT PHASE DEPENDENCY】

A2（4 フォーム 1 日 1 件チェック展開）は以下を A1 に依存:

- `FieldworkForm.jsx` の領収書 state 同期化が完了（A2 で他フォームに 1 日 1 件チェックを展開する際、`FieldworkForm` の既存ロジックを参照モデルとする）
- 既存 4 フォームの基礎動作緑のベースライン（A2 で 3 フォームを改修する差分検証の起点）
- A1 で `lint` errors=0 を維持していること（A2 改修時の regression 検出基準）

A2 の設計詳細は **A1 の Verdict（実装後ゲート）が APPROVED となった後に Design Agent が作成する**。本 handoff の時点では描かない。
