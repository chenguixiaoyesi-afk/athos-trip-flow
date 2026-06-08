# Design Review Verdict — Phase A4

From: Review Agent
To: Design Agent
Date: 2026-06-06
Gate: **実装前ゲート（Design Review Gate）**
対象: `.claude-team/handoff/design-handoff-A4.md`
依頼: `.claude-team/design-reviews/design-review-request-A4.md`（**現時点で不在**、A2/A3 と同じ遅延 dispatch パターン、§2 で対応）
参照: `.claude-team/verdicts/verdict-A3.md` / `design-reviews/design-review-verdict-A3.md` / `.claude-team/goal.md` / `.claude-team/roadmap.md` / `.claude-team/auto-handoff.md` / `src/HANDOFF.md`

---

## 1. 判定

```
APPROVED_FOR_IMPLEMENTATION
```

---

## 2. レビュー方針注記

`design-review-request-A4.md` が orchestrator dispatch 時点で未生成のため、Review Agent は **handoff 単独 + roadmap A4 行 + verdict-A3 §6 改善提案 + HANDOFF.md P0 #2 / 既知不具合 #2 #3** を根拠に評価する。A2 / A3 と同じプロセスギャップ（任意改善 §5-1 で対応推奨、3 フェーズ連続発生）。

---

## 3. 観点別チェック結果

### 3.1 ルール遵守

| 観点 | 結果 | コメント |
|---|---|---|
| REPOSITORY ISOLATION RULE 違反なし | ✅ | handoff 全文を走査。参照禁止語彙の出現なし。参照先はすべて現リポジトリ実在物（4 form / `reportGenerator.js` / `src/hooks/` / `src/components/forms/` / `src/HANDOFF.md` / `.claude-team/**`） |
| CURRENT PHASE のみ対象 | ✅ | §[CURRENT PHASE] = `A4`。A5（メール通知）/ A8（規程 PDF 解析改善）への前倒し DO は無し。`useCanEdit` 抽出も明示的にスコープ外とし §4 Q5 で確認を仰ぐ姿勢 |
| 9 ブロック揃い | ✅ | CURRENT PHASE / OBJECTIVE / SCOPE / DO / DO NOT / FILES, AREAS / DONE CRITERIA / REVIEW POINTS / NEXT PHASE DEPENDENCY すべて存在 |
| /goal の非ゴール・制約に違反なし | ✅ | 非ゴール（多段階承認 / マルチテナント / Base44 移行 / 新規 LLM）に違反なし。DO NOT「新規 AI モデル接続（OpenAI 直接接続禁止）」を明示保護 |
| DESIGN AUTHORITY RULE 違反なし | ✅ | 人間への設計判断問い合わせなし。§4 質問は Review Agent への確認のみ |
| AUTO HANDOFF ORCHESTRATION RULE 準拠 | ✅ | 入出力ファイルパスが正規プロトコルと一致 |

### 3.2 verdict-A3 §6 改善提案の取り込み

| 改善提案 | handoff 反映 | 結果 |
|---|---|---|
| §6.1 AUTO-FILL 自己マッチ回避（分割表記） | DO 12 / DONE CRITERIA #19 / REVIEW POINTS 13 で `"AUTO-""FILL:"` 分割表記を明示 | ✅ |
| §6.2 手動 UI 検証推奨 | DO 10「手動 UI 確認が困難な場合は、コードロジックの存在を grep で示し論理確認として §4 に明記」+ 4 観点（FieldworkForm 不変性 / 3 form の動作 / 見出し安定 / 金額 0 ガード）を網羅 | ✅ |
| §6.3 `useCanEdit` 抽出 | DO NOT で本フェーズスコープ外、§4 Q5 で Review に判断依頼 | ✅ 適切な保留 |
| §6.4 lint warnings 3 件 | DO 9「A3 完了時点（3 件）から増加していないこと」+ 新規 hook / component で新たな warning が出ないこと | ✅ |

### 3.3 verdict-A3 §8.7 への忠実性

| 観点 | handoff 反映 | 結果 |
|---|---|---|
| A4 スコープ（領収書 AI 全フォーム展開 + 精算書安定化 + 金額 0 ガード） | OBJECTIVE 1-7 で完全網羅 | ✅ |
| roadmap.md A4 行との整合 | roadmap A4 「`src/hooks/useReceiptParser.js` 新規」「3 フォームに展開」「`lib/reportGenerator.js` のプロンプト強化で精算書見出し名固定」「金額 0 加算ガード強化」「CATEGORY_MAP の共通化または種別別拡張の判断を文書化」と完全一致 | ✅ |
| HANDOFF.md 既知不具合 #2 解消 | DO 6.1 + 6.2、AI 表記揺れ防止と分割 regex 化 | ✅ |
| HANDOFF.md 既知不具合 #3 解消 | DO 7、`typeof === 'number' && Number.isFinite && > 0` の 3 条件 AND を hook 内に集約 | ✅ |
| HANDOFF.md P0 #2 解消 | DO 5、3 form への展開で全種別領収書 AI 動作 | ✅ |

### 3.4 自リポ整合性（Review Agent 独立検証実施）

| 観点 | 実コード確認 | 結果 |
|---|---|---|
| FieldworkForm の receipts state | L113 `const [receipts, setReceipts] = useState(() => {...})`（A1+A3 で確立した単一 SOT） | ✅ handoff 期待通り |
| FieldworkForm の CATEGORY_MAP | L166 `const CATEGORY_MAP = { コワーキング / 貸会議室 / Wi-Fi / 駐車場 / 飲食 ... }` | ✅ |
| FieldworkForm の金額 0 ガード現状 | L223 `if (parsed.amount && parsed.amount > 0)` — handoff の「既知 #3」記述と整合（type 安全でない） | ✅ |
| reportGenerator.js 分割現状 | L244 `const parts = result.split('## 旅費精算書');` L247-249 で `## 経費精算書` フォールバック、L251-256 で reportBodyText/settlementText 返却 — handoff の「素朴 split」記述と整合 | ✅ |
| `## 旅費精算書` プロンプト出力指示の現所在 | L61, L118, L171（出張 3 種）/ L224（外出作業） — handoff の見出し固定指示追加対象と整合 | ✅ |
| STYLE_RULES の所在 | L5 で定義、L22 / L80 / L134 / L188 で各 prompt に注入 — handoff の「`STYLE_RULES` 末尾または各 prompt 末尾に追加」が機能する位置 | ✅ |
| 3 form の経費フィールド | DayTrip: highway/parking/taxi/other_transport（L31-34, L46-49）/ Overnight: 同 + shinkansen_reason（L34-37, L50-51）/ Overseas: flight/airport_transport/other_transport（L30-32, L41） | ✅ handoff の `CATEGORY_MAP_TRIP` / `CATEGORY_MAP_OVERSEAS` 設計と整合 |
| 3 form に既存 receipt UI 不在 | `grep "領収書\|receipt"` 3 form すべてヒット 0 | ✅ A4 が初導入 |
| `src/hooks/` ディレクトリと `useReceiptParser.js` 不在 | `ls src/hooks/` = `use-mobile.jsx` のみ、`useReceiptParser.js` 不在 | ✅ 新規作成準備済 |

### 3.5 スコープ妥当性

| 観点 | 結果 | コメント |
|---|---|---|
| hook + component の対称な抽出 | ✅ | hook はロジック（state, handlers, derived values）、component は UI（Card + input + プレビュー）。責務分離が明確 |
| hook シグネチャの汎用性 | ✅ | `initialReceiptUrls / categoryMap / fallbackKey / onAmountParsed` の 4 props で form 非依存。`onAmountParsed` callback が form 側の `setForm` 副作用を疎結合化 |
| CATEGORY_MAP の form 別管理 | ✅ | 各 form の経費フィールド構造が異なるため共通化しない判断は妥当。DayTrip/Overnight = 国内交通系、Overseas = 国際航空系、Fieldwork = 業務系で語彙が重ならない |
| 金額 0 ガードの型安全性 | ✅ | `typeof === 'number' && Number.isFinite && > 0` の 3 条件 AND は、`null` / `undefined` / `NaN` / `0` / 負数 / `'0'`（string） / Infinity すべてを正しく弾く |
| 見出し固定指示の強化 | ✅ | 表記揺れの例（`## 精算書` / `## 旅費精算` / `## 旅費精算書（合計）` / 見出しの前後余分文字）を明示的に禁止記述に含めることで AI への指示が明確 |
| 分割 regex の堅牢性 | ✅ | `/^##\s*(旅費精算書\|経費精算書)\s*$/m` は行頭/行末アンカで文中誤検出を防ぎ、前後空白も許容 |
| `e.target.value = ''` 追加 | ✅ | 「同じファイルの再選択」を可能にする UX 改善、handoff §2 注意点で意図的改善と明示 |
| DO NOT の網羅性 | ✅ | A5（メール通知）/ A8（規程 PDF 解析）/ `useCanEdit`（A4 スコープ外）/ CATEGORY_MAP 共通化禁止 / 新規 AI モデル接続禁止 / 既存 form の `validate` / 表示 JSX 本体への touch 禁止を網羅 |
| DONE CRITERIA の客観検証可能性 | ✅ | 全 21 項目が `grep` / `git diff` / `test -f` / 文字列マッチで機械検証可能 |
| REVIEW POINTS の網羅性 | ✅ | 15 項目で hook 等価性 / 展開対称性 / CATEGORY_MAP 適合 / 型安全性 / 見出し固定 / regex / edit モード維持 / create 不変性 / A5 侵食 / A8 侵食 を網羅 |

### 3.6 依存と影響

| 観点 | 結果 | コメント |
|---|---|---|
| NEXT PHASE DEPENDENCY が roadmap と整合 | ✅ | A5「メール通知」の前提として「4 form 領収書 AI 完成 → 総支給額・領収書件数の本文記載が可能」「hook 確立 → メール送信副作用の干渉最小化」「見出し安定化 → AI 生成テキスト引用構造の予測可能」を列挙。roadmap A4-A5 行と整合 |
| A3 成果物への破壊変更なし | ✅ | edit モード（A3 で導入）の receipts 復元（`existing-N` id）が hook 内で同等に再現される設計。`<ReportEdit />` への touch なし（DO NOT 明示） |
| A2 成果物への破壊変更なし | ✅ | 4 form の重複検証ロジックに touch なし（DO NOT 明示「既存 4 form の `validate` への touch」） |
| A1 成果物への破壊変更なし | ✅ | FieldworkForm の `receipts` 単一 SOT 構造を維持しつつ hook に責務移管 |
| 新規 status `'failed'` の導入による A1 JSX との整合 | ⚠ 軽微留意点 | A1 で FieldworkForm JSX に `r.status === 'done' && !r.parsed` で「解析失敗」表示する条件があった。本 handoff の hook は新規アップロード時の AI 解析失敗で `status: 'failed'` を設定（旧 A1 は `status: 'done', parsed: null`）。これは **意図的改善**（design-review-verdict-A3 §4 Q2 の「復元 receipt が解析失敗と誤表示される問題」を解消する効果あり）だが、ReceiptUploaderSection に抽出する JSX 内の表示条件を `r.status === 'failed'` に更新する必要あり。handoff §[DO] 3 は「FieldworkForm 現状の領収書 JSX を **そのまま抽出** して props 化する」と書いているが、status 意味論の変更を考えると **「適合的に抽出」** が正確。Implementation Agent がこの差異を認識して JSX 条件を更新することを期待する（§4 Q2） |

---

## 4. Design Agent の質問への回答（Review Agent からの自発的提示、request 不在のため）

`design-review-request-A4.md` 不在のため Design Agent からの明示質問は存在しないが、handoff 内で「§4 Q5 で Review に判断依頼」と明示された `useCanEdit` 抽出の判断、および Review Agent が判定中に気づいた懸念点を Q&A 形式で記録する。

### Q1. ReceiptUploaderSection の JSX 抽出時の「解析失敗」表示条件

**懸念**: handoff §[DO] 3 は「FieldworkForm 現状の領収書 JSX を **そのまま抽出** して props 化する」と指示。しかし FieldworkForm A1 JSX の「解析失敗」表示条件は `r.status === 'done' && !r.parsed`（A1 review-package §2.6 確認済）。本 handoff の hook は AI 解析失敗時に `status: 'failed'` を設定するため、抽出後の JSX 条件は `r.status === 'failed'` に変更しないと表示が機能しなくなる。

**Review Agent 判定**: handoff §[DO] 3 の「そのまま抽出」は **構造（Card / input / プレビュー）を維持する** 意図であり、status 意味論の変更に伴う条件式の調整は **適合的抽出** として許容される。Implementation Agent は ReceiptUploaderSection 内で以下のように更新することを推奨:

- `r.status === 'failed'` → 「解析失敗」表示（新規アップロードが AI 解析失敗）
- `r.status === 'done' && !r.parsed` → 表示しない（復元 entry、UI に余計な警告を出さない）
- `r.status === 'done' && r.parsed` → 解析結果（store / category / amount）を表示
- `r.status === 'uploading'` → アップロード中（スピナー）
- `r.status === 'analyzing'` → 解析中（Sparkles アイコン）

この更新により、design-review-verdict-A3 §4 Q2 で指摘した「復元 receipt が解析失敗と誤表示される副作用」が **本フェーズで構造的に解消** される。Implementation Agent が ReceiptUploaderSection 設計時に意識的に対応することを期待し、Review Package §3 に対応方針を記録することを推奨。

→ **handoff 設計自体は妥当**（hook 内 `'failed'` status は意図的改善）。Design Agent への修正要求なし。

### Q2. 新規 status `'failed'` の追加による A1 / A3 不変性

**懸念**: hook 内で新規 status `'failed'` を導入したことで、A1 で確立した 5 ステータス（`uploading` / `analyzing` / `done` / `done` + parsed=null）の意味論が変わる。

**Review Agent 判定**: A1 実装は AI 解析失敗時も `status: 'done'` を使い、parsed=null で区別していた。本 handoff の hook は `status: 'failed'` を明示することで状態空間が拡張され、より厳密になる。これは **後方互換性を保つ範囲の改善** であり regression ではない。A3 で導入された復元 entry（`status: 'done'` + `parsed: null`）も意味論的に正しい（「既存の領収書、AI 解析未実施」）。

→ **設計判断として妥当**。

### Q3. OverseasForm の `FALLBACK_OVERSEAS = 'airport_transport_fee'` 選択

**懸念**: handoff §[DO] 5.1 で OverseasForm の `FALLBACK_OVERSEAS = 'airport_transport_fee'` と設定。しかし OverseasForm には `other_transport_fee` フィールドも存在（grep で確認、L32, L41）。未マッチカテゴリのフォールバック先として `other_transport_fee` の方が「不明な経費」の受け皿として自然な選択肢ではないか？

**Review Agent 判定**: どちらも擁護可能な設計判断。

- `'airport_transport_fee'` 選択の根拠: 海外出張では交通費の大部分が空港絡みで、未分類でもこれに加算される確率が高い
- `'other_transport_fee'` 選択の根拠: 「不明 → other」の方がカテゴリ semantics として誠実

handoff の選択（`'airport_transport_fee'`）は前者の論理で、業務的に妥当な範囲。Implementation Agent が懸念を持つ場合は Review Package §2 で代替案として `'other_transport_fee'` を提示する余地はあるが、handoff 選択をそのまま採用しても問題なし。

→ **handoff 設計が妥当**（業務文脈次第で別解もある軽微な選択）。Design Agent への修正要求なし。

### Q4. プロンプトのカテゴリ拡張による FieldworkForm への影響

**懸念**: 本 handoff の hook prompt は「コワーキング / 貸会議室 / Wi-Fi / 駐車場 / 飲食 / 航空券 / 空港送迎 / タクシー / 高速道路 / その他」の **10 カテゴリ** を AI に提示。FieldworkForm の旧 prompt は 6 カテゴリ（A1 実装時）。FieldworkForm の AI 振る舞いが微妙に変化する可能性（例: コワーキング近隣のカフェ領収書を「飲食」ではなく「タクシー」と誤分類するリスク等）。

**Review Agent 判定**: 拡張カテゴリは form 別 `CATEGORY_MAP` で吸収される設計。FieldworkForm では:

- AI が「航空券」「空港送迎」「タクシー」「高速道路」を出力 → `CATEGORY_MAP_FIELDWORK` に match しない → `fallbackKey: 'other_work_fee'` に加算
- AI が「コワーキング」「飲食」等を出力 → 既存挙動と同等

→ **拡張カテゴリ自体が誤分類を増やすリスクは低い**（プロンプトは「該当しない場合はその他」と指示）。FieldworkForm の挙動変化は許容範囲。Implementation Agent が Review Package §4.1 で FieldworkForm の regression を確認する際にこの観点も含めることを推奨。

→ **handoff 設計が妥当**。Design Agent への修正要求なし。

### Q5. `useCanEdit` 抽出を A4 スコープ外とする判断

**懸念**: verdict-A3 §6.3 で「A4 で `useReceiptParser` 抽出時に `useCanEdit` も同時に共通化検討」を提案。本 handoff はこれをスコープ外とし、Design Agent が §4 Q5 で Review 判断を仰いでいる。

**Review Agent 判定**: **YES、本フェーズスコープ外として OK**。

根拠:
- A4 のスコープは既に hook + component 抽出、3 form 展開、reportGenerator 強化、金額 0 ガード強化と **大きい**（5 OBJECTIVE + 4 ファイル改修 + 2 ファイル新規）
- `useCanEdit` は ReportDetail.jsx と ReportEdit.jsx の 2 箇所でのみ重複しており、領収書 AI 4 form 展開と同じ「3 度目の重複」ではない（重複度が低い）
- A4 で同時導入すると、Review 観点が「領収書 hook + canEdit hook」と二系統になり、各々の影響範囲評価が複雑化する
- 単一フェーズ単一テーマの原則（`feedback-team-dev-system.md`「個人開発禁止 / 必ず3Agent ループ」）と整合
- `useCanEdit` 抽出を扱うなら次のような独立小フェーズ（例: A4.1 や roadmap 改訂で新フェーズ追加）が望ましい

→ **handoff のスコープ判断が妥当**。次フェーズ以降の Design Agent が `useCanEdit` 抽出フェーズを起案するか、現状の意図的複製を継続するかを判断する。

---

## 5. 任意の改善提案（非ブロッキング、A5 以降のテンプレ向上）

1. **Design Agent プロセス順序の徹底（3 フェーズ連続発生）**: A2 / A3 / A4 と 3 連続で `design-handoff-A{n}.md` の dispatch が `design-review-request-A{n}.md` よりも先に届いている。Design Agent が両ファイルを **同時保存 → 同時 dispatch** する運用に揃えることを強く推奨
2. **ReceiptUploaderSection の status 表示条件の明文化**: §4 Q1 の通り、handoff §[DO] 3 で「FieldworkForm 現状の領収書 JSX を **そのまま抽出**」と書かれているが、新規 `'failed'` status の導入により「適合的抽出」が必要。次フェーズ以降の handoff で hook 抽出を扱う際は「JSX 内の status 参照箇所を新規 status に合わせて更新」を明示すると Implementation Agent が迷わない
3. **`design-review-verdict-A3 §4 Q2` の解消の明示化**: 本 handoff は実質的に「復元 receipt の解析失敗誤表示」を `'failed'` status 導入で解消するが、handoff 本文にこれを明示する記述がない。次フェーズ以降は「verdict-A{n} §X の指摘を本フェーズで解消する」を明示すると、後方互換性の意図が伝わりやすい
4. **lint warnings 3 件の roadmap 組み込み判断**: A1 / A2 / A3 と通算 3 フェーズで「baseline 不変」扱い、本 A4 でも継続。次回 roadmap 改訂時に処遇を確定することを強く推奨

---

## 6. 修正要求

不要（`APPROVED_FOR_IMPLEMENTATION`）。

---

## 7. 次のトリガー

本ゲートは通過した。次の動作:

- Owner が `templates/implementation-go-template.md` を使って Implementation Agent を起動
- Implementation Agent は起動時に本ファイル（`design-review-verdict-A4.md`）§1 が `APPROVED_FOR_IMPLEMENTATION` であることを確認
- 確認後、`design-handoff-A4.md` の DO 1〜12 を順に実施
- 完了後 `review-package-A4.md` を作成し、Review Agent（実装後ゲート）に引き渡す
- 実コミットは **行わない**（DO 11 / DO NOT 明示）、Review Package §7 に staging + メッセージ案
- Review Agent は実装後ゲートで `verdict-A4.md` に `APPROVED / PHASE COMPLETE / NEXT PHASE: A5` または `REJECTED` を出力

Implementation Agent への留意事項（本 verdict §4 から導出）:
- ReceiptUploaderSection の JSX 内 status 参照を新規 4 状態（`uploading` / `analyzing` / `done` / `failed`）と復元 entry（`done` + parsed=null）に適合させる（§4 Q1）
- design-review-verdict-A3 §4 Q2 の「解析失敗 UI 衝突」が本フェーズで構造的に解消される旨を Review Package §3 に明記
- `FALLBACK_OVERSEAS` を handoff の `'airport_transport_fee'` で実装するが、Implementation Agent が代替案を提示する余地あり（Review Package §2 で議論可）

---

## 8. 参照根拠

- 設計仕様: `.claude-team/handoff/design-handoff-A4.md`
- 設計レビュー依頼: `.claude-team/design-reviews/design-review-request-A4.md`（不在、§2 で対応）
- 直近 verdict（実装後ゲート、前フェーズ）: `.claude-team/verdicts/verdict-A3.md`
- A3 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A3.md`（特に §4 Q2 復元 receipts UI 衝突）
- A1 review-package: receipts state 設計（§2.6）
- /goal: `.claude-team/goal.md` §0 / 非ゴール / 制約 / MVP 達成定義 #1 #2
- ロードマップ: `.claude-team/roadmap.md` A4 行 / A5 行 / 補助ロードマップ UI
- 運用ルール: `.claude-team/auto-handoff.md` §0（DESIGN AUTHORITY RULE）/ §ファイルベース通信プロトコル
- HANDOFF.md: P0 #2（領収書 AI 全フォーム展開未実装）/ 既知不具合 #2（精算書見出し不安定）/ 既知不具合 #3（金額 0 ガード）
- 実コード検証:
  - `src/components/forms/FieldworkForm.jsx` L113 / L166 / L223（receipts state, CATEGORY_MAP, amount guard）
  - `src/lib/reportGenerator.js` L5（STYLE_RULES）/ L22/L80/L134/L188（STYLE_RULES 注入）/ L61/L118/L171/L224（見出し出力指示）/ L244-256（分割ロジック）
  - `src/components/forms/DayTripForm.jsx` L31-34, L46-49（経費フィールド）
  - `src/components/forms/OvernightTripForm.jsx` L34-37, L50-51（同 + shinkansen_reason）
  - `src/components/forms/OverseasTripForm.jsx` L30-32, L41（flight / airport_transport / other_transport）
  - 3 form receipt UI 不在確認（`grep -c "領収書|receipt"` = 0）
  - `ls src/hooks/`（`use-mobile.jsx` のみ、`useReceiptParser.js` 不在）

---

## 9. 最終出力

```
APPROVED_FOR_IMPLEMENTATION
```
