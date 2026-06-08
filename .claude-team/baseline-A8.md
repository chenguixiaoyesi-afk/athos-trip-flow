# Baseline A8 — 旅費規程監査ベースライン ⭐ ロードマップ最終フェーズ

策定日: 2026-06-08
保持者: Design Agent
適用: A8 以降（ロードマップ最終）
実装: A8 で `src/lib/policyImpactAnalyzer.js` 新規 + `src/pages/PolicyManagement.jsx` に影響範囲確認 UI 追加

---

## 目的

A8 で実装した「規程変更影響範囲確認」機能の業務的位置付けと検証手順を文書化する。

## 業務ルール（厳守）

### ルール 1: 過去レポートへの遡及反映禁止

規程が変更されても、既存の承認済レポートの計算値（`daily_allowance` / `accommodation_fee` / `car_allowance` / `total_amount`）は **据え置く**。

本 A8 で実装した影響範囲表示は **シミュレーションのみ** であり、DB の保存値を書き換えない。

実装上の保証:
- `handleShowImpact` 内で `Report.update` を **一切呼ばない**（grep で確認可能）
- `computeImpact` の戻り値はメモリ上の表示用データのみ
- Dialog を閉じても Report エンティティは不変

### ルール 2: 実費項目は規程変更影響対象外

以下の 10 実費フィールドは規程値に依存しない実費のため、規程変更による再計算対象外:

| 種別 | 実費フィールド |
|---|---|
| 共通 | `highway_fee`, `parking_fee`, `taxi_fee`, `other_transport_fee` |
| 海外 | `flight_fee`, `airport_transport_fee` |
| 外出作業 | `coworking_fee`, `wifi_fee`, `meal_fee`, `other_work_fee` |

`recomputeReportPolicyValues` 内で `actuals` として合算するが、`currentPolicy` の値は使わず report の値をそのまま使用。

### ルール 3: 比較範囲

影響評価対象は `status='承認済'` のレポートのみ（500 件まで、Summary / 月次配信と同方針）。

下書き / 申請中 / 差戻し は規程変更影響の評価対象外。

### ルール 4: 4 種別ごとの計算ロジック差

| 種別 | 規程依存項目 | 計算式 |
|---|---|---|
| 日帰り出張 | `daily_allowance` / `car_allowance` | `daily_allowance_daytrip + driving_distance_km * car_allowance_per_km` |
| 宿泊出張 | 3 項目すべて | `(daily_allowance_overnight * num_days) + (accommodation_domestic * num_nights) + (driving_distance_km * car_allowance_per_km)` |
| 海外出張 | `daily_allowance` / `accommodation_fee` のみ（**車手当なし**） | `(daily_allowance_overseas * num_days) + (accommodation_overseas * num_nights)` |
| 外出作業 | `car_allowance` のみ（**日当・宿泊費なし**） | `driving_distance_km * car_allowance_per_km` |

各種別の業務的妥当性:
- 日帰り出張: 1 日分の日当 + マイカー手当（宿泊なし）
- 宿泊出張: 日数 × 日当 + 泊数 × 宿泊費 + マイカー手当
- 海外出張: 公共交通機関想定で車手当なし、日当・宿泊費は海外単価
- 外出作業: 短時間業務で日当・宿泊費発生なし、移動分のマイカー手当のみ

---

## 業務シナリオ（監査担当の利用フロー）

### シナリオ 1: 規程変更前の影響範囲事前確認

1. 監査担当が `PolicyManagement.jsx` を開く（admin 限定アクセス）
2. PDF アップロード or 既存「規程履歴」一覧で **「適用予定の新規程」** を見つける（`is_active=false`）
3. 各規程行の右側「影響範囲」ボタン押下 → Dialog で件数 / 合計差額 / 影響レポート一覧を確認
4. 必要に応じて経理に事前共有
5. 問題なければ既存「適用する」ボタンで規程を切り替え
6. 適用後も過去レポートは不変、新規レポートのみ新規程適用

### シナリオ 2: 過去の規程変更履歴の追跡

1. 監査担当が規程履歴一覧で過去の規程（`is_active=false`）の「影響範囲」を押下
2. 「当該規程に切り替えたとしたら、現在の承認済レポートにどう影響したか」を確認
3. 監査レポート作成時の参考にする
4. 規程変更の妥当性を経理 / 監査人に説明可能

### シナリオ 3: CSV 出力との連携（A7 統合）

1. 監査担当が `Summary.jsx` で「監査用 CSV 出力」（A7、admin 限定）を実施
2. CSV の合計金額と、`PolicyManagement.jsx` の影響範囲表示で集計を二重チェック
3. 規程変更タイミングが集計期間に跨る場合、影響を事前に把握
4. 監査資料として CSV（A7）+ 影響範囲スクリーンショット（A8）の組み合わせ運用

---

## 検証手順（Owner 分担）

### 1. 基本動作確認

1. admin で `/policy` を開く
2. 「影響範囲」ボタンが規程履歴の各 `is_active=false` 規程に表示される
3. `is_active=true` の規程には「影響範囲」ボタンが **表示されない**（自己比較になるため）
4. `activePolicy` 不在時（規程ゼロ件）はボタン自体が表示されない
5. クリック → Dialog 表示
6. Loader2 アニメーション → 計算完了 → 3 KPI カード + 影響レポート一覧 + 業務ルール明示フッター
7. 「閉じる」ボタンで Dialog 閉じる

### 2. 計算正確性確認

既知の承認済レポートに対する確認例:

#### 例 A: 日帰り出張、daily_allowance_daytrip 変更
- 既存レポート: 日帰り出張、daily_allowance=5000、driving_distance_km=0
- 新規程: daily_allowance_daytrip=6000
- 期待差分: `(6000) - (5000) = +1000`

#### 例 B: 宿泊出張、accommodation_domestic 変更
- 既存レポート: 宿泊出張、num_days=2、num_nights=1、accommodation_fee=15000
- 新規程: accommodation_domestic=20000
- 期待差分: `(20000 * 1) - (15000) = +5000`（日当・車手当に変更なしを前提）

#### 例 C: 海外出張、車手当 → 0 確認
- 既存レポート: 海外出張、driving_distance_km=10
- いかなる規程でも car_allowance=0（海外出張に車手当なし、業務ルール）
- 期待: 規程変更しても影響範囲に含まれない（差分 0）

#### 例 D: 外出作業、日当 → 0 確認
- 既存レポート: 外出作業、coworking_fee=3000
- いかなる規程でも daily_allowance=0 / accommodation_fee=0
- 期待: 規程の daily_allowance_overnight 等を変えても外出作業は影響なし

### 3. 業務ルール確認

1. 影響範囲 Dialog を開く → 計算完了 → 「閉じる」
2. 同じレポートを `ReportDetail.jsx` で開く
3. 保存値（`total_amount`）が **規程変更前の値** から **変わっていない** ことを確認
4. ブラウザ DevTools の Network タブで `Report.update` リクエストが発生していないことを確認
5. Base44 ダッシュボードで Report エンティティの値が不変であることを直接確認（任意）

### 4. 境界条件

- 承認済レポートが 0 件: Dialog で「影響を受けるレポートはありません」表示
- `activePolicy` 不在: 「影響範囲」ボタン自体が非表示で実行不能
- 500 件超: 上位 500 件のみ評価対象（A6/A7 と整合）
- エラー時: 「計算中にエラーが発生しました」赤メッセージ + items 空配列
- 比較対象の規程値が一部 null/undefined: `recomputeReportPolicyValues` 内の `|| 0` フォールバックで処理

### 5. UI 整合性

- Dialog max-h-[80vh] + overflow-y-auto で長いリストもスクロール可能
- 3 KPI カードの色分け（青 / 黄 / 赤 or 緑）が直感的
- 影響レポート一覧のテーブル列順（ID / 種別 / 作成者 / 旧合計 / 新合計 / 差分）が監査に適切
- 業務ルール明示フッターが太字で目立つ

---

## 既存機能への影響

### 影響なし（A0-A7 すべて不変）

- A0-A0.1: チーム開発インフラ
- A1: FieldworkForm の receipts state（A1 で確立）
- A2: 4 form の 1 日 1 件チェック（A2 で確立）
- A3: `ReportEdit.jsx` + 4 form の mode/initialReport + ReportDetail 編集ボタン（A3 で確立）
- A4: useReceiptParser + ReceiptUploaderSection + reportGenerator 見出し固定（A4 で確立）
- A5: notifications.js 4 ヘルパー + 申請/承認/差戻し通知（A5 で確立、MVP COMPLETE）
- A6: aggregation.js + 月次自動配信 + Summary 手動ボタン（A6 で確立）
- A7: CSV escape + audit format + chunked async + 監査 CSV ダイアログ（A7 で確立）

### 影響なし（PolicyManagement.jsx 内）

- 現行規程表示 Card（既存）
- PDF アップロード + AI 解析 + AI 解析後 diff 表示（既存）
- 規程内容メモ / 新規規程保存（既存）
- 規程履歴一覧の既存表示要素（`version`, 施行日, 適用中バッジ, PDF リンク, 適用するボタン）
- `handlePdfUpload` / `handleActivate` / `handleSaveNew` の動作
- `FIELD_LABELS` 定義
- `usePolicy` hook / `policyContext.jsx`

### 影響あり（A8 で追加）

- 規程履歴の各 `is_active=false` 規程行に「影響範囲」ボタン追加（既存「適用する」ボタンの直前）
- 新規 Dialog 1 つ追加（影響範囲確認用）
- 新規ファイル `src/lib/policyImpactAnalyzer.js` 追加
- imports 3 行追加（`Eye` / Dialog 系 / computeImpact）
- state 4 つ追加（showImpactDialog / impactTarget / impactResult / impactLoading）
- handler 1 つ追加（`handleShowImpact`）

---

## 監査要件マッピング

A8 audit features が満たす監査観点:

| 観点 | カバーする機能 |
|---|---|
| Who（誰が） | 影響レポート一覧の「作成者」列 |
| What（何が変わる） | 「旧合計 / 新合計 / 差分」3 列 |
| How much（どれだけ影響） | KPI「合計差額」+ 「影響件数」 |
| Why（業務ルール） | フッター「シミュレーションのみ、DB 保存なし」明示 |
| When（いつ計算） | Dialog 内 progress 表示で即時計算 |
| Where（どの規程） | DialogTitle で旧→新規程の version を明示 |
| Reproducibility（再現可能性） | 同じ規程比較で常に同じ結果（純粋関数） |
| Non-destructiveness（非破壊性） | grep で `Report.update` 不在を確認可能 |

---

## ロードマップ完了

⭐ **A8 完了で全 9 フェーズ完走**:

```
A0 → A0.1 → A1 → A2 → A3 → A4 → A5（MVP COMPLETE）→ A6 → A7 → A8（PROJECT COMPLETE）
```

業務フロー完成:
```
社員 → レポート作成 → AI 補完 → 承認 → 集計 → CSV → 旅費規定監査
        (A2-A3-A4)     (A4)    (A5)  (A6) (A7)    (A8)
```

各フェーズの主要成果物:

| Phase | 成果物 | 業務的価値 |
|---|---|---|
| A0 | チーム開発インフラ + bootstrap commit | 開発基盤 |
| A0.1 | チーム運用最終整合化 | ガバナンス |
| A1 | FieldworkForm receipts SOT | 既知 #4 解消 |
| A2 | 4 form 1日1件チェック | 既知 #1 解消 |
| A3 | レポート編集経路 `/reports/:id/edit` | P0 #1、MVP #3 |
| A4 | 領収書 AI 全フォーム展開 + 見出し固定 + 金額0ガード | P0 #2、MVP #1 #4、既知 #2 #3 解消 |
| A5 | 申請/承認/差戻し通知 + safeSend パターン | P0 #3、MVP #2、**MVP COMPLETE** |
| A6 | 月次集計純粋関数 + 自動配信 + admin 手動ボタン | 運用品質 |
| A7 | CSV escape + audit 33 列 + chunked async + 絞り込み | 監査要件 |
| A8 | 規程変更影響範囲確認 + 業務ルール明示 | 規程監査 |

---

## ロードマップ完了後の運用

A8 APPROVED 後の運用（バグ対応 / 機能追加要望）は:
- 新規 roadmap 策定（A9-A16 等）を Design Agent + Owner で協議
- または独立タスク管理として要望をプールし、定期的な roadmap 改訂で吸収
- 本フェーズ範囲外

---

## 参照

- Implementation コード: `src/lib/policyImpactAnalyzer.js` / `src/pages/PolicyManagement.jsx`
- Handoff 正本: `.claude-team/handoff/design-handoff-A8.md`
- Design Review: `.claude-team/design-reviews/design-review-verdict-A8.md`（§4 Q1 で `activePolicy` 命名整合性指摘、L155 既存変数で対応）
- Review Package: `.claude-team/review-packages/review-package-A8.md`
- HANDOFF.md Report スキーマ L177-231 / TravelPolicyMaster スキーマ L234-252
- roadmap.md A8 行
- A6 baseline / A7 baseline
