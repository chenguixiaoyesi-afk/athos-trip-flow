# Design Review Verdict — Phase A7

From: Review Agent
To: Design Agent
Date: 2026-06-08
Gate: **実装前ゲート（Design Review Gate）**
対象: `.claude-team/handoff/design-handoff-A7.md`
依頼: `.claude-team/design-reviews/design-review-request-A7.md`（**現時点で不在**、A2-A6 に続き **6 フェーズ連続発生**、§2 で対応）
参照: `.claude-team/verdicts/verdict-A6.md` / `design-reviews/design-review-verdict-A6.md` / `.claude-team/goal.md` / `.claude-team/roadmap.md` / `.claude-team/auto-handoff.md`

---

## 1. 判定

```
APPROVED_FOR_IMPLEMENTATION
```

**ただし致命的な変数シャドー問題 1 件を §4 Q1 で指摘**。Implementation Agent への留意事項として §7 にも併記。

---

## 2. レビュー方針注記

`design-review-request-A7.md` が orchestrator dispatch 時点で未生成のため、Review Agent は **handoff 単独 + roadmap A7 行 + verdict-A6 §8.5 + HANDOFF.md Report スキーマ + A6 成果物（`aggregation.js`）** を根拠に評価する。**A2 / A3 / A4 / A5 / A6 / A7 と 6 フェーズ連続の同パターン**。改善提案 §5-1 で **3 度目の強い再推奨**（MVP 達成後のワークフロー改修候補として確定推奨）。

---

## 3. 観点別チェック結果

### 3.1 ルール遵守

| 観点 | 結果 | コメント |
|---|---|---|
| REPOSITORY ISOLATION RULE 違反なし | ✅ | 参照禁止語彙の出現なし |
| CURRENT PHASE のみ対象 | ✅ | A8（規程履歴）への前倒し DO 無し、DO NOT で明示禁止 |
| 9 ブロック揃い | ✅ |
| /goal の非ゴール・制約に違反なし | ✅ | 非ゴール（PDF 出力 / 列カスタマイズ UI / DB 永続化 / Web Worker）を DO NOT で明示禁止、CSV ライブラリ依存追加禁止も明示（goal 制約「依存追加最小化」と整合） |
| DESIGN AUTHORITY RULE 違反なし | ✅ | 人間判断仰ぎなし、Implementation Agent への裁量範囲（chunkSize 100-500、エスケープ実装手段）を §9 で明示 |
| AUTO HANDOFF ORCHESTRATION RULE 準拠 | ✅ |

### 3.2 verdict-A6 §6 改善提案の取り込み

| 改善提案 | handoff 反映 | 結果 |
|---|---|---|
| §6.1 MVP commit / 運用品質向上 commit の 2 分割 | Owner 判断に委ねる（A7 では commit ポリシー継続） | ✅ |
| §6.2 添付ファイル化の A7 設計 | DO NOT「メール添付ファイル機能の実装（roadmap 改訂時に別フェーズで判断）」明示、本フェーズで扱わない決定 | ✅ Design Agent 判断 |
| §6.3 Design Agent プロセス順序 | 本 handoff も同パターン継続（6 連続）、要対応 | ⚠ 未改善 |
| §6.4 `functions/` 配備検討 | A7 スコープ外明示 | ✅ |
| §6.5 lint warnings 3 件 | DO 6「A6 完了時点（3 件）から増加していない」継続 | ✅ |

### 3.3 verdict-A6 §8.5 + roadmap A7 行への忠実性

| 観点 | handoff 反映 | 結果 |
|---|---|---|
| A7 スコープ（CSV フォーマット固定 + 大量データ）= roadmap「CSV 列順・ヘッダ名を監査要件で固定 / 任意期間 + 対象絞り込み / 500 件超でフリーズしない / BOM 付き UTF-8（Excel 直接開封）」 | OBJECTIVE 1-5 で網羅 | ✅ |
| roadmap A7 非実装（PDF / 列カスタマイズ UI / 履歴 DB / 集計ロジック再設計） | DO NOT で全項目明示禁止 | ✅ |
| roadmap A7 レビュー条件（新フォーマット出力 / Excel 文字化けなし / 500 件・1000 件動作 / 既存集計値一致 / lint/build 緑） | DONE CRITERIA + REVIEW POINTS でカバー | ✅ |
| `audit` format による監査要件対応 + `simple` の既存維持 | DO 2.1-2.3 で 2 format 切替を明示、月次メールは simple 継続（DO NOT で audit 使用禁止） | ✅ |
| 大量データ chunked async | DO 2.3 で `chunkSize = 200` + `setTimeout(0)` で UI thread 解放 | ✅ |
| 絞り込み UI | DO 3.6 で期間 + ユーザー + 種別の Dialog | ✅ |

### 3.4 自リポ整合性（Review Agent 独立検証実施）

| 観点 | 実コード確認 | 結果 |
|---|---|---|
| 既存 `buildReportsCSV` シグネチャ | aggregation.js L92 確認、A6 完了状態 | ✅ |
| `aggregation.js` の純粋性 | grep ヒット 0（A6 確立） | ✅ |
| Summary.jsx の `exportCSV` | L110 で確認 | ✅ |
| Summary.jsx の `sendPreviousMonthSummary` | L124 で確認、A6 完了状態 | ✅ |
| Summary.jsx の Dialog 使用 | 既存使用ヒット 0、A7 で初導入 | ✅ |
| Summary.jsx の `Filter` icon import 不在 | A7 で追加必要 | ✅ |
| Summary.jsx の `Loader2` 既存 | A6 で追加済、A7 で再利用 | ✅ |
| Approval.jsx の Dialog import パターン | L8 `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';` 確認、handoff §3.1 template と一致 | ✅ |
| `@/components/ui/dialog` 実在 | `test -f` で確認 | ✅ |
| HANDOFF.md Report schema フィールド | audit format で参照する全 33 フィールドが実在（report_number, created_by_email, approved_date, approver_name, destination_address, country_name, city_name, business_content, num_nights, num_days, driving_distance_km, highway_fee, parking_fee, taxi_fee, other_transport_fee, flight_fee, airport_transport_fee, coworking_fee, wifi_fee, meal_fee, other_work_fee + 既存使用フィールド） | ✅ |
| audit format 列数 = 33 | 手動カウントで確認（baseline-A7.md「20-32 経費内訳」は 13 列の簡略表記） | ✅ |
| Audit Format フィールドの実コード参照 | A4-A6 で実際に使われているフィールドが含まれ、実 Report エンティティとの整合あり | ✅ |

### 3.5 スコープ妥当性

| 観点 | 結果 | コメント |
|---|---|---|
| `aggregation.js` 純粋性維持 | ✅ | 内部ヘルパー（escapeCsvCell / getHeaders / buildRow / rowToCsvLine）すべて副作用なし、`buildReportsCSVAsync` の setTimeout は非ブロッキング yield のみで I/O ではない |
| `buildReportsCSV` の backward compatibility | ✅ | 内部実装書き換えのみ、外形挙動は **エスケープ追加** のみが差分。通常データでは出力結果完全同一。design-review-verdict-A6 §4 Q1 で防御フォールバック追加を承認した先例と同じ「意図的改善」扱い |
| RFC 4180 準拠の最小エスケープ | ✅ | regex `/[",\n\r]/` で必要十分、`"` を `""` にエスケープ、null/undefined 時は `''` フォールバック |
| chunked async の妥当性 | ✅ | `chunkSize = 200` は経験的に UI thread 解放と速度のバランス点、最終 chunk 後は setTimeout 不要（無駄な待機なし）、onProgress callback の例外は try-catch で吸収 |
| audit format 33 列の業務妥当性 | ✅ | 監査用に必要な属性（承認者・承認日・期間・経費内訳の個別列）を網羅、baseline-A7.md で正本化 |
| Dialog UI 設計 | ✅ | shadcn/ui の `Dialog` + `Select` + `Input` + `Label` の既存組み合わせ、`__all__` センチネル値で「全員/全種別」を表現（Select の空文字列制約への対応） |
| 0 件絞り込み時のフォールバック | ✅ | alert + early return、UI 状態（auditExporting）が正しく false に戻る |
| ファイル名形式 | ✅ | `旅費精算_監査用_${start}_${end}.csv`、`start`/`end` が空時 `'all'` フォールバック |
| BOM 付与の UI 層保持原則 | ✅ | A6 で確立した「browser 依存処理は UI 層に残す」原則を継承 |
| A6 月次メールへの影響限定 | ✅ | DO NOT「A6 月次メールに audit format 使用禁止」明示、`notifyMonthlySummary` 呼出の `buildReportsCSV` はエスケープ追加のみが差分 |
| DO NOT の網羅性 | ✅ | PDF / 列カスタマイズ UI / DB 永続化 / Web Worker / WASM / 添付ファイル / 既存「CSV 出力」変更 / A6 ボタン変更 / A5 以前成果物 / A8 領域 / CSV ライブラリ依存追加 を網羅 |
| DONE CRITERIA の客観検証可能性 | ✅ | 全 27 項目が grep / `git diff` / `test -f` / 関数呼出での値検証で機械検証可能 |
| REVIEW POINTS の網羅性 | ✅ | 17 項目で各成果物保護 + chunked async / エスケープ / 列定義 / 絞り込み を網羅 |

### 3.6 依存と影響

| 観点 | 結果 | コメント |
|---|---|---|
| NEXT PHASE DEPENDENCY が roadmap と整合 | ✅ | A8「規程変更履歴 + 影響範囲追跡」の前提として「audit CSV に規程バージョン列追加の余地」「`buildReportsCSVAsync` パターン再利用」を列挙、roadmap A7-A8 整合 |
| A6 成果物への破壊変更なし | ✅ | DO NOT で `aggregateMonthlySummary` / `formatSummaryForEmail` / `notifyMonthlySummary` / 月次メールボタン保護 |
| A5 / A4 / A3 成果物への破壊変更なし | ✅ | DO NOT で全ファイル明示禁止 |

---

## 4. Design Agent の質問への回答（Review Agent からの自発的提示、request 不在のため）

### Q1. ⚠️ **致命的**: `buildRow(r, format)` の引数名 `format` が date-fns の `format` 関数をシャドーする

**懸念**: handoff §[DO] 2.1 の `buildRow` 関数のシグネチャに重大なバグがある。

```js
function buildRow(r, format) {        // ← 引数名 'format'
  if (format === 'audit') {
    return [
      ...
      r.created_date ? format(new Date(r.created_date), 'yyyy-MM-dd') : '',  // ❌ TypeError: format is not a function
      ...
    ];
  }
  return [
    ...
    r.created_date ? format(new Date(r.created_date), 'yyyy/MM') : '',  // ❌ 同
    r.travel_date || r.start_date || (r.created_date ? format(new Date(r.created_date), 'yyyy-MM-dd') : ''),  // ❌ 同
    ...
  ];
}
```

引数名 `format` がスコープ内で date-fns の `format` 関数をシャドーする。`buildRow(r, 'audit')` のように呼出時に第 2 引数として文字列 `'audit'` を渡すと、関数本体内の `format(new Date(...), ...)` は文字列 `'audit'` を関数として呼出すことになり **実行時に `TypeError: format is not a function` を発生**。

**Review Agent 判定: Implementation Agent への必須留意事項として明示、`APPROVED_FOR_IMPLEMENTATION` だが修正必須**。

根拠:
- ビルド・lint は通る（変数シャドーは ESLint default で error 化されていない）
- 実行時 TypeError 発生 → admin が「監査用 CSV 出力」を押すと壊れる
- 修正は容易（複数の選択肢）
- handoff の他の部分は妥当な設計
- REJECTED_DESIGN にすると Design Agent re-issue 手間がかかる、Implementation Agent が容易に修正可能な範囲

**修正の選択肢（Implementation Agent の裁量）**:

- **(a) 引数名を `formatName` / `csvFormat` 等に変更**（推奨、最小変更）:
  ```js
  function buildRow(r, formatName) {
    if (formatName === 'audit') { ... format(new Date(r.created_date), 'yyyy-MM-dd') ... }
    ...
  }
  ```
  `getHeaders` / `buildReportsCSVAsync` の `format` 引数名も合わせて変更（一貫性のため）。

- **(b) date-fns import を別名化**:
  ```js
  import { format as formatDate, getYear, getMonth } from 'date-fns';
  // buildRow 内: formatDate(new Date(r.created_date), 'yyyy-MM-dd')
  ```
  `buildReportsCSV` 内の `format` 呼出も同様に変更必要。

- **(c) buildRow の引数を明示的にオブジェクト化**:
  ```js
  function buildRow(r, { format: csvFormat }) { ... }
  ```

Implementation Agent は (a) を採用することを推奨し、Review Package §2 / §3 に「handoff 雛形の `format` 引数シャドーを `formatName` に変更した（design-review-verdict-A7 §4 Q1 の指摘）」を明示すること。

**Design Agent への申し送り（任意改善 §5-2）**: 次回 handoff 起草時に「**雛形コード内の引数名と import 済関数名のシャドー検査**」をチェックリスト項目化することを推奨。

### Q2. `__all__` センチネル値の Select 制約対応

**懸念**: handoff §3.6 の Dialog で `Select` の value に `__all__` センチネルを使用。空文字列を value にできない shadcn/ui Select の制約への対応か？

**Review Agent 判定**: **妥当**。

根拠:
- shadcn/ui の Select（Radix UI ベース）は value="" の SelectItem を許容しない制約あり
- `__all__` センチネル値で「全員/全種別」を表現し、`onValueChange` で空文字列に変換する設計は標準的なワークアラウンド
- ユーザー視認性は表示テキスト「全員」「全種別」で確保

### Q3. `r.created_date.slice(0, 10)` の YYYY-MM-DD 比較依存

**懸念**: handoff §3.3 の `filterReportsForAudit` で `r.created_date.slice(0, 10)` を `YYYY-MM-DD` として比較。これは `created_date` が ISO 8601 形式 (`2026-06-08T12:30:00.000Z`) であることを前提とする。

**Review Agent 判定**: **Base44 仕様前提として妥当**。

根拠:
- Base44 SDK の Date 型は通常 ISO 8601 形式
- `slice(0, 10)` は文字列前方 10 文字を切り出し、ISO 8601 なら正確に `YYYY-MM-DD` 部分を取得
- 文字列比較で日付範囲フィルタが正しく動作（ISO 8601 は辞書順 = 時系列順）
- ただし `created_date` が null/undefined のケースで `r.created_date.slice(...)` は `TypeError` を発生する可能性

→ handoff §3.3 では `const rDate = r.created_date ? r.created_date.slice(0, 10) : '';` と null ガードあり ✅

### Q4. CSV 出力のメール添付化を A7 で扱わない判断

**懸念**: verdict-A6 §5 Q2 で「A7 設計時に Design Agent / Owner 判断」と述べたが、本 handoff は DO NOT で「メール添付ファイル機能の実装（roadmap 改訂時に別フェーズで判断）」を明示している。これは妥当か？

**Review Agent 判定**: **妥当**。

根拠:
- A7 は CSV フォーマット固定 + 大量データに集中、添付化機能の検証は独立した検討項目
- Base44 SendEmail の添付サポート確認 → 実装 → 検証は A7 スコープを膨らませる
- roadmap 改訂時に独立フェーズ（例: A6.1 / A7.1 / 月次メール改善フェーズ）として起案する方がスコープ管理上自然

### Q5. `chunkSize = 200` のデフォルト値

**懸念**: handoff §2.3 で `chunkSize = 200` をデフォルト。500 件で 3 chunks、1000 件で 5 chunks、各 chunk 後に setTimeout(0)。これは UI thread 解放として十分か？

**Review Agent 判定**: **妥当**。

根拠:
- 200 件処理に要する時間は 50ms 程度（経験則、CSV 文字列連結 + escapeCsvCell regex 適用）
- 各 chunk 後の setTimeout(0) で UI thread 解放、ブラウザ再描画 1 フレーム挿入
- 1000 件で 5 chunks × 50ms ≒ 250ms + 4 frames(≒ 64ms) ≒ 320ms 程度で完了
- ブラウザフリーズなしの目標を達成
- handoff §9「`chunkSize` のデフォルト値変更（100-500 の範囲で正当化）」で Implementation Agent の裁量も明示

---

### 4.5 補足: design-review-request-A7.md §4 の明示質問への回答（遅延 dispatch 対応）

`design-review-request-A7.md` が本 verdict 起草中に遅延 dispatch で到着したため、リクエスト §4 の 8 質問を確認し、未回答分（リクエスト Q1, Q2, Q4, Q5, Q7, Q8）に回答する。Q3（chunkSize）は §4 Q5 で、Q6（メール添付化 A7 不対応）は §4 Q4 で既に回答済。

### Q6. リクエスト §4 Q1: 既存 `buildReportsCSV` の内部書き換え判断

**懸念**: A6 で確立した既存関数を **内部リファクタ**（getHeaders/buildRow ヘルパー経由 + エスケープ追加）する設計。「A6 成果物に touch しない」原則との境界として許容範囲か？ 代替案として「既存関数を完全保持し、新規 `buildReportsCSVV2` を別途追加」もある。

**Review Agent 判定**: **内部リファクタ採用を承認**（代替案は不採用推奨）。

根拠:
- 通常データでの外形挙動は **完全等価**（同一バイト列出力）
- エスケープが効くケース（カンマ・改行・引用符を含むセル）は **CSV 規格準拠の改善**であり、A6 で意図せず正しく動作していなかった部分の修正
- 代替案「V2 別関数追加」は **A6 月次メールの本文埋め込み CSV が非エスケープのまま残る** ため、規格非準拠が残存し業務的に劣る
- design-review-verdict-A6 §4 Q1 で `buildReportsCSV` の防御フォールバック追加を「意図的改善」として承認した先例と同じ思想
- A6 月次メールに引用符付きセルが含まれても、メーラーは plain text として表示し、視認性に有意な影響なし（§4.5 Q10 参照）

→ **handoff 設計が妥当**。Design Agent への修正要求なし。

### Q7. リクエスト §4 Q2: audit format 33 列の列順・列名確定

**懸念**: handoff §2.1 で提示した 33 列が業務監査ニーズと整合するか。`業務内容` フィールドは長文の場合 CSV セルとして肥大化するが、エスケープで対応する設計でよいか、あるいは省略すべきか？

**Review Agent 判定**: **33 列構成を承認、`業務内容` は含めて OK**。

根拠:
- 33 列は監査要件の主要属性（識別 / ステータス / 申請者 / 承認情報 / 期間 / 目的地 / 業務内容 / 経費内訳）を網羅
- 経費内訳の **個別列化**（合計だけでなく日当・宿泊費・各種交通費・各種業務費を分離）は、監査担当が「どの費目で支出が多いか」を直接集計可能にする業務価値が高い
- `業務内容` は監査時に「正当な業務理由があったか」を確認する核心情報。省略は監査品質低下
- 長文（50 文字以上必須、HANDOFF.md schema）でも CSV セルとして引用符 + 改行保持で扱える（§4.5 Q11 参照）
- Excel での表示は「セル内改行」として正しく扱われる（広く使われる挙動、Owner 実機検証で確認可）

任意改善（非ブロッキング、A8 以降）: `業務内容` 列を別シート/別 CSV として分離するオプションは roadmap 改訂時に検討。本フェーズは 1 CSV に集約で十分。

### Q8. リクエスト §4 Q4: 絞り込み UI 3 軸限定

**懸念**: 「期間 + ユーザー + 種別」の 3 軸に限定。ステータスフィルタ（承認済以外も含む等）は扱わない（Summary は `Report.filter({ status: '承認済' })` で事前絞り込み済）。これでよいか？

**Review Agent 判定**: **3 軸限定で OK**。

根拠:
- Summary 画面の本質は「承認済レポートの集計」であり、ステータスフィルタを追加すると目的とブレる
- 監査用途では「承認済レポートのみを対象とした監査 CSV」が業務的に正しい（差戻し / 申請中 / 下書きを監査対象にすると混乱）
- 期間 + ユーザー + 種別の 3 軸は監査での主要絞り込み軸（「特定ユーザーの月次経費」「種別ごとの傾向」）に対応
- 「列カスタマイズ UI なし」原則と同じ精神で「絞り込み軸も固定」が一貫性ある設計
- 将来「差戻しレポートも監査対象」「特定ステータスのみ」が要件化した場合は、別フェーズで `Report.filter` の status 条件緩和 + フィルタ UI 拡張を検討

### Q9. リクエスト §4 Q5: 0 件絞り込み時の `alert(...)` の妥当性

**懸念**: 0 件絞り込み時の簡易フィードバックとして `alert(...)` を使用。トースト等の改善は A7 スコープ外として shadcn/ui の本格活用を後送りでよいか？

**Review Agent 判定**: **A7 スコープ判断として OK**。

根拠:
- A7 のスコープは「CSV フォーマット固定 + 大量データ」、UI 改善は別軸
- `alert(...)` は非モーダル UX として劣るが、ファイル DL という重い操作の前段に「該当データなし」を確実に伝える点では十分機能
- shadcn/ui の toast 導入は依存追加 / 既存 Layout への組み込み変更を含み、A7 スコープが肥大化する
- 任意改善として A8 以降の UI フェーズ（あるいは独立軽量 UX 改善フェーズ）で扱うのが自然

任意改善（非ブロッキング）: 既に shadcn/ui の `Dialog` を導入するため、エラー表示用の小ダイアログを再利用する選択肢もあるが、A7 内では `alert` で十分。

### Q10. リクエスト §4 Q7: A6 月次メール CSV のエスケープ追加影響

**懸念**: A6 月次メール本文末尾埋め込み CSV にエスケープが効くと、引用符付きセル `"..."` が含まれる。メーラー側で plain text として可読性を維持できるか？

**Review Agent 判定**: **可読性は維持される、承認**。

根拠:
- メーラー（Gmail / Outlook / Apple Mail 等）は plain text を「そのまま表示」するため、引用符付き CSV セルも視覚的には認識可能
- ユーザーがコピペで CSV ファイル化する場合、引用符は **CSV 規格準拠** で Excel 等で正しく開封できる（むしろ改善）
- エスケープが効くケースは「`destination_address` がカンマを含む」等の特殊ケースのみで、通常データには影響なし
- 月次メール本文の主目的は「集計サマリの確認」であり、末尾 CSV は補助情報。引用符付与で本文の主旨理解に影響なし
- 任意改善: メーラーで HTML 表示する場合の CSV 引用符の可視性は、A6 の plain text body 採用判断と同じく A7 では扱わない（HTML body 化は roadmap 改訂判断）

### Q11. リクエスト §4 Q8: `業務内容` の改行処理

**懸念**: `business_content` に改行が含まれる場合、`escapeCsvCell` で `"..."` で囲んで `\n` を CSV セル内に保持する。Excel での表示は「セル内改行」として正しく扱われるか？

**Review Agent 判定**: **Excel で正しく扱われる、Owner 実機確認推奨**。

根拠:
- CSV 規格（RFC 4180）では、引用符で囲んだセル内の改行は「セル内改行」として扱われる
- Excel は RFC 4180 準拠で、引用符付きセル内の `\n` を「セル内改行（Alt+Enter）」として表示する
- ただし、改行コード（`\n` vs `\r\n`）の解釈はバージョン差があり得る → handoff の `escapeCsvCell` regex `/[",\n\r]/` で `\r` 含むセルもエスケープ済（堅牢）
- Owner 検証手順を baseline-A7.md に含める（handoff §4 で確認）

任意改善（非ブロッキング）: Excel での具体的な「セル内改行表示」確認は Owner 分担として baseline-A7.md「大量データ動作確認手順 4. Excel 開封 → 文字化けなし、改行を含むセルが正しく表示されること」に明記されており、Owner 検証で確認される。

---

## 5. 任意の改善提案（非ブロッキング、A8 以降のテンプレ向上）

1. **Design Agent プロセス順序の徹底（6 フェーズ連続発生、3 度目の強い再推奨）**: A2 / A3 / A4 / A5 / A6 / A7 と **6 連続** で `design-handoff` が `design-review-request` より先に届いている。**MVP 達成 + A6 完了 + A7 完了の節目で Design Agent ワークフロー改修を確定** することを強く推奨
2. **handoff 雛形コード内の変数シャドー検査をチェックリスト化（§4 Q1 から導出）**: 次回 handoff 起草時に「雛形コード内の関数引数名が import 済関数名（date-fns の `format` 等）とシャドーしていないか」を Design Agent 自己チェック項目化することを推奨。本フェーズの致命的バグの再発防止
3. **CSV メール添付化フェーズの roadmap 追加検討**: §4 Q4 / verdict-A6 §6.2 で議論。roadmap 改訂時に独立小フェーズとして追加する余地
4. **lint warnings 3 件の処遇確定（再々）**: A1〜A7 通算 7 フェーズで「baseline 不変」。MVP 達成 + 運用品質向上フェーズ 2 つ完了の節目で確定推奨

---

## 6. 修正要求

不要（`APPROVED_FOR_IMPLEMENTATION`、ただし §4 Q1 の致命的バグは Implementation Agent が必ず修正）。

---

## 7. 次のトリガー

本ゲートは通過した。次の動作:

- Owner が `templates/implementation-go-template.md` を使って Implementation Agent を起動
- Implementation Agent は起動時に本ファイル §1 が `APPROVED_FOR_IMPLEMENTATION` であることを確認
- 確認後、`design-handoff-A7.md` の DO 1〜9 を順に実施
- 完了後 `review-package-A7.md` を作成し、Review Agent（実装後ゲート）に引き渡す
- 実コミットは **行わない**（DO 8 / DO NOT 明示）、Review Package §7 に staging + メッセージ案
- Review Agent は実装後ゲートで `verdict-A7.md` に `APPROVED / PHASE COMPLETE / NEXT PHASE: A8` または `REJECTED` を出力

**Implementation Agent への必須留意事項（本 verdict §4 から導出）**:

⚠️ **`buildRow(r, format)` の `format` 引数名は date-fns の `format` をシャドーするため、必ず変更すること**:
- 推奨: 引数名を `formatName` または `csvFormat` に変更
- `getHeaders` / `buildReportsCSVAsync` の対応引数名も合わせて変更（一貫性）
- Review Package §2 / §3 で「handoff 雛形からの変更点（design-review-verdict-A7 §4 Q1 の指摘解消）」として明示

その他留意点（非ブロッキング）:
- handoff §9 で許容される改善（chunkSize 100-500 の範囲調整、エスケープ実装手段の選択、Dialog UI の自然な表現）は Implementation Agent の裁量
- 雛形からの逸脱があれば Review Package で明示

---

## 8. 参照根拠

- 設計仕様: `.claude-team/handoff/design-handoff-A7.md`
- 設計レビュー依頼: `.claude-team/design-reviews/design-review-request-A7.md`（不在、§2 で対応）
- 直近 verdict（実装後ゲート、前フェーズ）: `.claude-team/verdicts/verdict-A6.md`
- A6 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A6.md`
- /goal: `.claude-team/goal.md` § 制約（依存追加最小化）
- ロードマップ: `.claude-team/roadmap.md` A7 行 / A8 行
- 運用ルール: `.claude-team/auto-handoff.md`
- HANDOFF.md Report スキーマ（L183-227）
- 実コード検証:
  - `src/lib/aggregation.js` 105 行（A6 完了状態）
  - `src/pages/Summary.jsx` の現状（Dialog/Filter 未 import、Loader2 既存）
  - `src/pages/Approval.jsx` L8（Dialog import パターン）
  - `test -f src/components/ui/dialog.jsx`（存在）
  - audit format 33 列の手動カウント

---

## 9. 最終出力

```
APPROVED_FOR_IMPLEMENTATION
```

⚠️ **Implementation Agent への必須留意**: §4 Q1 の `format` 引数シャドー問題を必ず修正してから実装すること。
