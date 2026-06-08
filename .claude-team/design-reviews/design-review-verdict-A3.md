# Design Review Verdict — Phase A3

From: Review Agent
To: Design Agent
Date: 2026-06-05
Gate: **実装前ゲート（Design Review Gate）**
対象: `.claude-team/handoff/design-handoff-A3.md`
依頼: `.claude-team/design-reviews/design-review-request-A3.md`（**現時点で不在**、A2 と同じ遅延 dispatch パターン。本ファイル §2 でこの状況を反映）
参照: `.claude-team/verdicts/verdict-A2.md` / `design-reviews/design-review-verdict-A2.md` / `.claude-team/goal.md` / `.claude-team/roadmap.md` / `.claude-team/auto-handoff.md` / `src/HANDOFF.md`

---

## 1. 判定

```
APPROVED_FOR_IMPLEMENTATION
```

---

## 2. レビュー方針注記

`design-review-request-A3.md` が orchestrator dispatch 時点で未生成のため、Review Agent は **handoff 単独 + roadmap A3 行 + verdict-A2 §6-§8 + HANDOFF.md P0 #1** を根拠に評価する。A2 と同じプロセスギャップ（任意改善 §5-1 で対応推奨）。

---

## 3. 観点別チェック結果

### 3.1 ルール遵守

| 観点 | 結果 | コメント |
|---|---|---|
| REPOSITORY ISOLATION RULE 違反なし | ✅ | handoff 全文を走査。参照禁止語彙の出現なし。参照先はすべて現リポジトリ実在物（`src/App.jsx` / `src/pages/ReportDetail.jsx` / `src/pages/ReportNew.jsx` / 4 form / `src/HANDOFF.md` / `.claude-team/**`） |
| CURRENT PHASE のみ対象 | ✅ | §[CURRENT PHASE] = `A3`。NEXT PHASE DEPENDENCY は A4 の前提条件記述のみ。A4（領収書 AI 共通化 / プロンプト / 金額 0 / CATEGORY_MAP）/ A5（メール通知）への前倒し DO は無し。DO NOT で各侵食領域を明示 |
| 9 ブロック揃い | ✅ | CURRENT PHASE / OBJECTIVE / SCOPE / DO / DO NOT / FILES, AREAS / DONE CRITERIA / REVIEW POINTS / NEXT PHASE DEPENDENCY すべて存在 |
| /goal の非ゴール・制約に違反なし | ✅ | 非ゴール（多段階承認 / マルチテナント / Base44 移行）に触れず。制約（`base44Client.js` 不変 / `components/ui/*` 不変）を DO NOT で明示保護 |
| DESIGN AUTHORITY RULE 違反なし | ✅ | 人間への設計判断問い合わせなし。DO 6 で `current-phase.txt` 自動補正を Implementation Agent 内で完結。実装方針も Implementation Agent の裁量範囲を明示 |
| AUTO HANDOFF ORCHESTRATION RULE 準拠 | ✅ | 入出力ファイルパスが正規プロトコルと一致 |

### 3.2 verdict-A2 §6 改善提案の取り込み

| 改善提案 | handoff 反映 | 結果 |
|---|---|---|
| §6.1 handoff 起草直前の grep による行番号確定 | DO 1「行番号は handoff 起草時点のものではなく **A3 開始時の grep 結果を Review Package §1 に転記** することを優先する」 | ✅ 明示 |
| §6.2 lint warnings の処遇 | DO 7「A2 完了時点（3 件）から増加していないことを確認」+ 新規ファイル / 未使用引数で新 warning が出ないこと | ✅ 明示、現状維持方針 |
| §6.3 手動 UI 検証 | DO 8「手動 UI 確認が困難な場合は、コードのロジック存在を grep で示し、論理確認として §4 に明記」 | ✅ |
| §6.4 メタファイル commit は Owner 運用判断 | DO 9「実コミットは Review verdict 後の Owner 操作」+ DO NOT「`git commit` の実行」 | ✅ |

### 3.3 verdict-A2 §8.6 への忠実性

| 観点 | handoff 反映 | 結果 |
|---|---|---|
| A3 スコープ（レポート編集経路の追加） | OBJECTIVE 1-6 で網羅（`/edit` ルート / `ReportEdit.jsx` / 4 form の `mode` prop / `ReportDetail` 編集ボタン / 下書き-差戻し のサイクル / 申請中-承認済の編集禁止） | ✅ |
| roadmap.md A3 行との整合 | roadmap A3 「新規ルート `/reports/:id/edit` / 新規ページ `src/pages/ReportEdit.jsx` / 4 種別フォームに `mode` prop / `canEdit` 定義に従う / 保存は `Report.update`」と完全一致 | ✅ |
| HANDOFF.md P0 #1 解消 | OBJECTIVE 5「4 種別すべてで『下書き → 編集 → 申請』『差戻し → 編集 → 再申請』のサイクル」が P0 #1「申請後の編集手段」を直接解消 | ✅ |

### 3.4 自リポ整合性（Review Agent 独立検証実施）

| 観点 | 実コード確認 | 結果 |
|---|---|---|
| `src/App.jsx` の Routes 構造 | L44-55 `<Routes>` 配下、L50 `<Route path="/reports/:id" element={<ReportDetail />} />` を確認。handoff の「直後に挿入」指示は L51 への挿入で実現可能 | ✅ |
| `ReportNew.jsx` 実在（mount パターン参照元） | `test -f` で確認 | ✅ |
| `ReportDetail.jsx` `canEdit` ロジック | L66: `const canEdit = isOwner && (report?.status === '下書き' \|\| report?.status === '差戻し');` を確認。handoff の §[DO] 1 期待値「`canEdit = isOwner && (status==='下書き' \|\| status==='差戻し')`」と完全一致 | ✅ |
| `ReportDetail.jsx` `canEdit` 真ブロック | L104 `{canEdit && (` 〜 / L106-110 「申請する」「再申請する」ボタン存在、「編集する」不在 | ✅ handoff の §[DO] 5「申請する」ボタンの **直前** に挿入する設計が機能する位置を確認 |
| 4 form の現在シグネチャ（`{ onBack }` のみ） | DayTrip L16 / Overnight L17 / Overseas L16 / Fieldwork L61 すべて `({ onBack })` の単一 prop | ✅ handoff の「before」シグネチャと完全一致 |
| `STORAGE_KEY` / localStorage パターン | grep で **`FieldworkForm.jsx` のみ**（L16 `const STORAGE_KEY = 'fieldwork_defaults';` / L68 読込 / L128 書込）。他 3 form には不在 | ⚠ 軽微な不正確（handoff DO 4.1「localStorage 読み込み（STORAGE_KEY パターン、Fieldwork **等** で実装あり）」の「等」は事実上 Fieldwork のみ）。実装上は FieldworkForm のみで edit モード時の localStorage 抑制を行えばよく、実害なし |
| `ReportEdit.jsx` 不在（新規作成対象） | `test -f` で不在を確認 | ✅ 期待通り |
| FieldworkForm の `receipt_urls` 保存パターン | L253 / L270 で `receipt_urls: receiptUrls` を保存 | ✅ handoff DO 4.2 の「`initialReport.receipt_urls` から復元」が実データ構造と整合 |
| `useNavigate` 既存使用 | ReportDetail.jsx ですでに使用（編集ボタン追加時に既存 navigate を活用可能、DO 5 の指示通り） | ✅ |

### 3.5 スコープ妥当性

| 観点 | 結果 | コメント |
|---|---|---|
| 4 form の対称な `mode` prop / `initialReport` prop 追加 | ✅ | 4 form すべてで同一の prop デフォルト値（`mode = 'create'`, `initialReport = null`）と handleSubmit 分岐方式を明示。対称性が担保される |
| `canEdit` の意図的複製（ReportEdit / ReportDetail） | ✅ | DO 3 「`canEdit` のロジックは `ReportDetail.jsx` のそれと **完全に同一の真理値式** にする（DRY ではなく敢えて複製。共通化は将来）」を明示。A2 で確立した「3 度目まで素朴複製、A4 以降で共通化検討」原則と整合 |
| 自己除外の重複検証 | ✅ | DO 4.3 で 2 形式の code template（インライン / 連鎖 filter）を提示、Implementation Agent の可読性判断に委ねる |
| `report_number` / `created_by_*` の維持 | ✅ | DO 4.4 で 3 フィールドそれぞれを `mode === 'edit'` で `initialReport.*` から取得する template を明示 |
| `generated_*` テキストの引継 | ✅ | DO 4.5 で `generatedReport?.reportText \|\| initialReport?.generated_report_text \|\| ''` のフォールバック chain を明示 |
| `rejection_reason` の扱い | ⚠ 軽微留意点 | DO 4.4「edit モードで '差戻し' から '申請中' に再申請する際、rejection_reason を保存データに **明示的に含めない**（既存値が保持される、または Approval.jsx の次回差戻しで上書きされる）」は Base44 SDK の `update(id, data)` が **未指定フィールドを保持する** 挙動に依拠している。これは一般的な REST PATCH 的挙動だが、Base44 の `update` API 仕様の明示確認は handoff にはない。Implementation Agent が実装時に Base44 ドキュメント / 動作確認で前提を確認することを推奨（§4 Q1） |
| 領収書 receipts の復元 | ⚠ 軽微留意点 | DO 4.2 の復元 entry は `{ id: 'existing-${i}', url, name, parsed: null, status: 'done' }`。A1 で確立した FieldworkForm JSX が `r.status === 'done' && !r.parsed` を「解析失敗」UI として表示する条件（A1 review-package §2.6 で確認）と衝突する可能性。復元 receipt が「解析失敗」と誤表示される副作用あり（§4 Q2） |
| AI 生成テキストの差戻し挙動 | ✅ | edit 時に再生成しなくても initialReport の値を温存する DO 4.5 のフォールバック chain は妥当 |
| DO NOT の網羅性 | ✅ | A4（領収書 AI / 共通フック / プロンプト / 金額 0 / CATEGORY_MAP）/ A5（SendEmail）/ 申請中・承認済の編集 / 編集履歴 / 楽観ロック / `Report.create` 新規シナリオ / 新規ルート / 新規ページ / 新規エンティティ / 新規フックを網羅 |
| DONE CRITERIA の客観検証可能性 | ✅ | 全 17 項目が grep / `git diff` / `test -f` / 文字列マッチで機械検証可能 |
| REVIEW POINTS の網羅性 | ✅ | 15 項目で DONE CRITERIA と各侵食領域（A4 / A5）を独立観点として列挙 |

### 3.6 依存と影響

| 観点 | 結果 | コメント |
|---|---|---|
| NEXT PHASE DEPENDENCY が roadmap と整合 | ✅ | A4「領収書 AI 全フォーム展開 + 精算書安定化 + 金額 0 ガード」の前提として「4 form のシグネチャに `mode` / `initialReport` が安定して存在」「`Fieldwork` 以外の 3 form に領収書 AI 展開時に既存重複検証ロジックの上に上乗せできる構造」を列挙。roadmap A4 行と整合 |
| A2 成果物への破壊変更なし | ✅ | DO NOT「重複検証ロジックの素朴複製を維持」を維持。A2 で追加した 3 form の重複検証が edit モードで自己除外される設計（DO 4.3）は **既存ロジックの上書きではなく拡張**。`FieldworkForm` の重複検証も同様 |
| A1 成果物への破壊変更なし | ✅ | A1 で確立した FieldworkForm の `receipts` state 構造（`{ id, url, name, parsed, status }`）を維持し、edit モード時に `receipt_urls` から **追加初期化** する設計。state 構造自体は不変 |
| A4 への前倒し侵食なし | ✅ | DO NOT「領収書 AI ロジックの他フォーム展開 / 共通フック化」「金額 0 ガード強化 / `CATEGORY_MAP` / プロンプト変更」を明示 |
| A5 への前倒し侵食なし | ✅ | DO NOT「メール通知の追加」を明示 |

---

## 4. Design Agent の質問への回答（Review Agent からの自発的提示、request 不在のため）

`design-review-request-A3.md` 不在のため Design Agent からの明示質問は存在しないが、Review Agent が判定中に気づいた懸念点を Q&A 形式で記録する。

### Q1. Base44 `Report.update(id, data)` の未指定フィールド扱いについて

**懸念**: DO 4.4 は `rejection_reason` を `data` オブジェクトに含めない設計だが、Base44 SDK の `update` API が **PATCH 的（未指定フィールド保持）** か **PUT 的（未指定フィールドクリア）** かが handoff には明記されていない。

**Review Agent 判定**: 既存実装の `Approval.jsx`（参照のみ）で `base44.entities.Report.update(reportId, { ... })` を partial data で呼んでいる（差戻し時に `status` と `rejection_reason` のみを渡している、L42 / L55 / L70）が、これは「特定フィールドのみを上書きする」意図と整合。Implementation Agent が実装時に Base44 SDK ドキュメントまたは実機動作で「未指定フィールドが保持される」ことを **念のため確認** し、Review Package §3 に記録することを推奨。万が一未指定フィールドがクリアされる挙動なら、initialReport の全フィールドを data に含めて upsert する追加実装が必要になる。

→ **handoff 設計自体は妥当**。本懸念は Implementation Agent の検証責任。Design Agent への修正要求なし。

### Q2. 復元 receipts の `status: 'done'` + `parsed: null` が A1 の「解析失敗」UI と衝突する可能性

**懸念**: DO 4.2 の復元 entry は `parsed: null` / `status: 'done'`。A1 で確立した FieldworkForm JSX が（A1 review-package §2.6 によれば）`r.status === 'done' && !r.parsed` で「解析失敗」UI を表示する条件と一致。edit モードで開いた既存 receipt がすべて「解析失敗」と誤表示される副作用が想定される。

**Review Agent 判定**: handoff DO 4.2 は「`parsed` は復元しない（AI 解析結果は元の Report に直接反映済 = 金額フィールドが既に正しい値を保持）」と書いているが、UI 表示への副作用は記述なし。Implementation Agent の判断で以下のいずれかを採用することを推奨:

- (a) 新ステータス `'imported'` または `'preexisting'` を導入し、JSX の「解析失敗」表示条件を `r.status === 'done' && !r.parsed` に維持しつつ、復元 entry は別 status とする
- (b) 復元時に `parsed` を sentinel オブジェクト（例: `{ amount: null, store: '既存', category: '既存', date: '' }`）として埋める
- (c) JSX の「解析失敗」条件を `r.status === 'failed'` のような明示的フラグに変更
- (d) 「解析失敗」風表示でも UX 上許容（既存 receipt なので「分析しなくて良い」と解釈）

→ **handoff 設計自体は妥当**（receipts 復元の意図は正しい）が、Review Package §3 で Implementation Agent が選択した対処方針を明記することを推奨。本 verdict では (a) または (b) を推奨するが、選択は Implementation Agent の裁量。Design Agent への修正要求なし。

### Q3. `localStorage` 抑制対象は実質 FieldworkForm のみ

**懸念**: DO 4.1 後段「`localStorage` 読み込み（`STORAGE_KEY` パターン、Fieldwork 等で実装あり）は **edit モード時には行わない**」の「等」は、実コードでは Fieldwork のみが該当。Review Agent grep で確認済。

**Review Agent 判定**: 「等」表現は軽微な不正確だが、Implementation Agent が他 3 form で localStorage 抑制処理を実装しても **空走** するだけで実害はない。FieldworkForm のみで抑制すれば十分。

→ **handoff 設計自体は妥当**。Design Agent への修正要求なし。

### Q4. `report_number` 維持の必要性

**懸念**: edit モードで `report_number` を `initialReport.report_number` で維持する設計。新規生成パターンが `RPT-${Date.now().toString().slice(-8)}` と時刻ベースで一意性が比較的高くないため、維持しないと将来 `report_number` 検索 UI 等で混乱を招く可能性がある。

**Review Agent 判定**: handoff DO 4.4 が明示的に維持を指示しており、業務的意味（同じ Report の修正履歴を `report_number` で追跡可能にする）と整合。

→ **handoff 設計が妥当**。Design Agent への確認は不要。

### Q5. 4 form の field enumeration

**懸念**: DO 4.1「**各 form のフィールド一覧は、現状の `useState` 初期値オブジェクトから機械的に取得する**」は Implementation Agent に field 列挙の責任を委ねている。漏れがあると edit モードで一部フィールドが空に戻る regression が発生し得る。

**Review Agent 判定**: handoff DO 4.1 の「**新しいフィールドを増やさない**」明示と、DONE CRITERIA「create モードの動作が完全に既存と同一」を Review Agent が機械検証することで、漏れは Review 段階で検知可能。Implementation Agent が各 form の `useState` 初期値オブジェクトを完全に書き写すことが期待される。

→ **handoff 設計が妥当**。Design Agent への修正要求なし。

---

## 5. 任意の改善提案（非ブロッキング、A4 以降のテンプレ向上）

1. **Design Agent プロセス順序の徹底**: A2 と同じ。`design-handoff-A3.md` の dispatch が `design-review-request-A3.md` よりも先に届いた。Design Agent が両ファイルを同時保存する運用に揃えると Review Agent の dispatch 待ちが消える
2. **A4 で `useDuplicateReportCheck` + `useReceiptParser` の共通化を確実に組み込む**: A2 verdict §6.4 で同様の申し送り。A3 で `canEdit` ロジックが ReportDetail / ReportEdit に意図的複製されたため、A4 では `canEdit` も共通化候補に追加することを推奨
3. **領収書 receipts 復元時の UI 衝突対策の明文化**: §4 Q2 の対処方針（新 status / sentinel parsed / 条件変更）を次回以降の handoff template に「既存 state 構造の拡張時の UI 副作用チェック」として組み込むと、同種の副作用が将来再発しない
4. **Base44 SDK `update` API の挙動確認チェックリスト化**: §4 Q1 の partial update 挙動の前提確認を、`base44.entities.*.update` を使うフェーズの handoff で必須確認項目化すると、Implementation Agent の検証漏れを防げる
5. **lint warnings 3 件の roadmap 組み込み判断**: A1 / A2 と同様。次回 roadmap 改訂タイミングで処遇を確定

---

## 6. 修正要求

不要（`APPROVED_FOR_IMPLEMENTATION`）。

---

## 7. 次のトリガー

本ゲートは通過した。次の動作:

- Owner が `templates/implementation-go-template.md` を使って Implementation Agent を起動
- Implementation Agent は起動時に本ファイル（`design-review-verdict-A3.md`）§1 が `APPROVED_FOR_IMPLEMENTATION` であることを確認
- 確認後、`design-handoff-A3.md` の DO 1〜9 を順に実施
- 完了後 `review-package-A3.md` を作成し、Review Agent（実装後ゲート）に引き渡す
- 実コミットは **行わない**（DO 9 / DO NOT 明示）、Review Package §7 に staging + メッセージ案
- Review Agent は実装後ゲートで `verdict-A3.md` に `APPROVED / PHASE COMPLETE / NEXT PHASE: A4` または `REJECTED` を出力

---

## 8. 参照根拠

- 設計仕様: `.claude-team/handoff/design-handoff-A3.md`
- 設計レビュー依頼: `.claude-team/design-reviews/design-review-request-A3.md`（不在、§2 で対応）
- 直近 verdict（実装後ゲート、前フェーズ）: `.claude-team/verdicts/verdict-A2.md`
- A2 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A2.md`
- /goal: `.claude-team/goal.md` §0 / 非ゴール / 制約 / MVP 達成定義 #2
- ロードマップ: `.claude-team/roadmap.md` A3 行 / A4 行 / 補助ロードマップ
- 運用ルール: `.claude-team/auto-handoff.md` §0（DESIGN AUTHORITY RULE）/ §ファイルベース通信プロトコル
- HANDOFF.md: P0 #1（レポート編集機能未実装）
- 実コード検証:
  - `src/App.jsx` L44-55（Routes 構造）
  - `src/pages/ReportDetail.jsx` L66（canEdit）/ L104（canEdit 真ブロック）/ L106-110（既存ボタン）/ L122（差戻し reason）
  - `src/pages/ReportNew.jsx`（mount パターン参照）
  - `src/components/forms/DayTripForm.jsx` L16（シグネチャ）
  - `src/components/forms/OvernightTripForm.jsx` L17（シグネチャ）
  - `src/components/forms/OverseasTripForm.jsx` L16（シグネチャ）
  - `src/components/forms/FieldworkForm.jsx` L16/L61/L68/L128（STORAGE_KEY パターン）/ L253/L270（receipt_urls 保存）
  - `src/pages/ReportEdit.jsx`（不在確認）

---

## 9. 最終出力

```
APPROVED_FOR_IMPLEMENTATION
```
