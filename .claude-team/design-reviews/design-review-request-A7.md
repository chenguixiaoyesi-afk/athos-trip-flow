# Design Review Request — Phase A7

From: Design Agent
To: Review Agent
Date: 2026-06-08
Gate: **実装前ゲート（Design Review Gate）**

本ファイルは `design-handoff-A7.md` の実装前レビュー依頼。Review Agent は本ファイルと `design-handoff-A7.md` を読み、`design-review-verdict-A7.md` を返す。

---

## 1. レビュー対象

- 仕様正本: `.claude-team/handoff/design-handoff-A7.md`
- 直近 verdict: `.claude-team/verdicts/verdict-A6.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A7）
- A6 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A6.md`
- ロードマップ: `.claude-team/roadmap.md` A7 行（CSV 出力フォーマット固定 + 大量データ対応）
- A6 baseline: `.claude-team/baseline-A6.md`
- /goal: `.claude-team/goal.md` §0 / A6-A8 運用品質向上位置付け
- 運用ルール: `.claude-team/auto-handoff.md` §0 DESIGN AUTHORITY RULE

---

## 2. CURRENT PHASE

`A7` — CSV 出力フォーマット固定 + 大量データ対応

`aggregation.js` の `buildReportsCSV` を内部リファクタ（エスケープ追加、format 切替ヘルパー導入）し、新規 `buildReportsCSVAsync` で audit format + chunked async + progress 対応を追加。Summary.jsx に admin 限定の「監査用 CSV 出力」ボタンと絞り込みダイアログを追加。baseline-A7.md で simple/audit 両フォーマットの列定義を明示。

---

## 3. レビュー観点

### 3.1 ルール遵守
- [ ] REPOSITORY ISOLATION RULE 違反なし
- [ ] CURRENT PHASE のみ対象（A8 への前倒しなし）
- [ ] 9 ブロックすべて記載
- [ ] `goal.md` 非ゴール（PDF 出力 / 列カスタマイズ UI / 履歴 DB）に違反なし
- [ ] DESIGN AUTHORITY RULE に従い、人間判断を仰ぐ設計判断が含まれていない
- [ ] AUTO HANDOFF ORCHESTRATION RULE に従い、ファイルベース通信前提

### 3.2 verdict-A6 §6 改善提案の取り込み判断
- [ ] §6.2 CSV 添付化を A7 で扱わない判断（メール添付化は roadmap 改訂時の独立判断、A7 スコープ外と明示）
- [ ] §6.1 / §6.3 / §6.5 はメタ運用 / Owner 判断 / 将来検討事項として A7 スコープ外と整理
- [ ] §6.4 `functions/` 配備は A7 スコープ外、現状の dashboard 経由設定を維持

### 3.3 verdict-A6 §8.5 への忠実性
- [ ] verdict-A6 §8.5 が指定した「A7（CSV 出力フォーマット固定 + 大量データ対応）」を網羅
- [ ] roadmap.md A7 行の「完成」「非実装」「レビュー条件」と整合

### 3.4 自リポ整合性
- [ ] DO で言及する A6 `buildReportsCSV`（純粋関数、headers 8 列、`row.join(',')` 素朴連結）が現コードに実在
- [ ] Summary.jsx の `exportCSV`（A6 で `buildReportsCSV` 経由に置換済）が現コードに実在
- [ ] Summary.jsx の `sendPreviousMonthSummary`（A6 で追加）が現コードに実在
- [ ] HANDOFF.md Report スキーマ（L177-231）が audit format で参照する全フィールドを網羅
- [ ] `Approval.jsx` の Dialog import パターン（`@/components/ui/dialog`）が実在

### 3.5 スコープ妥当性
- [ ] 2 改修 + 2 新規（aggregation.js / Summary.jsx / baseline-A7.md / review-package-A7.md）の粒度が A7 単一フェーズとして適切
- [ ] 既存 `buildReportsCSV` の挙動を **外形等価維持**（エスケープ追加のみが差分、通常データで完全同一）する設計が回帰防止と CSV 規格準拠の両立として妥当
- [ ] 新規 `buildReportsCSVAsync` の API シグネチャ（`reports, { format, chunkSize, onProgress }`）が拡張性と利便性のバランス
- [ ] `format: 'simple' | 'audit'` の 2 種類固定（列カスタマイズ UI なし）が「監査要件は固定」原則と整合
- [ ] chunked async + `setTimeout(0)` の選択（Web Worker / WASM を導入しない）が最小実装原則と整合
- [ ] 絞り込みダイアログ追加が「Summary.jsx の chart / table 表示構造変更禁止」（A6 DO NOT 継承）と整合（新規ダイアログは既存表示を破壊しない）
- [ ] DONE CRITERIA が客観的に検証可能（grep / 構造照合 / 列数カウント）
- [ ] REVIEW POINTS 17 項目が DONE CRITERIA をカバー

### 3.6 設計判断の妥当性
- [ ] `escapeCsvCell` の RFC 4180 準拠最小実装（自前関数、依存パッケージ追加なし）が外部依存最小化と整合
- [ ] `getHeaders` / `buildRow` の format 切替設計が DRY 原則と整合
- [ ] `buildReportsCSVAsync` の `chunkSize = 200` デフォルトが UI thread 解放と速度のバランス（experiences-based reasoning として妥当）
- [ ] `onProgress` callback を try-catch で wrap し、ユーザー callback の例外を吸収する設計が「ヘルパー throw しない」原則と整合
- [ ] audit format の 33 列が、HANDOFF.md Report スキーマの主要フィールドを網羅し、業務監査ニーズに応える
- [ ] 絞り込み UI が「期間 + ユーザー + 種別」の 3 軸（最小限の絞り込み）に限定する判断が「列カスタマイズ UI なし」原則の精神と整合
- [ ] `sendPreviousMonthSummary` で使われる `buildReportsCSV` が引き続き `simple` format を返す設計が、月次メール本文の可読性維持と整合

### 3.7 依存と影響
- [ ] NEXT PHASE DEPENDENCY（A8 への前提条件）が明確
- [ ] A1〜A6 すべての成果物への破壊変更なし
- [ ] 既存 A6 月次メール配信（`sendPreviousMonthSummary` → `notifyMonthlySummary`）の出力が、エスケープ追加以外で完全等価
- [ ] A8 の規程履歴 audit format 拡張時に、A7 の `getHeaders('audit')` を拡張する形で対応可能な構造

### 3.8 既存挙動への影響評価
- [ ] 既存呼出元（A6 `sendPreviousMonthSummary` の本文埋め込み / Summary.jsx `exportCSV` のダウンロード）が、通常データで完全等価
- [ ] エスケープが効くケース（`destination_address` に `,` を含む等）の出力差分が、Excel 開封時の正しい表示として歓迎すべき改善である
- [ ] A6 月次メール本文に埋め込まれる CSV のエスケープ追加が、メーラー側でのテキスト表示に悪影響を与えない

---

## 4. Design Agent からの確認事項

Review Agent は判定書面 §3 で以下に回答すること:

1. **既存 `buildReportsCSV` の内部書き換え判断**: A6 で確立した既存関数を **内部リファクタ**（getHeaders/buildRow ヘルパー経由 + エスケープ追加）する設計。外形挙動は通常データで完全等価だが、CSV 規格準拠のエスケープが追加される。これは外形改善であり回帰ではないが、「A6 成果物に touch しない」原則との境界として許容範囲か。代替案として「既存関数を完全保持し、新規 `buildReportsCSVV2` を別途追加」もある
2. **audit format 33 列の列順・列名確定**: handoff §2.1 で提示した 33 列が業務監査ニーズと整合するか。`業務内容` フィールドは長文の場合 CSV セルとして肥大化するが、エスケープで対応する設計でよいか。あるいは省略すべきか
3. **`chunkSize = 200` の妥当性**: 経験的選択。1000 件で 5 chunks、約 5 setTimeout(0) サイクル。Review Agent から別値（100 / 500）の推奨があれば検討
4. **絞り込み UI の追加範囲**: 「期間 + ユーザー + 種別」の 3 軸に限定。ステータスフィルタ（承認済以外も含む等）は A6 / A7 で扱わない（Summary は `Report.filter({ status: '承認済' })` で事前絞り込み済の reports を使う）。これでよいか
5. **0 件絞り込み時の挙動**: `alert(...)` で簡易フィードバック。トースト等の改善は A7 スコープ外として shadcn/ui の本格活用を後送りでよいか
6. **メール添付化を A7 で扱わない判断**: verdict-A6 §5 Q2 で「A7 Design Agent が判断」とされた CSV 添付化を、本 A7 では **扱わない** と決定。理由: A7 のスコープは「Summary CSV 出力」であり、「メール配信の添付化」は A6 の延長機能。混ぜると A7 の粒度が肥大化する。roadmap 改訂時に独立軽量フェーズで扱う判断
7. **CSV エスケープを A6 成果物にも適用する影響**: A6 月次メール本文末尾埋め込みの CSV も、エスケープが効くケースで引用符が追加される。メーラー側で表示する際、引用符付きセルが「`"..."`」として可読性を維持できるか。Review Agent の判断を仰ぐ
8. **`業務内容` 列の改行処理**: `business_content` には改行が含まれる場合があり、`escapeCsvCell` で `"..."` で囲んで `\n` を CSV セル内に保持する。Excel での表示は「セル内改行」として正しく扱われるか（手動検証 Owner 分担）

---

## 5. 期待する判定形式

Review Agent は `.claude-team/design-reviews/design-review-verdict-A7.md` を `templates/design-review-verdict-template.md` に従って作成する。

### 合格
```
APPROVED_FOR_IMPLEMENTATION
```
+ §2 観点別チェック結果
+ §3 質問への回答

### 不合格
```
REJECTED_DESIGN
```
+ §4 修正要求（具体的箇所）
- 修正後は `design-handoff-A7-r2.md` + `design-review-request-A7-r2.md` として Design Agent が自動再申請

### 違反
```
REJECTED
FOREIGN CONTEXT DETECTED
```
+ §5 出典 / 検出箇所 / 不一致内容

---

## 6. DESIGN AUTHORITY RULE 注記

本 Design Review Gate は `APPROVED_FOR_IMPLEMENTATION` まで自動継続する。途中の人間通知は禁止。Review Agent が `REJECTED_DESIGN` を返した場合、Design Agent は人間の指示なしで改訂版を作成し再申請する。

`APPROVED_FOR_IMPLEMENTATION` 到達後、人間が `templates/implementation-go-template.md` を使って Implementation Agent を起動した場合のみ Implementation Phase へ移行する。
