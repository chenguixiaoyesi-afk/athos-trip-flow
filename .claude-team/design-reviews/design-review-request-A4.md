# Design Review Request — Phase A4

From: Design Agent
To: Review Agent
Date: 2026-06-06
Gate: **実装前ゲート（Design Review Gate）**

本ファイルは `design-handoff-A4.md` の実装前レビュー依頼。Review Agent は本ファイルと `design-handoff-A4.md` を読み、`design-review-verdict-A4.md` を返す。

---

## 1. レビュー対象

- 仕様正本: `.claude-team/handoff/design-handoff-A4.md`
- 直近 verdict: `.claude-team/verdicts/verdict-A3.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A4）
- A3 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A3.md`
- ロードマップ: `.claude-team/roadmap.md` A4 行（領収書 AI 全フォーム展開 + 精算書安定化 + 金額 0 ガード）
- /goal: `.claude-team/goal.md` §0 / MVP 達成定義 #3
- 運用ルール: `.claude-team/auto-handoff.md` §0 DESIGN AUTHORITY RULE
- HANDOFF.md P0 #2 / 既知不具合 #2 #3

---

## 2. CURRENT PHASE

`A4` — AI 補完: 領収書 AI 全フォーム展開 + 精算書見出し安定化 + 金額 0 ガード強化

新規ファイル 2（`useReceiptParser` hook + `ReceiptUploaderSection` component）、4 form + `reportGenerator.js` の改修。既知不具合 #2（精算書見出し）と #3（金額 0 ガード）を hook 内に集約解消。MVP 達成定義 #3 を達成。

---

## 3. レビュー観点

### 3.1 ルール遵守
- [ ] REPOSITORY ISOLATION RULE 違反なし
- [ ] CURRENT PHASE のみ対象（A5 への前倒しなし）
- [ ] 9 ブロックすべて記載
- [ ] `goal.md` 非ゴール（新規 AI モデル接続 / 編集中の領収書差し替え UI など）に違反なし
- [ ] DESIGN AUTHORITY RULE に従い、人間判断を仰ぐ設計判断が含まれていない
- [ ] AUTO HANDOFF ORCHESTRATION RULE に従い、ファイルベース通信前提

### 3.2 verdict-A3 §6 改善提案の取り込み
- [ ] DO 12 で `grep -c "AUTO-""FILL:"` の分割表記を明示（改善提案 1）
- [ ] DONE CRITERIA / REVIEW POINTS で `grep -c "AUTO-""FILL:"` の分割表記を採用（改善提案 1）
- [ ] DO 10 で手動 UI 検証の代替（コードロジック存在の grep + 論理確認）を許容（改善提案 2）
- [ ] `useCanEdit` 抽出を本フェーズで行わないことを DO NOT で明示（改善提案 3 への対応、§4 Q5 で Review に確認）
- [ ] lint warnings 3 件の処遇は本フェーズも「A3 完了時点から非増加」のみ要求（改善提案 4 を継続保留）

### 3.3 verdict-A3 §8.7 への忠実性
- [ ] verdict-A3 §8.7 が指定した「A4（領収書 AI 全フォーム展開 + 精算書安定化 + 金額 0 ガード）」を網羅
- [ ] roadmap.md A4 行の「完成」「非実装」「レビュー条件」と整合

### 3.4 自リポ整合性
- [ ] DO で言及する `FieldworkForm.jsx` の `receipts` state（A1 で確立）、`handleReceiptUpload`、`removeReceipt`、`CATEGORY_MAP` が現コードに実在
- [ ] `src/lib/reportGenerator.js` の L244-249 の分割ロジック、L61/L118/L171/L224 の見出しテンプレが現コードに実在
- [ ] 3 form の経費フィールド（DayTrip/Overnight: highway_fee/parking_fee/taxi_fee/other_transport_fee、Overseas: flight_fee/airport_transport_fee）が現コードの `useState` 初期値に実在
- [ ] `base44.integrations.Core.UploadFile` / `InvokeLLM` API が現コードで使用されている

### 3.5 スコープ妥当性
- [ ] hook + component 抽出のサイズ（2 新規 + 5 改修）が A4 の単一フェーズとして適切な粒度か（A3 6 改修 + 1 新規より小さいが、複雑度は同等）
- [ ] hook の責務（state + UploadFile + InvokeLLM + 金額 0 ガード + onAmountParsed コールバック）が単一責任原則と整合
- [ ] CATEGORY_MAP の form 別管理（共通化しない）が「各 form の経費フィールド構造が異なる」現実と整合
- [ ] 分割ロジック regex 化が「見出し前後の空白許容 + 行頭マッチ + 安全フォールバック」の 3 観点を満たす
- [ ] DONE CRITERIA が客観的に検証可能（grep / 構造照合 / 数値カウント）
- [ ] REVIEW POINTS 15 項目が DONE CRITERIA をカバー

### 3.6 設計判断の妥当性
- [ ] hook signature（`{initialReceiptUrls, categoryMap, fallbackKey, onAmountParsed}`）が form 非依存で汎用的
- [ ] 金額 0 ガードを hook 内に集約し form 側で重複チェックしない設計が DRY 原則と整合
- [ ] `e.target.value = ''` での「同じファイル再選択」改善が既存 UX を壊さない（純粋な追加機能）
- [ ] regex `/^##\s*(旅費精算書|経費精算書)\s*$/m` が誤検出を起こさない（行頭・前後空白許容・両見出し OR）
- [ ] ReceiptUploaderSection の props 設計（receipts / handlers / 表示 props）が FieldworkForm の現 UI と完全等価
- [ ] CATEGORY_MAP_OVERSEAS の `'タクシー': 'airport_transport_fee'` / `'電車': 'airport_transport_fee'` マッピングが業務的に妥当（海外出張で「タクシー」「電車」は空港送迎の文脈が支配的）

### 3.7 依存と影響
- [ ] NEXT PHASE DEPENDENCY（A5 への前提条件）が明確
- [ ] A1（receipts state）/ A2（重複検証）/ A3（edit モード）の成果物への破壊変更なし
- [ ] A4 の hook 抽出が A3 の edit モード（receipts の `existing-N` 復元）と整合
- [ ] hook 内の receipts state 構造が A1 で確立した `{id, url, name, parsed, status}` を踏襲

---

## 4. Design Agent からの確認事項

Review Agent は判定書面 §3 で以下に回答すること:

1. **`useCanEdit` を A4 で抽出しない判断**: verdict-A3 §6.3 が「A4 で `useReceiptParser` 抽出時に `useCanEdit(report, user)` フックを同時に検討」と提案。Design Agent は A4 を「AI 補完」テーマに絞るためスコープ外とした。この判断は「DRY 化を Phase 単位で計画的に進める」原則と整合するか、それとも「同時に抽出した方が一回で済む」効率原則を優先すべきか
2. **CATEGORY_MAP の form 別管理**: 共通化を行わず form 別に定義する方針が、3 form それぞれの経費フィールド構造（DayTrip/Overnight: 交通系 4 / Overseas: 航空・空港系 2 / Fieldwork: 業務系 5）と整合するか。将来の「規程変更で経費カテゴリが追加されたとき」の保守性を犠牲にしていないか
3. **`e.target.value = ''` の追加挙動**: hook 内で「同じファイルの再選択を可能にする」改善を加えた。既存 FieldworkForm にない挙動だが、純粋な追加（既存 UX を破壊しない）として A4 スコープ内で許容されるか
4. **分割 regex の堅牢性**: `/^##\s*(旅費精算書|経費精算書)\s*$/m` で見出し前後の余分な記号（例: `## 旅費精算書（合計）` の `（合計）`）が含まれた場合、見出しとして認識されず `settlementText=''` フォールバックとなる。これは「AI が指示通り出力できなかった場合の安全策」として妥当か、それとも「より寛容な regex で部分マッチ許容」を選ぶべきか
5. **ReceiptUploaderSection の独立コンポーネント化**: hook だけでも 4 form の重複は解消できるが、JSX も抽出した。これは「3 form に同等 UI を素朴複製するより集約」判断。「3 度目の重複が出るまで素朴複製」原則とは厳密には抵触するが、本 A4 で同時に 4 form で必要になるため例外として妥当か
6. **金額 0 ガードの集約位置**: hook 内 `isValidAmount` チェックで完全に集約。form 側に同チェックを残す設計（防御的二重化）と、完全に集約する設計（DRY）のどちらが A4 のスコープと整合するか
7. **edit モードでの `parsed: null` 復元**: A3 で確立した「`parsed` は復元しない」設計を hook も踏襲。edit 中に既存領収書を「再解析」する手段は提供しない（既存 receipts は status='done', parsed: null のまま）。これが業務上の制約として妥当か、それとも「再解析ボタン」を A5 以降で検討すべきか

---

## 5. 期待する判定形式

Review Agent は `.claude-team/design-reviews/design-review-verdict-A4.md` を `templates/design-review-verdict-template.md` に従って作成する。

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
- 修正後は `design-handoff-A4-r2.md` + `design-review-request-A4-r2.md` として Design Agent が自動再申請

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
