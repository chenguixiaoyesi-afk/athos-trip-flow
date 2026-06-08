# Design Review Verdict — Phase A8 ⭐ ロードマップ最終フェーズ

From: Review Agent
To: Design Agent
Date: 2026-06-08
Gate: **実装前ゲート（Design Review Gate）**
対象: `.claude-team/handoff/design-handoff-A8.md`
依頼: `.claude-team/design-reviews/design-review-request-A8.md`（**現時点で不在**、A2-A7 に続き **7 フェーズ連続発生**、§2 で対応）
参照: `.claude-team/verdicts/verdict-A7.md` / `design-reviews/design-review-verdict-A7.md` / `.claude-team/goal.md` / `.claude-team/roadmap.md` / `.claude-team/auto-handoff.md`

**A8 完了で全 9 フェーズ完走（PROJECT COMPLETE 候補）**。

---

## 1. 判定

```
APPROVED_FOR_IMPLEMENTATION
```

§4 Q1 で **`activePolicy` vs `policy` 命名不一致** を留意事項として明示。Implementation Agent が alias 化または置換で対応すれば実装可能。

---

## 2. レビュー方針注記

`design-review-request-A8.md` が orchestrator dispatch 時点で未生成のため、Review Agent は **handoff 単独 + roadmap A8 行 + verdict-A7 §8.6 + HANDOFF.md Report/TravelPolicyMaster スキーマ** を根拠に評価する。**A2-A8 と 7 フェーズ連続の同パターン**、改善提案 §5-1 で **A8 完了後の roadmap 改訂時に Design Agent ワークフロー改修確定** を推奨。

---

## 3. 観点別チェック結果

### 3.1 ルール遵守

| 観点 | 結果 | コメント |
|---|---|---|
| REPOSITORY ISOLATION RULE 違反なし | ✅ | 参照禁止語彙の出現なし |
| CURRENT PHASE のみ対象 | ✅ | A8 はロードマップ最終、A9 以降は存在しない、handoff §[NEXT PHASE DEPENDENCY] で明示 |
| 9 ブロック揃い | ✅ |
| /goal の非ゴール・制約に違反なし | ✅ | 非ゴール（多段階承認 / 規程承認ワークフロー / 規程比較公開 / 新規エンティティ）すべて DO NOT で明示禁止。**業務ルール「過去レポートへの遡及反映禁止」** を §[OBJECTIVE] 4 / §[DO NOT] / baseline-A8.md で 3 重明示 |
| DESIGN AUTHORITY RULE 違反なし | ✅ | 人間判断仰ぎなし |
| AUTO HANDOFF ORCHESTRATION RULE 準拠 | ✅ |

### 3.2 verdict-A7 §6 改善提案の取り込み

| 改善提案 | handoff 反映 | 結果 |
|---|---|---|
| §6.1 commit 戦略の Owner 確定 | A8 では継続（Owner 判断） | ✅ |
| §6.2 handoff 雛形コード内の変数シャドー自己チェック | handoff §9 注で「`currentPolicy` / `sourcePolicy` / `targetPolicy` / `impactTarget` / `impactResult` 等の文脈明示名」を採用、A7 シャドー教訓を反映 | ✅ |
| §6.4 Design Agent プロセス順序 | 本 handoff も同パターン継続（7 連続） | ⚠ 未改善（A8 完了後の確定推奨） |
| §6.5 lint warnings 3 件 | DO 6 で「A7 完了時点（3 件）から増加していない」継続 | ✅ |

### 3.3 verdict-A7 §8.6 + roadmap A8 行 + 業務フロー終端への忠実性

| 観点 | handoff 反映 | 結果 |
|---|---|---|
| A8 スコープ（規程変更履歴 + 影響範囲追跡）= roadmap「`TravelPolicyMaster` 差分履歴の時系列閲覧 / 規程適用前後で計算値が変わる過去レポート抽出ビュー / PDF 取込時の AI 解析と適用前 diff 表示 / 規程変更時の影響サマリ（件数 + 金額差）」 | OBJECTIVE 1-4 で網羅、§3.5 KPI 3 枚（評価対象件数 / 影響件数 / 合計差額）+ レポート一覧テーブルで影響サマリ実装 | ✅ |
| roadmap A8 非実装（過去レポートへの遡及計算反映 / 規程承認ワークフロー / 規程比較の外部公開 / 新規 `AuditLog` エンティティ） | DO NOT で全項目明示禁止 | ✅ |
| roadmap A8 レビュー条件（規程一覧で過去バージョン閲覧可 / 影響範囲表示 / 既存 PDF 取込・適用フロー不破壊 / 監査担当が CSV と規程履歴で監査完結 / lint/build 緑） | DONE CRITERIA + REVIEW POINTS で網羅 | ✅ |
| 業務フロー終端（社員 → レポート作成 → AI 補完 → 承認 → 集計 → CSV → 旅費規定監査）の完成 | handoff CURRENT PHASE / NEXT PHASE DEPENDENCY で業務フロー完成を明示 | ✅ |

### 3.4 自リポ整合性（Review Agent 独立検証実施）

| 観点 | 実コード確認 | 結果 |
|---|---|---|
| PolicyManagement.jsx 存在 | 327 行 | ✅ |
| 4 主要ハンドラ実在 | L32 loadPolicies / L38 handlePdfUpload / L110 handleActivate / L122 handleSaveNew | ✅ |
| `FIELD_LABELS` 定義 | L143 | ✅ |
| `analyzedPolicy && showDiff` ブロック | L18 / L26 で state、ブロック自体は handoff L230-266 想定（行番号は handoff 起草時点） | ✅ |
| `usePolicy` hook | `src/lib/policyContext.jsx` L38 export 確認 | ✅ |
| Lucide-react `Loader2` 既存 import | L10 で確認、A8 で追加不要 | ✅ |
| **`Eye` icon 未 import** | L10 imports に不在、A8 で **追加必要** | ⚠ Implementation Agent 留意点 |
| **Dialog 未 import** | grep ヒット 0、A8 で `@/components/ui/dialog` 追加必要 | ⚠ Implementation Agent 留意点 |
| Report スキーマフィールド | HANDOFF.md L184 `report_type` / L198-199 `num_nights/num_days` / L202 `driving_distance_km` / L206-215 10 実費フィールドすべて実在 | ✅ |
| TravelPolicyMaster スキーマ 6 規程値フィールド | HANDOFF.md L244-249 `daily_allowance_daytrip/overnight/overseas`, `accommodation_domestic/overseas`, `car_allowance_per_km` すべて実在 | ✅ |
| `policyImpactAnalyzer.js` / `baseline-A8.md` 不在 | `test -f` で確認 | ✅ 新規作成準備済 |

### 3.5 スコープ妥当性

| 観点 | 結果 | コメント |
|---|---|---|
| `policyImpactAnalyzer.js` の純粋関数性 | ✅ | 副作用なし、外部 IO なし、DO NOT で `window` / `document` / `localStorage` / `Blob` / `URL` / `fetch` / `console.warn` 不使用を明示 |
| 4 種別の再計算分岐 | ✅ | 日帰り（daily + car_allowance）/ 宿泊（daily*days + accommodation*nights + car_allowance）/ 海外（daily*days + accommodation*nights、車手当なし）/ 外出作業（car_allowance のみ、日当・宿泊費なし）— 各 form の handleSubmit data 構造と一致 |
| 実費 10 項目の規程非依存性 | ✅ | `(report.X \|\| 0)` で 10 フィールド集計、規程値に依存しない |
| 業務ルール「過去レポート遡及反映禁止」 | ✅ | `handleShowImpact` 内に `Report.update` 不在、Dialog 業務ルール明示フッターで「シミュレーション、DB に保存されません」を明示 |
| `affectedCount` semantics | ✅ | `diff !== 0` のレポートのみカウント、影響を受けないレポートは除外 |
| 引数名の文脈明示性 | ✅ | `currentPolicy` / `sourcePolicy` / `targetPolicy` / `impactTarget` / `impactResult` で既存 `policy` 変数とシャドーなし、verdict-A7 §6.2 改善反映 |
| `recomputeReportPolicyValues` の null ガード | ✅ | `if (!report \|\| !currentPolicy)` で安全フォールバック |
| Dialog UI の整合性 | ✅ | Approval.jsx / Summary.jsx の Dialog パターン踏襲、3 KPI Card + テーブル + 業務ルールフッター + 閉じるボタン |
| ボタン表示条件 | ✅ | `!p.is_active && activePolicy` で `is_active` 規程は自己比較不能なので非表示、`activePolicy` 不在時も非表示 |
| 0 件影響時のフォールバック | ✅ | 「影響を受けるレポートはありません」表示 |
| エラー時のフォールバック | ✅ | `result.error = true` でエラー表示 |
| DO NOT の網羅性 | ✅ | 業務ルール（遡及反映 / 実費規程依存化）/ 既存機能（PDF 取込 / AI 解析 / 規程適用 / 履歴表示 / FIELD_LABELS / handlePdfUpload / handleActivate / handleSaveNew）/ A1-A7 全成果物 / `policyContext.jsx` / `usePolicy` / 新規エンティティ / 新規ルート を網羅 |
| DONE CRITERIA の客観検証可能性 | ✅ | 全 26 項目が grep / `git diff` / `test -f` / 関数呼出での値検証で機械検証可能 |
| REVIEW POINTS の網羅性 | ✅ | 16 項目で純粋性 / 4 種別分岐 / 実費非依存 / 変数シャドー / 業務ルール / 既存不変性 / A1-A7 不変性 / ISOLATION を網羅 |

### 3.6 依存と影響

| 観点 | 結果 | コメント |
|---|---|---|
| NEXT PHASE DEPENDENCY | ✅ | ロードマップ最終、`PROJECT COMPLETE` 宣言形式が明示 |
| A1〜A7 全成果物への破壊変更なし | ✅ | DO NOT で 4 form / ReportEdit / Approval / ReportDetail / Summary / aggregation.js / notifications.js / hook / receipt UI / reportGenerator.js / App.jsx Routes を全列挙保護 |
| `policyContext.jsx` 不変 | ✅ | DO NOT で明示、`usePolicy` 利用のみ |
| 既存 PDF 取込 + AI 解析 + 規程適用フロー不破壊 | ✅ | DO NOT で `analyzedPolicy && showDiff` ブロック / `FIELD_LABELS` / 3 ハンドラの touch なしを明示 |

---

## 4. Design Agent の質問への回答（Review Agent からの自発的提示、request 不在のため）

### Q1. ⚠️ `activePolicy` vs `policy` 命名不一致

**懸念**: handoff §3.3 / §3.4 / §3.5 で `activePolicy` を使用しているが、`PolicyManagement.jsx` L13 の実コードは `const { policy, setPolicy } = usePolicy();` で **変数名は `policy`**。

```js
// handoff §3.3 雛形:
const result = computeImpact(approvedReports || [], activePolicy, targetPolicy);

// handoff §3.4 雛形:
{!p.is_active && activePolicy && (...)}

// handoff §3.5 雛形:
影響範囲: {impactTarget?.version || ''} → 現行規程（{activePolicy?.version || ''}）と比較
```

しかし PolicyManagement.jsx で利用可能な変数は `policy`（`activePolicy` ではない）。雛形通り実装すると **`ReferenceError: activePolicy is not defined`** が発生（実行時 / lint で検出可能）。

**Review Agent 判定**: **Implementation Agent への留意事項として明示、APPROVED_FOR_IMPLEMENTATION**。

修正の選択肢（Implementation Agent の裁量）:

- **(a) alias 化（推奨、最小変更）**: `const activePolicy = policy;` を `PolicyManagement.jsx` 関数内に追加し、handoff template を verbatim 採用可能
  ```js
  const { policy, setPolicy } = usePolicy();
  const activePolicy = policy;  // handoff naming convention に合わせる
  ```
- **(b) 全置換**: handoff template 内の `activePolicy` をすべて `policy` に置換して使用（追加変数なし、最小実装）
- **(c) `usePolicy` の destructure rename**: `const { policy: activePolicy, setPolicy } = usePolicy();` で同時に対応（小規模変更）

Implementation Agent は (a) または (c) を採用することを推奨し、Review Package §2 / §3 に「handoff 雛形の `activePolicy` を `usePolicy()` の戻り値変数 `policy` に整合させた（design-review-verdict-A8 §4 Q1 の指摘解消）」を明示すること。

**Design Agent への申し送り（任意改善 §5-2）**: 次回 handoff 起草時に「雛形コード内の変数名が実コードと一致しているか」を Design Agent 自己チェック項目化することを推奨（A7 の `format` シャドー教訓に続く第 2 の事例）。

### Q2. `Eye` icon と Dialog の新規 import 必要性

**観察**: handoff §3.1 で `Eye` icon と `Dialog` 関連コンポーネントの import 追加を指示。`PolicyManagement.jsx` L10 の現 lucide-react import には `Upload, Loader2, CheckCircle, FileText` のみで `Eye` 不在、Dialog コンポーネント import も grep ヒット 0。

**Review Agent 判定**: **正常な追加 import、Implementation Agent が対応**。

- `Eye` from `'lucide-react'`: 「影響範囲」ボタンのアイコン用、L10 既存 import 行に追加
- `Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter` from `'@/components/ui/dialog'`: 新規 import 行追加
- `computeImpact` from `'@/lib/policyImpactAnalyzer'`: 新規 import 行追加

Loader2 は既存 import 済で追加不要。

### Q3. `recomputeReportPolicyValues` の戻り値構造

**観察**: handoff §2 の戻り値 `{ daily_allowance, accommodation_fee, car_allowance, total_amount }` の 4 フィールドのみで、`actuals` を含めない。

**Review Agent 判定**: **設計通り**。

根拠:
- `total_amount = daily_allowance + accommodation_fee + car_allowance + actuals` で `actuals` は内部計算用変数
- 呼出元（`computeImpact`）は `total_amount` のみを使うため、`actuals` を別フィールドで返す必要なし
- DRY 原則と整合（不要な情報を返さない）

### Q4. `海外出張` の `car_allowance = 0` ハードコード

**観察**: handoff §2 で 海外出張は `car_allowance = 0` のまま、`driving_distance_km` を一切参照しない。

**Review Agent 判定**: **業務的に妥当、OverseasTripForm の挙動と一致**。

根拠:
- OverseasTripForm の data 構造（A3-A5 で確認）に `driving_distance_km` も `car_allowance` も含まれない
- 海外出張は航空券 + 空港送迎 + 現地交通費（other_transport_fee）が主な交通手段、自家用車利用なし
- handoff の implementation は実 form 仕様と完全一致

### Q5. `外出作業` の日当 + 宿泊費 = 0 ハードコード

**観察**: handoff §2 で 外出作業は `daily_allowance = 0`, `accommodation_fee = 0` のまま、`car_allowance` のみ計算。

**Review Agent 判定**: **業務的に妥当、FieldworkForm の挙動と一致**。

根拠:
- FieldworkForm（A1 + A3-A4）の data 構造に日当・宿泊費フィールドなし
- 外出作業は日常業務の延長で、宿泊伴わない、出張日当の対象外
- handoff implementation は実 form 仕様と完全一致

### Q6. `affectedCount` の semantics（`diff !== 0` のみカウント）

**観察**: `affectedCount` は `items.length`（diff !== 0 のレポート数）。承認済件数（`totalReports`）とは別。

**Review Agent 判定**: **正しい semantics**。

根拠:
- 業務的に「影響を受けるレポート = 規程変更で計算値が変わるレポート」が `affectedCount` の意味として自然
- 差分 0 のレポートは「影響を受けない」ためカウントから除外
- UI で 3 KPI（totalReports / affectedCount / totalDiff）を区別表示する設計と整合

### Q7. 500 件制限の影響範囲評価

**観察**: handoff §3.3 で `Report.filter({ status: '承認済' }, '-created_date', 500)` で承認済レポート上位 500 件のみを評価対象。

**Review Agent 判定**: **A6/A7 と整合する妥当な制約**。

根拠:
- Summary.jsx / 月次配信 / 監査用 CSV と同じ 500 件制限
- 通常運用では月数十件 × 12 ヶ月 = 300-400 件で 500 件枠内
- 大量データ運用が必要になった場合は別フェーズで pagination 対応
- baseline-A8.md「境界条件: 500 件超: 上位 500 件のみ評価対象（明示は不要、A6/A7 と整合）」で明示

### Q8. PROJECT COMPLETE 宣言形式

**観察**: handoff §[REVIEW POINTS] 判定欄で「合格時: APPROVED / PHASE COMPLETE / PROJECT COMPLETE」を指定。`NEXT PHASE: A9` のような次フェーズ指定なし。

**Review Agent 判定**: **正しい最終フェーズ宣言形式**。

根拠:
- ロードマップは A0〜A8 で完結
- A9 以降は存在しない（handoff §[NEXT PHASE DEPENDENCY] で明示）
- `PROJECT COMPLETE` は MVP COMPLETE（A5）と並ぶ重要マイルストーン
- Review Agent verdict-A8 では `PROJECT COMPLETE` を併記して全 9 フェーズ完走を記録

任意改善（非ブロッキング）: `current-phase.txt` の最終値は `DONE` や `COMPLETE`、あるいは `A8`（最終フェーズ番号で固定）の選択肢があるが、Owner / 次運用フェーズ設計時の判断に委ねる。

---

### 4.5 補足: design-review-request-A8.md §4 の明示質問への回答（遅延 dispatch 対応 + 訂正）

`design-review-request-A8.md` が本 verdict 起草中に遅延 dispatch で到着したため、リクエスト §4 の 9 質問を確認し、未回答分（Q1, Q2, Q3, Q5 推奨確定, Q6, Q7, Q9）に回答する。

**事実訂正**: リクエスト §3.2「Design Agent プロセス順序の徹底（§6.4）は本 design-review-request 提出のタイミング自体で改善実証（A2-A7 で 6 連続遅延、A8 は最終フェーズで dispatch 即応）」は **事実と異なる**。Review Agent 観測では A8 も同じ遅延パターン（design-handoff-A8.md 検出時に design-review-request-A8.md は不在、本 verdict 起草後に遅延到着）。**A2-A8 で 7 連続発生** が正確な事実。

### Q1（補）. リクエスト §4 Q1: `recomputeReportPolicyValues` の 4 種別計算ロジック妥当性

**判定: 4 種別すべて業務的に正しい、HANDOFF.md スキーマ + 既存 form 仕様と一致**。

| 種別 | handoff 計算ロジック | 既存 form 仕様（A1-A5 で確認） | 整合性 |
|---|---|---|---|
| 日帰り出張 | `daily_allowance_daytrip` + `driving_distance_km * car_allowance_per_km` | DayTripForm: 日当 + 車手当（実費 highway/parking/taxi/other_transport は規程非依存） | ✅ |
| 宿泊出張 | `daily_allowance_overnight * num_days` + `accommodation_domestic * num_nights` + `driving_distance_km * car_allowance_per_km` | OvernightTripForm: 日当×日数 + 宿泊費×泊数 + 車手当 | ✅ |
| 海外出張 | `daily_allowance_overseas * num_days` + `accommodation_overseas * num_nights`（**車手当なし**） | OverseasTripForm の data: `driving_distance_km` フィールド不在、`car_allowance` フィールド不在 — 海外は自家用車利用想定なし | ✅ |
| 外出作業 | `driving_distance_km * car_allowance_per_km`（**日当・宿泊費なし**） | FieldworkForm: 業務系経費（coworking/wifi/parking/meal）+ 車手当のみ、日帰りより短時間想定で日当対象外 | ✅ |

→ **handoff §2.2 の分岐は実 form 仕様と完全一致**。Design Agent への修正要求なし。

### Q2（補）. リクエスト §4 Q2: 実費 10 項目を再計算対象外とする判断

**判定: 業務的に妥当、A8 スコープと整合**。

根拠:
- 実費 10 項目（`highway_fee` / `parking_fee` / `taxi_fee` / `other_transport_fee` / `flight_fee` / `airport_transport_fee` / `coworking_fee` / `wifi_fee` / `meal_fee` / `other_work_fee`）はユーザー実支出の領収書ベース → 規程値変更で過去支出が変わることはない（業務ルール）
- `coworking_fee` / `wifi_fee` / `meal_fee` 等は規程の `max_work_expense`（外出作業費上限）と関連するが、A8 では総額計算のみで **上限超過判定は扱わない**（roadmap A8 スコープ「規程変更履歴 + 影響範囲追跡」に上限再判定は含まれない）
- 上限超過レポートの遡及検出は roadmap 改訂時に独立フェーズで追加検討

→ **設計判断として妥当**。

### Q3（補）. リクエスト §4 Q3: 比較元を現行 `activePolicy` に固定する判断

**判定: A8 最小実装として妥当、任意比較対応は roadmap 改訂時の検討事項**。

根拠:
- 業務シナリオの典型は「現行規程 vs 適用予定 / 過去規程」の比較
- 「過去 A vs 過去 B」のような任意比較は監査ニッチユースケース、現行運用では稀
- 任意比較を実装すると Dialog UI に Source/Target 両方の Select が必要になり UI 複雑化
- A8 = ロードマップ最終フェーズで最小実装を維持すべき
- 将来要件化時は roadmap 改訂 → 独立フェーズで `sourcePolicy` も選択可能化

→ **handoff の現行固定は適切な最小実装判断**。任意比較対応を Review Agent から推奨しない。

### Q5（補）. リクエスト §4 Q5: lint warnings 3 件の最終処遇

**判定: (a) Owner 判断で別 commit で対応 を Review Agent 推奨**。

根拠:
- A1-A8 通算 9 フェーズで「baseline 不変」扱いを継続 → 永続放置のリスク（将来の新規 warning との区別不能化）
- PROJECT COMPLETE のタイミングで「クリーンな最終状態」を残すことは運用ハンドオフ品質として重要
- 3 件すべて `unused-vars` で削除は機械的に安全（`Login.jsx` の `err` catch 変数、`ReportDetail.jsx` の `isAdmin` 未使用変数、`ReportNew.jsx` の `navigate` 未使用 useNavigate 結果）
- A8 commit と分離した独立小 commit（例: `chore: remove unused vars`）で実施するのが履歴上明確
- (b) 運用フェーズで対応 は対応漏れリスク、(c) 意図的放置 は将来の保守性低下

任意改善（非ブロッキング）: A8 PROJECT COMPLETE verdict の Owner 申し送りで「(a) lint warnings 3 件削除の独立 commit を別途実施」を推奨記載予定。

### Q6（補）. リクエスト §4 Q6: 「影響範囲」ボタンの表示位置

**判定: 既存「適用する」ボタンの **直前** 配置で OK、視覚的バランス妥当**。

根拠:
- handoff §3.4 の「PDF リンク → 影響範囲ボタン → 適用するボタン」の並びは、業務フロー（規程確認 → 影響事前評価 → 適用判断）と一致
- 「適用する」前に「影響範囲」を見る監査担当の意思決定フローに沿う
- Eye アイコン（影響範囲）と Send/Check アイコン（適用）の視覚的区別もユーザー直感的

任意改善（非ブロッキング）: 「影響範囲」ボタンは admin のみ + `!p.is_active && activePolicy` の AND 条件で表示 → 「適用する」も同じく `!p.is_active` 条件で表示されるため、is_active=false の規程行で 2 ボタン並列表示となる。flex 行の overflow が画面幅で発生しないか Owner 実機確認を推奨。

### Q7（補）. リクエスト §4 Q7: 業務シナリオ 3（A7 audit CSV との連携）

**判定: 文書化のみで十分、ナビゲーションリンク追加は不要**。

根拠:
- baseline-A8.md シナリオ 3「`PolicyManagement.jsx` の影響範囲と `Summary.jsx` の audit CSV を二重チェック」は業務手順の説明であり、画面間ナビゲーション必須ではない
- 監査担当が複数画面を行き来する運用は admin 業務として一般的（ブラウザタブで併用）
- リンク追加すると PolicyManagement.jsx に App.jsx Routes 依存が生じ、DO NOT「`App.jsx` の変更」に抵触する間接リスク
- 将来要件化時は roadmap 改訂で「監査ダッシュボード統合」フェーズとして起案

→ **文書化（baseline-A8.md シナリオ 3）のみで十分**。

### Q8 削除 (本 verdict §4 Q8 で既回答). 

リクエスト §4 Q8（PROJECT COMPLETE 宣言の Review Agent 責務）は本 verdict §4 Q8 で既回答（「正しい最終フェーズ宣言形式」）。

### Q9（補）. リクエスト §4 Q9: handoff §2 雛形コードの詳細度

**判定: 詳細雛形提供は妥当、A8 の致命バグ抑止と整合**。

根拠:
- handoff §2.1（policyImpactAnalyzer.js）/ §3.5（Dialog JSX）の詳細雛形は、Implementation Agent の盲目的コピペでも動作可能なレベル
- ただし本 verdict §4 Q1 で指摘した通り `activePolicy` 命名不一致が雛形に残存 → 詳細雛形でも変数名整合性は完全解消されない
- 詳細雛形の利点（4 種別計算ロジックの誤実装防止、UI 構造の一貫性）が、欠点（Implementation Agent 裁量縮小）を上回る判断
- A7 の `format` シャドー / A8 の `activePolicy` 不一致を **同じ過ち** として A9 以降のテンプレ改修候補に組み込むことを推奨（§5-2 で記載）

任意改善（非ブロッキング、A8 完了後の Design Agent 反省）: 詳細雛形を採用する場合は **「雛形内の変数名が実コードと一致しているか」を必ず Design Agent 自己チェック** することを確定推奨。

---

## 5. 任意の改善提案（非ブロッキング、本フェーズ完了後の運用テンプレ向上）

1. **A8 完了後の Design Agent プロセス順序確定（7 連続発生で最終確定タイミング）**: A2-A8 と **7 連続** で `design-review-request` の dispatch 遅延。**A8 = ロードマップ最終で確定タイミング**。MVP COMPLETE / PROJECT COMPLETE 完了の節目で Design Agent ワークフロー改修を **必須確定**
2. **handoff 雛形コードの変数名整合性チェック自己機能化（A7 シャドー + A8 命名不一致の連続事例から）**: §4 Q1 の通り、A7 で `format` シャドー、A8 で `activePolicy` vs `policy` 不一致が連続発生。次回 handoff 起草時に「雛形コード内の変数名 = 実コードと一致」を Design Agent 自己チェック項目化することを **A8 完了後の Design Agent 改修確定** に組み込み
3. **lint warnings 3 件の処遇確定（最終）**: A1〜A8 通算 9 フェーズで「baseline 不変」扱い。**PROJECT COMPLETE のタイミングで確定**:
   - (a) `unused-vars` を「意図的 unused 保持」として明示的に容認する eslint 設定変更
   - (b) 削除する独立軽量フェーズ（A8.1 等）の起案
   - (c) 削除する hotfix commit
4. **commit 戦略の最終確定**: A3-A7 累積で 5 commit 待ち、A8 で 6 fragment 累積予定。PROJECT COMPLETE 時に Owner が一括 commit 戦略を判断
5. **PROJECT COMPLETE 後の運用フェーズ設計**: バグ対応 / 機能追加要望の取扱は別 roadmap（A9-A16 等）または独立タスク管理として Design Agent + Owner で協議

---

## 6. 修正要求

不要（`APPROVED_FOR_IMPLEMENTATION`、ただし §4 Q1 の `activePolicy` 命名不一致は Implementation Agent が必ず対応）。

---

## 7. 次のトリガー

本ゲートは通過した。次の動作:

- Owner が `templates/implementation-go-template.md` を使って Implementation Agent を起動
- Implementation Agent は起動時に本ファイル §1 が `APPROVED_FOR_IMPLEMENTATION` であることを確認
- 確認後、`design-handoff-A8.md` の DO 1〜9 を順に実施
- 完了後 `review-package-A8.md` を作成し、Review Agent（実装後ゲート）に引き渡す
- 実コミットは **行わない**、Review Package §7 に staging + メッセージ案
- Review Agent は実装後ゲートで `verdict-A8.md` に **`APPROVED / PHASE COMPLETE / PROJECT COMPLETE`** または `REJECTED` を出力

**Implementation Agent への必須留意事項（本 verdict §4 から導出）**:

⚠️ **handoff §3.3-§3.5 の `activePolicy` 参照は `usePolicy()` の戻り値変数 `policy` に整合させること**:
- 推奨: `const activePolicy = policy;` alias または `const { policy: activePolicy, setPolicy } = usePolicy();` で対応
- handoff template の他箇所での `activePolicy` 参照も同様に対応
- Review Package §2 / §3 で「design-review-verdict-A8 §4 Q1 の指摘解消」として明示

その他留意点（非ブロッキング）:
- `Eye` icon を lucide-react から、Dialog 関連を `@/components/ui/dialog` から新規 import
- `computeImpact` を `@/lib/policyImpactAnalyzer` から新規 import
- `Loader2` は既存 import を再利用

---

## 8. 参照根拠

- 設計仕様: `.claude-team/handoff/design-handoff-A8.md`
- 設計レビュー依頼: `.claude-team/design-reviews/design-review-request-A8.md`（不在、§2 で対応）
- 直近 verdict（実装後ゲート、前フェーズ）: `.claude-team/verdicts/verdict-A7.md`
- A7 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A7.md`
- /goal: `.claude-team/goal.md`
- ロードマップ: `.claude-team/roadmap.md` A8 行 / MVP 達成済（A5）/ 業務フロー終端
- 運用ルール: `.claude-team/auto-handoff.md`
- HANDOFF.md: Report スキーマ（L177-231）/ TravelPolicyMaster スキーマ（L234-252）
- 実コード検証:
  - `src/pages/PolicyManagement.jsx` 327 行（4 ハンドラ、`policy` 変数、FIELD_LABELS、Loader2 既存、Eye/Dialog 不在）
  - `src/lib/policyContext.jsx` L38 `usePolicy` export
  - 6 規程値フィールド HANDOFF.md L244-249 で全て確認
  - 4 form の data 構造との計算分岐整合性
  - `test -f` で新規ファイル不在確認

---

## 9. 最終出力

```
APPROVED_FOR_IMPLEMENTATION
```

⚠️ Implementation Agent は §4 Q1 の `activePolicy` 命名不一致を必ず修正してから実装すること。
